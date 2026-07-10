"use client";

import type { EudrStatus } from "@/lib/eudr";

const TONE_COLOR: Record<EudrStatus["tone"], string> = {
  ok: "var(--green)",
  pend: "var(--accent)",
  stop: "var(--red)",
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
