import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { createSession, listSessions, migrateOrphanSessions } from "../db/sessions";
import { createStory, linkSessionToStory, listStories } from "../db/stories";
import type { Session, Story } from "../db/types";
import { formatLongDate } from "../lib/format";
import { groupByDecade, groupByTheme } from "../lib/groupStories";

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

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-10">
        <h1 className="text-4xl font-medium text-ink">Tus historias</h1>
        <nav className="flex items-center gap-4 text-sm">
          <button
            type="button"
            onClick={() => go({ name: "characters" })}
            className="text-ink/70 hover:text-ink"
          >
            Personajes
          </button>
          <button
            type="button"
            onClick={() => go({ name: "settings" })}
            className="text-ink/60 hover:text-ink"
          >
            Ajustes
          </button>
        </nav>
      </header>

      <button
        type="button"
        onClick={startNewStory}
        className="w-full rounded-2xl bg-warm px-8 py-8 text-2xl font-medium text-white shadow-md hover:bg-warm/90 active:scale-[0.99] transition"
      >
        Nueva historia
      </button>

      {stories && stories.length > 0 && (
        <div className="mt-10 flex gap-1 rounded-lg bg-ink/5 p-1">
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
      )}

      <div className="mt-6">
        {stories === null || sessions === null ? (
          <p className="text-ink/50">Cargando…</p>
        ) : stories.length === 0 ? (
          <p className="mt-6 text-ink/60 text-center">
            Aún no has contado ninguna historia. Toca <strong>Nueva historia</strong> para empezar.
          </p>
        ) : view === "chrono" ? (
          <ChronoView stories={stories} />
        ) : view === "theme" ? (
          <ThemeView stories={stories} />
        ) : (
          <SessionView sessions={sessions} stories={stories} />
        )}
      </div>
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
        "flex-1 rounded-md px-3 py-2 text-sm font-medium transition " +
        (active ? "bg-white text-ink shadow-sm" : "text-ink/60 hover:text-ink")
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
      className="block w-full text-left rounded-xl border border-ink/10 bg-white px-5 py-4 hover:border-warm/60 hover:shadow-sm transition"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-base font-medium text-ink">{title}</span>
        {story.storyDate && (
          <span className="text-xs text-ink/50">{story.storyDate}</span>
        )}
      </div>
      {story.location && (
        <p className="mt-1 text-xs text-ink/55">{story.location}</p>
      )}
      {story.summary && (
        <p className="mt-2 text-sm text-ink/70 line-clamp-3">{story.summary}</p>
      )}
      {story.mood.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {story.mood.slice(0, 4).map((m) => (
            <span key={m} className="rounded-full bg-warm-soft text-warm text-xs px-2 py-0.5">
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
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="text-sm uppercase tracking-wide text-ink/50 mb-3">{g.label}</h2>
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
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.mood}>
          <h2 className="text-sm uppercase tracking-wide text-ink/50 mb-3">{g.mood}</h2>
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
              className="block w-full text-left rounded-xl border border-ink/10 bg-white px-5 py-4 hover:border-warm/60 hover:shadow-sm transition"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-base font-medium text-ink">
                  {story?.title || "Sin título"}
                </span>
                <span className="text-xs text-ink/50">
                  {formatLongDate(s.date)}
                  {s.status === "recording" && " · sin terminar"}
                </span>
              </div>
              {s.summary && (
                <p className="mt-2 text-sm text-ink/70 line-clamp-2">{s.summary}</p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
