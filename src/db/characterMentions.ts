import { db, newId } from "./db";
import type {
  CharacterMention,
  MentionStatus,
  MentionConfidence,
} from "./types";

export interface CharacterMentionDraft {
  storyId: string;
  sessionId: string;
  bookId?: string;
  mentionedAs: string;
  isNew: boolean;
  suggestedCharacterId?: string;
  confidence: MentionConfidence;
  newTraits?: string[];
  newDescriptionFacts?: string[];
  newRelationship?: string;
}

export async function createMention(draft: CharacterMentionDraft): Promise<CharacterMention> {
  const m: CharacterMention = {
    id: newId(),
    storyId: draft.storyId,
    sessionId: draft.sessionId,
    bookId: draft.bookId,
    mentionedAs: draft.mentionedAs,
    isNew: draft.isNew,
    suggestedCharacterId: draft.suggestedCharacterId,
    confidence: draft.confidence,
    newTraits: draft.newTraits ?? [],
    newDescriptionFacts: draft.newDescriptionFacts ?? [],
    newRelationship: draft.newRelationship,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await db.characterMentions.add(m);
  return m;
}

export async function listPendingMentionsForStory(storyId: string): Promise<CharacterMention[]> {
  const all = await db.characterMentions.where("storyId").equals(storyId).toArray();
  return all
    .filter((m) => m.status === "pending")
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export async function listPendingMentionsForBook(bookId: string): Promise<CharacterMention[]> {
  const all = await db.characterMentions.where("bookId").equals(bookId).toArray();
  return all.filter((m) => m.status === "pending");
}

export async function countPendingMentionsForBook(bookId: string): Promise<number> {
  const all = await db.characterMentions.where("bookId").equals(bookId).toArray();
  return all.filter((m) => m.status === "pending").length;
}

export async function setMentionStatus(id: string, status: MentionStatus): Promise<void> {
  await db.characterMentions.update(id, { status });
}

export async function deleteMention(id: string): Promise<void> {
  await db.characterMentions.delete(id);
}
