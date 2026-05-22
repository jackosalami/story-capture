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

# OUTPUT FORMAT (strict)

Return ONE valid JSON object — no markdown fences, no commentary, no preamble, no trailing text. The shape must be exactly:

{
  "style": "string — one detailed paragraph in English describing the shared illustration style applied to every scene",
  "characters": [
    {
      "name": "string — the character's exact name as used in the story",
      "description": "string — one English paragraph fixing this character's permanent visual identity: species/type, age/size, hair/fur/feathers (color + texture + style), eye color, skin tone, clothing (every visible item with color and material), accessories, distinctive features, body proportions. Be concrete and specific. This text will be COPIED VERBATIM into every scene prompt the character appears in, so write it as a self-contained visual fingerprint."
    }
  ],
  "scenes": [
    {
      "momentTitle": "string — short Spanish label for the moment, 3-7 words",
      "prompt": "string — one fully-formed English image prompt for Nano Banana"
    }
  ]
}

# REQUIREMENTS

## A. Scenes
- EXACTLY 5 scenes covering the narrative arc: (1) opening tableau, (2) inciting moment, (3) mid-story peak, (4) climax / turning point, (5) warm closing image.
- Scenes must appear in chronological story order.

## B. Cast (this is the most important section)

You will receive a CAST list in the user message — these are the named characters in the story. For every character listed in the cast:

1. You MUST create one entry in the output "characters" array. The entry's "name" must match the cast name exactly (same spelling, same capitalization).

2. You MUST write a HYPER-SPECIFIC visual "description". The cast hint is BINDING: if it specifies a hairstyle, clothing, age, body shape, or any distinguishing feature, you MUST use that EXACT feature in your description and in every scene the character appears in. You may add concrete details that don't contradict the hint, but you may NEVER substitute or override a specified feature with a generic one. Example: if the hint says "two side pigtails," you MUST write "two side pigtails," not "curly hair" or "short hair" — even if other features are vague.

   The description must contain ALL of these, each with concrete sensory specificity (avoid generic words like "colorful", "cute", "nice"):
   - **What they are**: species or type (a four-year-old Spanish girl, a small russet-furred fox cub, a stuffed bunny doll)
   - **Age and body**: specific age in years, height/build, posture
   - **Hair / fur / feathers** — color (be specific: "chocolate brown," not "dark"), texture (silky, fluffy, wiry), and **EXACT hairstyle** (two side pigtails, low side bun, shaggy bowl cut, long braid past the waist). Hairstyle must be stated explicitly and is non-negotiable — use the SAME wording in every scene.
   - **Eye color and shape** (almond-shaped dark brown eyes with thick lashes; round amber eyes with vertical pupils)
   - **Skin tone or fur/coat tone** (warm tan complexion; cream-and-rust patchwork fur)
   - **Clothing — every visible garment with COLOR + MATERIAL + DISTINCTIVE DETAIL**. Don't say "a colorful shirt" — say "a pale-yellow short-sleeved cotton blouse with a small white peter-pan collar." Don't say "shorts" — say "dark navy denim shorts that fall just above her knees." Specific is the goal.
   - **Accessories** — every visible item: hairband color, sock color, shoe style, backpack, scarf pattern, glasses shape.
   - **Distinguishing marks** — freckles across the nose bridge, a missing front tooth, a small scar on the eyebrow, a streak of silver in the hair, etc. Invent one or two if the hint is silent — it helps the model recognize them.

3. **References to known characters or styles**: If the visual hint mentions a recognizable character, person, or style reference (e.g. "looks like Mei from My Neighbor Totoro," "Ghibli-style girl," "like the kid from Coco," "modeled visually on..."), incorporate the canonical visual features of that reference into your description. Be specific — name the hair, the clothing, the body proportions associated with that reference. The reader of your prompt should not need to know the reference; your description must stand alone with all those features spelled out as if you were describing the character from scratch.

4. **Personality traits inform body language**: If the cast hint includes personality traits (curious, shy, brave, dreamy, mischievous, etc.), let those traits show in each scene's posture, expression, and what the character is doing. A curious character peers, reaches, leans in. A shy character hides behind something, looks down. A brave character stands tall, leads the others. Don't just say the character is "X" — render the trait visually in their body.

5. In every scene prompt, you MUST mention by name every character from the cast who appears in that scene, AND include their full description verbatim from the "characters" array. Copy-paste it word-for-word. Do not paraphrase between scenes. Do not abbreviate after the first mention. Repeat the entire description every single time the character appears.

6. The pattern for inserting a character in a scene is:
   "<Name>, <full description verbatim>, [body language matching their traits] [what they are doing]"
   Example: "Pipo, a small russet-furred fox cub with bright amber eyes, a fluffy white-tipped tail, and a hand-knitted red scarf with mismatched green stripes, leans forward with twitching curious ears, paw extended toward a glowing blue firefly that hovers above a moss-covered log…"

7. If a scene features multiple characters from the cast, include each one with this same expanded pattern. Yes, the prompts will be long. That is correct — Nano Banana needs every detail in every prompt to render the same character consistently.

## C. Style — Studio Ghibli (REQUIRED, NON-NEGOTIABLE)

The shared style is fixed: **Studio Ghibli hand-drawn animation style**. Every scene must read as a frame from a Ghibli film (Totoro, Spirited Away, Howl's Moving Castle, Kiki's Delivery Service, Ponyo).

**HARD REQUIREMENTS:**

1. The literal phrase "Studio Ghibli" MUST appear in the "style" paragraph AND in the opening sentence of EVERY scene prompt. Do not paraphrase to "Ghibli-inspired" or "in the style of Miyazaki" — use the words "Studio Ghibli" explicitly.

2. The "style" paragraph you output should fix the canonical look. Build it from these mandatory elements:
   - "Studio Ghibli hand-drawn 2D animation style"
   - "soft watercolor painted backgrounds with painterly skies and atmospheric depth"
   - "warm pastel and earth-tone palette" (or "muted natural palette" for outdoor scenes — pick one and stick with it)
   - "delicate hand-inked lines around characters and props"
   - "expressive characters with round soulful eyes, gentle smiles, and slightly oversized heads relative to bodies — Ghibli proportions"
   - "soft cel-shaded volumes with subtle ambient occlusion, no harsh shadows"
   - "Miyazaki-style attention to ambient natural detail — wind in grass, drifting clouds, dancing dust motes in sunbeams, rustling leaves"
   - "cinematic 16:9 widescreen composition" (use 16:9 consistently — Ghibli films are widescreen)
   - "soft golden-hour lighting" OR "soft overcast natural lighting" OR "magical twilight glow" — choose ONE and use the same lighting in all 5 scenes for continuity

3. Every scene prompt's FIRST sentence must include the words "Studio Ghibli hand-drawn 2D animation style" verbatim. This is what locks Nano Banana into the same look across all 5 images.

4. Do NOT mention: photorealism, hyperrealism, photography, 3D render, Pixar, Disney, anime, cartoon-network style. Studio Ghibli is its own thing — calling it "anime" or any other word pulls a different aesthetic. Use "Studio Ghibli" only.

## D. Scene structure
Each scene prompt is one paragraph (3–6 sentences), structured roughly as:
[shared style sentence] [setting + lighting + atmosphere] [for each character present: <name>, <full verbatim description>, doing X] [closing mood beat / composition note]

## E. Be specific, not narrative
Describe what the camera sees, not what is happening internally.
- GOOD: "Pipo, a small russet-furred fox cub with bright amber eyes and a knitted red scarf, crouches with one paw raised toward a glowing blue firefly that hovers above a moss-covered log"
- BAD: "Pipo discovers something magical"

## F. Hard nos
- No text, letters, words, or signage in any image (these models render text poorly).
- No brand names.
- No scary or violent imagery. Tension is fine; resolve every depiction toward warmth.

## G. Output
- JSON only. No markdown fences. No prose around it. Your entire response must be parseable by JSON.parse.`;

export function buildImagePromptsUserPrompt(args: {
  storyTitle: string;
  storyContent: string;
  ageBand: AgeBand;
  characters: KidCharacter[];
  setting: string;
  theme: string;
}): string {
  // Build a strong, structured cast block so the model can't ignore it.
  const cast = args.characters.length === 0
    ? "(The story has no pre-defined cast. Invent canonical visual identities for any named characters that appear in the story text, following the same rules.)"
    : args.characters
        .map((c, i) => {
          const lines = [
            `${i + 1}. Name: ${c.name}`,
            `   Kind: ${c.kind}`,
          ];
          if (c.description) {
            lines.push(`   Visual hint (expand into a full description): ${c.description}`);
          } else {
            lines.push("   Visual hint: (none — invent a coherent visual identity from the story)");
          }
          if (c.traits.length > 0) {
            lines.push(`   Personality traits: ${c.traits.join(", ")}`);
          }
          return lines.join("\n");
        })
        .join("\n\n");

  return [
    "STORY TITLE: " + (args.storyTitle || "(untitled)"),
    "AGE BAND: " + args.ageBand,
    "Author-provided setting: " + (args.setting || "(none)"),
    "Author-provided theme: " + (args.theme || "(none)"),
    "",
    "===== CAST =====",
    "These are the named characters in the story. Every one of them MUST appear in the output 'characters' array with the exact same name. In every scene where one of them appears, you MUST insert their full verbatim description after their name.",
    "",
    cast,
    "===============",
    "",
    "STORY (Spanish):",
    "---",
    args.storyContent,
    "---",
    "",
    "Now produce the JSON object with exactly 5 scenes following ALL rules. Remember: every cast character that appears in a scene needs their full verbatim description repeated in that scene's prompt.",
  ].join("\n");
}

const GHIBLI_PREFIX =
  "Studio Ghibli hand-drawn 2D animation style, soft watercolor painted backgrounds with delicate hand-inked lines, warm earth-tone palette, expressive characters with round soulful eyes and Ghibli proportions, soft golden-hour lighting, cinematic 16:9 widescreen composition. ";

// Safety net: if the model forgot to mention "Studio Ghibli" in a scene prompt
// or the style paragraph, prepend the canonical phrase so Nano Banana still
// gets the right look. Cheap insurance for the case where the model drifts.
function ensureGhibli(text: string): string {
  if (/studio ghibli/i.test(text)) return text;
  return GHIBLI_PREFIX + text;
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
      style: ensureGhibli(parsed.style.trim()),
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
          prompt: ensureGhibli(typeof s.prompt === "string" ? s.prompt : ""),
        }))
        .filter((s: { momentTitle: string; prompt: string }) => s.prompt),
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
