import { create } from "zustand";

// Single-user app, no URL routing needed.
// Two top-level workspaces: "memoir" (life stories) and "kids" (stories for children).

export type Workspace = "memoir" | "kids";

export type Screen =
  | { name: "dashboard" } // memoir dashboard
  | { name: "settings" }
  | { name: "walkthrough" }
  | { name: "topics" }
  | { name: "story-setup"; storyId: string; sessionId: string }
  | { name: "record"; sessionId: string }
  | { name: "story"; storyId: string }
  | { name: "characters" } // memoir characters
  | { name: "character"; characterId: string }
  // kids workspace
  | { name: "kids-dashboard" }
  | { name: "kids-new" }
  | { name: "kids-story"; kidStoryId: string }
  | { name: "kids-characters" }
  | { name: "kids-character"; kidCharacterId: string }
  | { name: "kids-shelf" }
  | { name: "kids-book"; kidStoryId: string };

interface NavStore {
  screen: Screen;
  go: (s: Screen) => void;
}

export const useNav = create<NavStore>((set) => ({
  screen: { name: "dashboard" },
  go: (screen) => set({ screen }),
}));

export function workspaceOf(screen: Screen): Workspace {
  switch (screen.name) {
    case "kids-dashboard":
    case "kids-new":
    case "kids-story":
    case "kids-characters":
    case "kids-character":
    case "kids-shelf":
    case "kids-book":
      return "kids";
    default:
      return "memoir";
  }
}
