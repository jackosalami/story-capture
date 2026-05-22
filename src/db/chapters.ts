import { db, newId } from "./db";
import type { Chapter } from "./types";

export interface ChapterDraft {
  bookId: string;
  title: string;
  description?: string;
  order?: number;
}

export async function createChapter(draft: ChapterDraft): Promise<Chapter> {
  const existing = await listChaptersInBook(draft.bookId);
  const order = draft.order ?? existing.length;
  const chapter: Chapter = {
    id: newId(),
    bookId: draft.bookId,
    title: draft.title.trim() || "Sin título",
    description: draft.description ?? "",
    order,
    storyIds: [],
    createdAt: new Date().toISOString(),
  };
  await db.chapters.add(chapter);
  return chapter;
}

export async function updateChapter(id: string, patch: Partial<Chapter>): Promise<void> {
  await db.chapters.update(id, patch);
}

export async function getChapter(id: string): Promise<Chapter | undefined> {
  return db.chapters.get(id);
}

export async function listChaptersInBook(bookId: string): Promise<Chapter[]> {
  const all = await db.chapters.where("bookId").equals(bookId).toArray();
  return all.sort((a, b) => a.order - b.order);
}

export async function deleteChapter(id: string): Promise<void> {
  // Unassign stories from this chapter (don't delete them).
  await db.transaction("rw", db.chapters, db.stories, async () => {
    const stories = await db.stories.where("chapterId").equals(id).toArray();
    for (const s of stories) {
      await db.stories.update(s.id, { chapterId: undefined });
    }
    await db.chapters.delete(id);
  });
  // Compact remaining chapter order indices for the same book.
  const chapter = await db.chapters.get(id);
  if (chapter) {
    const remaining = await listChaptersInBook(chapter.bookId);
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await db.chapters.update(remaining[i].id, { order: i });
      }
    }
  }
}

export async function moveChapter(id: string, direction: "up" | "down"): Promise<void> {
  const chapter = await db.chapters.get(id);
  if (!chapter) return;
  const peers = await listChaptersInBook(chapter.bookId);
  const idx = peers.findIndex((c) => c.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= peers.length) return;
  const other = peers[swapIdx];
  await db.chapters.update(chapter.id, { order: other.order });
  await db.chapters.update(other.id, { order: chapter.order });
}

// Assign a story to a chapter (or remove assignment when chapterId is undefined).
export async function assignStoryToChapter(
  storyId: string,
  chapterId: string | undefined,
): Promise<void> {
  await db.transaction("rw", db.stories, db.chapters, async () => {
    const story = await db.stories.get(storyId);
    if (!story) return;
    const previousChapterId = story.chapterId;

    // Remove from previous chapter's storyIds
    if (previousChapterId) {
      const prev = await db.chapters.get(previousChapterId);
      if (prev) {
        await db.chapters.update(prev.id, {
          storyIds: prev.storyIds.filter((id) => id !== storyId),
        });
      }
    }

    // Add to new chapter's storyIds
    if (chapterId) {
      const next = await db.chapters.get(chapterId);
      if (next && !next.storyIds.includes(storyId)) {
        await db.chapters.update(next.id, {
          storyIds: [...next.storyIds, storyId],
        });
      }
    }

    await db.stories.update(storyId, { chapterId });
  });
}
