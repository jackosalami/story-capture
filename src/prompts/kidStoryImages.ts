// Generate Gemini Nano Banana image prompts for a kid story.
//
// CONTINUITY STRATEGY (revised):
// The previous approach let the model write scene prompts that included
// inline character descriptions. The model paraphrased those descriptions
// differently in every scene, and Banana rendered different versions of
// the same character.
//
// New approach:
//  - The model returns a structured scene: charactersPresent (just names)
//    + sceneAction (action + setting + composition, NO physical descriptions).
//  - The post-processor builds the final Banana-ready prompt by combining
//    a FIXED style block, the canonical bullet-style visual for each
//    character (byte-identical across scenes), the negatives for each
//    character, and the scene action.
//
// This guarantees that Cami/Noah/Kuma/Cutie/Aurelio/Nugget appear with
// identical canonical descriptions in every prompt — no paraphrase drift.

import type {
  KidCharacter,
  AgeBand,
  KidStoryImagePrompts,
  StoryLanguage,
} from "../db/types";
import { getCanonicalForCharacter } from "../lib/characterDefaults";

const STYLE_BLOCK =
  "Studio Ghibli inspired art, hand-drawn 2D animation style, soft watercolor painted backgrounds with delicate hand-inked lines, warm earth-tone palette, expressive characters with round soulful eyes and Ghibli proportions, soft golden-hour lighting, cinematic 16:9 widescreen composition, every character fully visible within the frame with comfortable headroom.";

export const IMAGE_PROMPTS_SYSTEM_PROMPT = `You produce structured image-generation data for a finished kid story. Your output is consumed by a post-processor that ASSEMBLES the final Nano Banana prompts — so you do NOT write character physical descriptions in the scene prompts. The post-processor will inject canonical character descriptions itself.

OUTPUT FORMAT (strict)

Return ONE valid JSON object — no markdown fences, no commentary, no preamble. Exactly this shape:

{
  "style": "string — one short paragraph in English describing the shared illustration style (the post-processor uses its own canonical style block, but include something for reference)",
  "characters": [
    {
      "name": "string — exact name from the input cast",
      "description": "string — one short English paragraph describing the character (the post-processor may use its own canonical default; this is a backup)"
    }
  ],
  "scenes": [
    {
      "momentTitle": "string — short title for the moment, in the STORY'S LANGUAGE (Spanish or English)",
      "charactersPresent": ["string — exact names of cast characters in this scene"],
      "sceneAction": "string — one English paragraph describing the SCENE ONLY: setting, time of day, lighting, atmosphere, what each named character is DOING, composition, mood. Mention characters BY NAME. Do NOT describe their physical appearance, clothing, skin tone, hair, or any visual attribute — only their action, posture, expression, and emotional state. The post-processor will add the visual descriptions separately."
    }
  ]
}

REQUIREMENTS

1. Exactly 5 scenes covering the story's narrative arc in chronological order:
   - opening tableau
   - inciting moment
   - mid-story peak
   - climax / turning point
   - warm closing image

2. charactersPresent must list ONLY the cast names from the input — exact spelling, exact capitalization. If a story character isn't in the cast input, don't list them.

3. sceneAction rules:
   - English only.
   - 3–5 sentences.
   - State setting + lighting + atmosphere first.
   - For each character present: NAME + what they're DOING + their EMOTION/POSTURE.
     Example GOOD: "Cami crouches at the edge of the stream, both hands on her knees, peering into the water with wide curious eyes. Noah stands behind her, pointing at a passing frog and laughing."
     Example BAD: "Cami, a small girl with caramel-brown pigtails wearing a yellow blouse, crouches at the edge..."  ← NEVER include physical description. The post-processor handles that.
   - NO mention of hair color, skin tone, clothing, breed, fur color, tail color, any visual attribute. Just names + actions + emotions.
   - Include composition hints when useful: "low camera angle," "wide shot of the meadow," "close-up of their faces."

4. JSON only. No fences. Your entire response must parse with JSON.parse.`;

export function buildImagePromptsUserPrompt(args: {
  storyTitle: string;
  storyContent: string;
  ageBand: AgeBand;
  characters: KidCharacter[];
  setting: string;
  theme: string;
  language: StoryLanguage;
}): string {
  const cast = args.characters.length === 0
    ? "(No predefined cast — pick names from the story text itself.)"
    : args.characters.map((c, i) =>
        `${i + 1}. ${c.name} (${c.kind})${c.traits.length ? ` — traits: ${c.traits.join(", ")}` : ""}`,
      ).join("\n");

  return [
    "STORY TITLE: " + (args.storyTitle || "(untitled)"),
    "STORY LANGUAGE: " + (args.language === "es" ? "Spanish" : "English"),
    "AGE BAND: " + args.ageBand,
    "Setting hint: " + (args.setting || "(none)"),
    "Theme hint: " + (args.theme || "(none)"),
    "",
    "CAST (use these names exactly in charactersPresent):",
    cast,
    "",
    `STORY (${args.language === "es" ? "Spanish" : "English"}):`,
    "---",
    args.storyContent,
    "---",
    "",
    "Now produce the JSON object. Remember: scene actions must be ENGLISH and must NOT include physical character descriptions — only names + what they do + emotional posture. The post-processor will add the visual references itself.",
  ].join("\n");
}

// --- Assembly: build the final Banana-ready prompts ---

function negativesBlock(present: KidCharacter[]): string {
  const lines: string[] = [];
  for (const c of present) {
    const def = getCanonicalForCharacter(c);
    for (const n of def.negatives) lines.push("• " + n);
  }
  if (lines.length === 0) return "";
  return "NEGATIVES — do NOT draw any of these:\n" + lines.join("\n");
}

function charactersBlock(present: KidCharacter[]): string {
  if (present.length === 0) return "";
  const lines: string[] = ["CHARACTERS IN THIS IMAGE — render each one EXACTLY as described. Every visible detail must match. Same person across every image:"];
  for (const c of present) {
    const def = getCanonicalForCharacter(c);
    lines.push(`• ${c.name.toUpperCase()}: ${def.visual}`);
  }
  return lines.join("\n");
}

export function assembleScenePrompt(args: {
  sceneAction: string;
  presentCharacters: KidCharacter[];
}): string {
  const sections: string[] = [];
  sections.push(STYLE_BLOCK);
  const chars = charactersBlock(args.presentCharacters);
  if (chars) sections.push(chars);
  const negs = negativesBlock(args.presentCharacters);
  if (negs) sections.push(negs);
  sections.push("SCENE: " + args.sceneAction.trim());
  return sections.join("\n\n");
}

export function parseImagePromptsResponse(
  raw: string,
  cast: KidCharacter[],
): KidStoryImagePrompts | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  const slice = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;

  try {
    const parsed = JSON.parse(slice);
    if (typeof parsed.style !== "string") return null;
    if (!Array.isArray(parsed.characters)) return null;
    if (!Array.isArray(parsed.scenes)) return null;

    // Build a name → KidCharacter map for cast lookups.
    const castByLowerName = new Map<string, KidCharacter>();
    for (const c of cast) castByLowerName.set(c.name.trim().toLowerCase(), c);

    const characters = parsed.characters
      .filter((c: unknown) => c && typeof c === "object")
      .map((c: { name?: unknown; description?: unknown }) => {
        const name = typeof c.name === "string" ? c.name : "";
        // Prefer the canonical description from defaults over what the model wrote,
        // so the displayed "characters" array also stays consistent.
        const fallback = typeof c.description === "string" ? c.description : "";
        const castMatch = castByLowerName.get(name.trim().toLowerCase());
        const canonical = castMatch ? getCanonicalForCharacter(castMatch).visual : fallback;
        return { name, description: canonical };
      })
      .filter((c: { name: string; description: string }) => c.name && c.description);

    const scenes = parsed.scenes
      .filter((s: unknown) => s && typeof s === "object")
      .map((s: { momentTitle?: unknown; charactersPresent?: unknown; sceneAction?: unknown; prompt?: unknown }) => {
        const momentTitle = typeof s.momentTitle === "string" ? s.momentTitle : "";
        const presentNames: string[] = Array.isArray(s.charactersPresent)
          ? s.charactersPresent.filter((x: unknown) => typeof x === "string") as string[]
          : [];
        const sceneAction =
          typeof s.sceneAction === "string"
            ? s.sceneAction
            : typeof s.prompt === "string"
              ? s.prompt
              : "";

        // Resolve names to actual KidCharacter objects we have canonicals for.
        const presentCharacters = presentNames
          .map((n) => castByLowerName.get(n.trim().toLowerCase()))
          .filter((c): c is KidCharacter => Boolean(c));

        // Build the final Banana-ready prompt by combining canonical pieces.
        const assembled = assembleScenePrompt({
          sceneAction,
          presentCharacters,
        });

        return {
          momentTitle,
          charactersPresent: presentNames,
          prompt: assembled,
        };
      })
      .filter((s: { prompt: string }) => s.prompt);

    return {
      style: STYLE_BLOCK,
      characters,
      scenes,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
