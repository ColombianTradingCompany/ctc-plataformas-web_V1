// Guardián del BUZÓN DE SOLO LECTURA (unificación P18, 2026-10-26 · D-013 5.4).
//
//   node scripts/qa-buzon-solo-lectura-check.mjs
//
// EL FALLO QUE ESTÁ AQUÍ PARA IMPEDIR. El Buzón de la LCP tuvo tres caminos que tocaban el correo real en Hostinger: la
// «limpieza de retención» de la sincronización borraba correo archivado con más de 30 días, Archivar y Eliminar movían el
// mensaje remoto, y Responder/Reenviar enviaban desde el dominio y copiaban en Enviados. Quitar la contraseña IMAP de Vercel
// (2026-10-23) los dejó inertes, no los quitó: volver a poner la variable los habría resucitado. Desde P18 el Buzón es
// historial congelado el 2026-07-16 y el correo se lleva en Gmail. Este guardián falla si cualquiera de esos caminos vuelve.
//
// Puro: solo lee archivos. No toca la base, la red ni el buzón. Las consolas no se conducen en un navegador.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (f) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

function archivos(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...archivos(p));
    else if (/\.(ts|tsx|js|mjs)$/.test(n)) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}
const fuentes = archivos("src");
// Solo CÓDIGO: los comentarios que explican qué se retiró (y por qué) nombran a propósito lo retirado.
const codigo = (f) => lee(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const conTexto = (rx) => fuentes.filter((f) => rx.test(codigo(f)));

// ── 1 · ninguna llamada IMAP que escriba ─────────────────────────────────────────────────────────────────────────────────────
const RX_IMAP_ESCRIBE = /\b(messageDelete|messageMove|messageCopy|messageFlags\w*|mailboxCreate|mailboxDelete|mailboxRename|mailboxSubscribe|mailboxUnsubscribe)\b/;
const conEscritura = conTexto(RX_IMAP_ESCRIBE);
check("ninguna llamada IMAP que borre, mueva, copie, marque o cree carpetas en src/", conEscritura.length === 0, conEscritura.join(" · "));
const buzonLib = fuentes.filter((f) => f.startsWith("src/lib/buzon/"));
const conAppend = buzonLib.filter((f) => /\.append\(/.test(lee(f)));
check("ningún .append( en src/lib/buzon/ (la copia en Enviados de Hostinger)", conAppend.length === 0, conAppend.join(" · "));

// ── 2 · imapflow: un solo archivo, y abre en solo lectura ────────────────────────────────────────────────────────────────────
const conImap = conTexto(/from ["']imapflow["']/);
check("imapflow lo importa exactamente un archivo: src/lib/buzon/syncBuzon.ts", conImap.length === 1 && conImap[0] === "src/lib/buzon/syncBuzon.ts", conImap.join(" · "));
const sync = lee("src/lib/buzon/syncBuzon.ts");
const locks = [...sync.matchAll(/getMailboxLock\(([^)]*)\)/g)].map((m) => m[1]);
check("syncBuzon.ts abre INBOX con getMailboxLock(…, { readOnly: true }) y no de otra forma", locks.length >= 1 && locks.every((a) => /readOnly:\s*true/.test(a)) && !/mailboxOpen\(/.test(sync), locks.join(" | "));
check("la retención de 30 días ya no existe (sin RETENTION_DAYS ni contador «cleaned»)", !/RETENTION_DAYS/.test(sync) && !/\bcleaned\b/.test(sync));

// ── 3 · los archivos retirados no existen ni se importan ─────────────────────────────────────────────────────────────────────
check("src/lib/buzon/mailClient.ts no existe", !existsSync("src/lib/buzon/mailClient.ts"));
check("src/app/lcp/(app)/buzon/BuzonSyncBar.tsx no existe", !existsSync("src/app/lcp/(app)/buzon/BuzonSyncBar.tsx"));
const importan = conTexto(/mailClient|BuzonSyncBar/);
check("nada importa ni nombra mailClient o BuzonSyncBar en src/", importan.length === 0, importan.join(" · "));

// ── 4 · las Server Actions ───────────────────────────────────────────────────────────────────────────────────────────────────
const acciones = lee("src/app/lcp/(app)/buzonActions.ts");
check("BUZON_CONGELADO = true, sin exportar (un archivo «use server» solo exporta funciones async)", /\nconst BUZON_CONGELADO = true;/.test(acciones) && !/export const BUZON_CONGELADO/.test(acciones));
const cuerpoSync = acciones.slice(acciones.indexOf("export async function syncBuzonNow("));
const primera = cuerpoSync.split("\n")[1]?.trim() ?? "";
check(
  "la PRIMERA sentencia de syncBuzonNow es la negativa «Buzón congelado (Ronda 5)», antes de cualquier permiso, import o cliente IMAP",
  primera === 'if (BUZON_CONGELADO) return { ok: false as const, error: "Buzón congelado (Ronda 5)" };',
  primera
);
const conReply = conTexto(/sendBuzonReply|sendBuzonMail|quoteOriginal/);
check("sendBuzonReply (y su envío y su cita) no existen en src/", conReply.length === 0, conReply.join(" · "));
const conOutbound = conTexto(/\.from\(["']buzon_outbound["']\)/);
check("nada escribe en buzon_outbound (0 usos de .from(\"buzon_outbound\") en src/)", conOutbound.length === 0, conOutbound.join(" · "));
const ini = acciones.indexOf("export async function setBuzonStatus(");
const status = acciones.slice(ini, acciones.indexOf("\n}\n", ini));
check(
  "setBuzonStatus solo cambia la base: ninguna llamada remota",
  ini > 0 && !/moveRemoteMessage|imapflow|mailClient|send\w*\(/.test(status) && /\.from\("inbound_emails"\)\.update\(\{ status \}\)/.test(status)
);

// ── 5 · la pantalla ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const ui = lee("src/app/lcp/(app)/buzon/BuzonMail.tsx");
const quitados = ["Responder", "Reenviar", "Archivar", "Eliminar"].filter((b) => new RegExp(`>\\s*${b}\\s*<`).test(ui));
check("BuzonMail ya no tiene los botones Responder, Reenviar, Archivar ni Eliminar", quitados.length === 0, quitados.join(", "));
check("BuzonMail ya no tiene el redactor (composer) ni importa sendBuzonReply/setBuzonStatus", !/composer|Composer/.test(ui) && !/sendBuzonReply|setBuzonStatus/.test(ui));
check(
  "BuzonMail conserva lo de leer: pestañas, etiquetas, leído/no leído y adjuntos",
  ["Recibidos", "Archivados", "Papelera"].every((t) => ui.includes(`label: "${t}"`)) && ui.includes("setBuzonTags(") && ui.includes("markInboundEmailRead(") && ui.includes("getBuzonAttachmentUrls(") && ui.includes("Ver adjuntos")
);
const pagina = lee("src/app/lcp/(app)/buzon/page.tsx");
check("la página no monta la barra de sincronizar y dice «Historial de solo lectura»", !/BuzonSyncBar|Sincronizar/.test(pagina) && (pagina.match(/Historial de solo lectura/g) ?? []).length === 2);
const conAvance = conTexto(/responderBuzon/);
check("el avance «responderBuzon» se retiró de src/", conAvance.length === 0, conAvance.join(" · "));

// ── 6 · las notas que lo explican ────────────────────────────────────────────────────────────────────────────────────────────
const SITIOS = [
  ["src/lib/bcp/sendOtpEmail.ts", "F01", 1],
  ["src/lib/email/recuperacionEmails.ts", "F01", 1],
  ["src/lib/email/panelEmails.ts", "F01", 2],
  ["src/lib/email/partnerEmails.ts", "F01", 1],
  ["src/lib/email/partnerEmails.ts", "F02", 1],
  ["src/lib/email/leadEmails.ts", "F02", 1],
  ["src/lib/leadForms/correos.ts", "F02", 2],
];
for (const [f, filtro, n] of SITIOS) {
  const lineas = lee(f).split("\n");
  const notas = lineas.map((l, i) => [l, i]).filter(([l]) => l.includes(`// Filtro de Gmail ${filtro}:`));
  const pegadas = notas.filter(([, i]) => /subject/.test(lineas[i + 1] ?? ""));
  check(`${f}: ${n} asunto(s) con la nota del filtro ${filtro}, justo encima`, notas.length === n && pegadas.length === n, `${notas.length} notas, ${pegadas.length} pegadas`);
}
check("yaRespondio explica que inbound_emails está congelada y cuál es la señal viva", /CONGELADA desde el 2026-07-16/.test(lee("src/lib/leadForms/envios.ts")) && /replied_at/.test(lee("src/lib/leadForms/envios.ts")));
check("la ruta del webhook explica por qué está dormida (503 sin el secreto)", /DORMANT/.test(lee("src/app/api/inbound-email/route.ts")) && /503/.test(lee("src/app/api/inbound-email/route.ts")));

// ── informe ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (fallos.length) {
  console.error(`✗ qa-buzon-solo-lectura: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-buzon-solo-lectura: ${ok} comprobaciones OK, 0 fallos (el Buzón no puede escribir en Hostinger ni enviar)`);
