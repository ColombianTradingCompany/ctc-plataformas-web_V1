import {
  RESULTADOS,
  type Campo,
  type Contacto,
  type ContextoDePedido,
  type DefinicionDeRonda,
  type Nivel,
  type Objetivo,
  type Respuestas,
  type ResultadoDeContacto,
  type ValorDeCampo,
  type AccionDeRonda,
} from "./tipos";

// ── CTCx OS · Rondas · el núcleo · PURO ──────────────────────────────────────
// Convierte una definición + los Personajes leídos + la bitácora de la ronda en lo que pinta la vista (`armarRonda`), arma el
// mensaje y el enlace de WhatsApp (`mensajeDe`, `enlaceDeWhatsapp`) y valida lo que llega del formulario (`validarEntrada`, que
// usa TAMBIÉN el escritor del OCP antes de tocar nada). Sin base, sin red, sin «server-only»: `qa-os-check` R lo corre con datos
// inventados. El enlace solo ABRE WhatsApp con el texto escrito: la persona lo lee y lo envía ella misma.

export const NOTA_MAX = 1000;
const TEXTO_MAX = 200;
const ENLACE_MAX = 500;

/** Lo anotado en la ronda para un Personaje, del contacto más viejo al más nuevo (lo nuevo pisa a lo viejo, campo por campo). */
export function anotadoDe(contactos: readonly Contacto[]): Respuestas {
  const out: Respuestas = { lotes: {}, productor: {} };
  const ordenados = [...contactos].sort((a, b) => a.registradoAt.localeCompare(b.registradoAt));
  for (const c of ordenados) {
    for (const [lote, campos] of Object.entries(c.respuestas.lotes ?? {})) out.lotes[lote] = { ...(out.lotes[lote] ?? {}), ...campos };
    out.productor = { ...out.productor, ...(c.respuestas.productor ?? {}) };
  }
  return out;
}

/**
 * El número para `wa.me`: solo dígitos, con el indicativo. Un celular colombiano de 10 dígitos que empieza por 3 recibe el 57;
 * un número que ya trae su indicativo (11 a 15 dígitos) va tal cual. Cualquier otra cosa no da enlace (null): la tarjeta dice
 * que falta el número en vez de inventarlo.
 */
export function normalizarTelefono(telefono: string | null | undefined): string | null {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  if (/^3\d{9}$/.test(digitos)) return `57${digitos}`;
  if (/^\d{11,15}$/.test(digitos)) return digitos;
  return null;
}

/** El enlace que ABRE WhatsApp con el mensaje escrito. No envía nada: quien lo abre pulsa «enviar» si quiere. */
export function enlaceDeWhatsapp(telefono: string | null | undefined, texto: string): string | null {
  const n = normalizarTelefono(telefono);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
}

export type PedidoArmado = { clave: string; titulo: string; detalle: string[] };
export type TarjetaDeLote = {
  id: string;
  nombre: string;
  codigo: string | null;
  etapa: string;
  grado: string | null;
  fichaPct: number | null;
  finca: { nombre: string; codigo: string | null; estado: string } | null;
  pedidos: PedidoArmado[];
  campos: Campo[];
};
export type EstadoDeTarjeta = "sin_contacto" | "volver_a_llamar" | "no_contesta" | "hecho";
export type Tarjeta = {
  productorId: string;
  nombre: string;
  codigo: string | null;
  empresa: string | null;
  telefono: string | null;
  whatsappConfirmado: boolean;
  enlaceWhatsapp: string | null;
  mensaje: string;
  lotes: TarjetaDeLote[];
  pedidosDelProductor: PedidoArmado[];
  camposDelProductor: Campo[];
  /** Cuántos pedidos le quedan (de sus lotes y suyos). */
  pendientes: number;
  estado: EstadoDeTarjeta;
  ultimo: Contacto | null;
  historial: Contacto[];
};
export type LecturaDeContactos = "leidos" | "sin_registro" | "fallo";
export type RondaArmada = {
  slug: string;
  titulo: string;
  proposito: string;
  porQue: string;
  pendientesDeLaDefinicion: string[];
  total: number;
  hechos: number;
  tarjetas: Tarjeta[];
  contactos: LecturaDeContactos;
};

const camposDe = (def: DefinicionDeRonda, claves: readonly string[], nivel: Nivel): Campo[] => {
  const vistos = new Set<string>();
  const out: Campo[] = [];
  for (const k of claves) {
    if (vistos.has(k)) continue;
    const c = def.campos.find((x) => x.clave === k && x.nivel === nivel);
    if (c) {
      vistos.add(k);
      out.push(c);
    }
  }
  return out;
};

/** Los pedidos que aplican a un lote (o al productor), con su detalle y los campos que los contestan. */
function pedidosDe(def: DefinicionDeRonda, nivel: Nivel, ctx: ContextoDePedido) {
  const aplican = def.pedidos.filter((p) => p.nivel === nivel && p.aplica(ctx));
  const pedidos: PedidoArmado[] = aplican.map((p) => ({ clave: p.clave, titulo: p.titulo, detalle: p.detalle?.(ctx) ?? [] }));
  const claves = aplican.flatMap((p) => [...p.campos, ...(p.camposSi?.(ctx) ?? [])]);
  const lineas = aplican.map((p) => p.mensaje(ctx)).filter(Boolean);
  return { pedidos, campos: camposDe(def, claves, nivel), lineas };
}

/** El mensaje de WhatsApp para un Personaje: saludo, cada lote con lo que le falta, lo suyo, y el cierre. Solo lo que aplica. */
export function mensajeDe(def: DefinicionDeRonda, o: Objetivo, anotado: Respuestas, quienEscribe: string): string {
  const partes = [def.mensaje.saludo(o.nombreCorto, quienEscribe)];
  for (const l of o.lotes) {
    const { lineas } = pedidosDe(def, "lote", { objetivo: o, lote: l, anotado: anotado.lotes[l.id] ?? {} });
    if (!lineas.length) continue;
    partes.push([`• ${l.nombre}${l.codigo ? ` (${l.codigo})` : ""}:`, ...lineas.map((x) => `  – ${x}`)].join("\n"));
  }
  const suyo = pedidosDe(def, "productor", { objetivo: o, lote: null, anotado: anotado.productor });
  if (suyo.lineas.length) partes.push(suyo.lineas.map((x) => `• ${x}`).join("\n"));
  partes.push(def.mensaje.cierre);
  return partes.join("\n\n");
}

const ORDEN_DE_ESTADO: Record<EstadoDeTarjeta, number> = { volver_a_llamar: 0, sin_contacto: 1, no_contesta: 2, hecho: 3 };

/**
 * Lo que pinta la vista. Un Personaje está «hecho» cuando su último contacto en esta ronda dice «alcanzado» (se habló con él y
 * se anotó lo que dijo); lo que siga faltando se sigue viendo en su tarjeta. `contactos` = null: la bitácora no se pudo leer.
 */
export function armarRonda(
  def: DefinicionDeRonda,
  objetivos: readonly Objetivo[],
  contactos: readonly Contacto[] | null,
  lectura: LecturaDeContactos,
  quienEscribe: string,
): RondaArmada {
  const elegidos = def.quien.filtro ? objetivos.filter(def.quien.filtro) : [...objetivos];
  const tarjetas: Tarjeta[] = elegidos.map((o) => {
    const historial = (contactos ?? []).filter((c) => c.productorId === o.productorId).sort((a, b) => b.registradoAt.localeCompare(a.registradoAt));
    const anotado = anotadoDe(historial);
    const lotes: TarjetaDeLote[] = o.lotes.map((l) => {
      const { pedidos, campos } = pedidosDe(def, "lote", { objetivo: o, lote: l, anotado: anotado.lotes[l.id] ?? {} });
      return {
        id: l.id,
        nombre: l.nombre,
        codigo: l.codigo,
        etapa: l.etapa,
        grado: l.grado,
        fichaPct: l.fichaPct,
        finca: l.finca ? { nombre: l.finca.nombre, codigo: l.finca.codigo, estado: l.finca.estado } : null,
        pedidos,
        campos,
      };
    });
    const suyo = pedidosDe(def, "productor", { objetivo: o, lote: null, anotado: anotado.productor });
    const ultimo = historial[0] ?? null;
    const estado: EstadoDeTarjeta = !ultimo ? "sin_contacto" : ultimo.resultado === "alcanzado" ? "hecho" : ultimo.resultado;
    const mensaje = mensajeDe(def, o, anotado, quienEscribe);
    return {
      productorId: o.productorId,
      nombre: o.nombre,
      codigo: o.codigo,
      empresa: o.empresa,
      telefono: o.telefono,
      whatsappConfirmado: o.whatsappConfirmado,
      enlaceWhatsapp: enlaceDeWhatsapp(o.telefono, mensaje),
      mensaje,
      lotes,
      pedidosDelProductor: suyo.pedidos,
      camposDelProductor: suyo.campos,
      pendientes: lotes.reduce((n, l) => n + l.pedidos.length, 0) + suyo.pedidos.length,
      estado,
      ultimo,
      historial,
    };
  });
  tarjetas.sort((a, b) => ORDEN_DE_ESTADO[a.estado] - ORDEN_DE_ESTADO[b.estado] || b.pendientes - a.pendientes || a.nombre.localeCompare(b.nombre, "es"));
  return {
    slug: def.slug,
    titulo: def.titulo,
    proposito: def.proposito,
    porQue: def.porQue,
    pendientesDeLaDefinicion: [...(def.pendientes ?? [])],
    total: tarjetas.length,
    hechos: tarjetas.filter((t) => t.estado === "hecho").length,
    tarjetas,
    contactos: lectura,
  };
}

// ── La entrada del formulario y su validación (la usa también el escritor del OCP) ──

/** Lo que manda «Registrar respuesta». Los valores llegan como texto; `validarEntrada` los convierte. */
export type EntradaDeRonda = {
  ronda: string;
  productorId: string;
  resultado: ResultadoDeContacto;
  volverEl?: string | null;
  nota?: string | null;
  lotes?: Record<string, Record<string, string>>;
  productor?: Record<string, string>;
};

/** Una escritura que va por la acción dueña de su registro (no por la bitácora). */
export type EscrituraPorAccion = { loteId: string; campo: string; accion: AccionDeRonda; valor: number };

export type EntradaValidada = {
  ronda: string;
  productorId: string;
  resultado: ResultadoDeContacto;
  volverEl: string | null;
  nota: string | null;
  respuestas: Respuestas;
  porAccion: EscrituraPorAccion[];
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const esFecha = (v: string) => FECHA.test(v) && !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime());

/** Un número escrito como en Colombia («5.000» = cinco mil, la coma es el decimal); null si no es positivo. */
export function numeroDe(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 && n < 1e9 ? n : null;
}

function valorDe(campo: Campo, crudo: string): { ok: true; valor: ValorDeCampo } | { ok: false; error: string } {
  const v = crudo.trim();
  switch (campo.tipo) {
    case "numero": {
      const n = numeroDe(v);
      return n == null ? { ok: false, error: `«${campo.etiqueta}»: escriba un número mayor que cero.` } : { ok: true, valor: n };
    }
    case "fecha":
      return esFecha(v) ? { ok: true, valor: v } : { ok: false, error: `«${campo.etiqueta}»: la fecha no es válida.` };
    case "opcion":
      return campo.opciones?.some((o) => o.valor === v) ? { ok: true, valor: v } : { ok: false, error: `«${campo.etiqueta}»: elija una de las opciones.` };
    case "url":
      return v.length <= ENLACE_MAX ? { ok: true, valor: v } : { ok: false, error: `«${campo.etiqueta}»: es demasiado largo.` };
    case "texto":
      return v.length <= TEXTO_MAX ? { ok: true, valor: v } : { ok: false, error: `«${campo.etiqueta}»: es demasiado largo.` };
  }
}

/**
 * Valida lo que llega del formulario contra la DEFINICIÓN: solo los campos que la ronda declara, de su nivel, con su tipo; solo
 * lotes del productor (`lotesDelProductor`, que el escritor lee de la base); respuestas solo si se le alcanzó; «volver a llamar»
 * con su fecha. Separa lo que va por una acción dueña (`porAccion`) de lo que queda en la bitácora. Nunca lanza.
 */
export function validarEntrada(
  def: DefinicionDeRonda,
  entrada: EntradaDeRonda,
  lotesDelProductor: readonly string[],
): { ok: true; valor: EntradaValidada } | { ok: false; error: string } {
  if (entrada.ronda !== def.slug) return { ok: false, error: "La ronda no coincide." };
  if (!RESULTADOS.includes(entrada.resultado)) return { ok: false, error: "Elija cómo fue el contacto." };
  const volverEl = (entrada.volverEl ?? "").trim() || null;
  if (entrada.resultado === "volver_a_llamar" && (!volverEl || !esFecha(volverEl))) return { ok: false, error: "Escriba cuándo volver a llamar." };
  if (volverEl && !esFecha(volverEl)) return { ok: false, error: "La fecha de volver a llamar no es válida." };
  const nota = (entrada.nota ?? "").trim() || null;
  if (nota && nota.length > NOTA_MAX) return { ok: false, error: "La nota es demasiado larga." };

  const respuestas: Respuestas = { lotes: {}, productor: {} };
  const porAccion: EscrituraPorAccion[] = [];
  const lotesPermitidos = new Set(lotesDelProductor);

  for (const [loteId, campos] of Object.entries(entrada.lotes ?? {})) {
    for (const [clave, crudo] of Object.entries(campos ?? {})) {
      if (typeof crudo !== "string" || !crudo.trim()) continue;
      if (!lotesPermitidos.has(loteId)) return { ok: false, error: "Un lote no es de este productor." };
      const campo = def.campos.find((c) => c.clave === clave && c.nivel === "lote");
      if (!campo) return { ok: false, error: "Un dato no es de esta ronda." };
      const r = valorDe(campo, crudo);
      if (!r.ok) return r;
      if (campo.guarda.tipo === "accion" && typeof r.valor === "number") porAccion.push({ loteId, campo: clave, accion: campo.guarda.accion, valor: r.valor });
      respuestas.lotes[loteId] = { ...(respuestas.lotes[loteId] ?? {}), [clave]: r.valor };
    }
  }
  for (const [clave, crudo] of Object.entries(entrada.productor ?? {})) {
    if (typeof crudo !== "string" || !crudo.trim()) continue;
    const campo = def.campos.find((c) => c.clave === clave && c.nivel === "productor");
    if (!campo) return { ok: false, error: "Un dato no es de esta ronda." };
    if (campo.guarda.tipo === "accion") return { ok: false, error: "Un dato del productor no puede ir por una acción de lote." };
    const r = valorDe(campo, crudo);
    if (!r.ok) return r;
    respuestas.productor[clave] = r.valor;
  }
  const hayRespuestas = Object.keys(respuestas.lotes).length > 0 || Object.keys(respuestas.productor).length > 0;
  if (hayRespuestas && entrada.resultado !== "alcanzado") return { ok: false, error: "Solo se anotan respuestas si se habló con él: marque «Lo alcancé» o borre los datos." };

  return { ok: true, valor: { ronda: def.slug, productorId: entrada.productorId, resultado: entrada.resultado, volverEl, nota, respuestas, porAccion } };
}
