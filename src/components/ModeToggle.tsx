import { useNav, type Workspace } from "../store/nav";

interface Props {
  active: Workspace;
}

export function ModeToggle({ active }: Props) {
  const go = useNav((s) => s.go);
  const isMemoir = active === "memoir";
  return (
    <div className="inline-flex rounded-full bg-white/70 backdrop-blur-sm border border-ink/10 p-1 text-sm shadow-sm">
      <button
        type="button"
        onClick={() => go({ name: "dashboard" })}
        className={
          "rounded-full px-5 py-2 font-medium transition " +
          (isMemoir
            ? "bg-warm text-white shadow"
            : "text-ink/55 hover:text-ink")
        }
      >
        📖 Mis historias
      </button>
      <button
        type="button"
        onClick={() => go({ name: "kids-dashboard" })}
        className={
          "rounded-full px-5 py-2 font-medium transition " +
          (!isMemoir
            ? "bg-grape text-white shadow"
            : "text-ink/55 hover:text-ink")
        }
      >
        🌈 Cuentos para niños
      </button>
    </div>
  );
}
