import { useState } from "react";
import { useSettings } from "../store/settings";
import { useNav } from "../store/nav";
import { validateApiKey } from "../api/openai";
import { downloadExport } from "../lib/exportJson";

export function SettingsScreen() {
  const settings = useSettings();
  const go = useNav((s) => s.go);
  const [key, setKey] = useState(settings.openaiApiKey);
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!key.trim()) {
      setError("Por favor, escribe tu clave de OpenAI.");
      return;
    }
    setStatus("checking");
    const ok = await validateApiKey(key.trim());
    if (!ok) {
      setStatus("bad");
      setError("La clave no es válida o no tiene acceso. Revísala e inténtalo de nuevo.");
      return;
    }
    settings.setApiKey(key.trim());
    setStatus("ok");
    setTimeout(() => go({ name: "dashboard" }), 500);
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-3xl font-medium text-ink mb-2">Ajustes</h1>
      <p className="text-base text-ink/70 mb-8">
        Esta aplicación usa la API de OpenAI para transcribir tu voz y hacerte preguntas.
        Pega tu clave personal aquí. Se guarda solo en este dispositivo.
      </p>

      <label className="block">
        <span className="text-sm font-medium text-ink/80">Clave de OpenAI</span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-..."
          className="mt-2 w-full rounded-lg border border-ink/20 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
        />
      </label>

      {error && (
        <p className="mt-3 text-sm text-record">{error}</p>
      )}
      {status === "ok" && (
        <p className="mt-3 text-sm text-emerald-700">Listo. Guardando…</p>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === "checking"}
          className="rounded-lg bg-warm px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-warm/90 disabled:opacity-50"
        >
          {status === "checking" ? "Comprobando…" : "Guardar"}
        </button>
        {settings.hasApiKey() && (
          <button
            type="button"
            onClick={() => go({ name: "dashboard" })}
            className="rounded-lg px-4 py-3 text-base text-ink/70 hover:text-ink"
          >
            Cancelar
          </button>
        )}
      </div>

      <p className="mt-10 text-xs text-ink/50">
        Si no tienes una clave, puedes crearla en{" "}
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          platform.openai.com/api-keys
        </a>
        . La clave se guarda solo en este navegador y nunca se envía a nadie más que a OpenAI.
      </p>

      {settings.hasApiKey() && (
        <section className="mt-12 border-t border-ink/10 pt-8">
          <h2 className="text-lg font-medium text-ink mb-2">Ayuda</h2>
          <button
            type="button"
            onClick={() => go({ name: "walkthrough" })}
            className="text-sm text-warm hover:underline"
          >
            Ver el tutorial otra vez
          </button>
        </section>
      )}

      {settings.hasApiKey() && (
        <section className="mt-10 border-t border-ink/10 pt-8">
          <h2 className="text-lg font-medium text-ink mb-2">Exportar todo</h2>
          <p className="text-sm text-ink/60 mb-4">
            Descarga un archivo JSON con todas tus historias, personajes, transcripciones
            y resúmenes. Sirve como copia de seguridad y como punto de partida para imprimir el libro.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadExport({ includeAudio: false })}
              className="rounded-lg border border-ink/20 px-4 py-2 text-sm text-ink hover:border-warm/60"
            >
              Descargar JSON (sin audio)
            </button>
            <button
              type="button"
              onClick={() => downloadExport({ includeAudio: true })}
              className="rounded-lg border border-ink/20 px-4 py-2 text-sm text-ink hover:border-warm/60"
            >
              Descargar JSON con audio
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
