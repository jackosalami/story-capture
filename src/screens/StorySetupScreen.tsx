import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import {
  getStory,
  updateStory,
  linkCharacterToStory,
  unlinkCharacterFromStory,
} from "../db/stories";
import { db } from "../db/db";
import { CharacterPicker } from "../components/CharacterPicker";
import { ChipPicker } from "../components/ChipPicker";
import { ENVIRONMENT_CHIPS, MOOD_CHIPS } from "../lib/constants";

interface Props {
  storyId: string;
  sessionId: string;
}

// The prep screen is a moment of pause — it shows the kinds of questions the
// storyteller might want to think about, but never asks her to fill anything in.
// Metadata is extracted from the transcript after she finishes talking.
// "Añadir detalles" reveals an optional form for users who do want to set
// metadata up front.

export function StorySetupScreen({ storyId, sessionId }: Props) {
  const go = useNav((s) => s.go);
  const [topicPrompt, setTopicPrompt] = useState<string | null>(null);
  const [showRecall, setShowRecall] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Optional advanced form state — only used when "Añadir detalles" is opened.
  const [storyDate, setStoryDate] = useState("");
  const [location, setLocation] = useState("");
  const [environment, setEnvironment] = useState<string[]>([]);
  const [mood, setMood] = useState<string[]>([]);
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [originalCharacterIds, setOriginalCharacterIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const s = await getStory(storyId);
      if (s) {
        setStoryDate(s.storyDate);
        setLocation(s.location);
        setEnvironment(s.environment ? s.environment.split(", ").filter(Boolean) : []);
        setMood(s.mood);
        setCharacterIds(s.characterIds);
        setOriginalCharacterIds(s.characterIds);
      }
      const sess = await db.sessions.get(sessionId);
      if (sess?.topicPrompt) setTopicPrompt(sess.topicPrompt);
    })();
  }, [storyId, sessionId]);

  async function start() {
    // If details panel is open, persist what was typed; otherwise just go.
    if (showDetails) {
      await updateStory(storyId, {
        storyDate: storyDate.trim(),
        location: location.trim(),
        environment: environment.join(", "),
        mood,
      });
      const prev = new Set(originalCharacterIds);
      const next = new Set(characterIds);
      for (const cid of characterIds) if (!prev.has(cid)) await linkCharacterToStory(storyId, cid);
      for (const cid of originalCharacterIds) if (!next.has(cid)) await unlinkCharacterFromStory(storyId, cid);
    }
    go({ name: "record", sessionId });
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-8">
        <button
          type="button"
          onClick={() => go({ name: "dashboard" })}
          className="text-sm text-ink/60 hover:text-ink"
        >
          ← Volver
        </button>
      </header>

      <h1 className="text-3xl font-medium text-ink mb-6 leading-tight">
        Antes de empezar, piensa un momento…
      </h1>

      {topicPrompt && (
        <div className="mb-8 rounded-xl bg-warm-soft border border-warm/30 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-warm font-medium mb-1">
            Tema de hoy
          </p>
          <p className="text-base text-ink leading-relaxed">{topicPrompt}</p>
        </div>
      )}

      <ul className="space-y-3 mb-8">
        <Prompt>¿Cuándo pasó esto?</Prompt>
        <Prompt>¿Dónde fue?</Prompt>
        <Prompt>¿Cómo era el ambiente — el clima, la luz, los olores?</Prompt>
        <Prompt>¿Quiénes estaban contigo?</Prompt>
        <Prompt>¿Cómo te hacía sentir?</Prompt>
      </ul>

      <p className="text-sm text-ink/60 mb-8 leading-relaxed">
        No tienes que contestar nada antes. Cuando empieces a grabar, deja que
        salga como salga. Yo iré escuchando y, si quieres, te haré preguntas
        para que recuerdes más detalles.
      </p>

      <div className="mb-10 rounded-xl border border-ink/10 bg-white">
        <button
          type="button"
          onClick={() => setShowRecall((v) => !v)}
          className="w-full text-left px-5 py-3 flex items-center justify-between"
        >
          <span className="text-sm font-medium text-ink">
            ✨ Cosas que ayudan a recordar mejor
          </span>
          <span className="text-ink/50 text-sm">{showRecall ? "−" : "+"}</span>
        </button>
        {showRecall && (
          <div className="px-5 pb-5 -mt-1 text-sm text-ink/75 leading-relaxed space-y-2">
            <p>Cierra los ojos un momento y vuelve a aquel lugar. Piensa en:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>El clima — ¿hacía frío, calor, llovía, había sol?</li>
              <li>La hora — ¿era de mañana, mediodía, noche?</li>
              <li>Los olores — ¿qué se cocinaba? ¿olía a tierra mojada, a leña, a perfume?</li>
              <li>La comida — ¿qué estabas comiendo o bebiendo? ¿quién la preparó?</li>
              <li>Los sonidos — ¿voces, música, animales, silencio?</li>
              <li>Las caras — ¿quién estaba? ¿cómo era su voz, su risa?</li>
              <li>La ropa — ¿qué llevabas puesto tú? ¿y los demás?</li>
              <li>Las texturas — ¿el suelo, las paredes, la tela de tu vestido?</li>
              <li>Lo que sentías por dentro — ¿alegría, miedo, vergüenza, paz?</li>
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={start}
          className="rounded-2xl bg-record px-10 py-5 text-xl font-medium text-white shadow-md hover:bg-record/90 active:scale-[0.99] transition"
        >
          Empezar a grabar
        </button>
      </div>

      {/* Power-user escape hatch: typed metadata up front. Hidden by default. */}
      <div className="mt-10 text-center">
        {!showDetails ? (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="text-xs text-ink/45 hover:text-ink underline-offset-2 hover:underline"
          >
            Añadir detalles antes de empezar
          </button>
        ) : (
          <p className="text-xs text-ink/45">
            Estos campos son opcionales — también puedes editarlos después.
          </p>
        )}
      </div>

      {showDetails && (
        <div className="mt-6 space-y-5 border-t border-ink/10 pt-6">
          <label className="block">
            <span className="text-sm font-medium text-ink/80">¿Cuándo pasó?</span>
            <input
              type="text"
              value={storyDate}
              onChange={(e) => setStoryDate(e.target.value)}
              placeholder="Cuando tenía…"
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
        </div>
      )}
    </div>
  );
}

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-lg text-ink/85 leading-relaxed">
      <span className="text-warm select-none mt-1">·</span>
      <span>{children}</span>
    </li>
  );
}
