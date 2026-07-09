import { EMPTY_FICHA, type FichaFormData } from "./fichaData";
import { computeFactor } from "./fichaCalculations";

const BOOLEAN_KEYS: (keyof FichaFormData)[] = [
  "origin_cert_dor", "origin_cert_do", "origin_cert_igp", "origin_cert_fedecafe", "origin_cert_other",
  "intl_eudr", "intl_rainforest", "intl_organic", "intl_eujas", "intl_birdfriendly", "intl_foe", "intl_iwca",
  "intl_cafe", "intl_bpa", "intl_fairtrade", "intl_spp", "intl_fairtradeusa", "intl_demeter", "intl_nespresso",
  "intl_globalgap", "intl_other",
];

function csvCell(v: string) {
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function collect(data: FichaFormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "varieties") continue;
    o[key] = typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : String(value ?? "");
  }
  const { yieldLoss, healthy } = computeFactor(data);
  o.fa_yield_loss = data.fa_start && data.fa_green_remainder ? yieldLoss.toFixed(1) : "";
  o.fa_healthy = data.fa_green_remainder ? healthy.toFixed(1) : "";
  data.varieties.forEach((v, i) => {
    o[`variedad_${i + 1}_proporcion`] = v.pct;
    o[`variedad_${i + 1}_nombre`] = v.name;
  });
  return o;
}

export function downloadFichaCSV(data: FichaFormData) {
  const o = collect(data);
  const lines = ["campo,valor", ...Object.keys(o).map((k) => csvCell(k) + "," + csvCell(o[k]))];
  const name = (o.product_name || o.ctc_uid || "ctc_cafe").replace(/[^\w-]+/g, "_").slice(0, 50);
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}_datasheet.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

function parseCSV(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (cell !== "" || row.length) { row.push(cell); rows.push(row); row = []; cell = ""; }
      } else cell += c;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function parseFichaCSV(text: string, current: FichaFormData): FichaFormData {
  const rows = parseCSV(text);
  if (!rows.length) throw new Error("vacío");
  const header = rows[0].map((x) => x.trim().toLowerCase());
  const start = header[0] === "campo" && header[1] === "valor" ? 1 : 0;
  const o: Record<string, string> = {};
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    if (r.length >= 1 && r[0] !== "") o[r[0]] = r[1] !== undefined ? r[1] : "";
  }

  const next: FichaFormData = { ...current };
  for (const key of Object.keys(EMPTY_FICHA) as (keyof FichaFormData)[]) {
    if (key === "varieties") continue;
    if (!(key in o)) continue;
    if (BOOLEAN_KEYS.includes(key)) {
      (next[key] as boolean) = o[key] === "TRUE";
    } else {
      (next[key] as string) = o[key];
    }
  }

  const varieties: FichaFormData["varieties"] = [];
  let i = 1;
  while (`variedad_${i}_nombre` in o || `variedad_${i}_proporcion` in o) {
    varieties.push({ pct: o[`variedad_${i}_proporcion`] || "", name: o[`variedad_${i}_nombre`] || "" });
    i++;
  }
  if (varieties.length) next.varieties = varieties;

  return next;
}
