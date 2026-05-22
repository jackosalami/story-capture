import { db, newId } from "./db";
import type { MemoirBook } from "./types";

export interface MemoirBookDraft {
  title: string;
  subtitle?: string;
  description?: string;
  era?: string;
  dedication?: string;
  coverImage?: Blob;
  coverMimeType?: string;
  isActive?: boolean;
}

export async function createBook(draft: MemoirBookDraft): Promise<MemoirBook> {
  const book: MemoirBook = {
    id: newId(),
    title: draft.title.trim() || "Sin título",
    subtitle: draft.subtitle ?? "",
    description: draft.description ?? "",
    era: draft.era ?? "",
    dedication: draft.dedication ?? "",
    coverImage: draft.coverImage,
    coverMimeType: draft.coverMimeType,
    isActive: false, // setActiveBook handles this
    status: "in-progress",
    createdAt: new Date().toISOString(),
  };
  await db.memoirBooks.add(book);
  if (draft.isActive) await setActiveBook(book.id);
  // If no active book exists yet, this becomes active automatically.
  const active = await getActiveBook();
  if (!active) await setActiveBook(book.id);
  return book;
}

export async function updateBook(id: string, patch: Partial<MemoirBook>): Promise<void> {
  await db.memoirBooks.update(id, patch);
}

export async function getBook(id: string): Promise<MemoirBook | undefined> {
  return db.memoirBooks.get(id);
}

export async function listBooks(): Promise<MemoirBook[]> {
  const all = await db.memoirBooks.toArray();
  // Active book first, then newest first.
  return all.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (b.isActive && !a.isActive) return 1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export async function getActiveBook(): Promise<MemoirBook | undefined> {
  const all = await db.memoirBooks.toArray();
  return all.find((b) => b.isActive);
}

// Sets the given book as active; clears isActive on any other book.
export async function setActiveBook(id: string): Promise<void> {
  await db.transaction("rw", db.memoirBooks, async () => {
    const all = await db.memoirBooks.toArray();
    for (const b of all) {
      const shouldBeActive = b.id === id;
      if (b.isActive !== shouldBeActive) {
        await db.memoirBooks.update(b.id, { isActive: shouldBeActive });
      }
    }
  });
}

export async function deleteBook(id: string): Promise<void> {
  // Unlink stories and sessions before deleting (don't cascade — preserve content).
  await db.transaction("rw", db.memoirBooks, db.stories, db.sessions, async () => {
    const stories = await db.stories.where("bookId").equals(id).toArray();
    for (const s of stories) {
      await db.stories.update(s.id, { bookId: undefined });
    }
    const sessions = await db.sessions.where("bookId").equals(id).toArray();
    for (const s of sessions) {
      await db.sessions.update(s.id, { bookId: undefined });
    }
    await db.memoirBooks.delete(id);
  });
  // If we removed the active book, promote the most recent remaining one.
  const active = await getActiveBook();
  if (!active) {
    const all = await listBooks();
    if (all.length > 0) await setActiveBook(all[0].id);
  }
}

// One-time migration: if no books exist but there are sessions/stories,
// create a default "Mis Recuerdos" book and attach everything to it.
// Idempotent — safe to call on every app start.
export async function migrateLegacyContent(): Promise<void> {
  const bookCount = await db.memoirBooks.count();
  const sessionCount = await db.sessions.count();
  const storyCount = await db.stories.count();

  if (bookCount === 0 && sessionCount === 0 && storyCount === 0) {
    // Brand new install — no default needed yet. Books get created when
    // the user explicitly starts one.
    return;
  }

  // If there's any content but no books, create the default book.
  if (bookCount === 0) {
    const fallback = await createBook({
      title: "Mis Recuerdos",
      subtitle: "El comienzo de mis historias",
      description:
        "Este es el libro donde recogimos las primeras historias. Podemos cambiarle el nombre, añadirle una portada, o crear libros nuevos para diferentes épocas.",
      era: "Inicio",
      isActive: true,
    });

    // Attach all orphan sessions and stories to the fallback book.
    const sessions = await db.sessions.toArray();
    for (const s of sessions) {
      if (!s.bookId) await db.sessions.update(s.id, { bookId: fallback.id });
    }
    const stories = await db.stories.toArray();
    for (const s of stories) {
      if (!s.bookId) await db.stories.update(s.id, { bookId: fallback.id });
    }
    return;
  }

  // Ensure exactly one active book.
  const active = await getActiveBook();
  if (!active) {
    const all = await listBooks();
    if (all.length > 0) await setActiveBook(all[0].id);
  }

  // Backfill: any orphan session/story without a bookId gets attached to
  // the active book (in case content was created before this migration ran
  // but books existed via some other path).
  const activeBook = await getActiveBook();
  if (activeBook) {
    const orphanSessions = await db.sessions.filter((s) => !s.bookId).toArray();
    for (const s of orphanSessions) {
      await db.sessions.update(s.id, { bookId: activeBook.id });
    }
    const orphanStories = await db.stories.filter((s) => !s.bookId).toArray();
    for (const s of orphanStories) {
      await db.stories.update(s.id, { bookId: activeBook.id });
    }
  }
}

export async function countStoriesInBook(bookId: string): Promise<number> {
  return db.stories.where("bookId").equals(bookId).count();
}

export async function countSessionsInBook(bookId: string): Promise<number> {
  return db.sessions.where("bookId").equals(bookId).count();
}
