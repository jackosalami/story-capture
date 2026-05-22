import { useState } from "react";
import { useNav } from "../store/nav";
import { useSettings } from "../store/settings";

interface Slide {
  badge: string;
  decoration: string;
  title: string;
  body: string;
  hint?: string;
}

const SLIDES: Slide[] = [
  {
    badge: "Bienvenida",
    decoration: "🪶",
    title: "Cuéntame las historias de tu vida",
    body:
      "Esta aplicación es como tener a alguien que te escucha con paciencia. Tú hablas, ella escribe todo, y poco a poco vamos juntando las historias de tu vida.",
    hint: "Tómate tu tiempo. No hay prisa.",
  },
  {
    badge: "Así funciona",
    decoration: "🎙️",
    title: "Tocas el botón y empiezas a contar",
    body:
      "Toca «Nueva historia», y cuando estés lista, toca el botón rojo. Habla con calma. Cuando termines, paras la grabación. Puedes grabar varias veces en la misma sesión, como una conversación.",
  },
  {
    badge: "Acompañamiento",
    decoration: "💬",
    title: "Te haré preguntas para recordar mejor",
    body:
      "Después de cada grabación, te haré una pregunta para que recuerdes más detalles. ¿Cómo olía la cocina? ¿Cómo era la voz de tu abuela? ¿Qué llevabas puesto? Los detalles pequeños son los que dan vida a una historia.",
  },
  {
    badge: "Para empezar",
    decoration: "🌅",
    title: "Vuelve un momento al recuerdo",
    body:
      "Antes de grabar, cierra los ojos y vuelve a aquel lugar. Piensa en el clima, los olores, la ropa que llevabas, la comida que se cocinaba, las voces que escuchabas, lo que sentías por dentro.",
    hint: "Si no sabes por dónde empezar, toca «¿De qué hablar hoy?» para ver ideas.",
  },
  {
    badge: "Tu privacidad",
    decoration: "🔒",
    title: "Todo se guarda en tu dispositivo",
    body:
      "Nada de lo que grabes vive en internet, salvo cuando se transcribe y se proponen preguntas. Puedes descargar una copia de seguridad cuando quieras desde Ajustes.",
  },
];

export function WalkthroughScreen() {
  const go = useNav((s) => s.go);
  const markSeen = useSettings((s) => s.setHasSeenWalkthrough);
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const isLast = i === SLIDES.length - 1;

  function finish() {
    markSeen(true);
    go({ name: "dashboard" });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 flex flex-col min-h-svh">
      <header className="flex items-center justify-between mb-12">
        <span className="text-xs text-ink-soft uppercase tracking-widest font-medium">
          {slide.badge} · {i + 1} / {SLIDES.length}
        </span>
        <button
          type="button"
          onClick={finish}
          className="text-sm text-ink-soft hover:text-ink underline-offset-2 hover:underline"
        >
          Saltar
        </button>
      </header>

      <div className="flex-1 flex flex-col justify-center">
        <div
          aria-hidden
          className="text-7xl mb-8 select-none"
          style={{ filter: "drop-shadow(0 6px 18px rgba(184, 92, 31, 0.18))" }}
        >
          {slide.decoration}
        </div>
        <h1 className="h-serif text-4xl md:text-5xl text-ink mb-6 leading-tight">
          {slide.title}
        </h1>
        <p className="text-lg md:text-xl text-ink-soft leading-relaxed">{slide.body}</p>
        {slide.hint && (
          <p className="mt-5 text-base text-warm-deep italic">{slide.hint}</p>
        )}
      </div>

      <div className="mt-12 flex items-center justify-between">
        {i > 0 ? (
          <button
            type="button"
            onClick={() => setI(i - 1)}
            className="text-base text-ink-soft hover:text-ink"
          >
            ← Atrás
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => (isLast ? finish() : setI(i + 1))}
          className="rounded-full bg-warm px-8 py-3.5 text-base font-medium text-white shadow-md hover:bg-warm-deep transition active:translate-y-px"
        >
          {isLast ? "Empezar" : "Siguiente →"}
        </button>
      </div>

      <div className="mt-8 flex justify-center gap-2">
        {SLIDES.map((_, j) => (
          <button
            key={j}
            type="button"
            onClick={() => setI(j)}
            aria-label={`Ir a paso ${j + 1}`}
            className={
              "h-1.5 rounded-full transition-all " +
              (j === i ? "w-8 bg-warm" : "w-1.5 bg-ink/15 hover:bg-ink/30")
            }
          />
        ))}
      </div>
    </div>
  );
}
