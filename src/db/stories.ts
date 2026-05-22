import { db, newId } from "./db";
import type { Story } from "./types";

export interface StoryDraft {
  title?: string;
  summary?: string;
  storyDate?: string;
  location?: string;
  environment?: string;
  mood?: string[];
  characterIds?: string[];
  sessionIds?: string[];
}

export async function createStory(draft: StoryDraft = {}): Promise<Story> {
  const story: Story = {
    id: newId(),
    title: draft.title ?? "",
    summary: draft.summary ?? "",
    storyDate: draft.storyDate ?? "",
    location: draft.location ?? "",
    environment: draft.environment ?? "",
    mood: draft.mood ?? [],
    characterIds: draft.characterIds ?? [],
    sessionIds: draft.sessionIds ?? [],
    createdAt: new Date().toISOString(),
  };
  await db.stories.add(story);
  return story;
}

export async function updateStory(id: string, patch: Partial<Story>): Promise<void> {
  await db.stories.update(id, patch);
}

export async function getStory(id: string): Promise<Story | undefined> {
  return db.stories.get(id);
}

export async function listStories(): Promise<Story[]> {
  const all = await db.stories.toArray();
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteStory(id: string): Promise<void> {
  // Caller is responsible for orphan handling on sessions/characters.
  await db.stories.delete(id);
}

export async function linkSessionToStory(storyId: string, sessionId: string): Promise<void> {
  const story = await db.stories.get(storyId);
  if (!story) return;
  if (!story.sessionIds.includes(sessionId)) {
    await db.stories.update(storyId, {
      sessionIds: [...story.sessionIds, sessionId],
    });
  }
  await db.sessions.update(sessionId, { storyId });
}

export async function linkCharacterToStory(storyId: string, characterId: string): Promise<void> {
  const [story, character] = await Promise.all([
    db.stories.get(storyId),
    db.characters.get(characterId),
  ]);
  if (!story || !character) return;
  if (!story.characterIds.includes(characterId)) {
    await db.stories.update(storyId, {
      characterIds: [...story.characterIds, characterId],
    });
  }
  if (!character.storyIds.includes(storyId)) {
    await db.characters.update(characterId, {
      storyIds: [...character.storyIds, storyId],
    });
  }
}

export async function unlinkCharacterFromStory(
  storyId: string,
  characterId: string,
): Promise<void> {
  const [story, character] = await Promise.all([
    db.stories.get(storyId),
    db.characters.get(characterId),
  ]);
  if (story) {
    await db.stories.update(storyId, {
      characterIds: story.characterIds.filter((id) => id !== characterId),
    });
  }
  if (character) {
    await db.characters.update(characterId, {
      storyIds: character.storyIds.filter((id) => id !== storyId),
    });
  }
}
