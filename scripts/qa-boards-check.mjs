// QA de las derivaciones de los tableros BCP (2026-07-20) — ejercita las
// funciones PURAS de src/lib/bcp/producerSegments.ts contra el código real
// (via --experimental-strip-types, como qa-jornada-check.mjs). Correr con:
//   node --experimental-strip-types scripts/qa-boards-check.mjs

// (solo producerSegments: es puro y sin alias @/ — labEvaluation.ts importa la
// aritmética de la Ficha vía @/, que node no resuelve fuera de Next.)
import { segmentProducer, segmentFinca, segmentPostulacion, infoGeneralComplete, DAY_MS } from "../src/lib/bcp/producerSegments.ts";

const NOW = Date.parse("2026-07-20T12:00:00Z");
const daysAgo = (n) => new Date(NOW - n * DAY_MS).toISOString();

let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else {
    failed++;
    console.error(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const base = { infoComplete: false, hasFincas: false, hasEudrRequest: false, processed: false, activeArena: false };

// ── Productores ──
check("nuevo incompleto", segmentProducer({ ...base, joinedAt: daysAgo(3) }, NOW), "nuevos");
check("nuevo completo sigue siendo nuevo", segmentProducer({ ...base, joinedAt: daysAgo(3), infoComplete: true }, NOW), "nuevos");
check("marchitando", segmentProducer({ ...base, joinedAt: daysAgo(10) }, NOW), "marchitando");
check("primíparo (completo, sin arrancar)", segmentProducer({ ...base, joinedAt: daysAgo(10), infoComplete: true }, NOW), "primiparos");
check(
  "en camino (incompleto pero con finca) → primíparo",
  segmentProducer({ ...base, joinedAt: daysAgo(10), hasFincas: true }, NOW),
  "primiparos"
);
check("establecido", segmentProducer({ ...base, joinedAt: daysAgo(10), processed: true }, NOW), "establecidos");
check("activo gana a establecido", segmentProducer({ ...base, joinedAt: daysAgo(10), processed: true, activeArena: true }, NOW), "activos");
check(
  "activo aunque sea reciente",
  segmentProducer({ ...base, joinedAt: daysAgo(2), processed: true, activeArena: true }, NOW),
  "activos"
);

// info general: video y galería NO cuentan
const fullInfo = {
  fullName: "G", companyName: "C", taxId: "1", cedulaCafetera: "2", phone: "3",
  avatarAssetId: "a", country: "Colombia", department: "Santander",
};
check("info completa", infoGeneralComplete(fullInfo), true);
check("info incompleta sin avatar", infoGeneralComplete({ ...fullInfo, avatarAssetId: null }), false);
check("info incompleta con blancos", infoGeneralComplete({ ...fullInfo, taxId: "  " }), false);

// ── Fincas ──
check("finca aprobada", segmentFinca({ status: "approved", createdAt: daysAgo(30), eudrComplete: false }, NOW), "aprobadas");
check("finca rechazada", segmentFinca({ status: "rejected", createdAt: daysAgo(1), eudrComplete: true }, NOW), "no_aprobadas");
check("finca completa (8 días) → en proceso", segmentFinca({ status: "pending_review", createdAt: daysAgo(8), eudrComplete: true }, NOW), "en_proceso");
check("finca nueva incompleta", segmentFinca({ status: "pending_review", createdAt: daysAgo(2), eudrComplete: false }, NOW), "nuevas");
check("finca marchitando", segmentFinca({ status: "pending_review", createdAt: daysAgo(9), eudrComplete: false }, NOW), "marchitando");

// ── Nominados (postulación) ──
check("recién nominado (3 días)", segmentPostulacion({ postulatedAt: daysAgo(3) }, NOW), "recien");
check("embotellado (6 días)", segmentPostulacion({ postulatedAt: daysAgo(6) }, NOW), "embotellados");
check("borde exacto 5 días = recién", segmentPostulacion({ postulatedAt: daysAgo(5) }, NOW), "recien");

// ── Geometría: el punto de referencia de la finca (altura msnm) ──
const { polygonCentroid, fincaReferencePoint } = await import("../src/lib/geo/elevation.ts");

const square = [ { lat: 0, lng: 0 }, { lat: 0, lng: 2 }, { lat: 2, lng: 2 }, { lat: 2, lng: 0 } ];
const c = polygonCentroid(square);
check("centroide de un cuadrado", [ +c.lat.toFixed(6), +c.lng.toFixed(6) ], [ 1, 1 ]);

// Vértices colineales ⇒ área 0 ⇒ cae al promedio simple en vez de dividir por 0
const line = [ { lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 2, lng: 2 } ];
const lc = polygonCentroid(line);
check("colineales caen al promedio", [ +lc.lat.toFixed(6), +lc.lng.toFixed(6) ], [ 1, 1 ]);
check("polígono vacío", polygonCentroid([]), null);

// Con polígono manda el CENTROIDE; sin polígono, el punto registrado.
const withPoly = fincaReferencePoint("9", "9", square);
check("con polígono usa el centroide", [ withPoly.from, +withPoly.point.lat.toFixed(4) ], [ "polygon", 1 ]);
const noPoly = fincaReferencePoint("6.9989", "-73.0499", null);
check("sin polígono usa el punto", [ noPoly.from, +noPoly.point.lat.toFixed(4) ], [ "point", 6.9989 ]);
check("2 vértices no son polígono ⇒ usa el punto", fincaReferencePoint("1", "1", [{lat:0,lng:0},{lat:1,lng:1}]).from, "point");
check("sin geometría no hay punto", fincaReferencePoint(null, null, null), null);
check("0,0 no cuenta como punto", fincaReferencePoint("0", "0", null), null);

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
