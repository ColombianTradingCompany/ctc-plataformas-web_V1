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

// ---- audio subido al OCP: extensiones, nombre seguro, etiquetas de estado
check("audio: .opus", m.isAudioName("PTT-20260817-WA0001.opus"));
check("audio: .OGG mayúsculas", m.isAudioName("nota.OGG"));
check("audio: .m4a", m.isAudioName("grabación llamada.m4a"));
check("audio: .json NO es audio", !m.isAudioName("x.transcript.json") && m.isJsonName("x.transcript.json"));
check("audio: .pdf no", !m.isAudioName("doc.pdf") && !m.isJsonName("doc.pdf"));
check("audio: sin extensión no", !m.isAudioName("audio"));
check("safeName: tildes y espacios", m.storageSafeName("Grabación de la llamada 16-08.m4a") === "Grabacion_de_la_llamada_16-08.m4a");
check("safeName: vacío", m.storageSafeName("") === "audio");
check("safeName: recorta a 120", m.storageSafeName("a".repeat(200) + ".ogg").length === 120);
check("status labels", m.STATUS_LABEL.pending === "Pendiente" && m.STATUS_LABEL.processing === "Transcribiendo" && m.STATUS_LABEL.ready === "Lista" && m.STATUS_LABEL.error === "Error");
check("MAX_AUDIO_BYTES = 100 MB", m.MAX_AUDIO_BYTES === 100 * 1024 * 1024);
check("languages: detectar primero", m.LANGUAGE_OPTIONS[0].code === "" && m.LANGUAGE_OPTIONS.some((o) => o.code === "es"));

// ---- AssemblyAI: sus `utterances` tienen que quedar como los de la herramienta local
const utt = [
  { speaker: "A", start: 130, end: 4670, text: "Buenos días, le llamo por las muestras." },
  { speaker: "B", start: 6290, end: 12740, text: "Sí, los dos lotes de Huila." },
  { speaker: "A", start: 14400, end: 21100, text: "El lavado dio 86 puntos." },
  { speaker: "C", start: 22000, end: 23000, text: "   " },
  { speaker: "C", start: 24000, end: 25000, text: "Perfecto." },
];
const mapped = m.mapAssemblyUtterances(utt);
check("assembly: descarta vacíos", mapped.length === 4);
check("assembly: ms → s", mapped[0].start === 0.13 && mapped[0].end === 4.67);
check("assembly: A→SPEAKER_00 en orden de aparición", mapped.map((s) => s.speaker).join(",") === "SPEAKER_00,SPEAKER_01,SPEAKER_00,SPEAKER_02");
check("assembly: texto intacto", mapped[1].text === "Sí, los dos lotes de Huila.");
check("assembly: no-array", m.mapAssemblyUtterances(null).length === 0 && m.mapAssemblyUtterances(undefined).length === 0);
check("assembly: sin speaker → SPEAKER", m.mapAssemblyUtterances([{ start: 0, end: 1000, text: "hola" }])[0].speaker === "SPEAKER");
check("assembly: bloques por hablante", m.collapseBlocks(mapped).length === 4);
{
  // el mapeo tiene que ser estable: la misma etiqueta siempre da la misma clave
  const seen = new Map();
  check("assembly: clave estable", m.assemblySpeakerKey("B", seen) === "SPEAKER_00" && m.assemblySpeakerKey("B", seen) === "SPEAKER_00");
}

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
