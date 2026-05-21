import { useEffect, useState } from "react";
import { createSession, listSessions } from "../db/sessions";
import type { Session } from "../db/types";
import { useNav } from "../store/nav";
import { formatLongDate } from "../lib/format";

export function DashboardScreen() {
  const go = useNav((s) => s.go);
  const [sessions, setSessions] = useState<Session[] | null>(null);

  useEffect(() => {
    listSessions().then(setSessions);
  }, []);

  async function startNewSession() {
    const s = await createSession();
    go({ name: "record", sessionId: s.id });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-10">
        <h1 className="text-4xl font-medium text-ink">Tus historias</h1>
        <button
          type="button"
          onClick={() => go({ name: "settings" })}
          className="text-sm text-ink/60 hover:text-ink underline-offset-2 hover:underline"
        >
          Ajustes
        </button>
      </header>

      <button
        type="button"
        onClick={startNewSession}
        className="w-full rounded-2xl bg-warm px-8 py-8 text-2xl font-medium text-white shadow-md hover:bg-warm/90 active:scale-[0.99] transition"
      >
        Nueva historia
      </button>

      <div className="mt-12">
        {sessions === null ? (
          <p className="text-ink/50">Cargando…</p>
        ) : sessions.length === 0 ? (
          <p className="text-ink/60 text-center">
            Aún no has contado ninguna historia. Toca <strong>Nueva historia</strong> para empezar.
          </p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() =>
                    go(
                      s.status === "recording"
                        ? { name: "record", sessionId: s.id }
                        : { name: "session", sessionId: s.id },
                    )
                  }
                  className="block w-full text-left rounded-xl border border-ink/10 bg-white px-5 py-4 hover:border-warm/60 hover:shadow-sm transition"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-base font-medium text-ink">
                      {formatLongDate(s.date)}
                    </span>
                    <span className="text-xs text-ink/50">
                      {s.status === "recording" ? "Sin terminar" : "Terminada"}
                    </span>
                  </div>
                  {s.summary && (
                    <p className="mt-2 text-sm text-ink/70 line-clamp-3">
                      {s.summary}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
