// Prompts for generating Gemini Nano Banana image prompts from a finished kid story.
//
// Nano Banana / Gemini 2.5 Flash Image works best with:
//  - English, descriptive paragraphs (not keyword lists)
//  - Explicit subject + setting + action + style + lighting + composition
//  - For character continuity across multiple images: the EXACT same visual
//    description repeated in every prompt the character appears in.
//
// We emit JSON so the app can render the prompts in a structured UI and
// preserve the canonical character descriptions for the user to reuse.

import type { KidCharacter, AgeBand, KidStoryImagePrompts } from "../db/types";

export const IMAGE_PROMPTS_SYSTEM_PROMPT = `You are an expert at crafting image-generation prompts for Google Gemini's Nano Banana (Gemini 2.5 Flash Image). You read a finished Spanish children's story and produce a set of polished English prompts to illustrate it.

ABOUT THE OUTPUT FORMAT
Return a single valid JSON object — no markdown fences, no commentary, no preamble. The object must have exactly this shape:

{
  "style": "string — one detailed paragraph in English describing the shared illustration style applied to every scene",
  "characters": [
    { "name": "string — the character's name as it appears in the story", "description": "string — one detailed paragraph in English fixing the character's visual identity (species, age, build, hair, eyes, skin, clothing, distinctive features, color palette). Specific and concrete." }
  ],
  "scenes": [
    { "momentTitle": "string — short Spanish label for the moment", "prompt": "string — one fully-formed English image prompt for Nano Banana" }
  ]
}

REQUIREMENTS

1. Exactly 5 scenes, covering the story's narrative arc — opening tableau, inciting moment, mid-story peak, climax, warm closing image.

2. Character continuity is mandatory. Every prompt that features a character must include that character's full visual description VERBATIM, exactly as it appears in the "characters" array. Use the character's name and then state the description so Nano Banana renders the same character in every image. Never abbreviate or paraphrase character descriptions across prompts.

3. Style continuity is mandatory. Every prompt must include the shared style description (verbatim or near-verbatim). The style is the canonical look applied across all 5 images.

4. The shared style should be a children's-book / animated-cartoon style appropriate to the age band. Concrete style elements to combine (pick a coherent combination):
   - "vibrant children's book illustration"
   - "soft watercolor textures with clean line art"
   - "expressive cartoon characters with large round eyes"
   - "warm storybook palette" / "candy pastel palette" / "magical golden-hour palette" — choose what fits the story
   - "Pixar-inspired warmth" or "Studio Ghibli-inspired softness" or "Disney animated film quality"
   - "smooth gradient shading, no harsh outlines" / "thick playful black outlines, flat color fills" — pick one and stick to it
   - "16:9 widescreen composition" or "square composition" — pick one and stick to it
   Do NOT mention photorealism, hyperrealism, photography, 3D render. This is for kids — keep it illustrated.

5. Each scene prompt is one paragraph (2–5 sentences), structured roughly as:
   [shared style sentence] [setting + lighting + atmosphere] [characters present, each with their full description] [the specific action / emotion / composition] [closing mood beat]

6. Be specific and concrete. Describe what the camera sees, not what happens narratively. Examples:
   - GOOD: "Pipo the small russet-furred fox cub with bright amber eyes and a red knitted scarf crouches beside a moss-covered log, paw extended toward a glowing firefly"
   - BAD: "Pipo discovers something magical"

7. Avoid text, words, signage, or letters in any image — these models render text poorly. Do not mention writing.

8. Avoid mentioning brand names of any kind in scene prompts.

9. Be inclusive and warm. Cute, expressive, kind faces. No scary imagery. No violence. Tension or sadness is OK if the story includes it, but resolve every depiction toward warmth.

10. JSON only. No \`\`\` fences. No prose around the JSON. Your entire response must be parseable by JSON.parse.`;

export function buildImagePromptsUserPrompt(args: {
  storyTitle: string;
  storyContent: string;
  ageBand: AgeBand;
  characters: KidCharacter[];
  setting: string;
  theme: string;
}): string {
  const cast = args.characters.length === 0
    ? "(Define the visual identity of any character you include based on the story text.)"
    : args.characters
        .map((c) => `- ${c.name} (${c.kind})${c.description ? ` — ${c.description}` : ""}`)
        .join("\n");

  return [
    "Story title: " + (args.storyTitle || "(untitled)"),
    "Age band: " + args.ageBand,
    "Author-provided setting: " + (args.setting || "(none)"),
    "Author-provided theme: " + (args.theme || "(none)"),
    "",
    "Cast (use these names; define their visual look based on these hints + the story text):",
    cast,
    "",
    "STORY (Spanish):",
    "---",
    args.storyContent,
    "---",
    "",
    "Now produce the JSON object with exactly 5 scenes following all rules.",
  ].join("\n");
}

export function parseImagePromptsResponse(raw: string): KidStoryImagePrompts | null {
  // Strip any accidental markdown fences. Find the outermost {...} block.
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
    return {
      style: parsed.style.trim(),
      characters: parsed.characters
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: { name?: unknown; description?: unknown }) => ({
          name: typeof c.name === "string" ? c.name : "",
          description: typeof c.description === "string" ? c.description : "",
        }))
        .filter((c: { name: string; description: string }) => c.name && c.description),
      scenes: parsed.scenes
        .filter((s: unknown) => s && typeof s === "object")
        .map((s: { momentTitle?: unknown; prompt?: unknown }) => ({
          momentTitle: typeof s.momentTitle === "string" ? s.momentTitle : "",
          prompt: typeof s.prompt === "string" ? s.prompt : "",
        }))
        .filter((s: { momentTitle: string; prompt: string }) => s.prompt),
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
