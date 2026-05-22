import { db, newId } from "./db";
import type { KidStory, AgeBand, StoryLanguage } from "./types";

export interface KidStoryDraft {
  title?: string;
  protagonistIds: string[];
  setting: string;
  theme: string;
  ageBand: AgeBand;
  language: StoryLanguage;
  forChild?: string;
  targetWords?: number;
  content?: string;
}

export async function createKidStory(draft: KidStoryDraft): Promise<KidStory> {
  const story: KidStory = {
    id: newId(),
    title: draft.title ?? "",
    protagonistIds: draft.protagonistIds,
    setting: draft.setting,
    theme: draft.theme,
    ageBand: draft.ageBand,
    language: draft.language,
    forChild: draft.forChild ?? "",
    targetWords: draft.targetWords ?? 1000,
    content: draft.content ?? "",
    editHistory: [],
    createdAt: new Date().toISOString(),
  };
  await db.kidStories.add(story);
  return story;
}

export async function updateKidStory(id: string, patch: Partial<KidStory>): Promise<void> {
  await db.kidStories.update(id, patch);
}

export async function appendEdit(id: string, content: string): Promise<void> {
  const s = await db.kidStories.get(id);
  if (!s) return;
  await db.kidStories.update(id, {
    content,
    editHistory: [...s.editHistory, { at: new Date().toISOString(), content: s.content }],
  });
}

export async function getKidStory(id: string): Promise<KidStory | undefined> {
  return db.kidStories.get(id);
}

export async function listKidStories(): Promise<KidStory[]> {
  const all = await db.kidStories.toArray();
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteKidStory(id: string): Promise<void> {
  await db.kidStories.delete(id);
}
