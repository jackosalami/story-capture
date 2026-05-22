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
import { Sparkle, StarMascot, avatarForKind } from "../components/Mascots";

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
      const protagonists = await getKidCharactersByIds(story.protagonistIds);
      const content = await chat({
        model: chapterModel,
        messages: [
          { role: "system", content: buildKidStorySystemPrompt(story.ageBand, story.targetWords) },
          {
            role: "user",
            content: buildKidStoryUserPrompt({
              protagonists,
              setting: story.setting,
              theme: story.theme,
              forChild: story.forChild,
              targetWords: story.targetWords,
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
        </>
      )}

      {error && (
        <div className="mt-6 rounded-2xl bg-strawberry-soft border-2 border-strawberry/30 px-5 py-3 text-sm text-strawberry">
          {error}
        </div>
      )}

      {!editing && (
        <div className="mt-10 flex justify-center">
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
