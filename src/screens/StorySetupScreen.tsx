import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { getStory, updateStory, linkCharacterToStory } from "../db/stories";
import { CharacterPicker } from "../components/CharacterPicker";
import { ChipPicker } from "../components/ChipPicker";
import { ENVIRONMENT_CHIPS, MOOD_CHIPS } from "../lib/constants";

interface Props {
  storyId: string;
  sessionId: string;
}

export function StorySetupScreen({ storyId, sessionId }: Props) {
  const go = useNav((s) => s.go);
  const [storyDate, setStoryDate] = useState("");
  const [location, setLocation] = useState("");
  const [environment, setEnvironment] = useState<string[]>([]);
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [mood, setMood] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getStory(storyId);
      if (!s) return;
      setStoryDate(s.storyDate);
      setLocation(s.location);
      setEnvironment(s.environment ? s.environment.split(", ").filter(Boolean) : []);
      setCharacterIds(s.characterIds);
      setMood(s.mood);
    })();
  }, [storyId]);

  async function startRecording() {
    setSaving(true);
    await updateStory(storyId, {
      storyDate: storyDate.trim(),
      location: location.trim(),
      environment: environment.join(", "),
      mood,
    });
    // Link characters bidirectionally
    for (const cid of characterIds) {
      await linkCharacterToStory(storyId, cid);
    }
    go({ name: "record", sessionId });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-8">
        <button
          type="button"
          onClick={() => go({ name: "dashboard" })}
          className="text-sm text-ink/60 hover:text-ink"
        >
          ← Volver
        </button>
        <span className="text-sm text-ink/50">Antes de grabar</span>
      </header>

      <h1 className="text-3xl font-medium text-ink mb-2">Cuéntame de esta historia</h1>
      <p className="text-base text-ink/60 mb-8">
        Estos detalles me ayudan a organizar tus historias. Puedes saltar cualquier
        pregunta y volver a editar después.
      </p>

      <div className="space-y-8">
        <Field label="¿Cuándo pasó esto?" hint="Ejemplos: «primavera de 1972», «cuando tenía 8 años»">
          <input
            type="text"
            value={storyDate}
            onChange={(e) => setStoryDate(e.target.value)}
            placeholder="Cuando tenía…"
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
        </Field>

        <Field label="¿Dónde pasó?" hint="Ejemplo: «la casa de mi abuela en Salamanca»">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="En…"
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
        </Field>

        <Field label="¿Cómo era el ambiente?" hint="Toca las palabras que encajen, o escribe la tuya.">
          <ChipPicker
            options={ENVIRONMENT_CHIPS}
            selected={environment}
            onChange={setEnvironment}
            customPlaceholder="Otra palabra…"
          />
        </Field>

        <Field label="¿Quiénes estaban ahí?" hint="Añade las personas que aparecen en esta historia.">
          <CharacterPicker selectedIds={characterIds} onChange={setCharacterIds} />
        </Field>

        <Field label="¿De qué se trata?" hint="Una o más palabras que capturen el tema o sentimiento.">
          <ChipPicker
            options={MOOD_CHIPS}
            selected={mood}
            onChange={setMood}
            customPlaceholder="Otro tema…"
          />
        </Field>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go({ name: "record", sessionId })}
          className="text-sm text-ink/60 hover:text-ink underline-offset-2 hover:underline"
        >
          Saltar todo
        </button>
        <button
          type="button"
          onClick={startRecording}
          disabled={saving}
          className="rounded-lg bg-warm px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-warm/90 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Empezar a grabar"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-medium text-ink">{label}</h2>
      {hint && <p className="text-sm text-ink/55 mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}
