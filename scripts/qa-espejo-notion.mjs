// ── Prueba de vida del espejo de Notion (F2) ─────────────────────────────────
//   node scripts/qa-espejo-notion.mjs
//
// Ejercita los manejadores de ENTRADA contra la base real, que es donde de
// verdad se puede fallar: un `.eq("code", …)` que no encuentra nada, un update
// que el guardián rechaza, o un manejador que dice «aplicado» sin haber escrito.
//
// No se inventa una cotización: usa las que ya existen, escribe en las DOS
// columnas nuevas —que hoy están vacías en todas— y **las deja como estaban**.
// Nada de `inputs`, `results`, `status` ni `total` se toca en ningún momento.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const linea of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(linea.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let pass = 0;
const fails = [];
const check = (n, cond, detalle = "") => { if (cond) pass++; else fails.push(`${n}${detalle ? ` — ${detalle}` : ""}`); };

// `aplicar.ts` lleva `server-only`, que no arranca fuera de Next. Se reproduce
// aquí la MISMA consulta que hace, que es la parte que puede romperse.
const NOTA_MAX = 4000;

const { data: cotizaciones } = await db.from("quotes").select("id, code, nota_comercial, notion_page_id, notion_url").limit(5);
check("hay cotizaciones con las que probar", (cotizaciones?.length ?? 0) > 0, `${cotizaciones?.length ?? 0}`);
if (!cotizaciones?.length) { console.log("sin cotizaciones — nada que probar"); process.exit(1); }

const objetivo = cotizaciones[0];
const antes = {
  nota_comercial: objetivo.nota_comercial,
  notion_page_id: objetivo.notion_page_id,
  notion_url: objetivo.notion_url,
};
check("la cotización de prueba no tenía nota (columna nueva)", antes.nota_comercial === null, String(antes.nota_comercial));

// ── cotizacion.nota ─────────────────────────────────────────────────────────
const NOTA = "PRUEBA QA · la conversación que hubo alrededor del número.";
{
  const { data, error } = await db
    .from("quotes")
    .update({ nota_comercial: NOTA, nota_comercial_at: new Date().toISOString() })
    .eq("code", objetivo.code)
    .select("id, nota_comercial");
  check("la nota entra en una cotización existente", !error && data?.length === 1, error?.message ?? `${data?.length}`);
  check("y queda escrita tal cual", data?.[0]?.nota_comercial === NOTA);
}

// Lo que de verdad importa: que un código inventado NO escriba nada en ningún
// sitio. Un update sin `.select()` devuelve éxito aunque no toque ninguna fila,
// y así es como un manejador acaba diciendo «aplicado» sin haber hecho nada.
{
  const { data, error } = await db
    .from("quotes")
    .update({ nota_comercial: "NO DEBERÍA EXISTIR" })
    .eq("code", "COT-X-999999")
    .select("id");
  check("un código inexistente no escribe nada", !error && (data?.length ?? 0) === 0, `${data?.length} filas`);
}

// ── cotizacion.espejada ─────────────────────────────────────────────────────
const PAGE = "qa-page-id-que-no-existe-en-notion";
{
  const { data, error } = await db
    .from("quotes")
    .update({ notion_page_id: PAGE, notion_url: "https://notion.so/qa", notion_synced_at: new Date().toISOString() })
    .eq("code", objetivo.code)
    .select("id, notion_page_id");
  check("el id de la página de Notion se guarda", !error && data?.[0]?.notion_page_id === PAGE, error?.message ?? "");
}

// El índice único: dos cotizaciones no pueden espejar la MISMA página.
if (cotizaciones.length > 1) {
  const { error } = await db.from("quotes").update({ notion_page_id: PAGE }).eq("code", cotizaciones[1].code);
  check("dos cotizaciones no pueden compartir página de Notion", !!error, error ? "" : "¡lo permitió!");
} else {
  console.log("(solo una cotización: no se pudo probar el índice único)");
}

// ── Que el cálculo siga congelado ───────────────────────────────────────────
// La nota se escribe en una cotización EMITIDA; había que comprobar que eso no
// abrió por la puerta de atrás la posibilidad de recalcularla.
{
  const { data: emitida } = await db.from("quotes").select("code, results").neq("status", "borrador").limit(1).maybeSingle();
  if (emitida) {
    const { error } = await db.from("quotes").update({ results: { qa: "intento" } }).eq("code", emitida.code);
    check("una emitida sigue sin poder recalcularse", !!error, error ? "" : "¡el guardián la dejó pasar!");
  } else {
    console.log("(ninguna emitida: no se pudo probar el congelado)");
  }
}

// ── Dejarlo como estaba ─────────────────────────────────────────────────────
const { error: limpieza } = await db
  .from("quotes")
  .update({ ...antes, nota_comercial_at: null, notion_synced_at: null })
  .eq("code", objetivo.code);
check("la cotización queda como estaba", !limpieza, limpieza?.message ?? "");

const { data: final } = await db.from("quotes").select("nota_comercial, notion_page_id").eq("code", objetivo.code).maybeSingle();
check("sin nota y sin página, como al principio",
  final?.nota_comercial === antes.nota_comercial && final?.notion_page_id === antes.notion_page_id,
  JSON.stringify(final));

console.log(`\nEspejo de Notion · ${pass}/${pass + fails.length} comprobaciones`);
if (fails.length) { console.log("\nFALLAN:"); for (const f of fails) console.log("  ·", f); process.exit(1); }
console.log("Los manejadores escriben donde deben y no escriben donde no.\n");
