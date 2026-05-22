import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { listKidStories } from "../db/kidStories";
import { getKidCharactersByIds } from "../db/kidCharacters";
import type { KidStory, KidCharacter } from "../db/types";
import { ModeToggle } from "../components/ModeToggle";

export function KidsDashboardScreen() {
  const go = useNav((s) => s.go);
  const [stories, setStories] = useState<KidStory[] | null>(null);
  const [castByStory, setCastByStory] = useState<Record<string, KidCharacter[]>>({});

  useEffect(() => {
    (async () => {
      const list = await listKidStories();
      setStories(list);
      const cast: Record<string, KidCharacter[]> = {};
      for (const s of list) {
        cast[s.id] = await getKidCharactersByIds(s.protagonistIds);
      }
      setCastByStory(cast);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex flex-col gap-4 mb-10">
        <ModeToggle active="kids" />
        <div className="flex items-baseline justify-between">
          <h1 className="text-4xl font-medium text-ink">Cuentos para niños</h1>
          <nav className="flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => go({ name: "kids-characters" })}
              className="text-ink/70 hover:text-ink"
            >
              Personajes
            </button>
            <button
              type="button"
              onClick={() => go({ name: "settings" })}
              className="text-ink/60 hover:text-ink"
            >
              Ajustes
            </button>
          </nav>
        </div>
      </header>

      <button
        type="button"
        onClick={() => go({ name: "kids-new" })}
        className="w-full rounded-2xl bg-warm px-8 py-8 text-2xl font-medium text-white shadow-md hover:bg-warm/90 active:scale-[0.99] transition"
      >
        Nuevo cuento
      </button>

      <div className="mt-10">
        {stories === null ? (
          <p className="text-ink/50">Cargando…</p>
        ) : stories.length === 0 ? (
          <p className="text-ink/60 text-center mt-6">
            Aún no has creado cuentos. Toca <strong>Nuevo cuento</strong> para empezar.
          </p>
        ) : (
          <ul className="space-y-3">
            {stories.map((s) => {
              const cast = castByStory[s.id] ?? [];
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go({ name: "kids-story", kidStoryId: s.id })}
                    className="block w-full text-left rounded-xl border border-ink/10 bg-white px-5 py-4 hover:border-warm/60 hover:shadow-sm transition"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-base font-medium text-ink">
                        {s.title || "Cuento sin título"}
                      </span>
                      <span className="text-xs text-ink/50">{s.ageBand} años</span>
                    </div>
                    {cast.length > 0 && (
                      <p className="mt-1 text-xs text-ink/55">
                        Con: {cast.map((c) => c.name).join(", ")}
                      </p>
                    )}
                    {s.setting && (
                      <p className="mt-1 text-sm text-ink/65 line-clamp-1">{s.setting}</p>
                    )}
                    {s.forChild && (
                      <p className="mt-1 text-xs text-warm">Para {s.forChild}</p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
