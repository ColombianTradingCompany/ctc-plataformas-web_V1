// Comprobaciones de lógica pura de OCP · Transcripciones, contra el CÓDIGO REAL
// (src/lib/transcripciones/model.ts). El OCP vive detrás del master login con
// OTP, así que no se recorre con un navegador automatizado: esto guarda la
// lectura del JSON de ogg_transcriber, el agrupado en bloques y los formatos.
//
// Correr: node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-transcripciones-check.mjs [ruta.transcript.json]
import { readFileSync, existsSync } from "node:fs";
import * as m from "../src/lib/transcripciones/model.ts";

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) pass++;
  else { fail++; console.log("  FAIL", name); }
};

// ---- fmtTs / fmtDuration
check("fmtTs 0", m.fmtTs(0) === "00:00");
check("fmtTs 75.4", m.fmtTs(75.4) === "01:15");
check("fmtTs 3725", m.fmtTs(3725) === "1:02:05");
check("fmtDuration 43", m.fmtDuration(43) === "43 s");
check("fmtDuration 1337", m.fmtDuration(1337) === "22 min");
check("fmtDuration 3900", m.fmtDuration(3900) === "1 h 05 min");
check("fmtDuration null", m.fmtDuration(null) === "—");

// ---- collapseBlocks / speakerOrder / speakerLabel
const segs = [
  { speaker: "SPEAKER_00", start: 0, end: 2, text: "Hola," },
  { speaker: "SPEAKER_00", start: 2.1, end: 4, text: "buenos días." },
  { speaker: "SPEAKER_01", start: 4.5, end: 7, text: "Buenos días." },
  { speaker: "SPEAKER_00", start: 7.2, end: 9, text: "   " },
  { speaker: "SPEAKER_00", start: 9.1, end: 9.5, text: "Bien." },
];
const blocks = m.collapseBlocks(segs);
check("collapse: 3 bloques", blocks.length === 3);
check("collapse: junta texto", blocks[0].text === "Hola, buenos días." && blocks[0].end === 4);
check("collapse: salta blancos", blocks[2].text === "Bien.");
check("speakerOrder", JSON.stringify(m.speakerOrder(segs)) === '["SPEAKER_00","SPEAKER_01"]');
check("speakerLabel auto", m.speakerLabel("SPEAKER_02", {}) === "Hablante 3");
check("speakerLabel custom", m.speakerLabel("SPEAKER_00", { SPEAKER_00: "Don Luis" }) === "Don Luis");
check("speakerLabel voz", m.speakerLabel("SPEAKER", {}) === "Voz");
const txt = m.transcriptToText(segs, { SPEAKER_01: "Ana" }, { timestamps: true });
check("toText", txt.startsWith("[00:00 - 00:04] Hablante 1: Hola, buenos días.\n\n[00:05 - 00:07] Ana: Buenos días."));

// ---- parseToolJson: rechazos
check("parse: no objeto", !m.parseToolJson("x").ok);
check("parse: sin segments", !m.parseToolJson({ text: "hola" }).ok);
check("parse: segments vacíos", !m.parseToolJson({ segments: [{ speaker: "A", text: "  " }] }).ok);

// ---- parseToolJson: mínimo válido, deriva lo que falta
const min = m.parseToolJson({ segments: [{ speaker: "SPEAKER_00", start: 0, end: 3.2, text: "Hola" }, { start: 3.5, end: 5, text: "Chao", flags: ["repetition"] }] });
check("parse: ok mínimo", min.ok);
if (min.ok) {
  check("parse: speaker por defecto", min.payload.segments[1].speaker === "SPEAKER");
  check("parse: flags conservados", JSON.stringify(min.payload.segments[1].flags) === '["repetition"]');
  check("parse: speakers derivados", JSON.stringify(min.payload.speakers) === '["SPEAKER_00","SPEAKER"]');
  check("parse: duración = último end", min.payload.durationSeconds === 5);
  check("parse: sin fuente", min.payload.sourceName === null && min.payload.language === null);
}

// ---- parsePlainText
const pt = m.parsePlainText("Don Luis: Buenos días.\n\nBuenos días, ¿cómo va?\n\nAna: Bien.");
check("plain: ok", pt.ok);
if (pt.ok) {
  check("plain: 3 segmentos", pt.payload.segments.length === 3);
  check("plain: nombre al inicio", pt.payload.segments[0].speaker === "Don Luis" && pt.payload.segments[0].text === "Buenos días.");
  check("plain: sin nombre -> SPEAKER", pt.payload.segments[1].speaker === "SPEAKER");
  check("plain: meta", pt.payload.meta.source_kind === "pasted_text");
}
check("plain: vacío", !m.parsePlainText("  \n ").ok);

// ---- el JSON real de la herramienta, si se pasa por argumento
const real = process.argv[2];
if (real && existsSync(real)) {
  const r = m.parseToolJson(JSON.parse(readFileSync(real, "utf8")));
  check("real: ok", r.ok);
  if (r.ok) {
    const p = r.payload;
    check("real: segmentos > 100", p.segments.length > 100);
    check("real: 3 hablantes", p.speakers.length === 3);
    check("real: idioma es", p.language === "es");
    check("real: duración ~22 min", p.durationSeconds > 1300 && p.durationSeconds < 1400);
    check("real: fuente", typeof p.sourceName === "string" && p.sourceName.endsWith(".ogg"));
    check("real: meta sin path", !("path" in p.meta) && p.meta.model === "large-v3");
    const b = m.collapseBlocks(p.segments);
    check("real: bloques 32", b.length === 32);
    console.log(`  real: ${p.segments.length} segmentos, ${b.length} bloques, ${m.fmtDuration(p.durationSeconds)}, ${p.speakers.join("/")}`);
  }
} else {
  console.log("  (sin JSON real: pásalo como argumento para probarlo también)");
}

console.log(`\n${pass} pass, ${fail} fail`);
// process.exit() aquí dispara un assert de libuv en Windows (el hook de
// resolución aún tiene un handle abierto); con exitCode el proceso sale solo.
process.exitCode = fail ? 1 : 0;
