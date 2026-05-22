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
    // Cami — Mei Kusakabe-inspired (My Neighbor Totoro), white/fair skin,
    // LIGHTER BROWN STRAIGHT hair (NOT dark, NOT curly), two side pigtails.
    matchName: (n) => n.trim().toLowerCase() === "cami",
    skipIfMentions: ["no-mei", "override"],
    canonicalVisual:
      "A small girl around four years old, white/fair-skinned, modeled visually on Mei Kusakabe from Studio Ghibli's 'My Neighbor Totoro'. " +
      "HAIRSTYLE (mandatory, identical in every single illustration): LIGHT WARM BROWN hair (a soft caramel-brown shade — NOT dark brown, NOT black), STRAIGHT and SMOOTH in texture (never curly, never wavy), parted in the middle and gathered into TWO short pigtails — one tied on each side of her head with small soft elastic bands, the pigtail ends sticking out just below her ears. Always exactly two short side pigtails — never loose, never a single ponytail, never braids, never curls. " +
      "FACE: round face with full rosy cheeks, large dark brown almond-shaped eyes with thick dark lashes, small button nose, wide expressive mouth that smiles easily, tiny chin. " +
      "BODY: short for her age, sturdy and energetic, fair/light skin tone (white). " +
      "OUTFIT (same in every scene unless the story explicitly says she changes): a sunny pale-yellow short-sleeved blouse with a small white peter-pan collar, dark navy denim shorts that fall just above her knees, small white folded-down ankle socks, and worn off-white canvas slip-on shoes. " +
      "POSTURE & VIBE: curious and brave, often leaning forward with both hands on her knees to peer at something, or standing with feet planted apart like she's ready to march into an adventure. Bold body language despite her small size.",
  },
  {
    // Noah — recurring child character paired with Cami.
    // White/fair skin, DARK BROWN hair.
    matchName: (n) => n.trim().toLowerCase() === "noah",
    skipIfMentions: ["no-override"],
    canonicalVisual:
      "A small boy around five years old, white/fair-skinned. " +
      "HAIRSTYLE (mandatory, identical in every illustration): DARK BROWN hair (a rich espresso/chocolate-brown shade — clearly darker than Cami's lighter caramel brown), straight in texture, cut in a short, slightly tousled boyish cut that falls just above the eyebrows in front. Never curly, never a different color. " +
      "FACE: round-cheeked, warm brown eyes, small nose, easy smile, a sprinkle of tiny freckles across the bridge of his nose. " +
      "BODY: average height for his age, slim and active, fair/light skin tone (white). " +
      "OUTFIT (same in every scene unless the story explicitly says he changes): a soft sage-green short-sleeved cotton t-shirt with a tiny embroidered star on the left chest, navy-blue cotton shorts that fall just above his knees, white ankle socks, and small brown leather sandals. " +
      "POSTURE & VIBE: gentle and curious, often the one who stops to look closer, points at things with one finger, smiles a lot.",
  },
  {
    // Kuma — a FLUFFY (long-coated) Pembroke Welsh Corgi.
    // Bigger/thicker coat than standard, docked or near-absent tail.
    matchName: (n) => n.trim().toLowerCase() === "kuma",
    skipIfMentions: ["no-override"],
    canonicalVisual:
      "A FLUFFY Pembroke Welsh Corgi — the rare long-coated variant, NOT a standard short-coated corgi. " +
      "BODY: classic corgi proportions — low to the ground, stocky barrel-shaped body, very short stubby legs, deep chest, foxy pointed muzzle, BIG upright triangular ears with visible inner-ear fluff. " +
      "COAT (this is the most important visual): thick, soft, plush LONG fur all over, noticeably fluffier and longer than a standard corgi's coat. Fluffy mane around the neck and chest, feathered fringe along the back legs, fluffy 'pants' on the rear, soft feathering on the ears. Coloration: classic Pembroke red-and-white pattern — warm copper-red fur on the back, shoulders, and head, with a clean white chest, white blaze on the muzzle, white socks on the legs, and white belly. " +
      "TAIL: very short docked tail / barely a nub — no long flowing tail. Sometimes there's no visible tail at all because it was clipped short as a puppy. NEVER draw Kuma with a long tail. " +
      "FACE: fox-like, alert, with a perpetual gentle smile, big round dark brown eyes, small black nose, pink tongue often slightly out. " +
      "VIBE: cheerful, bouncy, low to the ground, always trotting on those tiny legs.",
  },
  {
    // Nugget — small companion animal with a distinctive long tail tipped in white.
    matchName: (n) => n.trim().toLowerCase() === "nugget",
    skipIfMentions: ["no-override"],
    canonicalVisual:
      "A small four-legged companion animal (a slim medium-small dog of indeterminate friendly mixed breed — picture a scruffy terrier-mix size). " +
      "BODY: medium-small, slim, agile build, taller and leggier than a corgi but smaller than a labrador. " +
      "COAT: smooth-to-medium-length warm golden-tan fur (think the color of a chicken nugget — warm caramel/butter gold) across the body, with a white belly and white chest. " +
      "TAIL (mandatory, distinguishing feature): a LONG flowing tail held high or trailing behind her, the same warm golden-tan as the body EXCEPT the last third which is a bright clean WHITE TIP — as if the tail was dipped in white paint. This long tail with the white tip is her single most recognizable feature and MUST be visible and clearly drawn in every illustration. NEVER draw Nugget without her long white-tipped tail. " +
      "FACE: bright dark eyes, small black nose, soft pointy ears, friendly expression. " +
      "VIBE: graceful, quick, sometimes prancing alongside Kuma the corgi.",
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
