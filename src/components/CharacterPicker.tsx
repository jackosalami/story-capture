import { useEffect, useState } from "react";
import { createCharacter, listCharacters } from "../db/characters";
import type { Character } from "../db/types";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

// Multi-select character picker with inline "create new" entry.
// Used in StorySetupScreen and (later) when editing a story's metadata.

export function CharacterPicker({ selectedIds, onChange }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setCharacters(await listCharacters());
  }

  useEffect(() => {
    refresh();
  }, []);

  function toggle(id: string) {
    onChange(selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]);
  }

  async function saveNew() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const char = await createCharacter({
      name,
      relationship: newRelationship.trim(),
    });
    setNewName("");
    setNewRelationship("");
    setShowCreate(false);
    setSaving(false);
    await refresh();
    onChange([...selectedIds, char.id]);
  }

  return (
    <div>
      {characters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {characters.map((c) => {
            const selected = selectedIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={
                  "rounded-full border px-4 py-1.5 text-sm transition " +
                  (selected
                    ? "bg-warm text-white border-warm"
                    : "bg-white text-ink border-ink/20 hover:border-warm/60")
                }
              >
                {c.name}
                {c.relationship && (
                  <span className={"ml-1 " + (selected ? "text-white/80" : "text-ink/50")}>
                    · {c.relationship}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {showCreate ? (
        <div className="rounded-xl border border-ink/15 bg-white p-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-ink/70">Nombre</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              placeholder="Tía María"
              className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink/70">Relación (opcional)</span>
            <input
              type="text"
              value={newRelationship}
              onChange={(e) => setNewRelationship(e.target.value)}
              placeholder="mi tía por parte de mamá"
              className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveNew}
              disabled={saving || !newName.trim()}
              className="rounded-lg bg-warm px-4 py-2 text-sm font-medium text-white hover:bg-warm/90 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Añadir"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewName("");
                setNewRelationship("");
              }}
              className="rounded-lg px-3 py-2 text-sm text-ink/60 hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-sm text-warm hover:underline"
        >
          + Añadir una persona nueva
        </button>
      )}
    </div>
  );
}
