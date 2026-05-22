import { useState } from "react";
import { useNav } from "../store/nav";
import { useSettings } from "../store/settings";

interface Slide {
  title: string;
  body: string;
  hint?: string;
}

const SLIDES: Slide[] = [
  {
    title: "Cuéntame las historias de tu vida",
    body:
      "Esta aplicación es como tener a alguien que te escucha con paciencia. Tú hablas, ella escribe todo, y poco a poco vamos juntando las historias de tu vida.",
    hint: "Tómate tu tiempo. No hay prisa.",
  },
  {
    title: "Así funciona",
    body:
      "Tocas «Nueva historia». Te pregunto algunas cosas — cuándo pasó, dónde, quién estaba contigo. Después tocas el botón rojo y empiezas a contar. Cuando termines de hablar, paras la grabación.",
    hint: "Puedes grabar varias veces en la misma sesión, como si fuera una conversación.",
  },
  {
    title: "Te haré preguntas para recordar mejor",
    body:
      "Después de cada grabación, te haré una pregunta para ayudarte a recordar más detalles. ¿Cómo olía la cocina? ¿Cómo era la voz de tu abuela? ¿Qué llevabas puesto? Los detalles pequeños son los que hacen que una historia cobre vida.",
  },
  {
    title: "Cosas que ayudan a empezar",
    body:
      "Antes de grabar, cierra los ojos un momento y vuelve a aquel lugar. Piensa en el clima, los olores, la ropa que llevabas, la comida que se cocinaba, las voces que escuchabas, lo que sentiste por dentro. Cuanto más vívido sea para ti, más vívido será para quien lea tu historia.",
    hint: "Si no sabes por dónde empezar, toca «¿De qué hablar hoy?» para ver ideas.",
  },
  {
    title: "Tu historia es tuya",
    body:
      "Todo lo que grabes se guarda solo en este dispositivo. Nada se sube a internet, salvo lo necesario para escribir lo que dices y proponer preguntas. Puedes descargar una copia de seguridad cuando quieras desde Ajustes.",
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
    <div className="mx-auto max-w-xl px-6 py-10 flex flex-col min-h-svh">
      <header className="flex items-baseline justify-between mb-10">
        <span className="text-xs text-ink/40 uppercase tracking-wide">
          {i + 1} / {SLIDES.length}
        </span>
        <button
          type="button"
          onClick={finish}
          className="text-sm text-ink/50 hover:text-ink"
        >
          Saltar
        </button>
      </header>

      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-3xl font-medium text-ink mb-5 leading-tight">
          {slide.title}
        </h1>
        <p className="text-lg text-ink/80 leading-relaxed">{slide.body}</p>
        {slide.hint && (
          <p className="mt-5 text-base text-warm">{slide.hint}</p>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        {i > 0 ? (
          <button
            type="button"
            onClick={() => setI(i - 1)}
            className="text-base text-ink/60 hover:text-ink"
          >
            ← Atrás
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => (isLast ? finish() : setI(i + 1))}
          className="rounded-lg bg-warm px-6 py-3 text-base font-medium text-white hover:bg-warm/90"
        >
          {isLast ? "Empezar" : "Siguiente →"}
        </button>
      </div>

      {/* Dots */}
      <div className="mt-6 flex justify-center gap-1.5">
        {SLIDES.map((_, j) => (
          <span
            key={j}
            className={
              "size-1.5 rounded-full " +
              (j === i ? "bg-warm" : "bg-ink/15")
            }
          />
        ))}
      </div>
    </div>
  );
}
