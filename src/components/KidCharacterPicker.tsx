import { useEffect, useState } from "react";
import { createKidCharacter, listKidCharacters } from "../db/kidCharacters";
import type { KidCharacter, KidCharacterKind } from "../db/types";
import { avatarForKind, colorForKind } from "./Mascots";
import { CharacterImageUpload } from "./CharacterImageUpload";
import { useObjectUrl } from "../lib/useObjectUrl";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const KIND_OPTIONS: KidCharacterKind[] = ["niño", "animal", "criatura", "objeto mágico", "otro"];

function CharacterAvatar({
  character,
  selected,
  colorBg,
}: {
  character: KidCharacter;
  selected: boolean;
  colorBg: string;
}) {
  const url = useObjectUrl(character.image);
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="size-9 rounded-full object-cover border-2 border-white/70 shrink-0"
      />
    );
  }
  return (
    <span
      className={
        "size-9 rounded-full flex items-center justify-center text-xl shrink-0 " +
        (selected ? "bg-white/20" : colorBg)
      }
    >
      {avatarForKind(character.kind)}
    </span>
  );
}

export function KidCharacterPicker({ selectedIds, onChange }: Props) {
  const [characters, setCharacters] = useState<KidCharacter[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<KidCharacterKind>("niño");
  const [newDescription, setNewDescription] = useState("");
  const [newImage, setNewImage] = useState<Blob | undefined>(undefined);
  const [newImageMime, setNewImageMime] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setCharacters(await listKidCharacters());
  }
  useEffect(() => { refresh(); }, []);

  function toggle(id: string) {
    onChange(selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]);
  }

  function resetForm() {
    setNewName("");
    setNewKind("niño");
    setNewDescription("");
    setNewImage(undefined);
    setNewImageMime(undefined);
    setShowCreate(false);
  }

  async function saveNew() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const c = await createKidCharacter({
      name,
      kind: newKind,
      description: newDescription.trim(),
      image: newImage,
      imageMimeType: newImageMime,
    });
    resetForm();
    setSaving(false);
    await refresh();
    onChange([...selectedIds, c.id]);
  }

  return (
    <div>
      {characters.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {characters.map((c) => {
            const selected = selectedIds.includes(c.id);
            const color = colorForKind(c.kind);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={
                  "kid-button rounded-2xl border-2 px-3 py-2 text-left transition flex items-center gap-2 " +
                  (selected
                    ? "bg-grape text-white border-grape shadow-md"
                    : "bg-white text-night border-night/10 hover:border-grape")
                }
              >
                <CharacterAvatar character={c} selected={selected} colorBg={color.bg} />

                <span className="flex flex-col min-w-0">
                  <span className="h-display text-sm font-semibold truncate">{c.name}</span>
                  <span className={"text-[10px] uppercase tracking-wider " + (selected ? "text-white/80" : "text-night/55")}>
                    {c.kind}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {showCreate ? (
        <div className="rounded-2xl border-2 border-night/10 bg-white p-4 space-y-3 shadow-sm">
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
            <span className="h-display text-xs font-semibold text-night/80">Nombre</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              placeholder="Lucas, Pipo, la Luna…"
              className="mt-1 w-full rounded-xl border-2 border-night/10 px-3 py-2 text-sm focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
            />
          </label>
          <label className="block">
            <span className="h-display text-xs font-semibold text-night/80">¿Qué es?</span>
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as KidCharacterKind)}
              className="mt-1 w-full rounded-xl border-2 border-night/10 px-3 py-2 text-sm focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="h-display text-xs font-semibold text-night/80">¿Cómo es?</span>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              placeholder="Un zorro pequeño, muy curioso, que siempre lleva una bufanda roja."
              className="mt-1 w-full rounded-xl border-2 border-night/10 px-3 py-2 text-sm focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveNew}
              disabled={saving || !newName.trim()}
              className="btn-3d kid-button rounded-xl bg-grape px-4 py-2 text-sm h-display font-semibold text-white disabled:opacity-50"
              style={{ borderBottomColor: "#7c5dd6" }}
            >
              {saving ? "Guardando…" : "Añadir"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl px-3 py-2 text-sm text-night/60 hover:text-night"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-sm h-display font-semibold text-grape hover:underline"
        >
          + Crear un personaje
        </button>
      )}
    </div>
  );
}
