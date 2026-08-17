// QA de la vía en la NUBE, contra el CÓDIGO REAL (src/lib/transcripciones/cloud.ts)
// y contra AssemblyAI de verdad. Cuesta unos US$0,002 (el fixture son 43 s).
//
// Qué comprueba, de punta a punta:
//   1. `webhookBaseUrl` canonicaliza el apex a www (si no, el webhook cae en un 308).
//   2. `assemblyBody` arma la petición como debe (diarización, idioma, nº de voces).
//   3. Sube el fixture a Storage y crea una fila `pending` como haría el OCP.
//   4. `submitToAssembly` REAL → AssemblyAI acepta el trabajo.
//   5. Espera a que la fila quede `ready` — por el webhook (si el secreto está en
//      producción) o por `pollAssemblyJob`, que es la red de seguridad.
//   6. Comprueba el resultado (hablantes, texto) y limpia fila + audio.
//
// Correr: node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-transcripciones-nube.mjs
import { readFileSync } from "node:fs";

// .env.local a mano: los scripts de QA no pasan por el cargador de Next. TIENE que
// ir ANTES de importar el módulo: `lib/supabase/server.ts` lee la URL del proyecto
// al evaluarse, y con un import estático (que se hoistea) la capturaría vacía.
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { webhookBaseUrl, assemblyBody, submitToAssembly, pollAssemblyJob } =
  await import("../src/lib/transcripciones/cloud.ts");

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) pass++; else { fail++; console.log("  FAIL", name); } };
const UA = "ctc-qa/1.0 (node)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 1. la URL del webhook nunca puede ser el apex
check("webhook: apex → www", webhookBaseUrl("https://ctcexport.com") === "https://www.ctcexport.com");
check("webhook: www intacto", webhookBaseUrl("https://www.ctcexport.com/") === "https://www.ctcexport.com");
check("webhook: sin variable → www", webhookBaseUrl(undefined) === "https://www.ctcexport.com");
check("webhook: otro dominio se respeta", webhookBaseUrl("https://staging.example.com") === "https://staging.example.com");

// ---- 2. el cuerpo de la petición
const b = assemblyBody("https://x/audio.ogg", { language: "es", num_speakers: 3 }, { url: "https://w/cb", header: "h", value: "s" });
check("body: diarización siempre", b.speaker_labels === true);
check("body: idioma fijado y sin autodetección", b.language_code === "es" && b.language_detection === undefined);
check("body: nº de voces", b.speakers_expected === 3);
check("body: webhook con cabecera", b.webhook_url === "https://w/cb" && b.webhook_auth_header_name === "h" && b.webhook_auth_header_value === "s");
const b2 = assemblyBody("https://x/a.ogg", {});
check("body: sin idioma → autodetección", b2.language_detection === true && b2.language_code === undefined);
check("body: sin webhook si no hay secreto", b2.webhook_url === undefined);
const b3 = assemblyBody("https://x/a.ogg", { min_speakers: 2, max_speakers: 4 });
check("body: rango de voces", JSON.stringify(b3.speaker_options) === '{"min_speakers_expected":2,"max_speakers_expected":4}');

if (!process.env.ASSEMBLYAI_API_KEY) {
  console.log("\n(sin ASSEMBLYAI_API_KEY: solo se comprobó la parte pura)");
  console.log(`\n${pass} pass, ${fail} fail`);
  process.exitCode = fail ? 1 : 0;
} else {
  // ---- 3..6 de verdad, contra el proyecto y el proveedor
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { apikey: key, Authorization: `Bearer ${key}`, "User-Agent": UA };
  const hj = { ...h, "Content-Type": "application/json" };
  const AUDIO = "../reference_html_tools/_whatsapp-transcript-html/tests/fixtures/two_speakers.ogg";

  const clean = async (id, path) => {
    await fetch(`${url}/rest/v1/transcripts?id=eq.${id}`, { method: "DELETE", headers: h });
    if (path) await fetch(`${url}/storage/v1/object/kaffetal-media`, { method: "DELETE", headers: hj, body: JSON.stringify({ prefixes: [path] }) });
  };

  // restos de una corrida anterior
  const old = await (await fetch(`${url}/rest/v1/transcripts?select=id,audio_path&subject=like.QA nube*`, { headers: h })).json();
  for (const o of old) { await clean(o.id, o.audio_path); console.log(`  (limpiado resto ${o.id})`); }

  const folder = crypto.randomUUID();
  const path = `transcripts/${folder}/two_speakers.ogg`;
  const bytes = readFileSync(AUDIO);
  await fetch(`${url}/storage/v1/object/kaffetal-media/${path}`, {
    method: "POST", headers: { ...h, "Content-Type": "audio/ogg", "x-upsert": "true" }, body: bytes,
  });

  const ins = await (await fetch(`${url}/rest/v1/transcripts`, {
    method: "POST", headers: { ...hj, Prefer: "return=representation" },
    body: JSON.stringify({
      subject: "QA nube (se borra sola)", recorded_on: "2026-08-17", source_name: "two_speakers.ogg",
      status: "pending", audio_path: path, audio_size_bytes: bytes.length, audio_mime: "audio/ogg",
      job_options: { language: "en", num_speakers: 2 },
    }),
  })).json();
  const id = ins[0].id;
  console.log(`  fila de prueba ${id} (${(bytes.length / 1024).toFixed(0)} KB, 43 s)`);

  const sent = await submitToAssembly(id);
  check("submit: aceptado por AssemblyAI", sent.ok === true);
  if (!sent.ok) console.log("    →", sent.error);

  if (sent.ok) {
    const row0 = (await (await fetch(`${url}/rest/v1/transcripts?select=status,provider,provider_job_id,worker&id=eq.${id}`, { headers: h })).json())[0];
    check("submit: fila en processing/assemblyai", row0.status === "processing" && row0.provider === "assemblyai" && !!row0.provider_job_id);

    let row = null, viaWebhook = false;
    for (let i = 0; i < 40; i++) {
      await sleep(5000);
      row = (await (await fetch(`${url}/rest/v1/transcripts?select=status,segment_count,speakers,language,full_text,error,duration_seconds&id=eq.${id}`, { headers: h })).json())[0];
      if (row.status === "ready" || row.status === "error") { viaWebhook = i < 3; break; }
      await pollAssemblyJob(id);   // red de seguridad, igual que hace el detalle
    }
    check("resultado: quedó lista", row?.status === "ready");
    if (row?.status === "error") console.log("    → error:", row.error);
    if (row?.status === "ready") {
      check("resultado: 2 hablantes", Array.isArray(row.speakers) && row.speakers.length === 2);
      check("resultado: claves SPEAKER_xx", (row.speakers ?? []).every((s) => /^SPEAKER_\d{2}$/.test(s)));
      check("resultado: hay segmentos", row.segment_count > 3);
      check("resultado: texto reconocible", /coffee|samples|october/i.test(row.full_text ?? ""));
      check("resultado: duración ~43 s", row.duration_seconds > 30 && row.duration_seconds < 60);
      console.log(`  → ${row.segment_count} segmentos, ${row.speakers.length} voces, ${Math.round(row.duration_seconds)} s`);
      console.log(`  → aviso ${viaWebhook ? "por WEBHOOK (rápido)" : "por SONDEO (el webhook no llegó)"}`);
      console.log(`  → "${(row.full_text ?? "").slice(0, 90)}…"`);
    }
  }
  await clean(id, path);
  console.log("  fila y audio de prueba borrados");
  console.log(`\n${pass} pass, ${fail} fail`);
  process.exitCode = fail ? 1 : 0;
}
