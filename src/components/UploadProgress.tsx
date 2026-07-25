"use client";

import { useState } from "react";

// Shared upload-progress state + ring, used by every file-upload input across
// the platform (producer finca/lot media, BCP EUDR evidence, DC avatar…). The
// input's own component owns a useUpload(), passes `progress` as the onProgress
// callback of uploadKaffetalMediaWithProgress, and renders <UploadProgressRing>.
export type UploadStatus = "idle" | "uploading" | "done" | "error";
export type UploadState = { pct: number; status: UploadStatus };

export function useUpload() {
  const [state, setState] = useState<UploadState>({ pct: 0, status: "idle" });
  return {
    state,
    start: () => setState({ pct: 0, status: "uploading" }),
    // fraction is 0..1 from the XHR upload.onprogress
    progress: (fraction: number) => setState({ pct: Math.min(99, Math.round(fraction * 100)), status: "uploading" }),
    done: () => setState({ pct: 100, status: "done" }),
    fail: () => setState((s) => ({ pct: s.pct, status: "error" })),
    reset: () => setState({ pct: 0, status: "idle" }),
    // Convenience wrapper: start -> await the upload (which reports via `progress`)
    // -> done/fail from the boolean result. Returns the same boolean.
    run: async (upload: () => Promise<boolean>) => {
      setState({ pct: 0, status: "uploading" });
      const ok = await upload();
      setState((s) => (ok ? { pct: 100, status: "done" } : { pct: s.pct, status: "error" }));
      return ok;
    },
  };
}

// A compact circular progress ring. Shows a determinate arc while uploading, a
// check when done, and an ✕ on error. Renders nothing while idle.
export function UploadProgressRing({
  state,
  size = 34,
  label = true,
}: {
  state: UploadState;
  size?: number;
  /** Show the "NN%" / "Listo" / "Error" text beside the ring. */
  label?: boolean;
}) {
  if (state.status === "idle") return null;

  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = state.status === "done" ? 100 : state.pct;
  const dash = c * (1 - pct / 100);

  const track = "var(--line, #e2e2e2)";
  const active =
    state.status === "error" ? "var(--red, #C4402F)" : state.status === "done" ? "var(--green, #2E7D52)" : "var(--primary, #3C0A86)";

  return (
    <span
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-spline-mono), monospace" }}
    >
      <span style={{ position: "relative", width: size, height: size, flex: "none" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={active}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dash}
            style={{ transition: "stroke-dashoffset .18s ease, stroke .18s ease" }}
          />
        </svg>
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: state.status === "uploading" ? 8.5 : 13,
            fontWeight: 700,
            color: active,
            lineHeight: 1,
          }}
          aria-hidden
        >
          {state.status === "done" ? "✓" : state.status === "error" ? "✕" : pct}
        </span>
      </span>
      {label && (
        <span aria-hidden>
          {state.status === "done" ? "Listo" : state.status === "error" ? "Error" : `Subiendo… ${pct}%`}
        </span>
      )}
    </span>
  );
}
