import { useEffect, useMemo, useState } from "react";
import { useNav } from "../store/nav";
import { getKidStory } from "../db/kidStories";
import { getKidCharactersByIds } from "../db/kidCharacters";
import type { KidCharacter, KidStory } from "../db/types";
import { splitStoryIntoSections } from "../lib/splitStory";
import { useObjectUrl } from "../lib/useObjectUrl";

interface Spread {
  imageBlob: Blob | undefined;
  text: string;
  momentTitle: string;
  pageNumber: number;
  total: number;
}

export function BookReaderScreen({ kidStoryId }: { kidStoryId: string }) {
  const go = useNav((s) => s.go);
  const [story, setStory] = useState<KidStory | null>(null);
  const [cast, setCast] = useState<KidCharacter[]>([]);
  const [page, setPage] = useState(0); // 0 = cover, then 1..N spreads, then N+1 = back

  useEffect(() => {
    (async () => {
      const s = await getKidStory(kidStoryId);
      if (!s) return;
      setStory(s);
      setCast(await getKidCharactersByIds(s.protagonistIds));
    })();
  }, [kidStoryId]);

  const spreads = useMemo<Spread[]>(() => {
    if (!story) return [];
    const sceneCount = story.imagePrompts?.scenes.length ?? 5;
    const sections = splitStoryIntoSections(story.content, sceneCount);
    return sections.map((text, i) => ({
      imageBlob: story.imagePrompts?.scenes[i]?.image,
      text,
      momentTitle: story.imagePrompts?.scenes[i]?.momentTitle ?? "",
      pageNumber: i + 1,
      total: sceneCount,
    }));
  }, [story]);

  const totalPages = spreads.length + 2; // cover + spreads + back

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, totalPages - 1));
      else if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
      else if (e.key === "Escape") go({ name: "kids-shelf" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalPages, go]);

  if (!story) {
    return (
      <div className="min-h-svh flex items-center justify-center px-6">
        <p className="text-night/50">Cargando libro…</p>
      </div>
    );
  }

  const isCover = page === 0;
  const isBack = page === totalPages - 1;
  const spreadIndex = page - 1;
  const spread = spreads[spreadIndex];

  return (
    <div className="min-h-svh flex flex-col bg-gradient-to-b from-grape-soft/40 via-cloud to-sun-soft/30">
      {/* Header — always visible */}
      <header className="flex items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={() => go({ name: "kids-shelf" })}
          className="rounded-full bg-white/80 border border-night/10 px-4 py-1.5 text-sm h-display font-medium text-night hover:bg-white shadow-sm"
        >
          ← Cerrar libro
        </button>
        <span className="text-xs text-night/50 h-display uppercase tracking-widest font-semibold">
          {isCover
            ? "Portada"
            : isBack
              ? "Contraportada"
              : `Página ${spread.pageNumber} de ${spread.total}`}
        </span>
        <div className="w-[110px]" />
      </header>

      {/* Book */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-8">
        <div className="w-full max-w-6xl">
          {isCover ? (
            <CoverPage story={story} cast={cast} onOpen={() => setPage(1)} />
          ) : isBack ? (
            <BackPage story={story} cast={cast} onRestart={() => setPage(0)} onClose={() => go({ name: "kids-shelf" })} />
          ) : (
            <SpreadPages spread={spread} />
          )}
        </div>
      </div>

      {/* Page controls */}
      <div className="flex items-center justify-center gap-4 pb-8">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(p - 1, 0))}
          disabled={page === 0}
          aria-label="Página anterior"
          className="size-12 rounded-full bg-white shadow-md border border-night/10 disabled:opacity-30 hover:bg-cloud transition flex items-center justify-center text-2xl"
        >
          ←
        </button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Ir a página ${i + 1}`}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === page ? "w-8 bg-grape" : "w-1.5 bg-night/15 hover:bg-night/30")
              }
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
          disabled={page === totalPages - 1}
          aria-label="Página siguiente"
          className="size-12 rounded-full bg-white shadow-md border border-night/10 disabled:opacity-30 hover:bg-cloud transition flex items-center justify-center text-2xl"
        >
          →
        </button>
      </div>
    </div>
  );
}

// --- Pages ---

function CoverPage({
  story,
  cast,
  onOpen,
}: {
  story: KidStory;
  cast: KidCharacter[];
  onOpen: () => void;
}) {
  const coverBlob = story.imagePrompts?.scenes.find((s) => s.image)?.image;
  const url = useObjectUrl(coverBlob);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block mx-auto w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl relative bg-gradient-to-br from-grape via-strawberry to-tangerine text-white text-left transition hover:scale-[1.01]"
    >
      {url && (
        <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-75 mix-blend-multiply" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <p className="h-display text-xs uppercase tracking-widest font-semibold opacity-90">
          Un cuento
        </p>
        <h1
          className="h-display text-3xl sm:text-4xl leading-tight mt-1"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
        >
          {story.title || "Cuento"}
        </h1>
        {story.forChild && (
          <p className="mt-3 text-sm opacity-90">💝 Para {story.forChild}</p>
        )}
        {cast.length > 0 && (
          <p className="mt-2 text-xs opacity-85">
            Con {cast.map((c) => c.name).join(", ")}
          </p>
        )}
        <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
          Toca para abrir →
        </p>
      </div>
    </button>
  );
}

function BackPage({
  story,
  cast,
  onRestart,
  onClose,
}: {
  story: KidStory;
  cast: KidCharacter[];
  onRestart: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-md aspect-[3/4] rounded-2xl bg-gradient-to-br from-night via-grape to-strawberry text-white shadow-2xl p-8 flex flex-col items-center justify-center text-center">
      <p className="h-display text-5xl mb-4">Fin</p>
      <p className="opacity-85">{story.title || "Cuento"}</p>
      {cast.length > 0 && (
        <p className="mt-4 text-sm opacity-75">
          Con {cast.map((c) => c.name).join(", ")}
        </p>
      )}
      <div className="mt-10 flex flex-col gap-2 w-full max-w-xs">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-full bg-white text-night px-5 py-2.5 h-display font-semibold hover:bg-cloud"
        >
          📖 Leerlo de nuevo
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 text-white px-5 py-2.5 h-display font-semibold hover:bg-white/25"
        >
          Volver al librero
        </button>
      </div>
    </div>
  );
}

function SpreadPages({ spread }: { spread: Spread }) {
  const url = useObjectUrl(spread.imageBlob);
  return (
    <div className="grid md:grid-cols-2 gap-4 md:gap-2 max-w-5xl mx-auto relative">
      {/* Spine shadow on desktop */}
      <div
        aria-hidden
        className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(31,22,18,0.18) 30%, rgba(31,22,18,0.32) 50%, rgba(31,22,18,0.18) 70%, transparent)",
        }}
      />

      {/* Left page — image */}
      <div className="rounded-l-2xl md:rounded-r-none rounded-2xl bg-white shadow-xl overflow-hidden aspect-[3/4] flex items-center justify-center">
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center px-8">
            <div aria-hidden className="text-6xl mb-3 opacity-30">🖼️</div>
            <p className="text-night/50 h-display">
              Sube la imagen de la escena {spread.pageNumber} para verla aquí.
            </p>
          </div>
        )}
      </div>

      {/* Right page — text */}
      <div
        className="rounded-r-2xl md:rounded-l-none rounded-2xl bg-cloud shadow-xl px-8 py-10 sm:px-12 sm:py-14 aspect-[3/4] overflow-y-auto"
        style={{
          backgroundImage:
            "radial-gradient(circle at 100% 50%, rgba(31,22,18,0.05) 0%, transparent 8%)",
        }}
      >
        {spread.momentTitle && (
          <p className="text-grape h-display text-xs uppercase tracking-widest font-semibold mb-4">
            {spread.momentTitle}
          </p>
        )}
        <div
          className="text-night/90 leading-[1.8] text-lg whitespace-pre-wrap"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {spread.text || (
            <span className="text-night/40 italic">
              (Sin texto en esta sección.)
            </span>
          )}
        </div>
        <p className="mt-8 text-xs text-night/40 text-center h-display">
          {spread.pageNumber} / {spread.total}
        </p>
      </div>
    </div>
  );
}
