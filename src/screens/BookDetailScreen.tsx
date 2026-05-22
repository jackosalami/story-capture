import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { db } from "../db/db";
import { createSession } from "../db/sessions";
import { createStory, linkSessionToStory } from "../db/stories";
import {
  getBook,
  setActiveBook,
  updateBook,
  deleteBook,
} from "../db/memoirBooks";
import type { MemoirBook, Session, Story } from "../db/types";
import { formatLongDate } from "../lib/format";
import { groupByDecade, groupByTheme } from "../lib/groupStories";
import { useObjectUrl } from "../lib/useObjectUrl";
import { resizeImage } from "../lib/image";

type View = "chrono" | "theme" | "session";

export function BookDetailScreen({ bookId }: { bookId: string }) {
  const go = useNav((s) => s.go);
  const [book, setBook] = useState<MemoirBook | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [view, setView] = useState<View>("chrono");
  const [editing, setEditing] = useState(false);

  async function refresh() {
    const b = await getBook(bookId);
    if (!b) return;
    setBook(b);
    // Load only this book's stories + sessions
    const [allStories, allSessions] = await Promise.all([
      db.stories.toArray(),
      db.sessions.toArray(),
    ]);
    setStories(allStories.filter((s) => s.bookId === bookId));
    setSessions(allSessions.filter((s) => s.bookId === bookId).sort((a, b) => (a.date < b.date ? 1 : -1)));
  }

  useEffect(() => {
    refresh();
  }, [bookId]);

  async function startNewStory() {
    if (!book) return;
    // Make sure new content goes into THIS book even if it's not the active one.
    if (!book.isActive) await setActiveBook(book.id);
    const story = await createStory({ bookId: book.id });
    const session = await createSession({ storyId: story.id, bookId: book.id });
    await linkSessionToStory(story.id, session.id);
    go({ name: "story-setup", storyId: story.id, sessionId: session.id });
  }

  if (!book) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-ink-soft">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pt-6 pb-16">
      <header className="flex items-baseline justify-between mb-6">
        <button
          type="button"
          onClick={() => go({ name: "dashboard" })}
          className="text-sm text-ink-soft hover:text-ink"
        >
          ← Tus libros
        </button>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-warm-deep hover:underline"
          >
            Editar libro
          </button>
        )}
      </header>

      {editing ? (
        <BookEditCard
          book={book}
          onSaved={async () => {
            setEditing(false);
            await refresh();
          }}
          onCancel={() => setEditing(false)}
          onDeleted={() => go({ name: "dashboard" })}
        />
      ) : (
        <BookHeader book={book} storyCount={stories.length} onMakeActive={async () => {
          await setActiveBook(book.id);
          await refresh();
        }} />
      )}

      <button
        type="button"
        onClick={startNewStory}
        className="mt-8 w-full rounded-2xl bg-warm px-8 py-7 text-left shadow-md hover:shadow-xl transition active:translate-y-px relative overflow-hidden"
      >
        <span className="block text-white/85 text-xs font-medium tracking-widest uppercase">
          Empezar a contar
        </span>
        <span className="block mt-1 text-white text-2xl h-serif">
          Nueva historia en este libro
        </span>
        <span className="block mt-1 text-white/85 text-sm">
          Se guarda directamente aquí.
        </span>
        <span aria-hidden className="absolute -right-4 -bottom-6 text-6xl opacity-25 select-none">
          ✒️
        </span>
      </button>

      {stories.length > 0 && (
        <div className="mt-10 flex justify-center">
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

      <div className="mt-6">
        {stories.length === 0 ? (
          <EmptyBookState />
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

function BookHeader({
  book,
  storyCount,
  onMakeActive,
}: {
  book: MemoirBook;
  storyCount: number;
  onMakeActive: () => void;
}) {
  const coverUrl = useObjectUrl(book.coverImage);
  return (
    <div className="paper-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
      <div
        className="shrink-0 mx-auto sm:mx-0 w-32 aspect-[3/4] rounded-lg overflow-hidden shadow-md relative"
        style={{
          background:
            "linear-gradient(135deg, #8d3f0b 0%, #b85c1f 40%, #c49a4a 100%)",
        }}
      >
        <div aria-hidden className="absolute inset-y-0 left-0 w-2 bg-black/30" />
        {coverUrl ? (
          <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-85 mix-blend-multiply" />
        ) : (
          <div aria-hidden className="absolute inset-0 flex items-center justify-center text-4xl opacity-30 select-none">
            📖
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <p className="absolute bottom-2 left-3 right-3 h-serif text-white text-xs leading-tight" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
          {book.title}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        {book.era && (
          <p className="text-warm-deep text-xs uppercase tracking-widest font-medium">
            {book.era}
          </p>
        )}
        <h1 className="h-serif text-3xl sm:text-4xl text-ink leading-tight mt-1">
          {book.title}
        </h1>
        {book.subtitle && (
          <p className="text-ink-soft italic mt-1">{book.subtitle}</p>
        )}
        {book.description && (
          <p className="mt-3 text-ink/85 leading-relaxed">{book.description}</p>
        )}
        <div className="mt-3 flex items-center gap-3 text-sm text-ink-soft">
          <span>{storyCount} {storyCount === 1 ? "historia" : "historias"}</span>
          {book.isActive ? (
            <span className="rounded-full bg-warm text-white text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 h-serif">
              Activo
            </span>
          ) : (
            <button
              type="button"
              onClick={onMakeActive}
              className="text-warm-deep hover:underline underline-offset-2"
            >
              Marcar como activo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BookEditCard({
  book,
  onSaved,
  onCancel,
  onDeleted,
}: {
  book: MemoirBook;
  onSaved: () => void;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(book.title);
  const [subtitle, setSubtitle] = useState(book.subtitle);
  const [era, setEra] = useState(book.era);
  const [description, setDescription] = useState(book.description);
  const [dedication, setDedication] = useState(book.dedication);
  const [coverImage, setCoverImage] = useState<Blob | undefined>(book.coverImage);
  const [coverMimeType, setCoverMimeType] = useState<string | undefined>(book.coverMimeType);
  const [saving, setSaving] = useState(false);
  const coverUrl = useObjectUrl(coverImage);

  async function pickCover() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      const r = await resizeImage(f, 1600, 0.9);
      setCoverImage(r.blob);
      setCoverMimeType(r.mimeType);
    };
    input.click();
  }

  async function save() {
    setSaving(true);
    await updateBook(book.id, {
      title: title.trim() || "Sin título",
      subtitle: subtitle.trim(),
      era: era.trim(),
      description: description.trim(),
      dedication: dedication.trim(),
      coverImage,
      coverMimeType,
    });
    onSaved();
  }

  async function remove() {
    if (!confirm("¿Eliminar este libro? Las historias y grabaciones se mantienen, solo se desligan del libro.")) return;
    await deleteBook(book.id);
    onDeleted();
  }

  return (
    <div className="paper-card rounded-3xl p-6 space-y-4">
      <h2 className="h-serif text-2xl text-ink">Editar libro</h2>

      <div className="flex items-center gap-4">
        <div
          className="shrink-0 size-24 rounded-lg overflow-hidden shadow-sm relative"
          style={{ background: "linear-gradient(135deg, #8d3f0b, #c49a4a)" }}
        >
          {coverUrl ? (
            <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-30">📖</div>
          )}
        </div>
        <button
          type="button"
          onClick={pickCover}
          className="text-sm text-warm-deep underline-offset-2 hover:underline"
        >
          {coverImage ? "Cambiar portada" : "Subir portada"}
        </button>
        {coverImage && (
          <button
            type="button"
            onClick={() => {
              setCoverImage(undefined);
              setCoverMimeType(undefined);
            }}
            className="text-sm text-ink-soft hover:text-ink"
          >
            Quitar
          </button>
        )}
      </div>

      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wide">Título</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-base h-serif"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wide">Subtítulo</span>
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wide">Época / etiqueta</span>
        <input
          type="text"
          value={era}
          onChange={(e) => setEra(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wide">Descripción</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-ink/70 uppercase tracking-wide">Dedicatoria</span>
        <input
          type="text"
          value={dedication}
          onChange={(e) => setDedication(e.target.value)}
          placeholder="Para mis nietos…"
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-warm px-5 py-2 text-sm font-medium text-white hover:bg-warm-deep disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm text-ink-soft hover:text-ink"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={remove}
          className="ml-auto text-sm text-record hover:underline"
        >
          Eliminar libro
        </button>
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
        "rounded-full px-4 py-1.5 font-medium transition " +
        (active ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

function EmptyBookState() {
  return (
    <div className="mt-12 mx-auto max-w-md text-center">
      <div aria-hidden className="text-6xl mb-4">🪶</div>
      <p className="text-ink-soft text-lg leading-relaxed">
        Este libro todavía está vacío. Toca <strong className="text-ink">Nueva historia en este libro</strong> para empezar a llenarlo.
      </p>
    </div>
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
      {story.location && <p className="mt-1 text-sm text-ink-soft/85">{story.location}</p>}
      {story.summary && (
        <p className="mt-3 text-[15px] text-ink/75 leading-relaxed line-clamp-3">{story.summary}</p>
      )}
      {story.mood.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {story.mood.slice(0, 4).map((m) => (
            <span
              key={m}
              className="rounded-full bg-warm-soft text-warm-deep text-[11px] font-medium tracking-wide px-2.5 py-0.5"
            >
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
