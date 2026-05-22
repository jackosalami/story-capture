// Multi-select chip picker for fixed-vocabulary tags (environment, mood).
// Plus a free-text input that can add arbitrary chips.

import { useState } from "react";

interface Props {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export function ChipPicker({
  options,
  selected,
  onChange,
  allowCustom = true,
  customPlaceholder = "Otra…",
}: Props) {
  const [custom, setCustom] = useState("");

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    if (!selected.includes(v)) onChange([...selected, v]);
    setCustom("");
  }

  // All values to render = options + any custom selected values not in options
  const allChips = Array.from(new Set([...options, ...selected]));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {allChips.map((chip) => {
          const isSelected = selected.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggle(chip)}
              className={
                "rounded-full border px-3 py-1 text-sm transition " +
                (isSelected
                  ? "bg-warm text-white border-warm"
                  : "bg-white text-ink border-ink/20 hover:border-warm/60")
              }
            >
              {chip}
            </button>
          );
        })}
      </div>
      {allowCustom && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={customPlaceholder}
            className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:border-warm focus:ring-2 focus:ring-warm/20"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.trim()}
            className="rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink/70 hover:border-warm/60 disabled:opacity-40"
          >
            Añadir
          </button>
        </div>
      )}
    </div>
  );
}
