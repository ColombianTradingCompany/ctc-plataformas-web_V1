// QA de lógica pura de F2 (arquetipo + claims derivados) contra la fuente real,
// sin navegador — patrón qa-jornada-check.mjs. Los casos vienen de las notas
// "¿Finca o Lote?" y "Los cuatro arquetipos" (docs/EUDR_RESTRUCTURE_PLAN.md).
// Run: node --experimental-strip-types scripts/qa-claims-check.mjs

import { deriveArchetype, deriveClaims, composicionDeVariedades } from "../src/lib/lotComposition.ts";

let pass = 0;
let fail = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass += 1;
  else {
    fail += 1;
    console.error(`✗ ${name}\n    got:  ${JSON.stringify(got)}\n    want: ${JSON.stringify(want)}`);
  }
  if (ok) console.log(`✓ ${name}`);
}

const finca = (id, name, mun, dep, kg = null, pais = "Colombia") => ({
  fincaId: id, fincaName: name, weightKg: kg, municipio: mun, departamento: dep, pais,
});

// ── Arquetipo: los cuatro escalones de la escalera ──────────────────────────
check("arquetipo · sin aportes", deriveArchetype([]), null);
check("arquetipo · 1 finca = Single Estate",
  deriveArchetype([finca("a", "El Roble", "Piedecuesta", "Santander")]), "single_estate");
check("arquetipo · 2 fincas mismo municipio = Single Origin",
  deriveArchetype([finca("a", "El Roble", "Piedecuesta", "Santander"), finca("b", "La Esperanza", "Piedecuesta", "Santander")]),
  "single_origin");
// V5.99 (owner, 2026-09-30): misma variedad y proceso en varias fincas del mismo departamento = Single Origin Regional; con más
// de una variedad y/o proceso es un blend (Single Estate Blend en una finca; Regional Blend en la región).
check("arquetipo · 2 municipios, 1 depto, una variedad = Single Origin Regional",
  deriveArchetype([finca("a", "El Roble", "Piedecuesta", "Santander"), finca("b", "La Loma", "Socorro", "Santander")]),
  "single_origin_regional");
check("arquetipo · Eje Cafetero cruza deptos y sigue siendo regional (tabla región)",
  deriveArchetype([finca("a", "A", "Manizales", "Caldas"), finca("b", "B", "Armenia", "Quindío")]),
  "single_origin_regional");
const B1 = (...rows) => composicionDeVariedades(rows.map(([name, base, special, pct]) => ({ name, base, special, pct: pct ?? "50" })));
check("composición · dos variedades con el mismo proceso = 2 variedades · 1 proceso", B1(["Caturra", "Lavado"], ["Castillo", "Lavado"]), { variedades: ["caturra", "castillo"], procesos: ["lavado"] });
check("composición · el proceso especial manda sobre el base; una fila con 0 % no cuenta", B1(["Caturra", "Lavado", "Anaeróbico"], ["Geisha", "Natural", "", "0"]), { variedades: ["caturra"], procesos: ["anaeróbico"] });
check("arquetipo · 1 finca con dos variedades = Single Estate Blend",
  deriveArchetype([finca("a", "El Roble", "Piedecuesta", "Santander")], B1(["Caturra", "Lavado"], ["Castillo", "Lavado"])), "single_estate_blend");
check("arquetipo · 1 finca, una variedad con dos procesos = Single Estate Blend",
  deriveArchetype([finca("a", "El Roble", "Piedecuesta", "Santander")], B1(["Caturra", "Lavado"], ["Caturra", "Honey"])), "single_estate_blend");
check("arquetipo · mismo municipio con dos variedades = Regional Blend",
  deriveArchetype([finca("a", "El Roble", "Piedecuesta", "Santander"), finca("b", "La Esperanza", "Piedecuesta", "Santander")], B1(["Caturra", "Lavado"], ["Castillo", "Lavado"])), "regional_blend");
check("arquetipo · mismo depto, una variedad = Single Origin Regional; con dos procesos = Regional Blend",
  [deriveArchetype([finca("a", "A", "Piedecuesta", "Santander"), finca("b", "B", "Socorro", "Santander")], B1(["Caturra", "Lavado"])), deriveArchetype([finca("a", "A", "Piedecuesta", "Santander"), finca("b", "B", "Socorro", "Santander")], B1(["Caturra", "Lavado"], ["Caturra", "Honey"]))],
  ["single_origin_regional", "regional_blend"]);
check("arquetipo · sin composición se asume una variedad (fichas viejas)", deriveArchetype([finca("a", "A", "Piedecuesta", "Santander")], null), "single_estate");
check("arquetipo · Santander + Huila = Multi-Origin",
  deriveArchetype([finca("a", "A", "Piedecuesta", "Santander"), finca("b", "B", "Pitalito", "Huila")]),
  "multiorigin_blend");
check("arquetipo · dos países = Multi-Origin",
  deriveArchetype([finca("a", "A", "Piedecuesta", "Santander"), finca("b", "B", "Loja", "Loja", null, "Ecuador")]),
  "multiorigin_blend");
check("arquetipo · municipio desconocido NO se asume vecino (cae a regional)",
  deriveArchetype([finca("a", "A", "", "Santander"), finca("b", "B", "Piedecuesta", "Santander")]),
  "single_origin_regional");

// ── Claims: la prueba temporal y el fail-closed ─────────────────────────────
const H = { from: "2025-11-15", to: "2026-02-10" }; // cosecha del ejemplo del doc
const RA = (fid, from, to, verified = false) => ({ fincaId: fid, scheme: "intl_rainforest", validFrom: from, validTo: to, verifiedByCtc: verified });

// 1 · Single Estate con cert vigente sobre TODA la cosecha → claim, binario.
{
  const [c] = deriveClaims([finca("a", "El Roble", "Piedecuesta", "Santander", 420)], [RA("a", "2025-04-01", "2026-04-01", true)], H);
  check("claim · single estate vigente ⇒ claim true", c.claim, true);
  check("claim · single estate es binario", c.binary, true);
  check("claim · cobertura 100", c.coveragePct, 100);
  check("claim · fullyVerified con cert verificado", c.fullyVerified, true);
}

// 2 · La prueba es LA COSECHA, no hoy: cert que vence a mitad de la ventana.
{
  const [c] = deriveClaims([finca("a", "El Roble", "Piedecuesta", "Santander", 420)], [RA("a", "2025-04-01", "2026-01-01")], H);
  check("claim · vencido a mitad de cosecha ⇒ sin claim", c.claim, false);
  check("claim · bloqueo nombrado: vencido_en_cosecha", c.blockers, [{ fincaName: "El Roble", reason: "vencido_en_cosecha" }]);
}

// 3 · El ejemplo del diagrama del doc: 420+380 cubiertos, 200 con RA vencida ⇒ 80%.
{
  const contribs = [
    finca("a", "El Roble", "Piedecuesta", "Santander", 420),
    finca("b", "La Esperanza", "Piedecuesta", "Santander", 380),
    finca("c", "Buenavista", "Piedecuesta", "Santander", 200),
  ];
  const certs = [RA("a", "2025-04-01", "2026-04-01"), RA("b", "2025-04-01", "2026-04-01"), RA("c", "2024-01-01", "2026-01-01")];
  const [c] = deriveClaims(contribs, certs, H);
  check("claim · lote mixto ⇒ sin claim (fail closed)", c.claim, false);
  check("claim · cobertura 80% por peso", c.coveragePct, 80);
  check("claim · la finca bloqueante se NOMBRA", c.blockers, [{ fincaName: "Buenavista", reason: "vencido_en_cosecha" }]);
}

// 4 · Cert sin vigencia registrada = "declarado": nunca respalda claims.
{
  const [c] = deriveClaims([finca("a", "El Roble", "Piedecuesta", "Santander", 420)], [RA("a", null, null)], H);
  check("claim · sin vigencia ⇒ sin claim", c.claim, false);
  check("claim · bloqueo: sin_vigencia", c.blockers[0].reason, "sin_vigencia");
}

// 5 · Sin ventana de cosecha no hay prueba temporal posible.
{
  const [c] = deriveClaims([finca("a", "El Roble", "Piedecuesta", "Santander", 420)], [RA("a", "2025-04-01", "2026-04-01")], { from: null, to: null });
  check("claim · sin fechas de cosecha ⇒ sin claim", c.claim, false);
  check("claim · bloqueo: sin_fechas_cosecha", c.blockers[0].reason, "sin_fechas_cosecha");
}

// 6 · Multi-finca sin pesos: si TODAS califican hay claim (100% por construcción);
//     si solo algunas, el % es incognoscible (null) — nunca se inventa.
{
  const contribs = [finca("a", "El Roble", "Piedecuesta", "Santander"), finca("b", "La Esperanza", "Piedecuesta", "Santander")];
  const [full] = deriveClaims(contribs, [RA("a", "2025-04-01", "2026-04-01"), RA("b", "2025-04-01", "2026-04-01")], H);
  check("claim · todas califican sin pesos ⇒ claim true", full.claim, true);
  const [part] = deriveClaims(contribs, [RA("a", "2025-04-01", "2026-04-01")], H);
  check("claim · parcial sin pesos ⇒ % incognoscible (null)", part.coveragePct, null);
  check("claim · parcial sin pesos ⇒ sin claim", part.claim, false);
}

// 7 · Cero certificados: lista vacía — un lote sin sellos voluntarios sigue
//     siendo perfectamente exportable (el EUDR no cuenta stickers).
check("claims · sin certificados ⇒ lista vacía", deriveClaims([finca("a", "El Roble", "Piedecuesta", "Santander", 420)], [], H), []);

// 8 · Un cert que cubre pero SIN verificar: claim sí, fullyVerified no.
{
  const [c] = deriveClaims([finca("a", "El Roble", "Piedecuesta", "Santander", 420)], [RA("a", "2025-04-01", "2026-04-01", false)], H);
  check("claim · declarado (no verificado) ⇒ claim sin fullyVerified", [c.claim, c.fullyVerified], [true, false]);
}

console.log(`\n${pass}/${pass + fail} checks`);
if (fail) process.exit(1);
