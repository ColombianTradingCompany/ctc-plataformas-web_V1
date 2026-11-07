import { CARGA_KG, MUESTRA_EVALUACION_KG } from "@/lib/trato/terminos";
import type { ContextoDePedido, DefinicionDeRonda, SeccionDeFicha } from "./tipos";

// ── CTCx OS · Rondas · las DEFINICIONES · PURO ───────────────────────────────
// Cada ronda es una entrada de `RONDAS`. Antes de construir una pantalla nueva para recoger datos de productores (o de
// cualquier Personaje), mire si una definición de aquí la cubre; si no, AÑADA una definición (regla del charter `ctcx-os` y de
// AGENTS.md). El componente que las pinta es uno solo (`src/components/os/vistas/Ronda.tsx`) y el escritor es uno solo
// (`src/app/ocp/(app)/rondasActions.ts`, que llama a la acción dueña de cada registro con su compuerta).
//
// Las cifras de negocio NO se escriben aquí (`qa-os-check` B1/B2): la muestra y la carga salen de los términos de la casa
// (`src/lib/trato/terminos.ts`). Los términos A/B de la ronda 1 NO están definidos: van como PENDIENTE y el mensaje no los
// nombra hasta que el owner los escriba (`TERMINOS_AB`).

/**
 * Los términos A/B de la disponibilidad (ronda 1). PENDIENTE: los define el owner. Mientras `definidos` sea false, el mensaje de
 * WhatsApp NO los menciona (nunca se le manda a un productor un texto a medio decidir) y el formulario los muestra con esta marca.
 * Cuando el owner los escriba: el texto de cada uno aquí, `definidos: true`, y `qa-os-check` R deja de exigir la marca.
 */
export const TERMINOS_AB = {
  definidos: false,
  marca: "PENDIENTE: términos A/B — los define el owner",
  a: {
    corto: "A · el café se queda en la bodega del productor",
    texto: "PENDIENTE: términos A/B — los define el owner. (A: el café se queda en la bodega del productor y CTCx busca el mejor negocio bajo los términos A.)",
  },
  b: {
    corto: "B · el café pasa a la bodega de CTCx",
    texto: "PENDIENTE: términos A/B — los define el owner. (B: el café pasa a la bodega de CTCx y CTCx busca el negocio bajo los términos B.)",
  },
} as const;

/** Las secciones de la Ficha que la ronda lee por presencia, en palabras para quien llama y para el productor. */
export const SECCIONES_DE_FICHA: Record<SeccionDeFicha, string> = {
  a1: "A1 · el nombre del producto",
  a2: "A2 · las fincas de origen y su aporte",
  a3: "A3 · la historia o los premios del origen",
  a5: "A5 · la finca de origen registrada",
  b1: "B1 · las variedades y su proceso",
};

const faltanDeLaFicha = (c: ContextoDePedido): string[] =>
  c.lote ? (Object.keys(SECCIONES_DE_FICHA) as SeccionDeFicha[]).filter((k) => !c.lote!.fichaSecciones[k]).map((k) => SECCIONES_DE_FICHA[k]) : [];

const nombreDeLaFinca = (c: ContextoDePedido) => c.lote?.finca?.nombre ?? "";
const esGalardonado = (c: ContextoDePedido) => !!c.lote?.grado;
const anotado = (c: ContextoDePedido, campo: string) => c.anotado[campo] !== undefined && c.anotado[campo] !== "";

/** Ronda 1 · «Completar fichas y disponibilidad» (owner, 2026-11-07). */
const COMPLETAR_FICHAS: DefinicionDeRonda = {
  slug: "completar-fichas",
  titulo: "Completar fichas y disponibilidad",
  proposito: "Llamar a cada productor con lotes para cerrar lo que le falta a cada lote: la muestra, la Ficha, el mapa EUDR de la finca, y cuánto café tiene, a qué precio y en qué términos.",
  porQue:
    "Sin muestra no hay evaluación, sin Ficha ni mapa EUDR el lote no puede ofrecerse en el catálogo, y sin saber cuánto café hay y a qué precio CTCx no puede buscarle negocio.",
  hub: "origen",
  quien: { selector: "productores_con_lotes", descripcion: "Los productores de Kaffetal Regal que tienen al menos un lote." },
  pedidos: [
    {
      clave: "muestra",
      nivel: "lote",
      titulo: "Enviar la muestra",
      aplica: (c) => !!c.lote && !c.lote.muestraRecibida && !anotado(c, "muestra_enviada_el"),
      detalle: (c) => [c.lote?.muestraEnviada ? "Kaffetal Regal dice que la envió; CTCx aún no la recibe." : "CTCx no ha recibido la muestra."],
      mensaje: (c) =>
        c.lote?.muestraEnviada
          ? `Su muestra aparece enviada pero aún no nos llega: ¿me confirma la fecha y por dónde la mandó?`
          : `Enviarnos la muestra de ${MUESTRA_EVALUACION_KG} kg del lote (si ya la envió, ¿me dice la fecha?).`,
      campos: ["muestra_enviada_el"],
    },
    {
      clave: "ficha",
      nivel: "lote",
      titulo: "Completar la Ficha",
      aplica: (c) => !!c.lote && c.lote.etapa === "borrador",
      detalle: (c) => {
        const faltan = faltanDeLaFicha(c);
        return faltan.length ? faltan : ["Las secciones de datos están; falta enviar la Ficha a revisión en Kaffetal Regal."];
      },
      mensaje: (c) => {
        const faltan = faltanDeLaFicha(c);
        return faltan.length
          ? `Completar la Ficha del lote en Kaffetal Regal. Falta: ${faltan.join("; ")}.`
          : "Revisar la Ficha del lote en Kaffetal Regal y enviarla (los datos están, falta enviarla).";
      },
      campos: ["ficha_quien"],
    },
    {
      clave: "mapa_eudr",
      nivel: "lote",
      titulo: "Mapa EUDR de la finca",
      aplica: (c) => !!c.lote && (!c.lote.finca || !c.lote.finca.conPoligono) && !anotado(c, "mapa_enlace"),
      detalle: (c) => [c.lote?.finca ? `La finca ${nombreDeLaFinca(c)} no tiene el polígono EUDR.` : "El lote no tiene finca registrada (sin finca no hay mapa ni código)."],
      mensaje: (c) =>
        c.lote?.finca
          ? `Dibujar en Kaffetal Regal el mapa (el contorno) de la finca ${nombreDeLaFinca(c)}, o mandarme la ubicación o el enlace de Google Earth.`
          : "Registrar en Kaffetal Regal la finca de donde sale este lote, con su mapa.",
      campos: ["mapa_eudr", "mapa_enlace"],
    },
    {
      clave: "disponibilidad",
      nivel: "lote",
      titulo: "Disponibilidad y precio",
      aplica: (c) => !!c.lote && !anotado(c, "precio_cop_kg"),
      detalle: (c) => [
        c.lote?.existenciaKg != null ? "Hay una existencia registrada: confirmar lo disponible." : "Sin existencia registrada.",
        "Precio que pide el productor y términos (A o B).",
        ...(esGalardonado(c) ? ["Galardonado: ¿vendería a CTCx desde ya entre un saco y una carga para los kits de muestras?"] : []),
      ],
      mensaje: (c) =>
        [
          "¿Cuántos kilos de café pergamino seco tiene disponibles de este lote, y qué precio pide por kilo?",
          TERMINOS_AB.definidos ? `¿Prefiere A (${TERMINOS_AB.a.texto}) o B (${TERMINOS_AB.b.texto})?` : "",
          esGalardonado(c) ? `¿Le vendería a CTCx desde ya entre un saco y una carga (${CARGA_KG} kg) de este lote para los kits de muestras?` : "",
        ]
          .filter(Boolean)
          .join(" "),
      campos: ["existencia_kg", "precio_cop_kg", "terminos"],
      camposSi: (c) => (esGalardonado(c) ? ["venta_anticipada", "venta_anticipada_kg"] : []),
    },
    {
      clave: "whatsapp",
      nivel: "productor",
      titulo: "Confirmar su WhatsApp",
      aplica: (c) => !c.objetivo.whatsappConfirmado && !anotado(c, "whatsapp_confirmado"),
      detalle: () => ["Su WhatsApp no está confirmado en Kaffetal Regal."],
      mensaje: () => "¿Me confirma que este es su WhatsApp, para escribirle por aquí?",
      campos: ["whatsapp_confirmado", "whatsapp_otro"],
    },
  ],
  campos: [
    {
      clave: "muestra_enviada_el",
      nivel: "lote",
      etiqueta: "La envió el",
      ayuda: "Solo si dice que ya la envió. La marca de recibida la pone Gestión de Muestras cuando llega.",
      tipo: "fecha",
      guarda: { tipo: "contacto", registro: "ronda_contactos.respuestas", aplicarEn: "/ocp/muestras" },
    },
    {
      clave: "ficha_quien",
      nivel: "lote",
      etiqueta: "La Ficha la completa",
      tipo: "opcion",
      opciones: [
        { valor: "productor", etiqueta: "Él, en Kaffetal Regal" },
        { valor: "ctcx", etiqueta: "CTCx con él (Asistencia a Proveedores)" },
      ],
      guarda: { tipo: "contacto", registro: "ronda_contactos.respuestas", aplicarEn: "/ocp/asistencia" },
    },
    {
      clave: "mapa_eudr",
      nivel: "lote",
      etiqueta: "El mapa",
      tipo: "opcion",
      opciones: [
        { valor: "lo_dibuja", etiqueta: "Lo dibuja él en Kaffetal Regal" },
        { valor: "envia_enlace", etiqueta: "Mandó la ubicación o un enlace" },
      ],
      guarda: { tipo: "contacto", registro: "ronda_contactos.respuestas", aplicarEn: "/ocp/kr" },
    },
    {
      clave: "mapa_enlace",
      nivel: "lote",
      etiqueta: "Enlace o ubicación que mandó",
      ayuda: "Se pega aquí; quien revisa la finca lo pasa al editor EUDR.",
      tipo: "url",
      guarda: { tipo: "contacto", registro: "ronda_contactos.respuestas", aplicarEn: "/ocp/kr" },
    },
    {
      clave: "existencia_kg",
      nivel: "lote",
      etiqueta: "Kilos disponibles",
      unidad: "kg de CPS",
      tipo: "numero",
      guarda: { tipo: "accion", accion: "registrarExistenciaOcp", registro: "lots.existencia_cps_kg" },
    },
    {
      clave: "precio_cop_kg",
      nivel: "lote",
      etiqueta: "Precio que pide",
      unidad: "COP por kg de CPS",
      ayuda: "Queda como propuesta: CTCx lo compara con el PVC y el grado, y lo acepta o pide un ajuste.",
      tipo: "numero",
      guarda: { tipo: "contacto", registro: "ronda_contactos.respuestas", aplicarEn: "/ocp/ofertas" },
    },
    {
      clave: "terminos",
      nivel: "lote",
      etiqueta: "Términos",
      ayuda: TERMINOS_AB.definidos ? undefined : TERMINOS_AB.marca,
      tipo: "opcion",
      opciones: [
        { valor: "a", etiqueta: TERMINOS_AB.a.corto },
        { valor: "b", etiqueta: TERMINOS_AB.b.corto },
        { valor: "sin_decidir", etiqueta: "No decide todavía" },
      ],
      guarda: { tipo: "contacto", registro: "ronda_contactos.respuestas", aplicarEn: "/ocp/ofertas" },
    },
    {
      clave: "venta_anticipada",
      nivel: "lote",
      etiqueta: "¿Vende desde ya para kits de muestras?",
      tipo: "opcion",
      opciones: [
        { valor: "si", etiqueta: "Sí" },
        { valor: "no", etiqueta: "No" },
      ],
      guarda: { tipo: "contacto", registro: "ronda_contactos.respuestas", aplicarEn: "/ocp/compras" },
    },
    {
      clave: "venta_anticipada_kg",
      nivel: "lote",
      etiqueta: "¿Cuántos kilos?",
      unidad: "kg de CPS (entre un saco y una carga)",
      tipo: "numero",
      guarda: { tipo: "contacto", registro: "ronda_contactos.respuestas", aplicarEn: "/ocp/compras" },
    },
    {
      clave: "whatsapp_confirmado",
      nivel: "productor",
      etiqueta: "¿Este es su WhatsApp?",
      tipo: "opcion",
      opciones: [
        { valor: "si", etiqueta: "Sí, es este" },
        { valor: "otro", etiqueta: "No, dio otro número" },
      ],
      guarda: { tipo: "contacto", registro: "ronda_contactos.respuestas", aplicarEn: "/ocp/kr" },
    },
    {
      clave: "whatsapp_otro",
      nivel: "productor",
      etiqueta: "El otro número",
      tipo: "texto",
      guarda: { tipo: "contacto", registro: "ronda_contactos.respuestas", aplicarEn: "/ocp/kr" },
    },
  ],
  mensaje: {
    saludo: (nombre, quienEscribe) => `Hola ${nombre}, le saluda ${quienEscribe} de CTCx. Le escribo por sus lotes en Kaffetal Regal; nos ayudaría con esto:`,
    cierre: "Me puede contestar por aquí cuando pueda. ¡Gracias!",
  },
  pendientes: [TERMINOS_AB.marca],
};

/** Todas las rondas. El orden es el de la lista de `/os/m/rondas`. */
export const RONDAS: readonly DefinicionDeRonda[] = [COMPLETAR_FICHAS];

export function rondaPorSlug(slug: string): DefinicionDeRonda | null {
  return RONDAS.find((r) => r.slug === slug) ?? null;
}
