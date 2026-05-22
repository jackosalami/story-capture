import { create } from "zustand";

// Single-user app, no URL routing needed.
// We just track which screen is active and any context (e.g. current story id).

export type Screen =
  | { name: "dashboard" }
  | { name: "settings" }
  | { name: "walkthrough" }
  | { name: "topics" }
  | { name: "story-setup"; storyId: string; sessionId: string }
  | { name: "record"; sessionId: string }
  | { name: "story"; storyId: string }
  | { name: "characters" }
  | { name: "character"; characterId: string };

interface NavStore {
  screen: Screen;
  go: (s: Screen) => void;
}

export const useNav = create<NavStore>((set) => ({
  screen: { name: "dashboard" },
  go: (screen) => set({ screen }),
}));
