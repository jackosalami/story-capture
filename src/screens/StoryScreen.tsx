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
import { createCharacter, getCharactersByIds, getCharacter, updateCharacter } from "../db/characters";
import {
  listPendingMentionsForStory,
  setMentionStatus,
} from "../db/characterMentions";
import { db } from "../db/db";
import type { Story, Character, Segment, Session, CharacterMention } from "../db/types";
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
  const [mentions, setMentions] = useState<CharacterMention[]>([]);

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
    setMentions(await listPendingMentionsForStory(storyId));
  }
  useEffect(() => { refresh(); }, [storyId]);

  // Confirm a mention as matching an existing character: enrich the character
  // with the new traits + descriptive facts inferred from this story.
  async function confirmMatch(mention: CharacterMention) {
    if (!mention.suggestedCharacterId) return;
    const character = await getCharacter(mention.suggestedCharacterId);
    if (!character) return;
    const mergedTraits = Array.from(new Set([...character.traits, ...mention.newTraits]));
    const descAppend = mention.newDescriptionFacts.join(". ");
    const mergedDescription = character.description
      ? (descAppend ? `${character.description}\n\n${descAppend}` : character.description)
      : descAppend;
    const patch: Partial<Character> = {
      traits: mergedTraits,
      description: mergedDescription,
    };
    if (mention.newRelationship && !character.relationship) {
      patch.relationship = mention.newRelationship;
    }
    await updateCharacter(character.id, patch);
    if (story) await linkCharacterToStory(story.id, character.id);
    await setMentionStatus(mention.id, "linked");
    await refresh();
  }

  // Confirm the mention is a new person: create a Character with the AI's
  // draft profile and link to the story.
  async function confirmAsNew(mention: CharacterMention) {
    const newChar = await createCharacter({
      name: mention.mentionedAs,
      relationship: mention.newRelationship ?? "",
      description: mention.newDescriptionFacts.join(". "),
      traits: mention.newTraits,
    });
    if (story) await linkCharacterToStory(story.id, newChar.id);
    await setMentionStatus(mention.id, "created");
    await refresh();
  }

  async function dismissMention(mention: CharacterMention) {
    await setMentionStatus(mention.id, "dismissed");
    await refresh();
  }

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
          <p className="text-warm-deep/80 text-xs uppercase tracking-widest font-medium mb-3">
            Una historia
          </p>
          <h1 className="h-serif text-4xl md:text-5xl text-ink leading-tight">
            {story.title || "Historia sin título"}
          </h1>
          <p className="mt-3 text-base text-ink-soft italic">
            {[story.storyDate, story.location].filter(Boolean).join(" · ") || formatLongDate(story.createdAt)}
          </p>
          {story.environment && (
            <p className="mt-1 text-sm text-ink-soft">Ambiente: {story.environment}</p>
          )}
          {characters.length > 0 && (
            <p className="mt-1 text-sm text-ink-soft">
              Con:{" "}
              {characters.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ", "}
                  <button
                    type="button"
                    onClick={() => go({ name: "character", characterId: c.id })}
                    className="text-warm-deep hover:underline"
                  >
                    {c.name}
                  </button>
                </span>
              ))}
            </p>
          )}
          {story.mood.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {story.mood.map((m) => (
                <span key={m} className="rounded-full bg-warm-soft text-warm-deep text-[11px] font-medium tracking-wide px-2.5 py-0.5">
                  {m}
                </span>
              ))}
            </div>
          )}
          {story.summary && (
            <p className="mt-7 text-lg text-ink/85 leading-relaxed h-serif">{story.summary}</p>
          )}
        </>
      )}

      {!editing && mentions.length > 0 && (
        <PendingMentionsSection
          mentions={mentions}
          characters={characters}
          onConfirmMatch={confirmMatch}
          onConfirmNew={confirmAsNew}
          onDismiss={dismissMention}
        />
      )}

      <hr className="my-12 border-0 h-px bg-gradient-to-r from-transparent via-warm/40 to-transparent" />

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-xs uppercase tracking-widest text-ink-soft flex items-center gap-2">
            <span aria-hidden>✦</span> Transcripción
          </h2>
          {sessions.length > 1 && (
            <span className="text-xs text-ink-soft">{sessions.length} sesiones</span>
          )}
        </div>
        {segments.length === 0 ? (
          <p className="text-sm text-ink-soft italic">Aún no hay grabaciones para esta historia.</p>
        ) : (
          <div className="space-y-7">
            {segments.map((s) => (
              <div key={s.id}>
                <p className="h-serif text-lg leading-loose text-ink whitespace-pre-wrap">
                  {s.transcript}
                </p>
                {s.followUpQuestion && (
                  <p className="mt-3 text-sm text-ink-soft italic border-l-2 border-warm/30 pl-3">
                    {s.followUpQuestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-14 flex justify-center">
        <button
          type="button"
          onClick={continueRecording}
          className="rounded-full border border-warm/40 bg-warm-soft px-6 py-3 text-sm font-medium text-warm-deep hover:bg-warm/15 transition"
        >
          ↪ Continuar grabando
        </button>
      </div>
    </div>
  );
}

// ---- Pending character-mention review ----
// Displayed after a session ends and the AI has detected people in the
// transcript. Admin confirms whether each is a match to an existing character,
// a new person, or a false positive.

function PendingMentionsSection({
  mentions,
  characters,
  onConfirmMatch,
  onConfirmNew,
  onDismiss,
}: {
  mentions: CharacterMention[];
  characters: Character[];
  onConfirmMatch: (m: CharacterMention) => void;
  onConfirmNew: (m: CharacterMention) => void;
  onDismiss: (m: CharacterMention) => void;
}) {
  const byId = new Map(characters.map((c) => [c.id, c]));
  return (
    <section className="mt-8 rounded-2xl border border-ink/10 bg-white px-5 py-5">
      <p className="text-xs uppercase tracking-widest text-warm-deep font-semibold mb-1">
        Personas detectadas
      </p>
      <p className="text-sm text-ink-soft mb-4">
        En la grabación mencionaste a estas personas. Confirma si son personajes
        del libro, o si es alguien nuevo que debamos guardar.
      </p>
      <ul className="space-y-3">
        {mentions.map((m) => {
          const suggested = m.suggestedCharacterId ? byId.get(m.suggestedCharacterId) : null;
          return (
            <li key={m.id} className="rounded-xl bg-paper-deep/40 border border-ink/8 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <p className="h-serif text-lg text-ink">
                  «{m.mentionedAs}»
                </p>
                <span className={
                  "text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full " +
                  (m.confidence === "high"
                    ? "bg-emerald-100 text-emerald-700"
                    : m.confidence === "medium"
                      ? "bg-warm-soft text-warm-deep"
                      : "bg-ink/10 text-ink-soft")
                }>
                  {m.confidence === "high" ? "Match seguro"
                    : m.confidence === "medium" ? "Posible match"
                    : m.confidence === "low" ? "Match incierto"
                    : "Sin pista"}
                </span>
              </div>

              {suggested && (
                <p className="text-sm text-ink-soft mb-2">
                  Probablemente sea <strong className="text-ink">{suggested.name}</strong>
                  {suggested.relationship && <> ({suggested.relationship})</>}.
                </p>
              )}

              {(m.newTraits.length > 0 || m.newDescriptionFacts.length > 0 || m.newRelationship) && (
                <div className="text-xs text-ink-soft mb-3 space-y-1">
                  {m.newRelationship && <p><strong>Relación detectada:</strong> {m.newRelationship}</p>}
                  {m.newDescriptionFacts.length > 0 && (
                    <p><strong>Detalles nuevos:</strong> {m.newDescriptionFacts.join(" · ")}</p>
                  )}
                  {m.newTraits.length > 0 && (
                    <p><strong>Personalidad:</strong> {m.newTraits.join(", ")}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {suggested && (
                  <button
                    type="button"
                    onClick={() => onConfirmMatch(m)}
                    className="rounded-full bg-warm text-white text-xs px-3 py-1.5 hover:bg-warm-deep"
                  >
                    ✓ Es {suggested.name}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onConfirmNew(m)}
                  className="rounded-full border border-warm/40 bg-warm-soft text-warm-deep text-xs px-3 py-1.5 hover:bg-warm/15"
                >
                  + Persona nueva
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(m)}
                  className="rounded-full text-ink-soft text-xs px-3 py-1.5 hover:text-ink"
                >
                  Descartar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
