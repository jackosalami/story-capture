import { db, newId } from "./db";
import type { KidCharacter, KidCharacterKind } from "./types";

export interface KidCharacterDraft {
  name: string;
  kind?: KidCharacterKind;
  description?: string;
  traits?: string[];
}

export async function createKidCharacter(draft: KidCharacterDraft): Promise<KidCharacter> {
  const character: KidCharacter = {
    id: newId(),
    name: draft.name.trim(),
    kind: draft.kind ?? "niño",
    description: draft.description ?? "",
    traits: draft.traits ?? [],
    createdAt: new Date().toISOString(),
  };
  await db.kidCharacters.add(character);
  return character;
}

export async function updateKidCharacter(id: string, patch: Partial<KidCharacter>): Promise<void> {
  await db.kidCharacters.update(id, patch);
}

export async function getKidCharacter(id: string): Promise<KidCharacter | undefined> {
  return db.kidCharacters.get(id);
}

export async function getKidCharactersByIds(ids: string[]): Promise<KidCharacter[]> {
  if (ids.length === 0) return [];
  const all = await db.kidCharacters.bulkGet(ids);
  return all.filter((c): c is KidCharacter => !!c);
}

export async function listKidCharacters(): Promise<KidCharacter[]> {
  const all = await db.kidCharacters.toArray();
  return all.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function deleteKidCharacter(id: string): Promise<void> {
  await db.kidCharacters.delete(id);
}
