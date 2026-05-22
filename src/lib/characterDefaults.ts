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
  // Skip the override entirely if the existing description already contains any
  // of these keywords — the user has explicitly customized this character.
  skipIfMentions: string[];
  // Canonical visual that REPLACES the saved description on the way to the AI.
  // Traits + kind still come from the saved character. The visual identity is
  // anchored here so storyteller-specific recurring characters render the
  // same in every image. The user can override by editing the saved
  // description to include any skipIfMentions keyword.
  canonicalVisual: string;
}

const DEFAULTS: CharacterDefault[] = [
  {
    // Cami — the storyteller's recurring child character. Visual reference:
    // Mei Kusakabe from Studio Ghibli's "My Neighbor Totoro". Anchored on the
    // iconic two-side-pigtails hairstyle which is non-negotiable.
    matchName: (n) => n.trim().toLowerCase() === "cami",
    skipIfMentions: [
      "no-mei", "override", // explicit user opt-outs
    ],
    canonicalVisual:
      "A small Spanish-speaking girl around four years old, modeled visually on Mei Kusakabe from Studio Ghibli's 'My Neighbor Totoro'. " +
      "HAIRSTYLE (mandatory, identical in every single illustration): chocolate-brown hair parted in the middle and gathered into TWO short pigtails, one tied on each side of her head with small soft elastic bands, the pigtail ends fluffing out just below her ears. Never loose, never one ponytail, never braids — always two short side pigtails. " +
      "FACE: round face with full rosy cheeks, large dark brown almond-shaped eyes with thick dark lashes, small button nose, wide expressive mouth that smiles easily, a tiny chin. " +
      "BODY: short for her age, sturdy and energetic, light-tan complexion. " +
      "OUTFIT: a sunny pale-yellow short-sleeved blouse with a small white peter-pan collar, dark navy denim shorts that fall just above her knees, small white socks, and worn canvas slip-on shoes. " +
      "POSTURE & VIBE: curious and brave, often leaning forward with both hands on her knees to peer at something, or standing with feet planted apart like she's ready to march into an adventure. Bold body language despite her small size.",
  },
];

// Returns a copy of the cast with canonical visuals applied where matched.
// Never mutates the saved characters — only the prompt payload.
export function augmentCastForPrompt(cast: KidCharacter[]): KidCharacter[] {
  return cast.map((c) => {
    const match = DEFAULTS.find((d) => d.matchName(c.name));
    if (!match) return c;
    const lower = c.description.toLowerCase();
    if (match.skipIfMentions.some((kw) => lower.includes(kw))) return c;
    // Replace, not append. Saved traits + kind still come through.
    return { ...c, description: match.canonicalVisual };
  });
}
