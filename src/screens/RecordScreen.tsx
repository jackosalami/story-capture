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
  buildFollowUpUserPrompt,
  buildSummaryUserPrompt,
  buildTitleUserPrompt,
} from "../prompts/spanish";
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
          className="text-sm text-ink/60 hover:text-ink"
        >
          ← Volver
        </button>
        {sessionDate && (
          <span className="text-sm text-ink/50">{formatLongDate(sessionDate)}</span>
        )}
      </header>

      {/* Story context strip */}
      {story && (story.title || story.storyDate || story.location || characters.length > 0) && (
        <div className="mb-6 rounded-xl border border-ink/10 bg-white/60 px-5 py-3">
          {story.title && (
            <p className="text-base font-medium text-ink">{story.title}</p>
          )}
          <p className="text-xs text-ink/55">
            {[story.storyDate, story.location].filter(Boolean).join(" · ")}
          </p>
          {characters.length > 0 && (
            <p className="mt-1 text-xs text-ink/55">
              Con: {characters.map((c) => c.name).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Latest follow-up question */}
      {latestQuestion && phase !== "recording" && (
        <div className="mb-8 rounded-2xl bg-warm-soft border border-warm/30 px-6 py-5">
          <p className="text-xs uppercase tracking-wide text-warm font-medium mb-1">
            Una pregunta
          </p>
          <p className="text-lg text-ink leading-relaxed">{latestQuestion}</p>
        </div>
      )}

      <div className="flex flex-col items-center my-10">
        {phase === "recording" ? (
          <button
            type="button"
            onClick={stopRecording}
            className="size-48 rounded-full bg-record text-white text-xl font-medium shadow-lg hover:bg-record/90 active:scale-95 transition flex items-center justify-center"
          >
            <span className="flex flex-col items-center gap-2">
              <span className="size-6 bg-white rounded-sm animate-pulse" />
              Parar
            </span>
          </button>
        ) : phase === "processing" ? (
          <div className="size-48 rounded-full bg-ink/10 text-ink/60 text-lg flex items-center justify-center">
            Transcribiendo…
          </div>
        ) : phase === "ending" ? (
          <div className="size-48 rounded-full bg-ink/10 text-ink/60 text-lg flex items-center justify-center text-center px-4">
            Guardando resumen…
          </div>
        ) : phase === "done" ? (
          <div className="size-48 rounded-full bg-emerald-100 text-emerald-800 text-lg flex items-center justify-center">
            ¡Listo!
          </div>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="size-48 rounded-full bg-record text-white text-xl font-medium shadow-lg hover:bg-record/90 active:scale-95 transition flex items-center justify-center"
          >
            <span className="flex flex-col items-center gap-1">
              <span className="size-6 bg-white rounded-full" />
              Grabar
            </span>
          </button>
        )}
        <p className="mt-4 text-sm text-ink/60 text-center max-w-sm">
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
        <div className="mb-6 rounded-lg bg-record-soft border border-record/30 px-4 py-3 text-sm text-record">
          {error}
        </div>
      )}

      {segments.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm uppercase tracking-wide text-ink/50 mb-3">
            Lo que has contado
          </h2>
          <div className="space-y-4">
            {segments.map((s) => (
              <p key={s.id} className="text-base leading-relaxed text-ink whitespace-pre-wrap">
                {s.transcript}
              </p>
            ))}
          </div>
        </section>
      )}

      {segments.length > 0 && phase === "idle" && (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={endSession}
            className="rounded-lg border border-ink/20 px-5 py-3 text-sm text-ink/70 hover:border-ink/40 hover:text-ink"
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
