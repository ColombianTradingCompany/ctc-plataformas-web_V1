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
  const conAux = precioDeLaEscalera(esc, "red", 0, 50000);
  const sinAux = precioDeLaEscalera(esc, "red", -8, 0);
  check("auxilio · precio del grado = PVC × mult. (con su %) + auxilio, igual para todos los grados", conAux.copCargaFinal === 2550000 && conAux.copKgFinal === 20400 && conAux.auxilioCarga === 50000 && sinAux.copCargaFinal === 2300000 && sinAux.auxilioCarga === 0);
  const mig = lee("docs/migraciones/2026-10-07_ciclos_variables_de_edicion.sql");
  check("migración · variables de la edición, guard del auxilio (se fija una vez), re-fechado de F4-2026 con auditoría, existencia del lote", ["ciclo1_hasta date", "minimos_por_grado jsonb", "rangos_calidad jsonb", "auxilio_transporte_cop integer", "El auxilio de transporte de una edición publicada ya está fijado", "valid_from = '2026-09-28', valid_to = '2027-01-03', ciclo1_hasta = '2026-11-15'", "'refechado_calendario_iso'", "add column if not exists existencia_cps_kg numeric"].every((k) => mig.includes(k)));
  const serv = lee("src/lib/pvc/servicio.ts");
  const act = lee("src/lib/pvc/actions.ts");
  check("Modelo Económico · las variables se leen con la edición, se guardan con auditoría y las fija el owner (validando el calendario)", serv.includes("ciclo1_hasta, minimos_por_grado, rangos_calidad, auxilio_transporte_cop") && serv.includes('action: "variables_de_edicion"') && act.includes("export async function guardarVariablesDeEdicionAction(") && act.includes("validarCalendario({") && act.includes("isPanelOwner(") && lee("src/components/panel/pvc/EdicionesBoard.tsx").includes("<VariablesDeEdicion"));
  const pag = lee("src/app/ocp/(app)/ofertas/page.tsx");
  const ofa = lee("src/app/ocp/(app)/ofertasActions.ts");
  check("OCP · el mínimo de la oferta y el auxilio salen de la edición", pag.includes("minimoDelGrado(grade, edicion.minimosPorGrado)") && pag.includes("edicion.auxilioTransporteCop ?? 0") && ofa.includes("minimoDelGrado(lot.grade, pvc?.edicion.minimosPorGrado)") && serv.includes("edicion.auxilioTransporteCop ?? 0"));
  const a2 = lee("src/components/kaffetal-regal/ficha/panes/PaneA2.tsx");
  check("Ficha A2 · existencia (espejada a lots.existencia_cps_kg), plantas y producción con selector cereza/pergamino", a2.includes("Existencia total del lote") && a2.includes("Número de plantas") && a2.includes("produccionEnLaOtra(") && lee("src/components/kaffetal-regal/KaffetalExperience.tsx").includes("existencia_cps_kg: Number(updates.datasheet.existencia_cps_kg) > 0") && lee("src/components/kaffetal-regal/ficha/fichaData.ts").includes('produccion_unidad: "pergamino"'));
  const plan = lee("docs/PLAN_CICLOS.md");
  check("plan · PLAN_CICLOS manda y lo enlazan el plan del circuito y el del PVC", plan.includes("## 9. Las tandas") && lee("docs/PLAN_CIRCUITO_DEL_LOTE.md").includes("docs/PLAN_CICLOS.md") && lee("docs/PVC_BCP_PLAN.md").includes("docs/PLAN_CICLOS.md"));
}

if (fallos.length) {
  console.error(`✗ qa-ciclos: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-ciclos: ${ok} comprobaciones OK, 0 fallos`);
