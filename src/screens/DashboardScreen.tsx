import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { migrateOrphanSessions } from "../db/sessions";
import {
  listBooks,
  setActiveBook,
  createBook,
  migrateLegacyContent,
  countStoriesInBook,
  countSessionsInBook,
} from "../db/memoirBooks";
import type { MemoirBook, Story } from "../db/types";
import { ModeToggle } from "../components/ModeToggle";
import { useObjectUrl } from "../lib/useObjectUrl";

// The memoir-side dashboard is now a BOOKSHELF: each MemoirBook is a
// container of stories. Storyteller records new stories into whichever
// book is "active". Admin clicks a book to open it (BookDetailScreen).

export function DashboardScreen() {
  const go = useNav((s) => s.go);
  const [books, setBooks] = useState<MemoirBook[] | null>(null);
  const [counts, setCounts] = useState<Record<string, { stories: number; sessions: number }>>({});
  const [showCreate, setShowCreate] = useState(false);

  async function refresh() {
    // Order of operations matters: legacy migration first (creates the default
    // "Mis Recuerdos" book and attaches orphan content), THEN orphan-session
    // backfill (Wave B legacy) so any pre-book sessions also get books.
    await migrateLegacyContent();
    await migrateOrphanSessions();
    // After the orphan migration, the new stories also need a book — run
    // legacy migration once more to backfill those.
    await migrateLegacyContent();
    const list = await listBooks();
    setBooks(list);
    const c: Record<string, { stories: number; sessions: number }> = {};
    for (const b of list) {
      c[b.id] = {
        stories: await countStoriesInBook(b.id),
        sessions: await countSessionsInBook(b.id),
      };
    }
    setCounts(c);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="relative">
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-16">
        <div className="flex justify-center mb-8">
          <ModeToggle active="memoir" />
        </div>

        <header className="mb-10">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-warm-deep/80 text-xs uppercase tracking-widest font-medium">
                Tu librero
              </p>
              <h1 className="h-serif text-5xl text-ink leading-none mt-2">Tus libros</h1>
            </div>
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
          <p className="mt-3 text-ink-soft text-lg leading-relaxed">
            Cada libro guarda historias relacionadas — tu infancia, los años con
            tu pareja, los hijos, una época. Las nuevas historias se guardan en
            el libro <strong>activo</strong>. Tócalo o cambia el activo cuando quieras.
          </p>
        </header>

        {books === null ? (
          <p className="text-ink-soft text-center">Cargando…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-10">
              {books.map((b) => (
                <BookSpine
                  key={b.id}
                  book={b}
                  storyCount={counts[b.id]?.stories ?? 0}
                  onOpen={() => go({ name: "book", bookId: b.id })}
                  onMakeActive={async () => {
                    await setActiveBook(b.id);
                    refresh();
                  }}
                />
              ))}

              {/* "Create new book" tile */}
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="block w-full text-left"
                aria-label="Crear libro nuevo"
              >
                <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-warm/40 bg-warm-soft/40 hover:border-warm/70 hover:bg-warm-soft/70 transition flex flex-col items-center justify-center text-warm-deep">
                  <span className="text-5xl">＋</span>
                  <span className="h-serif text-base mt-2">Nuevo libro</span>
                </div>
                <p className="mt-3 text-center text-xs text-ink-soft h-serif">
                  Empieza otra época
                </p>
              </button>
            </div>

            {showCreate && (
              <NewBookForm
                onCancel={() => setShowCreate(false)}
                onCreated={async () => {
                  setShowCreate(false);
                  await refresh();
                }}
              />
            )}
          </>
        )}

        <nav className="mt-16 flex sm:hidden flex-wrap justify-center gap-4 text-sm text-ink-soft">
          <button onClick={() => go({ name: "walkthrough" })} className="hover:text-ink">
            ¿Cómo funciona?
          </button>
          <button onClick={() => go({ name: "characters" })} className="hover:text-ink">
            Personajes
          </button>
          <button onClick={() => go({ name: "settings" })} className="hover:text-ink">
            Ajustes
          </button>
        </nav>
      </div>
    </div>
  );
}

// A single book on the shelf. Rendered as a personal-memoir cover with
// a warm paper tone, optional uploaded cover photo, title in serif, and
// a tiny "Activo" badge if it's the current target for new recordings.
function BookSpine({
  book,
  storyCount,
  onOpen,
  onMakeActive,
}: {
  book: MemoirBook;
  storyCount: number;
  onOpen: () => void;
  onMakeActive: () => void;
}) {
  const coverUrl = useObjectUrl(book.coverImage);
  return (
    <div>
      <button
        type="button"
        onClick={onOpen}
        className="group block w-full text-left"
      >
        <div
          className={
            "relative aspect-[3/4] rounded-lg shadow-xl overflow-hidden transition group-hover:-translate-y-1 group-hover:shadow-2xl " +
            (book.isActive ? "ring-4 ring-warm/60 ring-offset-2 ring-offset-paper" : "")
          }
          style={{
            background:
              "linear-gradient(135deg, #8d3f0b 0%, #b85c1f 40%, #c49a4a 100%)",
          }}
        >
          {/* spine */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-3 bg-black/30"
            style={{ boxShadow: "inset -2px 0 4px rgba(0,0,0,0.25)" }}
          />
          {/* page edges */}
          <div
            aria-hidden
            className="absolute inset-y-1 right-0 w-1 bg-paper/85"
            style={{ boxShadow: "inset 1px 0 0 rgba(0,0,0,0.06)" }}
          />

          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-85 mix-blend-multiply"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center text-6xl opacity-25 select-none"
            >
              📖
            </div>
          )}

          <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
            {book.isActive && (
              <span className="absolute top-3 right-3 rounded-full bg-warm text-white text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 h-serif">
                Activo
              </span>
            )}
            <p className="text-white/90 text-[9px] uppercase tracking-widest font-medium">
              {book.era || "Memorias"}
            </p>
            <h2
              className="h-serif text-white text-lg leading-tight mt-1"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
            >
              {book.title}
            </h2>
            {book.subtitle && (
              <p className="text-white/80 text-xs mt-0.5 italic">{book.subtitle}</p>
            )}
          </div>
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-ink-soft">
          {storyCount} {storyCount === 1 ? "historia" : "historias"}
        </span>
        {!book.isActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMakeActive();
            }}
            className="text-warm-deep hover:underline underline-offset-2"
          >
            Marcar activo
          </button>
        )}
      </div>
    </div>
  );
}

// Inline creator. Just title + subtitle + era to get started — admin can
// edit the rest from the book detail screen.
function NewBookForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [era, setEra] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await createBook({
      title: title.trim(),
      subtitle: subtitle.trim(),
      era: era.trim(),
    });
    onCreated();
  }

  return (
    <div className="mt-10 paper-card rounded-2xl p-6 max-w-xl mx-auto">
      <h3 className="h-serif text-2xl text-ink mb-1">Nuevo libro</h3>
      <p className="text-sm text-ink-soft mb-4">
        Un libro reúne historias de una misma época, tema, o persona.
      </p>
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-ink/70 uppercase tracking-wide">Título</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            placeholder="Mi Infancia en Salamanca"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-base h-serif focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink/70 uppercase tracking-wide">Subtítulo (opcional)</span>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="1955 – 1970"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink/70 uppercase tracking-wide">Época / etiqueta (opcional)</span>
          <input
            type="text"
            value={era}
            onChange={(e) => setEra(e.target.value)}
            placeholder="Infancia · Matrimonio · Los hijos…"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
        </label>
      </div>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!title.trim() || saving}
          className="rounded-full bg-warm px-5 py-2 text-sm font-medium text-white hover:bg-warm-deep disabled:opacity-50"
        >
          {saving ? "Creando…" : "Crear libro"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm text-ink-soft hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// (kept so legacy imports don't break — unused now)
export type { Story };
