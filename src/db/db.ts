import Dexie, { type EntityTable } from "dexie";
import type {
  Session,
  Segment,
  Story,
  Character,
  Chapter,
} from "./types";

class StoryCaptureDB extends Dexie {
  sessions!: EntityTable<Session, "id">;
  segments!: EntityTable<Segment, "id">;
  stories!: EntityTable<Story, "id">;
  characters!: EntityTable<Character, "id">;
  chapters!: EntityTable<Chapter, "id">;

  constructor() {
    super("story-capture");
    this.version(1).stores({
      sessions: "id, date, status, storyId",
      segments: "id, sessionId, order, timestamp",
      stories: "id, createdAt, storyDate",
      characters: "id, name",
      chapters: "id, createdAt",
    });
  }
}

export const db = new StoryCaptureDB();

export function newId(): string {
  // crypto.randomUUID is available in all modern browsers; falls back if not.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
