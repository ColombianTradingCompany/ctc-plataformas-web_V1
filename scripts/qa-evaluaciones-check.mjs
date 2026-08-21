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
const arena = lee("src/app/ocp/(app)/arenaActions.ts");
const club = lee("src/lib/arena/club.ts");
const producer = lee("src/lib/arena/producerActions.ts");
const evalTab = lee("src/components/kaffetal-regal/panel/EvaluacionesTab.tsx");
const stepper = lee("src/components/kaffetal-regal/LotKanbanStepper.tsx");
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

// ── 3. El Club llega con el galardón, en UN solo sitio ────────────────────
check("el veredicto otorga la membresía", nominados.includes("grantClubMembershipOnce(service, ins.producer_id"));
check("la función vive en lib/arena/club.ts", club.includes("export async function grantClubMembershipOnce("));
check("y respeta una membresía existente", club.includes("if (pp?.club_member_since) return;"));
check("finalizeJornada YA NO la reparte", !arena.includes("club_member_since: new Date().toISOString()"));
check("ni conserva el bloque viejo", !arena.includes("granted_by_arena"));

// ── 4. M3 intacto: solicitar evaluación ES postular ───────────────────────
check("solo un lote Apto puede solicitar", producer.includes('lot.stage !== "apto"') || producer.includes('stage !== "apto"'));
check("la inscripción sigue naciendo en postulacion", producer.includes('"postulacion"'));

// ── 5. Las tres secciones del productor ───────────────────────────────────
for (const s of ["Solicitudes de Evaluación", "Evaluaciones en Fila", "Lotes Galardonados"]) {
  check(`la pestaña pinta «${s}»`, evalTab.includes(s));
}
check("las fases legadas de la Arena no quedan invisibles", evalTab.includes('"arena", "sesion"'));
check("el galardón muestra el sello del grado", evalTab.includes("/images/shared/grados/"));

// ── 6. La escalera canónica: GAL antes que ARE, ARE opcional ──────────────
{
  const gal = stepper.indexOf('chip("GAL"');
  const are = stepper.indexOf('chip("ARE"');
  check("el stepper pinta GAL antes que ARE", gal > -1 && are > -1 && gal < are);
  check("ARE se declara vitrina opcional", stepper.includes("Vitrina de la Arena (opcional"));
}
check("InscriptionPhase conoce galardonado", inscripciones.includes('| "galardonado"'));
check("el modelo del productor también", data.includes('"fila" | "galardonado" | "arena"'));

if (fallos.length) {
  console.error(`✗ qa-evaluaciones: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-evaluaciones: ${ok} comprobaciones OK, 0 fallos`);
