import { useEffect, useMemo, useState } from "react";
import { useNav } from "../store/nav";
import { getKidStory, updateKidStory } from "../db/kidStories";
import { getKidCharactersByIds } from "../db/kidCharacters";
import type { KidCharacter, KidStory, StoryLanguage } from "../db/types";
import { splitStoryIntoSections } from "../lib/splitStory";
import { useObjectUrl } from "../lib/useObjectUrl";
import { availableLanguages, getStoryInLanguage } from "../lib/translateStory";

// Single-page reader, Option A:
//   cover (full) → 5× (one screen per scene: image top, text below) → back.
// No spine shadow, no two-page spread, no wasted white margins. The image
// is the visual hero (~65% of the page card), the text reads comfortably
// underneath. Designed for 3:4 portrait Ghibli illustrations.

interface Page {
  kind: "cover" | "scene" | "back";
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
      let s = await getKidStory(kidStoryId);
      if (!s) return;
      // Backfill for stories created before the language field existed.
      if (!s.language) {
        await updateKidStory(s.id, { language: "es" });
        s = { ...s, language: "es" };
      }
      setStory(s);
      setCast(await getKidCharactersByIds(s.protagonistIds));
      setViewLanguage(s.language);
    })();
  }, [kidStoryId]);

  const pages = useMemo<Page[]>(() => {
    if (!story) return [];
    const sceneCount = story.imagePrompts?.scenes.length ?? 5;
    const lang = viewLanguage ?? story.language;
    const { content } = getStoryInLanguage(story, lang);
    const sections = splitStoryIntoSections(content, sceneCount);
    const out: Page[] = [{ kind: "cover" }];
    for (let i = 0; i < sceneCount; i++) {
      out.push({
        kind: "scene",
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
    if (current >= pages.length - 1) return;
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
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") go({ name: "kids-shelf" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, pages.length, go]);

  if (!story) {
    return (
      <div className="min-h-svh flex items-center justify-center px-6">
        <p className="text-night/50">Cargando libro…</p>
      </div>
    );
  }

  const page = pages[current];
  const langs = availableLanguages(story);

  return (
    <div className="h-svh flex flex-col bg-gradient-to-b from-grape-soft/30 via-cloud to-sun-soft/20 overflow-hidden">
      {/* Compact header — minimal chrome */}
      <header className="flex items-center justify-between gap-2 px-3 py-2 shrink-0">
        <button
          type="button"
          onClick={() => go({ name: "kids-shelf" })}
          className="rounded-full bg-white/85 border border-night/10 px-3 py-1 text-xs h-display font-medium text-night hover:bg-white shadow-sm"
        >
          ← Cerrar
        </button>
        <span className="text-[10px] text-night/45 h-display uppercase tracking-widest font-semibold">
          {labelFor(page)}
        </span>
        {langs.length > 1 ? (
          <div className="inline-flex rounded-full bg-white/85 border border-night/10 p-0.5 text-[11px] h-display font-semibold shadow-sm">
            {langs.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setViewLanguage(lang)}
                className={
                  "rounded-full px-2 py-0.5 transition " +
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
          <div className="w-[70px]" />
        )}
      </header>

      {/* Main page area — fills all remaining vertical space */}
      <div
        className="flex-1 flex items-center justify-center px-2 sm:px-4 min-h-0"
        key={current}
        data-direction={direction}
      >
        {page.kind === "cover" && (
          <CoverPage story={story} cast={cast} onOpen={next} viewLanguage={viewLanguage} />
        )}
        {page.kind === "scene" && (
          <ScenePage
            imageBlob={page.imageBlob}
            text={page.text ?? ""}
            momentTitle={page.momentTitle ?? ""}
            sceneIndex={page.sceneIndex ?? 0}
            totalScenes={page.totalScenes ?? 1}
          />
        )}
        {page.kind === "back" && (
          <BackPage
            story={story}
            cast={cast}
            viewLanguage={viewLanguage}
            onRestart={() => {
              setDirection("prev");
              setCurrent(0);
            }}
            onClose={() => go({ name: "kids-shelf" })}
          />
        )}
      </div>

      {/* Compact controls */}
      <div className="flex items-center justify-center gap-3 py-2 shrink-0">
        <button
          type="button"
          onClick={prev}
          disabled={current === 0}
          aria-label="Página anterior"
          className="size-10 rounded-full bg-white shadow-md border border-night/10 disabled:opacity-30 hover:bg-cloud transition flex items-center justify-center text-lg"
        >
          ←
        </button>
        <div className="flex items-center gap-1.5">
          {pages.map((_, i) => (
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
                (i === current ? "w-6 bg-grape" : "w-1.5 bg-night/15 hover:bg-night/30")
              }
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          disabled={current >= pages.length - 1}
          aria-label="Página siguiente"
          className="size-10 rounded-full bg-white shadow-md border border-night/10 disabled:opacity-30 hover:bg-cloud transition flex items-center justify-center text-lg"
        >
          →
        </button>
      </div>

      <style>{`
        [data-direction="next"] > * {
          animation: pageInNext 0.45s cubic-bezier(0.22, 0.9, 0.3, 1) both;
        }
        [data-direction="prev"] > * {
          animation: pageInPrev 0.45s cubic-bezier(0.22, 0.9, 0.3, 1) both;
        }
        @keyframes pageInNext {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pageInPrev {
          from { opacity: 0; transform: translateX(-36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function labelFor(page: Page): string {
  if (page.kind === "cover") return "Portada";
  if (page.kind === "back") return "Contraportada";
  return `Página ${(page.sceneIndex ?? 0) + 1} de ${page.totalScenes ?? 1}`;
}

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
  backgroundSize: "160px 160px",
};

function CoverPage({
  story,
  cast,
  onOpen,
  viewLanguage,
}: {
  story: KidStory;
  cast: KidCharacter[];
  onOpen: () => void;
  viewLanguage: StoryLanguage | null;
}) {
  const coverBlob = story.imagePrompts?.scenes.find((s) => s.image)?.image;
  const url = useObjectUrl(coverBlob);
  const lang = viewLanguage ?? story.language;
  const view = getStoryInLanguage(story, lang);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block h-full max-h-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl relative bg-gradient-to-br from-grape via-strawberry to-tangerine text-white text-left transition hover:scale-[1.01]"
    >
      {url && (
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <p className="h-display text-[10px] uppercase tracking-widest font-semibold opacity-90">
          {lang === "en" ? "A story" : "Un cuento"}
        </p>
        <h1
          className="h-display text-3xl sm:text-4xl leading-tight mt-1"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
        >
          {view.title || "Cuento"}
        </h1>
        {story.forChild && (
          <p className="mt-2 text-sm opacity-90">💝 {lang === "en" ? "For" : "Para"} {story.forChild}</p>
        )}
        {cast.length > 0 && (
          <p className="mt-1 text-xs opacity-85">
            {lang === "en" ? "With" : "Con"} {cast.map((c) => c.name).join(", ")}
          </p>
        )}
        <p className="mt-4 text-xs font-semibold opacity-90 self-center">
          {lang === "en" ? "Tap to open →" : "Toca para abrir →"}
        </p>
      </div>
    </button>
  );
}

function BackPage({
  story,
  cast,
  viewLanguage,
  onRestart,
  onClose,
}: {
  story: KidStory;
  cast: KidCharacter[];
  viewLanguage: StoryLanguage | null;
  onRestart: () => void;
  onClose: () => void;
}) {
  const lang = viewLanguage ?? story.language;
  const view = getStoryInLanguage(story, lang);
  return (
    <div className="h-full max-h-full aspect-[3/4] rounded-2xl bg-gradient-to-br from-night via-grape to-strawberry text-white shadow-2xl p-8 flex flex-col items-center justify-center text-center">
      <p className="h-display text-5xl mb-3">{lang === "en" ? "The End" : "Fin"}</p>
      <p className="opacity-85 max-w-xs">{view.title || "Cuento"}</p>
      {cast.length > 0 && (
        <p className="mt-4 text-xs opacity-70 max-w-xs">
          {lang === "en" ? "With" : "Con"} {cast.map((c) => c.name).join(", ")}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-2 w-full max-w-xs">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-full bg-white text-night px-5 py-2 h-display font-semibold hover:bg-cloud text-sm"
        >
          📖 {lang === "en" ? "Read it again" : "Leerlo de nuevo"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 text-white px-5 py-2 h-display font-semibold hover:bg-white/25 text-sm"
        >
          {lang === "en" ? "Back to bookshelf" : "Volver al librero"}
        </button>
      </div>
    </div>
  );
}

// One page = one scene. Image on top (taller), text below (shorter, readable).
// The whole page is a single "card" with rounded edges and soft shadow.
function ScenePage({
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
    // The card maintains roughly an 8.5×11 aspect (carta portrait) so it
    // feels like a real book page. On narrow screens it expands to fill width.
    <div
      className="h-full w-full max-w-3xl rounded-2xl bg-cloud shadow-xl overflow-hidden flex flex-col"
      style={PAGE_BG_STYLE}
    >
      {/* Image area — ~65% of card height. object-contain so the whole image
          is visible; cream background fills any letterboxing cleanly. */}
      <div className="flex-[13] min-h-0 flex items-center justify-center bg-cloud border-b border-night/5 p-1 sm:p-2">
        {url ? (
          <img
            src={url}
            alt=""
            className="block max-w-full max-h-full w-auto h-auto"
            style={{ objectFit: "contain" }}
          />
        ) : (
          <div className="text-center px-8">
            <div aria-hidden className="text-6xl mb-3 opacity-30">🖼️</div>
            <p className="text-night/50 h-display text-sm">
              Sube la imagen de la escena {sceneIndex + 1} para verla aquí.
            </p>
          </div>
        )}
      </div>

      {/* Text area — ~35% of card height. Scrolls if the section is long. */}
      <div className="flex-[7] min-h-0 overflow-y-auto px-6 sm:px-10 py-4 sm:py-6 flex flex-col">
        {momentTitle && (
          <p className="text-grape h-display text-[10px] uppercase tracking-widest font-semibold mb-2">
            {momentTitle}
          </p>
        )}
        <div
          className="flex-1 text-night/90 leading-[1.7] text-base sm:text-lg whitespace-pre-wrap"
          style={{ fontFamily: "var(--font-serif)", maxWidth: "62ch" }}
        >
          {text || (
            <span className="text-night/40 italic">(Sin texto en esta sección.)</span>
          )}
        </div>
        <p className="mt-3 text-[10px] text-night/40 text-right h-display">
          {sceneIndex + 1} / {totalScenes}
        </p>
      </div>
    </div>
  );
}
