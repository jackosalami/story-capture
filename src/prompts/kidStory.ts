// Prompts for generating Spanish bedtime/adventure stories for kids.

import type { AgeBand, KidCharacter } from "../db/types";

const VOCAB_NOTE: Record<AgeBand, string> = {
  "3-5":
    "Vocabulario muy sencillo, frases cortas. Muchas onomatopeyas (pum, tic-tac, muac). Repetición rítmica. Sin conceptos abstractos.",
  "6-8":
    "Vocabulario sencillo pero variado. Frases de longitud media. Puede haber alguna palabra nueva si se entiende por el contexto. Diálogos breves.",
  "9-12":
    "Vocabulario más rico. Frases de longitud variada. Puede incluir descripciones más elaboradas y dilemas morales pequeños. Mantén el ritmo dinámico.",
};

export function buildKidStorySystemPrompt(ageBand: AgeBand, targetWords: number): string {
  return `Eres una cuentista en español que escribe cuentos infantiles originales para leer en voz alta a la hora de dormir o durante un rato tranquilo. Tu único trabajo es escribir un cuento completo, listo para leer.

Reglas obligatorias:

1. **Idioma**: Español natural y cálido, latinoamericano-neutro, fácil de leer en voz alta. Sin anglicismos.

2. **Edad**: ${ageBand} años. ${VOCAB_NOTE[ageBand]}

3. **Longitud**: Aproximadamente ${targetWords} palabras, lo que equivale a unos 7 minutos de lectura en voz alta. No te quedes corto ni te pases mucho.

4. **Estructura**: Cuento con principio, nudo y desenlace claros. Un pequeño obstáculo o aventura que el protagonista resuelve. El final debe dejar una sensación cálida o esperanzadora — nunca abrupta ni triste.

5. **Tono**: Cálido, imaginativo, juguetón. Usa imágenes vivas (olores, sonidos, texturas, colores) sin abusar de los adjetivos. Permite momentos de humor y ternura.

6. **Personajes**: Usa exactamente los personajes que el usuario te da. Respeta su nombre, su naturaleza (niño, animal, criatura, etc.) y su descripción. No inventes protagonistas nuevos, pero puedes añadir personajes secundarios pequeños si la historia lo pide.

7. **Lección o tema**: Si el usuario te da un tema (valentía, compartir, perder el miedo a la oscuridad…), inclúyelo de forma natural a través de las acciones del protagonista. NUNCA lo digas como moraleja explícita al final. Que el niño lo sienta, no que se lo expliquen.

8. **Formato de salida**:
   - Empieza con el título en una sola línea.
   - Línea en blanco.
   - Después el cuerpo del cuento dividido en párrafos cortos (3-5 oraciones cada uno) para que sea cómodo de leer en voz alta.
   - Sin comillas alrededor del título. Sin "Título:", sin "Cuento:", sin notas, sin disclaimers, sin nada antes o después del cuento.

9. **Diálogo**: Cuando haya diálogo, usa raya (—) al estilo español:
   —¡Mira lo que encontré! —dijo Lucas.`;
}

export function buildKidStoryUserPrompt(args: {
  protagonists: KidCharacter[];
  setting: string;
  theme: string;
  forChild: string;
  targetWords: number;
}): string {
  const cast = args.protagonists.length === 0
    ? "El protagonista lo eliges tú: un personaje cálido, apropiado para la edad."
    : args.protagonists.map((c) => {
        const traits = c.traits.length > 0 ? ` (rasgos: ${c.traits.join(", ")})` : "";
        const desc = c.description ? ` — ${c.description}` : "";
        return `- ${c.name}, ${c.kind}${desc}${traits}`;
      }).join("\n");

  const lines = [
    "Escríbeme un cuento original con estos elementos:",
    "",
    "Personajes:",
    cast,
    "",
    `Escenario: ${args.setting || "Tú decides un escenario cálido y adecuado."}`,
    `Tema o lección: ${args.theme || "Tú escoges algo apropiado y cálido."}`,
    args.forChild ? `Dedicado a: ${args.forChild}` : "",
    "",
    `Longitud objetivo: ~${args.targetWords} palabras.`,
  ];
  return lines.filter(Boolean).join("\n");
}
