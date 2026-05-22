import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import {
  deleteKidCharacter,
  getKidCharacter,
  updateKidCharacter,
} from "../db/kidCharacters";
import { listKidStories } from "../db/kidStories";
import type { KidCharacter, KidCharacterKind, KidStory } from "../db/types";
import { avatarForKind, colorForKind } from "../components/Mascots";
import { CharacterImageUpload } from "../components/CharacterImageUpload";
import { useObjectUrl } from "../lib/useObjectUrl";

const KIND_OPTIONS: KidCharacterKind[] = ["niño", "animal", "criatura", "objeto mágico", "otro"];

function DetailAvatar({ character, colorBg }: { character: KidCharacter; colorBg: string }) {
  const url = useObjectUrl(character.image);
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="size-24 rounded-full object-cover border-4 border-white shadow-md"
      />
    );
  }
  return (
    <span
      className={
        "size-24 rounded-full border-4 border-white shadow-md flex items-center justify-center text-5xl " +
        colorBg
      }
    >
      {avatarForKind(character.kind)}
    </span>
  );
}

export function KidCharacterScreen({ kidCharacterId }: { kidCharacterId: string }) {
  const go = useNav((s) => s.go);
  const [character, setCharacter] = useState<KidCharacter | null>(null);
  const [stories, setStories] = useState<KidStory[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<KidCharacterKind>("niño");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<Blob | undefined>(undefined);
  const [imageMime, setImageMime] = useState<string | undefined>(undefined);

  async function refresh() {
    const c = await getKidCharacter(kidCharacterId);
    if (!c) return;
    setCharacter(c);
    setName(c.name);
    setKind(c.kind);
    setDescription(c.description);
    setImage(c.image);
    setImageMime(c.imageMimeType);
    const all = await listKidStories();
    setStories(all.filter((s) => s.protagonistIds.includes(kidCharacterId)));
  }
  useEffect(() => { refresh(); }, [kidCharacterId]);

  async function save() {
    await updateKidCharacter(kidCharacterId, {
      name: name.trim(),
      kind,
      description: description.trim(),
      image,
      imageMimeType: imageMime,
    });
    setEditing(false);
    await refresh();
  }

  async function remove() {
    if (!confirm("¿Eliminar este personaje? Los cuentos que ya existen no cambian.")) return;
    await deleteKidCharacter(kidCharacterId);
    go({ name: "kids-characters" });
  }

  if (!character) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-night/50">Cargando…</p>
      </div>
    );
  }

  const color = colorForKind(character.kind);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-8">
        <button
          type="button"
          onClick={() => go({ name: "kids-characters" })}
          className="text-sm text-night/60 hover:text-night"
        >
          ← Personajes
        </button>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full bg-white/80 border border-night/10 px-3 py-1 text-sm h-display font-medium text-night hover:bg-white shadow-sm"
          >
            ✏️ Editar
          </button>
        )}
      </header>

      {editing ? (
        <div className="space-y-4">
          <CharacterImageUpload
            existingImage={image}
            existingMimeType={imageMime}
            onImageChange={(blob, mime) => {
              setImage(blob);
              setImageMime(mime);
            }}
            onDescribed={({ description: desc, suggestedKind }) => {
              setDescription(desc);
              setKind(suggestedKind);
            }}
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border-2 border-night/10 bg-white px-4 py-3 h-display text-2xl font-semibold focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as KidCharacterKind)}
            className="w-full rounded-2xl border-2 border-night/10 bg-white px-4 py-3 text-base focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Descripción"
            className="w-full rounded-2xl border-2 border-night/10 bg-white px-4 py-3 text-base focus:outline-none focus:border-grape focus:ring-2 focus:ring-grape/20"
          />
          <div className="flex gap-2 items-center">
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
            <button
              type="button"
              onClick={remove}
              className="ml-auto rounded-full bg-white/80 border border-strawberry/30 px-3 py-1 text-sm h-display text-strawberry hover:bg-strawberry-soft"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-5 mb-6">
            <DetailAvatar character={character} colorBg={color.bg} />
            <div>
              <h1 className="h-display text-4xl text-night leading-tight">{character.name}</h1>
              <span className={"inline-block mt-2 text-xs rounded-full px-3 py-1 font-semibold h-display " + color.bg + " " + color.text}>
                {character.kind}
              </span>
            </div>
          </div>
          {character.description && (
            <p className="text-base text-night/80 leading-relaxed whitespace-pre-wrap rounded-2xl bg-white/70 border border-night/10 px-5 py-4">
              {character.description}
            </p>
          )}
        </>
      )}

      <section className="mt-10">
        <h2 className="h-display text-xl text-night mb-3 flex items-center gap-2">
          <span aria-hidden>📚</span> Aparece en
        </h2>
        {stories.length === 0 ? (
          <p className="text-sm text-night/55 italic">Aún no aparece en ningún cuento.</p>
        ) : (
          <ul className="space-y-2">
            {stories.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go({ name: "kids-story", kidStoryId: s.id })}
                  className="kid-card block w-full text-left rounded-2xl px-4 py-3"
                >
                  <span className="h-display text-base text-night">
                    {s.title || "Cuento sin título"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
