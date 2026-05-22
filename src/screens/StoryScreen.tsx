import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import {
  getStory,
  updateStory,
  linkCharacterToStory,
  unlinkCharacterFromStory,
  linkSessionToStory,
} from "../db/stories";
import { createSession, listSegments } from "../db/sessions";
import { getCharactersByIds } from "../db/characters";
import { db } from "../db/db";
import type { Story, Character, Segment, Session } from "../db/types";
import { formatLongDate } from "../lib/format";
import { CharacterPicker } from "../components/CharacterPicker";
import { ChipPicker } from "../components/ChipPicker";
import { ENVIRONMENT_CHIPS, MOOD_CHIPS } from "../lib/constants";

interface SegmentWithSession extends Segment {
  sessionDate: string;
}

export function StoryScreen({ storyId }: { storyId: string }) {
  const go = useNav((s) => s.go);
  const [story, setStory] = useState<Story | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [segments, setSegments] = useState<SegmentWithSession[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [storyDate, setStoryDate] = useState("");
  const [location, setLocation] = useState("");
  const [environment, setEnvironment] = useState<string[]>([]);
  const [mood, setMood] = useState<string[]>([]);
  const [characterIds, setCharacterIds] = useState<string[]>([]);

  async function refresh() {
    const s = await getStory(storyId);
    if (!s) return;
    setStory(s);
    setTitle(s.title);
    setSummary(s.summary);
    setStoryDate(s.storyDate);
    setLocation(s.location);
    setEnvironment(s.environment ? s.environment.split(", ").filter(Boolean) : []);
    setMood(s.mood);
    setCharacterIds(s.characterIds);
    setCharacters(await getCharactersByIds(s.characterIds));

    // Gather all segments from all linked sessions, ordered by session date then segment order.
    const linkedSessions = (
      await Promise.all(s.sessionIds.map((id) => db.sessions.get(id)))
    ).filter((x): x is Session => !!x);
    linkedSessions.sort((a, b) => (a.date < b.date ? -1 : 1));
    setSessions(linkedSessions);

    const allSegs: SegmentWithSession[] = [];
    for (const session of linkedSessions) {
      const segs = await listSegments(session.id);
      for (const seg of segs) {
        allSegs.push({ ...seg, sessionDate: session.date });
      }
    }
    setSegments(allSegs);
  }
  useEffect(() => { refresh(); }, [storyId]);

  async function save() {
    if (!story) return;
    const prevCharIds = new Set(story.characterIds);
    const nextCharIds = new Set(characterIds);

    await updateStory(storyId, {
      title: title.trim(),
      summary: summary.trim(),
      storyDate: storyDate.trim(),
      location: location.trim(),
      environment: environment.join(", "),
      mood,
    });

    // Sync character links
    for (const cid of characterIds) {
      if (!prevCharIds.has(cid)) await linkCharacterToStory(storyId, cid);
    }
    for (const cid of story.characterIds) {
      if (!nextCharIds.has(cid)) await unlinkCharacterFromStory(storyId, cid);
    }
    setEditing(false);
    await refresh();
  }

  async function continueRecording() {
    if (!story) return;
    const session = await createSession({ storyId: story.id });
    await linkSessionToStory(story.id, session.id);
    go({ name: "record", sessionId: session.id });
  }

  if (!story) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-ink/50">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-6">
        <button
          type="button"
          onClick={() => go({ name: "dashboard" })}
          className="text-sm text-ink/60 hover:text-ink"
        >
          ← Volver
        </button>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-warm hover:underline"
          >
            Editar
          </button>
        )}
      </header>

      {editing ? (
        <div className="space-y-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-2xl font-medium focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Resumen"
            rows={3}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
          <label className="block">
            <span className="text-sm font-medium text-ink/80">¿Cuándo pasó?</span>
            <input
              type="text"
              value={storyDate}
              onChange={(e) => setStoryDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink/80">¿Dónde?</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
            />
          </label>
          <div>
            <span className="text-sm font-medium text-ink/80 block mb-2">Ambiente</span>
            <ChipPicker options={ENVIRONMENT_CHIPS} selected={environment} onChange={setEnvironment} />
          </div>
          <div>
            <span className="text-sm font-medium text-ink/80 block mb-2">Tema</span>
            <ChipPicker options={MOOD_CHIPS} selected={mood} onChange={setMood} />
          </div>
          <div>
            <span className="text-sm font-medium text-ink/80 block mb-2">Personas</span>
            <CharacterPicker selectedIds={characterIds} onChange={setCharacterIds} />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-warm px-5 py-2 text-sm font-medium text-white hover:bg-warm/90"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); refresh(); }}
              className="rounded-lg px-3 py-2 text-sm text-ink/60 hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-medium text-ink">
            {story.title || "Historia sin título"}
          </h1>
          <p className="mt-2 text-sm text-ink/55">
            {[story.storyDate, story.location].filter(Boolean).join(" · ") || formatLongDate(story.createdAt)}
          </p>
          {story.environment && (
            <p className="mt-2 text-sm text-ink/55">Ambiente: {story.environment}</p>
          )}
          {characters.length > 0 && (
            <p className="mt-2 text-sm text-ink/55">
              Con:{" "}
              {characters.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ", "}
                  <button
                    type="button"
                    onClick={() => go({ name: "character", characterId: c.id })}
                    className="text-warm hover:underline"
                  >
                    {c.name}
                  </button>
                </span>
              ))}
            </p>
          )}
          {story.mood.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {story.mood.map((m) => (
                <span key={m} className="rounded-full bg-warm-soft text-warm text-xs px-2 py-0.5">
                  {m}
                </span>
              ))}
            </div>
          )}
          {story.summary && (
            <p className="mt-6 text-base text-ink leading-relaxed">{story.summary}</p>
          )}
        </>
      )}

      <section className="mt-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wide text-ink/50">Transcripción</h2>
          {sessions.length > 1 && (
            <span className="text-xs text-ink/45">{sessions.length} sesiones</span>
          )}
        </div>
        {segments.length === 0 ? (
          <p className="text-sm text-ink/50">Aún no hay grabaciones para esta historia.</p>
        ) : (
          <div className="space-y-6">
            {segments.map((s) => (
              <div key={s.id}>
                <p className="text-base leading-relaxed text-ink whitespace-pre-wrap">
                  {s.transcript}
                </p>
                {s.followUpQuestion && (
                  <p className="mt-2 text-sm text-ink/55 italic">
                    Pregunta: {s.followUpQuestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={continueRecording}
          className="rounded-lg border border-warm/40 bg-warm-soft px-5 py-3 text-sm font-medium text-warm hover:bg-warm/10"
        >
          Continuar grabando
        </button>
      </div>
    </div>
  );
}
