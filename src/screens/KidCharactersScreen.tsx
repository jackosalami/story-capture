import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { createKidCharacter, listKidCharacters } from "../db/kidCharacters";
import { listKidStories } from "../db/kidStories";
import type { KidCharacter, KidCharacterKind } from "../db/types";
import { avatarForKind, colorForKind } from "../components/Mascots";
import { CharacterImageUpload } from "../components/CharacterImageUpload";
import { useObjectUrl } from "../lib/useObjectUrl";

const KIND_OPTIONS: KidCharacterKind[] = ["niño", "animal", "criatura", "objeto mágico", "otro"];

function ListAvatar({ character, colorBg }: { character: KidCharacter; colorBg: string }) {
  const url = useObjectUrl(character.image);
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="size-14 rounded-full object-cover border-2 border-white shadow-sm"
      />
    );
  }
  return (
    <span
      className={
        "size-14 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-3xl " +
        colorBg
      }
    >
      {avatarForKind(character.kind)}
    </span>
  );
}

export function KidCharactersScreen() {
  const go = useNav((s) => s.go);
  const [characters, setCharacters] = useState<KidCharacter[]>([]);
  const [storyCountById, setStoryCountById] = useState<Record<string, number>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<KidCharacterKind>("niño");
  const [newDescription, setNewDescription] = useState("");
  const [newImage, setNewImage] = useState<Blob | undefined>(undefined);
  const [newImageMime, setNewImageMime] = useState<string | undefined>(undefined);

  async function refresh() {
    const [chars, stories] = await Promise.all([
      listKidCharacters(),
      listKidStories(),
    ]);
    setCharacters(chars);
    const counts: Record<string, number> = {};
    for (const c of chars) counts[c.id] = 0;
    for (const s of stories) {
      for (const cid of s.protagonistIds) {
        if (counts[cid] !== undefined) counts[cid]++;
      }
    }
    setStoryCountById(counts);
  }
  useEffect(() => { refresh(); }, []);

  async function saveNew() {
    if (!newName.trim()) return;
    await createKidCharacter({
      name: newName,
      kind: newKind,
      description: newDescription.trim(),
      image: newImage,
      imageMimeType: newImageMime,
    });
    setNewName("");
    setNewKind("niño");
    setNewDescription("");
    setNewImage(undefined);
    setNewImageMime(undefined);
    setShowCreate(false);
    await refresh();
  }

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
        <span className="text-xs text-night/45 uppercase tracking-widest font-semibold">
          Personajes
        </span>
      </header>

      <h1 className="h-display text-4xl text-night mb-2">Tus personajes</h1>
      <p className="text-night/65 mb-8">
        Los héroes, sidekicks y criaturas que pueblan tus cuentos.
      </p>

      {characters.length === 0 ? (
        <div className="text-center mt-12">
          <div aria-hidden className="text-6xl mb-3">🧙‍♀️🦊🐉</div>
          <p className="text-night/65 leading-relaxed">
            Aún no hay personajes. Crea el primero abajo, o añádelos cuando
            empieces un cuento nuevo.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {characters.map((c) => {
            const color = colorForKind(c.kind);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => go({ name: "kids-character", kidCharacterId: c.id })}
                  className="kid-card block w-full text-left rounded-3xl px-5 py-4"
                >
                  <div className="flex items-start gap-4">
                    <ListAvatar character={c} colorBg={color.bg} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="h-display text-xl text-night truncate">{c.name}</span>
                        <span className="shrink-0 text-[11px] uppercase tracking-wider font-semibold text-night/55">
                          {storyCountById[c.id] ?? 0} {storyCountById[c.id] === 1 ? "cuento" : "cuentos"}
                        </span>
                      </div>
                      <span className={"inline-block mt-1 text-xs rounded-full px-2 py-0.5 font-medium " + color.bg + " " + color.text}>
                        {c.kind}
                      </span>
                      {c.description && (
                        <p className="mt-2 text-sm text-night/70 line-clamp-2">{c.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10">
        {showCreate ? (
          <div className="rounded-3xl bg-white border-2 border-night/10 p-5 space-y-4 shadow-sm">
            <CharacterImageUpload
              existingImage={newImage}
              existingMimeType={newImageMime}
              onImageChange={(blob, mime) => {
                setNewImage(blob);
                setNewImageMime(mime);
              }}
              onDescribed={({ description, suggestedKind }) => {
                if (!newDescription.trim()) setNewDescription(description);
                setNewKind(suggestedKind);
              }}
            />
            <label className="block">
              <span className="h-display text-sm font-semibold text-night/80">Nombre</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="mt-1 w-full rounded-2xl border-2 border-night/10 px-3 py-2 text-sm focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
              />
            </label>
            <label className="block">
              <span className="h-display text-sm font-semibold text-night/80">¿Qué es?</span>
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as KidCharacterKind)}
                className="mt-1 w-full rounded-2xl border-2 border-night/10 px-3 py-2 text-sm focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="h-display text-sm font-semibold text-night/80">Descripción (opcional)</span>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-2xl border-2 border-night/10 px-3 py-2 text-sm focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveNew}
                disabled={!newName.trim()}
                className="btn-3d kid-button rounded-2xl bg-grape px-4 py-2 text-sm h-display font-semibold text-white disabled:opacity-50"
                style={{ borderBottomColor: "#7c5dd6" }}
              >
                Añadir
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                  setNewDescription("");
                  setNewImage(undefined);
                  setNewImageMime(undefined);
                }}
                className="rounded-2xl px-3 py-2 text-sm text-night/60 hover:text-night"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn-3d kid-button rounded-2xl bg-gradient-to-br from-sky to-grape text-white px-5 py-3 h-display font-semibold shadow-md"
            style={{ borderBottomColor: "#3aa19a" }}
          >
            ➕ Crear personaje
          </button>
        )}
      </div>
    </div>
  );
}
