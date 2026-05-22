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

export function StorySetupScreen({ storyId, sessionId }: Props) {
  const go = useNav((s) => s.go);
  const [topicPrompt, setTopicPrompt] = useState<string | null>(null);
  const [showRecall, setShowRecall] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
      <header className="mb-10">
        <button
          type="button"
          onClick={() => go({ name: "dashboard" })}
          className="text-sm text-ink-soft hover:text-ink"
        >
          ← Volver
        </button>
      </header>

      <p className="text-warm-deep/80 text-xs uppercase tracking-widest font-medium mb-3">
        Un momento de pausa
      </p>
      <h1 className="h-serif text-4xl md:text-5xl text-ink mb-7 leading-tight">
        Antes de empezar, piensa un momento…
      </h1>

      {topicPrompt && (
        <div className="mb-8 rounded-2xl bg-warm-soft border border-warm/25 px-6 py-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-warm-deep font-medium mb-2">
            Tema de hoy
          </p>
          <p className="h-serif text-xl text-ink leading-relaxed">{topicPrompt}</p>
        </div>
      )}

      <ul className="space-y-4 mb-10">
        <Prompt>¿Cuándo pasó esto?</Prompt>
        <Prompt>¿Dónde fue?</Prompt>
        <Prompt>¿Cómo era el ambiente — el clima, la luz, los olores?</Prompt>
        <Prompt>¿Quiénes estaban contigo?</Prompt>
        <Prompt>¿Cómo te hacía sentir?</Prompt>
      </ul>

      <p className="text-base text-ink-soft mb-10 leading-relaxed italic">
        No tienes que contestar nada antes. Cuando empieces a grabar, deja que
        salga como salga. Yo iré escuchando y, si quieres, te haré preguntas
        para que recuerdes más detalles.
      </p>

      <details
        className="mb-12 rounded-2xl paper-card overflow-hidden"
        open={showRecall}
        onToggle={(e) => setShowRecall((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between font-medium text-ink">
          <span className="flex items-center gap-2">
            <span aria-hidden>✨</span>
            Cosas que ayudan a recordar mejor
          </span>
          <span aria-hidden className="text-ink-soft text-sm">{showRecall ? "−" : "+"}</span>
        </summary>
        <div className="px-6 pb-6 -mt-1 text-[15px] text-ink/75 leading-relaxed space-y-2">
          <p>Cierra los ojos un momento y vuelve a aquel lugar. Piensa en:</p>
          <ul className="space-y-2 mt-3">
            <RecallRow icon="🌦">El clima — ¿hacía frío, calor, llovía, había sol?</RecallRow>
            <RecallRow icon="🕰">La hora — ¿era de mañana, mediodía, noche?</RecallRow>
            <RecallRow icon="👃">Los olores — ¿qué se cocinaba? ¿olía a tierra mojada, a leña, a perfume?</RecallRow>
            <RecallRow icon="🍲">La comida — ¿qué estabas comiendo? ¿quién la preparó?</RecallRow>
            <RecallRow icon="🔊">Los sonidos — ¿voces, música, animales, silencio?</RecallRow>
            <RecallRow icon="🙂">Las caras — ¿quién estaba? ¿cómo era su voz, su risa?</RecallRow>
            <RecallRow icon="👗">La ropa — ¿qué llevabas puesto tú? ¿y los demás?</RecallRow>
            <RecallRow icon="✋">Las texturas — ¿el suelo, las paredes, la tela de tu vestido?</RecallRow>
            <RecallRow icon="💛">Lo que sentías por dentro — ¿alegría, miedo, vergüenza, paz?</RecallRow>
          </ul>
        </div>
      </details>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={start}
          className="rounded-full bg-record px-10 py-5 text-xl font-medium text-white shadow-[0_8px_30px_rgba(194,65,12,0.35)] hover:shadow-[0_12px_36px_rgba(194,65,12,0.45)] hover:bg-warm-deep transition active:translate-y-px"
        >
          Empezar a grabar
        </button>
      </div>

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
    <li className="flex items-start gap-3 text-xl text-ink/90 leading-relaxed h-serif">
      <span className="text-warm select-none">·</span>
      <span>{children}</span>
    </li>
  );
}

function RecallRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden className="select-none mt-0.5">{icon}</span>
      <span>{children}</span>
    </li>
  );
}
