import { chat } from "../api/openai";
import {
  IMAGE_PROMPTS_SYSTEM_PROMPT,
  buildImagePromptsUserPrompt,
  parseImagePromptsResponse,
} from "../prompts/kidStoryImages";
import { updateKidStory } from "../db/kidStories";
import { getKidCharactersByIds } from "../db/kidCharacters";
import { augmentCastForPrompt } from "./characterDefaults";
import type { KidStory } from "../db/types";

export async function generateImagePrompts(args: {
  story: KidStory;
  model: string;
}): Promise<boolean> {
  try {
    // Saved cast (raw — names, traits, kind, user description).
    const rawCast = await getKidCharactersByIds(args.story.protagonistIds);
    // For the model: hide canonical visual hints inside the description field
    // so the model can reason about who's who. The canonical descriptions are
    // baked into the final assembled prompt by parseImagePromptsResponse using
    // getCanonicalForCharacter — independent of what the model writes.
    const promptCast = augmentCastForPrompt(rawCast);

    const raw = await chat({
      model: args.model,
      messages: [
        { role: "system", content: IMAGE_PROMPTS_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildImagePromptsUserPrompt({
            storyTitle: args.story.title,
            storyContent: args.story.content,
            ageBand: args.story.ageBand,
            characters: promptCast,
            setting: args.story.setting,
            theme: args.story.theme,
            language: args.story.language,
          }),
        },
      ],
      temperature: 0.6,
      maxTokens: 3500,
    });

    // Pass the RAW cast (with original names) to the parser so it can resolve
    // names → canonical visuals + negatives via characterDefaults.
    const parsed = parseImagePromptsResponse(raw, rawCast);
    if (!parsed) return false;

    // Preserve uploaded images by scene index so regenerate doesn't lose them.
    const prior = args.story.imagePrompts?.scenes ?? [];
    parsed.scenes = parsed.scenes.map((scene, i) => {
      const oldScene = prior[i];
      if (oldScene?.image) {
        return {
          ...scene,
          image: oldScene.image,
          imageMimeType: oldScene.imageMimeType,
        };
      }
      return scene;
    });
    await updateKidStory(args.story.id, { imagePrompts: parsed });
    return true;
  } catch {
    return false;
  }
}
