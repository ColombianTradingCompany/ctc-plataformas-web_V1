// Guardián de la evaluación por Q-Grader en bache (V5.17).
//
//   node scripts/qa-evaluaciones-check.mjs
//
// V5.17 cambió QUIÉN escribe el grado: ya no la sesión de Arena, sino el
// veredicto del bache de evaluación. Lo que hay que proteger:
//
//   · «El puntaje manda» (regla 1 del owner): el grado se DERIVA con
//     gradoPorPuntaje y NADIE lo digita — si a la firma del veredicto le
//     aparece un parámetro `grade`, alguien reabrió la puerta a mano.
//   · La planilla oficial lleva su procedencia PROPIA (q_grader_batch) — el
//     comprador confía en esa etiqueta; disfrazarla de bcp_arena es mentirle.
//   · La membresía del Club llega con el GALARDÓN y en UN solo sitio
//     (grantClubMembershipOnce); finalizeJornada ya no la reparte.
//   · «Solicitar evaluación» conserva la semántica de postular (M3): solo un
//     lote Apto, y la muestra solo con inscripción — el trigger de la DB no
//     cambió y la UI no debe prometer otra cosa.

import { readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

const nominados = lee("src/app/ocp/(app)/nominadosActions.ts");
const arena = lee("src/app/bcp/(app)/arenaActions.ts");
const producer = lee("src/lib/arena/producerActions.ts");
const evalTab = lee("src/components/kaffetal-regal/panel/EvaluacionesTab.tsx");
const stepper = lee("src/components/kaffetal-regal/LotKanbanStepper.tsx");
// V5.65: la otra superficie del productor donde se nombran Pasaporte y Visa
// (la de Evaluaciones ya está leída arriba como `evalTab`).
const perfil = lee("src/components/kaffetal-regal/panel/PerfilTab.tsx");
const data = lee("src/components/kaffetal-regal/data.ts");
const inscripciones = lee("src/lib/arena/inscriptions.ts");
const cliente = lee("src/app/ocp/(app)/nominados/NominadosClient.tsx");

// ── 1. El puntaje manda: el grado se deriva, jamás se digita ──────────────
check("el veredicto existe (recordEvaluationVerdict)", nominados.includes("export async function recordEvaluationVerdict("));
{
  const firma = nominados.match(/export async function recordEvaluationVerdict\(([\s\S]*?)\): Promise/)?.[1] ?? "";
  check("la firma del veredicto NO acepta un grado", !/\bgrade\b|\bgrado\b\s*:/.test(firma));
}
check("el grado sale de gradoPorPuntaje", nominados.includes("gradoPorPuntaje(puntaje)"));
check("el puntaje pasa por redondeaPuntaje", nominados.includes("redondeaPuntaje(effectiveScore)"));
check("sin puntaje no hay galardón", nominados.includes("Registre una planilla con puntaje SCA"));
check("bajo 80 el camino honesto es «rechazado»", nominados.includes("no hay galardón (mínimo 80)"));
check("el veredicto escribe grade + stage galardonado", nominados.includes('update({ grade: grado.id, stage: "galardonado" })'));
check("la inscripción termina en fase galardonado", nominados.includes('phase: "galardonado", sondeo_result: "aprobado"'));
{
  // La vista previa del OCP también deriva — nunca un <select> de grados.
  check("la UI previsualiza el grado derivado", cliente.includes("gradoPorPuntaje(puntaje)"));
  check("y no ofrece digitar un grado", !/select[^>]*grado/i.test(cliente));
}

// ── 2. La procedencia propia de la planilla ───────────────────────────────
check("la evaluación oficial es q_grader_batch", nominados.includes('source: "q_grader_batch"'));
check("firmada por el Q-Grader del bache", nominados.includes("q_grader_reference: batch.q_grader_name.trim()"));
check("sin Q-Grader definido no se galardona", nominados.includes("Defina el Q-Grader del bache"));
check("el tipo del cliente conoce la procedencia", data.includes('"bcp_arena" | "q_grader_batch" | "producer_claim"'));
check(
  "la Ficha la etiqueta con sus palabras",
  lee("src/components/kaffetal-regal/ficha/fichaPreviewHtml.ts").includes("Evaluación CTC · Q-Grader en bache")
);

// ── 3. V5.77: el Kaffetal Club como membresía se RETIRÓ (PLAN_CIRCUITO_DEL_LOTE §3) ──
// El galardón no reparte nada; firmar y publicar nacen del trato. Si alguien vuelve a colgar una
// membresía del veredicto o un gate del Club de la firma, aquí se ve.
check("el veredicto NO otorga membresía", !nominados.includes("grantClubMembershipOnce") && !nominados.includes("club_member_since"));
check("firmar un contrato NO exige Club", !lee("src/app/ocp/(app)/contractActions.ts").includes("club_member_since"));
check("publicar al catálogo NO exige Club", !lee("src/app/ocp/(app)/catalogActions.ts").includes("club_member_since"));
check("la Arena tampoco reparte membresías", !arena.includes("club_member_since"));

// ── 4. M3 intacto: solicitar evaluación ES postular ───────────────────────
check("solo un lote Apto puede solicitar", producer.includes('lot.stage !== "apto"') || producer.includes('stage !== "apto"'));
check("la inscripción sigue naciendo en postulacion", producer.includes('"postulacion"'));

// ── 5. Las tres secciones del productor ───────────────────────────────────
for (const s of ["Solicitudes de Evaluación", "Evaluaciones en Fila", "Lotes Galardonados"]) {
  check(`la pestaña pinta «${s}»`, evalTab.includes(s));
}
check("las fases legadas de la Arena no quedan invisibles", evalTab.includes('"arena", "sesion"'));
check("el galardón muestra el sello del grado", evalTab.includes("/images/shared/grados/"));

// ── 6. La barra canónica del lote (redibujada en la V5.64) ────────────────
{
  // V5.64/V5.65 (owner, 2026-09-20): la barra son DOS líneas y GAL/ARE ya no
  // existen. Arriba el expediente —FT · FT2 · EUDR · FOTO → VISA—, abajo el
  // tramo comercial —MUE → EVA → GRADO → CONT—.
  //
  // El reparto de nombres quedó ASENTADO por el owner en la V5.65, y es lo que
  // estas comprobaciones protegen (ver la nota de cabecera de `src/lib/eudr.ts`):
  //
  //   · PASAPORTE = de la FINCA (su debida diligencia EUDR).
  //   · VISA      = del LOTE. Se hereda del Pasaporte y es el PRIMER entregable
  //                 de CTCx, gratis: la documentación EUDR no necesita al
  //                 Q-Grader, así que la Visa llega ANTES de la EVA.
  //   · EVA       = «Evaluación de Muestras en Origen»: las muestras van al
  //                 Q-Grader y vuelven con granulometría y perfil sensorial.
  //
  // Antes de esto la finca tenía «Visa», el lote «Sello» y el OCP llamaba «EVA»
  // al veredicto documental. Si alguien vuelve a mezclarlos, aquí se ve.
  const orden = ["FT", "FT2", "EUDR", "FOTO", "VISA", "MUE", "EVA", "GRADO", "CONT"];
  // Un chip con título largo se escribe repartido en varias líneas, así que se
  // busca por expresión regular y no por substring literal.
  const posiciones = orden.map((n) => {
    const re = new RegExp('(label:\\s*|chip\\(\\s*)"' + n + '"');
    const m = re.exec(stepper);
    return m ? m.index : -1;
  });
  check("la barra declara los nueve chips de la V5.64", posiciones.every((i) => i > -1));
  check("y en el orden canónico", posiciones.every((v, i) => i === 0 || v > posiciones[i - 1]));
  check("ni GAL ni ARE siguen en la barra", !stepper.includes('chip("GAL"') && !stepper.includes('chip("ARE"'));
  check("VISA es del LOTE y se hereda del Pasaporte de la finca", /chip\(\s*"VISA"[\s\S]{0,400}?Pasaporte/.test(stepper));
  check("y se dice que es el primer entregable, y gratis", /chip\(\s*"VISA"[\s\S]{0,400}?gratis/.test(stepper));
  check("EVA es la Evaluación de Muestras en Origen", /chip\(\s*"EVA"[\s\S]{0,400}?Evaluación de Muestras en Origen/.test(stepper));
  check("y nombra lo que devuelve el Q-Grader", /chip\(\s*"EVA"[\s\S]{0,400}?Q-Grader/.test(stepper));
  // El reverso: en la superficie del productor la finca ya NO tiene «Visa» ni el
  // lote «Sello». Las dos palabras se movieron de objeto y las dos superficies
  // tienen que decir lo mismo.
  check("la finca dice Pasaporte, no Visa", perfil.includes("Pasaporte EUDR") && !/Visa EUDR de \{f\.name\}/.test(perfil));
  check("el lote dice Visa, no Sello", !/Sello EUDR/.test(perfil) && !/Sello EUDR/.test(evalTab));
  // V5.73: la otra cara — el OCP. Hasta la V5.72 su tabla decía «EVA» por el
  // veredicto documental y «Visa EUDR» por lo de la finca (divergencia declarada
  // en ALINEACION §3 el 2026-09-20). Ahora las dos superficies dicen lo mismo.
  const krTabla = lee("src/app/ocp/(app)/kr/KrTabla.tsx");
  const evaCard = lee("src/app/ocp/(app)/kr/EvaReviewCard.tsx");
  const fincaSec = lee("src/app/ocp/(app)/kr/FincaSeccion.tsx");
  const ocpActions = lee("src/app/ocp/(app)/actions.ts");
  check("la tabla del OCP rotula la finca como Pasaporte EUDR y el veredicto documental como Visa", krTabla.includes('"Pasaporte EUDR"') && krTabla.includes('"Visa"') && !krTabla.includes('"Visa EUDR"') && !krTabla.includes('"EVA"'));
  check("el veredicto del OCP es «Veredicto de Visa»", evaCard.includes("Veredicto de Visa") && !evaCard.includes("Veredicto EVA"));
  check("el OCP no llama Sello a la Visa del lote ni Visa al Pasaporte de la finca", !/Sello EUDR/.test(evaCard) && !/Sello EUDR/.test(ocpActions) && !/Esperando EVA/.test(fincaSec) && !/Visa EUDR de la finca/.test(fincaSec + evaCard));
  // Lo que la V5.62 dejó escrito: el panel del productor IMPORTA el estado del
  // circuito, no lo recalcula. Si alguien vuelve a tejer la lógica a mano aquí,
  // el OCP y el productor empezarán a decir cosas distintas del mismo lote.
  check("la línea comercial sale de estadoDelCircuito()", stepper.includes('from "@/lib/ocp/circuito"') && stepper.includes("estadoDelCircuito({"));
}
check("InscriptionPhase conoce galardonado", inscripciones.includes('| "galardonado"'));
check("el modelo del productor también", data.includes('"fila" | "galardonado" | "arena"'));

// ── 7. V5.77: la Arena es una sesión de SEGUNDA APRECIACIÓN y no toca el circuito ──
// (owner, 2026-09-24, PLAN_CIRCUITO_DEL_LOTE §6): cada apreciación se adjunta al lote como una
// `lot_evaluations` más; el grado lo rige UNA sola (`rige_grado`), por defecto la inicial del Q-Grader.
const acciones = lee("src/app/ocp/(app)/actions.ts");
const evaluations = lee("src/lib/evaluations.ts");
check("la vitrina (invitar · bloquear en sesión) ya no existe", !nominados.includes("inviteLotToArena") && !nominados.includes("assignLotToSession") && !nominados.includes("showcaseGate"));
check("la Arena no crea contratos ni negociaciones", !arena.includes('from("purchase_contracts")') && !arena.includes('from("black_negotiations")'));
check("ni toca la inscripción ni el stage del lote", !arena.includes('from("arena_inscriptions")') && !arena.includes("stage:"));
check("una apreciación es una lot_evaluations bcp_arena aceptada que NO rige", arena.includes('source: "bcp_arena"') && arena.includes('status: "accepted"') && arena.includes("rige_grado: false"));
check("elegir la que rige es lo ÚNICO que reescribe el grado fuera del veredicto", arena.includes("export async function elegirEvaluacionQueRige(") && arena.includes("gradoPorPuntaje(redondeaPuntaje(") && (arena.match(/update\(\{ grade: /g) ?? []).length === 1);
check("y lo hace exclusivo por lote (todas a false, una a true)", arena.includes('.eq("rige_grado", true)') && arena.includes("rige_grado: true"));
check("el oficial del lote sale de la que rige, no de un promedio", evaluations.includes("export function evaluacionQueRige") && !evaluations.includes("function average("));
check("por defecto rige la inicial del Q-Grader", evaluations.includes('e.source === "q_grader_batch"'));
check("confirmar el recibo no escribe fila_arena", !acciones.includes('stage: "fila_arena"'));
check("y avanza la inscripción a la fila", acciones.includes('.eq("phase", "postulacion")'));

if (fallos.length) {
  console.error(`✗ qa-evaluaciones: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-evaluaciones: ${ok} comprobaciones OK, 0 fallos`);
