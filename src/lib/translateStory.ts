import { chat } from "../api/openai";
import {
  TRANSLATE_SYSTEM_PROMPT,
  buildTranslateUserPrompt,
  splitTranslatedTitleAndBody,
} from "../prompts/translate";
import { updateKidStory, getKidStory } from "../db/kidStories";
import type { KidStory, StoryLanguage } from "../db/types";

// Translate a kid story to a target language. Reuses images, characters,
// image prompts and scene metadata as-is — only the text gets translated.
export async function translateStory(args: {
  storyId: string;
  toLanguage: StoryLanguage;
  model: string;
}): Promise<boolean> {
  const story = await getKidStory(args.storyId);
  if (!story) return false;
  if (story.language === args.toLanguage) return true; // nothing to do

  try {
    const raw = await chat({
      model: args.model,
      messages: [
        { role: "system", content: TRANSLATE_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildTranslateUserPrompt({
            fromLanguage: story.language,
            toLanguage: args.toLanguage,
            title: story.title,
            content: story.content,
          }),
        },
      ],
      temperature: 0.5,
      maxTokens: 3000,
    });
    const { title, content } = splitTranslatedTitleAndBody(raw);
    if (!content) return false;

    const translations = { ...(story.translations ?? {}) };
    translations[args.toLanguage] = {
      title: title || story.title,
      content,
      translatedAt: new Date().toISOString(),
    };
    await updateKidStory(args.storyId, { translations });
    return true;
  } catch {
    return false;
  }
}

// Returns the title + content in the requested viewing language, or the
// primary content if no translation is available.
export function getStoryInLanguage(
  story: KidStory,
  language: StoryLanguage,
): { title: string; content: string } {
  if (language === story.language) {
    return { title: story.title, content: story.content };
  }
  const tr = story.translations?.[language];
  if (tr) return { title: tr.title, content: tr.content };
  return { title: story.title, content: story.content };
}

// Returns the list of languages this story is available in.
export function availableLanguages(story: KidStory): StoryLanguage[] {
  const set: StoryLanguage[] = [story.language];
  if (story.translations) {
    for (const k of Object.keys(story.translations) as StoryLanguage[]) {
      if (!set.includes(k)) set.push(k);
    }
  }
  return set;
}
