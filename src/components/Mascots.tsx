// Inline SVG mascots for the kids workspace.
// Per research, SVG > emoji for hero areas — feels intentional, not lazy.

interface Props {
  className?: string;
}

export function DragonMascot({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      {/* body */}
      <ellipse cx="60" cy="74" rx="38" ry="32" fill="#a78bfa" />
      <ellipse cx="60" cy="78" rx="28" ry="22" fill="#c4b5fd" />
      {/* wings */}
      <path d="M22 55 Q5 50 8 75 Q18 70 26 70 Z" fill="#8b5cf6" />
      <path d="M98 55 Q115 50 112 75 Q102 70 94 70 Z" fill="#8b5cf6" />
      {/* eyes */}
      <circle cx="48" cy="62" r="5" fill="#ffffff" />
      <circle cx="72" cy="62" r="5" fill="#ffffff" />
      <circle cx="49" cy="63" r="2.5" fill="#2d1b4e" />
      <circle cx="73" cy="63" r="2.5" fill="#2d1b4e" />
      <circle cx="50" cy="62" r="0.9" fill="#ffffff" />
      <circle cx="74" cy="62" r="0.9" fill="#ffffff" />
      {/* cheek blush */}
      <circle cx="40" cy="74" r="3.5" fill="#ff6b9d" opacity="0.55" />
      <circle cx="80" cy="74" r="3.5" fill="#ff6b9d" opacity="0.55" />
      {/* smile */}
      <path d="M52 78 Q60 84 68 78" stroke="#2d1b4e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* horns */}
      <path d="M44 42 Q42 32 50 36 Z" fill="#ffd93d" stroke="#2d1b4e" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M76 42 Q78 32 70 36 Z" fill="#ffd93d" stroke="#2d1b4e" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function StarMascot({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <path
        d="M60 12 L70 44 L104 48 L78 70 L86 102 L60 86 L34 102 L42 70 L16 48 L50 44 Z"
        fill="#ffd93d"
        stroke="#f59e0b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* eyes */}
      <circle cx="52" cy="58" r="3.5" fill="#2d1b4e" />
      <circle cx="68" cy="58" r="3.5" fill="#2d1b4e" />
      <circle cx="52.8" cy="57" r="1" fill="#ffffff" />
      <circle cx="68.8" cy="57" r="1" fill="#ffffff" />
      {/* smile */}
      <path d="M52 68 Q60 75 68 68" stroke="#2d1b4e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="45" cy="65" r="3" fill="#ff6b9d" opacity="0.55" />
      <circle cx="75" cy="65" r="3" fill="#ff6b9d" opacity="0.55" />
    </svg>
  );
}

export function MoonMascot({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <path
        d="M82 30 A40 40 0 1 0 92 78 A30 30 0 1 1 82 30 Z"
        fill="#cbd5ff"
        stroke="#a78bfa"
        strokeWidth="2"
      />
      {/* nightcap */}
      <path d="M50 30 Q60 12 80 22 Z" fill="#ff6b9d" stroke="#2d1b4e" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="80" cy="22" r="3.5" fill="#ffd93d" stroke="#2d1b4e" strokeWidth="1" />
      {/* eyes (closed/sleepy) */}
      <path d="M50 60 Q55 64 60 60" stroke="#2d1b4e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M68 58 Q73 62 78 58" stroke="#2d1b4e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* tiny smile */}
      <path d="M58 72 Q65 76 72 72" stroke="#2d1b4e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* cheek */}
      <circle cx="55" cy="70" r="3" fill="#ff6b9d" opacity="0.55" />
    </svg>
  );
}

// Small inline sparkle, used as a decorative accent
export function Sparkle({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        d="M10 1 L11.5 8.5 L19 10 L11.5 11.5 L10 19 L8.5 11.5 L1 10 L8.5 8.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Returns a kind-appropriate emoji avatar for a KidCharacter
export function avatarForKind(kind: string): string {
  switch (kind) {
    case "niño":          return "🧒";
    case "animal":        return "🦊";
    case "criatura":      return "🐉";
    case "objeto mágico": return "✨";
    default:              return "🌟";
  }
}

export function colorForKind(kind: string): { bg: string; text: string; ring: string } {
  switch (kind) {
    case "niño":
      return { bg: "bg-sky-soft", text: "text-sky-700", ring: "ring-sky/40" };
    case "animal":
      return { bg: "bg-grass-soft", text: "text-emerald-800", ring: "ring-grass/40" };
    case "criatura":
      return { bg: "bg-grape-soft", text: "text-grape", ring: "ring-grape/40" };
    case "objeto mágico":
      return { bg: "bg-sun-soft", text: "text-amber-700", ring: "ring-sun/50" };
    default:
      return { bg: "bg-strawberry-soft", text: "text-strawberry", ring: "ring-strawberry/40" };
  }
}
