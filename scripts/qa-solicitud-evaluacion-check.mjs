// Guardián de la SOLICITUD DE EVALUACIÓN (V5.80, fase 3 del PLAN_CIRCUITO_DEL_LOTE): la nota de descuento, la
// subvención decidida por CTCx, la factura de cobro, el pago sobre la factura, la muestra contra entrega y los
// Baches de Evaluación que van al Centro de Calidad.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-solicitud-evaluacion-check.mjs
//
// GRATIS y sin red: ejercita los módulos puros y lee las fuentes.
//
// QUÉ VIGILA. Las cifras salen del PLAN (`docs/PLAN_CIRCUITO_DEL_LOTE.md`), donde están transcritos el folio 7 del
// owner (§0, pasos 7–10) y sus respuestas del 2026-09-24 (§6): la tarifa plana, los mínimos por grado, la partición
// de la muestra y «contra entrega». NO se leen del código: un guardián que copia la regla de lo que vigila afirma
// el error en verde (lección V5.53). Y la regla de la casa: cada movimiento deja rastro (audit + feed), el pago se
// confirma sobre la factura, y el vocabulario nuevo vive en las pantallas —la base conserva sus nombres.

import { readFileSync, existsSync } from "node:fs";
import { TARIFA_EVALUACION_COP, MINIMO_POR_GRADO, PAGO_CONTRA_ENTREGA, MUESTRA_EVALUACION_KG, CARGA_KG, minimoKg } from "../src/lib/trato/terminos.ts";
import { PARTICION_KG, particionDeMuestra } from "../src/lib/muestras/particion.ts";
import { estadoDelCircuito } from "../src/lib/ocp/circuito.ts";
import { CONSOLES } from "../src/lib/panel/consoles.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const cuerpoDe = (src, nombre) => {
  const i = src.indexOf(`export async function ${nombre}(`);
  if (i < 0) return "";
  const j = src.indexOf("\nexport async function ", i + 1);
  return src.slice(i, j < 0 ? undefined : j);
};

const plan = lee("docs/PLAN_CIRCUITO_DEL_LOTE.md");

// ── 1. La tarifa y los mínimos, desde las respuestas del owner (§6) ─────────
{
  const tarifa = plan.match(/\*\*\$([\d.]+) COP es la tarifa plana\*\*/);
  check("el plan fija la tarifa plana en pesos", !!tarifa);
  check("y `terminos.ts` la lleva tal cual", tarifa && TARIFA_EVALUACION_COP === Number(tarifa[1].replace(/\./g, "")), `${TARIFA_EVALUACION_COP}`);
  const minimos = plan.match(/Black\/Red (\d+) cargas · Blue (\d+) cargas · Gold (\d+) kg/);
  check("el plan fija los mínimos por grado (respuesta 1)", !!minimos);
  if (minimos) {
    check("Black y Red: las cargas de la respuesta 1", MINIMO_POR_GRADO.black.cargas === Number(minimos[1]) && MINIMO_POR_GRADO.red.cargas === Number(minimos[1]));
    check("Blue: las cargas de la respuesta 1", MINIMO_POR_GRADO.blue.cargas === Number(minimos[2]));
    check("Gold: los kilos de la respuesta 1", MINIMO_POR_GRADO.gold.kg === Number(minimos[3]));
    check("minimoKg convierte cargas con la carga de 125 kg", CARGA_KG === 125 && minimoKg("blue") === Number(minimos[2]) * 125 && minimoKg("gold") === Number(minimos[3]));
    check("Tyrian no entra por oferta", minimoKg("tyrian") === null);
  }
  const inscripciones = lee("src/lib/arena/inscriptions.ts");
  check("la tarifa vieja de `inscriptions.ts` ES la de terminos (un solo número)", inscripciones.includes("export const ARENA_FEE_COP = TARIFA_EVALUACION_COP") && !/80000/.test(inscripciones));
  const subvencion = lee("src/lib/arena/subvencion.ts");
  check("la subvención sigue en 30–70 % (respuesta 2)", subvencion.includes("SUBVENCION_MIN_PCT = 30") && subvencion.includes("SUBVENCION_MAX_PCT = 70"));
}

// ── 2. La muestra: 2 kg contra entrega y la partición del paso 10 ───────────
{
  const paso9 = plan.match(/Paga y envía \*\*(\d+) kg de CPS\*\*, \*\*contra entrega\*\*/);
  check("el plan dice 2 kg contra entrega (paso 9)", !!paso9 && MUESTRA_EVALUACION_KG === Number(paso9[1]));
  check("y `terminos.ts` lo lleva como regla", PAGO_CONTRA_ENTREGA === true);
  const paso10 = plan.match(/\*\*(\d+) g evaluación · (\d+) g contramuestra · (\d+) kg testeo in-house\*\*/);
  check("el plan fija la partición (paso 10)", !!paso10);
  if (paso10) {
    const esperado = { evaluacion: Number(paso10[1]) / 1000, contramuestra: Number(paso10[2]) / 1000, testeo: Number(paso10[3]) };
    check("PARTICION_KG es la del folio, en su orden", PARTICION_KG.map((p) => `${p.tipo}:${p.kg}`).join(",") === `evaluacion:${esperado.evaluacion},contramuestra:${esperado.contramuestra},testeo:${esperado.testeo}`);
    const dos = particionDeMuestra(MUESTRA_EVALUACION_KG);
    check("2 kg se parten exactamente como dice el folio", JSON.stringify(dos.map((p) => p.kg)) === JSON.stringify([esperado.evaluacion, esperado.contramuestra, esperado.testeo]));
  }
  const migracion = lee("docs/migraciones/2026-09-24_solicitudes_muestras_baches.sql");
  check("contra entrega es el default de la solicitud en la base", migracion.includes("pago_contra_entrega boolean not null default true"));
  const envio = lee("src/components/kaffetal-regal/ficha/shipmentInstructionsPrint.ts");
  check("las instrucciones de envío del productor dicen contra entrega", /Contra entrega/.test(envio) && /flete/.test(envio));
}

// ── 3. La solicitud en el OCP: subvención decidida → factura → pago sobre la factura → recibo ──
{
  const src = lee("src/app/ocp/(app)/solicitudesActions.ts");
  for (const fn of ["decidirSubvencion", "emitirFactura", "recibirMuestraAction"]) {
    check(`${fn} existe y es emite (el productor ve lo que escribe)`, cuerpoDe(src, fn).includes('permisoDeEscritura("ocp", "emite")'));
  }
  const dec = cuerpoDe(src, "decidirSubvencion");
  check("la subvención se decide solo con el pago pendiente", dec.includes('ins.status !== "pendiente"'));
  check("y emite un código de la campaña (el libro de la campaña sigue siendo verdad)", dec.includes("insertEntryCode(") && dec.includes('prefix: "KRX"'));
  check("revoca el código anterior", dec.includes("revoked_at"));
  check("y anula la factura ya emitida (se re-emite con el total nuevo)", dec.includes("factura_ref: null"));
  check("con rastro", dec.includes('action: "subvencion_decidida"'));
  const fac = cuerpoDe(src, "emitirFactura");
  check("la factura se numera en la base (secuencia)", fac.includes('rpc("next_factura_ref")'));
  check("no se emite dos veces ni sobre un pago ya confirmado", fac.includes("if (ins.factura_ref)") && fac.includes('ins.status !== "pendiente"'));
  check("lleva la regla contra entrega", fac.includes("pago_contra_entrega: PAGO_CONTRA_ENTREGA"));
  check("con rastro y nota al productor", fac.includes('action: "factura_emitida"') && fac.includes('from("producer_comm_log")'));
  check("el recibo pasa por el módulo de muestras (filas + marca en una acción)", cuerpoDe(src, "recibirMuestraAction").includes("recibirMuestra(service, {"));

  const nom = lee("src/app/ocp/(app)/nominadosActions.ts");
  check("el pago se confirma SOBRE la factura (paso 8 → 9)", cuerpoDe(nom, "confirmInscriptionPayment").includes("if (!ins.factura_ref) return"));
  check("salvo que CTCx asuma el costo (Ruta Desacoplada)", !cuerpoDe(nom, "asumirEvaluacion").includes("factura_ref"));
  check("la solicitud en nombre del productor ya no habla de la Arena", !cuerpoDe(nom, "postularOnBehalf").includes("Arena"));
  const migracion = lee("docs/migraciones/2026-09-24_solicitudes_muestras_baches.sql");
  check("el acta añade las cinco columnas de la solicitud", ["nota_solicitud text", "factura_ref text", "factura_emitida_at timestamptz", "subvencion_id uuid references public.club_campaigns(id)", "pago_contra_entrega boolean"].every((c) => migracion.includes(c)));
  check("la numeración es SECURITY DEFINER y solo del service role", migracion.includes("security definer") && migracion.includes("revoke all on function public.next_factura_ref() from public") && migracion.includes("grant execute on function public.next_factura_ref() to service_role"));
}

// ── 4. La factura: un documento para las dos caras, sin números a medias ────
{
  const factura = lee("src/lib/arena/factura.ts");
  check("la factura lleva la línea legal de CTC", factura.includes("CTC_LEGAL_LINE"));
  check("y dice que no sustituye a la factura electrónica", factura.includes("no sustituye a una factura electrónica"));
  check("el carril de pago viene de los datos, no está escrito aquí", factura.includes("d.carril.nequiNumber") && !/\d{3} \d{3} \d{4}/.test(factura));
  check("sin número de Nequi la factura manda a escribir a CTC", factura.includes("Escríbanos a"));
  const vista = lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx");
  const evalTab = lee("src/components/kaffetal-regal/panel/EvaluacionesTab.tsx");
  check("el OCP y el productor abren la MISMA factura", vista.includes("VerFacturaButton") && evalTab.includes("openFactura({"));
  check("el productor no ve instrucciones de pago sin factura emitida", /paymentsDue = lots\.filter\([^\n]*facturaRef\)/.test(evalTab));
}

// ── 5. El lado del productor: la nota de descuento y el vocabulario ─────────
{
  const acciones = lee("src/lib/arena/producerActions.ts");
  check("postularLote acepta la nota del descuento (paso 7)", acciones.includes("notaSolicitud?: string") && acciones.includes("nota_solicitud:"));
  const evalTab = lee("src/components/kaffetal-regal/panel/EvaluacionesTab.tsx");
  check("el productor tiene dónde pedir el descuento", /<textarea[\s\S]{0,300}descuento/.test(evalTab) && evalTab.includes("nota.trim() || undefined"));
  check("y ve su factura con el total", evalTab.includes("Factura de cobro") && evalTab.includes("ins.facturaRef"));
  check("el envío dice contra entrega", evalTab.includes("contra entrega"));
  check("«Evaluaciones en Fila» ya no habla de laboratorio", !/laboratorio/.test(evalTab));
  const exp = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
  check("el panel lee las columnas nuevas de la solicitud", exp.includes("nota_solicitud, factura_ref, factura_emitida_at, pago_contra_entrega"));
  const data = lee("src/components/kaffetal-regal/data.ts");
  check("y el modelo del productor las conoce", data.includes("facturaRef: string | null") && data.includes("pagoContraEntrega: boolean"));
}

// ── 6. Los Baches de Evaluación: abierto → en_centro → cerrado ──────────────
{
  const nom = lee("src/app/ocp/(app)/nominadosActions.ts");
  const cliente = lee("src/app/ocp/(app)/nominados/NominadosClient.tsx");
  for (const viejo of ['"planeado"', '"registro"', "lab_name", "proof_storage_path", "markBatchSent", "markBatchReceived", "markBatchDelivered", "createBatchProofUploadUrl", "setBatchLab", "planSondeoBatch"]) {
    check(`el kanban viejo se fue: sin ${viejo}`, !nom.includes(viejo) && !cliente.includes(viejo));
  }
  check("la solicitud formal de laboratorio se retiró", !existsSync(new URL("../src/lib/arena/sondeoRequestPrint.ts", import.meta.url)));
  const env = cuerpoDe(nom, "enviarAlCentro");
  check("enviarAlCentro existe y es emite", env.includes('permisoDeEscritura("ocp", "emite")'));
  check("el Q-Grader sale de la credencial del Centro (V5.81, respuesta 5): nadie lo teclea", env.includes("const qGrader = centro.contact_name?.trim() || centro.org_name") && !/formData\.get\("q_grader"\)/.test(env));
  check("solo un bache abierto y con lotes", env.includes('batch.status !== "abierto"') && env.includes("if (!lotes.length) return"));
  check("deja el bache en el Centro, a nombre de su credencial", env.includes('status: "en_centro"') && env.includes("centro_calidad_account_id: centro.profile_id"));
  check("la muestra de evaluación sale hacia el Centro (movimiento a_centro)", env.includes('motivo: "a_centro"') && env.includes("batch_id: batchId"));
  check("con rastro y nota a cada productor", env.includes('"batch_sent_to_centro"') && env.includes('from("producer_comm_log")'));
  check("el veredicto exige el bache en el Centro", cuerpoDe(nom, "recordEvaluationVerdict").includes('batch?.status !== "en_centro"'));
  check("y cierra el bache solo cuando cae el último veredicto", cuerpoDe(nom, "recordEvaluationVerdict").includes("cerrarBacheSiTermino(service, ins.sondeo_batch_id, adminId)"));
  check("las planillas también exigen el bache en el Centro", cuerpoDe(nom, "addSondeoEvaluation").includes('"en_centro"'));
  const migracion = lee("docs/migraciones/2026-09-24_solicitudes_muestras_baches.sql");
  check("el CHECK de la base solo admite los tres estados", migracion.includes("check (status in ('abierto', 'en_centro', 'cerrado'))"));
}

// ── 7. El rail (respuesta 7) y las páginas ──────────────────────────────────
{
  const catalogo = CONSOLES.ocp.nav.find((g) => g.label === "OCP · Catálogo");
  check("el rail del OCP tiene el grupo Catálogo", !!catalogo);
  const orden = ["/ocp/solicitudes", "/ocp/a-evaluar", "/ocp/en-evaluacion", "/ocp/ofertas", "/ocp/contratos", "/ocp/ctc-selection", "/ocp/catalogo"];
  check("en el orden de la respuesta 7: Solicitudes · a Evaluar · en Evaluación · Pendiente Oferta · CP Aceptadas · CTCx Selection · Catálogo Activo", JSON.stringify((catalogo?.links ?? []).map((l) => l.href)) === JSON.stringify(orden), JSON.stringify((catalogo?.links ?? []).map((l) => l.href)));
  check("«Solicitudes de Evaluación» es su etiqueta", catalogo?.links[0]?.label === "Solicitudes de Evaluación");
  check("y tiene página", existsSync(new URL("../src/app/ocp/(app)/solicitudes/page.tsx", import.meta.url)));
  const vista = lee("src/app/ocp/(app)/nominados/CircuitoVista.tsx");
  check("las tres vistas salen de UN componente", vista.includes('"solicitudes" | "a-evaluar" | "en-evaluacion"'));
  check("la vista de solicitudes enseña la nota del productor", vista.includes("i.nota_solicitud"));
}

// ── 8. El circuito conoce la solicitud ──────────────────────────────────────
{
  const base = { stage: "apto", registradoPorCtc: false, tieneInscripcion: true, pagoConfirmado: false, muestraRecibida: false, enBache: false, grado: null, ultimaOferta: null, contrato: null };
  check("pidió y falta algo → solicitada", estadoDelCircuito(base).estado === "solicitada");
  check("pagado y recibido, sin bache → a evaluar", estadoDelCircuito({ ...base, pagoConfirmado: true, muestraRecibida: true }).estado === "a_evaluar");
  check("en un bache → en evaluación", estadoDelCircuito({ ...base, pagoConfirmado: true, muestraRecibida: true, enBache: true }).estado === "en_evaluacion");
}

if (fallos.length) {
  console.error(`✗ qa-solicitud-evaluacion: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-solicitud-evaluacion: ${ok} comprobaciones OK, 0 fallos`);
