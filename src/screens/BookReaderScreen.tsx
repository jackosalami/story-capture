import { useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { useNav } from "../store/nav";
import { getKidStory } from "../db/kidStories";
import { getKidCharactersByIds } from "../db/kidCharacters";
import type { KidCharacter, KidStory } from "../db/types";
import { splitStoryIntoSections } from "../lib/splitStory";
import { useObjectUrl } from "../lib/useObjectUrl";

interface FlipBookHandle {
  pageFlip(): {
    flipNext(): void;
    flipPrev(): void;
    turnToPage(n: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
  };
}

interface BuiltPage {
  kind: "cover-front" | "image" | "text" | "cover-back";
  sceneIndex?: number;
  imageBlob?: Blob;
  text?: string;
  momentTitle?: string;
}

const PAGE_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.04 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
  backgroundSize: "160px 160px",
};

export function BookReaderScreen({ kidStoryId }: { kidStoryId: string }) {
  const go = useNav((s) => s.go);
  const [story, setStory] = useState<KidStory | null>(null);
  const [cast, setCast] = useState<KidCharacter[]>([]);
  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    (async () => {
      const s = await getKidStory(kidStoryId);
      if (!s) return;
      setStory(s);
      setCast(await getKidCharactersByIds(s.protagonistIds));
    })();
  }, [kidStoryId]);

  const pages = useMemo<BuiltPage[]>(() => {
    if (!story) return [];
    const sceneCount = story.imagePrompts?.scenes.length ?? 5;
    const sections = splitStoryIntoSections(story.content, sceneCount);
    const built: BuiltPage[] = [{ kind: "cover-front" }];
    for (let i = 0; i < sceneCount; i++) {
      built.push({
        kind: "image",
        sceneIndex: i,
        imageBlob: story.imagePrompts?.scenes[i]?.image,
        momentTitle: story.imagePrompts?.scenes[i]?.momentTitle,
      });
      built.push({
        kind: "text",
        sceneIndex: i,
        text: sections[i] ?? "",
        momentTitle: story.imagePrompts?.scenes[i]?.momentTitle,
      });
    }
    built.push({ kind: "cover-back" });
    return built;
  }, [story]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") flipBookRef.current?.pageFlip().flipNext();
      else if (e.key === "ArrowLeft") flipBookRef.current?.pageFlip().flipPrev();
      else if (e.key === "Escape") go({ name: "kids-shelf" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!story) {
    return (
      <div className="min-h-svh flex items-center justify-center px-6">
        <p className="text-night/50">Cargando libro…</p>
      </div>
    );
  }

  const totalScenes = pages.filter((p) => p.kind === "image").length;

  return (
    <div className="min-h-svh flex flex-col bg-gradient-to-b from-grape-soft/30 via-cloud to-sun-soft/20">
      <header className="flex items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={() => go({ name: "kids-shelf" })}
          className="rounded-full bg-white/90 border border-night/10 px-4 py-1.5 text-sm h-display font-medium text-night hover:bg-white shadow-sm"
        >
          ← Cerrar libro
        </button>
        <span className="text-xs text-night/50 h-display uppercase tracking-widest font-semibold">
          {pageLabel(pages, currentPage)}
        </span>
        <div className="w-[110px]" />
      </header>

      <div className="flex-1 flex items-center justify-center px-2 sm:px-6 pb-6">
        <div className="w-full max-w-[1100px]">
          <HTMLFlipBook
            ref={flipBookRef as unknown as React.Ref<typeof HTMLFlipBook>}
            width={420}
            height={560}
            size="stretch"
            minWidth={240}
            maxWidth={520}
            minHeight={320}
            maxHeight={720}
            showCover={true}
            mobileScrollSupport={false}
            usePortrait={true}
            flippingTime={750}
            maxShadowOpacity={0.5}
            drawShadow={true}
            startPage={0}
            useMouseEvents={true}
            swipeDistance={30}
            showPageCorners={true}
            disableFlipByClick={false}
            className="mx-auto"
            style={{}}
            startZIndex={0}
            autoSize={true}
            clickEventForward={true}
            renderOnlyPageLengthChange={false}
            onFlip={(e: { data: number }) => setCurrentPage(e.data)}
          >
            {pages.map((p, i) => (
              <PageWrapper key={i}>
                {p.kind === "cover-front" && <CoverContent story={story} cast={cast} />}
                {p.kind === "image" && (
                  <ImageContent
                    imageBlob={p.imageBlob}
                    momentTitle={p.momentTitle ?? ""}
                    sceneIndex={p.sceneIndex ?? 0}
                    totalScenes={totalScenes}
                  />
                )}
                {p.kind === "text" && (
                  <TextContent
                    text={p.text ?? ""}
                    momentTitle={p.momentTitle ?? ""}
                    sceneIndex={p.sceneIndex ?? 0}
                    totalScenes={totalScenes}
                  />
                )}
                {p.kind === "cover-back" && <BackContent story={story} cast={cast} />}
              </PageWrapper>
            ))}
          </HTMLFlipBook>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 pb-7">
        <button
          type="button"
          onClick={() => flipBookRef.current?.pageFlip().flipPrev()}
          disabled={currentPage === 0}
          aria-label="Página anterior"
          className="size-12 rounded-full bg-white shadow-md border border-night/10 disabled:opacity-30 hover:bg-cloud transition flex items-center justify-center text-2xl"
        >
          ←
        </button>
        <span className="text-xs text-night/55 h-display uppercase tracking-widest font-semibold w-24 text-center">
          {currentPage + 1} / {pages.length}
        </span>
        <button
          type="button"
          onClick={() => flipBookRef.current?.pageFlip().flipNext()}
          disabled={currentPage >= pages.length - 1}
          aria-label="Página siguiente"
          className="size-12 rounded-full bg-white shadow-md border border-night/10 disabled:opacity-30 hover:bg-cloud transition flex items-center justify-center text-2xl"
        >
          →
        </button>
      </div>
    </div>
  );
}

function pageLabel(pages: BuiltPage[], i: number): string {
  const p = pages[i];
  if (!p) return "";
  if (p.kind === "cover-front") return "Portada";
  if (p.kind === "cover-back") return "Contraportada";
  const sceneNumber = (p.sceneIndex ?? 0) + 1;
  const sceneCount = pages.filter((x) => x.kind === "image").length;
  return `Escena ${sceneNumber} de ${sceneCount}`;
}

// Each direct child of HTMLFlipBook MUST be a div the library can attach a ref
// to. A function component that returns JSX without forwardRef does NOT work —
// that was the bug: pages didn't register and the lector jumped to the back.
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  );
}

// --- Page content components (rendered inside PageWrapper) ---

function CoverContent({ story, cast }: { story: KidStory; cast: KidCharacter[] }) {
  const coverBlob = story.imagePrompts?.scenes.find((s) => s.image)?.image;
  const url = useObjectUrl(coverBlob);
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-grape via-strawberry to-tangerine text-white">
      {url && (
        <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
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
        <p className="mt-5 text-xs font-semibold opacity-90 self-center">
          Toca la esquina o desliza para abrir →
        </p>
      </div>
      <div aria-hidden className="absolute inset-y-0 left-0 w-2 bg-black/30 shadow-inner" />
    </div>
  );
}

function BackContent({ story, cast }: { story: KidStory; cast: KidCharacter[] }) {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-night via-grape to-strawberry text-white p-8 flex flex-col items-center justify-center text-center">
      <p className="h-display text-5xl mb-3">Fin</p>
      <p className="opacity-85 max-w-xs">{story.title || "Cuento"}</p>
      {cast.length > 0 && (
        <p className="mt-4 text-xs opacity-70 max-w-xs">
          Con {cast.map((c) => c.name).join(", ")}
        </p>
      )}
      <div aria-hidden className="absolute inset-y-0 right-0 w-2 bg-black/30 shadow-inner" />
    </div>
  );
}

function ImageContent({
  imageBlob,
  momentTitle,
  sceneIndex,
  totalScenes,
}: {
  imageBlob: Blob | undefined;
  momentTitle: string;
  sceneIndex: number;
  totalScenes: number;
}) {
  const url = useObjectUrl(imageBlob);
  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden bg-cloud shadow-lg flex items-center justify-center"
      style={PAGE_BG_STYLE}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="text-center px-8">
          <div aria-hidden className="text-6xl mb-3 opacity-30">🖼️</div>
          <p className="text-night/50 h-display text-sm">
            Sube la imagen de esta escena en la pantalla del cuento.
          </p>
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between text-[10px] text-white/85 px-2">
        <span aria-hidden className="rounded-full bg-night/60 px-2 py-0.5 backdrop-blur-sm h-display">
          {momentTitle || ""}
        </span>
        <span className="rounded-full bg-night/60 px-2 py-0.5 backdrop-blur-sm h-display">
          {sceneIndex + 1} / {totalScenes}
        </span>
      </div>
    </div>
  );
}

function TextContent({
  text,
  momentTitle,
  sceneIndex,
  totalScenes,
}: {
  text: string;
  momentTitle: string;
  sceneIndex: number;
  totalScenes: number;
}) {
  return (
    <div
      className="relative w-full h-full rounded-2xl bg-cloud shadow-lg px-7 py-9 sm:px-10 sm:py-12 overflow-y-auto"
      style={PAGE_BG_STYLE}
    >
      {momentTitle && (
        <p className="text-grape h-display text-[10px] uppercase tracking-widest font-semibold mb-3">
          {momentTitle}
        </p>
      )}
      <div
        className="text-night/90 leading-[1.85] text-base sm:text-lg whitespace-pre-wrap"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {text || (
          <span className="text-night/40 italic">(Sin texto en esta sección.)</span>
        )}
      </div>
      <p className="absolute bottom-3 right-4 text-[10px] text-night/40 h-display">
        {sceneIndex + 1} / {totalScenes}
      </p>
    </div>
  );
}
