import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { createSession, listSessions, migrateOrphanSessions } from "../db/sessions";
import { createStory, linkSessionToStory, listStories } from "../db/stories";
import type { Session, Story } from "../db/types";
import { formatLongDate } from "../lib/format";
import { groupByDecade, groupByTheme } from "../lib/groupStories";
import { ModeToggle } from "../components/ModeToggle";

type View = "chrono" | "theme" | "session";

export function DashboardScreen() {
  const go = useNav((s) => s.go);
  const [view, setView] = useState<View>("chrono");
  const [stories, setStories] = useState<Story[] | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);

  useEffect(() => {
    (async () => {
      await migrateOrphanSessions();
      const [st, se] = await Promise.all([listStories(), listSessions()]);
      setStories(st);
      setSessions(se);
    })();
  }, []);

  async function startNewStory() {
    const story = await createStory();
    const session = await createSession({ storyId: story.id });
    await linkSessionToStory(story.id, session.id);
    go({ name: "story-setup", storyId: story.id, sessionId: session.id });
  }

  const hasStories = (stories?.length ?? 0) > 0;

  return (
    <div className="relative">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-16">
        <div className="flex justify-center mb-8">
          <ModeToggle active="memoir" />
        </div>

        <header className="mb-10">
          <div className="flex items-baseline justify-between">
            <h1 className="h-serif text-5xl text-ink leading-none">Tus historias</h1>
            <nav className="hidden sm:flex items-center gap-5 text-sm">
              <button
                type="button"
                onClick={() => go({ name: "walkthrough" })}
                className="text-ink-soft hover:text-ink"
              >
                ¿Cómo funciona?
              </button>
              <button
                type="button"
                onClick={() => go({ name: "characters" })}
                className="text-ink-soft hover:text-ink"
              >
                Personajes
              </button>
              <button
                type="button"
                onClick={() => go({ name: "settings" })}
                className="text-ink-soft hover:text-ink"
              >
                Ajustes
              </button>
            </nav>
          </div>
          <p className="mt-3 text-ink-soft text-lg">
            Un lugar tranquilo para guardar los recuerdos que un día se vuelven libro.
          </p>
        </header>

        <div className="grid sm:grid-cols-[2fr_1fr] gap-3">
          <button
            type="button"
            onClick={startNewStory}
            className="group relative overflow-hidden rounded-3xl bg-warm px-8 py-10 text-left shadow-md hover:shadow-xl transition active:translate-y-px"
          >
            <span className="block text-white/80 text-sm font-medium tracking-wide uppercase">
              Empezar
            </span>
            <span className="block mt-1 text-white text-3xl h-serif">Nueva historia</span>
            <span className="block mt-2 text-white/85 text-sm">
              Toca aquí y empieza a contar lo que recuerdas.
            </span>
            <span aria-hidden className="absolute -right-6 -bottom-8 text-7xl opacity-25 select-none">
              ✒️
            </span>
          </button>
          <button
            type="button"
            onClick={() => go({ name: "topics" })}
            className="rounded-3xl border-2 border-warm/30 bg-warm-soft/60 px-6 py-10 text-left hover:border-warm/60 hover:bg-warm-soft transition"
          >
            <span className="block text-warm-deep text-sm font-medium tracking-wide uppercase">
              Inspiración
            </span>
            <span className="block mt-1 text-warm-deep text-2xl h-serif">¿De qué hablar hoy?</span>
            <span className="block mt-2 text-warm-deep/80 text-sm">
              Veinte temas para arrancar.
            </span>
          </button>
        </div>

        {hasStories && (
          <div className="mt-12 flex justify-center">
            <div className="inline-flex gap-1 rounded-full bg-paper-deep/70 border border-ink/5 p-1 text-sm">
              <ViewTab active={view === "chrono"} onClick={() => setView("chrono")}>
                Cronológica
              </ViewTab>
              <ViewTab active={view === "theme"} onClick={() => setView("theme")}>
                Temática
              </ViewTab>
              <ViewTab active={view === "session"} onClick={() => setView("session")}>
                Por sesión
              </ViewTab>
            </div>
          </div>
        )}

        <div className="mt-8">
          {stories === null || sessions === null ? (
            <p className="text-ink/50 text-center">Cargando…</p>
          ) : stories.length === 0 ? (
            <EmptyState />
          ) : view === "chrono" ? (
            <ChronoView stories={stories} />
          ) : view === "theme" ? (
            <ThemeView stories={stories} />
          ) : (
            <SessionView sessions={sessions} stories={stories} />
          )}
        </div>

        <nav className="mt-16 flex sm:hidden flex-wrap justify-center gap-4 text-sm text-ink-soft">
          <button onClick={() => go({ name: "walkthrough" })} className="hover:text-ink">¿Cómo funciona?</button>
          <button onClick={() => go({ name: "characters" })} className="hover:text-ink">Personajes</button>
          <button onClick={() => go({ name: "settings" })} className="hover:text-ink">Ajustes</button>
        </nav>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 mx-auto max-w-md text-center">
      <div aria-hidden className="text-6xl mb-4">🪶</div>
      <p className="text-ink-soft text-lg leading-relaxed">
        Todavía está todo por contar. Cuando estés lista, toca{" "}
        <strong className="text-ink">Nueva historia</strong> y empieza por donde quieras.
        No hay que ordenarlas en su sitio: yo iré juntando los pedazos.
      </p>
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-4 py-1.5 font-medium transition " +
        (active ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

function StoryCard({ story }: { story: Story }) {
  const go = useNav((s) => s.go);
  const title = story.title || "Historia sin título";
  return (
    <button
      type="button"
      onClick={() => go({ name: "story", storyId: story.id })}
      className="paper-card paper-card-hover block w-full text-left rounded-2xl px-6 py-5 transition"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="h-serif text-xl text-ink">{title}</span>
        {story.storyDate && (
          <span className="shrink-0 text-xs text-ink-soft font-medium tracking-wide uppercase">
            {story.storyDate}
          </span>
        )}
      </div>
      {story.location && (
        <p className="mt-1 text-sm text-ink-soft/85">{story.location}</p>
      )}
      {story.summary && (
        <p className="mt-3 text-[15px] text-ink/75 leading-relaxed line-clamp-3">{story.summary}</p>
      )}
      {story.mood.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {story.mood.slice(0, 4).map((m) => (
            <span key={m} className="rounded-full bg-warm-soft text-warm-deep text-[11px] font-medium tracking-wide px-2.5 py-0.5">
              {m}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function ChronoView({ stories }: { stories: Story[] }) {
  const groups = groupByDecade(stories);
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="h-serif text-2xl text-ink-soft mb-4">{g.label}</h2>
          <ul className="space-y-3">
            {g.stories.map((s) => (
              <li key={s.id}><StoryCard story={s} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ThemeView({ stories }: { stories: Story[] }) {
  const groups = groupByTheme(stories);
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.mood}>
          <h2 className="h-serif text-2xl text-ink-soft mb-4 capitalize">{g.mood}</h2>
          <ul className="space-y-3">
            {g.stories.map((s) => (
              <li key={s.id}><StoryCard story={s} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SessionView({ sessions, stories }: { sessions: Session[]; stories: Story[] }) {
  const go = useNav((s) => s.go);
  const storyById = new Map(stories.map((s) => [s.id, s]));
  return (
    <ul className="space-y-3">
      {sessions.map((s) => {
        const story = s.storyId ? storyById.get(s.storyId) : null;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                if (s.status === "recording") {
                  go({ name: "record", sessionId: s.id });
                } else if (story) {
                  go({ name: "story", storyId: story.id });
                }
              }}
              className="paper-card paper-card-hover block w-full text-left rounded-2xl px-6 py-5 transition"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="h-serif text-lg text-ink">
                  {story?.title || "Sin título"}
                </span>
                <span className="shrink-0 text-xs text-ink-soft">
                  {formatLongDate(s.date)}
                  {s.status === "recording" && " · sin terminar"}
                </span>
              </div>
              {s.summary && (
                <p className="mt-2 text-sm text-ink/75 line-clamp-2">{s.summary}</p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
