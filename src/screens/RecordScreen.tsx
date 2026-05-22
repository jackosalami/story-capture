import { useEffect, useRef, useState } from "react";
import { useNav } from "../store/nav";
import { useSettings } from "../store/settings";
import { ChunkRecorder } from "../lib/recorder";
import {
  appendSegment,
  finishSession,
  getAccumulatedTranscript,
  getSession,
  listSegments,
  setSegmentFollowUp,
} from "../db/sessions";
import { getStory, updateStory } from "../db/stories";
import { getCharactersByIds } from "../db/characters";
import type { Story, Character } from "../db/types";
import { chat, transcribe } from "../api/openai";
import {
  FOLLOW_UP_SYSTEM_PROMPT,
  SESSION_SUMMARY_SYSTEM_PROMPT,
  TITLE_SYSTEM_PROMPT,
  METADATA_SYSTEM_PROMPT,
  buildFollowUpUserPrompt,
  buildSummaryUserPrompt,
  buildTitleUserPrompt,
  buildMetadataUserPrompt,
  parseMetadataResponse,
} from "../prompts/spanish";
import { listCharacters } from "../db/characters";
import { createMention } from "../db/characterMentions";
import { formatLongDate } from "../lib/format";

type Phase = "idle" | "recording" | "processing" | "ending" | "done";

interface SegmentView {
  id: string;
  transcript: string;
  followUpQuestion: string | null;
}

export function RecordScreen({ sessionId }: { sessionId: string }) {
  const go = useNav((s) => s.go);
  const transcribeModel = useSettings((s) => s.transcribeModel);
  const chatModel = useSettings((s) => s.chatModel);

  const recorderRef = useRef<ChunkRecorder | null>(null);
  if (recorderRef.current === null) recorderRef.current = new ChunkRecorder();

  const [phase, setPhase] = useState<Phase>("idle");
  const [segments, setSegments] = useState<SegmentView[]>([]);
  const [sessionDate, setSessionDate] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getSession(sessionId);
      const segs = await listSegments(sessionId);
      const storyId = s?.storyId ?? null;
      const story = storyId ? await getStory(storyId) : null;
      const chars = story ? await getCharactersByIds(story.characterIds) : [];
      if (cancelled) return;
      setSessionDate(s?.date ?? new Date().toISOString());
      setStory(story ?? null);
      setCharacters(chars);
      setSegments(
        segs.map((seg) => ({
          id: seg.id,
          transcript: seg.transcript,
          followUpQuestion: seg.followUpQuestion,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function startRecording() {
    setError(null);
    try {
      await recorderRef.current!.start();
      setPhase("recording");
    } catch (e) {
      setError(messageOf(e));
    }
  }

  async function stopRecording() {
    if (phase !== "recording") return;
    setPhase("processing");
    try {
      const { blob, mimeType, durationMs } = await recorderRef.current!.stop();

      const transcript = await transcribe({
        model: transcribeModel,
        blob,
        filename: `chunk-${Date.now()}.webm`,
        language: "es",
      });

      const segment = await appendSegment({
        sessionId,
        audioBlob: blob,
        mimeType,
        durationMs,
        transcript,
      });

      setSegments((prev) => [
        ...prev,
        { id: segment.id, transcript, followUpQuestion: null },
      ]);

      // Generate follow-up question with full session context.
      const accumulated = await getAccumulatedTranscript(sessionId);
      const question = await chat({
        model: chatModel,
        messages: [
          { role: "system", content: FOLLOW_UP_SYSTEM_PROMPT },
          { role: "user", content: buildFollowUpUserPrompt(accumulated) },
        ],
        temperature: 0.8,
        maxTokens: 80,
      });
      await setSegmentFollowUp(segment.id, question);
      setSegments((prev) =>
        prev.map((s) => (s.id === segment.id ? { ...s, followUpQuestion: question } : s)),
      );

      // After the FIRST segment, suggest a title if the story doesn't have one.
      if (story && !story.title && segments.length === 0 && transcript.trim().length > 20) {
        try {
          const title = await chat({
            model: chatModel,
            messages: [
              { role: "system", content: TITLE_SYSTEM_PROMPT },
              { role: "user", content: buildTitleUserPrompt(transcript) },
            ],
            temperature: 0.7,
            maxTokens: 30,
          });
          const clean = title.replace(/^[\s"'«»]+|[\s"'«»\.]+$/g, "");
          await updateStory(story.id, { title: clean });
          setStory({ ...story, title: clean });
        } catch {
          // Title is non-essential — swallow errors.
        }
      }

      setPhase("idle");
    } catch (e) {
      setError(messageOf(e));
      setPhase("idle");
    }
  }

  async function endSession() {
    setError(null);
    setPhase("ending");
    try {
      const accumulated = await getAccumulatedTranscript(sessionId);
      let summary = "";
      if (accumulated.trim().length > 0) {
        summary = await chat({
          model: chatModel,
          messages: [
            { role: "system", content: SESSION_SUMMARY_SYSTEM_PROMPT },
            { role: "user", content: buildSummaryUserPrompt(accumulated) },
          ],
          temperature: 0.4,
          maxTokens: 300,
        });
      }
      await finishSession(sessionId, summary);
      // Also store summary on the story if it's still empty.
      if (story && !story.summary && summary) {
        await updateStory(story.id, { summary });
      }

      // Extract structured metadata + people from the transcript.
      // Only fills empty fields on the story (never overwrites typed data).
      // For each detected person, queue a CharacterMention for the admin to review.
      if (story && accumulated.trim().length > 80) {
        try {
          // Give the model the current book's character catalog as matching context.
          const existingCharacters = await listCharacters();
          const charHints = existingCharacters.map((c) => ({
            id: c.id,
            name: c.name,
            relationship: c.relationship,
            description: c.description,
          }));

          const raw = await chat({
            model: chatModel,
            messages: [
              { role: "system", content: METADATA_SYSTEM_PROMPT },
              { role: "user", content: buildMetadataUserPrompt(accumulated, charHints) },
            ],
            temperature: 0.2,
            maxTokens: 1200,
          });
          const meta = parseMetadataResponse(raw);
          if (meta) {
            const patch: Record<string, unknown> = {};
            if (!story.storyDate && meta.storyDate) patch.storyDate = meta.storyDate;
            if (!story.location && meta.location) patch.location = meta.location;
            if (!story.environment && meta.environment.length > 0) {
              patch.environment = meta.environment.join(", ");
            }
            if (story.mood.length === 0 && meta.mood.length > 0) patch.mood = meta.mood;
            // Keep the flat list around for backwards-compat with old UI.
            if (meta.mentionedPeople.length > 0) patch.mentionedPeople = meta.mentionedPeople;
            if (Object.keys(patch).length > 0) {
              await updateStory(story.id, patch);
            }

            // Queue character-mention suggestions for admin review.
            for (const p of meta.people) {
              await createMention({
                storyId: story.id,
                sessionId,
                bookId: story.bookId,
                mentionedAs: p.mentionedAs,
                isNew: p.isNew,
                suggestedCharacterId: p.suggestedCharacterId ?? undefined,
                confidence: p.confidence,
                newTraits: p.newTraits,
                newDescriptionFacts: p.newDescriptionFacts,
                newRelationship: p.newRelationship ?? undefined,
              });
            }
          }
        } catch {
          // Metadata extraction is non-essential — swallow errors.
        }
      }

      setPhase("done");
      setTimeout(() => {
        if (story) go({ name: "story", storyId: story.id });
        else go({ name: "dashboard" });
      }, 600);
    } catch (e) {
      setError(messageOf(e));
      setPhase("idle");
    }
  }

  const latestQuestion = [...segments].reverse().find((s) => s.followUpQuestion)?.followUpQuestion;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <header className="flex items-baseline justify-between mb-6">
        <button
          type="button"
          onClick={() => go({ name: "dashboard" })}
          className="text-sm text-ink-soft hover:text-ink"
        >
          ← Volver
        </button>
        {sessionDate && (
          <span className="text-xs text-ink-soft uppercase tracking-wide">{formatLongDate(sessionDate)}</span>
        )}
      </header>

      {story && (story.title || story.storyDate || story.location || characters.length > 0) && (
        <div className="mb-8 paper-card rounded-2xl px-6 py-4">
          {story.title && (
            <p className="h-serif text-2xl text-ink leading-tight">{story.title}</p>
          )}
          {(story.storyDate || story.location) && (
            <p className="mt-1 text-sm text-ink-soft">
              {[story.storyDate, story.location].filter(Boolean).join(" · ")}
            </p>
          )}
          {characters.length > 0 && (
            <p className="mt-1 text-sm text-ink-soft">
              Con: {characters.map((c) => c.name).join(", ")}
            </p>
          )}
        </div>
      )}

      {latestQuestion && phase !== "recording" && (
        <div className="mb-10 rounded-2xl bg-warm-soft border border-warm/30 px-6 py-6 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-warm-deep font-medium mb-2">
            Una pregunta para seguir
          </p>
          <p className="h-serif text-xl text-ink leading-relaxed">{latestQuestion}</p>
        </div>
      )}

      <div className="flex flex-col items-center my-12">
        {phase === "recording" ? (
          <button
            type="button"
            onClick={stopRecording}
            className="relative size-56 rounded-full bg-record text-white shadow-[0_20px_60px_-12px_rgba(194,65,12,0.55)] hover:shadow-[0_24px_70px_-12px_rgba(194,65,12,0.65)] active:scale-95 transition flex items-center justify-center"
          >
            <span aria-hidden className="absolute inset-0 rounded-full ring-8 ring-record/15 animate-ping" />
            <span aria-hidden className="absolute inset-0 rounded-full ring-4 ring-record/30 animate-pulse" />
            <span className="relative flex flex-col items-center gap-2">
              <span className="size-7 bg-white rounded-sm" />
              <span className="text-xl font-medium">Parar</span>
            </span>
          </button>
        ) : phase === "processing" ? (
          <div className="size-56 rounded-full bg-paper-deep flex flex-col items-center justify-center gap-2">
            <span aria-hidden className="text-4xl">✍️</span>
            <span className="text-base text-ink-soft">Escribiendo…</span>
          </div>
        ) : phase === "ending" ? (
          <div className="size-56 rounded-full bg-paper-deep flex flex-col items-center justify-center text-center px-4 gap-2">
            <span aria-hidden className="text-4xl">📖</span>
            <span className="text-base text-ink-soft">Guardando resumen…</span>
          </div>
        ) : phase === "done" ? (
          <div className="size-56 rounded-full bg-emerald-50 border-4 border-emerald-200 text-emerald-700 flex flex-col items-center justify-center gap-2">
            <span aria-hidden className="text-4xl">✨</span>
            <span className="h-serif text-2xl">¡Listo!</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="relative size-56 rounded-full bg-gradient-to-br from-record to-warm-deep text-white shadow-[0_20px_60px_-12px_rgba(194,65,12,0.45)] hover:shadow-[0_24px_70px_-12px_rgba(194,65,12,0.6)] active:scale-95 transition flex items-center justify-center"
          >
            <span className="flex flex-col items-center gap-2">
              <span className="size-7 bg-white rounded-full" />
              <span className="text-xl font-medium">Grabar</span>
            </span>
          </button>
        )}
        <p className="mt-6 text-base text-ink-soft text-center max-w-sm leading-relaxed">
          {phase === "recording"
            ? "Estoy escuchando. Toma tu tiempo."
            : phase === "processing"
              ? "Un momento mientras escribo lo que dijiste…"
              : phase === "idle"
                ? segments.length === 0
                  ? "Cuando estés lista, toca el botón y cuéntame tu historia."
                  : "Cuando quieras, sigue contando."
                : ""}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-record-soft border border-record/30 px-5 py-3 text-sm text-warm-deep">
          {error}
        </div>
      )}

      {segments.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs uppercase tracking-widest text-ink-soft mb-4 flex items-center gap-2">
            <span aria-hidden>✦</span> Lo que has contado
          </h2>
          <div className="space-y-5">
            {segments.map((s) => (
              <p key={s.id} className="h-serif text-lg leading-loose text-ink whitespace-pre-wrap">
                {s.transcript}
              </p>
            ))}
          </div>
        </section>
      )}

      {segments.length > 0 && phase === "idle" && (
        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={endSession}
            className="rounded-full border border-ink/20 px-6 py-3 text-sm text-ink-soft hover:border-ink/40 hover:text-ink transition"
          >
            Terminar sesión
          </button>
        </div>
      )}
    </div>
  );
}

function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
