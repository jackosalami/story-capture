import { chatWithImage } from "../api/openai";
import type { KidCharacterKind } from "../db/types";

// Asks the vision model to describe an uploaded character reference image
// and to suggest the closest "kind" bucket.

const SYSTEM_PROMPT = `Eres una asistente que ayuda a registrar personajes para cuentos infantiles.

Vas a ver una imagen de un personaje (real, dibujado o de juguete) y tienes que producir DOS cosas:

1. Una descripción visual detallada en español, en una sola oración o párrafo corto, que sirva para que un ilustrador o un modelo de imágenes pueda recrear exactamente al mismo personaje en varias escenas. Captura:
   - Qué es (niño, niña, animal específico, criatura, objeto mágico, etc.)
   - Edad aparente o tamaño
   - Colores principales (pelo, ojos, piel, pelaje, plumas, etc.)
   - Ropa o accesorios visibles
   - Rasgos distintivos (gafas, cicatriz, una bufanda roja, un sombrero, etc.)
   - Expresión o postura si transmiten personalidad

   Tono cálido y específico, no técnico. Concreto, sin frases vagas como "agradable" o "bonito".

2. Una sugerencia de categoría — elige UNA exactamente de esta lista:
   "niño", "animal", "criatura", "objeto mágico", "otro".

Devuelve EXCLUSIVAMENTE un JSON válido, sin markdown, sin texto extra, con esta forma:

{
  "description": "string en español",
  "suggestedKind": "niño" | "animal" | "criatura" | "objeto mágico" | "otro"
}`;

const USER_PROMPT = `Describe el personaje en esta imagen siguiendo las reglas. Solo el JSON.`;

export interface DescribedCharacter {
  description: string;
  suggestedKind: KidCharacterKind;
}

const VALID_KINDS: KidCharacterKind[] = ["niño", "animal", "criatura", "objeto mágico", "otro"];

export async function describeCharacterFromImage(args: {
  model: string;
  imageDataUrl: string;
}): Promise<DescribedCharacter> {
  const raw = await chatWithImage({
    model: args.model,
    systemPrompt: SYSTEM_PROMPT,
    userText: USER_PROMPT,
    imageDataUrl: args.imageDataUrl,
    detail: "low",
    temperature: 0.4,
    maxTokens: 500,
  });

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
    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    const sk = typeof parsed.suggestedKind === "string" ? parsed.suggestedKind : "";
    const suggestedKind = VALID_KINDS.includes(sk as KidCharacterKind)
      ? (sk as KidCharacterKind)
      : "otro";
    if (!description) throw new Error("La descripción está vacía.");
    return { description, suggestedKind };
  } catch {
    // Last-resort fallback — treat the whole response as the description.
    return { description: cleaned, suggestedKind: "otro" };
  }
}
