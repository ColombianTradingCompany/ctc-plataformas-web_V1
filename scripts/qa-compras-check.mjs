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
//   (10) las mezclas por COMPOSICIÓN (V5.87, reescritas en la V5.91: Single Origin · Regional Blend, MOQ de compra — leído del §14.8 del plan del PVC); (11) V5.90 — «Adquisición de Stock Café (Selection/Sample Kits)»: cada compra dice a qué stock va, los
//   tres Sample Kits (CP · Plus · Max) con los NÚMEROS DEL OWNER leídos de la fila 8 del §5 del plan, lo disponible para kits
//   derivado, los guards de la base, el kit sale completo y nada se borra, y el rail dice el nombre nuevo.
//   (12) V5.195 — el Stock CTCx absorbe el Stock de Sample Kits: los kits se arman con PARTIDAS (verde para CP y Plus, pergamino
//   para Max), una compra es de CTCx Selection o solo de stock (`destino` = selection · stock), `ctc_selection` cuenta solo las de
//   Selection (un saco ya no oculta la finca), y lo recibido o pagado entra al stock. El stock mismo lo vigila `qa-stock-ctcx`.
//   (13) V5.203 (owner, 2026-10-10: «CTCx Compras no parece estar funcionando bien») — con casos, no solo con textos: B1 el embed
//   uno a uno (`listaDe` con objeto, lista y null; nadie hace `.stock_partidas.find(`; el OCP tiene su `error.tsx`); B2 «es Selection»
//   con UNA regla (`esCompraSelection`: Selection y viva) en el OCP; B3 la nota al productor según el destino; B4 ninguna fecha en el
//   futuro; B5 cuándo NO cambia «Es de»; B6 el precio sin «PVC PVC-»; B7 una sola ubicación; B8 ningún fallo tragado; B9 ANULAR una
//   compra (la acción, su migración y que todo lo que lee compras excluya las anuladas); el siguiente paso de cada compra.
//   (14) V5.203 · corrección (nodo final, 2026-10-10) — con casos: la IMAGEN de CTCx Selection re-codificada y con nombre aleatorio,
//   sin listado anónimo y borrada al quitarle a un lote su última compra Selection (decisión 1); CONFIRMAR cuando quitar o poner la
//   marca Selection cambia la cara de un lote que ya sale en la vitrina (decisión 2 / H7); la compra anulada no bloquea el SET NULL de
//   sus FK (decisión 3); el aviso FIJO del contrato y «Reintentar la compra» idempotente (decisión 4 / H1 / H2); y H3–H15.

import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { BUCKET_CTCX, CLAVE_PERFIL_CTCX, KINDS_COMPRA_EN_FIRME, STAGING_ABANDONO_MS, abandonadasDelStaging, disponibleKg, esCompraEnFirme, resumenDeCompras } from "../src/lib/compras/reglas.ts";
import { aPerfilCtcx, rotuloCtcx, urlDeImagenCtcx } from "../src/lib/catalogo/perfilCtcx.ts";
import { CTC_RAZON } from "../src/lib/legal.ts";
import { estadoDelCircuito } from "../src/lib/ocp/circuito.ts";
import { MIN_COMPONENTES, MOQ_KG_MEZCLA, TIPO_MEZCLA_LABEL, resumenDeMezcla, tipoDeMezcla, validarCierre, validarComponente } from "../src/lib/compras/mezclas.ts";
import { MOQ_CARGAS_BLACK_RED, TIPOS_DE_MEZCLA } from "../src/lib/pvc/lectura.ts";
import { DESTINO_LABEL, KITS, VERDE_POR_CPS, contenidoDelKit, kgCpsDelKit, kgCpsPorLote, validarEnvioDeKit, validarItemDeKit } from "../src/lib/compras/sampleKits.ts";

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
  // V5.195: la vista se rehízo con UNA línea distinta — solo las compras de CTCx Selection hacen del lote un Selection.
  const actaStock = lee("docs/migraciones/2026-10-09_stock_ctcx.sql");
  check("V5.195 · ctc_selection cuenta solo las compras de Selection (un saco recibido por un trato ya no oculta la finca)", /FROM compras c\s+WHERE c\.destino = 'selection'::text\) comprado ON comprado\.lot_id = l\.id/.test(actaStock) && /comprado\.lot_id IS NOT NULL AS ctc_selection/.test(actaStock) && /WHEN comprado\.lot_id IS NULL THEN f\.name/.test(actaStock));
  check("V5.195 · destino = selection · stock (sample_kits pasó a stock)", /check \(destino in \('selection', 'stock'\)\)/.test(actaStock) && /update public\.compras set destino = 'stock' where destino = 'sample_kits'/.test(actaStock));
}

// ── 3 y 4. La compra: nace del pago de una oferta de compra en firme y cita el PVC ──
const acciones = lee("src/app/ocp/(app)/contractActions.ts");
const compras = lee("src/app/ocp/(app)/comprasActions.ts");
{
  check("las clases de compra en firme son directa y black; un Lote de Temporada no lo es", KINDS_COMPRA_EN_FIRME.join(",") === "directa,black" && esCompraEnFirme("directa") && esCompraEnFirme("black") && !esCompraEnFirme("temporada") && !esCompraEnFirme("excepcion") && !esCompraEnFirme(null));
  const pago = acciones.slice(acciones.indexOf("export async function registrarPagoDelMes("), acciones.indexOf("export async function ofrecerRenovacion("));
  // V5.203 · corrección (H1/H2): la fila de la compra del mes la arma `compraDelMes` —la MISMA al pagar y al reintentar—.
  const filaDelMes = acciones.slice(acciones.indexOf("function compraDelMes("), acciones.indexOf("/** Si todos los meses del periodo están enviados y pagados"));
  check("registrarPagoDelMes documenta la compra solo si la oferta del contrato es de compra en firme", pago.includes("esCompraEnFirme(oferta.kind)") && pago.includes("const compra = compraDelMes(contract, {") && filaDelMes.includes('origen: "contrato"'));
  check("con los kilos ENVIADOS del mes y el precio pactado", pago.includes("kg: kgComprados") && pago.includes("Number(fila.enviado_kg ?? 0)") && filaDelMes.includes("cop_kg: Number(contract.price_per_kg_locked ?? 0)"));
  check("y nunca un Tyrian", pago.includes('contract.grade_snapshot !== "tyrian"'));
  check("la compra del contrato cita la edición del PVC y el % del contrato", filaDelMes.includes("pvc_edition_id: contract.pvc_edition_id") && filaDelMes.includes("modificador_pct: contract.modificador_pct"));
  check("la compra a mano cita la edición vigente el día del pago", compras.includes("edicionVigente(pagadaAt") && compras.includes("pvc_edition_id: edicion?.id"));
  check("y exige nota y lote galardonado, nunca Tyrian", compras.includes("if (!nota) return") && compras.includes('lot.stage !== "galardonado"') && compras.includes('lot.grade === "tyrian"') && compras.includes('origen: "manual"'));
  // V5.195: `--others --exclude-standard` ve también lo nuevo sin versionar (la compuerta corre antes del commit).
  const src = execSync("git ls-files --cached --others --exclude-standard src", { encoding: "utf8" }).split(/\r?\n/).filter((f) => /\.tsx?$/.test(f));
  const escritores = src.filter((f) => /from\("compras"\)\s*\.\s*(insert|update|upsert|delete)/.test(readFileSync(f, "utf8").replace(/\r?\n\s*/g, " ")));
  // V5.176 (docs/PLAN_CICLOS.md §5): el trato por ventanas registra el saco y el adelanto RECIBIDOS como compra de CTCx (solo stock
  // desde la V5.195) al recibir el despacho; lo vendido no (se vende a nombre del productor). V5.195: el cuarto escritor es
  // `stockActions` (la fecha de recibo, al entrar una compra al Stock CTCx), y solo ese.
  check("compras la escriben SOLO contractActions (el pago), comprasActions (a mano), ventanaActions (el saco y el adelanto recibidos) y stockActions (la fecha de recibo al entrar al stock)", escritores.length === 4 && escritores.includes("src/app/ocp/(app)/contractActions.ts") && escritores.includes("src/app/ocp/(app)/comprasActions.ts") && escritores.includes("src/app/ocp/(app)/ventanaActions.ts") && escritores.includes("src/app/ocp/(app)/stockActions.ts"), escritores.join(", "));
  const ventana = readFileSync("src/app/ocp/(app)/ventanaActions.ts", "utf8");
  check("y la del trato por ventanas es solo de stock, cita su edición, nunca Tyrian ni lo vendido ni una devolución", ventana.includes('d.tipo !== "vendido" && resultado !== "devolucion" && c.grade_snapshot && c.grade_snapshot !== "tyrian"') && ventana.includes('origen: "contrato", destino: "stock"') && ventana.includes("pvc_edition_id: c.pvc_edition_id"));
  check("V5.195 · lo recibido (también lo vendido, comprometido) entra al Stock CTCx en pergamino; una devolución no", /if \(resultado !== "devolucion"\) \{[\s\S]{0,200}crearRaizDeStock\(service, raizDelDespacho\(c, lot\.name, d, \{/.test(ventana) && ventana.includes('return { lotId: c.lot_id, estado: "pergamino"') && ventana.includes('origen: "despacho", despachoId: d.id, compraId: e.compraId, comprometido: d.tipo === "vendido"'));
  check("V5.195 · lo pagado de una compra en firme y la compra a mano que ya llegó entran al stock (idempotente por compra)", /crearRaizDeStock\(service, \{ lotId: contract\.lot_id, estado: "pergamino", kg: kgComprados, costoCopKg: compra\.cop_kg, origen: "compra", compraId: guardada\.id/.test(acciones) && /if \(recibidaAt\) \{\s*const raiz = await crearRaizDeStock\(service, \{ lotId, estado: "pergamino", kg, costoCopKg: copKg, origen: "compra", compraId: fila\.id/.test(compras));
  // 5. El CRM se retiró
  const conCrm = src.filter((f) => /from\("black_negotiations"\)/.test(readFileSync(f, "utf8")));
  check("black_negotiations no tiene escritor ni lector en src (tabla dormida)", conCrm.length === 0, conCrm.join(", "));
  check("decideBlackNegotiation y el kanban se fueron", !acciones.includes("export async function decideBlackNegotiation") && !src.some((f) => /ctcSelectionActions|SelectionBoard|BlackStockCard|\(app\)\/ctc-selection\/seleccion/.test(f)));
  check("el veredicto ya no abre negociaciones", !/from\("black_negotiations"\)/.test(lee("src/app/ocp/(app)/nominadosActions.ts")));
  // V5.193: la regla vive en UNA tabla (`gradosPorClase.ts`) que leen la acción y la cola de «Pendiente Oferta».
  const { kindAllowsGrade: admite, vaALaColaDeTemporada: aLaCola } = await import("../src/lib/ofertas/gradosPorClase.ts");
  check("un Black recibe temporada/directa/excepción como los demás grados (y entra a la cola de Pendiente Oferta)",
    ["temporada", "directa", "excepcion"].every((k) => admite(k, "black")) && aLaCola("black") &&
    lee("src/app/ocp/(app)/ofertasActions.ts").includes('from "@/lib/ofertas/gradosPorClase"'));
}

// ── 6. El perfil único y la imagen por lote (respuesta 7) ───────────────────
{
  check("el perfil vive en platform_settings bajo UNA clave", CLAVE_PERFIL_CTCX === "ctcx_selection_perfil" && compras.includes('{ onConflict: "key" }'));
  // V5.203 · corrección (decisión 1): el navegador sube al STAGING privado; lo público lo escribe el servidor, re-codificado (§ 14).
  check("la imagen se sube con URL firmada al staging privado, desde el navegador", BUCKET_CTCX === "ctcx-selection" && compras.includes("service.storage.from(BUCKET_CTCX_STAGING).createSignedUploadUrl(path)") && lee("src/app/ocp/(app)/ctc-selection/ImagenCtcxUploader.tsx").includes("storage.from(BUCKET_CTCX_STAGING).uploadToSignedUrl("));
  check("la imagen por lote es de un lote COMPRADO (al pedir la subida y otra vez al fijarla)", compras.includes("La imagen por lote es de un lote COMPRADO") && (compras.match(/await loteConSelectionViva\(service, destino\.lotId\)/g) ?? []).length === 2);
  check("la ruta de la imagen se valida antes de fijarla (su carpeta, un uuid y la extensión de una imagen)", compras.includes("if (!subida.startsWith(carpeta) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$/i.test(subida.slice(carpeta.length)))") && compras.includes('destino?.tipo === "lote" && esUuid(destino.lotId) ? `lotes/${destino.lotId}/` : null'));
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
  ];
  for (const [n, f] of caras) {
    const t = lee(f);
    check(`la ${n} enseña el perfil (rotuloCtcx) en vez de la finca y lo lee de la vista pública`, /ctc_selection \? rotuloCtcx\(perfil\)/.test(t) && t.includes("VISTA_PERFIL_CTCX"));
  }
  // V5.198: el portal pinta el Dossier PÚBLICO (`lib/catalogo/vitrina.ts` → `dossierPublico()`); la ficha técnica se retiró y su
  // dirección redirige al dossier. La regla de CTCx Selection (D3.1) vive en la vitrina: rótulo, descripción e imagen del perfil.
  const vitrina = lee("src/lib/catalogo/vitrina.ts");
  check("el Dossier público de un lote de CTCx Selection enseña el perfil (rótulo, descripción, imagen) y lo lee de la vista pública", vitrina.includes("if (fila.ctc_selection) {") && vitrina.includes("ctcx = { nombre: rotuloCtcx(perfil), descripcion: perfil.descripcion, imagenUrl: urlDeImagenCtcx(fila.ctcx_imagen_path) ?? perfil.imagenUrl };") && vitrina.includes("VISTA_PERFIL_CTCX"));
  check("la cinta y el portal pintan la imagen por lote, con la del perfil de respaldo", lee(caras[0][1]).includes("urlDeImagenCtcx(fila.ctcx_imagen_path) ?? perfil.imagenUrl") && vitrina.includes("urlDeImagenCtcx(fila.ctcx_imagen_path) ?? perfil.imagenUrl"));
  check("ni la cinta ni la tienda escriben la razón social a mano", !lee(caras[0][1]).includes('"Colombian Trading Company"') && !lee(caras[1][1]).includes('"Colombian Trading Company"'));
}

// ── 8. El circuito y la barra del productor: «CTCx Selection» con la misma regla ──
{
  const base = { stage: "galardonado", registradoPorCtc: false, tieneInscripcion: true, pagoConfirmado: true, muestraRecibida: true, enBache: false, grado: "black", ultimaOferta: "aceptada", contrato: "completed" };
  check("paso 19: con compras el lote es CTCx Selection (lateral buena)", estadoDelCircuito({ ...base, compradoEnFirme: true }).estado === "ctcx_selection");
  check("sin compras, un contrato cumplido sigue siendo catálogo activo", estadoDelCircuito(base).estado === "catalogo_activo");
  check("la ruptura manda sobre la compra; la mora de un contrato en curso también", estadoDelCircuito({ ...base, contrato: "ruptura", compradoEnFirme: true }).estado === "ruptura" && estadoDelCircuito({ ...base, contrato: "active", enMora: true, compradoEnFirme: true }).estado === "en_mora");
  // V5.203 (B2): ya no basta CUALQUIER compra — solo las de Selection vivas (`lotesSelection` → `esCompraSelection`).
  check("la tabla del OCP lee compras y pasa compradoEnFirme (solo las de Selection vivas)", lee("src/app/ocp/(app)/kr/carga.ts").includes('from("compras").select("lot_id, destino, anulada_at")') && lee("src/app/ocp/(app)/kr/carga.ts").includes("lotesSelection(") && lee("src/app/ocp/(app)/kr/carga.ts").includes("compradoEnFirme: compradoEnFirme.has(l.id)"));
  check("la barra del productor lo deriva con esCompraEnFirme (misma regla) y un mes pagado", lee("src/components/kaffetal-regal/panel/PerfilTab.tsx").includes("esCompraEnFirme(ofertaDelContrato?.kind)") && lee("src/components/kaffetal-regal/panel/PerfilTab.tsx").includes("months.some((m) => m.pagadoAt)"));
  check("y CONT queda hecho como «CTCx Selection»", lee("src/components/kaffetal-regal/LotKanbanStepper.tsx").includes('estado === "ctcx_selection"'));
}

// ── 9. Decisión 7: «Oferta desde CTCx Selection» es la disponibilidad; se publica desde un contrato cumplido ──
{
  const pantalla = lee("src/app/ocp/(app)/ctc-selection/page.tsx");
  // V5.203 (H5): lo libre ya no es «comprado − mezclas» en CPS: se lee del Stock CTCx (`movimientosDe` = `stock_disponible`), pergamino y
  // verde por separado, y «Declarar en el Triage →» abre ESA partida.
  check("«Oferta desde CTCx Selection» lee compras y su stock REAL (movimientosDe), pergamino y verde aparte; se publica declarando en el Triage (V5.196)", pantalla.includes('from("compras")') && pantalla.includes("cargarStock(service)") && pantalla.includes("movimientosDe(p, stock)") && pantalla.includes("Pergamino libre (kg de CPS)") && pantalla.includes("Verde libre (kg de verde)") && pantalla.includes("rutaDelTriage({ partida: l.declarable.id, declarar: true })") && pantalla.includes("Declarar en el Triage →") && !pantalla.includes("disponibleKg({ compradoKg"));
  check("y edita el perfil único y la imagen por lote", pantalla.includes("guardarPerfilCtcx") && pantalla.includes('destino={{ tipo: "perfil" }}') && pantalla.includes('destino={{ tipo: "lote", lotId: l.id }}'));
  // V5.196: publicar dejó de ser del Catálogo Activo — se declara en el Triage (`triage_declarar`); el Catálogo edita lo comercial.
  const catAcc = lee("src/app/ocp/(app)/catalogActions.ts");
  check("V5.196 · el Catálogo Activo ya no publica a mano (sin publishLot); edita lo comercial y archiva lo que no tiene entradas", !/export async function publishLot\(/.test(catAcc) && catAcc.includes("export async function editarListado(") && catAcc.includes("export async function archivarListado("));
  check("el Catálogo enseña «CTCx Selection» (solo las compras de Selection) y edita cada listado con su ancla", lee("src/app/ocp/(app)/catalogo/page.tsx").includes('.eq("destino", "selection")') && lee("src/app/ocp/(app)/catalogo/page.tsx").includes("selection.has(l.lotId)") && lee("src/app/ocp/(app)/catalogo/page.tsx").includes("editarListado.bind(null, l.id)"));
  // (la ruta vieja no se escribe aquí: `qa-rutas-consolas` (c) barre también los scripts)
  check("la pestaña «Selección» dejó su talón (308)", /de: "\/ocp\/ctc-selection\/selecci[oó]n", a: "\/ocp\/ctc-selection", desde: "V5\.85"/.test(lee("src/lib/panel/rutasMovidas.ts")));
  const p19 = paso(19);
  check("paso 19 del plan: ventana de 30 días y PVC − 8 %, y la pantalla lo dice", /\*\*ventana de 30 días\*\*/.test(p19) && /\*\*PVC − 8 %\*\*/.test(p19) && pantalla.includes("PVC − 8 %, 30 días"));
  // V5.203: el alta a mano es un componente cliente (`CompraManualForm`) y la carga vive en `adquisicionServidor.ts`.
  check("Compras: la tabla y el alta a mano", lee("src/app/ocp/(app)/compras/page.tsx").includes("<CompraManualForm") && lee("src/app/ocp/(app)/compras/CompraManualForm.tsx").includes("action={registrarCompraManual}") && lee("src/lib/compras/adquisicionServidor.ts").includes("pvc_editions(code)"));
}

// ── 10. Las mezclas por COMPOSICIÓN (V5.87 → reescritas en la V5.91): la regla se LEE del plan del PVC (§14.8) y de lectura.ts ──
// Owner, 2026-09-25 (decisión 4 del brief): la regla 3–4 se retira de raíz; cada lote trae su composición; Black/Red = Single
// Origin (varios estates, misma variedad y proceso) o Regional Blend (misma región); el mínimo es el MOQ de compra (≥ 3 cargas);
// CTCx asegura un mínimo por temporada desde Adquisición. El código se contrasta contra el plan, no contra sí mismo.
{
  const pvc = lee("docs/PVC_BCP_PLAN.md");
  const r4 = (pvc.match(/### 14\.8[\s\S]*$/) ?? [""])[0];
  check("PVC plan §14.8: la regla 3–4 se retira de raíz; Single Origin · Regional Blend; MOQ de compra ≥ 3 cargas; mínimo por temporada", /se retira de raíz\*\*/.test(r4) && /\*\*Single Origin\*\*/.test(r4) && /\*\*Regional Blend\*\*/.test(r4) && /una demanda de al menos 3 cargas/.test(r4) && /asegura un mínimo por temporada desde Adquisición/.test(r4));
  check("la regla se LEE de lectura.ts y terminos.ts: los rótulos, el MOQ en kg (3 × 125) y «varios» = 2 o más", TIPO_MEZCLA_LABEL.single_origin === TIPOS_DE_MEZCLA[0] && TIPO_MEZCLA_LABEL.regional_blend === TIPOS_DE_MEZCLA[1] && MOQ_KG_MEZCLA === MOQ_CARGAS_BLACK_RED * 125 && MIN_COMPONENTES === 2);
  const mezclasSrc = lee("src/lib/compras/mezclas.ts").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  check("mezclas.ts es puro, no copia cifras ni conserva la regla vieja", !/supabase|server-only/.test(mezclasSrc) && mezclasSrc.includes('from "@/lib/pvc/lectura"') && mezclasSrc.includes('from "@/lib/trato/terminos"') && !/=\s*\[?\s*3\s*,\s*4\s*\]?/.test(mezclasSrc) && !/=\s*125\b/.test(mezclasSrc) && !/MAX_COMPONENTES|KG_MINIMOS_POR_COMPONENTE|unaSolaVariedad|CARGAS_POR_PRODUCTOR|LOTES_EN_MEZCLA/.test(mezclasSrc));
  const c = (i, extra = {}) => ({ compraId: "c" + i, kg: 100, producerId: "p" + i, fincaId: "f" + i, departamento: "Santander", variedad: "Caturra", proceso: "Lavado", grado: "red", disponibleKg: 500, ...extra });
  check("Single Origin: dos estates con la misma variedad y proceso — cierra y el tipo se deriva", validarCierre("red", [c(1), c(2)]).length === 0 && tipoDeMezcla([c(1), c(2)]).tipo === "single_origin");
  check("Regional Blend: lotes de la misma región con variedades o procesos distintos — cierra", validarCierre("red", [c(1), c(2, { variedad: "Castillo" }), c(3, { proceso: "Honey" })]).length === 0 && tipoDeMezcla([c(1), c(2, { variedad: "Castillo" })]).tipo === "regional_blend");
  check("ni una ni otra (variedades y regiones distintas) no cierra", validarCierre("red", [c(1), c(2, { variedad: "Geisha", departamento: "Huila" })]).length > 0);
  check("un solo lote no cierra («varios»); dos del mismo estate sin región tampoco (un Single Origin es de varios estates)", validarCierre("red", [c(1)]).length > 0 && validarCierre("red", [c(1, { departamento: null }), c(2, { fincaId: "f1", departamento: null })]).length > 0);
  check("la regla 3–4 NO existe: cinco lotes cierran, 10 kg por componente valen", validarCierre("black", [1, 2, 3, 4, 5].map((i) => c(i, { grado: "black" }))).length === 0 && validarComponente("red", [c(1)], c(2, { kg: 10 })).length === 0);
  // V5.99 (owner, 2026-09-30): un blend de UN productor es un lote (se arma en KR); la mezcla de CTCx Selection es de varios productores.
  check("un solo productor con dos fincas NO cierra: es un tipo de lote, no una mezcla", validarCierre("red", [c(1), c(2, { producerId: "p1" })]).some((e) => /varios productores/.test(e)));
  check("la composición se lee ENTERA: un lote con dos variedades hace Regional Blend aunque su proyección diga Caturra", tipoDeMezcla([c(1), c(2, { variedades: ["Caturra", "Castillo"], procesos: ["Lavado"] })]).tipo === "regional_blend" && tipoDeMezcla([c(1, { variedades: ["Caturra"], procesos: ["Lavado"], fincaIds: ["f1", "f9"] }), c(2, { fincaIds: ["f2"] })]).tipo === "single_origin");
  check("un lote con fincas en dos departamentos no es Regional Blend", tipoDeMezcla([c(1, { departamentos: ["Santander", "Huila"], variedades: ["Caturra", "Castillo"] }), c(2)]).tipo === null);
  check("Red con dos variedades cierra si son de la misma región (ya no es «una sola variedad»)", validarCierre("red", [c(1), c(2, { variedad: "Geisha" })]).length === 0);
  check("un componente de otro grado, o más kilos de los disponibles, no cierra", validarCierre("red", [c(1), c(2, { grado: "black" })]).length > 0 && validarCierre("red", [c(1), c(2, { kg: 600 })]).length > 0);
  check("al añadir: otra región con otra composición se rechaza; el mismo estate en formación de Single Origin pasa", validarComponente("red", [c(1)], c(2, { variedad: "Geisha", departamento: "Huila" })).length > 0 && validarComponente("red", [c(1)], c(2, { fincaId: "f1" })).length === 0);
  check("lotes sin variedad/proceso ni región no dan tipo", tipoDeMezcla([c(1, { variedad: null, departamento: null }), c(2, { variedad: null, departamento: null })]).tipo === null);
  const r = resumenDeMezcla([c(1), c(2, { kg: 300 })]);
  check("el resumen dice el tipo, los estates y si cubre el MOQ de compra (400 kg ≥ 375; 200 no)", r.tipo === "single_origin" && r.estates === 2 && r.cubreMoq === true && resumenDeMezcla([c(1), c(2)]).cubreMoq === false);
  check("lo disponible descuenta lo asignado a mezclas y sigue sin ser negativo", disponibleKg({ compradoKg: 500, vendidoKg: 100, asignadoKg: 150 }) === 250 && disponibleKg({ compradoKg: 200, vendidoKg: 100, asignadoKg: 150 }) === 0);
  const acta87 = lee("docs/migraciones/2026-09-25_mezclas_ctcx_selection.sql");
  const acta = lee("docs/migraciones/2026-09-25_mezclas_composicion.sql").replace(/^--.*$/gm, "");
  const acta99 = lee("docs/migraciones/2026-09-30_mezclas_como_tipo_de_lote.sql").replace(/^--.*$/gm, "");
  check("V5.99: el guard lee la composición ENTERA (varieties de la ficha + lot_contributions) y exige varios productores", /jsonb_array_elements\(case when jsonb_typeof\(comp\.datasheet->'varieties'\)/.test(acta99) && /join public\.lot_contributions lc on lc\.lot_id = comp\.lot_id/.test(acta99) && /if productores < 2 then/.test(acta99) && /variedades = 1 and procesos = 1 and estates >= 2 then v_tipo := 'single_origin'/.test(acta99));
  check("la base deriva el MISMO tipo al cerrar y guarda tipo, temporada y objetivo; la regla vieja salió del guard", /add column tipo text check \(tipo in \('single_origin', 'regional_blend'\)\)/.test(acta) && /add column objetivo_temporada_kg numeric check \(objetivo_temporada_kg > 0\)/.test(acta) && /if n < 2 then raise exception/.test(acta) && /composiciones = 1 and estates >= 2 then v_tipo := 'single_origin'/.test(acta) && /regiones = 1 then v_tipo := 'regional_blend'/.test(acta) && /new\.tipo <> v_tipo/.test(acta) && !/if n < 3 or n > 4/.test(acta) && !/prods <> n/.test(acta) && !/minkg < 125/.test(acta) && !/vars <> 1/.test(acta));
  check("los componentes solo cambian en borrador; una mezcla no se borra, se anula (V5.87 sigue)", acta87.includes("create trigger guard_mezcla_componente") && /'borrador', 'cerrada', 'anulada'/.test(acta87) && !/from\("mezclas"\)\s*\.\s*delete/.test(compras));
  check("RLS y cero políticas en mezclas y componentes", acta87.includes("alter table public.mezclas enable row level security") && acta87.includes("alter table public.mezcla_componentes enable row level security") && !/create policy [^\n]* on public\.mezcla/.test(acta87) && !/create policy/.test(acta));
  check("añadir y cerrar pasan por la regla pura antes que por la base, y el cierre escribe el tipo derivado", compras.includes("validarComponente(mezcla.grado as GradoDeMezcla, mezcla.componentes, nuevo)") && compras.includes("validarCierre(mezcla.grado, mezcla.componentes)") && compras.includes('update({ status: "cerrada", tipo })') && compras.includes("tipoDeMezcla(mezcla.componentes).tipo"));
  check("las mezclas se arman con compras destinadas a Selection (vivas: `esCompraSelection`) y con la composición del lote (variedad, proceso, finca, región)", /if \(!esCompraSelection\(compra\)\) return/.test(compras) && lee("src/lib/compras/mezclasServidor.ts").includes("lots(name, producer_id, ficha_variedad, ficha_proceso, datasheet, fincas(id, name, departamento), lot_contributions(fincas(id, name, departamento)))"));
  check("el mínimo por temporada existe (informativo) y las dos pantallas hablan de Single Origin · Regional Blend y del MOQ de compra", compras.includes("export async function guardarObjetivoDeMezcla") && lee("src/app/ocp/(app)/compras/mezclas/page.tsx").includes("MOQ_CARGAS_BLACK_RED") && lee("src/app/ocp/(app)/compras/mezclas/[id]/page.tsx").includes("guardarObjetivoDeMezcla") && lee("src/app/ocp/(app)/compras/mezclas/[id]/page.tsx").includes("TIPO_MEZCLA_LABEL"));
  // V5.203: lo asignado a mezclas no anuladas lo trae el Stock CTCx (`cargarStock` → `reservasMezcla`) y ya descuenta del disponible.
  check("«Oferta desde CTCx Selection» descuenta lo asignado a mezclas no anuladas", lee("src/app/ocp/(app)/ctc-selection/page.tsx").includes("stock.reservasMezcla") && lee("src/lib/stock/servidor.ts").includes('.neq("mezclas.status", "anulada")'));
  check("la ubicación física existe (decisión 2, texto libre)", compras.includes("export async function ubicarCompra") && acta87.includes("add column ubicacion"));
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
  const it = (i, extra = {}) => ({ partidaId: "p" + i, lotId: "l" + i, kg: KITS.cp.kgPorLote, disponibleKg: 10, contenido: "verde", comprometido: false, ...extra });
  const ocho = Array.from({ length: 8 }, (_, i) => it(i + 1));
  check("al añadir: un noveno lote al CP, la misma partida, el mismo lote, cero kilos o más de lo disponible se rechazan; uno válido pasa", validarItemDeKit("cp", ocho, it(9)).length > 0 && validarItemDeKit("cp", [it(1)], it(2, { partidaId: "p1" })).length > 0 && validarItemDeKit("cp", [it(1)], it(2, { lotId: "l1" })).length > 0 && validarItemDeKit("cp", [], it(1, { kg: 0 })).length > 0 && validarItemDeKit("cp", [], it(1, { kg: 11 })).length > 0 && validarItemDeKit("cp", [it(1)], it(2)).length === 0);
  check("V5.195 · el café del kit: CP y Plus llevan verde, Max pergamino; lo comprometido no surte", contenidoDelKit("cp") === "verde" && contenidoDelKit("plus") === "verde" && contenidoDelKit("max") === "pergamino" && validarItemDeKit("max", [], it(1, { kg: 6, contenido: "verde" })).length > 0 && validarItemDeKit("max", [], it(1, { kg: 6, contenido: "pergamino" })).length === 0 && validarItemDeKit("cp", [], it(1, { contenido: "tostado" })).length > 0 && validarItemDeKit("cp", [], it(1, { comprometido: true })).length > 0);
  check("el kit sale ENVIADO solo completo (8 · 5 · 4 lotes)", validarEnvioDeKit("cp", ocho).length === 0 && validarEnvioDeKit("cp", ocho.slice(0, 7)).length > 0 && validarEnvioDeKit("plus", ocho.slice(0, 5)).length === 0 && validarEnvioDeKit("max", ocho.slice(0, 4)).length === 0 && validarEnvioDeKit("max", ocho.slice(0, 3)).length > 0);
  check("dos destinos y solo dos: CTCx Selection · solo Stock CTCx", Object.keys(DESTINO_LABEL).sort().join(",") === "selection,stock");
  const acta = lee("docs/migraciones/2026-09-25_adquisicion_stock_sample_kits.sql").replace(/^--.*$/gm, "");
  check("la base: compras.destino con los dos valores, kits SK-AAAA-NNN armado → enviado · anulado, componentes con kg > 0", /add column destino text not null default 'selection' check \(destino in \('selection', 'sample_kits'\)\)/.test(acta) && /'SK-' \|\| to_char\(now\(\), 'YYYY'\)/.test(acta) && /status text not null default 'armado' check \(status in \('armado', 'enviado', 'anulado'\)\)/.test(acta) && /kg_cps numeric not null check \(kg_cps > 0\)/.test(acta) && /unique \(kit_id, compra_id\)/.test(acta));
  check("los guards de la V5.90: componentes solo con el kit armado (sigue igual)", acta.includes("create trigger guard_sample_kit_item") && /v_status is distinct from 'armado'/.test(acta) && acta.includes("create trigger guard_sample_kit_stock"));
  const actaStock = lee("docs/migraciones/2026-10-09_stock_ctcx.sql");
  check("V5.195 · la compuerta del stock de los kits se reescribió sobre partidas: lote, contenido del kit, sin comprometer, dentro del disponible", /create or replace function public\.guard_sample_kit_stock\(\)/.test(actaStock) && actaStock.includes("Desde la V5.195 un Sample Kit se arma con partidas del Stock CTCx.") && /v_requerido := case when v_tipo = 'max' then 'pergamino' else 'verde' end;/.test(actaStock) && /if p\.comprometido then/.test(actaStock) && /if new\.kg > v_disp \+ 0\.0005 then/.test(actaStock));
  check("V5.195 · al enviarse el kit sus ítems salen del stock; al anular uno enviado, vuelven", /if old\.status = 'armado' and new\.status = 'enviado' then\s*insert into public\.stock_salidas/.test(actaStock) && /elsif old\.status = 'enviado' and new\.status = 'anulado' then\s*update public\.stock_salidas/.test(actaStock) && /after update of status on public\.sample_kits/.test(actaStock));
  check("RLS y cero políticas en sample_kits y sample_kit_items", acta.includes("alter table public.sample_kits enable row level security") && acta.includes("alter table public.sample_kit_items enable row level security") && !/create policy [^\n]* on public\.sample_kit/.test(acta));
  check("las acciones pasan por la regla pura antes que por la base; un kit no se borra, se anula", compras.includes("validarItemDeKit(kit.tipo, kit.items, nuevo)") && compras.includes("validarEnvioDeKit(kit.tipo, kit.items)") && !/from\("sample_kits"\)\s*\.\s*delete/.test(compras) && compras.includes('update({ status: "anulado", anulado_motivo: motivo'));
  // V5.203: «Es de» ya NO tiene valor por defecto (antes `?? "selection"`): quien registra lo elige.
  check("V5.195 · cambiar el destino ya no mira los kits (se arman con partidas); una compra nueva ELIGE si es de Selection (sin valor por defecto, V5.203)", !compras.includes("asignadoAKitsPorCompra") && !/formData\.get\("destino"\)\) \?\? "selection"/.test(compras) && /const destino = texto\(formData\.get\("destino"\)\);\s*if \(!esDestino\(destino\)\) return \{ ok: false/.test(compras));
  check("V5.195 · al añadir un lote al kit, la acción lee la partida y su disponible de la base", /const \{ data: disp \} = await service\.rpc\("stock_disponible", \{ p_partida: partida\.id \}\)/.test(compras) && compras.includes('.from("sample_kit_items").insert({ kit_id: kitId, partida_id: partida.id, kg })'));
  check("V5.195 · una mezcla mira el disponible de la raíz de su compra en el stock (un kilo no va a una mezcla y a un kit)", /\.from\("stock_partidas"\)\.select\("id"\)\.eq\("compra_id", compraId\)/.test(compras) && /Math\.min\(Number\(compra\.kg\) - asignado, libreEnStock\)/.test(compras));
  const fnClase = (fn) => compras.match(new RegExp(`export async function ${fn}\\([^)]*\\)[^{]*\\{\\s*const permiso = await permisoDeEscritura\\("ocp", "(\\w+)"\\)`))?.[1];
  check("las clases: destinar una compra y enviar el kit EMITEN (mueven la oferta · lo ve quien lo recibe); armar, añadir, quitar y anular son BORRADOR", fnClase("destinarCompra") === "emite" && fnClase("marcarKitEnviado") === "emite" && ["crearKit", "agregarLoteAlKit", "quitarItemDelKit", "anularKit"].every((f) => fnClase(f) === "borrador"));
  check("el kit que nace de un pedido de la tienda lo deja enviado al salir (con la guía)", /if \(kit\.pedidoId\) \{\s*await service\.from\("sample_pack_orders"\)\.update\(\{ status: "enviado", enviado_at: now, enviado_por: adminId, guia, notas_ctc: notas \}\)/.test(compras));
  const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  const rail = sinComentarios(lee("src/lib/panel/consoles.ts"));
  check("el rail (V5.195): «Adquisición de Stock Café» y, tras ella, «Stock CTCx»; el Stock de Sample Kits ya no es una entrada; el nombre viejo no queda", /href: "\/ocp\/compras", label: "Adquisición de Stock Café" \}/.test(rail) && /href: "\/ocp\/stock", label: "Stock CTCx" \}/.test(rail) && rail.indexOf('"/ocp/stock"') > rail.indexOf('"/ocp/compras"') && !/\/ocp\/sample-kits/.test(rail) && !rail.includes("Stock de Sample Kits") && !rail.includes("CTCx Selection · Compras") && !sinComentarios(lee("src/app/ocp/(app)/compras/page.tsx")).includes("CTCx Selection · Compras"));
  const ctcSel = lee("src/app/ocp/(app)/ctc-selection/page.tsx");
  check("«Oferta desde CTCx Selection» solo cuenta lo comprado con destino selection y vivo (esCompraSelection)", ctcSel.includes("todas.filter(esCompraSelection)"));
  const pagCompras = lee("src/app/ocp/(app)/compras/page.tsx");
  const formCompra = lee("src/app/ocp/(app)/compras/CompraManualForm.tsx");
  check("Adquisición: el destino por compra (columna + cambio) y en el alta a mano; y la raíz en el Stock CTCx o «Entrar al stock»", pagCompras.includes("destinarCompra.bind(null, c.id)") && /<select id="compra-destino" name="destino"/.test(formCompra) && pagCompras.includes("DESTINO_LABEL") && formCompra.includes("DESTINO_LABEL") && pagCompras.includes("entrarCompraAlStock.bind(null, c.id)") && lee("src/lib/compras/adquisicionServidor.ts").includes("stock_partidas(id, codigo, anulada_at"));
  const pagKits = lee("src/app/ocp/(app)/stock/sample-kits/page.tsx");
  const pagKit = lee("src/app/ocp/(app)/stock/sample-kits/[id]/page.tsx");
  check("las dos pantallas de Sample Kits (pestaña del Stock CTCx): las partidas que surten + armar; y el kit con añadir · enviar · anular", pagKits.includes("partidasParaKits") && pagKits.includes("crearKit") && pagKits.includes('<StockTabs activa="kits" />') && pagKit.includes("agregarLoteAlKit") && pagKit.includes("marcarKitEnviado") && pagKit.includes("anularKit") && pagKit.includes("validarEnvioDeKit") && pagKit.includes('name="partida_id"'));
  check("los 2 kg de muestra del circuito NO surten kits (uso exclusivo de CTCx): el plan y la pantalla lo dicen", /Los 2 kg de muestra del circuito NO surten kits/.test(fila8) && /uso exclusivo de CTCx/.test(pagKits) && !/muestra_movimientos|from\("muestras"\)/.test(lee("src/lib/compras/sampleKitsServidor.ts")));
}

// ── 13. V5.203 (owner, 2026-10-10): «CTCx Compras no parece estar funcionando bien» — los bugs B1–B9, con casos ──────────────
{
  const A = await import("../src/lib/compras/adquisicion.ts");
  const S = await import("../src/lib/compras/selection.ts");
  const pagina = lee("src/app/ocp/(app)/compras/page.tsx");
  const carga = lee("src/lib/compras/adquisicionServidor.ts");
  const form = lee("src/app/ocp/(app)/compras/CompraManualForm.tsx");
  const accionesStock = lee("src/app/ocp/(app)/stockActions.ts");
  const contrato = lee("src/app/ocp/(app)/contractActions.ts");
  const ventana = lee("src/app/ocp/(app)/ventanaActions.ts");
  const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");

  // B1 — la caída: `stock_partidas.compra_id` es UNIQUE y PostgREST devuelve OBJETO o null. La normalización, con los tres casos.
  const raizA = { id: "a", codigo: "SX-1", anulada_at: null };
  const raizB = { id: "b", codigo: "SX-2", anulada_at: "2026-10-10" };
  // Un fallo aquí es justo la caída del 2026-10-10 («….find is not a function»): se cuenta como fallo, no tumba el guardián.
  const sinLanzar = (fn) => { try { return fn(); } catch { return false; } };
  check("B1 · listaDe: un objeto → [objeto]; una lista → la misma; null/undefined → []", sinLanzar(() => JSON.stringify(A.listaDe(raizA)) === JSON.stringify([raizA]) && A.listaDe([raizA, raizB]).length === 2 && A.listaDe(null).length === 0 && A.listaDe(undefined).length === 0));
  check("B1 · raizVivaDe: con el objeto que de verdad devuelve la base, con una lista y con null", sinLanzar(() => A.raizVivaDe(raizA)?.id === "a" && A.raizVivaDe(raizB) === null && A.raizVivaDe([raizB, raizA])?.id === "a" && A.raizVivaDe(null) === null));
  const codigoOcp = execSync("git ls-files --cached --others --exclude-standard src/app/ocp src/lib", { encoding: "utf8" }).split(/\r?\n/).filter((f) => /\.tsx?$/.test(f) && existsSync(f));
  const tratadasComoLista = codigoOcp.filter((f) => /\.stock_partidas\??\.(find|map|filter|some|length|forEach|reduce)\b/.test(sinComentarios(readFileSync(f, "utf8"))));
  check("B1 · nadie trata el embed uno a uno `stock_partidas` como lista en src/app/ocp ni src/lib", tratadasComoLista.length === 0, tratadasComoLista.join(", "));
  check("B1 · la carga de Adquisición normaliza el embed (raizVivaDe/listaDe) y lo tipa objeto | lista | null", carga.includes("raizVivaDe(c.stock_partidas)") && carga.includes("stock_partidas: RaizEmb | RaizEmb[] | null;") && pagina.includes("cargarAdquisicion(service)"));
  const errorOcp = existsSync("src/app/ocp/(app)/error.tsx") ? lee("src/app/ocp/(app)/error.tsx") : "";
  check("B1 · el OCP tiene su error.tsx (cliente, con reintentar y el digest): un tablero que falla no tumba la consola", errorOcp.startsWith('"use client";') && errorOcp.includes("retry: () => void") && errorOcp.includes("onClick={() => retry()}") && errorOcp.includes("error.digest"));

  // B2 — «es Selection» con UNA regla.
  check("B2 · esCompraSelection: Selection y viva; ni solo stock ni anulada", S.esCompraSelection({ destino: "selection" }) && S.esCompraSelection({ destino: "selection", anulada_at: null }) && !S.esCompraSelection({ destino: "stock" }) && !S.esCompraSelection({ destino: "selection", anulada_at: "2026-10-10" }) && !S.esCompraSelection(null));
  const lotes = S.lotesSelection([{ lot_id: "L1", destino: "stock", anulada_at: null }, { lot_id: "L2", destino: "selection", anulada_at: "2026-10-10" }, { lot_id: "L3", destino: "selection", anulada_at: null }]);
  check("B2 · lotesSelection: un saco solo stock y una compra anulada no hacen del lote un CTCx Selection", lotes.size === 1 && lotes.has("L3"));
  const usanLaRegla = ["src/app/ocp/(app)/kr/carga.ts", "src/app/ocp/(app)/catalogo/page.tsx", "src/app/ocp/(app)/ctc-selection/page.tsx", "src/lib/triage/servidor.ts", "src/lib/stock/servidor.ts", "src/app/ocp/(app)/comprasActions.ts"].filter((f) => !/(esCompraSelection|lotesSelection)\(/.test(lee(f)));
  check("B2 · el OCP decide «es Selection» con esCompraSelection/lotesSelection (kr, Catálogo, Selection, Triage, Stock, acciones)", usanLaRegla.length === 0, usanLaRegla.join(", "));
  check("B2 · selection.ts es puro", !/supabase|server-only|fetch\(/.test(sinComentarios(lee("src/lib/compras/selection.ts"))));

  // B3 — la nota al productor.
  const notaStock = A.notaDeCompraAlProductor({ destino: "stock", kg: 15, copKgTexto: "$ 26.000", pagadaAt: "2026-10-02" });
  const notaSel = A.notaDeCompraAlProductor({ destino: "selection", kg: 15, copKgTexto: "$ 26.000", pagadaAt: null });
  // V5.203 · corrección (H3): la fecha del pago en la nota, legible y sin correrse un día (`fechaCorta`).
  check("B3 · la nota de una compra solo stock no dice que su café se ofrece como CTCx Selection; la de Selection sí", !/Selection/.test(notaStock) && /compró en firme 15 kg/.test(notaStock) && /pagada el 02 de oct de 2026/.test(notaStock) && /pasa a ofrecerse como CTCx Selection/.test(notaSel));
  check("B3 · registrarCompraManual escribe la nota según el destino (sin la frase fija)", compras.includes("note: notaDeCompraAlProductor({ destino, kg, copKgTexto: formatCop(copKg), pagadaAt })") && !compras.includes("Ese café pasa a ofrecerse como CTCx Selection."));

  // B4 — ninguna fecha en el futuro.
  const hoy = "2026-10-10";
  check("B4 · errorDeFechas: recibo o pago en el futuro → error; hoy, el pasado o vacío → nada; una fecha mal escrita → error", !!A.errorDeFechas({ recibidaAt: "2026-11-02" }, hoy) && !!A.errorDeFechas({ pagadaAt: "2026-10-11" }, hoy) && !!A.errorDeFechas({ acordadaAt: "2027-01-01" }, hoy) && A.errorDeFechas({ pagadaAt: "2026-10-02", recibidaAt: hoy }, hoy) === null && A.errorDeFechas({}, hoy) === null && !!A.errorDeFechas({ pagadaAt: "02/10/2026" }, hoy));
  check("B4 · la acción valida las fechas contra el día de hoy en Colombia, y el formulario no deja elegir el futuro", compras.includes("errorDeFechas({ pagadaAt, recibidaAt }, hoyEnColombia())") && (form.match(/type="date" max=\{hoy\}/g) ?? []).length === 2);

  // B5 — cuándo NO cambia «Es de».
  const base = { actual: "stock", anulada: false, enMezclaViva: false, deDespacho: false, declaracionViva: null };
  check("B5 · sin trabas, «Es de» cambia; al mismo destino no hace nada", A.motivoParaNoDestinar({ ...base, nuevo: "selection" }) === null && A.motivoParaNoDestinar({ ...base, nuevo: "stock" }) === null);
  check("B5 · una compra en una mezcla viva no pasa a solo stock", !!A.motivoParaNoDestinar({ ...base, actual: "selection", enMezclaViva: true, nuevo: "stock" }));
  check("B5 · un saco o un adelanto de un trato por ventana no pasa a Selection (por su precio o por la raíz con despacho)", !!A.motivoParaNoDestinar({ ...base, deDespacho: true, nuevo: "selection" }) && A.esDeDespacho({ precioFuente: "trato por ventana · saco" }) && A.esDeDespacho({ precioFuente: null, raizDespachoId: "d1" }) && !A.esDeDespacho({ precioFuente: "referencia PVC-F4-2026" }));
  check("B5 · con café declarado vivo en el lote, ningún cambio (y lo dice con su código CF-); una anulada tampoco", /CF-2026-0007/.test(A.motivoParaNoDestinar({ ...base, declaracionViva: "CF-2026-0007", nuevo: "selection" }) ?? "") && !!A.motivoParaNoDestinar({ ...base, actual: "selection", declaracionViva: "CF-2026-0007", nuevo: "stock" }) && !!A.motivoParaNoDestinar({ ...base, anulada: true, nuevo: "selection" }) && !!A.motivoParaNoDestinar({ ...base, nuevo: "sample_kits" }));
  check("B5 · destinarCompra aplica las reglas (mezcla viva, despacho, declaración del lote) antes de escribir", /const motivo = motivoParaNoDestinar\(\{[\s\S]*?enMezclaViva:[\s\S]*?deDespacho: esDeDespacho\([\s\S]*?declaracionViva:[\s\S]*?\}\);\s*if \(motivo\) return \{ ok: false, error: motivo \};/.test(compras));

  // B6 — el precio.
  check("B6 · precioLegible: la referencia vieja «PVC PVC-…» se lee sin repetir; la fuente de un saco no se oculta", A.precioLegible({ pvcCode: "PVC-F4-2026", precioFuente: "PVC PVC-F4-2026 (referencia)" }) === "referencia PVC-F4-2026" && A.precioLegible({ pvcCode: "PVC-F4-2026", precioFuente: "trato por ventana · saco" }) === "PVC-F4-2026 · trato por ventana · saco" && A.precioLegible({ pvcCode: null, precioFuente: "manual" }) === "—" && !A.precioLegible({ pvcCode: "PVC-F4-2026", precioFuente: null }).includes("PVC PVC-"));
  check("B6 · la compra a mano guarda «referencia PVC-…» (nunca «PVC PVC-»)", A.fuenteDePrecioManual("PVC-F4-2026") === "referencia PVC-F4-2026" && A.fuenteDePrecioManual(null) === "manual" && compras.includes("precio_fuente: fuenteDePrecioManual(edicion?.code)") && !compras.includes("`PVC ${edicion.code}"));

  // B7 — una sola ubicación.
  check("B7 · ubicar una compra ubica también su partida raíz; ubicar la raíz de una compra ubica la compra", /export async function ubicarCompra[\s\S]*?\.from\("stock_partidas"\)\.update\(\{ ubicacion \}\)/.test(compras) && /export async function ubicarPartida[\s\S]*?if \(p0\.compraId && p0\.raizId === p0\.id\)[\s\S]*?\.from\("compras"\)\.update\(\{ ubicacion: u \}\)/.test(accionesStock));

  // B8 — ningún fallo tragado.
  check("B8 · el pago del mes: el error de la compra y el fallo de la raíz se dicen (aviso) y quedan en el rastro", contrato.includes("const { data: guardada, error: errorCompra } = previa") && /if \(raiz\.ok\)[^\n]*\n\s*else \{[\s\S]{0,400}avisos\.push\(/.test(contrato) && contrato.includes('action: "compra_no_registrada"') && contrato.includes('return avisos.length ? { ok: true, aviso: avisos.join(" ") } : { ok: true };'));
  check("B8 · recibir un despacho: igual (la compra y la raíz)", ventana.includes("const { data: compra, error: errorCompra } = await service") && ventana.includes('action: "compra_no_registrada"') && ventana.includes('action: "despacho_sin_stock"') && ventana.includes('return avisos.length ? { ok: true, aviso: avisos.join(" ") } : { ok: true };'));
  check("B8 · la compra a mano que no entra al stock lo dice (sin invitar a registrarla otra vez)", compras.includes('action: "compra_sin_stock"') && compras.includes("No la registre otra vez") && compras.includes("return aviso ? { ok: true, aviso } : { ok: true };"));
  const af = lee("src/components/panel/ActionForm.tsx");
  check("B8 · ActionForm pinta el aviso (retrocompatible) y, si se pide, se vacía y dice que salió bien", af.includes("export type ActionResult = { ok: true; aviso?: string } | { ok: false; error: string };") && af.includes("if (resetOnSuccess) form.reset();") && af.includes("if (successMessage && !res.aviso) setListo(successMessage);") && af.includes("if (res.aviso) setAviso(res.aviso);") && /resetOnSuccess = false/.test(af));

  // B9 — anular una compra.
  const anul = { anulada: false, origen: "manual", enMezclaViva: false, raizCodigo: "SX-2026-0001", raizConMovimientos: false };
  check("B9 · motivoParaNoAnular: una compra a mano sin movimientos se anula; anulada, de un contrato, en una mezcla o con su raíz movida, no", A.motivoParaNoAnular(anul) === null && !!A.motivoParaNoAnular({ ...anul, anulada: true }) && !!A.motivoParaNoAnular({ ...anul, origen: "contrato" }) && !!A.motivoParaNoAnular({ ...anul, enMezclaViva: true }) && /SX-2026-0001/.test(A.motivoParaNoAnular({ ...anul, raizConMovimientos: true }) ?? ""));
  check("B9 · anularCompra EMITE, pide motivo, repite las reglas y anula compra y raíz juntas (compra_anular)", /export async function anularCompra\(compraId: string, formData: FormData\): Promise<ActionResult> \{\s*const permiso = await permisoDeEscritura\("ocp", "emite"\)/.test(compras) && compras.includes('service.rpc("compra_anular", { p_compra: compraId, p_motivo: motivo, p_por: adminId })') && compras.includes("motivoParaNoAnular({") && compras.includes('action: "compra_anulada"') && compras.includes("note: notaDeAnulacionAlProductor("));
  const nAn = A.notaDeAnulacionAlProductor({ kg: 15, registradaEl: "10/10/2026" });
  check("B9 · la nota al productor dice que el registro queda sin efecto y no repite el motivo interno", /anuló el registro de la compra de 15 kg/.test(nAn) && /sin efecto/.test(nAn));
  const acta = existsSync("docs/migraciones/2026-10-10_compras_anulacion.sql") ? lee("docs/migraciones/2026-10-10_compras_anulacion.sql").replace(/^--.*$/gm, "") : "";
  check("B9 · la migración: anulada_at · anulada_por · anulada_motivo (≤ 300, fecha y motivo juntos), como stock_partidas", acta.includes("add column if not exists anulada_at timestamptz") && acta.includes("add column if not exists anulada_por uuid references public.profiles(id) on delete set null") && acta.includes("check (anulada_motivo is null or length(anulada_motivo) <= 300)") && acta.includes("check ((anulada_at is null) = (anulada_motivo is null))"));
  check("B9 · compra_anular: motivo, solo a mano (guard), raíz sin movimientos, anula raíz y compra en una transacción", /create or replace function public\.compra_anular\(p_compra uuid, p_motivo text, p_por uuid default null\)/.test(acta) && acta.includes("if public.stock_tiene_movimientos(p.id) then") && /update public\.stock_partidas\s+set anulada_at = now\(\)/.test(acta) && acta.includes("update public.compras set anulada_at = now(), anulada_por = p_por, anulada_motivo = v_motivo where id = p_compra;"));
  check("B9 · guard_compra: lo anulado no cambia ni vuelve; anular exige la raíz anulada y origen a mano; «Es de» con las tres reglas de B5", acta.includes("create trigger trg_guard_compra before update on public.compras") && acta.includes("raise exception 'Una compra anulada no cambia ni vuelve.';") && acta.includes("if old.origen <> 'manual' then") && acta.includes("if new.destino = 'stock' and public.compra_en_mezcla_viva(old.id) then") && acta.includes("coalesce(old.precio_fuente, '') like 'trato por ventana%'") && acta.includes("from public.catalogo_fuentes where lot_id = old.lot_id and estado = 'declarada'") && !/before update or delete on public\.compras/.test(acta));
  check("B9 · una compra anulada no entra al stock ni a una mezcla (y la compuerta de la mezcla conserva su regla)", acta.includes("create trigger trg_guard_stock_partida_compra before insert on public.stock_partidas") && acta.includes("raise exception 'Esa compra está anulada: no entra a una mezcla.';") && acta.includes("raise exception 'Los componentes de una mezcla solo cambian mientras es un borrador.';"));
  check("B9 · las funciones nuevas, solo para el service role; ninguna política", ["compra_en_mezcla_viva(uuid)", "compra_anular(uuid, text, uuid)"].every((f) => acta.includes(`revoke all on function public.${f} from public, anon, authenticated;`) && acta.includes(`grant execute on function public.${f} to service_role;`)) && !/create policy/i.test(acta));
  const leenSinAnuladas = [
    ["CTCx Selection", lee("src/app/ocp/(app)/ctc-selection/page.tsx").includes("todas.filter(esCompraSelection)")],
    ["/ocp/kr", lee("src/app/ocp/(app)/kr/carga.ts").includes("lotesSelection(")],
    ["Catálogo Activo", lee("src/app/ocp/(app)/catalogo/page.tsx").includes("lotesSelection(")],
    ["mezclas (candidatas)", lee("src/lib/compras/mezclasServidor.ts").includes('.eq("destino", "selection").is("anulada_at", null)')],
    ["mezclas (añadir)", compras.includes('if (compra.anulada_at) return { ok: false, error: "Esa compra está anulada." };')],
    ["imagen por lote", /async function loteConSelectionViva\([\s\S]*?\.some\(esCompraSelection\)/.test(compras)],
    // H13: el Stock CTCx lee la compra de cada raíz con su anulación (sin ella, `esCompraSelection` veía viva una anulada).
    ["Stock CTCx (origen de cada raíz)", lee("src/lib/stock/servidor.ts").includes('.select("id, origen, destino, contract_id, mes, anulada_at").in("id", compraIds)')],
    ["la franja (partidas vivas)", lee("src/lib/stock/circuito.ts").includes("stock.partidas.filter((p) => !p.anulada).map((p) => p.compraId)")],
    ["entrar al stock", accionesStock.includes('if (compra.anulada_at) return { ok: false, error: "Esa compra está anulada: no entra al Stock CTCx." };')],
    ["la franja", lee("src/lib/stock/circuito.ts").includes("!c.anulada_at && !conPartida.has(c.id)")],
    ["Adquisición (plegable)", carga.includes("anuladas: todas.filter((c) => c.anulada)") && pagina.includes("Anuladas ({a.anuladas.length})") && pagina.includes("s.tachada")],
  ].filter(([, okLectura]) => !okLectura).map(([n]) => n);
  check("B9 · todo lo que lee compras excluye las anuladas (Adquisición las enseña tachadas en «Anuladas»)", leenSinAnuladas.length === 0, leenSinAnuladas.join(", "));

  // El siguiente paso y el origen legible.
  const pasos = (e) => A.siguientesPasos({ anulada: false, raiz: { id: "r1", codigo: "SX-1" }, disponibleKg: 0, declarable: null, declaraciones: [], mezclas: [], ...e }).map((p) => p.tipo).join(",");
  check("el siguiente paso: anulada · entrar al stock · declarar en el Triage (con ?partida=) · en catálogo · en mezcla · sin disponible", pasos({ anulada: true }) === "anulada" && pasos({ raiz: null }) === "entrar" && pasos({ declarable: { partidaId: "p9", kg: 15 }, disponibleKg: 15 }) === "declarar" && A.siguientesPasos({ anulada: false, raiz: { id: "r1", codigo: "SX-1" }, disponibleKg: 15, declarable: { partidaId: "p9", kg: 15 }, declaraciones: [], mezclas: [] })[0].href === "/ocp/contratos?partida=p9&declarar=1" && pasos({ declaraciones: [{ codigo: "CF-1", partidaId: "p9", kgVerde: 9 }] }) === "catalogo" && pasos({ mezclas: [{ id: "m", codigo: "MZ-1", kg: 5 }] }) === "mezcla" && pasos({}) === "agotado" && pasos({ disponibleKg: 3 }) === "stock");
  // V5.203 · corrección (H9/H11): con el diccionario único, y «Mes N del contrato» (no «Selection · mes N»: un mes que pasó a «solo
  // stock» se contradecía con su «Es de»).
  check("el origen legible: Saco · Adelanto de trato por ventana · Mes N del contrato · Compra a mano", A.origenLegible({ origen: "contrato", mes: null, precioFuente: "trato por ventana · saco" }) === "Saco de trato por ventana" && A.origenLegible({ origen: "contrato", mes: null, precioFuente: "trato por ventana · adelanto" }) === "Adelanto de trato por ventana" && A.origenLegible({ origen: "contrato", mes: 2, precioFuente: "PVC-F4-2026" }) === "Mes 2 del contrato" && A.origenLegible({ origen: "manual", mes: null, precioFuente: null }) === "Compra a mano" && A.origenLegible({ origen: "contrato", mes: null, precioFuente: null, despachoTipo: "adelanto" }) === "Adelanto de trato por ventana");
  check("adquisicion.ts es puro (sin supabase ni servidor)", !/supabase|server-only|fetch\(/.test(sinComentarios(lee("src/lib/compras/adquisicion.ts"))));

  // C — la pantalla rehecha.
  // H13: las ocho columnas se cuentan DENTRO de `TablaDeCompras` (antes contaba todos los <th> de la página, 21, y pasaba con cualquiera).
  const tablaDeCompras = pagina.slice(pagina.indexOf("function TablaDeCompras("));
  const cabecera = tablaDeCompras.slice(tablaDeCompras.indexOf("<thead>"), tablaDeCompras.indexOf("</thead>"));
  check("Adquisición: la franja del circuito, las pestañas Por recibir · Compras · Mezclas y la tabla de OCHO columnas con el siguiente paso", pagina.includes('<CircuitoDelStock actual="compras"') && pagina.includes('href="/ocp/compras?vista=por-recibir"') && pagina.includes('href="/ocp/compras/mezclas"') && (cabecera.match(/<th[ >]/g) ?? []).length === 8 && cabecera.includes("<th>Siguiente paso</th>") && tablaDeCompras.includes("anularCompra.bind(null, c.id)"), `${(cabecera.match(/<th[ >]/g) ?? []).length} columnas`);
  check("el alta a mano: plegada, «Es de» sin valor por defecto con lo que ve la vitrina, aviso de un trato vivo y el formulario que se vacía", pagina.includes("<details className={s.registrar}>") && /useState<"" \| "selection" \| "stock">\(""\)/.test(form) && /<option value="" disabled>\s*Elija: ¿\{DESTINO_LABEL\.selection\} o \{DESTINO_LABEL\.stock\.toLowerCase\(\)\}\?/.test(form) && form.includes("VITRINA_SEGUN_DESTINO") && form.includes('name="confirma_trato"') && compras.includes('formData.get("confirma_trato") !== "1"') && form.includes("resetOnSuccess") && form.includes("successMessage="));
  check("Por recibir: los sacos y adelantos pendientes de los tratos por ventana vigentes, con su plazo y su contrato", carga.includes('.in("estado", ["pendiente", "despachado"])') && carga.includes('.eq("purchase_contracts.status", "active")') && pagina.includes("Ver el contrato →"));
  check("los rótulos: «Adquisición de Stock Café» en Selection, Muestras y Mezclas; el mapa del sistema ya no dice «OCP · Compras»", lee("src/app/ocp/(app)/ctc-selection/page.tsx").includes("Adquisición de Stock Café") && !/>Adquisición de Stock<|>Compras<\/Link>/.test(lee("src/app/ocp/(app)/ctc-selection/page.tsx")) && !lee("src/app/ocp/(app)/muestras/page.tsx").includes(">Adquisición de Stock</Link>") && !lee("src/lib/workmap/schema.ts").includes('"OCP · Compras"') && !lee("src/app/ocp/(app)/compras/mezclas/page.tsx").includes("Lo asignado descuenta de lo disponible en"));
  // H15: el enlace lleva `?compra=` (la fila se resalta desde el servidor: un <Link> no activa :target) y `#compra-…`.
  check("el linaje: la raíz que viene de una compra enlaza a su fila en Adquisición", lee("src/app/ocp/(app)/stock/LinajeBoard.tsx").includes("<Link href={rutaDeLaCompra(partida.compraId)}>") && A.rutaDeLaCompra("c1") === "/ocp/compras?compra=c1#compra-c1" && pagina.includes("id={`compra-${c.id}`}"));
}

// ── 14. V5.203 · corrección (nodo final, 2026-10-10): privacidad (decisiones 1–3), el aviso fijo (decisión 4) y H3–H15 ────────────
{
  const A = await import("../src/lib/compras/adquisicion.ts");
  const S = await import("../src/lib/compras/selection.ts");
  const R = await import("../src/lib/compras/reglas.ts");
  const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$|\{\/\*[\s\S]*?\*\/\}/gm, "");
  const pagina = lee("src/app/ocp/(app)/compras/page.tsx");
  const form = lee("src/app/ocp/(app)/compras/CompraManualForm.tsx");
  const uploader = lee("src/app/ocp/(app)/ctc-selection/ImagenCtcxUploader.tsx");
  const ventana = lee("src/app/ocp/(app)/ventanaActions.ts");
  const ficha = lee("src/app/ocp/(app)/contratos/[id]/page.tsx");
  const carga = lee("src/lib/compras/adquisicionServidor.ts");
  const actaImg = existsSync("docs/migraciones/2026-10-10_ctcx_selection_imagenes.sql") ? lee("docs/migraciones/2026-10-10_ctcx_selection_imagenes.sql").replace(/^--.*$/gm, "") : "";
  const acta = lee("docs/migraciones/2026-10-10_compras_anulacion.sql").replace(/^\s*--.*$/gm, "");

  // ── Decisión 1: la imagen ──
  check("D1 · el staging es privado y aparte; solo JPEG · PNG · WebP, con la extensión de su tipo; 5 MB", R.BUCKET_CTCX_STAGING === "ctcx-selection-staging" && R.BUCKET_CTCX_STAGING !== R.BUCKET_CTCX && JSON.stringify(R.EXTENSION_DE_IMAGEN_CTCX) === JSON.stringify({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }) && R.MAX_MB_IMAGEN_CTCX === 5);
  check("D1 · el nombre es aleatorio (uuid + extensión del tipo), nunca el del archivo", compras.includes("export async function crearUrlDeSubidaCtcx(destino: DestinoCtcx, tipo: string)") && compras.includes("const path = `${carpeta}${randomUUID()}.${ext}`;") && compras.includes("const limpio = `${carpeta}${randomUUID()}.webp`;") && !/filename|file\.name/.test(sinComentarios(compras)) && uploader.includes("crearUrlDeSubidaCtcx(destino, file.type)") && !uploader.includes("file.name"));
  check("D1 · el servidor la re-codifica con sharp (orienta, sin metadatos, WebP 82) antes de publicarla, y borra el staging", compras.includes('import sharp from "sharp";') && compras.includes(".rotate()") && compras.includes(".webp({ quality: 82 })") && !/withMetadata|keepMetadata|keepExif/.test(compras) && /const \{ data: blob, error: errBajada \} = await service\.storage\.from\(BUCKET_CTCX_STAGING\)\.download\(subida\);/.test(compras) && /\.from\(BUCKET_CTCX\)\.upload\(limpio, webp, \{ contentType: "image\/webp", upsert: false/.test(compras) && compras.includes("const borrarSubida = () => service.storage.from(BUCKET_CTCX_STAGING).remove([subida]);"));
  // V5.203 · verificación (nodo final, 2026-10-10): lo que se borra deja de servirse pronto — sin caché de un año en la CDN.
  check("D1 · la imagen publicada lleva caché corta (≤ 1 h): al borrarla no sigue servida desde la CDN", (() => { const m = compras.match(/\.from\(BUCKET_CTCX\)\.upload\(limpio, webp, \{[^}]*cacheControl: "(\d+)"/); return !!m && Number(m[1]) <= 3600; })());
  check("D1 · el navegador nunca sube al bucket público", !/storage\.from\(BUCKET_CTCX\)\.(uploadToSignedUrl|upload)\(/.test(uploader) && !compras.includes("from(BUCKET_CTCX).createSignedUploadUrl"));
  check("D1 · la migración: staging privado (5 MB, imágenes), sin listado anónimo del bucket público, que solo admite WebP", /insert into storage\.buckets \(id, name, public, file_size_limit, allowed_mime_types\)\s*values \('ctcx-selection-staging', 'ctcx-selection-staging', false, 5242880, array\['image\/jpeg', 'image\/png', 'image\/webp'\]\)/.test(actaImg) && actaImg.includes('drop policy if exists "ctcx selection public read" on storage.objects;') && /allowed_mime_types = array\['image\/webp'\]\s*where id = 'ctcx-selection';/.test(actaImg) && !/create policy/i.test(actaImg));
  check("D1 · quitarle a un lote su última compra Selection viva borra su imagen (fila y objeto), al anular y al pasar a solo stock", /async function limpiarImagenSiYaNoEsSelection\([\s\S]*?\.eq\("destino", "selection"\)\.is\("anulada_at", null\)[\s\S]*?\.from\("ctcx_selection_lotes"\)\.delete\(\)\.eq\("lot_id", lotId\)[\s\S]*?\.from\(BUCKET_CTCX\)\.remove\(\[ruta\]\)/.test(compras) && /export async function anularCompra[\s\S]*?compra\.destino === "selection" \? await limpiarImagenSiYaNoEsSelection\(/.test(compras) && /export async function destinarCompra[\s\S]*?destino === "stock" \? await limpiarImagenSiYaNoEsSelection\(/.test(compras));

  // ── Decisión 2 / H7: confirmar el cambio de cara en la vitrina ──
  const foto = (o) => ({ stage: "galardonado", grade: "red", tratoVivo: false, declaracionViva: false, partidasLibres: [], comprasSelectionVivas: [], ...o });
  check("D2 · saleEnLaVitrina = la condición de public_lot_vitrina (galardonado, con grado, no Tyrian; trato, declarado o stock libre)", S.saleEnLaVitrina({ stage: "galardonado", grade: "red", tratoVivo: true, declaracionViva: false, partidasLibres: 0 }) && S.saleEnLaVitrina({ stage: "galardonado", grade: "red", tratoVivo: false, declaracionViva: true, partidasLibres: 0 }) && S.saleEnLaVitrina({ stage: "galardonado", grade: "red", tratoVivo: false, declaracionViva: false, partidasLibres: 1 }) && !S.saleEnLaVitrina({ stage: "galardonado", grade: "red", tratoVivo: false, declaracionViva: false, partidasLibres: 0 }) && !S.saleEnLaVitrina({ stage: "galardonado", grade: "tyrian", tratoVivo: true, declaracionViva: true, partidasLibres: 3 }) && !S.saleEnLaVitrina({ stage: "evaluado", grade: "red", tratoVivo: true, declaracionViva: false, partidasLibres: 0 }) && !S.saleEnLaVitrina({ stage: "galardonado", grade: null, tratoVivo: true, declaracionViva: false, partidasLibres: 0 }));
  const vista = existsSync("docs/migraciones/2026-10-10_vitrina_sin_finca.sql") ? lee("docs/migraciones/2026-10-10_vitrina_sin_finca.sql") : "";
  check("D2 · …y la vista sigue diciendo eso (si cambia su WHERE, esta regla se revisa)", /where l\.stage = 'galardonado'\s*and l\.grade is not null\s*and l\.grade <> 'tyrian'\s*and \(ct\.lot_id is not null or d\.lot_id is not null or s\.lot_id is not null\);/.test(vista) && /where p\.lot_id is not null and p\.anulada_at is null and not p\.comprometido/.test(vista));
  check("D2 · anular la ÚLTIMA compra Selection de un lote que sigue en la vitrina pide confirmar (con el texto del nodo final)", S.cambioAlAnular(foto({ tratoVivo: true, comprasSelectionVivas: ["c1"] }), "c1", null) === "El lote dejará de salir como CTCx Selection: la vitrina enseñará su nombre generado y, si CTCx las aprobó, sus fotos." && S.cambioAlAnular(foto({ tratoVivo: true, comprasSelectionVivas: ["c1", "c2"] }), "c1", null) === null && S.cambioAlAnular(foto({ partidasLibres: ["r1"], comprasSelectionVivas: ["c1"] }), "c1", "r1") === null && S.cambioAlAnular(foto({ partidasLibres: ["r1", "r2"], comprasSelectionVivas: ["c1"] }), "c1", "r1") !== null && S.cambioAlAnular(foto({ tratoVivo: true, comprasSelectionVivas: [] }), "c9", null) === null);
  check("D2 · pasar a solo stock la última Selection pide confirmar; a Selection un lote del productor en la vitrina, también", S.cambioAlDestinar(foto({ declaracionViva: true, comprasSelectionVivas: ["c1"] }), "c1", "stock") === S.AVISO_DEJA_SELECTION && S.cambioAlDestinar(foto({ tratoVivo: true }), "c1", "selection") === S.AVISO_PASA_A_SELECTION && S.cambioAlDestinar(foto({}), "c1", "selection") === null && S.cambioAlDestinar(foto({ tratoVivo: true, comprasSelectionVivas: ["c2"] }), "c1", "selection") === null);
  check("D2 / H7 · registrar a mano una compra Selection en un lote que ya sale como lote del productor pide confirmar", S.cambioAlRegistrar(foto({ partidasLibres: ["r1"] }), "selection") === S.AVISO_PASA_A_SELECTION && S.cambioAlRegistrar(foto({ partidasLibres: ["r1"] }), "stock") === null && S.cambioAlRegistrar(foto({}), "selection") === null && S.cambioAlRegistrar(foto({ partidasLibres: ["r1"], comprasSelectionVivas: ["c2"] }), "selection") === null);
  check("D2 / H6 · lo que dice «Es de»: confirmar si cambia; «ya es Selection por otra compra» si otra decide; si no, lo que verá el comprador", S.textoDeVitrina(foto({ tratoVivo: true, comprasSelectionVivas: ["c1", "c2"] }), "stock", "c1").texto === S.VITRINA_YA_SELECTION && S.textoDeVitrina(foto({ tratoVivo: true, comprasSelectionVivas: ["c1"] }), "stock", "c1").confirmar && S.textoDeVitrina(null, "selection", null).texto === S.VITRINA_SEGUN_DESTINO.selection && S.textoDeVitrina(foto({ comprasSelectionVivas: ["c2"] }), "selection", null).texto === S.VITRINA_YA_SELECTION);
  // El cuerpo de CADA acción (hasta su cierre), para que una que la pierda no se tape con la de la acción siguiente.
  const cuerpo = (fn) => { const i = compras.indexOf(`export async function ${fn}(`); return i < 0 ? "" : compras.slice(i, compras.indexOf("\n}\n", i)); };
  // V5.203 · verificación (nodo final, 2026-10-10): y con la lectura caída la acción se detiene (falla cerrada), no sigue sin confirmar.
  const pide = (fn) => /const foto = await leerVitrinaDelLote\(service, [\w.]+\);\s*if \(foto && "error" in foto\) return \{ ok: false, error: foto\.error \};\s*const sinConfirmar = pideConfirmar\(foto \? cambioAl\w+\([^)]*\) : null, formData\);\s*if \(sinConfirmar\) return \{ ok: false, error: sinConfirmar \};/.test(cuerpo(fn));
  check("D2 · leerVitrinaDelLote falla CERRADA: con una lectura caída devuelve { error } (no una foto vacía que se salte la confirmación)", carga.includes("const fallo = e0 ?? e1 ?? e2 ?? e3 ?? e4;") && /if \(fallo\) \{[\s\S]*?return \{ error: `No se pudo comprobar qué enseña la vitrina de este lote/.test(carga) && carga.includes("Promise<FotoDeVitrina | null | { error: string }>"));
  check("D2 · las tres acciones repiten la comprobación con la base fresca (leerVitrinaDelLote) y exigen confirma_vitrina", ["registrarCompraManual", "destinarCompra", "anularCompra"].every(pide) && compras.includes('formData.get("confirma_vitrina") !== "1"') && (compras.match(/await leerVitrinaDelLote\(service, /g) ?? []).length === 3);
  check("D2 · la pantalla pinta la confirmación (casilla obligatoria) al cambiar «Es de», al anular y en el alta", (pagina.match(/<input type="checkbox" name="confirma_vitrina" value="1" required \/>/g) ?? []).length === 2 && pagina.includes("c.vitrinaAlCambiar.confirmar &&") && pagina.includes("{c.vitrinaAlAnular && (") && form.includes('<input type="checkbox" name="confirma_vitrina" value="1" required />') && form.includes("textoDeVitrina(lote ? vitrina[lote] ?? null : null, destino, null)") && carga.includes("vitrinaAlAnular: anulada || !foto ? null : cambioAlAnular(foto, c.id, raiz?.id ?? null)"));

  // ── Decisión 3: la compra anulada no bloquea el SET NULL de sus FK; tampoco la partida ──
  check("D3 · guard_compra (rama anulada): solo registrada_por · anulada_por · pvc_edition_id · contract_id pueden pasar a NULL", acta.includes("if (to_jsonb(new) - 'registrada_por' - 'anulada_por' - 'pvc_edition_id' - 'contract_id')") && ["registrada_por", "anulada_por", "pvc_edition_id", "contract_id"].every((c) => acta.includes(`(new.${c} is distinct from old.${c} and new.${c} is not null)`)));
  const actaStock = lee("docs/migraciones/2026-10-09_stock_ctcx.sql");
  const defDe = (src) => (src.match(/create or replace function public\.guard_stock_partida\(\)[\s\S]*?\n\$\$;/) ?? [""])[0].replace(/^\s*--.*$/gm, "").replace(/\s+/g, " ").trim();
  const nueva = defDe(acta);
  const vieja = defDe(actaStock);
  const nuevaComoVieja = nueva
    .replace("or new.created_at is distinct from old.created_at or (new.created_by is distinct from old.created_by and new.created_by is not null) then", "or new.created_at is distinct from old.created_at or new.created_by is distinct from old.created_by then")
    .replace("or (new.anulada_por is distinct from old.anulada_por and new.anulada_por is not null)) then", "or new.anulada_por is distinct from old.anulada_por) then");
  check("D3 · guard_stock_partida se reescribe desde su definición viva cambiando SOLO created_by y anulada_por (→ NULL)", !!vieja && !!nueva && nueva !== vieja && nuevaComoVieja === vieja, nuevaComoVieja === vieja ? "" : "difiere de 2026-10-09_stock_ctcx.sql en algo más que las dos FK");
  // V5.203 · verificación (nodo final, 2026-10-10): la compra que crea «Reintentar la compra» no está enlazada a su partida; la base la
  // reconoce como saco o adelanto también por su propio despacho (`compras.despacho_id`), como `esDeDespacho` en el código.
  check("D4 · guard_compra (B5): una compra con despacho propio (compras.despacho_id) no pasa a CTCx Selection", /if new\.destino = 'selection' and \(coalesce\(old\.precio_fuente, ''\) like 'trato por ventana%' or old\.despacho_id is not null\s+or exists \(select 1 from public\.stock_partidas p where p\.compra_id = old\.id and p\.despacho_id is not null\)\) then/.test(acta) && A.esDeDespacho({ precioFuente: "oferta directa", raizDespachoId: "d1" }) && !A.esDeDespacho({ precioFuente: "oferta directa", raizDespachoId: null }) && compras.includes("raizDespachoId: compra.despacho_id ?? (raiz as { despacho_id: string | null } | null)?.despacho_id"));

  // ── Decisión 4 / H1 / H2: el aviso fijo y «Reintentar la compra» ──
  const rec = { id: "d1", tipo: "saco", estado: "recibido", resultado: "aceptado" };
  check("D4 · faltaDelDespacho: sin compra (partida sola) → «Reintentar la compra»; sin partida → la entrada al stock; completo, pendiente o devuelto → nada", A.faltaDelDespacho(rec, { gradoComprable: true, partida: { codigo: "SX-9" }, compra: false })?.boton === "Reintentar la compra" && /SX-9/.test(A.faltaDelDespacho(rec, { gradoComprable: true, partida: { codigo: "SX-9" }, compra: false })?.texto ?? "") && A.faltaDelDespacho(rec, { gradoComprable: true, partida: null, compra: true })?.boton === "Reintentar la entrada al Stock CTCx" && A.faltaDelDespacho(rec, { gradoComprable: true, partida: { codigo: "SX-9" }, compra: true }) === null && A.faltaDelDespacho({ ...rec, estado: "despachado" }, { gradoComprable: true, partida: null, compra: false }) === null && A.faltaDelDespacho({ ...rec, resultado: "devolucion" }, { gradoComprable: true, partida: null, compra: false }) === null);
  check("D4 · lo vendido no lleva compra (solo su partida), ni un Tyrian; el texto manda a no registrarlo a mano", A.faltaDelDespacho({ ...rec, tipo: "vendido" }, { gradoComprable: true, partida: { codigo: "SX-1" }, compra: false }) === null && A.faltaDelDespacho({ ...rec, tipo: "vendido" }, { gradoComprable: true, partida: null, compra: false })?.faltaCompra === false && A.faltaDelDespacho(rec, { gradoComprable: false, partida: { codigo: "SX-1" }, compra: false }) === null && /No lo registre a mano/.test(A.faltaDelDespacho(rec, { gradoComprable: true, partida: null, compra: false })?.texto ?? ""));
  const mesPagado = { mes: 2, pagadoAt: "2026-10-05", enviadoKg: 300 };
  check("D4 · faltaDelMes: solo un mes PAGADO con kilos de una compra en firme; sin compra o sin partida", A.faltaDelMes(mesPagado, { enFirme: true, gradoComprable: true, compra: false, partida: null })?.boton === "Reintentar la compra" && A.faltaDelMes(mesPagado, { enFirme: true, gradoComprable: true, compra: true, partida: null })?.boton === "Reintentar la entrada al Stock CTCx" && A.faltaDelMes(mesPagado, { enFirme: true, gradoComprable: true, compra: true, partida: { codigo: "SX-2" } }) === null && A.faltaDelMes(mesPagado, { enFirme: false, gradoComprable: true, compra: false, partida: null }) === null && A.faltaDelMes({ ...mesPagado, pagadoAt: null }, { enFirme: true, gradoComprable: true, compra: false, partida: null }) === null);
  check("D4 · la ficha del contrato pinta el aviso FIJO derivado de los datos, con los dos reintentos", ficha.includes("faltaDelDespacho(") && ficha.includes("faltaDelMes(") && ficha.includes("<ActionForm action={reintentarCompraDelDespacho.bind(null, f.despachoId)} submitLabel={f.boton}") && ficha.includes("<ActionForm action={reintentarCompraDelMes.bind(null, id, f.mes)} submitLabel={f.boton}") && ficha.includes('service.from("compras").select("id, despacho_id").in("despacho_id", recibidos)'));
  const fnClaseV = (fn) => new RegExp(`export async function ${fn}\\([^)]*\\): Promise<ActionResult> \\{\\s*const p = await permiso\\(\\);`).test(ventana) && ventana.includes('const permiso = () => permisoDeEscritura("ocp", "emite");');
  const reintentoMes = acciones.slice(acciones.indexOf("export async function reintentarCompraDelMes("));
  check("D4 · los reintentos EMITEN (por la compuerta del OCP) y no lanzan", fnClaseV("reintentarCompraDelDespacho") && /^export async function reintentarCompraDelMes\(contractId: string, mes: number\): Promise<ActionResult> \{\s*const permiso = await permisoDeEscritura\("ocp", "emite"\);/.test(reintentoMes) && !/throw /.test(ventana.slice(ventana.indexOf("export async function reintentarCompraDelDespacho("), ventana.indexOf("export async function cobrarFaltante("))) && !/throw /.test(reintentoMes.slice(0, reintentoMes.indexOf("\n}\n"))));
  check("D4 · idempotentes: la compra es única por despacho (compras.despacho_id) y por mes; antes de insertar se busca, y una carrera se resuelve releyendo", /alter table public\.compras add column if not exists despacho_id uuid references public\.contract_despachos\(id\) on delete set null;/.test(acta) && acta.includes("create unique index if not exists compras_despacho_id_key on public.compras (despacho_id) where despacho_id is not null;") && /reintentarCompraDelDespacho[\s\S]*?\.from\("compras"\)\.select\("id"\)\.eq\("despacho_id", d\.id\)\.maybeSingle\(\)[\s\S]*?\.insert\(compraDelDespacho\(/.test(ventana) && reintentoMes.includes('.from("compras").select("id").eq("contract_id", contractId).eq("mes", mes).maybeSingle()'));
  const filaDelDespacho = ventana.slice(ventana.indexOf("function compraDelDespacho("), ventana.indexOf("function raizDelDespacho("));
  check("D4 · recibir un despacho escribe el despacho de su compra (la misma fila que el reintento)", ventana.includes(".insert(compraDelDespacho(c, d, {") && filaDelDespacho.includes("despacho_id: d.id,"));
  check("D4 / H2 · los avisos ya no mandan a registrar a mano ni a volver a pagar", !ventana.includes("regístrela a mano en Adquisición") && !ventana.includes("ingréselo a mano en el Stock CTCx con su nota") && !acciones.includes("Vuelva a registrar el pago del mes para reintentarlo") && ventana.includes("use «Reintentar la compra» en el aviso de este contrato") && acciones.includes("Use «Reintentar la compra» en el aviso de este contrato."));
  check("D4 · una partida que nació sin su compra no se enlaza después (la base no lo deja): el reintento lo DICE", ventana.includes("la base no deja cambiar el vínculo de una partida") && carga.includes("raizPorDespacho: !!porDespacho") && pagina.includes("por su despacho (la partida nació sin la compra)"));

  // ── H3: las fechas sin hora ──
  check("H3 · fechaCorta: una fecha `date` (y la medianoche UTC de un campo de fecha) no se corre un día; un instante, en hora de Colombia", A.fechaCorta("2026-10-11") === "11 de oct de 2026" && A.fechaCorta("2026-10-02T00:00:00+00:00") === "02 de oct de 2026" && A.fechaCorta("2026-10-10T03:00:00Z") === "09 de oct de 2026" && A.fechaCorta(null) === "—" && A.fechaCorta("no es fecha") === "—");
  check("H3 · Adquisición y CTCx Selection fechan con fechaCorta (sin su propio toLocaleDateString)", pagina.includes("{fechaCorta(vence)}") && !/toLocaleDateString/.test(pagina) && !/toLocaleDateString/.test(lee("src/app/ocp/(app)/ctc-selection/page.tsx")) && !/toLocaleDateString\("es-CO", \{ timeZone: "America\/Bogota" \}\)/.test(compras));
  // ── H4 ──
  check("H4 · el estado de un saco: «60 % pagado» solo si se pagó", A.estadoDelDespacho({ estado: "despachado", pago60: false }) === "despachado por el productor · falta confirmar y pagar el 60 %" && A.estadoDelDespacho({ estado: "despachado", pago60: true }) === "despachado · 60 % pagado" && A.estadoDelDespacho({ estado: "pendiente", pago60: true }) === "60 % pagado" && A.estadoDelDespacho({ estado: "pendiente", pago60: false }) === "pendiente · sin el 60 %" && pagina.includes("estadoDelDespacho({ estado: d.estado, pago60: d.pago60 })"));
  // ── H8 ──
  check("H8 · Adquisición: con una lectura caída, solo la alerta (ni indicadores ni tablas que digan «no hay»)", /\{a\.errorDeLectura \? \([\s\S]*?role="alert"[\s\S]*?\) : \([\s\S]*?className=\{styles\.kpiGrid\}/.test(pagina) && carga.includes('["las compras", errorCompras]') && carga.includes("errorDeLectura: fallo ? `${fallo[0]}: ${fallo[1].message}` : null"));
  const sel = lee("src/app/ocp/(app)/ctc-selection/page.tsx");
  check("H8 · CTCx Selection lee el error de las compras y, con él, no dice «0 compras»", sel.includes("{ data: cRaw, error: errorCompras }") && sel.includes("{!errorCompras && (") && sel.includes("No se pudieron leer las compras ({errorCompras.message})"));
  // ── H10 ──
  check("H10 · lo libre de una compra en kg de CPS equivalentes (equivalenteEnRaiz), rotulado así", carga.includes("disponibleCps += equivalenteEnRaiz(p, m.disponibleKg);") && pagina.includes("≈ {kg1(c.disponibleKg)} kg CPS libres") && A.siguientesPasos({ anulada: false, raiz: { id: "r", codigo: "SX" }, disponibleKg: 3, declarable: null, declaraciones: [], mezclas: [] })[0].texto === "En el Stock (≈ 3 kg CPS)");
  // ── H11: un solo diccionario ──
  const archivosOcp = ["src/app/ocp/(app)/compras/page.tsx", "src/app/ocp/(app)/compras/CompraManualForm.tsx", "src/app/ocp/(app)/comprasActions.ts", "src/app/ocp/(app)/ctc-selection/page.tsx", "src/lib/compras/adquisicion.ts", "src/lib/stock/servidor.ts", "src/app/ocp/(app)/contratos/TriageBoard.tsx", "src/app/ocp/(app)/stock/LinajeBoard.tsx"];
  const viejos = archivosOcp.filter((f) => /solo de stock|Solo Stock CTCx|"Saco de ventana"|Selection · mes/.test(sinComentarios(lee(f))));
  check("H11 · un solo diccionario (DESTINO_LABEL · ORIGEN_LABEL en selection.ts): nadie escribe los rótulos viejos", S.DESTINO_LABEL.stock === "Solo stock" && S.ORIGEN_LABEL.mes(3) === "Mes 3 del contrato" && lee("src/lib/compras/sampleKits.ts").includes('export { DESTINO_LABEL } from "./selection";') && viejos.length === 0, viejos.join(", "));
  // ── H14: la vitrina no enseña la finca desde la V5.202 ──
  const conFinca = [...archivosOcp, "src/app/ocp/(app)/catalogo/page.tsx"].filter((f) => /no con la finca|en vez de la finca|perfil de CTCx, no|reemplaza a la finca|sale como lote del productor\./.test(sinComentarios(lee(f))));
  check("H14 · ningún texto dice que la vitrina enseña la finca: la diferencia es el rótulo y la imagen de CTCx frente a las fotos del lote", conFinca.length === 0 && /rótulo y la imagen de CTCx Selection, no con las fotos del lote/.test(S.VITRINA_SEGUN_DESTINO.selection) && /nombre generado/.test(S.VITRINA_SEGUN_DESTINO.stock), conFinca.join(", "));
  // ── H15 ──
  check("H15 · Gestión de Muestras no enseña la nota de versión en su texto visible", !/\(V5\.203: desde la V5\.195 ya no de Adquisición\)/.test(lee("src/app/ocp/(app)/muestras/page.tsx")));
  check("H15 · «al pagar el mes, la compra entra al Stock CTCx» solo en un trato de compra en firme", ficha.includes("{resumen.enviadoKg > 0 && enFirme && <> · al pagar el mes, la compra entra al") && ficha.includes("const enFirme = esCompraEnFirme("));
  check("H15 · la fila pedida por ?compra= se resalta desde el servidor y abre «Anuladas» si lo es; «Anuladas» con su cabecera", pagina.includes("${c.id === elegida ? s.filaElegida : \"\"}") && pagina.includes("open={a.anuladas.some((c) => c.id === elegida)}") && /Anuladas \(\{a\.anuladas\.length\}\)[\s\S]*?<thead>[\s\S]*?<th>Anulada<\/th>/.test(pagina) && /\.filaElegida td \{/.test(lee("src/app/ocp/(app)/compras/compras.module.css")));
  check("H15 · «Registrada» enseña la fecha del registro (no la del pago)", carga.includes("registradaAt: c.created_at") && /<th>Registrada<\/th>[\s\S]*?\{fechaCorta\(c\.registradaAt\)\}/.test(pagina));
  check("H12 · el alta a mano no canta éxito junto a un aviso (lo garantiza ActionForm)", lee("src/components/panel/ActionForm.tsx").includes("if (successMessage && !res.aviso) setListo(successMessage);"));
}

// ── 15. V6.1: el barrido del staging de imágenes abandonadas (lo que la V5.203 dejó «sin hacer») ─────────────────────────────
{
  const ahora = Date.parse("2026-10-10T12:00:00Z");
  const h = 60 * 60 * 1000;
  const objetos = [
    { name: "vieja.jpg", created_at: "2026-10-10T10:30:00Z" },
    { name: "justo.jpg", created_at: new Date(ahora - h).toISOString() },
    { name: "fresca.jpg", created_at: "2026-10-10T11:30:00Z" },
    { name: "sin-fecha.jpg", created_at: null },
    { name: "fecha-rota.jpg", created_at: "ayer" },
  ];
  check("15 · una subida se considera abandonada a la hora (STAGING_ABANDONO_MS = 1 h)", STAGING_ABANDONO_MS === h);
  check("15 · abandonadasDelStaging: la vieja y la de justo una hora sí; la fresca no", abandonadasDelStaging(objetos, ahora).map((o) => o.name).join(",") === "vieja.jpg,justo.jpg");
  check("15 · abandonadasDelStaging: sin `created_at` legible no se borra a ciegas", !abandonadasDelStaging(objetos, ahora).some((o) => o.name === "sin-fecha.jpg" || o.name === "fecha-rota.jpg") && abandonadasDelStaging([], ahora).length === 0);
  const acciones = lee("src/app/ocp/(app)/comprasActions.ts");
  check("15 · barrerStagingCtcx recorre perfil/ y cada lotes/<id>/, solo archivos (id), y borra con remove", acciones.includes('const carpetas = ["perfil"];') && acciones.includes('await bucket.list("lotes", { limit: 1000 })') && acciones.includes("for (const l of lotes ?? []) if (!l.id) carpetas.push(`lotes/${l.name}`);") && acciones.includes("abandonadasDelStaging((data ?? []).filter((x) => !!x.id), ahora)") && acciones.includes("if (borrar.length) await bucket.remove(borrar);"));
  check("15 · el barrido corre al firmar una subida nueva, antes de crear la ruta, y nunca la estorba (try/catch)", /await barrerStagingCtcx\(service\);[^\n]*\n\s*const path = `\$\{carpeta\}\$\{randomUUID\(\)\}\.\$\{ext\}`;/.test(acciones) && /async function barrerStagingCtcx\([\s\S]*?try \{[\s\S]*?\} catch \{/.test(acciones));
}

if (fallos.length) {
  console.error(`✗ qa-compras: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-compras: ${ok} comprobaciones OK, 0 fallos`);
