import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import {
  deleteKidCharacter,
  getKidCharacter,
  updateKidCharacter,
} from "../db/kidCharacters";
import { listKidStories } from "../db/kidStories";
import type { KidCharacter, KidCharacterKind, KidStory } from "../db/types";

const KIND_OPTIONS: KidCharacterKind[] = ["niño", "animal", "criatura", "objeto mágico", "otro"];

export function KidCharacterScreen({ kidCharacterId }: { kidCharacterId: string }) {
  const go = useNav((s) => s.go);
  const [character, setCharacter] = useState<KidCharacter | null>(null);
  const [stories, setStories] = useState<KidStory[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<KidCharacterKind>("niño");
  const [description, setDescription] = useState("");

  async function refresh() {
    const c = await getKidCharacter(kidCharacterId);
    if (!c) return;
    setCharacter(c);
    setName(c.name);
    setKind(c.kind);
    setDescription(c.description);
    const all = await listKidStories();
    setStories(all.filter((s) => s.protagonistIds.includes(kidCharacterId)));
  }
  useEffect(() => { refresh(); }, [kidCharacterId]);

  async function save() {
    await updateKidCharacter(kidCharacterId, {
      name: name.trim(),
      kind,
      description: description.trim(),
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
        <p className="text-ink/50">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-8">
        <button
          type="button"
          onClick={() => go({ name: "kids-characters" })}
          className="text-sm text-ink/60 hover:text-ink"
        >
          ← Personajes
        </button>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-warm hover:underline"
          >
            Editar
          </button>
        )}
      </header>

      {editing ? (
        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-2xl font-medium focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as KidCharacterKind)}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
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
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
          <div className="flex gap-2 items-center">
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
            <button
              type="button"
              onClick={remove}
              className="ml-auto text-sm text-record hover:underline"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-medium text-ink">{character.name}</h1>
          <p className="mt-1 text-base text-ink/65">{character.kind}</p>
          {character.description && (
            <p className="mt-6 text-base text-ink leading-relaxed whitespace-pre-wrap">
              {character.description}
            </p>
          )}
        </>
      )}

      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-wide text-ink/50 mb-3">
          Aparece en
        </h2>
        {stories.length === 0 ? (
          <p className="text-sm text-ink/50">Aún no aparece en ningún cuento.</p>
        ) : (
          <ul className="space-y-2">
            {stories.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go({ name: "kids-story", kidStoryId: s.id })}
                  className="block w-full text-left rounded-lg border border-ink/10 bg-white px-4 py-3 hover:border-warm/60 transition"
                >
                  <span className="text-base font-medium text-ink">
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
