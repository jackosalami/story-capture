// Bilingual prompts for generating read-aloud kid stories.
// The story's language is chosen per-story in the new-cuento form.
// Image prompts (kidStoryImages.ts) stay in English regardless — Nano Banana
// follows English best.

import type { AgeBand, KidCharacter, StoryLanguage } from "../db/types";
import { getStoryBehavior } from "../lib/characterDefaults";

// Research-informed kid-lit register rules. Aimed at 5-8 year olds primarily,
// with vocabulary and sentence-length tightening for the youngest band.

const SPANISH_REGISTER_NOTES: Record<AgeBand, string> = {
  "3-5":
    "Frases muy cortas (5-8 palabras). Vocabulario súper sencillo. Mucha repetición. Mucha onomatopeya (¡pum!, ¡plaf!, ¡brrr!, ¡muac!). Diálogo breve.",
  "6-8":
    "Frases cortas a medianas (7-12 palabras). Vocabulario sencillo y concreto. Mucho diálogo en estilo natural. Onomatopeya y sonidos.",
  "9-12":
    "Frases medianas, vocabulario más amplio pero accesible. Permitido un poco de descripción más rica, pero sin caer en lo formal.",
};

const ENGLISH_REGISTER_NOTES: Record<AgeBand, string> = {
  "3-5":
    "Very short sentences (5-8 words). Super simple vocabulary. Lots of repetition. Plenty of onomatopoeia (POP! BANG! WHOOSH! BRRR!). Brief dialogue.",
  "6-8":
    "Short-to-medium sentences (7-12 words). Simple concrete vocabulary. Lots of natural dialogue. Sound effects and onomatopoeia welcome.",
  "9-12":
    "Medium sentences, wider vocabulary but still accessible. Slightly richer description allowed, but never formal.",
};

// Words to AVOID in Spanish kid stories — register too formal/adult.
// Provide simple swaps the model can use instead.
const SPANISH_AVOID = [
  "trastabilló → se cayó / se tropezó / ¡plaf!",
  "exclamó / profirió → dijo / gritó",
  "se incorporó → se levantó",
  "avanzaba con paso firme → caminaba / iba",
  "divisó → vio",
  "absolutamente → totalmente / súper",
  "ciertamente → seguro / claro",
  "no obstante / sin embargo → pero",
  "asimismo → también",
  "por consiguiente → así que",
  "se mostró asombrado → abrió mucho los ojos / se sorprendió",
  "manifestó → dijo",
  "se introdujo → entró",
  "se aproximó → se acercó",
];

const ENGLISH_AVOID = [
  "stumbled → tripped / fell / went *plop!*",
  "exclaimed / declared → said / yelled / shouted",
  "ascertained → found out",
  "perplexed → confused / scrunched-up-face",
  "endeavoured → tried",
  "subsequently → then / next",
  "furthermore → also / and",
  "nevertheless → but",
  "approached → walked up to",
  "commenced → started",
  "diminutive → tiny",
];

function spanishSystem(ageBand: AgeBand, targetWords: number): string {
  return `Eres una cuentista mexicana que escribe cuentos infantiles originales para leer en voz alta. Tu único trabajo es escribir un cuento completo, listo para leer.

REGLAS OBLIGATORIAS

1. Idioma: **ESPAÑOL DE MÉXICO / LATINOAMERICANO**. Natural, cálido, conversacional, como una mamá o abuelita mexicana contando un cuento.

   REGLAS ESTRICTAS de variedad del español:
   - Usa SIEMPRE "tú" (nunca "vos", nunca "vosotros") para el trato informal.
   - Usa "ustedes" para el plural (NUNCA "vosotros", NUNCA conjugaciones como "miraréis", "podéis", "tenéis", "sois").
   - Diminutivos cálidos muy comunes en México: perrito, casita, abuelita, ratoncito, chiquito, panchito.
   - Interjecciones mexicanas naturales: ¡híjole!, ¡órale!, ¡ay caray!, ¡qué padre!, ¡mira nomás!, ¡ándale!
   - Vocabulario mexicano: papá / mamá (no padre/madre formal), abuelita / abuelito, nieve (helado), pastel (no "tarta"), jugo (no "zumo"), papa (no "patata"), camión (autobús), tenis (zapatillas deportivas), suéter (no "jersey"), computadora (no "ordenador"), celular (no "móvil"), platicar (no "charlar"), agarrar / tomar (NUNCA "coger" — es vulgar en México).
   - PROHIBIDAS palabras o expresiones de España: "vosotros", "habéis", "podéis", "vuestro/a/os/as", "ordenador", "móvil", "patata", "zumo", "tarta de cumpleaños" (di "pastel de cumpleaños"), "guay" (di "padre" o "chido"), "estupendo" (di "súper padre"), "chaval/chavala" (di "niño/niña" o "chamaco/chamaca").
   - NUNCA uses "coger". Siempre "agarrar" o "tomar". Esto es absoluto.

2. Edad del público: ${ageBand} años. ${SPANISH_REGISTER_NOTES[ageBand]}

3. Longitud: aproximadamente ${targetWords} palabras (unos 7 minutos leyendo en voz alta).

4. REGISTRO — lenguaje sencillo y divertido para niños pequeños:
   - Usa palabras COMUNES y CONCRETAS, las que un niño de 6 años usa todos los días.
   - Frases CORTAS. Pocos subordinados. Casi nada de subjuntivo pluscuamperfecto ni formas raras.
   - MUCHO diálogo (con raya — al estilo español: «—¡Mira, Cami! —dijo Noah.»).
   - MUCHAS onomatopeyas y sonidos: ¡pum!, ¡plaf!, ¡chof!, ¡brrr!, ¡pruuu!, ¡guau-guau!, ¡muac!, ¡crash!, ¡plof!
   - Humor físico y de situación: caídas suaves, sorpresas, sonidos graciosos, malentendidos chistosos. Niño de 6 años se ríe con cosas absurdas y con sonidos divertidos.
   - Repetición rítmica funciona muy bien: «Y caminó. Y caminó. Y caminó.»
   - Diminutivos cuando ayuden a la calidez: perrito, casita, ratoncito.

5. NO USES estas palabras formales — siempre prefiere su versión simple:
${SPANISH_AVOID.map((x) => "   - " + x).join("\n")}
   Y en general: NO uses palabras de las que un niño tenga que preguntar "¿qué significa?".

6. Estructura: principio - lío chiquito o aventura - desenlace cálido y esperanzador. Nunca abrupto, nunca triste de final.

7. Personajes — esto es CRÍTICO. Usa los personajes EXACTOS que te doy. Para cada uno:
   - Mantén su nombre literal.
   - Cuando aparece en una escena, deja caer 1-2 detalles visuales suyos de pasada (su pelo, su ropa, un accesorio) — pero nunca lo describas de forma técnica como en una ficha.
   - Sus rasgos de personalidad (valiente, tímido, curioso, gruñón) DEBEN salir en cómo habla, cómo reacciona, qué decide. Un personaje tímido habla bajito o se esconde detrás del otro; un curioso se acerca y pregunta; un valiente da el primer paso.
   - Si tiene un comportamiento característico (ver "COMPORTAMIENTO ESPECIAL" abajo), inclúyelo donde tenga sentido en la historia.

8. Formato de salida:
   - Empieza con el TÍTULO en una sola línea.
   - Línea en blanco.
   - Después el cuerpo del cuento dividido en párrafos cortos (3-5 oraciones cada uno).
   - Sin comillas alrededor del título, sin "Título:", sin notas finales, sin moraleja explícita, sin disclaimers. Solo el cuento.`;
}

function englishSystem(ageBand: AgeBand, targetWords: number): string {
  return `You are a children's storyteller who writes original read-aloud bedtime / adventure stories. Your only job is to write one complete story, ready to read.

HARD RULES

1. Language: ENGLISH — natural, warm, conversational. American English baseline.

2. Target age: ${ageBand} years old. ${ENGLISH_REGISTER_NOTES[ageBand]}

3. Length: roughly ${targetWords} words (about 7 minutes read aloud).

4. REGISTER — simple, fun, kid-friendly language:
   - Use COMMON, CONCRETE words a 6-year-old uses every day.
   - SHORT sentences. Few subordinate clauses.
   - LOTS of dialogue using natural quote tags: "said," "yelled," "whispered."
   - LOTS of sound effects and onomatopoeia: POP! BANG! WHOOSH! SPLAT! CRUNCH! TOOT! PFFT! PSSST! BRRRR! WOOF-WOOF!
   - Physical and situational humor: gentle pratfalls, silly surprises, funny noises, kid-logic misunderstandings.
   - Rhythmic repetition works great: "And he walked. And he walked. And he walked."
   - Tiny words of affection when they help warmth.

5. DO NOT USE these formal/adult words — always prefer the simple version:
${ENGLISH_AVOID.map((x) => "   - " + x).join("\n")}
   In general: NO words a kid would have to ask "what does that mean?"

6. Structure: beginning → small problem or adventure → warm hopeful ending. Never abrupt, never sad.

7. Characters — CRITICAL. Use the EXACT characters I give you. For each:
   - Keep their exact name.
   - When they appear in a scene, drop 1-2 visual details naturally (their hair, their outfit, an accessory) — never as a technical character-sheet description.
   - Their personality traits (brave, shy, curious, grumpy) MUST come through in HOW they speak, react, and decide. A shy character whispers or hides behind another; a curious one leans in and asks; a brave one takes the first step.
   - If a character has a SPECIAL BEHAVIOR (see below), include it where it makes sense in the story.

8. Output format:
   - Start with the TITLE on a single line.
   - Blank line.
   - Then the story body in short paragraphs (3-5 sentences each).
   - No quotes around the title, no "Title:" prefix, no closing notes, no explicit moral, no disclaimers. Just the story.`;
}

export function buildKidStorySystemPrompt(
  ageBand: AgeBand,
  targetWords: number,
  language: StoryLanguage,
): string {
  return language === "en"
    ? englishSystem(ageBand, targetWords)
    : spanishSystem(ageBand, targetWords);
}

export function buildKidStoryUserPrompt(args: {
  protagonists: KidCharacter[];
  setting: string;
  theme: string;
  forChild: string;
  targetWords: number;
  language: StoryLanguage;
}): string {
  const isEs = args.language === "es";

  // Collect any special story behaviors for cast members (e.g. Cutie's fart gag).
  const behaviors = args.protagonists
    .map((c) => getStoryBehavior(c))
    .filter((b): b is string => Boolean(b));

  if (isEs) {
    const cast = args.protagonists.length === 0
      ? "Tú eliges el protagonista, algo cálido y apropiado para la edad."
      : args.protagonists.map((c, i) => {
          const parts = [`${i + 1}. ${c.name} — ${c.kind}`];
          if (c.description) parts.push(`   Cómo es: ${c.description}`);
          if (c.traits.length > 0) parts.push(`   Personalidad: ${c.traits.join(", ")}`);
          return parts.join("\n");
        }).join("\n\n");

    const lines = [
      "Escríbeme un cuento original con estos elementos:",
      "",
      "PERSONAJES (úsalos exactamente; sus rasgos guían sus acciones y diálogos):",
      cast,
      "",
      `Escenario: ${args.setting || "Tú decides un escenario cálido."}`,
      `Tema o idea: ${args.theme || "Tú escoges algo cálido y divertido."}`,
      args.forChild ? `Dedicado a: ${args.forChild}` : "",
      "",
      `Longitud objetivo: ~${args.targetWords} palabras.`,
    ];
    if (behaviors.length > 0) {
      lines.push("");
      lines.push("COMPORTAMIENTO ESPECIAL (obligatorio para personajes con esta nota):");
      behaviors.forEach((b) => lines.push(`- ${b}`));
    }
    return lines.filter(Boolean).join("\n");
  }

  // English version
  const cast = args.protagonists.length === 0
    ? "You pick the main character — something warm and age-appropriate."
    : args.protagonists.map((c, i) => {
        const parts = [`${i + 1}. ${c.name} — ${c.kind}`];
        if (c.description) parts.push(`   What they're like: ${c.description}`);
        if (c.traits.length > 0) parts.push(`   Personality: ${c.traits.join(", ")}`);
        return parts.join("\n");
      }).join("\n\n");

  const lines = [
    "Write me an original story with these elements:",
    "",
    "CHARACTERS (use them exactly; their traits drive their actions and dialogue):",
    cast,
    "",
    `Setting: ${args.setting || "Pick a warm setting yourself."}`,
    `Theme or idea: ${args.theme || "Pick something warm and funny yourself."}`,
    args.forChild ? `Dedicated to: ${args.forChild}` : "",
    "",
    `Target length: ~${args.targetWords} words.`,
  ];
  if (behaviors.length > 0) {
    lines.push("");
    lines.push("SPECIAL BEHAVIORS (mandatory for any character with this note):");
    behaviors.forEach((b) => lines.push(`- ${b}`));
  }
  return lines.filter(Boolean).join("\n");
}
