// QA del área derivada del polígono (src/lib/geo/area.ts), sin navegador —
// patrón qa-claims-check.mjs. El área de un cafetal decide si el EUDR exige
// polígono (umbral 4 ha), así que la fórmula tiene que ser correcta cerca de
// esa frontera, no solo "aproximada".
// Run: node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-area-check.mjs
// (desde la V5.139 necesita el resolvedor: `referencia.ts` importa a su vecino sin extensión)

import { polygonAreaHa, polygonAreaM2 } from "../src/lib/geo/area.ts";
import { readFileSync } from "node:fs";
import { poligonoEsAdicional, puntoDelPoligono, puntoEsElCentro } from "../src/lib/geo/referencia.ts";

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

// ── V5.139 (owner, 2026-10-02) · con 4 ha o menos el polígono es OPCIONAL, y entonces el punto es su centro ────────────
// «Si una finca tiene menos de las 4 ha pero el productor quiere poner su polígono, esto sea posible. No obstante, en
// este caso se calculará el punto medio geométrico y de este se obtendrá el punto de referencia (el polígono se guarda
// como info adicional cosmética).»
{
  const lee = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const chico = rect(0.1, 0.2); // 2 ha
  const centro = puntoDelPoligono(chico);
  check("el centro de un rectángulo es su mitad (latitud)", Number(centro.lat), lat0 + dLat * 0.05, 1e-6);
  check("el centro de un rectángulo es su mitad (longitud)", Number(centro.lng), lng0 + dLng * 0.1, 1e-6);
  check("el punto se escribe con 6 decimales, como el del GPS", /^-?\d+\.\d{6}$/.test(centro.lat) && /^-?\d+\.\d{6}$/.test(centro.lng), true);
  check("el orden de los vértices no cambia el centro", JSON.stringify(puntoDelPoligono([...chico].reverse())), JSON.stringify(centro));
  // Un cafetal en «L»: el centro GEOMÉTRICO (ponderado por área) no es el promedio de las esquinas.
  const u = 0.001;
  const ele = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]].map(([x, y]) => ({ lat: lat0 + y * u, lng: lng0 + x * u }));
  const cL = puntoDelPoligono(ele);
  check("en una «L» el centro es el geométrico (0,8333), no el promedio de esquinas (1) — latitud", (Number(cL.lat) - lat0) / u, 5 / 6, 0.002);
  check("en una «L» el centro es el geométrico (0,8333), no el promedio de esquinas (1) — longitud", (Number(cL.lng) - lng0) / u, 5 / 6, 0.002);
  check("dos puntos no dan centro", puntoDelPoligono(chico.slice(0, 2)), null);
  check("sin polígono no hay centro", puntoDelPoligono(null), null);
  check("con 4 ha o menos, un polígono es información ADICIONAL", poligonoEsAdicional(false, chico), true);
  check("con más de 4 ha el polígono es la geolocalización, no un adicional", poligonoEsAdicional(true, chico), false);
  check("sin polígono no hay nada adicional", poligonoEsAdicional(false, null) || poligonoEsAdicional(false, chico.slice(0, 2)), false);
  check("el punto guardado se reconoce como el centro", puntoEsElCentro(centro.lat, centro.lng, chico), true);
  check("y un punto marcado a mano en otra parte, no", puntoEsElCentro(lat0, lng0, chico), false);

  const modal = lee("src/components/kaffetal-regal/FincaModal.tsx"), mapa = lee("src/components/kaffetal-regal/FincaMapPicker.tsx");
  const editor = modal.slice(modal.indexOf("function CafetalEditor("), modal.indexOf("function ParcelaCard("));
  check("el editor: al guardar un polígono opcional, el punto pasa a su centro", /const alPoligono = [\s\S]*?if \(necesitaPoligono\) return;[\s\S]*?const centro = puntoDelPoligono\(pts\);\s*if \(centro\) onPoint\(centro\.lat, centro\.lng\);/.test(editor), true);
  check("el editor: con más de 4 ha el punto NO se toca (es el centro que declara el productor)", editor.includes("if (necesitaPoligono) return; //"), true);
  check("el editor: pasar de «sí» a «no» con polígono lo deja como adicional y recentra el punto", /const alResponder = [\s\S]*?const centro = v \? null : puntoDelPoligono\(polygon\);/.test(editor) && !editor.includes("onMayor4ha(true)}") && !editor.includes("onMayor4ha(false)}"), true);
  check("el editor: el mapa recibe `polygonOptional` solo con la respuesta «no» y su guardado pasa por `alPoligono`", editor.includes("polygonOptional={mayor4ha === false && !locked}") && editor.includes("onChangePolygon={alPoligono}"), true);
  check("el editor: los DOS cafetales (el 1 y los adicionales) montan el mismo editor", (modal.match(/<CafetalEditor\b/g) ?? []).length === 2, true);
  check("el editor: avisa cuando el polígono opcional mide más de 4 ha", editor.includes("poligonoAdicional && areaDelPoligono != null && areaDelPoligono > 4"), true);
  check("el editor: dice que el punto es el centro del polígono", editor.includes("centro del polígono ({polygon?.length} vértices, información adicional)"), true);
  check("el editor: un cafetal anterior con el punto marcado a mano ofrece llevarlo al centro (no se le cambia solo)", editor.includes("const puntoFueraDelCentro = poligonoAdicional && !puntoEsElCentro(lat, lng, polygon);") && editor.includes("Usar el centro del polígono") && editor.includes("{puntoFueraDelCentro && !locked && ("), true);
  check("el GPS de «Estoy aquí» no pisa el centro del polígono opcional", /if \(poligonoEsAdicional\(needsPolygon, eudr\.eudrPolygon\)\) \{[\s\S]*?return;\s*\}\s*setGeoBusy\(true\);/.test(modal), true);
  check("el mapa: botón «Dibujar el polígono (opcional)» solo en modo punto", mapa.includes("{!conPoligono && polygonOptional && (") && mapa.includes("＋ Dibujar el polígono (opcional)"), true);
  check("el mapa: con polígono opcional el pin es fijo (no se arrastra)", /\{esOpcional && !drawing && markerPos && \(\s*<Marker position=\{markerPos\} clickable=\{false\}/.test(mapa) && mapa.includes("{!conPoligono && markerPos && <Marker position={markerPos} draggable"), true);
  check("el mapa: un clic no mueve el punto mientras hay polígono", mapa.includes("if (conPoligono) {\n        if (manualMode) return;"), true);
  check("el mapa: ningún modo quedó colgado de `needsPolygon` a secas", /[^n]needsPolygon &&|\(needsPolygon\)/.test(mapa.replace(/conPoligono && !needsPolygon/g, "")), false);

  const dossier = lee("src/components/kaffetal-regal/EudrDossierDoc.tsx"), extras = lee("src/lib/dossierExtras.ts"), ocp = lee("src/app/ocp/(app)/kr/FincaEudrEditor.tsx");
  check("el expediente EUDR presenta el PUNTO y nombra el polígono como información adicional", dossier.includes("el polígono es información adicional") && dossier.includes("poligonoAdicionalDe(p)"), true);
  check("el expediente lee lo que declaró el productor (`requires_polygon`)", extras.includes("requires_polygon") && extras.includes("requierePoligono:"), true);
  check("el OCP rotula el polígono adicional", ocp.includes("poligonoEsAdicional(Number(values.hectares ?? 0) > 4, values.eudr_polygon_geojson)") && ocp.includes("polígono adicional de"), true);
}

console.log(`\n${pass} pasaron, ${fail} fallaron.`);
process.exit(fail === 0 ? 0 : 1);
