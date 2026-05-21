import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { getSession, listSegments } from "../db/sessions";
import type { Session, Segment } from "../db/types";
import { formatLongDate } from "../lib/format";

export function SessionScreen({ sessionId }: { sessionId: string }) {
  const go = useNav((s) => s.go);
  const [session, setSession] = useState<Session | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);

  useEffect(() => {
    (async () => {
      const s = await getSession(sessionId);
      const segs = await listSegments(sessionId);
      setSession(s ?? null);
      setSegments(segs);
    })();
  }, [sessionId]);

  if (!session) {
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
        <span className="text-sm text-ink/50">{formatLongDate(session.date)}</span>
      </header>

      {session.summary && (
        <section className="mb-10 rounded-2xl bg-warm-soft border border-warm/30 px-6 py-5">
          <p className="text-xs uppercase tracking-wide text-warm font-medium mb-2">
            Resumen
          </p>
          <p className="text-base text-ink leading-relaxed">{session.summary}</p>
        </section>
      )}

      <section>
        <h2 className="text-sm uppercase tracking-wide text-ink/50 mb-3">
          Transcripción
        </h2>
        <div className="space-y-6">
          {segments.map((s) => (
            <div key={s.id}>
              <p className="text-base leading-relaxed text-ink whitespace-pre-wrap">
                {s.transcript}
              </p>
              {s.followUpQuestion && (
                <p className="mt-3 text-sm text-ink/60 italic">
                  Pregunta: {s.followUpQuestion}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
