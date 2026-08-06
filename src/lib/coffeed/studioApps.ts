// ── Estudio de Contenido · el registro de apps ───────────────────────────────
// Reparto del 2026-08-03 (owner): el Estudio dejó de ser un panel de scaffold y
// pasó a ser un TALLER con varias apps de creación. Todas comparten el mismo
// piso —la identidad de marca que manda el ECP— y todas desembocan en la misma
// cola: `coffeed_deliverables`, que el ECP revisa y publica en Coffeed.
//
// Añadir una app = una entrada aquí + su ruta bajo panel/<id>. El lanzador y el
// encabezado del taller se dibujan solos desde esta lista.

export type StudioAppId = "source-wrapper" | "datawave" | "rt-scriptor" | "identity";

export type StudioApp = {
  id: StudioAppId;
  name: string;
  /** Qué produce, en una línea. */
  tagline: string;
  /** Qué entrega a la cola del ECP. */
  delivers: string;
  accent: string;
  built: boolean;
};

export const STUDIO_APPS: StudioApp[] = [
  {
    id: "source-wrapper",
    name: "Source Wrapper",
    tagline: "Barre los medios de consulta, extrae lo publicado y arma el capítulo en paneles.",
    delivers: "Un carrusel trazado, panel a panel, a su fuente.",
    accent: "#8B6FE0",
    built: true,
  },
  {
    id: "datawave",
    name: "Datawave",
    tagline: "Convierte una serie de datos en un episodio de carrera de barras, listo para grabar.",
    delivers: "Un video vertical, o su enlace ya publicado.",
    accent: "#0E7C86",
    built: true,
  },
  {
    id: "rt-scriptor",
    name: "RT-Scriptor",
    tagline: "Construye un vídeo una toma cada vez: hilos, personajes, escenas y el guion que sale solo.",
    delivers: "El tablero de fotogramas de una escena, con su guion.",
    accent: "#E4472C",
    built: true,
  },
  {
    id: "identity",
    name: "Identity Value Creation",
    tagline: "Sistematiza el contenido de una finca o un lote a partir de su pasaporte.",
    delivers: "La pieza de identidad del productor.",
    accent: "#C87A3C",
    built: false,
  },
];

export function isStudioAppId(v: string): v is StudioAppId {
  return STUDIO_APPS.some((a) => a.id === v);
}

/** El socio dueño del taller. Cualquier otro nodo no ve nada de esto. */
export const STUDIO_PARTNER_SLUG = "estudio-contenido";
