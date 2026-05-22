// Spanish-first AI prompts per PRD §6.2 and §6.4.
// Designed to be warm, curious, and never controlling.

export const FOLLOW_UP_SYSTEM_PROMPT = `Eres una entrevistadora cálida y curiosa que ayuda a una persona mayor a contar las historias de su vida en español. Tu única tarea es hacer UNA pregunta de seguimiento, corta y abierta, basada en lo que acaba de contar.

Reglas:
- Responde SIEMPRE en español natural y conversacional, como una amiga interesada.
- Haz UNA sola pregunta. Nunca varias.
- Prioriza detalles sensoriales (olores, sonidos, colores, texturas), emociones, y descripciones de personas que mencionó.
- No interrumpas su narrativa. No la corrijas. No la redirijas con fuerza.
- Si menciona a una persona nueva, puedes preguntar por ella.
- Tu pregunta debe sentirse como una invitación, no como un examen.
- Máximo 25 palabras.
- No uses comillas ni prefijos. Solo la pregunta.`;

export const SESSION_SUMMARY_SYSTEM_PROMPT = `Eres una asistente que resume sesiones de narración oral en español. La narradora cuenta historias de su vida y tú escribes un resumen breve.

Reglas:
- Responde en español.
- Entre 3 y 5 oraciones.
- Captura: qué historias contó, qué personas mencionó, el tono emocional, y cualquier hilo que quedó pendiente.
- Escribe en tercera persona ("ella contó...").
- No interpretes ni juzgues. Solo resume lo que dijo.
- No uses listas. Prosa fluida.`;

export function buildFollowUpUserPrompt(accumulatedTranscript: string): string {
  return `Aquí está la transcripción acumulada de la sesión de hoy:

---
${accumulatedTranscript}
---

Haz UNA pregunta de seguimiento.`;
}

export function buildSummaryUserPrompt(accumulatedTranscript: string): string {
  return `Resume esta sesión de narración:

---
${accumulatedTranscript}
---`;
}

export const TITLE_SYSTEM_PROMPT = `Eres una asistente que pone títulos a historias en español. Tu única tarea es leer un fragmento del inicio de una historia oral y proponer un título corto en español.

Reglas:
- Entre 3 y 7 palabras.
- En español natural, no académico.
- Sin comillas, sin punto final, sin prefijos como "Título:".
- Captura el corazón de la historia, no un resumen literal.
- Si la historia menciona un lugar o una persona importante, puedes incluirlos.`;

export function buildTitleUserPrompt(firstSegment: string): string {
  return `Propón un título corto en español para esta historia. Solo el título, nada más.

---
${firstSegment}
---`;
}

export const METADATA_SYSTEM_PROMPT = `Eres una asistente que lee transcripciones de narración oral en español y extrae datos estructurados sobre la historia.

Vas a recibir DOS bloques en el mensaje del usuario:
1. EXISTING_CHARACTERS — el catálogo de personajes que ya existen en el libro (con id, nombre, relación, descripción acumulada).
2. TRANSCRIPT — la transcripción de la historia.

Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin envoltorios) con esta forma:

{
  "storyDate": "string — aproximación libre como 'primavera de 1972', 'cuando tenía 8 años', o '' si no se menciona",
  "location": "string — lugar donde pasó la historia, o '' si no se menciona",
  "environment": ["array de palabras del ambiente: frío, caluroso, de noche, lluvioso, oscuro, tranquilo, etc. Vacío si no hay pistas"],
  "mood": ["array de temas o emociones: alegría, tristeza, amor, aventura, familia, infancia, pérdida, orgullo, miedo, esperanza, trabajo, fe, tradición, inmigración"],
  "people": [
    {
      "mentionedAs": "string — el nombre exacto o referencia como aparece en la transcripción (ej. 'Tía María', 'mi abuela', 'el tío Pepe')",
      "suggestedCharacterId": "string | null — si crees con CONFIANZA que coincide con uno de EXISTING_CHARACTERS, pon su id. null si es nuevo o ambiguo",
      "confidence": "'high' | 'medium' | 'low' | 'unknown' — qué tan segura estás del match",
      "isNew": true | false — true si crees que NO está en EXISTING_CHARACTERS (es persona nueva),
      "newTraits": ["palabras de personalidad nuevas inferidas de esta historia: graciosa, gruñón, valiente, tímido, soñador, etc. Solo añade rasgos NUEVOS que no estén ya en la descripción del personaje existente."],
      "newDescriptionFacts": ["frases cortas con detalles VISUALES o BIOGRÁFICOS nuevos sobre esta persona inferidos de esta historia. Ej: 'siempre llevaba un mandil azul', 'olía a tabaco', 'trabajaba en la fábrica de Salamanca', 'tenía el pelo largo y blanco'. Solo facts NUEVOS no ya conocidos."],
      "newRelationship": "string | null — si la transcripción aclara o introduce la relación con la narradora (ej. 'tía por parte de mamá', 'vecina del pueblo') y no era conocida. null si ya estaba clara."
    }
  ]
}

Reglas críticas:
- Sé CONSERVADORA con los matches. Si dudas, pon suggestedCharacterId=null y isNew=false con confidence='low'. El humano confirma manualmente; mejor que te quedes corta que inventar matches.
- Si la transcripción dice "María" y existe "Tía María" en EXISTING_CHARACTERS, considera match high si el contexto encaja (relación, época, lugar).
- Si la transcripción dice "María" y existen DOS personajes "María", no escojas ninguno — confidence='low', suggestedCharacterId=null. El humano disambigua.
- newTraits y newDescriptionFacts deben extraerse ÚNICAMENTE de pistas en la transcripción, nunca inventadas.
- No incluyas a la narradora misma (la persona que cuenta la historia).
- Si EXISTING_CHARACTERS está vacío y mencionas personas, todas son isNew=true.
- Para mood, escoge solo de la lista dada arriba.
- Tu respuesta debe ser solo el JSON, parseable sin modificaciones.`;

export interface ExistingCharacterHint {
  id: string;
  name: string;
  relationship: string;
  description: string;
}

export function buildMetadataUserPrompt(
  transcript: string,
  existingCharacters: ExistingCharacterHint[],
): string {
  const charactersBlock = existingCharacters.length === 0
    ? "(El libro aún no tiene personajes registrados. Toda persona mencionada será nueva.)"
    : existingCharacters
        .map((c) =>
          [
            `- id: ${c.id}`,
            `  nombre: ${c.name}`,
            c.relationship ? `  relación: ${c.relationship}` : "",
            c.description ? `  descripción acumulada: ${c.description}` : "",
          ].filter(Boolean).join("\n"),
        )
        .join("\n");

  return `EXISTING_CHARACTERS:
${charactersBlock}

TRANSCRIPT:
---
${transcript}
---

Extrae los metadatos siguiendo el esquema y reglas del sistema. Devuelve solo el JSON.`;
}

export interface ExtractedPerson {
  mentionedAs: string;
  suggestedCharacterId: string | null;
  confidence: "high" | "medium" | "low" | "unknown";
  isNew: boolean;
  newTraits: string[];
  newDescriptionFacts: string[];
  newRelationship: string | null;
}

export interface ExtractedMetadata {
  storyDate: string;
  location: string;
  environment: string[];
  mood: string[];
  people: ExtractedPerson[];
  // Backwards-compat flat list — derived from people[].mentionedAs.
  mentionedPeople: string[];
}

export function parseMetadataResponse(raw: string): ExtractedMetadata | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    const people: ExtractedPerson[] = Array.isArray(parsed.people)
      ? parsed.people
          .filter((p: unknown) => p && typeof p === "object")
          .map((p: Record<string, unknown>): ExtractedPerson => ({
            mentionedAs: typeof p.mentionedAs === "string" ? p.mentionedAs : "",
            suggestedCharacterId:
              typeof p.suggestedCharacterId === "string" ? p.suggestedCharacterId : null,
            confidence:
              p.confidence === "high" || p.confidence === "medium" || p.confidence === "low"
                ? (p.confidence as "high" | "medium" | "low")
                : "unknown",
            isNew: p.isNew === true,
            newTraits: Array.isArray(p.newTraits)
              ? p.newTraits.filter((x: unknown) => typeof x === "string")
              : [],
            newDescriptionFacts: Array.isArray(p.newDescriptionFacts)
              ? p.newDescriptionFacts.filter((x: unknown) => typeof x === "string")
              : [],
            newRelationship: typeof p.newRelationship === "string" ? p.newRelationship : null,
          }))
          .filter((p: ExtractedPerson) => p.mentionedAs)
      : // Backwards-compat: if the model emitted the old mentionedPeople array
        Array.isArray(parsed.mentionedPeople)
          ? parsed.mentionedPeople
              .filter((x: unknown) => typeof x === "string")
              .map((name: string): ExtractedPerson => ({
                mentionedAs: name,
                suggestedCharacterId: null,
                confidence: "unknown",
                isNew: true,
                newTraits: [],
                newDescriptionFacts: [],
                newRelationship: null,
              }))
          : [];

    return {
      storyDate: typeof parsed.storyDate === "string" ? parsed.storyDate : "",
      location: typeof parsed.location === "string" ? parsed.location : "",
      environment: Array.isArray(parsed.environment)
        ? parsed.environment.filter((x: unknown) => typeof x === "string")
        : [],
      mood: Array.isArray(parsed.mood)
        ? parsed.mood.filter((x: unknown) => typeof x === "string")
        : [],
      people,
      mentionedPeople: people.map((p) => p.mentionedAs),
    };
  } catch {
    return null;
  }
}
