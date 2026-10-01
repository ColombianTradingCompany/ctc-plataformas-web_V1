// ── Los atributos que CTCx CHEQUEA en la finca, y la solicitud del productor (V5.128, owner 2026-10-01) — PURO ────────
// Las «Áreas de legislación verificadas» y «Sostenibilidad y enfoque social» son material de la PROPIA revisión de CTCx
// (no determinan el Pasaporte: ver `FincaEudrFields` en `lib/eudr.ts`). Hasta la V5.127 el productor leía «no requieren
// acción suya aquí». Desde la V5.128 puede MARCAR y SOLICITAR ese chequeo, con una nota y una imagen por ítem
// (`fincas.eudr_chequeo_solicitudes`), y CTCx deja por ítem su nota (`eudr_atributos_notas`) y su evidencia
// (`eudr_legal_files` · `eudr_sustainability_files`) además de la marca.
// UNA sola lista para Kaffetal Regal y el OCP: las claves son las que ya guardan `eudr_legal_areas` y
// `eudr_sustainability_tags`.

export type GrupoDeAtributo = "legal" | "sost";
export type AtributoDeChequeo = { key: string; label: string; ayuda: string };

/** Art. 2(40) del Reglamento (UE) 2023/1115: la «legislación pertinente del país de producción». */
export const AREAS_DE_LEGISLACION: AtributoDeChequeo[] = [
  { key: "suelo", label: "Uso del suelo y forestal", ayuda: "Que el uso del predio respete el ordenamiento del suelo y las normas forestales: sin cultivo en reservas ni áreas protegidas." },
  { key: "ambiental", label: "Protección ambiental", ayuda: "Manejo de aguas, vertimientos, residuos y agroquímicos conforme a la norma ambiental." },
  { key: "laboral", label: "Laborales y humanos", ayuda: "Derechos laborales y humanos: trabajo digno, sin trabajo infantil ni forzoso." },
  { key: "clpi", label: "CLPI / terceros", ayuda: "Consentimiento libre, previo e informado, y respeto de los derechos de comunidades y terceros sobre la tierra." },
  { key: "fiscal", label: "Fiscal / anticorrupción / aduanas", ayuda: "Obligaciones tributarias, anticorrupción, de comercio y de aduanas al día." },
];

export const SOSTENIBILIDAD_Y_ENFOQUE_SOCIAL: AtributoDeChequeo[] = [
  { key: "sa8000", label: "SA 8000 evaluación voluntaria", ayuda: "Evaluación voluntaria de las condiciones de trabajo bajo el estándar SA 8000." },
  { key: "familiar", label: "Agricultura familiar campesina", ayuda: "La finca la trabaja principalmente la familia." },
  { key: "inclusion", label: "Inclusión de mujeres y jóvenes", ayuda: "Mujeres y jóvenes participan en la producción y en las decisiones de la finca." },
  { key: "paisaje", label: "Conservación de paisajes", ayuda: "Conserva bosque, fuentes de agua o corredores biológicos dentro o alrededor del predio." },
];

export const GRUPOS_DE_ATRIBUTOS: { grupo: GrupoDeAtributo; titulo: string; opciones: AtributoDeChequeo[] }[] = [
  { grupo: "legal", titulo: "Áreas de legislación", opciones: AREAS_DE_LEGISLACION },
  { grupo: "sost", titulo: "Sostenibilidad y enfoque social", opciones: SOSTENIBILIDAD_Y_ENFOQUE_SOCIAL },
];

/** La clave con la que un ítem vive en `eudr_chequeo_solicitudes` y en `eudr_atributos_notas`. */
export const claveDeChequeo = (grupo: GrupoDeAtributo, key: string) => `${grupo}:${key}`;

/** «Legislación · Uso del suelo y forestal» — para la nota que le llega a CTCx. */
export function etiquetaDeChequeo(clave: string): string {
  const [grupo, key] = clave.split(":");
  const g = GRUPOS_DE_ATRIBUTOS.find((x) => x.grupo === grupo);
  const a = g?.opciones.find((o) => o.key === key);
  return a && g ? `${g.grupo === "legal" ? "Legislación" : "Sostenibilidad"} · ${a.label}` : clave;
}

/** Lo que el productor pidió chequear de UN ítem. `at` es cuándo lo pidió por primera vez. */
export type ChequeoSolicitado = { nota: string | null; assetId: string | null; fileName: string | null; at: string };
export type ChequeosSolicitados = Record<string, ChequeoSolicitado>;

/** La imagen que acompaña una solicitud de chequeo: hasta 10 MB, como el adjunto de la solicitud de revisión. */
export const MAX_MB_ADJUNTO_CHEQUEO = 10;

/** Lee `fincas.eudr_chequeo_solicitudes` sin fiarse de su forma (es jsonb escrito desde el navegador del productor). */
export function leerChequeosSolicitados(raw: unknown): ChequeosSolicitados {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ChequeosSolicitados = {};
  for (const [clave, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const x = v as Record<string, unknown>;
    out[clave] = {
      nota: typeof x.nota === "string" && x.nota.trim() ? x.nota : null,
      assetId: typeof x.assetId === "string" ? x.assetId : null,
      fileName: typeof x.fileName === "string" ? x.fileName : null,
      at: typeof x.at === "string" ? x.at : "",
    };
  }
  return out;
}

/** Las claves que el productor pidió y CTCx todavía NO marcó como verificadas: lo que hay por chequear. */
export function chequeosPendientes(
  solicitudes: ChequeosSolicitados,
  legalAreas: string[] | null | undefined,
  sostenibilidad: string[] | null | undefined
): string[] {
  const hechas = new Set([
    ...(legalAreas ?? []).map((k) => claveDeChequeo("legal", k)),
    ...(sostenibilidad ?? []).map((k) => claveDeChequeo("sost", k)),
  ]);
  return Object.keys(solicitudes).filter((clave) => !hechas.has(clave));
}
