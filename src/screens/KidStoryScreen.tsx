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

export function KidStoryScreen({ kidStoryId }: { kidStoryId: string }) {
  const go = useNav((s) => s.go);
  const chapterModel = useSettings((s) => s.chapterModel);

  const [story, setStory] = useState<KidStory | null>(null);
  const [cast, setCast] = useState<KidCharacter[]>([]);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [regenerating, setRegenerating] = useState(false);
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
          {
            role: "system",
            content: buildKidStorySystemPrompt(story.ageBand, story.targetWords),
          },
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
      // Re-split title/body
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
        <p className="text-ink/50">Cargando…</p>
      </div>
    );
  }

  const wordCount = countWords(story.content);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-8">
        <button
          type="button"
          onClick={() => go({ name: "kids-dashboard" })}
          className="text-sm text-ink/60 hover:text-ink"
        >
          ← Volver
        </button>
        <div className="flex items-center gap-3 text-sm">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-warm hover:underline"
            >
              Editar
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            className="text-record hover:underline"
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
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-2xl font-medium focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            rows={24}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base leading-relaxed font-serif focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-warm px-5 py-2 text-sm font-medium text-white hover:bg-warm/90"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); refresh(); }}
              className="rounded-lg px-3 py-2 text-sm text-ink/60 hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-medium text-ink leading-tight">
            {story.title || "Cuento"}
          </h1>
          <p className="mt-2 text-sm text-ink/55">
            {story.ageBand} años
            {story.forChild && <> · Para {story.forChild}</>}
            {story.setting && <> · {story.setting}</>}
          </p>
          {cast.length > 0 && (
            <p className="mt-1 text-sm text-ink/55">
              Con: {cast.map((c) => c.name).join(", ")}
            </p>
          )}

          <article className="mt-8 prose-spaced">
            {story.content.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="text-lg leading-loose text-ink mb-5 whitespace-pre-wrap">
                {para}
              </p>
            ))}
          </article>

          <p className="mt-6 text-xs text-ink/45">
            {wordCount} palabras · aproximadamente {Math.round(wordCount / 140)} min de lectura
          </p>
        </>
      )}

      {error && (
        <div className="mt-6 rounded-lg bg-record-soft border border-record/30 px-4 py-3 text-sm text-record">
          {error}
        </div>
      )}

      {!editing && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={regenerate}
            disabled={regenerating}
            className="rounded-lg border border-warm/40 bg-warm-soft px-5 py-3 text-sm font-medium text-warm hover:bg-warm/10 disabled:opacity-50"
          >
            {regenerating ? "Escribiendo otra versión…" : "Volver a generar"}
          </button>
        </div>
      )}
    </div>
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
