// ── Datawave · la página para llevar ─────────────────────────────────────────
// Dibuja en canvas una página con los hallazgos, las curvas y el ranking del
// tick, y la guarda como PNG o PDF. El escritor de PDF es de mano (un solo
// objeto imagen JPEG dentro de un PDF 1.4 mínimo) para no cargar una librería
// entera por un documento de una página — igual que en el prototipo.
//
// Solo cliente: usa document.createElement("canvas").

import { fmtVal, PALETTE, type Spec } from "./model";

const INK = "#12141A";
const MUTED = "#6E748F";
const PAPER = "#FBFAF9";
const ACCENT = "#E5484D";

export type CardColumn = { label: string; rows: { label: string; value?: string | null }[] };

export type CardOpts = {
  spec: Spec;
  idx: number;
  tick: number;
  picked: string[];
  title: string;
  intro: string;
  now: string[];
  before: string[];
  listLabel: string;
  columns: CardColumn[];
  footer: string;
  sources: { url: string; title: string }[];
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  const words = String(text).split(/\s+/);
  let line = "";
  words.forEach((w) => {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lh;
      line = w;
    } else line = test;
  });
  if (line) {
    ctx.fillText(line, x, y);
    y += lh;
  }
  return y;
}

function drawCard(ctx: CanvasRenderingContext2D, W: number, o: CardOpts): number {
  const { spec } = o;
  const M = 56;
  const inner = W - M * 2;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, 5000);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, 10, 5000);

  let y = 72;
  ctx.fillStyle = MUTED;
  ctx.font = "600 15px ui-monospace, Menlo, monospace";
  ctx.fillText(`${spec.title.toUpperCase()}  ·  ${spec.axis.key} ${o.tick}`, M, y);

  y += 54;
  ctx.fillStyle = INK;
  ctx.font = "44px Georgia, serif";
  y = wrapText(ctx, o.title, M, y, inner, 52) + 6;
  if (o.intro) {
    ctx.font = "italic 24px Georgia, serif";
    y = wrapText(ctx, o.intro, M, y + 14, inner, 34) + 10;
  }

  const rule = () => {
    y += 10;
    ctx.strokeStyle = "rgba(18,20,26,.15)";
    ctx.beginPath();
    ctx.moveTo(M, y);
    ctx.lineTo(W - M, y);
    ctx.stroke();
  };
  const section = (label: string, bullets: string[]) => {
    if (!bullets || !bullets.length) return;
    y += 26;
    ctx.fillStyle = MUTED;
    ctx.font = "600 13px ui-monospace, Menlo, monospace";
    ctx.fillText(label.toUpperCase(), M, y);
    rule();
    y += 30;
    bullets.forEach((b) => {
      ctx.fillStyle = ACCENT;
      ctx.font = "18px ui-sans-serif, sans-serif";
      ctx.fillText("—", M, y);
      ctx.fillStyle = INK;
      ctx.font = "19px ui-sans-serif, -apple-system, sans-serif";
      y = wrapText(ctx, b, M + 28, y, inner - 28, 27) + 12;
    });
  };
  section(`Dónde está en ${o.tick}`, o.now);
  section("Qué llevó hasta aquí", o.before);

  if (o.picked.length) {
    y += 34;
    const cH = 190;
    const top0 = y;
    const max = Math.max(...o.picked.map((id) => Math.max(...spec.byId[id].v))) * 1.08 || 1;
    const px = (t: number) => M + ((t - spec.axis.start) / (spec.axis.end - spec.axis.start)) * inner;
    const py = (v: number) => top0 + cH - (Math.min(v, max) / max) * cH;
    ctx.strokeStyle = "rgba(18,20,26,.12)";
    ctx.lineWidth = 1;
    [0, 0.5, 1].forEach((t) => {
      ctx.beginPath();
      ctx.moveTo(M, top0 + cH * t);
      ctx.lineTo(W - M, top0 + cH * t);
      ctx.stroke();
    });
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px(o.tick), top0);
    ctx.lineTo(px(o.tick), top0 + cH);
    ctx.stroke();
    ctx.setLineDash([]);
    o.picked.forEach((id, i) => {
      const it = spec.byId[id];
      ctx.strokeStyle = PALETTE[i % PALETTE.length];
      ctx.lineWidth = 3;
      ctx.beginPath();
      it.v.forEach((v, k) => (k ? ctx.lineTo(px(spec.ticks[k]), py(v)) : ctx.moveTo(px(spec.ticks[k]), py(v))));
      ctx.stroke();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.arc(px(o.tick), py(it.v[o.idx]), 6, 0, 7);
      ctx.fill();
    });
    y = top0 + cH + 30;
    ctx.font = "600 15px ui-monospace, Menlo, monospace";
    let lx = M;
    o.picked.forEach((id, i) => {
      const label = `${spec.byId[id].label} ${fmtVal(spec.byId[id].v[o.idx])}`;
      const w = ctx.measureText(label).width + 34;
      if (lx + w > W - M) {
        lx = M;
        y += 26;
      }
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.arc(lx + 6, y - 5, 6, 0, 7);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillText(label, lx + 20, y);
      lx += w;
    });
    ctx.fillStyle = MUTED;
    ctx.font = "14px ui-monospace, Menlo, monospace";
    ctx.fillText(`${spec.axis.start}–${spec.axis.end}${spec.unit ? " · " + spec.unit : ""}`, M, y + 22);
    y += 30;
  }

  y += 34;
  ctx.fillStyle = MUTED;
  ctx.font = "600 13px ui-monospace, Menlo, monospace";
  ctx.fillText(o.listLabel.toUpperCase(), M, y);
  rule();
  y += 30;
  const cols = o.columns;
  const colW = inner / cols.length;
  ctx.font = "600 14px ui-monospace, Menlo, monospace";
  cols.forEach((c, ci) => {
    ctx.fillStyle = MUTED;
    ctx.fillText(c.label.toUpperCase(), M + ci * colW, y);
  });
  y += 26;
  const rowsN = Math.max(...cols.map((c) => c.rows.length));
  const listTop = y;
  for (let i = 0; i < rowsN; i++) {
    cols.forEach((c, ci) => {
      const x0 = M + ci * colW;
      ctx.fillStyle = MUTED;
      ctx.font = "13px ui-monospace, Menlo, monospace";
      ctx.fillText(String(i + 1).padStart(2, "0"), x0, y);
      const r = c.rows[i];
      if (r) {
        ctx.fillStyle = INK;
        ctx.font = "19px Georgia, serif";
        ctx.fillText(r.label, x0 + 30, y);
        if (r.value != null) {
          ctx.fillStyle = MUTED;
          ctx.font = "14px ui-monospace, Menlo, monospace";
          ctx.fillText(String(r.value), x0 + colW - 20 - ctx.measureText(String(r.value)).width, y);
        }
      }
    });
    y += 29;
  }
  y = listTop + rowsN * 29 + 6;

  y += 26;
  ctx.strokeStyle = "rgba(18,20,26,.15)";
  ctx.beginPath();
  ctx.moveTo(M, y);
  ctx.lineTo(W - M, y);
  ctx.stroke();
  y += 26;
  ctx.fillStyle = MUTED;
  ctx.font = "14px ui-sans-serif, sans-serif";
  y = wrapText(ctx, o.footer, M, y, inner, 21);
  if (o.sources?.length) {
    y += 8;
    ctx.font = "13px ui-monospace, Menlo, monospace";
    o.sources.forEach((s) => {
      y = wrapText(ctx, "· " + s.title, M, y + 4, inner, 19);
    });
  }
  return y + 40;
}

export function renderCard(o: CardOpts): HTMLCanvasElement {
  const W = 940;
  const scale = 2;
  // Se dibuja dos veces: la primera sobre un lienzo alto para MEDIR, la segunda
  // sobre uno del tamaño exacto. Es lo que evita el margen inferior enorme.
  const probe = document.createElement("canvas");
  probe.width = W;
  probe.height = 5000;
  const H = Math.ceil(drawCard(probe.getContext("2d")!, W, o));
  const cv = document.createElement("canvas");
  cv.width = W * scale;
  cv.height = H * scale;
  const ctx = cv.getContext("2d")!;
  ctx.scale(scale, scale);
  drawCard(ctx, W, o);
  return cv;
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** PDF 1.4 de una página con el JPEG incrustado. Sin librerías. */
export function makePdf(jpeg: Uint8Array, pxW: number, pxH: number): Blob {
  const enc = (s: string) => new TextEncoder().encode(s);
  const pw = 595.28;
  const ph = +((pw * pxH) / pxW).toFixed(2);
  const chunks: Uint8Array[] = [];
  let len = 0;
  const offsets: number[] = [];
  const push = (u8: Uint8Array) => {
    chunks.push(u8);
    len += u8.length;
  };
  const pushStr = (s: string) => push(enc(s));
  pushStr("%PDF-1.4\n");
  const obj = (n: number, body: string, stream?: Uint8Array) => {
    offsets[n] = len;
    pushStr(`${n} 0 obj\n${body}\n`);
    if (stream) {
      pushStr("stream\n");
      push(stream);
      pushStr("\nendstream\n");
    }
    pushStr("endobj\n");
  };
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /I0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`,
    jpeg
  );
  const content = enc(`q ${pw} 0 0 ${ph} 0 0 cm /I0 Do Q`);
  obj(5, `<< /Length ${content.length} >>`, content);
  const xrefAt = len;
  let x = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) x += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  x += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  pushStr(x);
  const out = new Uint8Array(len);
  let off = 0;
  chunks.forEach((c) => {
    out.set(c, off);
    off += c.length;
  });
  return new Blob([out as BlobPart], { type: "application/pdf" });
}

export const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
};
