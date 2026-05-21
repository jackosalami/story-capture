// Data model types for Story Capture
// Mirrors PRD §7.2. Wave A actively uses Session/Segment; the rest are defined
// up front so Wave B (stories, characters, chapters) is purely additive.

export type ID = string;

export type SessionStatus = "recording" | "completed";

export interface Session {
  id: ID;
  date: string; // ISO timestamp — when the session was recorded
  status: SessionStatus;
  summary: string | null; // AI-generated on end
  storyId: ID | null; // linked after story extraction (Wave B)
  topicPrompt: string | null; // optional: which topic-library prompt seeded this session
}

export interface Segment {
  id: ID;
  sessionId: ID;
  order: number;
  audioBlob: Blob; // raw recording — never discarded (PRD §6.1)
  mimeType: string; // e.g. "audio/webm;codecs=opus"
  durationMs: number;
  transcript: string;
  timestamp: string; // ISO
  followUpQuestion: string | null; // AI question generated after this segment
}

// --- Below: defined now, used in Wave B ---

export interface Story {
  id: ID;
  title: string;
  summary: string;
  storyDate: string; // free text: "primavera 1972", "cuando tenía 8 años"
  location: string;
  environment: string;
  mood: string[];
  characterIds: ID[];
  sessionIds: ID[];
  createdAt: string;
}

export interface Character {
  id: ID;
  name: string; // canonical
  aliases: string[];
  relationship: string;
  description: string; // accumulated across stories
  traits: string[];
  storyIds: ID[];
  notes: string;
}

export interface Chapter {
  id: ID;
  title: string;
  storyIds: ID[];
  style: {
    writingStyle: "verbatim" | "cleaned" | "literary";
    creativeLicense: number; // 0..1
    person: "first" | "third";
    tone: "neutral" | "warm" | "dramatic" | "humorous";
  };
  content: string; // Markdown
  editHistory: { at: string; content: string }[];
  createdAt: string;
}
