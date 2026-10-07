// ── qa-ciclos · los Ciclos de Cherry Picked (docs/PLAN_CICLOS.md, owner 2026-10-07; tanda 1 en la V5.174) ──────────────────
// Corre: node --experimental-strip-types --no-warnings --import ./scripts/ts-resolve.mjs scripts/qa-ciclos-check.mjs
// Puro y local (no toca la base ni gasta): el calendario ISO con las anclas del owner, la ventana que decide la fecha de firma,
// los mínimos (continuidad lineal, existencia insuficiente), la corrección del PVC por ciclo y el cableado de la tanda 1.

import { readFileSync } from "node:fs";

const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(`${nombre}${detalle ? ` (${detalle})` : ""}`));

const cal = await import("../src/lib/trato/calendario.ts");
const { ventanaDeFirma, ventanaDeRenovacion, precioDeVentana, RETIRO_LIBRE_CICLO_PCT, RETIRO_LIBRE_EXTENDIDA_PCT } = await import("../src/lib/trato/ventanas.ts");
const min = await import("../src/lib/trato/minimos.ts");
const { evaluarCorreccion, CORRECCION } = await import("../src/lib/pvc/correccion.ts");
const { fechaLimitePvcSiguiente } = await import("../src/lib/trato/modalidades.ts");
const { precioDeLaEscalera } = await import("../src/lib/pvc/precio.ts");

// ── 1. El calendario (las anclas del owner: T4-2026 termina el 3 ene 2027; T1-2027 empieza el 4 ene; su ciclo 1 acaba el 14 feb) ──
{
  check("ISO · 2026 tiene 53 semanas, 2027 tiene 52, 2032 tiene 53", cal.semanasDelAnioIso(2026) === 53 && cal.semanasDelAnioIso(2027) === 52 && cal.semanasDelAnioIso(2032) === 53);
  const t26 = cal.trimestresDelAnio(2026)[3];
  check("T4-2026 · 28 sep 2026 – 3 ene 2027, 14 semanas, ciclos 7 + 7 (al 15 nov)", t26.codigo === "F4-2026" && t26.desde === "2026-09-28" && t26.hasta === "2027-01-03" && t26.semanas === 14 && t26.ciclos[0].hasta === "2026-11-15" && t26.ciclos[0].semanas === 7 && t26.ciclos[1].semanas === 7);
  check("T4-2026 · sin semanas bloqueadas (owner: aplican desde 2027); agente 16 nov, publica a más tardar 29 nov", t26.sinContratos === null && t26.agenteEl === "2026-11-16" && t26.publicaAMasTardar === "2026-11-29");
  const [q1, q2, q3, q4] = cal.trimestresDelAnio(2027);
  check("T1-2027 · 4 ene – 4 abr; ciclo 1 al 14 feb (6 sem.), ciclo 2 desde el 15 feb (7 sem.)", q1.desde === "2027-01-04" && q1.hasta === "2027-04-04" && q1.ciclos[0].hasta === "2027-02-14" && q1.ciclos[1].desde === "2027-02-15" && q1.ciclos[0].semanas === 6 && q1.ciclos[1].semanas === 7);
  check("T1-2027 · sin contratos nuevos 11–24 ene; agente 15 feb, publica a más tardar 28 feb", q1.sinContratos?.desde === "2027-01-11" && q1.sinContratos?.hasta === "2027-01-24" && q1.agenteEl === "2027-02-15" && q1.publicaAMasTardar === "2027-02-28");
  check("2027 · T2 5 abr – 4 jul, T3 5 jul – 3 oct, T4 4 oct – 2 ene 2028 (13 semanas: 6 + 7)", q2.desde === "2027-04-05" && q2.hasta === "2027-07-04" && q3.desde === "2027-07-05" && q3.hasta === "2027-10-03" && q4.desde === "2027-10-04" && q4.hasta === "2028-01-02" && q4.semanas === 13 && q4.ciclos[0].hasta === "2027-11-14");
  check("lunes a domingo · todos los trimestres de 2026–2028 empiezan lunes y terminan domingo", [2026, 2027, 2028].flatMap((y) => cal.trimestresDelAnio(y)).every((t) => new Date(`${t.desde}T12:00:00Z`).getUTCDay() === 1 && new Date(`${t.hasta}T12:00:00Z`).getUTCDay() === 0));
  check("trimestreDe · el 1 ene 2027 cae en T4-2026 (semana 53)", cal.trimestreDe("2027-01-01").codigo === "F4-2026");
  check("validarCalendario · acepta T4-2026 y T1-2027; rechaza un ciclo 1 más largo que el 2 o un inicio que no es lunes", cal.validarCalendario({ desde: "2026-09-28", ciclo1Hasta: "2026-11-15", hasta: "2027-01-03" }) === null && cal.validarCalendario({ desde: "2027-01-04", ciclo1Hasta: "2027-02-14", hasta: "2027-04-04" }) === null && cal.validarCalendario({ desde: "2027-01-04", ciclo1Hasta: "2027-02-21", hasta: "2027-04-04" }) !== null && cal.validarCalendario({ desde: "2027-01-05", ciclo1Hasta: "2027-02-14", hasta: "2027-04-04" }) !== null);
  check("PVC siguiente · se publica a más tardar el domingo de la semana 2 del ciclo 2 (también con la fecha vieja de la franja)", fechaLimitePvcSiguiente("2026-09-28") === "2026-11-29" && fechaLimitePvcSiguiente("2026-09-15") === "2026-11-29" && fechaLimitePvcSiguiente("2027-01-04") === "2027-02-28");
}

// ── 2. La ventana la decide el día de la firma ──
{
  const F4 = { codigo: "PVC-F4-2026", cal: { desde: "2026-09-28", ciclo1Hasta: "2026-11-15", hasta: "2027-01-03" } };
  const F1 = { codigo: "PVC-F1-2027", cal: { desde: "2027-01-04", ciclo1Hasta: "2027-02-14", hasta: "2027-04-04" } };
  const F2 = { codigo: "PVC-F2-2027", cal: { desde: "2027-04-05", ciclo1Hasta: "2027-05-16", hasta: "2027-07-04" } };
  const v = (firma, vigente, siguiente = null) => ventanaDeFirma({ firma, vigente, siguiente });
  const s1 = v("2026-09-30", F4);
  check("semana 1 del ciclo 1 → ese ciclo, 25 %, PVC vigente", s1.abierta && s1.tipo === "ciclo" && s1.hasta === "2026-11-15" && s1.retiroLibrePct === RETIRO_LIBRE_CICLO_PCT && s1.precio === "vigente");
  const hoy = v("2026-10-07", F4);
  check("hoy (7 oct, semana 2 de T4-2026, sin bloqueo en 2026) → resto del trimestre, 30 %, PVC vigente", hoy.abierta && hoy.tipo === "extendida" && hoy.hasta === "2027-01-03" && hoy.retiroLibrePct === RETIRO_LIBRE_EXTENDIDA_PCT && hoy.precio === "vigente" && hoy.ciclos.length === 2);
  const bloq = v("2027-01-12", F1);
  check("T1-2027, semanas 2–3 → sin contratos nuevos; reabre el lunes de la semana 4", !bloq.abierta && bloq.reabre === "2027-01-25");
  const s4 = v("2027-01-26", F1);
  check("T1-2027, semana 4 del ciclo 1 → resto del ciclo 1 + ciclo 2, 30 %", s4.abierta && s4.tipo === "extendida" && s4.hasta === "2027-04-04" && s4.retiroLibrePct === 30);
  const c2s1 = v("2027-02-17", F1);
  check("ciclo 2, semana 1 → ciclo 2, 25 %", c2s1.abierta && c2s1.tipo === "ciclo" && c2s1.hasta === "2027-04-04" && c2s1.retiroLibrePct === 25);
  const c2s2sin = v("2027-02-23", F1, null);
  const c2s2con = v("2027-02-26", F1, F2);
  check("ciclo 2 desde la semana 2 → sin PVC siguiente, cerrada; publicado, hasta el ciclo 1 siguiente al promedio, 30 %", !c2s2sin.abierta && c2s2con.abierta && c2s2con.tipo === "extendida" && c2s2con.hasta === "2027-05-16" && c2s2con.precio === "promedio" && c2s2con.retiroLibrePct === 30);
  check("semanas 2–3 del CICLO 2 no se bloquean (reciben contratos para el envío siguiente)", v("2027-03-03", F1, F2).abierta);
  const ren1 = ventanaDeRenovacion({ firma: "2027-02-01", vigente: F1, siguiente: null });
  const ren2 = ventanaDeRenovacion({ firma: "2027-03-22", vigente: F1, siguiente: F2 });
  check("renovación · firmada en el ciclo 1 cubre el ciclo 2 entero; en el ciclo 2, el ciclo 1 siguiente al PVC siguiente", ren1.abierta && ren1.desde === "2027-02-15" && ren1.hasta === "2027-04-04" && ren1.retiroLibrePct === 25 && ren2.abierta && ren2.desde === "2027-04-05" && ren2.hasta === "2027-05-16" && ren2.precio === "siguiente");
  check("precio · promedio simple de los dos PVC (owner, respuesta 6)", precioDeVentana("promedio", 20000, 22000) === 21000 && precioDeVentana("vigente", 20000, null) === 20000 && precioDeVentana("promedio", 20000, null) === null);
}

// ── 3. Los mínimos ──
{
  check("mínimo · de la edición si lo trae; si no, la constante (Red 750)", min.minimoDelGrado("red", { red: 800 }) === 800 && min.minimoDelGrado("Red", null) === 750 && min.minimoDelGrado("tyrian", null) === null);
  check("continuidad · lineal, −10 % del original por cambio de trimestre (750 → 675 → 600 → 525)", min.minimoDeContinuidad(750, 0) === 750 && min.minimoDeContinuidad(750, 1) === 675 && min.minimoDeContinuidad(750, 2) === 600 && min.minimoDeContinuidad(750, 3) === 525);
  const a = min.validarDeclaracion({ kg: 800, minimo: 750, disponibleKg: 2000 });
  const b = min.validarDeclaracion({ kg: 500, minimo: 750, disponibleKg: 520 });
  const c = min.validarDeclaracion({ kg: 300, minimo: 750, disponibleKg: 520 });
  const d = min.validarDeclaracion({ kg: 500, minimo: 750, disponibleKg: 3000 });
  const e = min.validarDeclaracion({ kg: 900, minimo: 750, disponibleKg: 800 });
  check("declaración · ≥ mínimo con retiro; existencia insuficiente → hasta la mitad SIN retiro; menos que la mitad no; con existencia de sobra, el mínimo manda; nunca más de lo que hay", a.ok && a.conRetiro && b.ok && !b.conRetiro && !c.ok && !d.ok && !e.ok);
  check("disponible · existencia − vendido − retirado; sin existencia, desconocido", min.disponibleDelLote(1500, 600, 100) === 800 && min.disponibleDelLote(null, 0, 0) === null);
  check("A2 · producción 5 : 1 entre cereza y pergamino", min.produccionEnLaOtra(5000, "cereza") === 1000 && min.produccionEnLaOtra(1000, "pergamino") === 5000);
}

// ── 4. La corrección del PVC dentro del ciclo ──
{
  const serie = (vals, desde = "2026-10-01") => vals.map((valor, i) => ({ fecha: new Date(Date.parse(`${desde}T12:00:00Z`) + i * 864e5).toISOString().slice(0, 10), valor }));
  const PVC = 2500000;
  const nada = evaluarCorreccion(PVC, serie(Array(20).fill(2100000)));
  check("sin disparo · FNC entre $2,0 y $2,2 M contra $2,5 M: ni alza ni baja (el umbral de baja es $2.083.333)", nada.tipo === null);
  const alza = evaluarCorreccion(PVC, serie([...Array(15).fill(2700000), ...Array(5).fill(2400000)]));
  check("alza · 15 de 20 sobre el PVC → + (promedio − PVC) = +$200.000", alza.tipo === "alza" && alza.monto === 200000 && alza.nuevoPvc === 2700000 && !alza.topado);
  const alzaTope = evaluarCorreccion(PVC, serie([...Array(16).fill(3000000), ...Array(4).fill(2400000)]));
  check("alza · tope del 10 % (+$250.000)", alzaTope.tipo === "alza" && alzaTope.monto === 250000 && alzaTope.topado);
  const baja = evaluarCorreccion(PVC, serie([...Array(15).fill(2000000), ...Array(5).fill(2300000)]));
  check("baja · PVC ≥ 1,2 × FNC en 15 de 20 → − (PVC/1,2 − promedio) ≈ −$83.000", baja.tipo === "baja" && baja.monto === 83000 && baja.nuevoPvc === 2417000);
  const bajaTope = evaluarCorreccion(PVC, serie(Array(20).fill(1500000)));
  check("baja · tope del 10 % (−$250.000)", bajaTope.tipo === "baja" && bajaTope.monto === 250000 && bajaTope.topado);
  const arrastre = evaluarCorreccion(PVC, serie(Array(14).fill(2700000), "2026-11-16"), serie(Array(6).fill(2700000), "2026-11-09"));
  const soloPrevias = evaluarCorreccion(PVC, [], serie(Array(20).fill(2700000), "2026-11-09"));
  check("bloque · puede tomar la última semana del ciclo anterior, pero nunca solo lecturas del anterior", arrastre.tipo === "alza" && soloPrevias.tipo === null);
  check("reglas · bloques de 20, 15 aciertos, tope 10 %, margen 1,2", CORRECCION.bloque === 20 && CORRECCION.aciertos === 15 && CORRECCION.topePct === 10 && CORRECCION.margenBaja === 1.2);
}

// ── 5. Lo cableado en la tanda 1 ──
{
  const esc = [{ banda: "Red", cop: 2500000, mult: 1, rango: "" }];
  const conFlete = precioDeLaEscalera(esc, "red", 0, 25000);
  const sinFlete = precioDeLaEscalera(esc, "red", -8, 0);
  check("flete (V5.177) · precio final = PVC × mult. (con su %) + Flete a CTCx de la región, igual para todos los grados", conFlete.copCargaFinal === 2525000 && conFlete.copKgFinal === 20200 && conFlete.fleteCarga === 25000 && sinFlete.copCargaFinal === 2300000 && sinFlete.fleteCarga === 0);
  const mig = lee("docs/migraciones/2026-10-07_ciclos_variables_de_edicion.sql");
  check("migración · variables de la edición, re-fechado de F4-2026 con auditoría, existencia del lote", ["ciclo1_hasta date", "minimos_por_grado jsonb", "rangos_calidad jsonb", "valid_from = '2026-09-28', valid_to = '2027-01-03', ciclo1_hasta = '2026-11-15'", "'refechado_calendario_iso'", "add column if not exists existencia_cps_kg numeric"].every((k) => mig.includes(k)));
  const serv = lee("src/lib/pvc/servicio.ts");
  const act = lee("src/lib/pvc/actions.ts");
  check("Modelo Económico · las variables se leen con la edición, se guardan con auditoría y las fija el owner (validando el calendario)", serv.includes("ciclo1_hasta, minimos_por_grado, rangos_calidad, flete_por_region") && serv.includes('action: "variables_de_edicion"') && act.includes("export async function guardarVariablesDeEdicionAction(") && act.includes("validarCalendario({") && act.includes("isPanelOwner(") && lee("src/components/panel/pvc/EdicionesBoard.tsx").includes("<VariablesDeEdicion"));
  const pag = lee("src/app/ocp/(app)/ofertas/page.tsx");
  const ofa = lee("src/app/ocp/(app)/ofertasActions.ts");
  check("OCP · el mínimo de la oferta y el flete salen de la edición", pag.includes("minimoDelGrado(grade, edicion.minimosPorGrado)") && pag.includes("fletesDeLaEdicion(edicion.fletePorRegion)") && ofa.includes("minimoDelGrado(lot.grade, pvc?.edicion.minimosPorGrado)") && serv.includes("fletesDeLaEdicion(edicion.fletePorRegion)"));
  const a2 = lee("src/components/kaffetal-regal/ficha/panes/PaneA2.tsx");
  check("Ficha A2 · existencia (espejada a lots.existencia_cps_kg), plantas y producción con selector cereza/pergamino", a2.includes("Existencia total del lote") && a2.includes("Número de plantas") && a2.includes("produccionEnLaOtra(") && lee("src/components/kaffetal-regal/KaffetalExperience.tsx").includes("existencia_cps_kg: Number(updates.datasheet.existencia_cps_kg) > 0") && lee("src/components/kaffetal-regal/ficha/fichaData.ts").includes('produccion_unidad: "pergamino"'));
  const plan = lee("docs/PLAN_CICLOS.md");
  check("plan · PLAN_CICLOS manda y lo enlazan el plan del circuito y el del PVC", plan.includes("## 9. Las tandas") && lee("docs/PLAN_CIRCUITO_DEL_LOTE.md").includes("docs/PLAN_CICLOS.md") && lee("docs/PVC_BCP_PLAN.md").includes("docs/PLAN_CICLOS.md"));
}

// ── 6. El trato por ventanas (tanda 2 · V5.175): la cuenta, los despachos, el pago, el contrato y el cableado ──
{
  const { cuentaDeVentana, retiroDeVentana } = await import("../src/lib/trato/cuenta.ts");
  const d = await import("../src/lib/trato/despachos.ts");
  const { simularVentasDeVentana } = await import("../src/lib/trato/simulador.ts");
  const { clausulasDelContrato, CONTRATO_VERSION } = await import("../src/lib/trato/contrato.ts");
  const T = await import("../src/lib/trato/terminos.ts");

  // El ejemplo del owner: declara 100 kg (25 % libre = 25 kg) · sem. 2 retira 15 · sem. 3 CTCx vende 70 · sem. 4 quedan 15.
  const c0 = cuentaDeVentana({ declaradoKg: 100, retiroLibrePct: 25, sinRetiro: false, ventas: [], retiros: [] });
  const r1 = retiroDeVentana(c0, 15, 20000);
  const c1 = cuentaDeVentana({ declaradoKg: 100, retiroLibrePct: 25, sinRetiro: false, ventas: [{ kg: 70 }], retiros: [{ kg: 15, libreKg: 15 }] });
  const r2 = retiroDeVentana(c1, 15, 20000);
  const r3 = retiroDeVentana(c1, 30, 20000);
  check("retiro · el ejemplo del owner: 15 libres; luego CTCx vende 70 y quedan 15 → 10 libres + 5 al 4 %; los 30 que pide el tercero no caben", r1.ok && r1.libreKg === 15 && r1.penalizadoKg === 0 && c1.disponibleKg === 15 && c1.libreRestanteKg === 10 && r2.ok && r2.libreKg === 10 && r2.penalizadoKg === 5 && r2.penalidadCop === Math.round((5 / 125) * 20000 * 125 * 0.04) && !r3.ok);
  const cR = cuentaDeVentana({ declaradoKg: 400, retiroLibrePct: 30, sinRetiro: true, ventas: [], retiros: [] });
  check("retiro · una declaración reducida no tiene retiro libre (todo al 4 %)", cR.libreTotalKg === 0 && retiroDeVentana(cR, 50, 20000).ok && retiroDeVentana(cR, 50, 20000).penalizadoKg === 50);

  check("despachos · el saco sale el domingo de la semana de firma; lo vendido, por baches: a más tardar el domingo de la 5.ª semana contando la de su primera venta (V5.183)", d.finDeSemana("2026-10-07") === "2026-10-11" && d.plazoDelSaco("2026-10-11") === "2026-10-11" && d.plazoDelBache("2026-10-07") === "2026-11-08" && d.plazoDelBache("2026-10-05") === "2026-11-08");
  const o1 = d.opcionesSiNoSale({ tipo: "saco", firmadoEnSemana1: true, yaProrrogado: false });
  const o2 = d.opcionesSiNoSale({ tipo: "saco", firmadoEnSemana1: false, yaProrrogado: false });
  const o3 = d.opcionesSiNoSale({ tipo: "vendido", firmadoEnSemana1: false, yaProrrogado: false });
  const o4 = d.opcionesSiNoSale({ tipo: "vendido", firmadoEnSemana1: false, yaProrrogado: true });
  check("despachos · si no sale: prórroga (no si se firmó en la semana 1), cancelar o pasar a la ventana siguiente; lo vendido solo prórroga, una vez", !o1.prorroga && o1.cancelar && o1.siguienteVentana && o2.prorroga && o3.prorroga && !o3.cancelar && !o3.siguienteVentana && !o4.prorroga && d.plazoProrrogado("2026-10-11") === "2026-10-18");
  const pg = d.pagosDeDespacho(1400000);
  check("pago · 60 % con el tiquete de despacho, 40 % al recibir; fuera de rango, 0–15 % adicional", pg.alDespacho === 840000 && pg.alRecibir === 560000 && T.PAGO_AL_DESPACHO_PCT === 60 && d.pagoAdicionalFueraDeRango(1400000, 15) === 210000 && d.pagoAdicionalFueraDeRango(1400000, 16) === null);
  check("calidad · humedad 10–12 % y aw ≤ 0,70 por defecto; fuera de rango se dice por qué", d.calidadAlRecibir({ humedadPct: 11, aw: 0.6 }, null).enRango && !d.calidadAlRecibir({ humedadPct: 12.5, aw: 0.6 }, null).enRango && !d.calidadAlRecibir({ humedadPct: 11, aw: 0.75 }, null).enRango && !d.calidadAlRecibir({ humedadPct: null, aw: null }, null).enRango);
  check("saco · 70–200 kg con el primer contrato; renovación 0–200 (normalmente 10–20); por encima, CTCx Selection", T.SACO_INICIAL_KG.min === 70 && T.SACO_INICIAL_KG.max === 200 && T.ADELANTO_RENOVACION_KG.tipicoMin === 10 && T.ADELANTO_RENOVACION_KG.tipicoMax === 20 && T.ADELANTO_RENOVACION_KG.max === 200);
  const sv = simularVentasDeVentana({ declaradoKg: 750, copKg: 20000, semanas: 11, sacoKg: 70, ventaPct: 0, patron: "parejo", fncCargaRef: 2110000 });
  check("escenario · el saco va FUERA de lo declarado y suma a lo que recibe; las semanas de la ventana", sv.saco.kg === 70 && sv.vendidoKg === 0 && sv.sinVenderKg === 750 && sv.ingresoCop === 70 * 20000 && sv.porSemana.length === 11);

  const base = { tipo: "cherry_picked", ventana: { tipo: "ciclo", desde: "2027-02-15", hasta: "2027-04-04", ciclos: ["F1-2027 · ciclo 2"], retiroLibrePct: 25, precio: "vigente" }, sinRetiro: false, sacoKg: 0, esRenovacion: true, minimoKg: 675, calidad: null, flete: { region: "centro", carga: 50000 }, productorNombre: "Ana Pérez", productorDocumento: null, loteNombre: "L", loteReferencia: "CTC-L-X", grado: "red", copKg: 21000, declaradoKg: 700, lugarEntrega: "Bucaramanga.", termsVersion: "2026-10-07", temporada: null };
  const ren = clausulasDelContrato(base).map((x) => `${x.titulo} ${x.texto}`).join(" ");
  const red = clausulasDelContrato({ ...base, esRenovacion: false, sacoKg: 70, sinRetiro: true, declaradoKg: 400 }).map((x) => x.texto).join(" ");
  check("contrato · renovación sin adelanto, Flete a CTCx citado en el precio y en la entrega, mínimo −10 % al cambiar de trimestre; declaración reducida sin retiro libre", CONTRATO_VERSION === "2026-10-07.3" && ren.includes("Compra adelantada") && ren.includes("no compra por adelantado") && ren.includes("e incluye el Flete a CTCx de la región Nacional Centro: $50.000 COP por carga equivalente ($400 COP por kg)") && ren.includes("código de envío corporativo de CTCx en Servientrega") && !/auxilio/i.test(ren) && ren.includes("baja 10 %") && red.includes("sin derecho a retiro libre") && red.includes("no hay retiro libre"));

  const vo = lee("src/lib/ofertas/ventanaDeOferta.ts");
  const pa = lee("src/lib/ofertas/producerActions.ts");
  const ta = lee("src/lib/trato/producerActions.ts");
  check("firma · la ventana, el precio de su regla y lo disponible salen de UNA cuenta del servidor (vista previa = aceptación)", vo.includes("(esRenovacion ? ventanaDeRenovacion : ventanaDeFirma)({ firma: hoy,") && vo.includes("precioDeVentana(ventana.precio, vigenteKg, siguienteKg)") && vo.includes("disponibleDelLote(existenciaKg, suma(ventas), suma(retiros) + suma(despachos))") && pa.includes("export async function previsualizarOferta(") && pa.includes("await condicionesDeFirma(service, offer as unknown as OfertaParaVentana, hoyEnColombia())"));
  check("aceptar · exige la existencia del lote, crea el despacho del saco con plazo y congela calidad y flete en el contrato", pa.includes("if (c.existenciaKg == null) return") && pa.includes('tipo: cond.esRenovacion ? "adelanto" : "saco",') && pa.includes("plazo: plazoDelSaco(hoy),") && pa.includes("calidad_snapshot: cond?.calidad ?? null,") && pa.includes("flete_region: fleteDeLaFila(offer)?.region ?? null,") && pa.includes("flete_carga: fleteDeLaFila(offer)?.carga ?? null,") && pa.includes("export async function registrarExistencia("));
  check("productor · despacho con guía, peso y foto; prórroga con advertencia; cancelar o pasar a la ventana siguiente — todo por servidor y con auditoría", ["export async function registrarDespacho(", "export async function pedirProrroga(", "export async function cancelarPorDespacho(", "export async function pasarALaVentanaSiguiente(", 'action: "advertencia_prorroga"', 'action: "despacho_registrado"', "opcionesSiNoSale({"].every((k) => ta.includes(k)));
  const mig = lee("docs/migraciones/2026-10-07_ciclos_trato_por_ventanas.sql");
  check("migración · contratos por ventana, saco en la oferta, ventas semanales, retiros y despachos con lectura solo del dueño", ["add column if not exists ventana_tipo text", "add column if not exists saco_kg numeric", "create table if not exists public.contract_despachos", "create table if not exists public.contract_ventas", "create table if not exists public.contract_retiros", "create policy contract_despachos_select_own", "add column if not exists calidad_snapshot jsonb"].every((k) => mig.includes(k)));
  const of = lee("src/app/ocp/(app)/ofertasActions.ts");
  const de = lee("src/app/ocp/(app)/ofertas/OfertaDesplegable.tsx");
  const tab = lee("src/components/kaffetal-regal/panel/ContratosTab.tsx");
  check("OCP · la invitación lleva el saco (validado), vence con su edición y enseña la ventana que tocaría hoy", of.includes("sacoKg < min || sacoKg > SACO_INICIAL_KG.max") && of.includes("venceConLaEdicion") && de.includes('fd.set("saco_kg", String(sacoN));') && de.includes("anclaje!.ventanaHoy.abierta") && lee("src/app/ocp/(app)/ofertas/page.tsx").includes("ventanaDeFirma({ firma: hoyEnColombia(),"));
  check("KR · la existencia se registra aunque la Ficha esté cerrada; los despachos se registran y resuelven desde «Mi trato»", tab.includes("<ExistenciaForm") && tab.includes("registrarDespacho(d.id, {") && tab.includes("pedirProrroga(d.id)") && tab.includes("pasarALaVentanaSiguiente(d.id)") && tab.includes("cancelarPorDespacho(d.id)"));
  check("OCP · un contrato por ventana se lee por su ventana (no mes a mes)", lee("src/app/ocp/(app)/contratos/[id]/page.tsx").includes("const porVentana = Boolean(") && lee("src/app/ocp/(app)/contratos/[id]/page.tsx").includes('{contract.status !== "pending_signature" && !porVentana && ('));
}

// ── 7. La operación en el OCP (tanda 3 · V5.176): ventas semanales, despacho y pago 60/40, recibo con calidad, faltante,
//    renovación prellenada, la vitrina de Cherry Picked y el barrido diario ──
{
  const { existsSync } = await import("node:fs");
  const va = lee("src/app/ocp/(app)/ventanaActions.ts");
  check("OCP · confirmar la venta de la semana: no más de lo que queda en la vitrina, y se agrega al bache abierto del contrato (V5.183)", va.includes("export async function confirmarVentaSemanal(") && va.includes("if (kg > cuenta.disponibleKg + 1e-9)") && va.includes("despachoDeLoVendido(service, c.id, lunes, kg, copKg)") && va.includes('.is("anulada_at", null)'));
  check("OCP · confirmar el tiquete paga el 60 % (CTCx puede registrar la guía por el productor)", va.includes("export async function confirmarDespacho(") && va.includes("const { alDespacho } = pagosDeDespacho(Number(d.total_cop));") && va.includes("pago_despacho_cop: alDespacho"));
  check("OCP · recibir exige humedad y aw: en rango paga el resto sobre lo recibido; fuera de rango, devolución o compra con 0–15 %", va.includes("export async function recibirDespacho(") && va.includes("calidadAlRecibir({ humedadPct: humedad, aw }, c.calidad_snapshot)") && va.includes("Math.max(0, totalRecibido - pagado60)") && va.includes('decision === "devolucion"') && va.includes("pagoAdicionalFueraDeRango(totalRecibido, ajuste)"));
  check("OCP · el saco y el adelanto recibidos quedan en Compras con destino Sample Kits; lo vendido no (se vende a nombre del productor)", va.includes('d.tipo !== "vendido" && resultado !== "devolucion"') && va.includes('destino: "sample_kits"'));
  check("OCP · el faltante de lo vendido: solo tras la prórroga; la venta se ANULA (no se borra) y entra como retiro penalizado; la ruptura la declara el owner", va.includes("export async function cobrarFaltante(") && va.includes("if (!d.prorroga_hasta) return") && va.includes("anulada_at: now") && va.includes("libre_kg: 0, penalizado_kg: kg") && !va.includes('.from("contract_ventas").delete('));
  check("OCP · la renovación se prepara desde la semana 4 del último ciclo, con el mínimo de continuidad y el adelanto típico", va.includes("export async function prepararRenovacion(") && va.includes("const abre = sumaDias(u.inicioCiclo, 21);") && va.includes("minimoDeContinuidad(base, cambios)") && va.includes('fd.set("renewal_of_contract_id", c.id);') && va.includes("ADELANTO_RENOVACION_KG.tipicoMin"));
  const of = lee("src/app/ocp/(app)/ofertasActions.ts");
  check("OCP · la renovación convive con el contrato que renueva y vence al terminar su ventana", of.includes(".filter((c) => c.id !== renewalOf)") && of.includes("renovado?.vigencia_hasta"));
  const pag = lee("src/app/ocp/(app)/ofertas/page.tsx");
  check("OCP · «Pendiente de Oferta» tiene la columna de renovaciones a una aprobación", pag.includes("Renovaciones de ventana") && pag.includes("prepararRenovacion.bind(null, c.id)") && pag.includes("sumaDias(u.inicioCiclo, 21)"));
  const pc = lee("src/app/ocp/(app)/contratos/[id]/page.tsx");
  check("OCP · el contrato por ventana trae sus acciones (venta, tiquete y 60 %, recibo, prórroga, faltante, renovación)", ["confirmarVentaSemanal.bind(null, id)", "confirmarDespacho.bind(null, did)", "recibirDespacho.bind(null, did)", "prorrogarLoVendido.bind(null, did)", "cobrarFaltante.bind(null, did)", "prepararRenovacion.bind(null, id)"].every((k) => pc.includes(k)));
  const vs = lee("src/lib/trato/ventanaServidor.ts");
  const cat = lee("src/app/ocp/(app)/catalogActions.ts");
  check("vitrina · un lote por ventanas se vende con el café en la finca: total = declarado − retirado (suma de sus ventanas); el catálogo lleva lo vendido", vs.includes("export async function sincronizarListado(") && vs.includes("Math.max(0, Math.round((declarado - retirado) * 10) / 10)") && cat.includes("const porVentanas = await totalEnVentaPorVentanas(service, lotId);") && lee("src/lib/trato/producerActions.ts").includes("await sincronizarListado(service, c.lot_id);") && lee("src/lib/ofertas/producerActions.ts").includes("if (cond) await sincronizarListado(service, offer.lot_id);"));
  const rn = lee("src/lib/trato/renovaciones.ts");
  check("barrido · recuerda una vez la renovación que vence (7 días), expira las invitaciones vencidas y cierra las ventanas cumplidas", rn.includes("export async function correrRenovaciones(") && rn.includes("o.es_renovacion && !o.recordatorio_at") && rn.includes('update({ status: "expirada"') && rn.includes('update({ status: "completed" })') && lee("vercel.json").includes('"/api/cron/renovaciones"') && lee("src/app/api/cron/renovaciones/route.ts").includes("Bearer ${secret}"));
  check("V5.171 retirada · ni redeclaración ni su cron (las columnas quedan dormidas, documentadas)", !existsSync(new URL("../src/lib/trato/redeclaracion.ts", import.meta.url)) && !existsSync(new URL("../src/app/api/cron/redeclaraciones/route.ts", import.meta.url)) && !lee("vercel.json").includes("redeclaraciones") && lee("docs/migraciones/2026-10-07_ciclos_operacion_ocp.sql").includes("quedan DORMIDAS"));
  const tab = lee("src/components/kaffetal-regal/panel/ContratosTab.tsx");
  const calc = lee("src/components/kaffetal-regal/panel/CalculadoraDelTrato.tsx");
  check("KR · la renovación reconfirma disponibilidad, humedad y bodegaje, y deja actualizar la existencia", calc.includes("Confirmo que esta cantidad está disponible y que la humedad y el bodegaje del café son los adecuados.") && tab.includes("¿Cambió? Actualizarla") && lee("src/components/kaffetal-regal/KaffetalExperience.tsx").includes(".filter((v) => !v.anulada_at)"));
}

// ── 8. Flete a CTCx (V5.177 · owner, 2026-10-07): no hay «auxilio de transporte» (las cooperativas DESCUENTAN el flete de la base
//    FNC); CTCx suma un flete fijo por carga en tres niveles por región, variable de la edición, elegido y congelado en la oferta ──
{
  const f = await import("../src/lib/trato/flete.ts");
  const D = f.FLETE_A_CTCX_POR_DEFECTO;
  check("flete · los valores del owner: Regional Santander $25.000, Nacional Centro $50.000, Nacional Sur $70.000 por carga (200 · 400 · 560 COP/kg; 14.000 · 28.000 · 39.200 por 70 kg)", D.santander === 25000 && D.centro === 50000 && D.sur === 70000 && f.fletePorKg(D.santander) === 200 && f.fletePorKg(D.centro) === 400 && f.fletePorKg(D.sur) === 560 && f.fletePorKg(D.santander) * 70 === 14000 && f.fletePorKg(D.centro) * 70 === 28000 && f.fletePorKg(D.sur) * 70 === 39200);
  check("flete · la región se sugiere por el departamento de la finca (Santanderes · Sur · el resto Centro); fuera de Colombia o sin departamento, la elige CTCx", f.regionSugerida("Santander") === "santander" && f.regionSugerida("Norte de Santander") === "santander" && f.regionSugerida("Nariño") === "sur" && f.regionSugerida("HUILA") === "sur" && f.regionSugerida("Quindío") === "centro" && f.regionSugerida("Antioquia", "Colombia") === "centro" && f.regionSugerida("Santander", "Ecuador") === null && f.regionSugerida(null) === null);
  check("flete · una edición sin valores usa los del owner; los fijados mandan; la fila congelada se lee con región válida", JSON.stringify(f.fletesDeLaEdicion(null)) === JSON.stringify(D) && f.fletesDeLaEdicion({ santander: 30000, centro: 50000, sur: 70000 }).santander === 30000 && f.fleteDeLaFila({ flete_region: "sur", flete_carga: "70000" })?.carga === 70000 && f.fleteDeLaFila({ flete_region: "costa", flete_carga: 1 }) === null && f.fleteDeLaFila({ flete_region: null, flete_carga: null }) === null);
  const mig = lee("docs/migraciones/2026-10-07_flete_a_ctcx.sql");
  check("migración · flete_por_region en la edición (con su check), región y valor congelados en la oferta y en el contrato, guard sin auxilio, F4-2026 con auditoría", ["add column if not exists flete_por_region jsonb", "flete_por_region ?& array['santander', 'centro', 'sur']", "lot_offers_flete_check", "purchase_contracts_flete_check", "'flete_a_ctcx'", "'{\"santander\": 25000, \"centro\": 50000, \"sur\": 70000}'::jsonb"].every((k) => mig.includes(k)) && !mig.slice(mig.indexOf("create or replace function")).split("$function$;")[0].includes("auxilio"));
  const of = lee("src/app/ocp/(app)/ofertasActions.ts");
  check("OCP · una oferta anclada exige la región; el precio la incluye (pvcParaGrado) y la oferta congela región y valor", of.includes('if (ANCLADAS.includes(kind) && !fleteRegion) return') && of.includes("await pvcParaGrado(lot.grade, undefined, { modificadorPct, fleteRegion })") && of.includes("flete_region: fleteRegion,") && of.includes("flete_carga: fleteRegion && pvc ? pvc.precio.fleteCarga : null,"));
  const de = lee("src/app/ocp/(app)/ofertas/OfertaDesplegable.tsx");
  check("OCP · «Confirmar la oferta» elige la región (sugerida por la finca) y el precio se mueve con ella", de.includes("Flete a CTCx · región de despacho") && de.includes("useState<RegionDeFlete | null>(anclaje?.regionSugerida ?? null)") && de.includes("function elegirRegion(r: RegionDeFlete)") && de.includes('fd.set("flete_region", region)') && de.includes("(!anclaje || region != null)"));
  check("OCP · la renovación despacha desde la misma región", lee("src/app/ocp/(app)/ventanaActions.ts").includes('if (c.flete_region) fd.set("flete_region", c.flete_region);'));
  check("firma · el precio del PVC siguiente lleva el MISMO flete congelado de la oferta", lee("src/lib/ofertas/ventanaDeOferta.ts").includes("siguienteKg = sig ? Math.round(sig.precio.copKgFinal + (flete ? fletePorKg(flete.carga) : 0)) : null;"));
  check("Modelo Económico · los tres valores se editan en las variables de la edición (owner, con auditoría)", lee("src/components/panel/pvc/VariablesDeEdicion.tsx").includes('fletePorRegion: { santander: fleteN("santander"), centro: fleteN("centro"), sur: fleteN("sur") }') && lee("src/lib/pvc/actions.ts").includes("El Flete a CTCx de cada región es un valor entero en pesos por carga.") && lee("src/lib/pvc/servicio.ts").includes("flete_por_region: v.fletePorRegion,"));
  const { clausulasDelContrato } = await import("../src/lib/trato/contrato.ts");
  const sel = clausulasDelContrato({ tipo: "selection", ventana: null, sinRetiro: false, sacoKg: null, esRenovacion: false, minimoKg: null, calidad: null, flete: { region: "sur", carga: 70000 }, productorNombre: "Ana Pérez", productorDocumento: null, loteNombre: "L", loteReferencia: "CTC-L-X", grado: "red", copKg: 22000, declaradoKg: 500, lugarEntrega: "Bucaramanga.", termsVersion: null, temporada: null }).map((x) => x.texto).join(" ");
  check("contrato CTCx Selection · también cita el Flete a CTCx de su región y el despacho con el código corporativo", sel.includes("e incluye el Flete a CTCx de la región Nacional Sur: $70.000 COP por carga equivalente ($560 COP por kg)") && sel.includes("Servientrega"));
  const kr = ["src/components/kaffetal-regal/panel/CalculadoraDelTrato.tsx", "src/components/kaffetal-regal/panel/ContratosTab.tsx", "src/components/kaffetal-regal/panel/PropuestaSelection.tsx", "src/lib/pvc/precio.ts", "src/lib/pvc/servicio.ts", "src/components/panel/pvc/VariablesDeEdicion.tsx", "src/app/ocp/(app)/ofertas/page.tsx"].map(lee).join("\n");
  check("sin «auxilio de transporte» · ni en el precio, ni en el Modelo Económico, ni en la oferta, ni en lo que lee el productor", !/auxilio/i.test(kr) && lee("src/app/kaffetal-regal/contrato/[id]/page.tsx").includes("flete: fleteDeLaFila(c),") && lee("src/components/kaffetal-regal/KaffetalExperience.tsx").includes("flete: fleteDeLaFila(o),"));
}

// ── 9. La vigilancia de la corrección (V5.178 · tanda 4): medir el ciclo, proponer una por ciclo y PVC, aprobar = publicar la
//    edición corregida (mismas entradas y variables, PVC nuevo), que aplica solo a lo que se firme después ──
{
  const { calcular, calcularConPvc, PARAMS_V211, ENTRADAS_F4_2026 } = await import("../src/lib/pvc/motor.ts");
  const { medirCiclo } = await import("../src/lib/pvc/correccion.ts");
  const base = calcular(PARAMS_V211, ENTRADAS_F4_2026);
  const igual = calcularConPvc(PARAMS_V211, ENTRADAS_F4_2026, base.edicion.pvc);
  const corr = calcularConPvc(PARAMS_V211, ENTRADAS_F4_2026, base.edicion.pvc + 100000);
  check("motor · calcularConPvc con el PVC de la edición es idéntica a calcular; con otro PVC rehace escalera, pila y KPIs", JSON.stringify(igual) === JSON.stringify(base) && corr.edicion.pvc === base.edicion.pvc + 100000 && corr.escalera[0].cop > base.escalera[0].cop && corr.kpis.usd_carga === (base.edicion.pvc + 100000) / ENTRADAS_F4_2026.trm);
  const dias = (desde, n) => Array.from({ length: n }, (_, i) => { const d = new Date(`${desde}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  const ciclo = { pvc: 2500000, ciclo: "F4-2026 · ciclo 1", inicioCiclo: "2026-09-28", finCiclo: "2026-11-15" };
  const alzaL = dias("2026-10-01", 20).map((fecha, i) => ({ fecha, valor: i % 4 === 0 ? 2400000 : 2600000 }));
  const mA = medirCiclo({ ...ciclo, lecturas: [{ fecha: "2026-09-20", valor: 1 }, ...alzaL] });
  check("medición · 15 de 20 por encima del PVC → alza al promedio de las que lo superan (+$100.000), lo de fuera de la semana previa no cuenta", mA.resultado.tipo === "alza" && mA.resultado.aciertos === 15 && mA.resultado.monto === 100000 && mA.resultado.nuevoPvc === 2600000 && mA.lecturas === 20 && mA.previas === 0 && mA.umbralBaja === 2083333);
  const bajaL = dias("2026-10-01", 20).map((fecha, i) => ({ fecha, valor: i % 4 === 0 ? 2300000 : 2000000 }));
  const mB = medirCiclo({ ...ciclo, lecturas: bajaL });
  check("medición · 15 de 20 en o bajo PVC / 1,2 → baja de (PVC/1,2 − promedio) redondeada a $1.000: 2.500.000 → 2.417.000", mB.resultado.tipo === "baja" && mB.resultado.monto === 83000 && mB.resultado.nuevoPvc === 2417000);
  const hoyL = dias("2026-10-01", 20).map((fecha, i) => ({ fecha, valor: i < 8 ? 2050000 : 2150000 }));
  const mH = medirCiclo({ ...ciclo, lecturas: hoyL });
  check("medición · como hoy (8 de 20 bajo $2.083.333) no se propone nada; las previas completan bloques", mH.resultado.tipo === null && mH.resultado.aciertosBaja === 8 && medirCiclo({ ...ciclo, lecturas: [...dias("2026-09-21", 7).map((fecha) => ({ fecha, valor: 2600000 })), ...dias("2026-09-28", 13).map((fecha) => ({ fecha, valor: 2600000 }))] }).resultado.tipo === "alza");
  const mig = lee("docs/migraciones/2026-10-07_vigilancia_correccion_pvc.sql");
  check("migración · pvc_correcciones con una por ciclo y por PVC, estados propuesta/aprobada/rechazada/vencida, aviso persistido, sin políticas", ["create table if not exists public.pvc_correcciones", "constraint pvc_correcciones_una_por_ciclo unique (edition_code, ciclo)", "estado in ('propuesta', 'aprobada', 'rechazada', 'vencida')", "aviso_error text", "enable row level security"].every((k) => mig.includes(k)) && !mig.includes("create policy"));
  const vg = lee("src/lib/pvc/vigilancia.ts");
  check("vigilancia · mide el vigente y, en el ciclo 2, el siguiente aparte; una por ciclo (también si se rechazó); el aviso deja su resultado; lo no resuelto vence", vg.includes('if (u.ciclo === 2) {') && vg.includes('relacion: "siguiente"') && vg.includes('.eq("edition_code", m.codigo).eq("ciclo", m.medicion.ciclo)') && vg.includes("aviso_error: env.error") && vg.includes('update({ estado: "vencida"') && vg.includes('.lt("ciclo_hasta", hoy)'));
  const sv = lee("src/lib/pvc/servicio.ts");
  check("aprobar · publica la edición corregida con las mismas entradas y variables (fechas, ciclos, mínimos, calidad, flete) y la anterior queda sustituida", sv.includes("export async function publicarEdicionCorregida(") && sv.includes("calcularConPvc(mv.params as PvcParams, e.inputs as PvcEntradas, input.nuevoPvc)") && sv.includes("flete_por_region: e.flete_por_region,") && sv.includes("ciclo1_hasta: e.ciclo1_hasta,") && sv.includes('status: "corrected"') && sv.includes("correction_of: e.id"));
  const ac = lee("src/lib/pvc/actions.ts");
  check("aprobar y rechazar · el owner, con la clase emite; rechazar pide el motivo", ac.includes("export async function aprobarCorreccionAction(") && ac.includes("export async function rechazarCorreccionAction(") && (ac.match(/requireConsoleWrite\("ecp", "emite"\)/g) ?? []).length >= 2 && ac.includes("Escriba por qué se rechaza"));
  check("firma · una invitación anclada a una edición que se corrigió firma con el PVC corregido (mismo %, mismo flete)", lee("src/lib/ofertas/ventanaDeOferta.ts").includes("offer.pvc_edition_id !== vigente.id && offer.reference_price_source === `PVC ${vigente.code}`"));
  const cron = lee("src/app/api/cron/vigilancia-pvc/route.ts");
  check("cron · /api/cron/vigilancia-pvc a las 11:25 UTC (después del FNC de las 11:10), con CRON_SECRET", lee("vercel.json").includes('"path": "/api/cron/vigilancia-pvc"') && lee("vercel.json").includes('"schedule": "25 11 * * *"') && cron.includes("Bearer ${secret}") && cron.includes("correrVigilancia("));
  const { consolasDeLaTarea, TIPOS_DE_TAREA } = await import("../src/lib/panel/tareas.ts");
  check("Tablero de Ejecución · la propuesta es una tarea de la ECP que lleva a la tarjeta", TIPOS_DE_TAREA.includes("pvc") && consolasDeLaTarea("pvc:correccion:x").includes("ecp") && !consolasDeLaTarea("pvc:correccion:x").includes("ocp") && lee("src/lib/panel/tareasCarga.ts").includes("await propuestasPendientes(service)") && lee("src/lib/panel/tareasCarga.ts").includes('href: "/ecp/pvc#vigilancia"'));
  check("Modelo Económico · Ediciones enseña la vigilancia (lo medido y lo por resolver)", lee("src/components/panel/pvc/EdicionesBoard.tsx").includes("<VigilanciaDeCorreccion estado={vigilancia} />") && lee("src/app/ecp/(app)/pvc/page.tsx").includes("estadoDeLaVigilancia()") && lee("src/components/panel/pvc/VigilanciaDeCorreccion.tsx").includes('id="vigilancia"'));
}

// ── 10. El agente de la edición siguiente (V5.179 · tanda 4 b): insumos FNC medidos, TRM oficial, lo demás ARRASTRADO y marcado;
//     borrador en pvc_editions; informe con búsqueda web que SUGIERE y no aplica; aviso, recordatorios y publicación por el Tablero ──
{
  const ins = await import("../src/lib/pvc/insumos.ts");
  const { FNC_MENSUAL } = await import("../src/lib/pvc/motor.ts");
  check("insumos · los días sin lectura repiten la anterior; los anteriores a la primera no cuentan", JSON.stringify(ins.serieRellenada([{ fecha: "2026-10-01", valor: 100 }, { fecha: "2026-10-03", valor: 300 }], "2026-09-30", "2026-10-04")) === "[100,100,300,300]");
  check("insumos · corte a mitad de mes → los 5 meses completos anteriores (como F4-2026: 4-sep → abr–ago); en los últimos días del mes, ese mes cuenta", ins.mesesDelCorte("2026-09-04").join() === "2026-04,2026-05,2026-06,2026-07,2026-08" && ins.mesesDelCorte("2026-11-16").join() === "2026-06,2026-07,2026-08,2026-09,2026-10" && ins.mesesDelCorte("2026-11-28").at(-1) === "2026-11" && ins.mesesDelCorte("2027-02-15").join() === "2026-09,2026-10,2026-11,2026-12,2027-01");
  const serie = [["2026-04-15", 2100000], ["2026-08-25", 2350000], ["2026-09-04", 2090000], ["2026-09-20", 2030000], ["2026-10-06", 2110000]].map(([fecha, valor]) => ({ fecha, valor }));
  const f4 = ins.insumosDeLaFnc(serie, "2026-09-04");
  const f1 = ins.insumosDeLaFnc(serie, "2026-11-16");
  check("insumos · con el corte de F4-2026 reproducen sus 5 meses oficiales; después, los meses sin cifra oficial salen de la serie diaria", JSON.stringify(f4.fnc) === JSON.stringify(FNC_MENSUAL[2026].slice(3, 8)) && f4.fnc_corte === 2090000 && f1.meses.map((m) => m.fuente).join() === "oficial,oficial,oficial,diaria,diaria" && f1.fnc_corte === 2110000 && f1.fnc_max90 === 2350000 && ins.insumosDeLaFnc([], "2026-11-16") === null);
  const ag = lee("src/lib/pvc/agente.ts");
  check("agente · mide la FNC y la TRM oficial (datos.gov.co); ARRASTRA y marca C strip, diferencial, costo, escalamiento y score; nunca aplica lo que sugiere el informe", ag.includes('export const ARRASTRADAS_SIEMPRE = ["c_strip", "delta", "costo", "escalamiento", "score"] as const;') && ag.includes("datos.gov.co/resource/32sa-8pi3.json") && ag.includes("c_strip: vi.c_strip,") && ag.includes("trm: trm?.valor ?? vi.trm,") && ag.includes('trm: trm ? "trm_oficial" : "arrastrado",') && !/c_strip:\s*informe/.test(ag));
  check("agente · el informe va en dos pasos acotados por el cliente de la casa (investigar: modelo pequeño con búsqueda web · redactar: mediano sin búsqueda), al libro (pvc:agente); sin clave el borrador sale igual", ag.includes("claudeSourced({ model: MODEL_CHEAP,") && ag.includes("webSearch: BUSQUEDAS_MAX, webSearchDirecto: true") && ag.includes("await claude({ model: MODEL_WRITE,") && !/claude\(\{ model: MODEL_WRITE[^}]*webSearch/.test(ag) && ag.includes("superficie: USOS.pvcAgente") && ag.includes("msg === NO_KEY") && lee("src/lib/ai/consumo.ts").includes('pvcAgente: "pvc:agente"'));
  check("agente · un solo borrador vivo por código (el anterior queda sustituido, no se borra); nunca toca una publicada; el aviso deja su resultado", ag.includes('.update({ status: "superseded" }).eq("code", d.codigo).eq("status", "draft")') && ag.includes("ya está publicada: no hay borrador que preparar") && ag.includes("creadoError: env.error") && !ag.includes(".delete("));
  check("agente · el cron espera a la semana 1 del ciclo 2; después solo recuerda el plazo (3 días antes y al vencer)", ag.includes("if (hoy < est.destino.agenteEl) return") && ag.includes("hoy >= sumaDias(plazo, -3)") && ag.includes("if (hoy > plazo && !avisos.vencidoAt)") && lee("vercel.json").includes('"path": "/api/cron/agente-pvc"') && lee("src/app/api/cron/agente-pvc/route.ts").includes("Bearer ${secret}"));
  const mig = lee("docs/migraciones/2026-10-07_agente_pvc.sql");
  check("migración · pvc_editions.agente y un borrador por código (índice único parcial)", mig.includes("add column if not exists agente jsonb") && mig.includes("on public.pvc_editions (code) where status = 'draft'"));
  const sv = lee("src/lib/pvc/servicio.ts");
  check("publicar · la edición nace con sus variables (del borrador, de la que reemplaza o de la última) y sus ciclos ISO; el borrador queda sustituido", sv.includes("ciclo1_hasta: ciclo1, minimos_por_grado: fuenteVars?.minimos_por_grado ?? null") && sv.includes("calendarioPropuesto(trimestreDe(sumaDias(input.entradas.valid_from, 14)))") && sv.includes('.update({ status: "superseded" }).eq("code", input.entradas.codigo).eq("status", "draft")'));
  check("Tablero · `?borrador=` arranca desde el borrador (la publicación sigue siendo una sola, la del Tablero)", lee("src/lib/pvc/tablero.ts").includes("export async function tableroConPuente(borradorId?: string | null)") && lee("src/app/ecp/(app)/pvc/tablero/embed/route.ts").includes('searchParams.get("borrador")') && lee("src/app/ecp/(app)/pvc/tablero/page.tsx").includes("`/ecp/pvc/tablero/embed?borrador=${b}`"));
  const ac = lee("src/lib/pvc/actions.ts");
  check("Ediciones · «Edición siguiente» enseña lo medido, lo arrastrado y el informe; pedirla ya es del owner, con el costo a la vista", ac.includes("export async function prepararBorradorAction(") && ac.includes("Pedir el borrador del agente es una decisión del owner.") && lee("src/components/panel/pvc/EdicionSiguiente.tsx").includes("≈ US$0,15 de IA") && lee("src/components/panel/pvc/EdicionesBoard.tsx").includes("<EdicionSiguiente estado={agente} />"));
  check("Tablero de Ejecución · el borrador por publicar es una tarea de la ECP", lee("src/lib/panel/tareasCarga.ts").includes("key: `pvc:edicion:${ag.destino.codigo}`") && lee("src/lib/panel/tareasCarga.ts").includes('href: "/ecp/pvc#siguiente"'));
}

// ── 11. V5.180 (owner, 2026-10-07: «no quedó ninguna herramienta de análisis de escenarios»): la calculadora va siempre que la
//     ventana esté abierta; sin la existencia del lote se juega igual y solo la decisión espera ──
{
  const tab = lee("src/components/kaffetal-regal/panel/ContratosTab.tsx");
  const calc = lee("src/components/kaffetal-regal/panel/CalculadoraDelTrato.tsx");
  check("KR · la calculadora no depende de la existencia; «Tomar la decisión» sí (y el servidor la exige al aceptar)", tab.includes("puedeDecidir={abierta.existenciaKg != null}") && !/abierta\.existenciaKg != null && \(\s*<CalculadoraDelTrato/.test(tab) && calc.includes("const cumple = decl.ok && acepta && puedeDecidir;") && lee("src/lib/ofertas/producerActions.ts").includes("if (c.existenciaKg == null) return"));
}

// ── 12. V5.181 (owner, 2026-10-07): la existencia del lote es opcional en A2 y OBLIGATORIA al enviar la muestra (se pregunta de
//     nuevo, prellenada, y se corrige); CTCx la registra o corrige en el OCP; un solo escritor fuera de la Ficha ──
{
  const ex = lee("src/lib/kaffetal/existencia.ts");
  const arena = lee("src/lib/arena/producerActions.ts");
  const nom = lee("src/app/ocp/(app)/nominadosActions.ts");
  const ocp = lee("src/app/ocp/(app)/actions.ts");
  const evs = lee("src/components/kaffetal-regal/panel/EvaluacionesTab.tsx");
  check("existencia · un solo escritor (columna + Ficha A2 + auditoría); «5.000» se lee cinco mil", ex.includes("export async function guardarExistencia(") && ex.includes("existencia_cps_kg: String(kg)") && ex.includes('action: "existencia_registrada"') && ex.includes('.replace(/\\./g, "").replace(",", ".")') && lee("src/lib/ofertas/producerActions.ts").includes('guardarExistencia(service, { lotId, kg, porQuien: auth.userId, origen: "productor" })'));
  check("solicitud · el productor no solicita la evaluación sin existencia; la registrada vale y la escrita la corrige", arena.includes("if (existencia == null) return { ok: false, message: EXISTENCIA_REQUERIDA };") && arena.includes('origen: "solicitud"') && evs.includes("disabled={busy || !existenciaOk}") && evs.includes("Existencia total del lote (kg de café pergamino seco) *"));
  check("OCP · postular en nombre del productor también la exige; CTCx la registra o corrige en la vista del lote (emite, con aviso al productor)", nom.includes("if (existencia == null) return { ok: false, error: EXISTENCIA_REQUERIDA };") && ocp.includes("export async function registrarExistenciaOcp(") && ocp.includes('permisoDeEscritura("ocp", "emite")') && ocp.includes("CTCx registró la existencia total de su lote") && lee("src/app/ocp/(app)/kr/LoteSeccion.tsx").includes("<ExistenciaDelLote lotId={lot.id}"));
  check("A2 · la existencia sigue opcional en la Ficha y lo dice", lee("src/components/kaffetal-regal/ficha/panes/PaneA2.tsx").includes("(kg de CPS · opcional aquí)"));
  check("datos · la existencia de los lotes registrados y por evaluar (los del owner y dos estimados), sin pisar lo registrado", ["'0b9c1c04-ae6a-4c83-bfcd-cc466af124de'::uuid, 5000", "'7e360302-e549-4fe7-8f49-4c12ec010a83'::uuid, 15000", "'7aedf5a4-b85d-461b-b552-e8b5ff13947e'::uuid, 700", "and l.existencia_cps_kg is null", "'existencia_registrada'"].every((k) => lee("docs/migraciones/2026-10-07_existencia_de_lotes.sql").includes(k)));
}

// ── 13. V5.182 (owner, 2026-10-07): el ancla de control de la existencia — cada cambio lo guarda la base (inmutable), con su punto
//     de control y quién; el OCP lo califica (notable / abrupto) en la vista del lote y antes de ofertar ──
{
  const ce = await import("../src/lib/kaffetal/controlDeExistencia.ts");
  const c = (fecha, antes, nuevo, origen = "invitacion", prod = null) => ({ fecha, antes, nuevo, origen, produccionEstimadaCps: prod });
  const hoy = ce.controlDeExistencia([c("2026-10-07T13:25:05Z", null, 5000, "sistema"), c("2026-10-07T13:54:20Z", 5000, 2000)]);
  check("control · el caso real: 5.000 → 2.000 desde la invitación es ABRUPTO (−60 %) y el resumen lo dice", hoy.cambios[1].nivel === "abrupto" && Math.round(hoy.cambios[1].cambioPct) === -60 && hoy.nivel === "abrupto" && hoy.alertas === 1 && hoy.actual === 2000 && hoy.primero.nuevo === 5000 && hoy.resumen.includes("primera 5.000 kg, hoy 2.000 kg (-60 %)"));
  check("control · +12 % es normal, +25 % notable, por encima de la producción estimada (A2) +10 % es abrupto, borrarla es notable", ce.evaluarCambio(c("2026-10-01", 4000, 4500), []).nivel === "normal" && ce.evaluarCambio(c("2026-10-01", 4000, 5000), []).nivel === "notable" && ce.evaluarCambio(c("2026-10-01", 4000, 4600, "ficha", 4000), []).nivel === "abrupto" && ce.evaluarCambio(c("2026-10-01", 4000, null), []).nivel === "notable");
  const tres = ce.controlDeExistencia([c("2026-09-01", null, 4000, "ficha"), c("2026-09-05", 4000, 4200), c("2026-09-10", 4200, 4300), c("2026-09-20", 4300, 4400)]);
  check("control · el 3.º cambio en 30 días es notable aunque cada uno sea pequeño", tres.cambios[3].nivel === "notable" && tres.cambios[3].motivos.some((m) => m.includes("3 cambios en 30 días")) && tres.cambios[1].nivel === "normal");
  const mig = lee("docs/migraciones/2026-10-07_historial_de_existencia.sql");
  check("migración · historial append-only (ni el service role edita o borra), sin FK (sobrevive al lote), trigger de lots como único escritor, la sesión del productor queda como «ficha»", ["create table if not exists public.lot_existencia_historial", "before update or delete on public.lot_existencia_historial", "no se edita ni se borra", "create trigger lots_historial_existencia before insert or update on public.lots", "security definer", "if v_rol = 'authenticated' then", "v_origen := 'ficha';", "new.existencia_origen := null;"].every((k) => mig.includes(k)) && !mig.includes("references public.lots"));
  const arr = lee("docs/migraciones/2026-10-07_historial_de_existencia_arranque.sql");
  check("arranque · se rehizo una sola vez con todos los registros en orden y la inmutabilidad se restituyó en la misma migración", arr.includes("disable trigger lot_existencia_historial_inmutable") && arr.includes("enable trigger lot_existencia_historial_inmutable") && arr.indexOf("enable trigger") > arr.indexOf("disable trigger"));
  check("escritor · el servidor anota el punto de control y quién (el trigger los lee y los limpia)", lee("src/lib/kaffetal/existencia.ts").includes("existencia_origen, existencia_por: input.porQuien }"));
  check("OCP · la vista del lote enseña el historial calificado y «Pendiente de Oferta» la existencia con su control", lee("src/app/ocp/(app)/kr/LoteSeccion.tsx").includes("<HistorialDeExistencia control={controlExistencia} quien={quienCambio} />") && lee("src/app/ocp/(app)/ofertas/page.tsx").includes("controlDeExistencia(filas.map(cambioDeFila))") && lee("src/app/ocp/(app)/ofertas/OfertaDesplegable.tsx").includes("⚠ cambio abrupto"));
}

// ── 14. V5.183 (owner, 2026-10-07): «Escenario aleatorio» (cambia en cada clic), «¿Cuándo me pagan?» y lo vendido por BACHES (el
//     productor despacha cada 1–5 semanas, se recomienda 2 o 3; solo si hay compras confirmadas) ──
{
  const sim = await import("../src/lib/trato/simulador.ts");
  const T = await import("../src/lib/trato/terminos.ts");
  const a1 = sim.escenarioAleatorio(13, 42);
  const a1b = sim.escenarioAleatorio(13, 42);
  const a2 = sim.escenarioAleatorio(13, 43);
  check("aleatorio · la misma semilla da el mismo escenario y otra semilla otro; vende 10–100 % y siempre hay alguna semana con ventas", JSON.stringify(a1) === JSON.stringify(a1b) && JSON.stringify(a1) !== JSON.stringify(a2) && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((s) => { const e = sim.escenarioAleatorio(13, s); return e.ventaPct >= 10 && e.ventaPct <= 100 && e.ventaPct % 5 === 0 && e.pesos.length === 13 && e.pesos.some((w) => w > 0); }));
  const v = sim.simularVentasDeVentana({ declaradoKg: 1000, copKg: 20000, semanas: 13, sacoKg: 70, ventaPct: 50, patron: "parejo", fncCargaRef: null, pesos: a1.pesos });
  check("aleatorio · el reparto propio manda sobre el patrón y lo vendido cuadra", Math.abs(v.vendidoKg - 500) < 0.2 && Math.abs(v.porSemana.reduce((s, x) => s + x.kg, 0) - 500) < 0.2 && v.porSemana.filter((x, i) => a1.pesos[i] === 0).every((x) => x.kg === 0));
  const semanas = [0, 50, 0, 50, 50, 0, 0, 0, 0, 0, 0, 100, 0].map((kg, i) => ({ semana: i + 1, kg, cop: kg * 20000 }));
  const p2 = sim.pagosPorBaches({ porSemana: semanas, saco: { kg: 70, cop: 1400000 }, cadencia: 2 });
  const p5 = sim.pagosPorBaches({ porSemana: semanas, saco: { kg: 70, cop: 1400000 }, cadencia: 5 });
  check("pagos · el bache abre con la primera venta confirmada y sale al cierre de la semana de su cadencia; sin ventas no hay envío; 60 % con el tiquete y 40 % la semana siguiente", p2.baches.length === 3 && p2.baches[0].desde === 2 && p2.baches[0].envio === 3 && p2.baches[0].kg === 50 && p2.baches[1].desde === 4 && p2.baches[1].kg === 100 && p2.baches[2].desde === 12 && p2.baches[0].pago60 === 600000 && p2.baches[0].pago40 === 400000 && p2.baches[0].semanaPago40 === 4 && p2.envios === 4 && p2.totalCop === 1400000 + 250 * 20000);
  check("pagos · juntar 5 semanas da menos envíos con el mismo total; la cadencia nunca pasa de 5", p5.baches.length === 2 && p5.baches[0].kg === 150 && p5.baches[0].envio === 6 && p5.totalCop === p2.totalCop && sim.pagosPorBaches({ porSemana: semanas, saco: { kg: 0, cop: 0 }, cadencia: 9 }).cadencia === 5 && T.BACHES_DE_DESPACHO.maxSemanas === 5 && T.BACHES_DE_DESPACHO.recomendadas.join() === "2,3");
  const { clausulasDelContrato } = await import("../src/lib/trato/contrato.ts");
  const txt = clausulasDelContrato({ tipo: "cherry_picked", ventana: { tipo: "ciclo", desde: "2027-02-15", hasta: "2027-04-04", ciclos: ["F1-2027 · ciclo 2"], retiroLibrePct: 25, precio: "vigente" }, sinRetiro: false, sacoKg: 70, esRenovacion: false, minimoKg: 750, calidad: null, flete: null, productorNombre: "Ana Pérez", productorDocumento: null, loteNombre: "L", loteReferencia: "CTC-L-X", grado: "red", copKg: 21000, declaradoKg: 750, lugarEntrega: "Bucaramanga.", termsVersion: "2026-10-07", temporada: null }).map((x) => x.texto).join(" ");
  check("contrato · lo vendido sale por baches que decide el productor (3, 4 o hasta 5 semanas; se recomienda 2 o 3), solo con compras confirmadas", txt.includes("Lo vendido sale por baches, cuando el Productor lo decida y solo si hay compras confirmadas") && txt.includes("juntar 3, 4 o hasta 5 semanas") && txt.includes("se recomienda cada 2 o 3") && txt.includes("al cierre de la 5.ª semana contando la de su primera venta confirmada") && !txt.includes("semana 1 del ciclo siguiente"));
  const vs = lee("src/lib/trato/ventanaServidor.ts");
  check("servidor · la venta va al bache abierto (pendiente y en plazo) o abre uno con plazo de 5 semanas", vs.includes('.gte("plazo", finDeSemana(semana))') && vs.includes("const plazo = plazoDelBache(semana);") && !vs.includes("plazoDeLoVendido"));
  const calc = lee("src/components/kaffetal-regal/panel/CalculadoraDelTrato.tsx");
  check("KR · la calculadora tiene «🎲 Escenario aleatorio» (semilla nueva en cada clic; no toca el % vendido, V5.184) y «💵 ¿Cuándo me pagan?» con la cadencia de baches", calc.includes("🎲 Escenario aleatorio") && calc.includes("setSemilla(Math.floor(Math.random() * 1_000_000_000) + 1);") && !/function otroEscenario\(\) \{[^}]*setVentaPct/.test(calc) && calc.includes("💵 ¿Cuándo me pagan?") && calc.includes("pagosPorBaches({ porSemana: v.porSemana, saco: v.saco, cadencia })") && calc.includes("Solo hay envío —y pago— si hay compras confirmadas."));
}

// ── 15. V5.185 (owner, 2026-10-07): la penalidad del retiro se lee como TOTAL a pagar; se compara con lo ganado de más frente a la
//     FNC; la oferta enseña el precio por carga con el Flete a CTCx entre paréntesis ──
{
  const calc = lee("src/components/kaffetal-regal/panel/CalculadoraDelTrato.tsx");
  const tab = lee("src/components/kaffetal-regal/panel/ContratosTab.tsx");
  check("retiro · «Penalidad total a pagar» con su desglose por cargas, y su peso frente a «Más que vendiendo a la FNC» (lo que queda de ventaja, o si se la come)", calc.includes("Penalidad total a pagar: {formatCop(penalidad)}") && calc.includes("const penalidadSobreVentajaPct = ventajaFnc != null && ventajaFnc > 0 ? (penalidad / ventajaFnc) * 100 : null;") && calc.includes("Aun pagándola, le quedan") && calc.includes("Se come toda la ventaja") && tab.includes("penalidad total a pagar: <b>{formatCop(vista.penalidadCop)}</b>"));
  check("oferta · después del precio por kg, el precio por carga y, entre paréntesis, el Flete a CTCx que incluye", tab.includes("{formatCop(offer.pricePerKg * CARGA_KG)}</b> por carga") && tab.includes("(incluye {formatCop(offer.flete.carga)} de Flete a CTCx)"));
}

if (fallos.length) {
  console.error(`✗ qa-ciclos: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-ciclos: ${ok} comprobaciones OK, 0 fallos`);
