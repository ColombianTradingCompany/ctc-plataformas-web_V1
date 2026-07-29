// ── F2 · Composición del lote: arquetipo y claims DERIVADOS ─────────────────
// (2026-07-29, docs/EUDR_RESTRUCTURE_PLAN.md — de las notas del owner "¿Finca o
// Lote?" y "Los cuatro arquetipos de lote".)
//
// Dos reglas de la casa:
//   1. El ARQUETIPO es un hecho sobre el conjunto de fincas — se calcula, nunca
//      se pregunta. Si alguien discute el valor calculado, lo que está mal es
//      el conjunto de fincas.
//   2. Un CLAIM de esquema vale solo si CADA gramo está cubierto por un
//      certificado vigente EN LA VENTANA DE COSECHA (no hoy) y la custodia
//      preserva identidad. Bajo 100% no se publica claim: se muestra la
//      cobertura y la finca bloqueante (fail closed, el vacío es instrucción).
//
// Módulo PURO a propósito (sin clientes, sin React, sin server-only): las
// mismas reglas corren en el cliente del productor, en las páginas server de
// BCP y en el script de QA (node --experimental-strip-types).

export type Archetype = "single_estate" | "single_origin" | "regional_blend" | "multiorigin_blend";

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  single_estate: "Single Estate",
  single_origin: "Single Origin",
  regional_blend: "Regional Blend",
  multiorigin_blend: "Multi-Origin Blend",
};

export const ARCHETYPE_INFO: Record<Archetype, string> = {
  single_estate:
    "Todo el café proviene de una sola finca registrada: la máxima trazabilidad posible. El lote se conecta 1 a 1 con su origen y su productor.",
  single_origin:
    "Varias fincas vecinas de un mismo municipio o vereda. El perfil expresa el terruño local; el expediente de legalidad se comparte.",
  regional_blend:
    "Mezcla de cafés de un mismo departamento o región cafetera (un solo país). La trazabilidad se lleva por las fincas participantes.",
  multiorigin_blend:
    "Mezcla de varios departamentos o países, construida para un perfil objetivo. Requiere la composición ponderada del blend.",
};

// La región cafetera NO se deriva del departamento (el Eje Cafetero cruza
// Caldas, Quindío y Risaralda). Mapeo mínimo por departamento — suficiente
// mientras el volumen es Single Estate / Single Origin; el mapeo fino
// municipio→región entra cuando existan blends reales (F4 del plan).
const REGION_CAFETERA: Record<string, string> = {
  Caldas: "Eje Cafetero",
  Quindío: "Eje Cafetero",
  Risaralda: "Eje Cafetero",
};

export type ContributionInput = {
  fincaId: string;
  fincaName: string;
  /** null = aporte sin pesar (bloquea la cobertura fraccionaria, no el arquetipo). */
  weightKg: number | null;
  municipio: string; // "" cuando no se conoce
  departamento: string;
  pais: string; // "Colombia" por defecto en los callers
};

/** El arquetipo es un conteo sobre el conjunto de fincas. null = sin aportes. */
export function deriveArchetype(contribs: ContributionInput[]): Archetype | null {
  if (!contribs.length) return null;
  const fincas = new Set(contribs.map((c) => c.fincaId));
  if (fincas.size === 1) return "single_estate";

  const norm = (s: string) => s.trim().toLowerCase();
  const paises = new Set(contribs.map((c) => norm(c.pais || "colombia")));
  if (paises.size > 1) return "multiorigin_blend";

  // Municipio desconocido cuenta como municipio propio (no se puede afirmar
  // que dos fincas son vecinas sin saber dónde están): degrada con honestidad.
  const municipios = new Set(contribs.map((c, i) => (c.municipio.trim() ? `${norm(c.departamento)}·${norm(c.municipio)}` : `?${i}`)));
  if (municipios.size === 1) return "single_origin";

  const deptos = new Set(contribs.map((c, i) => (c.departamento.trim() ? norm(c.departamento) : `?${i}`)));
  if (deptos.size === 1) return "regional_blend";
  const regiones = new Set(
    contribs.map((c, i) => REGION_CAFETERA[c.departamento.trim()] ?? (c.departamento.trim() ? `depto:${norm(c.departamento)}` : `?${i}`))
  );
  if (regiones.size === 1) return "regional_blend";

  return "multiorigin_blend";
}

// ── Claims derivados ────────────────────────────────────────────────────────

// Decisión del owner (2026-07-29): la custodia es un atributo del PROCESO CTC,
// no una pregunta de formulario — el lote se acopia y trilla con identidad
// preservada, nunca se mezcla con café ajeno. Si algún día un flujo mezcla,
// ese flujo declara su excepción; el default del sistema es IP.
export const CUSTODY_MODEL = "identity_preserved" as const;

export type CertInput = {
  fincaId: string;
  scheme: string; // clave del catálogo (certRegistry)
  validFrom: string | null; // "YYYY-MM-DD"
  validTo: string | null;
  verifiedByCtc: boolean;
};

export type HarvestWindow = { from: string | null; to: string | null };

export type ClaimBlockerReason = "sin_certificado" | "sin_vigencia" | "vencido_en_cosecha" | "sin_fechas_cosecha";

export type SchemeClaim = {
  scheme: string;
  /** true solo con el 100% del peso cubierto, vigencia sobre la cosecha y custodia IP. */
  claim: boolean;
  /** 0–100; null cuando hay aportes sin pesar y la cobertura sería parcial. */
  coveragePct: number | null;
  coveredKg: number | null;
  totalKg: number | null;
  /** Cobertura binaria (Single Estate): la UI no muestra porcentajes. */
  binary: boolean;
  blockers: { fincaName: string; reason: ClaimBlockerReason }[];
  /** true si TODOS los certificados que cubren son verified_by_ctc. */
  fullyVerified: boolean;
};

function harvestWithin(h: HarvestWindow, from: string, to: string): boolean {
  if (!h.from || !h.to) return false;
  return h.from >= from && h.to <= to;
}

/** Deriva el claim de cada esquema presente en los certificados de las fincas
 *  aportantes. La prueba es POR APORTE: cada finca del lote debe tener un
 *  certificado del esquema, con vigencia registrada, que cubra la ventana de
 *  cosecha completa. */
export function deriveClaims(contribs: ContributionInput[], certs: CertInput[], harvest: HarvestWindow): SchemeClaim[] {
  if (!contribs.length) return [];
  const schemes = [...new Set(certs.map((c) => c.scheme))].sort();
  const binary = new Set(contribs.map((c) => c.fincaId)).size === 1;
  const weights = contribs.map((c) => c.weightKg);
  const allWeighed = weights.every((w) => w != null && !isNaN(w) && w > 0);
  const totalKg = allWeighed ? (weights as number[]).reduce((a, b) => a + b, 0) : null;
  const noHarvest = !harvest.from || !harvest.to;

  return schemes.map((scheme) => {
    const blockers: SchemeClaim["blockers"] = [];
    let coveredKg = 0;
    let coveredCount = 0;
    let fullyVerified = true;

    for (const c of contribs) {
      const own = certs.filter((x) => x.fincaId === c.fincaId && x.scheme === scheme);
      if (!own.length) {
        blockers.push({ fincaName: c.fincaName, reason: "sin_certificado" });
        continue;
      }
      const dated = own.filter((x) => x.validFrom && x.validTo);
      if (!dated.length) {
        blockers.push({ fincaName: c.fincaName, reason: "sin_vigencia" });
        continue;
      }
      if (noHarvest) {
        blockers.push({ fincaName: c.fincaName, reason: "sin_fechas_cosecha" });
        continue;
      }
      const live = dated.find((x) => harvestWithin(harvest, x.validFrom as string, x.validTo as string));
      if (!live) {
        blockers.push({ fincaName: c.fincaName, reason: "vencido_en_cosecha" });
        continue;
      }
      coveredCount += 1;
      if (c.weightKg != null) coveredKg += c.weightKg;
      if (!live.verifiedByCtc) fullyVerified = false;
    }

    const allCovered = coveredCount === contribs.length;
    const coveragePct = allCovered
      ? 100
      : totalKg != null
        ? Math.round((coveredKg / totalKg) * 100)
        : coveredCount === 0
          ? 0
          : null; // parcial sin pesos: no se puede afirmar un %

    return {
      scheme,
      claim: allCovered, // custodia IP por construcción (CUSTODY_MODEL)
      coveragePct,
      coveredKg: totalKg != null ? coveredKg : null,
      totalKg,
      binary,
      blockers,
      fullyVerified: allCovered && fullyVerified,
    };
  });
}
