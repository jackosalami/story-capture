import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import {
  createKidCharacter,
  listKidCharacters,
} from "../db/kidCharacters";
import { listKidStories } from "../db/kidStories";
import type { KidCharacter, KidCharacterKind } from "../db/types";

const KIND_OPTIONS: KidCharacterKind[] = ["niño", "animal", "criatura", "objeto mágico", "otro"];

export function KidCharactersScreen() {
  const go = useNav((s) => s.go);
  const [characters, setCharacters] = useState<KidCharacter[]>([]);
  const [storyCountById, setStoryCountById] = useState<Record<string, number>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<KidCharacterKind>("niño");
  const [newDescription, setNewDescription] = useState("");

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
    });
    setNewName("");
    setNewKind("niño");
    setNewDescription("");
    setShowCreate(false);
    await refresh();
  }

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
        <h1 className="text-2xl font-medium text-ink">Personajes</h1>
        <span />
      </header>

      {characters.length === 0 ? (
        <p className="text-ink/60 text-center mt-10">
          Aún no hay personajes. Cuando crees un cuento, puedes añadir personajes aquí.
        </p>
      ) : (
        <ul className="space-y-3">
          {characters.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => go({ name: "kids-character", kidCharacterId: c.id })}
                className="block w-full text-left rounded-xl border border-ink/10 bg-white px-5 py-4 hover:border-warm/60 hover:shadow-sm transition"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-base font-medium text-ink">{c.name}</span>
                  <span className="text-xs text-ink/50">
                    {storyCountById[c.id] ?? 0} {storyCountById[c.id] === 1 ? "cuento" : "cuentos"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink/60">{c.kind}</p>
                {c.description && (
                  <p className="mt-1 text-sm text-ink/65 line-clamp-2">{c.description}</p>
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
              <span className="text-xs font-medium text-ink/70">¿Qué es?</span>
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as KidCharacterKind)}
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink/70">Descripción (opcional)</span>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveNew}
                disabled={!newName.trim()}
                className="rounded-lg bg-warm px-4 py-2 text-sm font-medium text-white hover:bg-warm/90 disabled:opacity-50"
              >
                Añadir
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(""); setNewDescription(""); }}
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
            + Añadir personaje
          </button>
        )}
      </div>
    </div>
  );
}
