import { db, newId } from "./db";
import type { Character } from "./types";

export interface CharacterDraft {
  name: string;
  relationship?: string;
  description?: string;
  aliases?: string[];
  traits?: string[];
  notes?: string;
}

export async function createCharacter(draft: CharacterDraft): Promise<Character> {
  const character: Character = {
    id: newId(),
    name: draft.name.trim(),
    aliases: draft.aliases ?? [],
    relationship: draft.relationship ?? "",
    description: draft.description ?? "",
    traits: draft.traits ?? [],
    storyIds: [],
    notes: draft.notes ?? "",
  };
  await db.characters.add(character);
  return character;
}

export async function updateCharacter(id: string, patch: Partial<Character>): Promise<void> {
  await db.characters.update(id, patch);
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  return db.characters.get(id);
}

export async function getCharactersByIds(ids: string[]): Promise<Character[]> {
  if (ids.length === 0) return [];
  const all = await db.characters.bulkGet(ids);
  return all.filter((c): c is Character => !!c);
}

export async function listCharacters(): Promise<Character[]> {
  const all = await db.characters.toArray();
  return all.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function deleteCharacter(id: string): Promise<void> {
  await db.transaction("rw", db.stories, db.characters, async () => {
    const stories = await db.stories.toArray();
    for (const story of stories) {
      if (story.characterIds.includes(id)) {
        await db.stories.update(story.id, {
          characterIds: story.characterIds.filter((cid) => cid !== id),
        });
      }
    }
    await db.characters.delete(id);
  });
}
