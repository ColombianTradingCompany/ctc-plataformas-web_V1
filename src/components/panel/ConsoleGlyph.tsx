import type { PanelConsoleKey } from "@/lib/panel/consoles";

// Minimalist single-weight line glyphs, one per console, tinted by `currentColor`:
//   BCP — a key: identity root, issues every credential.
//   ECP — an upward trend: direction, pricing, finances, network health.
//   OCP — a cycle: dispatch and relevos, the operational loop.
export function ConsoleGlyph({ console: key, size = 24, className }: { console: PanelConsoleKey; size?: number; className?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (key) {
    case "bcp":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="4.2" />
          <path d="M11 11l8 8" />
          <path d="M16.5 16.5l2-2" />
          <path d="M19 19l2-2" />
        </svg>
      );
    case "ecp":
      return (
        <svg {...common}>
          <path d="M4 17l5-5 3 3 7-7" />
          <path d="M15 8h5v5" />
        </svg>
      );
    case "ocp":
      return (
        <svg {...common}>
          <path d="M4.5 10a7.5 7.5 0 0 1 12.6-3.3L20 9.5" />
          <path d="M20 4.5v5h-5" />
          <path d="M19.5 14a7.5 7.5 0 0 1-12.6 3.3L4 14.5" />
          <path d="M4 19.5v-5h5" />
        </svg>
      );
  }
}
