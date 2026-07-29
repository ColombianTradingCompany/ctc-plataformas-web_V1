// QA del área derivada del polígono (src/lib/geo/area.ts), sin navegador —
// patrón qa-claims-check.mjs. El área de un cafetal decide si el EUDR exige
// polígono (umbral 4 ha), así que la fórmula tiene que ser correcta cerca de
// esa frontera, no solo "aproximada".
// Run: node --experimental-strip-types scripts/qa-area-check.mjs

import { polygonAreaHa, polygonAreaM2 } from "../src/lib/geo/area.ts";

const lat0 = 6.99; // Piedecuesta, Santander
const lng0 = -73.05;
const dLat = 1000 / 111320; // ~1 km en latitud
const dLng = 1000 / (111320 * Math.cos((lat0 * Math.PI) / 180)); // ~1 km en longitud

/** Rectángulo de (fLat × 1 km) por (fLng × 1 km) anclado en (lat0, lng0). */
const rect = (fLat, fLng) => [
  { lat: lat0, lng: lng0 },
  { lat: lat0 + dLat * fLat, lng: lng0 },
  { lat: lat0 + dLat * fLat, lng: lng0 + dLng * fLng },
  { lat: lat0, lng: lng0 + dLng * fLng },
];

let pass = 0;
let fail = 0;
function check(name, got, want, tol = 0) {
  const ok =
    typeof got === "number" && typeof want === "number" ? Math.abs(got - want) <= tol : got === want;
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? "✓" : "✗"} ${name} → ${got}${ok ? "" : ` (esperado ${want}${tol ? ` ±${tol}` : ""})`}`);
}

check("1 km × 1 km ≈ 100 ha", polygonAreaHa(rect(1, 1)), 100, 0.6);
check("200 m × 100 m ≈ 2 ha", polygonAreaHa(rect(0.1, 0.2)), 2, 0.05);
check("300 m × 170 m ≈ 5,1 ha (cruza el umbral EUDR)", polygonAreaHa(rect(0.3, 0.17)), 5.1, 0.1);
check("justo bajo 4 ha no dispara el umbral", polygonAreaHa(rect(0.2, 0.198)) > 4, false);
check("m² y ha son coherentes", Math.round((polygonAreaM2(rect(1, 1)) / 10000) * 100) / 100, polygonAreaHa(rect(1, 1)));
check("el orden de los vértices no cambia el área", polygonAreaHa([...rect(1, 1)].reverse()), polygonAreaHa(rect(1, 1)));
check("2 vértices no son un polígono", polygonAreaHa([{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }]), null);
check("sin polígono", polygonAreaHa(null), null);
check("vértices repetidos (área 0)", polygonAreaHa([{ lat: 1, lng: 1 }, { lat: 1, lng: 1 }, { lat: 1, lng: 1 }]), null);
check("coordenadas inválidas", polygonAreaHa([{ lat: NaN, lng: 1 }, { lat: 2, lng: 2 }, { lat: 3, lng: 3 }]), null);

console.log(`\n${pass} pasaron, ${fail} fallaron.`);
process.exit(fail === 0 ? 0 : 1);
