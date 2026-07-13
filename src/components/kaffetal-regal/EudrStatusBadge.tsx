"use client";

import type { EudrStatus } from "@/lib/eudr";

// Explicit, semantically-clear status colors (not the theme --accent, which is
// a muted brown in the Kaffetal theme and made "Pendiente" read as plain text):
// green = Apta, amber = Pendiente, red = No apta.
const TONE_COLOR: Record<EudrStatus["tone"], string> = {
  ok: "#2E7D46",
  pend: "#B45309",
  stop: "#C8102F",
};

export function EudrStatusBadge({ status }: { status: EudrStatus }) {
  const color = TONE_COLOR[status.tone];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11.5,
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: 999,
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid ${color}`,
      }}
    >
      {status.label}
    </span>
  );
}
