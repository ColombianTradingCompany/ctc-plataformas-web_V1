// ── Partner nodes (v3 partner tier) ─────────────────────────────────────────
// Single source of truth for the 5 delegated partner interfaces of the v3
// orchestrated network (reference_html-vision-board/ctc-arquitectura-v3.html).
// Each partner gets a "couple" — public landing + login — at /socios/<slug>
// (subdomain-routed in prod via src/proxy.ts) and a scaffold panel behind
// requirePartner(). Copy and colors come from the vision board's NODES/SCREENS.
// Partners are a SEPARATE identity tier (profiles.role='partner' +
// partner_accounts) — never bcp_admin. See docs/BCP_USER_ADMIN_PLAN.md.

export type PartnerSlug =
  | "centro-calidad"
  | "agente-carga"
  | "agente-nacionalizacion"
  | "master-roaster"
  | "estudio-contenido";

export type PartnerNode = {
  slug: PartnerSlug;
  name: string;
  role: string; // one-line role
  accent: string; // v3 node color
  logo: string; // public path
  what: string; // qué hace
  why: string; // por qué se delega
  sello: string; // the seal it stamps on the lot passport
  screens: [string, string][]; // its module screens (name, desc)
};

export const PARTNERS: Record<PartnerSlug, PartnerNode> = {
  "centro-calidad": {
    slug: "centro-calidad",
    name: "Centro de Calidad",
    role: "Trilla, monitoreo y selección óptica · pergamino → verde",
    accent: "#9AAE5B",
    logo: "/images/socios/centro-calidad.jpg",
    what: "Recibe pergamino, trilla, monitorea humedad y actividad de agua, hace selección óptica y densimétrica, empaca en GrainPro y entrega el verde listo para exportar.",
    why: "Es la última estación del origen: aquí se defiende la calidad que la Arena certificó. Su sello viaja con el lote y responde ante disputa.",
    sello: "merma + humedad + verde liberado",
    screens: [
      ["Lotes en camino", "Qué pergamino llega, de qué finca y con qué grado asignado"],
      ["Orden de trilla", "Prioridad, destino del verde y factor de rendimiento esperado"],
      ["Control de proceso", "Humedad y aw de entrada y salida, merma real, resultado de la óptica"],
      ["Liberación", "Sacos, GrainPro, peso final y acta de entrega al agente de carga"],
    ],
  },
  "agente-carga": {
    slug: "agente-carga",
    name: "Agente de Carga",
    role: "Flete internacional · Colombia → Europa",
    accent: "#3D6FD1",
    logo: "/images/socios/agente-carga.jpg",
    what: "Consolida, reserva espacio, tramita el DEX y la exportación, emite el BL y mueve el contenedor hasta el puerto de destino.",
    why: "Nadie le gana en tarifa a quien consolida volumen de muchos exportadores. La red le trae carga lista, documentada y predecible.",
    sello: "booking + BL + ETA",
    screens: [
      ["Lotes listos", "Verde liberado por el Centro de Calidad, con peso y destino"],
      ["Booking", "Naviera, espacio, fecha de zarpe y consolidación"],
      ["Documentos", "DEX, certificado de origen, BL emitido"],
      ["Tracking", "Posición del contenedor y ETA al puerto de destino"],
    ],
  },
  "agente-nacionalizacion": {
    slug: "agente-nacionalizacion",
    name: "Agente de Nacionalización",
    role: "Aduana en destino · importación en la UE",
    accent: "#9B7BD8",
    logo: "/images/socios/agente-nacionalizacion.jpg",
    what: "Nacionaliza la carga en destino, liquida tributos, gestiona la inspección y libera el contenedor hacia la bodega del Master Roaster.",
    why: "Es licencia, oficio y responsabilidad legal en jurisdicción ajena. CTC aporta el expediente completo — incluida la referencia DDS EUDR — para que el trámite fluya.",
    sello: "nacionalizado + DDS enlazada",
    screens: [
      ["Contenedores en tránsito", "Qué llega, cuándo y con qué documentos"],
      ["Expediente aduanero", "Referencia DDS EUDR aportada por CTC, factura, BL"],
      ["Liquidación", "Tributos, inspección y estado del trámite"],
      ["Liberación", "Orden de retiro hacia la bodega del Master Roaster"],
    ],
  },
  "master-roaster": {
    slug: "master-roaster",
    name: "Master Roaster",
    role: "El pivote de destino · bodega, tueste, empaque, última milla",
    accent: "#C87A3C",
    logo: "/images/socios/master-roaster.jpg",
    what: "Recibe el contenedor, desconsolida por fracciones, almacena el verde, despacha la última milla a los tostadores de Green, y además tuesta, empaca y despacha para Roast y para X.",
    why: "La red le llena la capacidad ociosa con demanda que ya está vendida — no le pide que venda café, le pide que tueste café vendido.",
    sello: "recepción + tueste + despacho",
    screens: [
      ["Contenedor en camino", "Lotes, grados y kg por tostador de destino"],
      ["Bodega", "Stock de verde por lote, humedad, fecha de llegada"],
      ["Desconsolidación y ruta", "Fracciones por tostador, hoja de ruta y tarifa por zona"],
      ["Cola de tueste", "Pedidos de Roast (HORECA) y de X (suscripciones), con perfil de tueste"],
      ["Empaque y despacho", "Bolsa, QR del lote y última milla"],
    ],
  },
  "estudio-contenido": {
    slug: "estudio-contenido",
    name: "Estudio de Contenido",
    role: "La voz de la red · Social Media & Identity Value Creation",
    accent: "#8B6FE0",
    logo: "/images/socios/estudio-contenido.jpg",
    what: "El partner transversal: no toca un solo grano — produce el contenido clásico de los tres frentes, graba y edita la Arena, y pule la media cruda de los productores (Identity Value Creation).",
    why: "CTC no delega la narrativa: delega su producción. La red decide qué historia se cuenta; el Estudio pone el oficio de cámara, edición y ritmo. Máxima lectura narrativa, cero acceso al dinero.",
    sello: "video de Arena + assets del lote",
    screens: [
      ["Cola de producción", "Piezas pedidas por CTC, por estado: brief, rodaje, edición, aprobación, publicado"],
      ["Biblioteca del lote", "Assets ligados a cada pasaporte: clip de Arena, ficha, reel de finca"],
      ["Bandeja de media cruda", "Lo que mandan los productores, listo para editar en Identity Value Creation"],
      ["Calendario de marca", "Parrilla de contenido clásico para los tres frentes de Cherry Picked"],
      ["Manual de marca vivo", "Paleta, tipografía, música y plantillas — para que la voz sea una sola"],
    ],
  },
};

export const PARTNER_SLUGS = Object.keys(PARTNERS) as PartnerSlug[];

export function isPartnerSlug(v: string): v is PartnerSlug {
  return v in PARTNERS;
}
