import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { createCharacter, listCharacters } from "../db/characters";
import type { Character } from "../db/types";

export function CharactersScreen() {
  const go = useNav((s) => s.go);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setCharacters(await listCharacters());
  }
  useEffect(() => { refresh(); }, []);

  async function saveNew() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    await createCharacter({ name, relationship: newRelationship.trim() });
    setNewName("");
    setNewRelationship("");
    setShowCreate(false);
    setSaving(false);
    await refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-8">
        <button
          type="button"
          onClick={() => go({ name: "dashboard" })}
          className="text-sm text-ink/60 hover:text-ink"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-medium text-ink">Personajes</h1>
        <span />
      </header>

      {characters.length === 0 ? (
        <p className="text-ink/60 text-center mt-10">
          Aún no has añadido personajes. Aparecerán aquí cuando los menciones en una historia.
        </p>
      ) : (
        <ul className="space-y-3">
          {characters.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => go({ name: "character", characterId: c.id })}
                className="block w-full text-left rounded-xl border border-ink/10 bg-white px-5 py-4 hover:border-warm/60 hover:shadow-sm transition"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-base font-medium text-ink">{c.name}</span>
                  <span className="text-xs text-ink/50">
                    {c.storyIds.length} {c.storyIds.length === 1 ? "historia" : "historias"}
                  </span>
                </div>
                {c.relationship && (
                  <p className="mt-1 text-sm text-ink/60">{c.relationship}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        {showCreate ? (
          <div className="rounded-xl border border-ink/15 bg-white p-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-ink/70">Nombre</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink/70">Relación (opcional)</span>
              <input
                type="text"
                value={newRelationship}
                onChange={(e) => setNewRelationship(e.target.value)}
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
                onClick={() => { setShowCreate(false); setNewName(""); setNewRelationship(""); }}
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
            + Añadir persona
          </button>
        )}
      </div>
    </div>
  );
}
