import { useEffect, useMemo, useState } from "react";
import { useNav } from "../store/nav";
import { getKidStory } from "../db/kidStories";
import { getKidCharactersByIds } from "../db/kidCharacters";
import type { KidCharacter, KidStory, StoryLanguage } from "../db/types";
import { splitStoryIntoSections } from "../lib/splitStory";
import { useObjectUrl } from "../lib/useObjectUrl";
import { availableLanguages, getStoryInLanguage } from "../lib/translateStory";

// A book reader without any external library. Each "spread" is one screen:
// cover (alone), then 5× (image left + text right), then back cover (alone).
// Transitions use a CSS animation keyed off the spread index, with a small
// 3D rotateY suggestion to feel page-flippy without depending on a library
// that's broken in React 19.

interface Spread {
  kind: "cover" | "spread" | "back";
  imageBlob?: Blob;
  text?: string;
  momentTitle?: string;
  sceneIndex?: number;
  totalScenes?: number;
}

export function BookReaderScreen({ kidStoryId }: { kidStoryId: string }) {
  const go = useNav((s) => s.go);
  const [story, setStory] = useState<KidStory | null>(null);
  const [cast, setCast] = useState<KidCharacter[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [viewLanguage, setViewLanguage] = useState<StoryLanguage | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getKidStory(kidStoryId);
      if (!s) return;
      setStory(s);
      setCast(await getKidCharactersByIds(s.protagonistIds));
      setViewLanguage(s.language);
    })();
  }, [kidStoryId]);

  const spreads = useMemo<Spread[]>(() => {
    if (!story) return [];
    const sceneCount = story.imagePrompts?.scenes.length ?? 5;
    const lang = viewLanguage ?? story.language;
    const { content } = getStoryInLanguage(story, lang);
    const sections = splitStoryIntoSections(content, sceneCount);
    const out: Spread[] = [{ kind: "cover" }];
    for (let i = 0; i < sceneCount; i++) {
      out.push({
        kind: "spread",
        imageBlob: story.imagePrompts?.scenes[i]?.image,
        text: sections[i] ?? "",
        momentTitle: story.imagePrompts?.scenes[i]?.momentTitle,
        sceneIndex: i,
        totalScenes: sceneCount,
      });
    }
    out.push({ kind: "back" });
    return out;
  }, [story, viewLanguage]);

  function next() {
    if (current >= spreads.length - 1) return;
    setDirection("next");
    setCurrent((c) => c + 1);
  }
  function prev() {
    if (current <= 0) return;
    setDirection("prev");
    setCurrent((c) => c - 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") go({ name: "kids-shelf" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, spreads.length, go]);

  if (!story) {
    return (
      <div className="min-h-svh flex items-center justify-center px-6">
        <p className="text-night/50">Cargando libro…</p>
      </div>
    );
  }

  const spread = spreads[current];

  return (
    <div className="h-svh flex flex-col bg-gradient-to-b from-grape-soft/30 via-cloud to-sun-soft/20 overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => go({ name: "kids-shelf" })}
          className="rounded-full bg-white/90 border border-night/10 px-4 py-1.5 text-sm h-display font-medium text-night hover:bg-white shadow-sm"
        >
          ← Cerrar libro
        </button>
        <span className="hidden sm:inline text-xs text-night/50 h-display uppercase tracking-widest font-semibold">
          {labelFor(spread)}
        </span>
        {availableLanguages(story).length > 1 ? (
          <div className="inline-flex rounded-full bg-white/90 border border-night/10 p-0.5 text-xs h-display font-semibold shadow-sm">
            {availableLanguages(story).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setViewLanguage(lang)}
                className={
                  "rounded-full px-2.5 py-1 transition " +
                  ((viewLanguage ?? story.language) === lang
                    ? "bg-grape text-white"
                    : "text-night hover:text-grape")
                }
              >
                {lang === "es" ? "🇪🇸" : "🇺🇸"}
              </button>
            ))}
          </div>
        ) : (
          <div className="w-[110px]" />
        )}
      </header>

      <div
        className="flex-1 flex items-center justify-center px-2 sm:px-6 pb-4 min-h-0"
        style={{ perspective: "2400px" }}
      >
        <div
          key={current}
          className="book-spread w-full h-full max-w-[1800px] flex items-center justify-center"
          data-direction={direction}
        >
          {spread.kind === "cover" && <CoverPage story={story} cast={cast} onOpen={next} />}
          {spread.kind === "spread" && (
            <SpreadPages
              imageBlob={spread.imageBlob}
              text={spread.text ?? ""}
              momentTitle={spread.momentTitle ?? ""}
              sceneIndex={spread.sceneIndex ?? 0}
              totalScenes={spread.totalScenes ?? 1}
            />
          )}
          {spread.kind === "back" && (
            <BackPage
              story={story}
              cast={cast}
              onRestart={() => {
                setDirection("prev");
                setCurrent(0);
              }}
              onClose={() => go({ name: "kids-shelf" })}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 pb-7">
        <button
          type="button"
          onClick={prev}
          disabled={current === 0}
          aria-label="Página anterior"
          className="size-12 rounded-full bg-white shadow-md border border-night/10 disabled:opacity-30 hover:bg-cloud transition flex items-center justify-center text-2xl"
        >
          ←
        </button>
        <div className="flex items-center gap-1.5">
          {spreads.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDirection(i > current ? "next" : "prev");
                setCurrent(i);
              }}
              aria-label={`Ir a página ${i + 1}`}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === current ? "w-8 bg-grape" : "w-1.5 bg-night/15 hover:bg-night/30")
              }
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          disabled={current >= spreads.length - 1}
          aria-label="Página siguiente"
          className="size-12 rounded-full bg-white shadow-md border border-night/10 disabled:opacity-30 hover:bg-cloud transition flex items-center justify-center text-2xl"
        >
          →
        </button>
      </div>

      <style>{`
        .book-spread {
          transform-style: preserve-3d;
          animation: pageIn 0.55s cubic-bezier(0.22, 0.9, 0.3, 1) both;
        }
        .book-spread[data-direction="prev"] {
          animation-name: pageInBack;
        }
        @keyframes pageIn {
          from {
            opacity: 0;
            transform: rotateY(35deg) translateX(40px);
            transform-origin: left center;
          }
          to {
            opacity: 1;
            transform: rotateY(0deg) translateX(0);
            transform-origin: left center;
          }
        }
        @keyframes pageInBack {
          from {
            opacity: 0;
            transform: rotateY(-35deg) translateX(-40px);
            transform-origin: right center;
          }
          to {
            opacity: 1;
            transform: rotateY(0deg) translateX(0);
            transform-origin: right center;
          }
        }
      `}</style>
    </div>
  );
}

function labelFor(spread: Spread): string {
  if (spread.kind === "cover") return "Portada";
  if (spread.kind === "back") return "Contraportada";
  return `Página ${(spread.sceneIndex ?? 0) + 1} de ${spread.totalScenes ?? 1}`;
}

// --- Spread layouts ---

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
  backgroundSize: "160px 160px",
};

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
      className="block mx-auto h-full max-h-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl relative bg-gradient-to-br from-grape via-strawberry to-tangerine text-white text-left transition hover:scale-[1.01]"
    >
      {url && (
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply"
        />
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
      <div aria-hidden className="absolute inset-y-0 left-0 w-2 bg-black/30 shadow-inner" />
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
    <div className="mx-auto h-full max-h-full aspect-[3/4] rounded-2xl bg-gradient-to-br from-night via-grape to-strawberry text-white shadow-2xl p-8 flex flex-col items-center justify-center text-center">
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

function SpreadPages({
  imageBlob,
  text,
  momentTitle,
  sceneIndex,
  totalScenes,
}: {
  imageBlob: Blob | undefined;
  text: string;
  momentTitle: string;
  sceneIndex: number;
  totalScenes: number;
}) {
  const url = useObjectUrl(imageBlob);
  return (
    // Spread fills the available viewport height. On desktop: two pages side
    // by side, each ~50% width, each filling full height. On mobile: stacked,
    // each pane gets ~half the screen.
    <div className="relative w-full h-full flex flex-col md:flex-row gap-2 md:gap-1">
      {/* Subtle book-spine shadow in the middle (desktop only) */}
      <div
        aria-hidden
        className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-10 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(31,22,18,0.18) 30%, rgba(31,22,18,0.32) 50%, rgba(31,22,18,0.18) 70%, transparent)",
        }}
      />

      {/* Left page — image, fills its half */}
      <div className="flex-1 min-h-0 rounded-l-2xl md:rounded-r-none rounded-2xl bg-cloud shadow-xl overflow-hidden flex items-center justify-center p-2 sm:p-3">
        {url ? (
          <img
            src={url}
            alt=""
            className="block max-w-full max-h-full"
            style={{ objectFit: "contain", width: "auto", height: "auto" }}
          />
        ) : (
          <div className="text-center px-8">
            <div aria-hidden className="text-6xl mb-3 opacity-30">🖼️</div>
            <p className="text-night/50 h-display">
              Sube la imagen de la escena {sceneIndex + 1} para verla aquí.
            </p>
          </div>
        )}
      </div>

      {/* Right page — text, fills its half, scrolls if needed */}
      <div
        className="flex-1 min-h-0 rounded-r-2xl md:rounded-l-none rounded-2xl bg-cloud shadow-xl overflow-y-auto px-6 sm:px-12 md:px-14 py-8 sm:py-12 flex flex-col"
        style={PAGE_BG_STYLE}
      >
        {momentTitle && (
          <p className="text-grape h-display text-xs uppercase tracking-widest font-semibold mb-4">
            {momentTitle}
          </p>
        )}
        <div
          className="flex-1 text-night/90 leading-[1.85] text-base sm:text-lg md:text-xl whitespace-pre-wrap"
          style={{ fontFamily: "var(--font-serif)", maxWidth: "62ch" }}
        >
          {text || (
            <span className="text-night/40 italic">(Sin texto en esta sección.)</span>
          )}
        </div>
        <p className="mt-6 text-xs text-night/40 text-center h-display">
          {sceneIndex + 1} / {totalScenes}
        </p>
      </div>
    </div>
  );
}
