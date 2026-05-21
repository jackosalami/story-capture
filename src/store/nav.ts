import { create } from "zustand";

// Single-user app, no URL routing needed for Wave A.
// We just track which screen is active and any context (e.g. current session id).

export type Screen =
  | { name: "dashboard" }
  | { name: "settings" }
  | { name: "record"; sessionId: string }
  | { name: "session"; sessionId: string };

interface NavStore {
  screen: Screen;
  go: (s: Screen) => void;
}

export const useNav = create<NavStore>((set) => ({
  screen: { name: "dashboard" },
  go: (screen) => set({ screen }),
}));
