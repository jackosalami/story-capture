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
  // Names mentioned in transcripts but not yet promoted to Character entities.
  // Populated by AI metadata extraction; admin can convert these to characters later.
  mentionedPeople?: string[];
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

// --- Kids stories workflow (separate space from memoir entities above) ---

export type KidCharacterKind = "niño" | "animal" | "criatura" | "objeto mágico" | "otro";

export interface KidCharacter {
  id: ID;
  name: string;
  kind: KidCharacterKind;
  description: string; // physical + personality, free text
  traits: string[]; // valiente, curioso, tímido, etc.
  createdAt: string;
  image?: Blob;           // optional uploaded reference photo
  imageMimeType?: string; // e.g. "image/jpeg"
}

export type AgeBand = "3-5" | "6-8" | "9-12";
export type StoryLanguage = "es" | "en";

export interface KidStory {
  id: ID;
  title: string;
  protagonistIds: ID[]; // KidCharacter ids
  setting: string;
  theme: string;
  ageBand: AgeBand;
  language: StoryLanguage; // primary language the prose was written in
  forChild: string;
  targetWords: number;
  content: string; // primary prose in `language`
  editHistory: { at: string; content: string }[];
  createdAt: string;
  imagePrompts?: KidStoryImagePrompts;
  // Optional translations of title + content into other languages.
  // Images, scene metadata, and English image prompts are reused as-is.
  translations?: Partial<Record<StoryLanguage, { title: string; content: string; translatedAt: string }>>;
}

export interface KidStoryImagePromptScene {
  momentTitle: string;     // short label (story language)
  prompt: string;          // English — assembled prompt for Gemini Nano Banana
  charactersPresent?: string[]; // names of cast characters in this scene
  image?: Blob;
  imageMimeType?: string;
}

export interface KidStoryImagePromptCharacter {
  name: string;
  description: string; // detailed visual description (repeated in every scene the character appears)
}

export interface KidStoryImagePrompts {
  style: string;                              // shared visual style description applied to all scenes
  characters: KidStoryImagePromptCharacter[]; // canonical visual definitions for continuity
  scenes: KidStoryImagePromptScene[];          // typically 5
  generatedAt: string;
}
