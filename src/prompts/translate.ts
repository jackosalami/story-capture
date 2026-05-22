// Translate a finished kid story to another language while preserving the
// read-aloud kid-lit register (short sentences, dialogue, onomatopoeia, humor).
// We translate text only — images and scene metadata are reused.

import type { StoryLanguage } from "../db/types";

const LANG_LABEL: Record<StoryLanguage, string> = {
  es: "Spanish",
  en: "English",
};

export const TRANSLATE_SYSTEM_PROMPT = `You translate finished children's stories between Spanish and English while preserving the kid-read-aloud register. Rules:

1. Preserve the FEEL — short sentences, natural dialogue, sound effects/onomatopoeia (¡pum!, ¡plaf!, ¡pruuu! ↔ POP!, BANG!, PFFT!), rhythmic repetition, warm voice. Don't make the target language more formal than the source.

2. When translating INTO SPANISH, the target is **Mexican / Latin American Spanish**, never peninsular Spanish:
   - Use "tú" (never "vos", never "vosotros") for informal you.
   - Use "ustedes" for plural you (never "vosotros", never conjugations like "miraréis" / "podéis" / "sois").
   - Use Mexican vocabulary: papá / mamá, abuelita / abuelito, papas (not patatas), jugo (not zumo), pastel (not tarta), camión (bus), celular (not móvil), computadora (not ordenador), platicar (not charlar), agarrar / tomar (NEVER "coger" — vulgar in Mexico).
   - Mexican interjections welcome: ¡híjole!, ¡órale!, ¡ay caray!, ¡qué padre!, ¡mira nomás!
   - Use diminutivos -ito/-ita liberally for warmth (perrito, casita, ratoncito).
   - BANNED Iberian Spanish: vosotros, "habéis", "podéis", "vuestro/a/os/as", "ordenador", "móvil", "patata", "zumo", "tarta", "guay", "chaval/chavala". NEVER use "coger".

3. Adapt onomatopoeia to the target language conventions:
   - Spanish farts: ¡prrrt!, ¡pfff!, ¡pruuu!
   - English farts: TOOT!, PFFT!, PRRRT!
   - Spanish surprise: ¡híjole!, ¡guau!, ¡órale!
   - English surprise: oh!, oof!, wow!
   - Animal sounds: ¡guau-guau! ↔ woof-woof!, ¡miau! ↔ meow!, etc.

4. Keep dialogue tags simple ("dijo" / "said" / "yelled" / "whispered"). NEVER promote to formal verbs.

5. Keep character names exactly as in the source.

6. Preserve paragraph structure — same number of paragraphs, similar lengths.

7. Output format: TITLE on the first line, blank line, then the body. No commentary, no notes, no markdown fences.`;

export function buildTranslateUserPrompt(args: {
  fromLanguage: StoryLanguage;
  toLanguage: StoryLanguage;
  title: string;
  content: string;
}): string {
  return [
    `Translate this children's story from ${LANG_LABEL[args.fromLanguage]} to ${LANG_LABEL[args.toLanguage]}.`,
    "Preserve all the kid-read-aloud feel as specified in the system instructions.",
    "",
    `Title (${LANG_LABEL[args.fromLanguage]}):`,
    args.title,
    "",
    `Story (${LANG_LABEL[args.fromLanguage]}):`,
    "---",
    args.content,
    "---",
    "",
    `Now output the title on the first line, blank line, then the body. ${LANG_LABEL[args.toLanguage]} only.`,
  ].join("\n");
}

export function splitTranslatedTitleAndBody(text: string): { title: string; content: string } {
  const cleaned = text.trim();
  const lines = cleaned.split(/\r?\n/);
  let title = "";
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      title = lines[i].trim().replace(/^[#*\-\s"'«»]+|[\s"'«»]+$/g, "");
      bodyStart = i + 1;
      break;
    }
  }
  while (bodyStart < lines.length && !lines[bodyStart].trim()) bodyStart++;
  const content = lines.slice(bodyStart).join("\n").trim();
  return { title, content: content || cleaned };
}
