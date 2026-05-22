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
  bookId?: ID;        // which MemoirBook this session belongs to (Wave C)
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
  bookId?: ID;     // which MemoirBook this story belongs to (Wave C)
  chapterId?: ID;  // optional chapter assignment within the book (Phase 3)
}

// --- Memoir-side: AI character detection queue (Wave C, Phase 2) ---
//
// After each session ends, the AI scans the transcript for mentioned people
// and tries to match them against existing Characters. The structured
// suggestions land in this queue for the admin to confirm. Confirming a
// match enriches the existing character with new traits + descriptive facts;
// confirming a new person creates a Character with the AI's draft profile.

export type MentionStatus = "pending" | "linked" | "created" | "dismissed";
export type MentionConfidence = "high" | "medium" | "low" | "unknown";

export interface CharacterMention {
  id: ID;
  storyId: ID;
  sessionId: ID;
  bookId?: ID;
  // What the AI extracted from the transcript:
  mentionedAs: string;          // the exact name/reference used in the story
  isNew: boolean;               // AI's guess: is this a new person?
  suggestedCharacterId?: ID;    // if AI matched it to an existing character
  confidence: MentionConfidence;
  // Profile facts the AI extracted about this person from THIS story:
  newTraits: string[];          // personality words (graciosa, gruñón…)
  newDescriptionFacts: string[]; // descriptive facts (pelo blanco, mandil azul…)
  newRelationship?: string;     // e.g. "tía por parte de mamá"
  status: MentionStatus;
  createdAt: string;
}

// --- Memoir-side: Books (Wave C) ---
//
// A MemoirBook is a top-level container for a coherent group of stories
// (e.g. "Mi Infancia", "Cuando conocí a Pepe"). Stories and Sessions live
// inside exactly one book. Exactly one book is marked active at a time;
// new recordings auto-attach to the active book.

export interface MemoirBook {
  id: ID;
  title: string;
  subtitle: string;       // e.g. "1955–1970" or "Los años en Salamanca"
  description: string;    // longer prose intro shown inside the book
  era: string;            // tag for chronology — free text like "Childhood", "Marriage"
  dedication: string;
  coverImage?: Blob;      // optional cover photo
  coverMimeType?: string;
  isActive: boolean;      // exactly one MemoirBook is active at a time
  status: "in-progress" | "ready" | "printed";
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

// Organizational chapter inside a MemoirBook. Stories can be grouped into
// chapters for the printed book's table of contents. AI-generated chapter
// PROSE (the original PRD §6.7 feature) will come later as content stored
// here under `prose` once implemented.
export interface Chapter {
  id: ID;
  bookId: ID;
  title: string;
  description: string;
  order: number;          // 0-based position within the book
  storyIds: ID[];         // stories assigned to this chapter (also denormalized on Story.chapterId)
  createdAt: string;
  prose?: string;         // optional AI-generated prose for the chapter (future)
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
