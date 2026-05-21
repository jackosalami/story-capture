import { create } from "zustand";
import { persist } from "zustand/middleware";

// Persistent app settings stored in localStorage.
// The OpenAI API key lives here because the app is fully client-side per PRD §7.3.

export interface Settings {
  openaiApiKey: string;
  transcribeModel: string;
  chatModel: string;
  chapterModel: string;
}

interface SettingsStore extends Settings {
  setApiKey: (key: string) => void;
  setTranscribeModel: (m: string) => void;
  setChatModel: (m: string) => void;
  setChapterModel: (m: string) => void;
  hasApiKey: () => boolean;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      openaiApiKey: "",
      transcribeModel: "gpt-4o-mini-transcribe",
      chatModel: "gpt-4o-mini",
      chapterModel: "gpt-4o",
      setApiKey: (key) => set({ openaiApiKey: key.trim() }),
      setTranscribeModel: (m) => set({ transcribeModel: m }),
      setChatModel: (m) => set({ chatModel: m }),
      setChapterModel: (m) => set({ chapterModel: m }),
      hasApiKey: () => get().openaiApiKey.length > 0,
    }),
    { name: "story-capture-settings" },
  ),
);
