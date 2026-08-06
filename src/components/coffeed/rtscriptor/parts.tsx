"use client";

// ── RT-Scriptor · las piezas pequeñas ────────────────────────────────────────
// Puerto 1:1 de la sección "SMALL PARTS" del prototipo, más las dos que trajo
// la V1: `Portrait` (que ya sabe que un personaje puede tener foto) y
// `PicSlots` (los tres huecos de imagen de la nota 3).

import { useRef, useState } from "react";
import { uploadRtsImage } from "@/lib/coffeed/rtScriptorActions";
import { PALETTE, tc, type Character, type CharPics, type ProjectCard } from "./model";

/** El globo de ayuda. Se VOLTEA solo cuando no cabe: en la V3.1 los de la
 *  columna derecha se salían de la pantalla y había que acordarse de pasarles
 *  `side="right"` a mano — es decir, se olvidaba. Ahora se mide al abrir. */
export function Info({ title, text, side }: { title: string; text: string; side?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState<"left" | "right">(side ?? "left");
  const ref = useRef<HTMLButtonElement>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && !side) {
      const r = ref.current?.getBoundingClientRect();
      // 290 = el ancho del globo más un respiro. Si no cabe a la derecha, se
      // ancla por el otro lado.
      setFlip(r && r.left + 290 > window.innerWidth ? "right" : "left");
    }
    setOpen((o) => !o);
  };

  return (
    <span className="rt-infowrap">
      <button type="button" ref={ref} className="rt-info" aria-label={`Sobre ${title}`} onClick={toggle}>
        i
      </button>
      {open && (
        <span className="rt-pop" data-side={side ?? flip} onClick={(e) => e.stopPropagation()}>
          <b>{title}</b>
          {text}
        </span>
      )}
    </span>
  );
}

/** El indicador de «está pasando algo». Existe porque sin él un botón
 *  deshabilitado no comunica nada y se vuelve a hacer clic — la misma lección
 *  que dejó escrita Coffeed con su aviso de «Trabajando». */
export function Spinner({ label }: { label?: string }) {
  return (
    <span className="rt-spin">
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity=".25" />
        <path d="M8 2 a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {label && <span>{label}…</span>}
    </span>
  );
}

export function Sheet({
  title,
  info,
  wide,
  onClose,
  children,
  footer,
}: {
  title: string;
  info?: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rt-scrim" onClick={onClose}>
      <div className="rt-sheet" data-wide={wide ? "1" : "0"} onClick={(e) => e.stopPropagation()}>
        <div className="rt-sheet-h">
          <h3>{title}</h3>
          {info && <Info title={title} text={info} />}
          <button type="button" className="rt-x" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="rt-sheet-b">{children}</div>
        {footer && <div className="rt-sheet-f">{footer}</div>}
      </div>
    </div>
  );
}

export const Field = ({ label, info, children }: { label: string; info?: string; children: React.ReactNode }) => (
  <div className="rt-field">
    <label>
      {label}
      {info && <Info title={label} text={info} />}
    </label>
    {children}
  </div>
);

export function Toggles<T extends { id: string; label: string; color?: string }>({
  items,
  value,
  onChange,
  colorKey,
}: {
  items: T[];
  value: string[];
  onChange: (v: string[]) => void;
  colorKey?: boolean;
}) {
  return (
    <div className="rt-pick">
      {items.map((it) => {
        const on = value.includes(it.id);
        return (
          <button
            type="button"
            key={it.id}
            className="rt-pk"
            data-on={on ? "1" : "0"}
            style={on ? { background: colorKey ? it.color : "var(--signal)", borderColor: colorKey ? it.color : "var(--signal)" } : undefined}
            onClick={() => onChange(on ? value.filter((v) => v !== it.id) : [...value, it.id])}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function Figure({ color = "#8E9793", h = 72 }: { color?: string; h?: number | string }) {
  return (
    <svg viewBox="0 0 64 76" width="100%" height={h} style={{ display: "block" }}>
      <circle cx="32" cy="24" r="12" fill="none" stroke={color} strokeWidth="1.6" />
      <path d="M32 36 L32 60 M32 42 L20 56 M32 42 L44 56" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 62 L56 62" stroke={color} strokeWidth="1" opacity=".5" />
    </svg>
  );
}

/** La foto de perfil si la hay; si no, la figura dibujada de siempre. Se usa en
 *  las filas de reparto, en los chips de la toma y en la columna de la escena —
 *  la nota del owner pedía justo eso: que la cara viaje donde va el personaje. */
export function Portrait({ ch, assets, h = 72 }: { ch: Character | undefined; assets: Record<string, string>; h?: number }) {
  const path = ch?.pics?.profile;
  const url = path ? assets[path] : null;
  if (url) return <img src={url} alt={ch?.name ?? ""} style={{ width: "100%", height: h, objectFit: "cover", display: "block" }} />;
  return <Figure color={ch?.color} h={h} />;
}

const SLOTS: { key: keyof CharPics; label: string }[] = [
  { key: "profile", label: "Perfil" },
  { key: "body", label: "Cuerpo" },
  { key: "detail", label: "Detalle" },
];

/** Los tres huecos de imagen de un personaje (nota 3). Sube a Storage y guarda
 *  la RUTA — el prototipo metía data-URLs en el estado, que en una `doc` de
 *  Postgres serían megabytes de base64 en cada guardado. */
export function PicSlots({
  pics,
  owner,
  assets,
  onChange,
  onAsset,
}: {
  pics: CharPics;
  owner: string;
  assets: Record<string, string>;
  onChange: (p: CharPics) => void;
  onAsset: (path: string, url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const slotRef = useRef<keyof CharPics>("profile");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pick = (key: keyof CharPics) => {
    slotRef.current = key;
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const key = slotRef.current;
    setBusy(key);
    setErr(null);
    const form = new FormData();
    form.set("file", file);
    form.set("scope", "character");
    form.set("owner", owner);
    const r = await uploadRtsImage(form);
    setBusy(null);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    onAsset(r.data.path, r.data.url);
    onChange({ ...pics, [key]: r.data.path });
  };

  return (
    <>
      <div className="rt-pics">
        {SLOTS.map((s) => {
          const path = pics?.[s.key] ?? null;
          const url = path ? assets[path] : null;
          return (
            <div key={s.key} className="rt-pic" data-has={url ? "1" : "0"}>
              {url && (
                <button
                  type="button"
                  className="rt-picx"
                  title={`Quitar ${s.label.toLowerCase()}`}
                  onClick={() => onChange({ ...pics, [s.key]: null })}
                >
                  ×
                </button>
              )}
              <button
                type="button"
                onClick={() => pick(s.key)}
                style={{ position: "absolute", inset: 0, background: "none", border: 0, padding: 0, cursor: "pointer" }}
                aria-label={`Subir ${s.label.toLowerCase()}`}
              >
                {url ? <img src={url} alt={s.label} /> : busy === s.key ? <Spinner /> : <i>+</i>}
              </button>
              <u>{s.label}</u>
            </div>
          );
        })}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" style={{ display: "none" }} onChange={onFile} />
      {err && <p className="rt-note" style={{ color: "var(--grease)", marginTop: 6 }}>{err}</p>}
    </>
  );
}

export function ShotArt({ id, c = "#8E9793" }: { id: string; c?: string }) {
  const s = { fill: "none", stroke: c, strokeWidth: 1.5, strokeLinecap: "round" as const };
  const art: Record<string, React.ReactNode> = {
    two: (
      <>
        <circle cx="24" cy="26" r="7" {...s} />
        <path d="M24 33v14M17 40l7-5M31 40l-7-5" {...s} />
        <circle cx="52" cy="28" r="6" {...s} />
        <path d="M52 34v12M46 40l6-4M58 40l-6-4" {...s} />
      </>
    ),
    cu: (
      <>
        <circle cx="34" cy="30" r="17" {...s} />
        <path d="M27 27h5M38 27h5M30 38q4 3 8 0" {...s} />
      </>
    ),
    ots: (
      <>
        <path d="M8 52q10-20 24-8" {...s} strokeWidth="6" opacity=".35" />
        <circle cx="48" cy="26" r="8" {...s} />
        <path d="M48 34v14M41 42l7-5M55 42l-7-5" {...s} />
      </>
    ),
    hands: (
      <>
        <path d="M18 44q4-14 10-12t4 12M30 44q2-13 8-11t3 11" {...s} />
        <path d="M14 48h40" {...s} opacity=".6" />
      </>
    ),
    eye: (
      <>
        <path d="M12 30q22-18 44 0-22 18-44 0z" {...s} />
        <circle cx="34" cy="30" r="7" {...s} />
        <circle cx="34" cy="30" r="2.4" fill={c} />
      </>
    ),
    clock: (
      <>
        <circle cx="34" cy="30" r="16" {...s} />
        <path d="M34 20v10l7 5" {...s} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 68 60" width="100%" style={{ display: "block" }}>
      {art[id]}
    </svg>
  );
}

export const GreaseRing = () => (
  <svg className="rt-ring" viewBox="0 0 120 90" preserveAspectRatio="none" aria-hidden="true">
    <path d="M60 6 C22 6 6 26 8 48 C10 72 34 86 62 84 C92 82 113 68 112 44 C111 20 92 6 58 7 C34 8 16 18 12 34" />
  </svg>
);

export function PreviewArt({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 320 180" width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="rtsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B2426" />
          <stop offset="1" stopColor="#111819" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#rtsky)" />
      <path d="M0 120 L120 96 L320 130" fill="none" stroke="#4A5556" strokeWidth="1.2" />
      <path d="M26 176 L96 84 L128 84 L74 176 Z" fill="none" stroke="#54605F" strokeWidth="1.2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={168 + i * 32} cy={78 - i * 4} r="2.6" fill="#E0A73C" opacity=".75" />
      ))}
      <circle cx="196" cy="128" r="9" fill="none" stroke="#E4472C" strokeWidth="1.4" />
      <path d="M196 137v20M188 146l8-6M204 146l-8-6" fill="none" stroke="#E4472C" strokeWidth="1.4" strokeLinecap="round" />
      <text x="12" y="20" fill="#5C6766" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="1.5">
        {label}
      </text>
    </svg>
  );
}

/** La miniatura de la sala: los hilos del vídeo como una chispa. La geometría
 *  llega ya calculada del servidor — la tarjeta no abre el proyecto entero solo
 *  para saber cuánto dura cada escena. */
export function ProjectArt({ card }: { card: ProjectCard }) {
  return (
    <svg viewBox="0 0 240 96" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="240" height="96" fill="#11181A" />
      {card.threads.slice(0, 5).map((sl, i) => {
        const y = 18 + i * 15;
        const pts = sl.sceneIds
          .map((id) => card.spark.find((g) => g.id === id))
          .filter(Boolean)
          .map((g) => 10 + (g!.x + g!.w / 2) * 220);
        if (!pts.length) return null;
        return (
          <g key={sl.id}>
            <line x1={pts[0]} y1={y} x2={pts[pts.length - 1]} y2={y} stroke={sl.color} strokeWidth="1.4" opacity=".55" />
            {pts.map((x, k) => (
              <circle key={k} cx={x} cy={y} r="3" fill={sl.color} />
            ))}
          </g>
        );
      })}
      <text x="10" y="88" fill="#5C6766" fontSize="9" fontFamily="ui-monospace, monospace">
        {tc(card.duration)}
      </text>
    </svg>
  );
}

export { PALETTE };
