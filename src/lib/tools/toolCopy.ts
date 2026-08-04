import type { ToolId } from "./catalog";

// ── Nombre + descripción de cada herramienta (fuente única) ──────────────────
// Vivía como const local de la página del ECP; con la superficie pública
// Herramientas del Café (V4 · Fase 4) la consumen dos sitios, así que se mudó
// aquí. Kaffetal Regal conserva su propio dict (KR_TOOL_COPY en AppDashboard)
// porque su copy habla EN el contexto del productor, a propósito.
export const TOOL_COPY: Record<ToolId, { name: string; desc: string }> = {
  qr: {
    name: "Generador de códigos QR",
    desc: "Genera QR con la marca CTC para etiquetas, empaques y material impreso. Exporta a PNG y SVG; funciona sin conexión. Se ofrece a productores.",
  },
  agtron: {
    name: "Disco Agtron",
    desc: "Escala de color de tueste: el idioma con el que el comprador y el tostador describen un café. Se ofrece a productores y compradores.",
  },
  "mermas-rapida": {
    name: "Calculadora rápida de mermas",
    desc: "La cuenta del día a día del caficultor: pergamino → verde, con el factor de rendimiento. Funciona sin internet.",
  },
  "mermas-detallada": {
    name: "Calculadora detallada de mermas",
    desc: "La versión completa: defectos, mallas y factor, para cuando hay que sustentar el número.",
  },
  "mermas-ctc": {
    name: "Calculadora de mermas · Café (CTC)",
    desc: "Rendimiento pergamino → verde con la marca CTC; exporta a PDF. Funciona sin conexión. Se ofrece a productores.",
  },
  catacion: {
    name: "Rueda de catación (rueda del sabor)",
    desc: "La rueda del sabor del café, interactiva: para nombrar aromas y sabores en la mesa de catación. Se ofrece a productores.",
  },
  "green-datasheet": {
    name: "Ficha de café verde (datasheet)",
    desc: "La hoja técnica de un lote de café verde, en el formato del comprador. En inglés. Se ofrece a productores.",
  },
  "formula-calidad": {
    name: "La fórmula de calidad del café",
    desc: "El marco de CTC para explicar cómo se compone la calidad de un café. Se ofrece a productores.",
  },
  "viaje-cafe": {
    name: "El viaje del café",
    desc: "El recorrido del café CTC, de la finca al destino, paso a paso. Se ofrece a productores.",
  },
  "cogs-verde": {
    name: "Calculadora CoGS · Café verde",
    desc: "El costo real del café verde, partida por partida, hasta la cotización EXW/FOB/CIF con el precio Fedecafé como pivote. Genera la cotización imprimible.",
  },
};
