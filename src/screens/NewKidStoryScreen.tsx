import { useState } from "react";
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
import type { AgeBand } from "../db/types";

const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: "3-5", label: "3 – 5 años" },
  { value: "6-8", label: "6 – 8 años" },
  { value: "9-12", label: "9 – 12 años" },
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
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const protagonists = await getKidCharactersByIds(protagonistIds);
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
        // Generous: ~1000 Spanish words is ~1500 tokens, plus title and slack.
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
      go({ name: "kids-story", kidStoryId: story.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  const canSubmit = protagonistIds.length > 0 || setting.trim() || theme.trim();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-8">
        <button
          type="button"
          onClick={() => go({ name: "kids-dashboard" })}
          className="text-sm text-ink/60 hover:text-ink"
        >
          ← Volver
        </button>
        <span className="text-sm text-ink/50">Cuentos para niños</span>
      </header>

      <h1 className="text-3xl font-medium text-ink mb-2">Nuevo cuento</h1>
      <p className="text-base text-ink/60 mb-8">
        Dime un poco sobre los personajes, el escenario y la idea. Yo escribo el
        cuento — unos 7 minutos de lectura en voz alta.
      </p>

      <div className="space-y-7">
        <Field label="Los protagonistas" hint="Escoge o crea los personajes principales del cuento.">
          <KidCharacterPicker selectedIds={protagonistIds} onChange={setProtagonistIds} />
        </Field>

        <Field label="¿Dónde pasa el cuento?" hint="Por ejemplo: «un bosque mágico», «una nave espacial», «el patio de la abuela».">
          <input
            type="text"
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            placeholder="En…"
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
        </Field>

        <Field label="¿De qué quieres que trate?" hint="Una idea, un tema, una lección — o un problemita que el protagonista resuelva.">
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Por ejemplo: aprender a compartir, perder el miedo a la oscuridad…"
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
        </Field>

        <Field label="¿Para qué edad?">
          <div className="flex gap-2">
            {AGE_BANDS.map((ab) => (
              <button
                key={ab.value}
                type="button"
                onClick={() => setAgeBand(ab.value)}
                className={
                  "flex-1 rounded-lg border px-3 py-2 text-sm transition " +
                  (ageBand === ab.value
                    ? "bg-warm text-white border-warm"
                    : "bg-white text-ink border-ink/20 hover:border-warm/60")
                }
              >
                {ab.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="¿Para quién es? (opcional)" hint="Si lo dedicas a un niño en particular, escribe su nombre aquí.">
          <input
            type="text"
            value={forChild}
            onChange={(e) => setForChild(e.target.value)}
            placeholder="Para…"
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
        </Field>

        <Field label="Duración aproximada">
          <div className="flex gap-2">
            {[
              { v: 700, label: "5 min" },
              { v: 1000, label: "7 min" },
              { v: 1400, label: "10 min" },
              { v: 2000, label: "15 min" },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setTargetWords(opt.v)}
                className={
                  "flex-1 rounded-lg border px-3 py-2 text-sm transition " +
                  (targetWords === opt.v
                    ? "bg-warm text-white border-warm"
                    : "bg-white text-ink border-ink/20 hover:border-warm/60")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-record-soft border border-record/30 px-4 py-3 text-sm text-record">
          {error}
        </div>
      )}

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={generate}
          disabled={generating || !canSubmit}
          className="rounded-lg bg-warm px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-warm/90 disabled:opacity-50"
        >
          {generating ? "Escribiendo el cuento…" : "Crear cuento"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-medium text-ink">{label}</h2>
      {hint && <p className="text-sm text-ink/55 mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

// Pull the first non-empty line as the title; the rest is the body.
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
  // Skip leading blank lines after the title
  while (bodyStart < lines.length && !lines[bodyStart].trim()) bodyStart++;
  const body = lines.slice(bodyStart).join("\n").trim();
  return { title: title || "Cuento", body: body || cleaned };
}
