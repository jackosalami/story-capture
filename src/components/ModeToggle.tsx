import { useNav, type Workspace } from "../store/nav";

interface Props {
  active: Workspace;
}

export function ModeToggle({ active }: Props) {
  const go = useNav((s) => s.go);
  return (
    <div className="inline-flex rounded-full bg-ink/5 p-1 text-sm">
      <button
        type="button"
        onClick={() => go({ name: "dashboard" })}
        className={
          "rounded-full px-4 py-1.5 font-medium transition " +
          (active === "memoir"
            ? "bg-white text-ink shadow-sm"
            : "text-ink/60 hover:text-ink")
        }
      >
        Mis historias
      </button>
      <button
        type="button"
        onClick={() => go({ name: "kids-dashboard" })}
        className={
          "rounded-full px-4 py-1.5 font-medium transition " +
          (active === "kids"
            ? "bg-white text-ink shadow-sm"
            : "text-ink/60 hover:text-ink")
        }
      >
        Cuentos para niños
      </button>
    </div>
  );
}
