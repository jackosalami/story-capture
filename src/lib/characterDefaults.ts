// Per-name defaults for character visuals + behaviors.
//
// canonicalVisual: a SHORT bullet-style description in English. We keep it
//   short on purpose — long descriptions get paraphrased by the LLM and
//   Banana stops anchoring on them. Short bullet fingerprints repeat verbatim
//   across all 5 image prompts.
// negatives: explicit "do not draw" anchors, one per common drift Banana
//   makes for this character. These are appended to every scene prompt the
//   character appears in.
// storyBehavior: optional personality / running-gag instruction that gets
//   injected into the kid-story prompt when this character is in the cast
//   (e.g. Cutie must fart when nervous).

import type { KidCharacter } from "../db/types";

export interface CharacterDefault {
  matchName: (name: string) => boolean;
  skipIfMentions: string[];
  canonicalVisual: string;
  negatives: string[];
  storyBehavior?: string; // injected into the story prompt
}

const DEFAULTS: CharacterDefault[] = [
  {
    matchName: (n) => n.trim().toLowerCase() === "cami",
    skipIfMentions: ["no-override"],
    canonicalVisual:
      "A 2-YEAR-OLD TODDLER GIRL — very young, clearly a toddler, NEVER an older child. " +
      "WHITE / pale-ivory skin (never tan, never brown, never darker). " +
      "TODDLER PROPORTIONS (mandatory): very small body, big round head relative to a tiny chubby toddler body, " +
      "short little arms and legs, slightly bowed toddler stance, takes small wobbly steps. " +
      "She is ALWAYS the smallest and youngest in any scene with other characters. " +
      "When standing next to her 6-year-old brother Noah, the top of Cami's head reaches roughly Noah's chest level — NEVER higher. " +
      "Hair: LIGHT CARAMEL-BROWN, STRAIGHT and smooth (never curly, never wavy, never dark), " +
      "tied in TWO short little side pigtails — Mei Kusakabe (My Neighbor Totoro) hairstyle, identical in every image. " +
      "FACE (very young toddler): perfectly round chubby toddler face, fat baby cheeks, tiny button nose, big dark-brown almond eyes, " +
      "tiny rosebud mouth. Pure 2-year-old toddler features — NEVER an older-child face. " +
      "OUTFIT (identical every scene — Mei's iconic look): a sunny pale-yellow short-sleeved summer DRESS with a small embroidered flower or fruit detail on the chest, " +
      "bare chubby toddler legs, small white folded ankle socks, soft off-white canvas toddler shoes. " +
      "POSTURE & VIBE: curious wobbly toddler, often leaning slightly forward with both little hands together or pointing, big curious eyes, " +
      "pure 2-year-old toddler energy. Visual reference: Mei Kusakabe in Studio Ghibli's 'My Neighbor Totoro'.",
    negatives: [
      "Cami's age is 2 — she is a TODDLER. NEVER draw her as an older child, NEVER as a 4/5/6-year-old, NEVER with school-age proportions.",
      "Cami's face is ALWAYS a chubby round toddler face with fat baby cheeks. NEVER an older-child face, NEVER mature features.",
      "Cami is ALWAYS clearly shorter than 6-year-old Noah — the top of her head reaches roughly his chest, never higher. NEVER the same height.",
      "Cami's hair is NEVER curly, NEVER wavy, NEVER dark brown or black — always LIGHT caramel-brown and STRAIGHT in TWO short side pigtails.",
      "Cami's hair is NEVER one ponytail, NEVER loose, NEVER braids — always TWO short side pigtails.",
      "Cami's skin is NEVER tan, NEVER brown, NEVER olive — always pale ivory white.",
      "Cami's outfit is ALWAYS a pale-yellow short-sleeved summer DRESS. NEVER a blouse+shorts combo. NEVER pink, NEVER another color.",
      "Cami never wears pants or shorts — always the dress with bare chubby toddler legs.",
    ],
  },
  {
    matchName: (n) => n.trim().toLowerCase() === "noah",
    skipIfMentions: ["no-override"],
    canonicalVisual:
      "A 6-YEAR-OLD BOY — a school-age kid, clearly older and visibly TALLER than his 2-year-old toddler sister Cami. " +
      "WHITE / pale-ivory skin (never tan, never brown). " +
      "PROPORTIONS (mandatory): a typical 6-year-old build — slim, active, school-age body with normal kid proportions (NOT toddler-chubby, NOT a tiny baby body). " +
      "When standing next to 2-year-old Cami, Noah is CLEARLY TALLER — by at least a head and a half. Cami's head reaches roughly Noah's chest level. " +
      "Noah is the visibly older, taller, slimmer one of the two. " +
      "Hair: DARK ESPRESSO-BROWN (rich coffee-brown, clearly darker than Cami's caramel hair), STRAIGHT, short and slightly tousled, falling just above the eyebrows. " +
      "FACE: school-age kid face (not chubby toddler face) — slimmer than Cami's, warm brown eyes, small nose, easy smile, a sprinkle of tiny freckles across the nose bridge. " +
      "OUTFIT (identical every scene): a soft sage-green short-sleeved cotton t-shirt with a tiny embroidered yellow star on the left chest, " +
      "navy-blue cotton shorts above the knees, white ankle socks, small brown leather two-strap sandals. " +
      "POSTURE & VIBE: gentle and curious older-brother energy — stops to look closer, points things out to Cami, smiles a lot, often acts as her protector.",
    negatives: [
      "Noah's age is 6 — a school-age kid, NEVER a toddler. NEVER chubby toddler proportions, NEVER a baby face.",
      "Noah is ALWAYS clearly taller than Cami when they appear together — by at least a head and a half. NEVER the same height as Cami, NEVER shorter.",
      "Noah's hair is NEVER light, NEVER blonde, NEVER red — always dark espresso-brown and straight, clearly darker than Cami's hair.",
      "Noah's skin is NEVER tan, NEVER brown — always pale ivory white.",
      "Noah's outfit is NEVER different — always the sage-green star t-shirt, navy shorts, brown leather sandals. Same outfit every single scene.",
      "Noah NEVER wears closed shoes — always the brown leather two-strap sandals.",
    ],
  },
  {
    matchName: (n) => n.trim().toLowerCase() === "kuma",
    skipIfMentions: ["no-override"],
    canonicalVisual:
      "A FLUFFY Pembroke Welsh Corgi — the rare long-coated variant, NOT a standard short-coated corgi. " +
      "Stocky low body, very short legs, fox-like pointed face, big upright triangular ears with inner-ear fluff. " +
      "Coat: THICK PLUSH LONG fur all over — fluffy chest mane, feathered legs, fluffy 'pants', long ear feathering. " +
      "Coloration: warm copper-red back/head/shoulders, clean white chest and belly, white blaze on the muzzle, white socks. " +
      "Tail: SHORT DOCKED stubby tail / barely a nub. NEVER a long flowing tail. " +
      "Bright dark eyes, small black nose, pink tongue often slightly out, gentle smile.",
    negatives: [
      "Kuma NEVER has a long tail or a fluffy plume tail — only a short docked nub.",
      "Kuma NEVER has short fur — always the long-coated FLUFFY variant with visible feathering.",
      "Kuma is NEVER a different breed — always a Pembroke Welsh Corgi with red-and-white coloration.",
    ],
  },
  {
    matchName: (n) => n.trim().toLowerCase() === "nugget",
    skipIfMentions: ["no-override"],
    canonicalVisual:
      "A small slim mixed-breed dog (scruffy terrier-mix size). " +
      "Smooth golden-tan body fur (warm caramel/butter-gold) with a clean white belly and white chest. " +
      "TAIL: a LONG flowing tail held high or trailing, the same golden-tan as the body EXCEPT the LAST THIRD of the tail (the tip) is bright CLEAN WHITE — as if dipped in white paint. " +
      "The long white-tipped tail must always be clearly visible — it is her single most recognizable feature. " +
      "Bright dark eyes, small black nose, soft pointed ears, friendly expression.",
    negatives: [
      "Nugget's tail is NEVER short, NEVER all-tan, NEVER all-white — always long with a clean WHITE TIP on the last third.",
      "Nugget's tail must be VISIBLE in every image — never hidden behind her body.",
    ],
  },
  {
    matchName: (n) => n.trim().toLowerCase() === "cutie",
    skipIfMentions: ["no-override"],
    canonicalVisual:
      "A small bright LIME-GREEN creature, about the size of a soft toy, plush stuffed-animal proportions. " +
      "ENTIRELY GREEN — every visible part of the body (head, ears, paws, belly, back, AND TAIL) is the SAME lime-green shade. " +
      "No white, no other colors anywhere on the body. " +
      "Round chubby body, big friendly black button eyes, tiny smile, stubby chubby tail (also lime-green). " +
      "Looks cuddly, soft, slightly mischievous and a bit guilty.",
    negatives: [
      "Cutie's tail is NEVER white, NEVER a different color — it is the SAME lime-green as the rest of his body.",
      "Cutie NEVER has white paws, white belly, or any non-green markings — he is 100% green everywhere.",
      "Cutie is NEVER a real animal — always a plush stuffed-toy-like creature.",
    ],
    storyBehavior:
      "Cutie's defining personality: when he gets nervous, scared, surprised, embarrassed, or excited, he ACCIDENTALLY TOOTS / FARTS — a little ¡prrrrrt! or ¡pfffft! or ¡puuum! sound. This is his signature comedy beat. EVERY story Cutie appears in must include at least one scene where he toots from nerves, played for warm playful laughter (never grossness). The other characters react with affection and giggle. Use onomatopoeia: ¡prrrt!, ¡pfff!, ¡pum!, ¡puuum!. Treat it like a small physical-humor moment, not a recurring joke.",
  },
  {
    matchName: (n) => n.trim().toLowerCase() === "aurelio",
    skipIfMentions: ["no-override"],
    canonicalVisual:
      "A MEDIUM-SIZED PLUSH STUFFED BUNNY — clearly a soft toy, NOT a real animal, NOT a bear, NOT a donkey, NOT a hybrid creature. " +
      "Soft light-gray plush fabric all over, slightly worn-loved texture. " +
      "Long floppy bunny ears with light-pink inner-ear lining. " +
      "Small round black-button embroidered eyes (kind, never creepy, never large or alien-like). " +
      "A tiny triangular pink stitched nose, a small embroidered smile in dark thread. " +
      "Wears beige cotton overalls with two shoulder straps and two square front pockets — stitched look. " +
      "Visible seams along the edges to confirm 'stuffed toy'.",
    negatives: [
      "Aurelio is NEVER a teddy bear, NEVER a donkey, NEVER a hybrid creature — always a plush bunny with long floppy ears.",
      "Aurelio's eyes are NEVER large, NEVER glowing, NEVER scary — always small black-button embroidered eyes with a kind expression.",
      "Aurelio NEVER looks like a real living animal — always clearly a stitched stuffed toy with visible seams.",
    ],
  },
];

// Returns the canonical default for a character name, or null if none.
export function getCharacterDefault(name: string): CharacterDefault | null {
  const match = DEFAULTS.find((d) => d.matchName(name));
  if (!match) return null;
  return match;
}

// Returns a copy of the cast with canonical visuals applied where matched.
// Never mutates the saved characters — only the prompt payload.
export function augmentCastForPrompt(cast: KidCharacter[]): KidCharacter[] {
  return cast.map((c) => {
    const match = DEFAULTS.find((d) => d.matchName(c.name));
    if (!match) return c;
    const lower = c.description.toLowerCase();
    if (match.skipIfMentions.some((kw) => lower.includes(kw))) return c;
    return { ...c, description: match.canonicalVisual };
  });
}

// Returns the canonical bullet description + negatives for a character.
// Falls back to the saved description if no default exists.
export function getCanonicalForCharacter(c: KidCharacter): {
  visual: string;
  negatives: string[];
} {
  const match = DEFAULTS.find((d) => d.matchName(c.name));
  if (match) {
    return { visual: match.canonicalVisual, negatives: match.negatives };
  }
  return { visual: c.description || `A ${c.kind} character.`, negatives: [] };
}

// Returns the story-behavior instruction for a character in the cast, or null.
// Used by the kid-story prompt to inject personality-driven instructions
// like "Cutie must fart when nervous".
export function getStoryBehavior(c: KidCharacter): string | null {
  const match = DEFAULTS.find((d) => d.matchName(c.name));
  return match?.storyBehavior ?? null;
}
