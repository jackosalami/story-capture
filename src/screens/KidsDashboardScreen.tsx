import { useEffect, useState } from "react";
import { useNav } from "../store/nav";
import { listKidStories } from "../db/kidStories";
import { getKidCharactersByIds } from "../db/kidCharacters";
import type { KidStory, KidCharacter } from "../db/types";
import { ModeToggle } from "../components/ModeToggle";
import {
  DragonMascot,
  StarMascot,
  MoonMascot,
  Sparkle,
  avatarForKind,
} from "../components/Mascots";

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
    <div className="relative overflow-hidden">
      {/* Decorative floating sparkles */}
      <div aria-hidden className="absolute inset-0 sparkle-field pointer-events-none" />
      <Sparkle className="absolute top-16 left-10 w-5 h-5 text-sun blob-drift" />
      <Sparkle className="absolute top-24 right-16 w-4 h-4 text-strawberry blob-drift" />
      <Sparkle className="absolute top-72 left-1/4 w-3 h-3 text-grape blob-drift" />

      <div className="relative mx-auto max-w-3xl px-6 pt-8 pb-16">
        <div className="flex justify-center mb-8">
          <ModeToggle active="kids" />
        </div>

        <header className="mb-10 relative">
          <div className="flex items-end justify-between">
            <div>
              <p className="h-display text-strawberry text-sm uppercase tracking-widest font-semibold">
                ¡Hora del cuento!
              </p>
              <h1 className="h-display text-5xl md:text-6xl text-night leading-none mt-2">
                Cuentos para niños
              </h1>
              <p className="mt-3 text-night/70 text-lg">
                Crea aventuras de 7 minutos con los personajes que tú escoges.
              </p>
            </div>
            <DragonMascot className="kid-avatar bob hidden sm:block w-28 h-28 shrink-0" />
          </div>

          <nav className="mt-6 flex flex-wrap items-center gap-2 text-sm h-display font-medium">
            <button
              type="button"
              onClick={() => go({ name: "kids-shelf" })}
              className="rounded-full bg-white/80 border border-night/10 px-4 py-1.5 text-night hover:bg-white shadow-sm"
            >
              📚 Mi librero
            </button>
            <button
              type="button"
              onClick={() => go({ name: "kids-characters" })}
              className="rounded-full bg-white/80 border border-night/10 px-4 py-1.5 text-night hover:bg-white shadow-sm"
            >
              🧙 Personajes
            </button>
            <button
              type="button"
              onClick={() => go({ name: "settings" })}
              className="rounded-full bg-white/80 border border-night/10 px-4 py-1.5 text-night hover:bg-white shadow-sm"
            >
              ⚙️ Ajustes
            </button>
          </nav>
        </header>

        <button
          type="button"
          onClick={() => go({ name: "kids-new" })}
          className="btn-3d kid-button group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-strawberry via-tangerine to-sun text-white px-8 py-10 text-left"
          style={{ borderBottomColor: "#d63b73" }}
        >
          <span className="block h-display text-2xl">¡Nuevo cuento!</span>
          <span className="block mt-1 text-white/90 text-base">
            Escoge personajes, escenario y aventura.
          </span>
          <StarMascot className="absolute -right-4 -bottom-6 w-32 h-32 kid-avatar opacity-90" />
          <Sparkle className="absolute top-6 right-14 w-5 h-5 text-white/70 blob-drift" />
        </button>

        <div className="mt-10">
          {stories === null ? (
            <p className="text-night/50 text-center">Cargando…</p>
          ) : stories.length === 0 ? (
            <EmptyKidsState />
          ) : (
            <ul className="space-y-4">
              {stories.map((s) => {
                const cast = castByStory[s.id] ?? [];
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => go({ name: "kids-story", kidStoryId: s.id })}
                      className="kid-card block w-full text-left rounded-3xl px-6 py-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex -space-x-2 shrink-0">
                          {cast.length > 0
                            ? cast.slice(0, 3).map((c) => (
                                <span
                                  key={c.id}
                                  className="size-12 rounded-full bg-gradient-to-br from-grape-soft to-strawberry-soft border-2 border-white shadow-sm flex items-center justify-center text-2xl"
                                  title={c.name}
                                >
                                  {avatarForKind(c.kind)}
                                </span>
                              ))
                            : (
                              <span className="size-12 rounded-full bg-cloud border-2 border-white shadow-sm flex items-center justify-center text-2xl">
                                📖
                              </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="h-display text-xl text-night truncate">
                              {s.title || "Cuento sin título"}
                            </span>
                            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider bg-sky-soft text-sky-700 px-2 py-0.5 rounded-full">
                              {s.ageBand} años
                            </span>
                          </div>
                          {s.setting && (
                            <p className="mt-1 text-sm text-night/70 line-clamp-1">{s.setting}</p>
                          )}
                          {cast.length > 0 && (
                            <p className="mt-1 text-xs text-night/55">
                              {cast.map((c) => c.name).join(" · ")}
                            </p>
                          )}
                          {s.forChild && (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs text-strawberry font-medium">
                              💝 Para {s.forChild}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyKidsState() {
  return (
    <div className="mt-10 mx-auto max-w-md text-center">
      <MoonMascot className="mx-auto w-32 h-32 kid-avatar bob" />
      <p className="mt-6 h-display text-2xl text-night">
        Ningún cuento todavía
      </p>
      <p className="mt-2 text-night/70 leading-relaxed">
        Toca <strong>¡Nuevo cuento!</strong> y deja que tus personajes vivan una aventura.
      </p>
    </div>
  );
}
