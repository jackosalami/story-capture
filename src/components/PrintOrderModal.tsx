// Phase 4: guided handoff for print-on-demand orders.
//
// We do not call any POD API directly (would require backend + secrets).
// Instead this modal:
//   1. Compares the realistic POD options for a 6×9 memoir (Lulu / KDP / Mixam)
//   2. On click, auto-downloads the PDF AND opens the POD's upload page in a
//      new tab, with step-by-step instructions for which settings to choose.
//
// The user pays the POD directly. Zero infra cost for us.

import { useState } from "react";

interface Vendor {
  key: "lulu" | "kdp" | "mixam";
  name: string;
  url: string;
  emoji: string;
  paperback: string;
  hardcover: string;
  highlights: string[];
  tradeoffs: string[];
  instructionTitle: string;
  steps: string[];
}

const VENDORS: Vendor[] = [
  {
    key: "lulu",
    name: "Lulu",
    url: "https://www.lulu.com/create/print-books",
    emoji: "📕",
    paperback: "~$12 – $20 USD",
    hardcover: "~$25 – $40 USD",
    highlights: [
      "Especialistas en autores independientes y memoirs",
      "Soporta hardcover desde 1 copia",
      "Buena calidad de papel crema, ideal para texto largo",
    ],
    tradeoffs: [
      "Envío internacional es lento (10-21 días)",
      "Costo de envío puede ser tan alto como el libro",
    ],
    instructionTitle: "En Lulu (en la pestaña nueva):",
    steps: [
      "Toca «Get started» o «Create» y selecciona «Print book».",
      "Tamaño: **6 × 9 pulgadas** (Trade — Royal).",
      "Tipo de papel: **70lb crema** (cream/uncoated) — más cálido para memoir.",
      "Encuadernación: **Paperback** (~$15) o **Hardcover Linen** (~$35) según preferencia.",
      "Acabado de portada: **Mate** suele verse más profesional para memoir.",
      "Sube el PDF que acabamos de descargar.",
      "Lulu calculará el número de páginas y te dará el precio final + envío.",
      "Paga y listo — Lulu imprime y manda a tu dirección.",
    ],
  },
  {
    key: "kdp",
    name: "Amazon KDP",
    url: "https://kdp.amazon.com/en_US/help/topic/G202145400",
    emoji: "📦",
    paperback: "~$5 – $12 USD",
    hardcover: "~$12 – $25 USD",
    highlights: [
      "Lo más barato por unidad",
      "Envío con Amazon Prime es rápido en EEUU/MX",
      "Puedes opcionalmente listarlo a la venta en Amazon (no obligatorio)",
    ],
    tradeoffs: [
      "Proceso de aprobación de Amazon más estricto (24-72 hrs)",
      "Necesitas darte de alta como autor con info fiscal",
      "Pide ISBN si quieres listarlo (gratis si usas el de Amazon)",
    ],
    instructionTitle: "En KDP (en la pestaña nueva):",
    steps: [
      "Crea cuenta o inicia sesión en KDP.",
      "«Create» → «Paperback» (o Hardcover si está disponible).",
      "En Book Details: idioma Español, título y autor.",
      "ISBN: usa el ISBN gratuito de Amazon (KDP-assigned).",
      "Manuscript: sube el PDF que acabamos de descargar.",
      "Trim size: **6 × 9 pulgadas**.",
      "Interior type: **Black & white interior with cream paper** (lo más estándar para memoir).",
      "Cover: usa Cover Creator de KDP o sube tu propia portada (asegúrate que el ancho del lomo coincida con tu número de páginas).",
      "Si NO quieres venderlo: en Pricing, selecciona solo «Author Copies» para imprimir copias para ti sin listarlo al público.",
    ],
  },
  {
    key: "mixam",
    name: "Mixam",
    url: "https://mixam.com/print-on-demand/photo-book",
    emoji: "📘",
    paperback: "~$10 – $18 USD",
    hardcover: "~$25 – $45 USD",
    highlights: [
      "Calidad de impresión excelente, brillante",
      "Originario del UK pero envía mundial",
      "Mejor para libros con MUCHAS imágenes",
    ],
    tradeoffs: [
      "Menos enfocado a memoirs de solo texto — overkill aquí",
      "Envío internacional puede ser caro",
    ],
    instructionTitle: "En Mixam (en la pestaña nueva):",
    steps: [
      "Selecciona «Books» en el menú principal.",
      "Tamaño: **6 × 9 inches** (US Trade) o el más cercano.",
      "Páginas: cantidad según el PDF.",
      "Paper inside: **Munken Cream 80gsm** o equivalente para memoir.",
      "Binding: **Perfect bound** (paperback) o **Casebound** (hardcover).",
      "Sube el PDF cuando te lo pida.",
      "Mixam calcula el precio final incluyendo envío.",
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onDownloadAndContinue: () => Promise<void>; // generates + downloads the PDF
}

export function PrintOrderModal({ open, onClose, onDownloadAndContinue }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  if (!open) return null;

  async function pick(vendor: Vendor) {
    setWorking(true);
    try {
      // Download the PDF first so the user has it ready when they land on the POD.
      await onDownloadAndContinue();
      // Open the POD's create-book page in a new tab.
      window.open(vendor.url, "_blank", "noopener,noreferrer");
      setExpanded(vendor.key);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 py-6"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-paper border-b border-ink/10 px-6 py-4 flex items-center justify-between">
          <h2 className="h-serif text-2xl text-ink">📦 Pedir copia impresa</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full size-8 flex items-center justify-center text-ink-soft hover:bg-ink/5 hover:text-ink text-xl"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-ink-soft leading-relaxed">
            Esta app genera el PDF listo para imprenta. Escoge un servicio de
            impresión-por-demanda, te entregamos el PDF y te llevamos a su sitio.
            Pagas directo al servicio. Te llega el libro a tu casa.
          </p>

          <div className="space-y-3">
            {VENDORS.map((v) => (
              <div
                key={v.key}
                className="rounded-2xl border border-ink/10 bg-white overflow-hidden"
              >
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="text-3xl shrink-0">{v.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="h-serif text-xl text-ink">{v.name}</h3>
                      <span className="text-xs text-ink-soft">
                        Paperback {v.paperback} · Hardcover {v.hardcover}
                      </span>
                    </div>
                    <ul className="mt-2 text-xs text-ink-soft space-y-1">
                      {v.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-1.5">
                          <span className="text-emerald-700">✓</span>
                          <span>{h}</span>
                        </li>
                      ))}
                      {v.tradeoffs.map((t) => (
                        <li key={t} className="flex items-start gap-1.5">
                          <span className="text-ink/40">·</span>
                          <span className="text-ink/55">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => pick(v)}
                    disabled={working}
                    className="shrink-0 rounded-full bg-warm px-4 py-2 text-sm font-medium text-white hover:bg-warm-deep disabled:opacity-50 whitespace-nowrap"
                  >
                    {working ? "Preparando…" : "Continuar"}
                  </button>
                </div>
                {expanded === v.key && (
                  <div className="border-t border-ink/10 bg-warm-soft/40 px-5 py-4 text-sm text-ink/85">
                    <p className="h-serif text-base text-ink mb-2">{v.instructionTitle}</p>
                    <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                      {v.steps.map((step, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
                      ))}
                    </ol>
                    <p className="mt-3 text-xs text-ink-soft italic">
                      El PDF ya se descargó. Una vez en el sitio, súbelo cuando te lo pida.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-paper-deep/60 border border-ink/8 px-5 py-4 text-xs text-ink/70">
            <p className="font-medium text-ink mb-1">💡 ¿Qué te conviene?</p>
            <p className="leading-relaxed">
              Si quieres <strong>una copia para ti o regalo</strong> sin meterte en cuentas de autor:
              Lulu (más simple). Si quieres <strong>el precio más bajo</strong> y no te importa
              registrarte: KDP Author Copies. Si tu memoir tiene <strong>muchas fotos</strong>:
              Mixam por la calidad de impresión.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
