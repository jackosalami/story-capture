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

// Generates Nano Banana image prompts for a finished kid story and persists them.
// Returns true on success, false if the model returned unparseable JSON or the call failed.
export async function generateImagePrompts(args: {
  story: KidStory;
  model: string;
}): Promise<boolean> {
  try {
    const characters = augmentCastForPrompt(
      await getKidCharactersByIds(args.story.protagonistIds),
    );
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
            characters,
            setting: args.story.setting,
            theme: args.story.theme,
          }),
        },
      ],
      temperature: 0.7,
      maxTokens: 3500,
    });
    const parsed = parseImagePromptsResponse(raw);
    if (!parsed) return false;
    // Preserve any images already uploaded for the same scene index so a
    // regenerate doesn't wipe the user's illustrations.
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
