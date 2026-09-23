// Semilla del Cotizador Courier (herramientas-internas, brief 2026-09-23).
//
//   node --env-file=.env.local scripts/seed-courier.mjs <carpeta-de-insumos> [guia|acuerdo]
//
// Escribe en la base con la clave de servicio (las tablas `courier_*` son service-role-only). Lee DOS
// archivos que viven FUERA del repo, en la carpeta que se le pasa:
//   · guia-<año>.json   — tarifas de lista y cuadro de zonas, sacados de la guía PÚBLICA del transportista
//   · acuerdo-*.json    — los descuentos del acuerdo, que es CONFIDENCIAL (cláusula 6): por eso este
//                         script no contiene ni una cifra y no imprime ninguna.
// No usa el SQL por el MCP (el camino de `seed-pvc-f4-2026.mjs`) porque son 1.350 tarifas: pasarlas por
// el chat de la sesión sería caro y, para el acuerdo, sería sacar las cifras confidenciales a un log.
// Idempotente: borra y reinserta la misma versión (transportista + vigente_desde).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [dir, parte] = process.argv.slice(2);
if (!dir) { console.error("Uso: node --env-file=.env.local scripts/seed-courier.mjs <carpeta> [guia|acuerdo]"); process.exit(1); }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (¿--env-file=.env.local?)"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const archivos = readdirSync(dir);
const lee = (rx) => { const f = archivos.find((a) => rx.test(a)); if (!f) throw new Error(`No encuentro ${rx} en ${dir}`); return JSON.parse(readFileSync(join(dir, f), "utf8")); };
const ok = (r, que) => { if (r.error) { console.error(`✗ ${que}: ${r.error.message}`); process.exit(1); } return r.data; };

if (!parte || parte === "guia") {
  const g = lee(/^guia-\d{4}\.json$/);
  ok(await db.from("courier_tarifas_base").delete().eq("transportista", g.transportista).eq("vigente_desde", g.vigente_desde), "borrar tarifas");
  ok(await db.from("courier_zonas").delete().eq("transportista", g.transportista).eq("vigente_desde", g.vigente_desde), "borrar zonas");
  const tarifas = g.tarifas.map((t) => ({ transportista: g.transportista, vigente_desde: g.vigente_desde, ...t }));
  for (let i = 0; i < tarifas.length; i += 500) ok(await db.from("courier_tarifas_base").insert(tarifas.slice(i, i + 500)), "insertar tarifas");
  // Miami tiene zona propia: se guarda como «US-MIA» para que «US» sea el resto de EE. UU.
  const zonas = g.zonas.map((z) => ({
    transportista: g.transportista, vigente_desde: g.vigente_desde, ...z,
    pais_iso: z.pais_iso === "US" && !/Excepto/.test(z.pais) ? "US-MIA" : z.pais_iso,
  }));
  ok(await db.from("courier_zonas").insert(zonas), "insertar zonas");
  console.log(`✓ guía ${g.vigente_desde}: ${tarifas.length} tarifas, ${zonas.length} zonas`);
}

if (!parte || parte === "acuerdo") {
  const a = lee(/^acuerdo-.*\.json$/);
  ok(await db.from("courier_acuerdos").delete().eq("transportista", a.transportista).eq("vigente_desde", a.vigente_desde), "borrar acuerdo");
  ok(await db.from("courier_acuerdos").update({ estado: "reemplazado" }).eq("transportista", a.transportista).eq("estado", "vigente"), "reemplazar anterior");
  const [{ id }] = ok(await db.from("courier_acuerdos").insert({
    transportista: a.transportista, referencia: a.referencia, numero_acuerdo: a.numero_acuerdo, numero_cuenta: a.numero_cuenta,
    vigente_desde: a.vigente_desde, fin_gracia: a.fin_gracia, modo_suma: a.modo_suma, fuente: a.fuente,
  }).select("id"), "insertar acuerdo");
  ok(await db.from("courier_descuentos").insert(a.descuentos.map((d) => ({ acuerdo_id: id, familia: "export", ...d }))), "insertar descuentos");
  ok(await db.from("courier_descuento_adquirido").insert(a.adquirido.map((q) => ({ acuerdo_id: id, ...q }))), "insertar adquirido");
  ok(await db.from("courier_bonificaciones").insert(a.bonificaciones.map((b) => ({ acuerdo_id: id, concepto: "automatizacion", ...b }))), "insertar bonificaciones");
  console.log(`✓ acuerdo ${a.vigente_desde}: ${a.descuentos.length} descuentos, ${a.adquirido.length} grupos adquiridos, ${a.bonificaciones.length} bonificaciones`);
}
