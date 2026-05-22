// Per-name defaults for character visuals.
//
// These augment (but never replace) what the user has typed for a kid character
// before the cast is sent to the AI. If the user has already specified the
// relevant detail (e.g. mentioned "Mei" or "Totoro" or pigtails for Cami),
// the default is skipped so the user's text wins.
//
// This file is intentionally small and customizable — add or remove entries
// per the storyteller's universe of recurring characters.

import type { KidCharacter } from "../db/types";

interface CharacterDefault {
  // Matches the character by name, case-insensitive, trimmed.
  matchName: (name: string) => boolean;
  // Skip augmenting if the existing description already contains any of these
  // case-insensitive keywords — the user already specified the look.
  skipIfMentions: string[];
  // Visual snippet to append onto the description hint sent to the AI.
  visualHint: string;
}

const DEFAULTS: CharacterDefault[] = [
  {
    matchName: (n) => n.trim().toLowerCase() === "cami",
    skipIfMentions: ["mei", "totoro", "coletas", "coleta", "pigtail", "trenzas"],
    visualHint:
      // Visual reference: Mei Kusakabe from Studio Ghibli's "My Neighbor Totoro".
      // Anchored on the iconic two-side-pigtails look the storyteller requested.
      "Looks like a Spanish-speaking version of Mei Kusakabe from Studio Ghibli's 'My Neighbor Totoro': a small girl around four or five years old, round face with rosy cheeks, large expressive curious dark eyes, short brown hair always tied in two small pigtails on each side of her head (this hairstyle is iconic and must be drawn every single time), light tan complexion, often wearing a sunny pale-yellow short-sleeved blouse with a small white peter-pan collar, navy or denim shorts, and small canvas shoes. Energetic, curious posture, often peering at things with wide-eyed wonder. This visual MUST be preserved verbatim in every illustration.",
  },
];

// Returns an augmented copy of the cast — never mutates the originals.
// Pure prompt-side augmentation: nothing is saved back to IndexedDB.
export function augmentCastForPrompt(cast: KidCharacter[]): KidCharacter[] {
  return cast.map((c) => {
    const match = DEFAULTS.find((d) => d.matchName(c.name));
    if (!match) return c;
    const lower = c.description.toLowerCase();
    if (match.skipIfMentions.some((kw) => lower.includes(kw))) return c;
    const merged = c.description.trim()
      ? `${c.description.trim()}\n\n[Auto-reference hint: ${match.visualHint}]`
      : match.visualHint;
    return { ...c, description: merged };
  });
}
