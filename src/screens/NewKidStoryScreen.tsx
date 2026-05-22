import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { useSettings } from "../store/settings";
import { KidCharacterPicker } from "../components/KidCharacterPicker";
import { getKidCharactersByIds } from "../db/kidCharacters";
import { createKidStory } from "../db/kidStories";
import { chat } from "../api/openai";
import {
  buildKidStorySystemPrompt,
  buildKidStoryUserPrompt,
} from "../prompts/kidStory";
import { generateImagePrompts } from "../lib/generateImagePrompts";
import { getKidStory } from "../db/kidStories";
import { augmentCastForPrompt } from "../lib/characterDefaults";
import type { AgeBand } from "../db/types";
import { Sparkle, StarMascot } from "../components/Mascots";

const AGE_BANDS: { value: AgeBand; label: string; emoji: string }[] = [
  { value: "3-5", label: "3 – 5", emoji: "🧸" },
  { value: "6-8", label: "6 – 8", emoji: "🚀" },
  { value: "9-12", label: "9 – 12", emoji: "🗺️" },
];

const LENGTH_OPTIONS = [
  { v: 700,  label: "5 min",  emoji: "⏱️" },
  { v: 1000, label: "7 min",  emoji: "🌟" },
  { v: 1400, label: "10 min", emoji: "🌙" },
  { v: 2000, label: "15 min", emoji: "🏰" },
];

const COOKING_MESSAGES = [
  "Convocando a los personajes…",
  "Pintando el escenario…",
  "Inventando el primer giro…",
  "Buscando las palabras justas…",
  "Pensando en un buen final…",
  "Diseñando las imágenes del cuento…",
  "Casi listo…",
];

export function NewKidStoryScreen() {
  const go = useNav((s) => s.go);
  const chapterModel = useSettings((s) => s.chapterModel);

  const [protagonistIds, setProtagonistIds] = useState<string[]>([]);
  const [setting, setSetting] = useState("");
  const [theme, setTheme] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("6-8");
  const [forChild, setForChild] = useState("");
  const [targetWords, setTargetWords] = useState(1000);
  const [generating, setGenerating] = useState(false);
  const [cookingStep, setCookingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!generating) return;
    setCookingStep(0);
    const t = setInterval(() => {
      setCookingStep((s) => (s + 1 < COOKING_MESSAGES.length ? s + 1 : s));
    }, 2400);
    return () => clearInterval(t);
  }, [generating]);

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const protagonists = augmentCastForPrompt(
        await getKidCharactersByIds(protagonistIds),
      );
      const content = await chat({
        model: chapterModel,
        messages: [
          { role: "system", content: buildKidStorySystemPrompt(ageBand, targetWords) },
          {
            role: "user",
            content: buildKidStoryUserPrompt({
              protagonists,
              setting,
              theme,
              forChild,
              targetWords,
            }),
          },
        ],
        temperature: 0.9,
        maxTokens: 2500,
      });

      const { title, body } = splitTitleAndBody(content);

      const story = await createKidStory({
        title,
        protagonistIds,
        setting,
        theme,
        ageBand,
        forChild,
        targetWords,
        content: body,
      });

      // Second pass: generate Nano Banana image prompts for the finished story.
      // The story is already saved, so navigation works even if this step fails
      // (KidStoryScreen lets the user regenerate prompts on demand).
      const fresh = await getKidStory(story.id);
      if (fresh) await generateImagePrompts({ story: fresh, model: chapterModel });

      go({ name: "kids-story", kidStoryId: story.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  const canSubmit = protagonistIds.length > 0 || setting.trim() || theme.trim();

  if (generating) {
    return <GenerationOverlay step={cookingStep} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <button
          type="button"
          onClick={() => go({ name: "kids-dashboard" })}
          className="text-sm text-night/60 hover:text-night"
        >
          ← Volver
        </button>
        <span className="text-xs text-night/45 uppercase tracking-widest font-semibold">
          Nuevo cuento
        </span>
      </header>

      <h1 className="h-display text-4xl md:text-5xl text-night leading-tight mb-3">
        Vamos a inventar un cuento
      </h1>
      <p className="text-base text-night/70 mb-10">
        Dime un poco sobre los personajes, el escenario y la idea. Yo escribo el
        cuento — unos 7 minutos de lectura en voz alta.
      </p>

      <div className="space-y-8">
        <Field label="Los protagonistas" emoji="🧙" hint="Escoge o crea los personajes principales.">
          <KidCharacterPicker selectedIds={protagonistIds} onChange={setProtagonistIds} />
        </Field>

        <Field label="¿Dónde pasa el cuento?" emoji="🏞️" hint="Un bosque mágico, una nave espacial, el patio de la abuela…">
          <input
            type="text"
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            placeholder="En…"
            className="w-full rounded-2xl border-2 border-night/10 bg-white px-4 py-3 text-base focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
          />
        </Field>

        <Field label="¿De qué quieres que trate?" emoji="💡" hint="Un tema, una lección, un problemita que se resuelva.">
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Aprender a compartir, perder el miedo a la oscuridad…"
            className="w-full rounded-2xl border-2 border-night/10 bg-white px-4 py-3 text-base focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
          />
        </Field>

        <Field label="¿Para qué edad?" emoji="🎈">
          <div className="grid grid-cols-3 gap-3">
            {AGE_BANDS.map((ab) => {
              const active = ageBand === ab.value;
              return (
                <button
                  key={ab.value}
                  type="button"
                  onClick={() => setAgeBand(ab.value)}
                  className={
                    "kid-button rounded-2xl px-3 py-4 transition flex flex-col items-center gap-1 " +
                    (active
                      ? "bg-grape text-white shadow-md"
                      : "bg-white text-night border-2 border-night/10 hover:border-grape")
                  }
                >
                  <span className="text-2xl">{ab.emoji}</span>
                  <span className="h-display font-semibold">{ab.label}</span>
                  <span className={"text-[11px] uppercase tracking-wide " + (active ? "text-white/80" : "text-night/55")}>
                    años
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="¿Para quién es?" emoji="💝" hint="Opcional, si lo dedicas a un niño en particular.">
          <input
            type="text"
            value={forChild}
            onChange={(e) => setForChild(e.target.value)}
            placeholder="Para…"
            className="w-full rounded-2xl border-2 border-night/10 bg-white px-4 py-3 text-base focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
          />
        </Field>

        <Field label="Duración" emoji="⏰">
          <div className="grid grid-cols-4 gap-2">
            {LENGTH_OPTIONS.map((opt) => {
              const active = targetWords === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setTargetWords(opt.v)}
                  className={
                    "kid-button rounded-2xl px-2 py-3 transition flex flex-col items-center gap-0.5 " +
                    (active
                      ? "bg-sky text-white shadow-md"
                      : "bg-white text-night border-2 border-night/10 hover:border-sky")
                  }
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="h-display font-semibold text-sm">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      {error && (
        <div className="mt-8 rounded-2xl bg-strawberry-soft border-2 border-strawberry/30 px-5 py-3 text-sm text-strawberry">
          {error}
        </div>
      )}

      <div className="mt-12 flex justify-end">
        <button
          type="button"
          onClick={generate}
          disabled={!canSubmit}
          className="btn-3d kid-button rounded-2xl bg-gradient-to-br from-strawberry via-tangerine to-sun px-8 py-4 text-lg h-display font-semibold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ borderBottomColor: "#d63b73" }}
        >
          ✨ ¡Crear cuento!
        </button>
      </div>
    </div>
  );
}

function GenerationOverlay({ step }: { step: number }) {
  const progress = Math.min(100, ((step + 1) / COOKING_MESSAGES.length) * 100);
  return (
    <div className="min-h-svh flex flex-col items-center justify-center px-6">
      <div className="relative w-44 h-44 mb-8">
        <StarMascot className="absolute inset-0 kid-avatar bob" />
        <Sparkle className="absolute -top-4 -right-2 w-6 h-6 text-strawberry blob-drift" />
        <Sparkle className="absolute -bottom-2 -left-4 w-5 h-5 text-grape blob-drift" />
      </div>
      <p className="h-display text-night text-2xl mb-2 text-center">
        Escribiendo tu cuento…
      </p>
      <p className="text-night/65 text-center max-w-sm mb-8 min-h-[3rem]">
        {COOKING_MESSAGES[step]}
      </p>
      <div className="w-72 max-w-full h-4 rounded-full bg-night/8 overflow-hidden border-2 border-night/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-strawberry via-tangerine to-sun transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-4 text-xs uppercase tracking-widest text-night/45 font-semibold">
        Esto puede tardar 20-40 segundos
      </p>
    </div>
  );
}

function Field({
  label,
  emoji,
  hint,
  children,
}: {
  label: string;
  emoji?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="h-display text-xl text-night flex items-center gap-2">
        {emoji && <span aria-hidden>{emoji}</span>}
        {label}
      </h2>
      {hint && <p className="text-sm text-night/55 mt-1 mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

function splitTitleAndBody(text: string): { title: string; body: string } {
  const cleaned = text.trim();
  const lines = cleaned.split(/\r?\n/);
  let title = "";
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      title = lines[i].trim().replace(/^[#*\-\s"'«»]+|[\s"'«»]+$/g, "");
      bodyStart = i + 1;
      break;
    }
  }
  while (bodyStart < lines.length && !lines[bodyStart].trim()) bodyStart++;
  const body = lines.slice(bodyStart).join("\n").trim();
  return { title: title || "Cuento", body: body || cleaned };
}
