import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { getCharacter, updateCharacter, deleteCharacter } from "../db/characters";
import { getStory } from "../db/stories";
import type { Character, Story } from "../db/types";

export function CharacterScreen({ characterId }: { characterId: string }) {
  const go = useNav((s) => s.go);
  const [character, setCharacter] = useState<Character | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  async function refresh() {
    const c = await getCharacter(characterId);
    if (!c) return;
    setCharacter(c);
    setName(c.name);
    setRelationship(c.relationship);
    setDescription(c.description);
    setNotes(c.notes);
    const stories = (await Promise.all(c.storyIds.map((id) => getStory(id)))).filter(
      (s): s is Story => !!s,
    );
    setStories(stories);
  }
  useEffect(() => { refresh(); }, [characterId]);

  async function save() {
    await updateCharacter(characterId, {
      name: name.trim(),
      relationship: relationship.trim(),
      description: description.trim(),
      notes: notes.trim(),
    });
    setEditing(false);
    await refresh();
  }

  async function remove() {
    if (!confirm("¿Eliminar este personaje? Se quitará de todas las historias.")) return;
    await deleteCharacter(characterId);
    go({ name: "characters" });
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
          onClick={() => go({ name: "characters" })}
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
          <input
            type="text"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Relación"
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción"
            rows={4}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas"
            rows={3}
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
          {character.relationship && (
            <p className="mt-1 text-base text-ink/65">{character.relationship}</p>
          )}
          {character.description && (
            <p className="mt-6 text-base text-ink leading-relaxed whitespace-pre-wrap">
              {character.description}
            </p>
          )}
          {character.notes && (
            <p className="mt-4 text-sm text-ink/65 leading-relaxed whitespace-pre-wrap">
              {character.notes}
            </p>
          )}
        </>
      )}

      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-wide text-ink/50 mb-3">
          Aparece en
        </h2>
        {stories.length === 0 ? (
          <p className="text-sm text-ink/50">Aún no aparece en ninguna historia.</p>
        ) : (
          <ul className="space-y-2">
            {stories.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go({ name: "story", storyId: s.id })}
                  className="block w-full text-left rounded-lg border border-ink/10 bg-white px-4 py-3 hover:border-warm/60 transition"
                >
                  <span className="text-base font-medium text-ink">
                    {s.title || "Historia sin título"}
                  </span>
                  {s.storyDate && (
                    <span className="ml-2 text-xs text-ink/50">{s.storyDate}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
