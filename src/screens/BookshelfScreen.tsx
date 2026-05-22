import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { listKidStories } from "../db/kidStories";
import { getKidCharactersByIds } from "../db/kidCharacters";
import type { KidStory, KidCharacter } from "../db/types";
import { ModeToggle } from "../components/ModeToggle";
import { useObjectUrl } from "../lib/useObjectUrl";
import { avatarForKind } from "../components/Mascots";

export function BookshelfScreen() {
  const go = useNav((s) => s.go);
  const [stories, setStories] = useState<KidStory[] | null>(null);
  const [castByStory, setCastByStory] = useState<Record<string, KidCharacter[]>>({});

  useEffect(() => {
    (async () => {
      const list = await listKidStories();
      setStories(list);
      const cast: Record<string, KidCharacter[]> = {};
      for (const s of list) {
        cast[s.id] = await getKidCharactersByIds(s.protagonistIds);
      }
      setCastByStory(cast);
    })();
  }, []);

  return (
    <div className="relative">
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-16">
        <div className="flex justify-center mb-8">
          <ModeToggle active="kids" />
        </div>

        <header className="mb-10 flex items-end justify-between">
          <div>
            <p className="h-display text-grape text-sm uppercase tracking-widest font-semibold">
              Mi librero
            </p>
            <h1 className="h-display text-5xl text-night leading-none mt-2">Tus libros</h1>
            <p className="mt-3 text-night/70 text-lg">
              Cada cuento que hayas creado es un libro. Toca uno para abrirlo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => go({ name: "kids-dashboard" })}
            className="hidden sm:inline rounded-full bg-white/80 border border-night/10 px-4 py-1.5 text-sm h-display font-medium text-night hover:bg-white shadow-sm"
          >
            ← Volver
          </button>
        </header>

        {stories === null ? (
          <p className="text-night/50 text-center">Cargando…</p>
        ) : stories.length === 0 ? (
          <EmptyShelf />
        ) : (
          <ShelfGrid stories={stories} castByStory={castByStory} />
        )}
      </div>
    </div>
  );
}

function EmptyShelf() {
  return (
    <div className="mx-auto max-w-md text-center mt-10">
      <div aria-hidden className="text-6xl mb-3">📚</div>
      <p className="h-display text-2xl text-night">El librero está vacío</p>
      <p className="mt-2 text-night/65 leading-relaxed">
        Crea un cuento y, cuando subas las imágenes, aparecerá aquí como libro.
      </p>
    </div>
  );
}

function ShelfGrid({
  stories,
  castByStory,
}: {
  stories: KidStory[];
  castByStory: Record<string, KidCharacter[]>;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-10">
      {stories.map((s) => (
        <BookCover key={s.id} story={s} cast={castByStory[s.id] ?? []} />
      ))}
    </div>
  );
}

function BookCover({ story, cast }: { story: KidStory; cast: KidCharacter[] }) {
  const go = useNav((s) => s.go);
  const coverImage = story.imagePrompts?.scenes.find((sc) => sc.image)?.image;
  const url = useObjectUrl(coverImage);
  const accent = pickAccent(story.id);

  return (
    <button
      type="button"
      onClick={() => go({ name: "kids-book", kidStoryId: story.id })}
      className="group block w-full text-left"
    >
      {/* The book — gradient spine on the left, cover on the right */}
      <div
        className="relative aspect-[3/4] rounded-lg shadow-xl overflow-hidden transition group-hover:-translate-y-1 group-hover:shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${accent.dark}, ${accent.light})`,
        }}
      >
        {/* spine */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-3"
          style={{ background: accent.dark, boxShadow: "inset -2px 0 4px rgba(0,0,0,0.25)" }}
        />
        {/* page edges */}
        <div
          aria-hidden
          className="absolute inset-y-1 right-0 w-1 bg-white/70"
          style={{ boxShadow: "inset 1px 0 0 rgba(0,0,0,0.06)" }}
        />

        {url ? (
          <img
            src={url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply"
          />
        ) : (
          <div aria-hidden className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">
            📖
          </div>
        )}

        <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-night/85 via-night/40 to-transparent">
          <h2
            className="h-display text-white text-lg leading-tight"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
          >
            {story.title || "Cuento"}
          </h2>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex -space-x-2 shrink-0">
          {cast.slice(0, 3).map((c) => (
            <CastChip key={c.id} character={c} />
          ))}
        </div>
        <span className="text-[11px] text-night/55 h-display uppercase tracking-wider font-semibold">
          {story.ageBand} años
        </span>
      </div>
    </button>
  );
}

function CastChip({ character }: { character: KidCharacter }) {
  const url = useObjectUrl(character.image);
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="size-7 rounded-full object-cover border-2 border-white shadow-sm"
      />
    );
  }
  return (
    <span className="size-7 rounded-full bg-cloud border-2 border-white shadow-sm flex items-center justify-center text-base">
      {avatarForKind(character.kind)}
    </span>
  );
}

const ACCENTS: { dark: string; light: string }[] = [
  { dark: "#7c5dd6", light: "#a78bfa" }, // grape
  { dark: "#3aa19a", light: "#4ecdc4" }, // mint
  { dark: "#d63b73", light: "#ff6b9d" }, // bubblegum
  { dark: "#b8623a", light: "#ff8c42" }, // tangerine
  { dark: "#a37510", light: "#ffd93d" }, // sun
  { dark: "#1f5fa0", light: "#58a6ff" }, // sky
];

function pickAccent(id: string): { dark: string; light: string } {
  // Deterministic per-story so a book's color is stable across views.
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}
