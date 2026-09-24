// Guardián de CTCx SELECTION · COMPRAS (V5.85, fase 8 del PLAN_CIRCUITO_DEL_LOTE).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-compras-check.mjs
//
// GRATIS y sin red: ejercita los módulos puros y lee las fuentes.
//
// QUÉ VIGILA (brief `consolas-ctcx-selection-compras.md` §Guardián previsto, folio 8 paso 19 y la decisión 7 del owner):
//   (1) lo DISPONIBLE es derivado y nunca negativo; (2) `ctc_selection` sale de `compras` para todo grado menos Tyrian, y la
//   finca sigue anulada EN LA VISTA; (3) el precio de una compra cita su edición del PVC; (4) la compra nace del PAGO de un mes
//   de una oferta de COMPRA EN FIRME (directa · black) — un Lote de Temporada no; (5) el CRM de `black_negotiations` no tiene
//   escritor ni lector (tabla dormida); (6) el perfil ÚNICO y la imagen por lote (respuesta 7 del 23-sep); (7) la vitrina —cinta,
//   tienda, portal, ficha— enseña el perfil con la razón social de `legal.ts` como respaldo; (8) el circuito y la barra del
//   productor conocen «CTCx Selection» con la MISMA regla; (9) decisión 7: «Oferta desde CTCx Selection» = disponibilidad y se
//   publica desde un contrato cumplido. Las cifras de la directa (30 días, −8 %) las vigila `qa-trato` desde el plan.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { BUCKET_CTCX, CLAVE_PERFIL_CTCX, KINDS_COMPRA_EN_FIRME, disponibleKg, esCompraEnFirme, resumenDeCompras } from "../src/lib/compras/reglas.ts";
import { aPerfilCtcx, rotuloCtcx, urlDeImagenCtcx } from "../src/lib/catalogo/perfilCtcx.ts";
import { CTC_RAZON } from "../src/lib/legal.ts";
import { estadoDelCircuito } from "../src/lib/ocp/circuito.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const plan = lee("docs/PLAN_CIRCUITO_DEL_LOTE.md");
const paso = (n) => plan.match(new RegExp(`^\\| ${n} \\| (.+?) \\|`, "m"))?.[1] ?? "";

// ── 1. Lo disponible se deriva ──────────────────────────────────────────────
{
  check("disponible = comprado − vendido", disponibleKg({ compradoKg: 500, vendidoKg: 120 }) === 380);
  check("y nunca negativo", disponibleKg({ compradoKg: 100, vendidoKg: 150 }) === 0 && disponibleKg({ compradoKg: 0, vendidoKg: 0 }) === 0);
  const r = resumenDeCompras([
    { lotId: "a", grado: "red", kg: 250, totalCop: 6500000, recibidaAt: "2026-10-01", pagadaAt: "2026-10-05" },
    { lotId: "a", grado: "red", kg: 125, totalCop: 3250000, recibidaAt: null, pagadaAt: null },
    { lotId: "b", grado: "black", kg: 500, totalCop: 11500000, recibidaAt: "2026-10-02", pagadaAt: "2026-10-06" },
  ]);
  check("el resumen suma kilos, recibidos, pagado y por grado", r.compras === 3 && r.lotes === 2 && r.kgComprados === 875 && r.kgRecibidos === 750 && r.copPagado === 18000000 && r.porGrado.red.kg === 375 && r.porGrado.black.compras === 1);
  const reglas = lee("src/lib/compras/reglas.ts").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  check("reglas.ts es puro (sin supabase ni servidor)", !/from "@\/lib\/supabase|server-only/.test(reglas));
  check("y nadie guarda una columna «disponible»", !/disponible_kg|disponibleKg:/.test(lee("docs/migraciones/2026-09-24_compras_ctcx_selection.sql")));
}

// ── 2. La vista pública: ctc_selection desde compras, sin Tyrian, la finca anulada en SQL ──
{
  const acta = lee("docs/migraciones/2026-09-24_compras_ctcx_selection.sql");
  check("ctc_selection sale de compras (ya no de black_negotiations)", /comprado\.lot_id IS NOT NULL AS ctc_selection/.test(acta) && /SELECT DISTINCT c\.lot_id FROM compras c/.test(acta) && !/black_negotiations bn/.test(acta));
  check("Tyrian no se compra: lo impide el CHECK", /grado public\.lot_grade not null check \(grado <> 'tyrian'\)/.test(acta));
  check("la finca sigue anulada EN LA VISTA (D3.1), no en el componente", /CASE WHEN comprado\.lot_id IS NULL THEN f\.name ELSE NULL::text END AS finca_name/.test(acta));
  check("compras y ctcx_selection_lotes: RLS y cero políticas (solo service role)", acta.includes("alter table public.compras enable row level security") && acta.includes("alter table public.ctcx_selection_lotes enable row level security") && !/create policy [^\n]* on public\.(compras|ctcx_selection_lotes)/.test(acta));
  check("el bucket de imágenes es público solo para LEER", /insert into storage\.buckets[^\n]*'ctcx-selection'[^\n]*true/.test(acta) && /for select to anon, authenticated using \(bucket_id = 'ctcx-selection'\)/.test(acta) && !/on storage\.objects for (insert|update|delete)/.test(acta));
  check("el perfil sale por una vista estrecha legible por anon", acta.includes("create or replace view public.public_ctcx_selection_perfil") && acta.includes("grant select on public.public_ctcx_selection_perfil to anon, authenticated") && /where key = 'ctcx_selection_perfil'/.test(acta));
}

// ── 3 y 4. La compra: nace del pago de una oferta de compra en firme y cita el PVC ──
const acciones = lee("src/app/ocp/(app)/contractActions.ts");
const compras = lee("src/app/ocp/(app)/comprasActions.ts");
{
  check("las clases de compra en firme son directa y black; un Lote de Temporada no lo es", KINDS_COMPRA_EN_FIRME.join(",") === "directa,black" && esCompraEnFirme("directa") && esCompraEnFirme("black") && !esCompraEnFirme("temporada") && !esCompraEnFirme("excepcion") && !esCompraEnFirme(null));
  const pago = acciones.slice(acciones.indexOf("export async function registrarPagoDelMes("), acciones.indexOf("export async function ofrecerRenovacion("));
  check("registrarPagoDelMes documenta la compra solo si la oferta del contrato es de compra en firme", pago.includes("esCompraEnFirme(oferta.kind)") && pago.includes('origen: "contrato"'));
  check("con los kilos ENVIADOS del mes y el precio pactado", pago.includes("kg: kgComprados") && pago.includes("Number(fila.enviado_kg ?? 0)") && pago.includes("cop_kg: Number(contract.price_per_kg_locked ?? 0)"));
  check("y nunca un Tyrian", pago.includes('contract.grade_snapshot !== "tyrian"'));
  check("la compra del contrato cita la edición del PVC y el % del contrato", pago.includes("pvc_edition_id: contract.pvc_edition_id") && pago.includes("modificador_pct: contract.modificador_pct"));
  check("la compra a mano cita la edición vigente el día del pago", compras.includes("edicionVigente(pagadaAt") && compras.includes("pvc_edition_id: edicion?.id"));
  check("y exige nota y lote galardonado, nunca Tyrian", compras.includes("if (!nota) return") && compras.includes('lot.stage !== "galardonado"') && compras.includes('lot.grade === "tyrian"') && compras.includes('origen: "manual"'));
  const src = execSync("git ls-files src", { encoding: "utf8" }).split(/\r?\n/).filter((f) => /\.tsx?$/.test(f));
  const escritores = src.filter((f) => /from\("compras"\)\s*\.\s*(insert|update|upsert|delete)/.test(readFileSync(f, "utf8").replace(/\r?\n\s*/g, " ")));
  check("compras la escriben SOLO contractActions (el pago) y comprasActions (a mano)", escritores.length === 2 && escritores.includes("src/app/ocp/(app)/contractActions.ts") && escritores.includes("src/app/ocp/(app)/comprasActions.ts"), escritores.join(", "));
  // 5. El CRM se retiró
  const conCrm = src.filter((f) => /from\("black_negotiations"\)/.test(readFileSync(f, "utf8")));
  check("black_negotiations no tiene escritor ni lector en src (tabla dormida)", conCrm.length === 0, conCrm.join(", "));
  check("decideBlackNegotiation y el kanban se fueron", !acciones.includes("export async function decideBlackNegotiation") && !src.some((f) => /ctcSelectionActions|SelectionBoard|BlackStockCard|\(app\)\/ctc-selection\/seleccion/.test(f)));
  check("el veredicto ya no abre negociaciones", !/from\("black_negotiations"\)/.test(lee("src/app/ocp/(app)/nominadosActions.ts")));
  check("un Black recibe temporada/directa/excepción como los demás grados", lee("src/app/ocp/(app)/ofertasActions.ts").includes('return grade === "black" || grade === "red" || grade === "blue" || grade === "gold"'));
}

// ── 6. El perfil único y la imagen por lote (respuesta 7) ───────────────────
{
  check("el perfil vive en platform_settings bajo UNA clave", CLAVE_PERFIL_CTCX === "ctcx_selection_perfil" && compras.includes('{ onConflict: "key" }'));
  check("la imagen se sube con URL firmada al bucket público, desde el navegador", BUCKET_CTCX === "ctcx-selection" && compras.includes("createSignedUploadUrl(path)") && lee("src/app/ocp/(app)/ctc-selection/ImagenCtcxUploader.tsx").includes("uploadToSignedUrl("));
  check("la imagen por lote es de un lote COMPRADO", compras.includes("La imagen por lote es de un lote COMPRADO"));
  check("la ruta de la imagen se valida antes de fijarla", compras.includes('limpio.includes("..")') && compras.includes("limpio.startsWith(prefijo)"));
  check("todas las acciones de Compras son `emite` (las lee el comprador)", (compras.match(/permisoDeEscritura\("ocp", "emite"\)/g) ?? []).length === (compras.match(/^export async function/gm) ?? []).length);
}

// ── 7. La vitrina enseña el perfil; la razón social de legal.ts es el respaldo ──
{
  check("sin perfil, el rótulo es la razón social de legal.ts", rotuloCtcx(null) === CTC_RAZON && rotuloCtcx({ nombre: "  " }) === CTC_RAZON && rotuloCtcx({ nombre: "CTCx Selection" }) === "CTCx Selection");
  check("aPerfilCtcx normaliza (nombre con respaldo, vacíos a null)", aPerfilCtcx(null).nombre === CTC_RAZON && aPerfilCtcx({ nombre: "X", lema: " ", descripcion: null, imagen_path: null }).lema === null);
  check("la URL de la imagen apunta al bucket público y codifica la ruta", urlDeImagenCtcx("lotes/x/a b.jpg", "https://h.supabase.co/") === "https://h.supabase.co/storage/v1/object/public/ctcx-selection/lotes/x/a%20b.jpg" && urlDeImagenCtcx(null) === null);
  const caras = [
    ["cinta", "src/lib/catalogo/sneakPeek.ts"],
    ["tienda", "src/components/cherry-picked/CherryPickedExperience.tsx"],
    ["portal", "src/app/ctcx-public-catalogue/[codigo]/page.tsx"],
    ["ficha", "src/app/docs/ficha/[lotId]/page.tsx"],
  ];
  for (const [n, f] of caras) {
    const t = lee(f);
    check(`la ${n} enseña el perfil (rotuloCtcx) en vez de la finca y lo lee de la vista pública`, /ctc_selection \? rotuloCtcx\(perfil\)/.test(t) && t.includes("VISTA_PERFIL_CTCX"));
  }
  check("la cinta y el portal pintan la imagen por lote, con la del perfil de respaldo", lee(caras[0][1]).includes("urlDeImagenCtcx(fila.ctcx_imagen_path) ?? perfil.imagenUrl") && lee(caras[2][1]).includes("urlDeImagenCtcx(fila.ctcx_imagen_path) ?? perfil.imagenUrl"));
  check("ni la cinta ni la tienda escriben la razón social a mano", !lee(caras[0][1]).includes('"Colombian Trading Company"') && !lee(caras[1][1]).includes('"Colombian Trading Company"'));
  check("la ficha pública sigue cerrándose sobre la lista blanca con el rótulo del perfil", lee(caras[3][1]).includes("rotuloCTC: rotuloCtcx(perfil)") && lee(caras[2][1]).includes("rotuloCTC: rotuloCtcx(perfil)"));
}

// ── 8. El circuito y la barra del productor: «CTCx Selection» con la misma regla ──
{
  const base = { stage: "galardonado", registradoPorCtc: false, tieneInscripcion: true, pagoConfirmado: true, muestraRecibida: true, enBache: false, grado: "black", ultimaOferta: "aceptada", contrato: "completed" };
  check("paso 19: con compras el lote es CTCx Selection (lateral buena)", estadoDelCircuito({ ...base, compradoEnFirme: true }).estado === "ctcx_selection");
  check("sin compras, un contrato cumplido sigue siendo catálogo activo", estadoDelCircuito(base).estado === "catalogo_activo");
  check("la ruptura manda sobre la compra; la mora de un contrato en curso también", estadoDelCircuito({ ...base, contrato: "ruptura", compradoEnFirme: true }).estado === "ruptura" && estadoDelCircuito({ ...base, contrato: "active", enMora: true, compradoEnFirme: true }).estado === "en_mora");
  check("la tabla del OCP lee compras y pasa compradoEnFirme", lee("src/app/ocp/(app)/kr/carga.ts").includes('from("compras").select("lot_id")') && lee("src/app/ocp/(app)/kr/carga.ts").includes("compradoEnFirme: compradoEnFirme.has(l.id)"));
  check("la barra del productor lo deriva con esCompraEnFirme (misma regla) y un mes pagado", lee("src/components/kaffetal-regal/panel/PerfilTab.tsx").includes("esCompraEnFirme(ofertaDelContrato?.kind)") && lee("src/components/kaffetal-regal/panel/PerfilTab.tsx").includes("months.some((m) => m.pagadoAt)"));
  check("y CONT queda hecho como «CTCx Selection»", lee("src/components/kaffetal-regal/LotKanbanStepper.tsx").includes('estado === "ctcx_selection"'));
}

// ── 9. Decisión 7: «Oferta desde CTCx Selection» es la disponibilidad; se publica desde un contrato cumplido ──
{
  const pantalla = lee("src/app/ocp/(app)/ctc-selection/page.tsx");
  check("«Oferta desde CTCx Selection» lee compras y deriva lo disponible con disponibleKg", pantalla.includes('from("compras")') && pantalla.includes("disponibleKg({") && pantalla.includes("Pasar al Catálogo Activo"));
  check("y edita el perfil único y la imagen por lote", pantalla.includes("guardarPerfilCtcx") && pantalla.includes('destino={{ tipo: "perfil" }}') && pantalla.includes('destino={{ tipo: "lote", lotId: l.id }}'));
  check("publishLot admite un contrato cumplido (la compra de 30 días queda completed al pagar)", lee("src/app/ocp/(app)/catalogActions.ts").includes('.in("status", ["active", "completed"])'));
  check("el Catálogo enseña «CTCx Selection» y acepta el contrato cumplido", lee("src/app/ocp/(app)/catalogo/page.tsx").includes('(contract.status === "active" || contract.status === "completed")') && lee("src/app/ocp/(app)/catalogo/page.tsx").includes("compradoEnFirme.has("));
  // (la ruta vieja no se escribe aquí: `qa-rutas-consolas` (c) barre también los scripts)
  check("la pestaña «Selección» dejó su talón (308)", /de: "\/ocp\/ctc-selection\/selecci[oó]n", a: "\/ocp\/ctc-selection", desde: "V5\.85"/.test(lee("src/lib/panel/rutasMovidas.ts")));
  const p19 = paso(19);
  check("paso 19 del plan: ventana de 30 días y PVC − 8 %, y la pantalla lo dice", /\*\*ventana de 30 días\*\*/.test(p19) && /\*\*PVC − 8 %\*\*/.test(p19) && pantalla.includes("PVC − 8 %, 30 días"));
  check("Compras: la tabla y el alta a mano", lee("src/app/ocp/(app)/compras/page.tsx").includes("registrarCompraManual") && lee("src/app/ocp/(app)/compras/page.tsx").includes("pvc_editions(code)"));
}

if (fallos.length) {
  console.error(`✗ qa-compras: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-compras: ${ok} comprobaciones OK, 0 fallos`);
