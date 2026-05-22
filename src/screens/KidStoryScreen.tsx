import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { useSettings } from "../store/settings";
import {
  appendEdit,
  deleteKidStory,
  getKidStory,
  updateKidStory,
} from "../db/kidStories";
import { getKidCharactersByIds } from "../db/kidCharacters";
import type { KidStory, KidCharacter } from "../db/types";
import { chat } from "../api/openai";
import {
  buildKidStorySystemPrompt,
  buildKidStoryUserPrompt,
} from "../prompts/kidStory";
import { generateImagePrompts } from "../lib/generateImagePrompts";
import { augmentCastForPrompt } from "../lib/characterDefaults";
import { Sparkle, StarMascot, avatarForKind } from "../components/Mascots";
import { useObjectUrl } from "../lib/useObjectUrl";

const COOKING_MESSAGES = [
  "Reescribiendo desde el principio…",
  "Cambiando el final…",
  "Buscando otras palabras…",
  "Casi listo…",
];

export function KidStoryScreen({ kidStoryId }: { kidStoryId: string }) {
  const go = useNav((s) => s.go);
  const chapterModel = useSettings((s) => s.chapterModel);

  const [story, setStory] = useState<KidStory | null>(null);
  const [cast, setCast] = useState<KidCharacter[]>([]);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [cookingStep, setCookingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [imagePromptsBusy, setImagePromptsBusy] = useState(false);
  const [imagePromptsError, setImagePromptsError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function refresh() {
    const s = await getKidStory(kidStoryId);
    if (!s) return;
    setStory(s);
    setDraftTitle(s.title);
    setDraftContent(s.content);
    setCast(await getKidCharactersByIds(s.protagonistIds));
  }
  useEffect(() => { refresh(); }, [kidStoryId]);

  useEffect(() => {
    if (!regenerating) return;
    setCookingStep(0);
    const t = setInterval(() => {
      setCookingStep((s) => (s + 1 < COOKING_MESSAGES.length ? s + 1 : s));
    }, 2400);
    return () => clearInterval(t);
  }, [regenerating]);

  async function save() {
    await appendEdit(kidStoryId, draftContent);
    await updateKidStory(kidStoryId, { title: draftTitle.trim() });
    setEditing(false);
    await refresh();
  }

  async function regenerate() {
    if (!story) return;
    setError(null);
    setRegenerating(true);
    try {
      const protagonists = augmentCastForPrompt(
        await getKidCharactersByIds(story.protagonistIds),
      );
      const content = await chat({
        model: chapterModel,
        messages: [
          {
            role: "system",
            content: buildKidStorySystemPrompt(story.ageBand, story.targetWords, story.language),
          },
          {
            role: "user",
            content: buildKidStoryUserPrompt({
              protagonists,
              setting: story.setting,
              theme: story.theme,
              forChild: story.forChild,
              targetWords: story.targetWords,
              language: story.language,
            }),
          },
        ],
        temperature: 0.95,
        maxTokens: 2500,
      });
      const lines = content.trim().split(/\r?\n/);
      let title = "";
      let bodyStart = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim()) {
          title = lines[i].trim().replace(/^[#*\-\s"'«»]+|[\s"'«»]+$/g, "");
          bodyStart = i + 1;
          break;
        }
      }
      while (bodyStart < lines.length && !lines[bodyStart].trim()) bodyStart++;
      const body = lines.slice(bodyStart).join("\n").trim();
      await appendEdit(kidStoryId, body || content.trim());
      await updateKidStory(kidStoryId, { title: title || story.title });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRegenerating(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar este cuento? No se puede deshacer.")) return;
    await deleteKidStory(kidStoryId);
    go({ name: "kids-dashboard" });
  }

  async function regenerateImagePrompts() {
    if (!story) return;
    setImagePromptsError(null);
    setImagePromptsBusy(true);
    const ok = await generateImagePrompts({ story, model: chapterModel });
    if (!ok) {
      setImagePromptsError(
        "No pude generar los prompts esta vez. Inténtalo de nuevo en un momento.",
      );
    }
    await refresh();
    setImagePromptsBusy(false);
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      // clipboard API can fail in some browsers/permissions — silent
    }
  }

  async function uploadSceneImage(sceneIndex: number, file: File) {
    if (!story || !story.imagePrompts) return;
    if (!file.type.startsWith("image/")) return;
    // Resize on upload to keep IndexedDB lean and book pages snappy.
    const { resizeImage } = await import("../lib/image");
    const resized = await resizeImage(file, 1600, 0.9);
    const nextScenes = story.imagePrompts.scenes.map((s, i) =>
      i === sceneIndex ? { ...s, image: resized.blob, imageMimeType: resized.mimeType } : s,
    );
    await updateKidStory(story.id, {
      imagePrompts: { ...story.imagePrompts, scenes: nextScenes },
    });
    await refresh();
  }

  async function removeSceneImage(sceneIndex: number) {
    if (!story || !story.imagePrompts) return;
    const nextScenes = story.imagePrompts.scenes.map((s, i) =>
      i === sceneIndex ? { ...s, image: undefined, imageMimeType: undefined } : s,
    );
    await updateKidStory(story.id, {
      imagePrompts: { ...story.imagePrompts, scenes: nextScenes },
    });
    await refresh();
  }

  async function uploadAllSceneImages(files: FileList) {
    if (!story || !story.imagePrompts) return;
    // Sort files by name so 1.png → slot 1, 2.png → slot 2, etc.
    const sorted = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    if (sorted.length === 0) return;
    const { resizeImage } = await import("../lib/image");
    const sceneCount = story.imagePrompts.scenes.length;
    const updated = [...story.imagePrompts.scenes];
    for (let i = 0; i < Math.min(sorted.length, sceneCount); i++) {
      const r = await resizeImage(sorted[i], 1600, 0.9);
      updated[i] = { ...updated[i], image: r.blob, imageMimeType: r.mimeType };
    }
    await updateKidStory(story.id, {
      imagePrompts: { ...story.imagePrompts, scenes: updated },
    });
    await refresh();
  }

  if (!story) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-night/50">Cargando…</p>
      </div>
    );
  }

  if (regenerating) {
    const progress = Math.min(100, ((cookingStep + 1) / COOKING_MESSAGES.length) * 100);
    return (
      <div className="min-h-svh flex flex-col items-center justify-center px-6">
        <div className="relative w-44 h-44 mb-8">
          <StarMascot className="absolute inset-0 kid-avatar bob" />
          <Sparkle className="absolute -top-4 -right-2 w-6 h-6 text-strawberry blob-drift" />
        </div>
        <p className="h-display text-night text-2xl mb-2 text-center">
          Otra versión del cuento…
        </p>
        <p className="text-night/65 text-center max-w-sm mb-8 min-h-[3rem]">
          {COOKING_MESSAGES[cookingStep]}
        </p>
        <div className="w-72 h-4 rounded-full bg-night/8 overflow-hidden border-2 border-night/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-grape via-strawberry to-tangerine transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  const wordCount = countWords(story.content);
  const readMinutes = Math.max(1, Math.round(wordCount / 140));

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-8">
        <button
          type="button"
          onClick={() => go({ name: "kids-dashboard" })}
          className="text-sm text-night/60 hover:text-night"
        >
          ← Volver
        </button>
        <div className="flex items-center gap-3 text-sm h-display font-medium">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full bg-white/80 border border-night/10 px-3 py-1 text-night hover:bg-white shadow-sm"
            >
              ✏️ Editar
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            className="rounded-full bg-white/80 border border-strawberry/30 px-3 py-1 text-strawberry hover:bg-strawberry-soft shadow-sm"
          >
            Eliminar
          </button>
        </div>
      </header>

      {editing ? (
        <div className="space-y-4">
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="w-full rounded-2xl border-2 border-night/15 bg-white px-4 py-3 h-display text-2xl font-semibold focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
          />
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            rows={24}
            className="w-full rounded-2xl border-2 border-night/15 bg-white px-4 py-3 text-base leading-relaxed focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
            style={{ fontFamily: "var(--font-rounded)" }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="btn-3d kid-button rounded-2xl bg-grape px-5 py-2.5 h-display text-white font-semibold"
              style={{ borderBottomColor: "#7c5dd6" }}
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); refresh(); }}
              className="rounded-2xl px-4 py-2.5 text-sm text-night/60 hover:text-night"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Storybook header */}
          <div className="relative rounded-3xl overflow-hidden mb-8 p-8 bg-gradient-to-br from-grape-soft via-strawberry-soft to-sun-soft border-2 border-white shadow-md">
            <Sparkle className="absolute top-4 right-6 w-5 h-5 text-strawberry blob-drift" />
            <Sparkle className="absolute bottom-6 left-8 w-4 h-4 text-grape blob-drift" />
            {cast.length > 0 && (
              <div className="flex -space-x-3 mb-4">
                {cast.slice(0, 5).map((c) => (
                  <span
                    key={c.id}
                    className="size-14 rounded-full bg-white border-2 border-night/10 shadow-sm flex items-center justify-center text-3xl"
                    title={c.name}
                  >
                    {avatarForKind(c.kind)}
                  </span>
                ))}
              </div>
            )}
            <h1 className="h-display text-3xl md:text-4xl text-night leading-tight">
              {story.title || "Cuento"}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs h-display font-semibold">
              <span className="rounded-full bg-white/80 px-3 py-1 text-night">
                {story.ageBand} años
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-night">
                ⏱️ {readMinutes} min
              </span>
              {story.forChild && (
                <span className="rounded-full bg-strawberry text-white px-3 py-1">
                  💝 Para {story.forChild}
                </span>
              )}
            </div>
            {story.setting && (
              <p className="mt-3 text-sm text-night/70 italic">{story.setting}</p>
            )}
          </div>

          <article className="rounded-3xl bg-white border-2 border-white shadow-md px-7 py-8 sm:px-10 sm:py-10">
            {story.content.split(/\n{2,}/).map((para, i) => (
              <p
                key={i}
                className="text-[19px] leading-[1.8] text-night/90 mb-5 whitespace-pre-wrap last:mb-0"
                style={{ fontFamily: "var(--font-rounded)" }}
              >
                {i === 0 && para.length > 1 ? (
                  <>
                    <span className="float-left text-5xl h-display font-bold text-grape leading-none pr-2 pt-1">
                      {para.charAt(0)}
                    </span>
                    {para.slice(1)}
                  </>
                ) : (
                  para
                )}
              </p>
            ))}
          </article>

          <p className="mt-4 text-xs text-night/45 text-center h-display">
            {wordCount} palabras
          </p>

          {/* Image prompts for Gemini Nano Banana */}
          <section className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
              <h2 className="h-display text-2xl text-night flex items-center gap-2">
                <span aria-hidden>🎨</span> Imágenes del cuento
              </h2>
              <button
                type="button"
                onClick={regenerateImagePrompts}
                disabled={imagePromptsBusy}
                className="rounded-full bg-white/80 border border-night/10 px-3 py-1 text-xs h-display font-semibold text-night hover:bg-white shadow-sm disabled:opacity-50"
              >
                {imagePromptsBusy
                  ? "Generando…"
                  : story.imagePrompts
                    ? "🔄 Regenerar prompts"
                    : "✨ Generar prompts"}
              </button>
            </div>
            <p className="text-sm text-night/65 mb-3">
              Cinco prompts en inglés optimizados para Gemini Nano Banana. Cópialos uno por uno
              y pégalos en Gemini para crear las ilustraciones del cuento. Los personajes mantienen
              la misma apariencia en las cinco imágenes.
            </p>

            {story.imagePrompts && (
              <div className="mb-5 rounded-2xl bg-sun-soft/70 border-2 border-sun/40 px-5 py-4">
                <p className="h-display text-sm font-semibold text-night mb-1">
                  📥 Subir todas las imágenes a la vez
                </p>
                <p className="text-xs text-night/65 mb-3">
                  Nombra tus archivos <code className="font-mono bg-white/70 px-1 rounded">1</code>,{" "}
                  <code className="font-mono bg-white/70 px-1 rounded">2</code>,{" "}
                  <code className="font-mono bg-white/70 px-1 rounded">3</code>,{" "}
                  <code className="font-mono bg-white/70 px-1 rounded">4</code>,{" "}
                  <code className="font-mono bg-white/70 px-1 rounded">5</code> (.png, .jpg…) y arrástralos aquí —
                  yo los asigno por orden de nombre. Cualquier nombre vale mientras se ordenen bien (1, 2, 3 o nombre1, nombre2…).
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        uploadAllSceneImages(e.target.files);
                      }
                      e.target.value = "";
                    }}
                  />
                  <span className="btn-3d kid-button inline-block rounded-full bg-sun text-night px-4 py-1.5 text-xs h-display font-semibold cursor-pointer"
                        style={{ borderBottomColor: "#a37510" }}>
                    Subir varias imágenes
                  </span>
                </label>
              </div>
            )}

            {imagePromptsError && (
              <div className="mb-4 rounded-2xl bg-strawberry-soft border-2 border-strawberry/30 px-5 py-3 text-sm text-strawberry">
                {imagePromptsError}
              </div>
            )}

            {!story.imagePrompts && !imagePromptsBusy && (
              <div className="rounded-2xl bg-white/70 border-2 border-dashed border-night/15 px-5 py-6 text-center text-night/60">
                Todavía no hay prompts. Toca <strong>Generar prompts</strong> para que el cuento se ilustre.
              </div>
            )}

            {story.imagePrompts && (
              <>
                {/* Style and characters — the canonical references repeated in every scene */}
                <div className="mb-5 rounded-2xl bg-white border border-night/10 px-5 py-4 shadow-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs uppercase tracking-widest text-grape font-semibold h-display">
                      Estilo visual (igual en las 5 imágenes)
                    </p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(story.imagePrompts!.style, "style")}
                      className="text-xs h-display font-medium text-night/60 hover:text-grape"
                    >
                      {copiedKey === "style" ? "✓ Copiado" : "Copiar"}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-night/85 leading-relaxed">
                    {story.imagePrompts.style}
                  </p>
                </div>

                {story.imagePrompts.characters.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-widest text-grape font-semibold h-display mb-2">
                      Personajes (descripción fija para mantener continuidad)
                    </p>
                    <ul className="space-y-2">
                      {story.imagePrompts.characters.map((c, i) => (
                        <li
                          key={c.name + i}
                          className="rounded-2xl bg-white border border-night/10 px-5 py-3 shadow-sm"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="h-display text-base font-semibold text-night">
                              {c.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(c.description, "char-" + i)}
                              className="text-xs h-display font-medium text-night/60 hover:text-grape"
                            >
                              {copiedKey === "char-" + i ? "✓ Copiado" : "Copiar"}
                            </button>
                          </div>
                          <p className="mt-1 text-sm text-night/80 leading-relaxed">
                            {c.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* The 5 scene prompts */}
                <ol className="space-y-3">
                  {story.imagePrompts.scenes.map((scene, i) => (
                    <li
                      key={i}
                      className="rounded-3xl bg-gradient-to-br from-sky-soft/60 via-white to-grape-soft/40 border-2 border-white shadow-md px-5 py-4"
                    >
                      <div className="flex items-baseline justify-between gap-3 mb-3">
                        <div className="flex items-baseline gap-3">
                          <span className="size-7 rounded-full bg-grape text-white flex items-center justify-center text-sm h-display font-bold shrink-0">
                            {i + 1}
                          </span>
                          <p className="h-display text-base font-semibold text-night">
                            {scene.momentTitle || `Escena ${i + 1}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(scene.prompt, "scene-" + i)}
                          className="btn-3d kid-button shrink-0 rounded-full bg-grape px-3 py-1 text-xs h-display font-semibold text-white"
                          style={{ borderBottomColor: "#7c5dd6" }}
                        >
                          {copiedKey === "scene-" + i ? "✓ Copiado" : "📋 Copiar"}
                        </button>
                      </div>

                      <SceneImageSlot
                        scene={scene}
                        index={i}
                        onUpload={uploadSceneImage}
                        onRemove={removeSceneImage}
                      />

                      <p
                        className="mt-3 text-sm text-night/85 leading-relaxed whitespace-pre-wrap"
                        style={{ fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }}
                      >
                        {scene.prompt}
                      </p>
                    </li>
                  ))}
                </ol>

                <p className="mt-4 text-xs text-night/45 text-center h-display">
                  Generado {new Date(story.imagePrompts.generatedAt).toLocaleString("es")}
                </p>
              </>
            )}
          </section>
        </>
      )}

      {error && (
        <div className="mt-6 rounded-2xl bg-strawberry-soft border-2 border-strawberry/30 px-5 py-3 text-sm text-strawberry">
          {error}
        </div>
      )}

      {!editing && (
        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={() => go({ name: "kids-book", kidStoryId })}
            className="btn-3d kid-button rounded-2xl bg-gradient-to-br from-sky to-grape text-white px-7 py-3 h-display font-semibold shadow-md"
            style={{ borderBottomColor: "#3aa19a" }}
          >
            📖 Leer en libro
          </button>
          <button
            type="button"
            onClick={regenerate}
            className="btn-3d kid-button rounded-2xl bg-gradient-to-br from-grape to-strawberry text-white px-7 py-3 h-display font-semibold shadow-md"
            style={{ borderBottomColor: "#7c5dd6" }}
          >
            ✨ Volver a inventar
          </button>
        </div>
      )}
    </div>
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function SceneImageSlot({
  scene,
  index,
  onUpload,
  onRemove,
}: {
  scene: import("../db/types").KidStoryImagePromptScene;
  index: number;
  onUpload: (i: number, f: File) => void | Promise<void>;
  onRemove: (i: number) => void | Promise<void>;
}) {
  const url = useObjectUrl(scene.image);
  const inputId = `scene-img-${index}`;
  if (url) {
    return (
      <div className="relative rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-cloud">
        <img
          src={url}
          alt=""
          className="block w-full h-auto"
          style={{ maxHeight: "60vh", objectFit: "contain" }}
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <label
            htmlFor={inputId}
            className="rounded-full bg-night/70 backdrop-blur-sm text-white text-[11px] h-display font-semibold px-2.5 py-1 cursor-pointer hover:bg-night/80"
          >
            Cambiar
          </label>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="rounded-full bg-night/70 backdrop-blur-sm text-white text-[11px] h-display font-semibold px-2.5 py-1 hover:bg-strawberry"
          >
            Quitar
          </button>
        </div>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(index, f);
            e.target.value = "";
          }}
        />
      </div>
    );
  }
  return (
    <label
      htmlFor={inputId}
      className="block rounded-2xl border-2 border-dashed border-grape/30 bg-cloud/60 px-4 py-5 text-center cursor-pointer hover:bg-cloud hover:border-grape/60 transition"
    >
      <p className="h-display text-sm font-semibold text-grape">📥 Subir imagen para esta escena</p>
      <p className="mt-1 text-xs text-night/55">
        Pega el prompt en Gemini, descarga la imagen, y súbela aquí.
      </p>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(index, f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
