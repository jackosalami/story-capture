// Curated Spanish topic prompts — verbatim from PRD §6.6.
// Each topic offers a suggested mood/theme tag so stories pre-tag themselves.

export interface Topic {
  id: string;
  theme: string; // short label
  prompt: string; // the question that gets the storyteller talking
  suggestedMood: string[];
}

export const TOPICS: Topic[] = [
  { id: "infancia",      theme: "Mi infancia",            prompt: "¿Cómo era tu casa cuando eras niña?",                       suggestedMood: ["infancia"] },
  { id: "familia",       theme: "Mi familia",             prompt: "¿Quién era la persona más importante en tu familia?",       suggestedMood: ["familia"] },
  { id: "cambio",        theme: "Un momento que cambió todo", prompt: "¿Cuál fue un momento que cambió el rumbo de tu vida?",  suggestedMood: ["aventura"] },
  { id: "amor",          theme: "El amor",                prompt: "¿Cómo conociste a tu pareja?",                              suggestedMood: ["amor"] },
  { id: "cocina",        theme: "La cocina",              prompt: "¿Cuál era tu comida favorita de niña? ¿Quién la preparaba?", suggestedMood: ["familia", "infancia"] },
  { id: "barrio",        theme: "El barrio",              prompt: "¿Cómo era tu barrio o pueblo?",                             suggestedMood: ["infancia"] },
  { id: "escuela",       theme: "La escuela",             prompt: "¿Cuál es tu recuerdo más fuerte de la escuela?",            suggestedMood: ["infancia"] },
  { id: "trabajo",       theme: "El trabajo",             prompt: "¿Cuál fue tu primer trabajo?",                              suggestedMood: ["trabajo"] },
  { id: "tradiciones",   theme: "Las tradiciones",        prompt: "¿Qué tradiciones familiares recuerdas?",                    suggestedMood: ["familia", "tradición"] },
  { id: "aventura",      theme: "Una aventura",           prompt: "¿Cuál fue el viaje más memorable de tu vida?",              suggestedMood: ["aventura"] },
  { id: "perdida",       theme: "La pérdida",             prompt: "¿Has perdido a alguien importante? ¿Cómo lo recuerdas?",    suggestedMood: ["pérdida"] },
  { id: "fe",            theme: "La fe",                  prompt: "¿Qué papel ha jugado la fe o la espiritualidad en tu vida?", suggestedMood: ["fe"] },
  { id: "amigos",        theme: "Los amigos",             prompt: "¿Quién fue tu mejor amigo o amiga de la infancia?",         suggestedMood: ["amistad", "infancia"] },
  { id: "musica",        theme: "La música",              prompt: "¿Qué canción te transporta a otro momento de tu vida?",     suggestedMood: ["alegría"] },
  { id: "consejo",       theme: "Un consejo",             prompt: "¿Qué consejo le darías a tu yo de 20 años?",                suggestedMood: ["esperanza"] },
  { id: "orgullo",       theme: "El orgullo",             prompt: "¿De qué logro te sientes más orgullosa?",                   suggestedMood: ["orgullo"] },
  { id: "maternidad",    theme: "La maternidad",          prompt: "¿Cómo fue convertirte en madre?",                           suggestedMood: ["familia", "amor"] },
  { id: "inmigracion",   theme: "La inmigración",         prompt: "¿Cómo fue dejar tu tierra?",                                suggestedMood: ["inmigración"] },
  { id: "fiestas",       theme: "Las fiestas",            prompt: "¿Cómo celebraban la Navidad o tu cumpleaños cuando eras niña?", suggestedMood: ["tradición", "infancia"] },
  { id: "este_año",      theme: "Este año",               prompt: "¿Qué ha sido lo más significativo de este último año?",     suggestedMood: ["esperanza"] },
];
