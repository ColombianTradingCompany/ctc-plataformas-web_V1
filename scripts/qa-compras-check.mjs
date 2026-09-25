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
//   (10) las mezclas (V5.87); (11) V5.90 — «Adquisición de Stock Café (Selection/Sample Kits)»: cada compra dice a qué stock va, los
//   tres Sample Kits (CP · Plus · Max) con los NÚMEROS DEL OWNER leídos de la fila 8 del §5 del plan, lo disponible para kits
//   derivado, los guards de la base, el kit sale completo y nada se borra, y el rail dice el nombre nuevo.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { BUCKET_CTCX, CLAVE_PERFIL_CTCX, KINDS_COMPRA_EN_FIRME, disponibleKg, esCompraEnFirme, resumenDeCompras } from "../src/lib/compras/reglas.ts";
import { aPerfilCtcx, rotuloCtcx, urlDeImagenCtcx } from "../src/lib/catalogo/perfilCtcx.ts";
import { CTC_RAZON } from "../src/lib/legal.ts";
import { estadoDelCircuito } from "../src/lib/ocp/circuito.ts";
import { KG_MINIMOS_POR_COMPONENTE, MAX_COMPONENTES, MIN_COMPONENTES, unaSolaVariedad, validarCierre, validarComponente } from "../src/lib/compras/mezclas.ts";
import { CARGAS_POR_PRODUCTOR, COMPOSICION_MEZCLA, LOTES_EN_MEZCLA } from "../src/lib/pvc/lectura.ts";
import { DESTINO_LABEL, KITS, VERDE_POR_CPS, disponibleParaKits, kgCpsDelKit, kgCpsPorLote, validarEnvioDeKit, validarItemDeKit } from "../src/lib/compras/sampleKits.ts";

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
  // V5.90: el ARMADO de un Sample Kit (crear · añadir · quitar · anular) es borrador (nadie de fuera lo ve hasta que sale enviado);
  // todo lo demás —incluido destinar una compra, que mueve kilos de la oferta— sigue siendo emite.
  const BORRADORES_DE_KITS = ["crearKit", "agregarLoteAlKit", "quitarItemDelKit", "anularKit"];
  check("todas las acciones de Compras son `emite` (las lee el comprador), salvo el armado de kits (borrador)", (compras.match(/permisoDeEscritura\("ocp", "emite"\)/g) ?? []).length === (compras.match(/^export async function/gm) ?? []).length - BORRADORES_DE_KITS.length && (compras.match(/permisoDeEscritura\("ocp", "borrador"\)/g) ?? []).length === BORRADORES_DE_KITS.length);
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

// ── 10. Las mezclas (V5.87, 2.ª tanda del brief): la regla se LEE de lectura.ts y se impone; lo asignado descuenta ──
// Owner, 2026-09-19 (PVC_BCP_PLAN §14.7): Black = blend de 3 a 4 orígenes y/o variedades; Red = una sola variedad; una carga
// por productor; una mezcla de dos no existe, de cinco tampoco. El brief (punto 1 del guardián previsto): la regla NO se copia.
{
  const pvc = lee("docs/PVC_BCP_PLAN.md");
  check("PVC plan §14.7: Black 3 a 4 orígenes y/o variedades; Red una sola variedad; ni de dos ni de cinco", /\*\*Black\*\* es un blend de 3 a 4/.test(pvc) && /mezcla regional\*\* de 3 a 4 orígenes/.test(pvc) && /Una mezcla de dos no existe, y una de cinco tampoco/.test(pvc));
  check("la regla se LEE de lectura.ts: 3–4 componentes, una carga por productor, Red de una variedad", MIN_COMPONENTES === LOTES_EN_MEZCLA[0] && MAX_COMPONENTES === LOTES_EN_MEZCLA[LOTES_EN_MEZCLA.length - 1] && MIN_COMPONENTES === 3 && MAX_COMPONENTES === 4 && KG_MINIMOS_POR_COMPONENTE === CARGAS_POR_PRODUCTOR * 125 && unaSolaVariedad("red") === (COMPOSICION_MEZCLA.Red.variedades === "una") && !unaSolaVariedad("black"));
  const mezclasSrc = lee("src/lib/compras/mezclas.ts").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  check("mezclas.ts es puro y no copia las cifras (importa lectura.ts y terminos.ts)", !/supabase|server-only/.test(mezclasSrc) && mezclasSrc.includes('from "@/lib/pvc/lectura"') && mezclasSrc.includes('from "@/lib/trato/terminos"') && !/=\s*\[?\s*3\s*,\s*4\s*\]?/.test(mezclasSrc) && !/=\s*125\b/.test(mezclasSrc));
  const c = (i, extra = {}) => ({ compraId: "c" + i, kg: 125, producerId: "p" + i, variedad: "Caturra", grado: "red", disponibleKg: 500, ...extra });
  const negros = (n) => Array.from({ length: n }, (_, i) => c(i + 1, { grado: "black", variedad: ["Caturra", "Castillo", "Colombia", "Bourbon", "Tabi"][i] }));
  check("Red de 3 productores, una variedad, una carga cada uno: cierra", validarCierre("red", [c(1), c(2), c(3)]).length === 0);
  check("Black de 4 orígenes con variedades distintas: cierra", validarCierre("black", negros(4)).length === 0);
  check("de dos no existe", validarCierre("red", [c(1), c(2)]).length > 0);
  check("de cinco tampoco", validarCierre("black", negros(5)).length > 0);
  check("una carga por productor: un productor repetido no cierra", validarCierre("red", [c(1), c(2), c(3, { producerId: "p1" })]).length > 0);
  check("menos de una carga en un componente no cierra", validarCierre("red", [c(1), c(2), c(3, { kg: 100 })]).length > 0);
  check("Red con dos variedades no cierra; Black sí", validarCierre("red", [c(1), c(2), c(3, { variedad: "Geisha" })]).length > 0 && validarCierre("black", [c(1, { grado: "black" }), c(2, { grado: "black" }), c(3, { grado: "black", variedad: "Geisha" })]).length === 0);
  check("Red con un lote sin variedad registrada no cierra", validarCierre("red", [c(1), c(2), c(3, { variedad: null })]).length > 0);
  check("un componente de otro grado no cierra", validarCierre("red", [c(1), c(2), c(3, { grado: "black" })]).length > 0);
  check("más kilos de los que quedan en la compra no cierra", validarCierre("red", [c(1), c(2), c(3, { kg: 600, disponibleKg: 500 })]).length > 0);
  check("al añadir: mismo productor, otra variedad en Red o un quinto componente se rechazan; un tercero válido pasa", validarComponente("red", [c(1), c(2)], c(3, { producerId: "p1" })).length > 0 && validarComponente("red", [c(1)], c(2, { variedad: "Geisha" })).length > 0 && validarComponente("black", negros(4), c(5, { grado: "black" })).length > 0 && validarComponente("red", [c(1), c(2)], c(3)).length === 0);
  check("lo disponible descuenta lo asignado a mezclas y sigue sin ser negativo", disponibleKg({ compradoKg: 500, vendidoKg: 100, asignadoKg: 150 }) === 250 && disponibleKg({ compradoKg: 200, vendidoKg: 100, asignadoKg: 150 }) === 0);
  const acta = lee("docs/migraciones/2026-09-25_mezclas_ctcx_selection.sql");
  check("la base repite la regla al CERRAR, con las mismas cifras que lectura.ts", acta.includes("create trigger guard_mezcla_cerrada") && new RegExp(`if n < ${MIN_COMPONENTES} or n > ${MAX_COMPONENTES}`).test(acta) && new RegExp(`if minkg < ${KG_MINIMOS_POR_COMPONENTE}`).test(acta) && /if prods <> n/.test(acta) && /if new\.grado = 'red' and vars <> 1/.test(acta));
  check("los componentes solo cambian en borrador; una mezcla no se borra, se anula", acta.includes("create trigger guard_mezcla_componente") && /'borrador', 'cerrada', 'anulada'/.test(acta) && !/from\("mezclas"\)\s*\.\s*delete/.test(compras));
  check("RLS y cero políticas en mezclas y componentes", acta.includes("alter table public.mezclas enable row level security") && acta.includes("alter table public.mezcla_componentes enable row level security") && !/create policy [^\n]* on public\.mezcla/.test(acta));
  check("añadir y cerrar pasan por la regla pura antes que por la base", compras.includes("validarComponente(mezcla.grado as GradoDeMezcla, mezcla.componentes, nuevo)") && compras.includes("validarCierre(mezcla.grado, mezcla.componentes)") && compras.includes('update({ status: "cerrada" })'));
  check("«Oferta desde CTCx Selection» descuenta lo asignado a mezclas no anuladas", lee("src/app/ocp/(app)/ctc-selection/page.tsx").includes("asignadoKg") && lee("src/app/ocp/(app)/ctc-selection/page.tsx").includes('neq("mezclas.status", "anulada")'));
  check("la ubicación física existe (decisión 2, texto libre) y las dos pantallas de mezclas", compras.includes("export async function ubicarCompra") && acta.includes("add column ubicacion") && lee("src/app/ocp/(app)/compras/mezclas/page.tsx").includes("crearMezcla") && lee("src/app/ocp/(app)/compras/mezclas/[id]/page.tsx").includes("cerrarMezcla"));
  check("la pantalla habla en kg de CPS y no inventa un factor a verde (decisión 5)", lee("src/app/ocp/(app)/compras/page.tsx").includes("kg de CPS") && !/verde\s*[*×]|factor\s*=\s*0\./.test(lee("src/app/ocp/(app)/compras/page.tsx")));
}

// ── 11. Adquisición de Stock Café (Selection/Sample Kits) — V5.90, owner 2026-09-25 ─────────
// La fuente es la fila 8 del §5 del plan (la 3.ª tanda): los tres kits con sus lotes y pesos, la conversión CPS → verde de la nota
// del owner, y que los 2 kg de muestra NO surten kits. El código se contrasta contra ESA fila, no contra sí mismo.
{
  const fila8 = plan.match(/^\| \*\*8 · CTCx Selection y Compras\*\*.*$/m)?.[0] ?? "";
  const cp = fila8.match(/\*\*CP\*\* = (\d+) lotes × (\d+) g de verde/);
  const plus = fila8.match(/\*\*Plus\*\* = (\d+) lotes × (\d+) kg de verde/);
  const max = fila8.match(/\*\*Max\*\* = (\d+) lotes × (\d+) kg de CPS/);
  const conv = fila8.match(/(\d+) kg de CPS ≈ (\d+) kg de verde/);
  const nota = fila8.match(/(\d+) g de verde ≈ (\d+) g de CPS/);
  check("plan §5 fila 8: la 3.ª tanda nombra los tres kits, la conversión y el nombre nuevo de la entrada", !!(cp && plus && max && conv && nota) && fila8.includes("«Adquisición de Stock Café (Selection/Sample Kits)»") && fila8.includes("«Stock de Sample Kits»"));
  check("KITS = los del owner: CP 8 × 250 g verde · Plus 5 × 2 kg verde · Max 4 × 6 kg CPS", !!cp && !!plus && !!max && KITS.cp.lotes === +cp[1] && KITS.cp.kgPorLote * 1000 === +cp[2] && KITS.cp.unidad === "verde" && KITS.plus.lotes === +plus[1] && KITS.plus.kgPorLote === +plus[2] && KITS.plus.unidad === "verde" && KITS.max.lotes === +max[1] && KITS.max.kgPorLote === +max[2] && KITS.max.unidad === "cps" && Object.keys(KITS).length === 3);
  check("la conversión CPS → verde es la de la nota del owner (125 kg CPS ≈ 90 kg verde)", !!conv && Math.abs(VERDE_POR_CPS - +conv[2] / +conv[1]) < 1e-9);
  check("250 g de verde salen de ≈ 350 g de CPS (± 10 g), y el Max se compra tal cual en CPS", !!nota && Math.abs(kgCpsPorLote("cp") * 1000 - +nota[2]) <= 10 && kgCpsPorLote("max") === KITS.max.kgPorLote && Math.abs(kgCpsDelKit("plus") - (KITS.plus.lotes * KITS.plus.kgPorLote) / VERDE_POR_CPS) < 0.01);
  check("el precio de referencia del CP es el del owner (≈ 65 € · US$65) y solo donde hay un MR o partner CaaS", /65 €/.test(KITS.cp.precioRef) && /US\$65/.test(KITS.cp.precioRef) && /Master Roaster/.test(KITS.cp.para) && /CaaS/.test(KITS.cp.para));
  const kitsSrc = lee("src/lib/compras/sampleKits.ts").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  check("sampleKits.ts es puro (sin red, sin servidor)", !/supabase|server-only|fetch\(/.test(kitsSrc));
  const it = (i, extra = {}) => ({ compraId: "c" + i, lotId: "l" + i, kgCps: kgCpsPorLote("cp"), disponibleKg: 10, ...extra });
  const ocho = Array.from({ length: 8 }, (_, i) => it(i + 1));
  check("al añadir: un noveno lote al CP, la misma compra, el mismo lote, cero kilos o más de lo disponible se rechazan; uno válido pasa", validarItemDeKit("cp", ocho, it(9)).length > 0 && validarItemDeKit("cp", [it(1)], it(2, { compraId: "c1" })).length > 0 && validarItemDeKit("cp", [it(1)], it(2, { lotId: "l1" })).length > 0 && validarItemDeKit("cp", [], it(1, { kgCps: 0 })).length > 0 && validarItemDeKit("cp", [], it(1, { kgCps: 11 })).length > 0 && validarItemDeKit("cp", [it(1)], it(2)).length === 0);
  check("el kit sale ENVIADO solo completo (8 · 5 · 4 lotes)", validarEnvioDeKit("cp", ocho).length === 0 && validarEnvioDeKit("cp", ocho.slice(0, 7)).length > 0 && validarEnvioDeKit("plus", ocho.slice(0, 5)).length === 0 && validarEnvioDeKit("max", ocho.slice(0, 4)).length === 0 && validarEnvioDeKit("max", ocho.slice(0, 3)).length > 0);
  check("lo disponible para kits = comprado − asignado, derivado y nunca negativo", disponibleParaKits({ compradoKg: 12.5, asignadoKg: 2.5 }) === 10 && disponibleParaKits({ compradoKg: 1, asignadoKg: 3 }) === 0);
  check("dos destinos y solo dos: CTCx Selection · Sample Kits", Object.keys(DESTINO_LABEL).sort().join(",") === "sample_kits,selection");
  const acta = lee("docs/migraciones/2026-09-25_adquisicion_stock_sample_kits.sql").replace(/^--.*$/gm, "");
  check("la base: compras.destino con los dos valores, kits SK-AAAA-NNN armado → enviado · anulado, componentes con kg > 0", /add column destino text not null default 'selection' check \(destino in \('selection', 'sample_kits'\)\)/.test(acta) && /'SK-' \|\| to_char\(now\(\), 'YYYY'\)/.test(acta) && /status text not null default 'armado' check \(status in \('armado', 'enviado', 'anulado'\)\)/.test(acta) && /kg_cps numeric not null check \(kg_cps > 0\)/.test(acta) && /unique \(kit_id, compra_id\)/.test(acta));
  check("los guards: componentes solo con el kit armado; lo asignado a kits no anulados nunca supera lo comprado con destino sample_kits", acta.includes("create trigger guard_sample_kit_item") && /v_status is distinct from 'armado'/.test(acta) && acta.includes("create trigger guard_sample_kit_stock") && /v_destino is distinct from 'sample_kits'/.test(acta) && /k\.status <> 'anulado'/.test(acta) && /if v_asignado \+ new\.kg_cps > v_kg/.test(acta));
  check("RLS y cero políticas en sample_kits y sample_kit_items", acta.includes("alter table public.sample_kits enable row level security") && acta.includes("alter table public.sample_kit_items enable row level security") && !/create policy [^\n]* on public\.sample_kit/.test(acta));
  check("las acciones pasan por la regla pura antes que por la base; un kit no se borra, se anula", compras.includes("validarItemDeKit(kit.tipo, kit.items, nuevo)") && compras.includes("validarEnvioDeKit(kit.tipo, kit.items)") && !/from\("sample_kits"\)\s*\.\s*delete/.test(compras) && compras.includes('update({ status: "anulado", anulado_motivo: motivo'));
  check("una compra con kilos en kits no cambia de destino; una compra nueva elige su destino", /asignadoAKitsPorCompra\(service, \[compraId\]\)[\s\S]{0,200}anule esos kits antes de cambiarle el destino/.test(compras) && /const destino = texto\(formData\.get\("destino"\)\) \?\? "selection"/.test(compras));
  const fnClase = (fn) => compras.match(new RegExp(`export async function ${fn}\\([^)]*\\)[^{]*\\{\\s*const permiso = await permisoDeEscritura\\("ocp", "(\\w+)"\\)`))?.[1];
  check("las clases: destinar una compra y enviar el kit EMITEN (mueven la oferta · lo ve quien lo recibe); armar, añadir, quitar y anular son BORRADOR", fnClase("destinarCompra") === "emite" && fnClase("marcarKitEnviado") === "emite" && ["crearKit", "agregarLoteAlKit", "quitarItemDelKit", "anularKit"].every((f) => fnClase(f) === "borrador"));
  check("el kit que nace de un pedido de la tienda lo deja enviado al salir (con la guía)", /if \(kit\.pedidoId\) \{\s*await service\.from\("sample_pack_orders"\)\.update\(\{ status: "enviado", enviado_at: now, enviado_por: adminId, guia, notas_ctc: notas \}\)/.test(compras));
  const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  const rail = sinComentarios(lee("src/lib/panel/consoles.ts"));
  check("el rail: «Adquisición de Stock Café (Selection/Sample Kits)» en /ocp/compras y «Stock de Sample Kits» en OCP · Catálogo; el nombre viejo no queda", /href: "\/ocp\/compras", label: "Adquisición de Stock Café \(Selection\/Sample Kits\)"/.test(rail) && /href: "\/ocp\/sample-kits", label: "Stock de Sample Kits"/.test(rail) && rail.indexOf('"/ocp/sample-kits"') < rail.indexOf('"/ocp/compras"') && !rail.includes("CTCx Selection · Compras") && !sinComentarios(lee("src/app/ocp/(app)/compras/page.tsx")).includes("CTCx Selection · Compras"));
  const ctcSel = lee("src/app/ocp/(app)/ctc-selection/page.tsx");
  check("«Oferta desde CTCx Selection» solo cuenta lo comprado con destino selection", ctcSel.includes('.eq("destino", "selection")'));
  const pagCompras = lee("src/app/ocp/(app)/compras/page.tsx");
  check("Adquisición: el destino por compra (columna + cambio) y en el alta a mano", pagCompras.includes("destinarCompra.bind(null, c.id)") && /<select id="compra-destino" name="destino"/.test(pagCompras) && pagCompras.includes("DESTINO_LABEL"));
  const pagKits = lee("src/app/ocp/(app)/sample-kits/page.tsx");
  const pagKit = lee("src/app/ocp/(app)/sample-kits/[id]/page.tsx");
  check("las dos pantallas de Sample Kits: stock por lote (derivado) + armar; y el kit con añadir · enviar · anular", pagKits.includes("stockDeSampleKits") && pagKits.includes("crearKit") && pagKit.includes("agregarLoteAlKit") && pagKit.includes("marcarKitEnviado") && pagKit.includes("anularKit") && pagKit.includes("validarEnvioDeKit"));
  check("los 2 kg de muestra del circuito NO surten kits (uso exclusivo de CTCx): el plan y la pantalla lo dicen", /Los 2 kg de muestra del circuito NO surten kits/.test(fila8) && /uso exclusivo de CTCx/.test(pagKits) && !/muestra_movimientos|from\("muestras"\)/.test(lee("src/lib/compras/sampleKitsServidor.ts")));
}

if (fallos.length) {
  console.error(`✗ qa-compras: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-compras: ${ok} comprobaciones OK, 0 fallos`);
