// ── CTCx OS · Rondas · los tipos del arquetipo · PURO ────────────────────────
// Una RONDA es una vuelta de contacto con un grupo de Personajes (hoy, productores): a quién se llama (un
// selector sobre los datos de la plataforma), qué le falta a cada uno (los pedidos), qué se le escribe (la
// plantilla del mensaje) y qué se anota cuando contesta (los campos, cada uno con el registro donde se guarda).
// UN solo componente pinta cualquier ronda (`src/components/os/vistas/Ronda.tsx`): una ronda nueva es una
// DEFINICIÓN nueva en `definiciones.ts`, no una pantalla nueva (regla del charter `ctcx-os` y de AGENTS.md).
//
// «Ronda», no «Misión»: en el vocabulario del OS «Misión» ya es un Objetivo de Notion (charter, «El vocabulario»).
// Nada sale solo: el mensaje se abre en WhatsApp con un enlace `wa.me` y la persona lo envía ella misma.

import type { Dominio } from "@/lib/integraciones/dominios";

/** De quién es un campo o un pedido: de UN lote del Personaje, o del Personaje entero. */
export type Nivel = "lote" | "productor";

/** Las secciones de la Ficha Técnica que se leen por PRESENCIA de su dato (lectura aproximada: la Ficha de KR manda). */
export type SeccionDeFicha = "a1" | "a2" | "a3" | "a5" | "b1";

/** Un lote, como lo ve una ronda: solo lo que sus pedidos necesitan. Sin coordenadas, sin el datasheet entero. */
export type LoteDeObjetivo = {
  id: string;
  nombre: string;
  /** `lots.public_code`, el código GUARDADO (V6.23); null si el lote no tiene finca (no tiene código). */
  codigo: string | null;
  etapa: string;
  /** `lots.grade` (id de `GRADOS`), null sin galardón. */
  grado: string | null;
  muestraEnviada: boolean;
  muestraRecibida: boolean;
  existenciaKg: number | null;
  /** El último `ficha_completion_snapshots.completion_pct` del lote (el mismo que ve el productor); null sin registro. */
  fichaPct: number | null;
  /** Qué secciones de la Ficha tienen su dato (por presencia en `lots.datasheet`). */
  fichaSecciones: Record<SeccionDeFicha, boolean>;
  finca: { id: string; nombre: string; codigo: string | null; estado: string; conPoligono: boolean } | null;
};

/** Un Personaje al que se llama en una ronda (hoy, un productor de Kaffetal Regal con lotes). */
export type Objetivo = {
  productorId: string;
  /** `producer_profiles.codigo`, el código GUARDADO; null si no tiene. */
  codigo: string | null;
  nombre: string;
  /** Cómo se le saluda: el primer nombre de la persona (o el nombre entero si solo hay empresa). */
  nombreCorto: string;
  empresa: string | null;
  /** El teléfono tal como está en `profiles.phone` (se normaliza al armar el enlace). */
  telefono: string | null;
  whatsappConfirmado: boolean;
  lotes: LoteDeObjetivo[];
};

export type ResultadoDeContacto = "alcanzado" | "no_contesta" | "volver_a_llamar";
export const RESULTADOS: readonly ResultadoDeContacto[] = ["alcanzado", "no_contesta", "volver_a_llamar"];

/** Un valor anotado: número, texto o fecha ISO (AAAA-MM-DD). */
export type ValorDeCampo = string | number;

/** Lo que se anotó en un contacto: por lote (id → campo → valor) y del productor (campo → valor). */
export type Respuestas = { lotes: Record<string, Record<string, ValorDeCampo>>; productor: Record<string, ValorDeCampo> };

/** Lo que el formulario lleva escrito, en texto crudo (lo convierte `validarEntrada`): por lote y del productor. */
export type ValoresDeLotes = Record<string, Record<string, string>>;
export type ValoresDelProductor = Record<string, string>;
/** Lo que el escritor devolvió como aplicado en su registro dueño (`<loteId>.<campo>` → "ok" o el error). */
export type Aplicadas = Record<string, string>;

/** Una fila de `ronda_contactos` (la bitácora de la ronda), ya leída. */
export type Contacto = {
  id: string;
  productorId: string;
  resultado: ResultadoDeContacto;
  volverEl: string | null;
  nota: string | null;
  respuestas: Respuestas;
  /** Lo que se escribió en el registro dueño por su acción (clave `<loteId>.<campo>` → "ok" o el error). */
  aplicadas: Record<string, string>;
  /** El nombre de quien lo anotó (`profiles.full_name`), o null si no se pudo leer. */
  registradoPor: string | null;
  registradoAt: string;
};

/**
 * Dónde se guarda un campo. Dos caminos, nada más:
 *   · `accion`: la Server Action DUEÑA del registro, con su compuerta (hoy solo `registrarExistenciaOcp`, del OCP). La lista es
 *     cerrada: el escritor de la ronda (`src/app/ocp/(app)/rondasActions.ts`) tiene un caso por nombre y `qa-os-check` R lo exige.
 *   · `contacto`: el dato queda dicho en la bitácora (`ronda_contactos.respuestas`) y lo aplica después su dueño en su pantalla
 *     (`aplicarEn`). Es lo que pasa cuando el registro no tiene todavía un escritor del lado de CTCx, o cuando el dato es una
 *     PROPUESTA y no un hecho (un precio o unos kilos dichos por teléfono nunca cambian un contrato: guardarraíl 8 del charter).
 */
export type Destino =
  | { tipo: "accion"; accion: AccionDeRonda; registro: string }
  | { tipo: "contacto"; registro: "ronda_contactos.respuestas"; aplicarEn: string };

/** Las acciones dueñas que una ronda puede llamar (lista cerrada). */
export const ACCIONES_DE_RONDA = ["registrarExistenciaOcp"] as const;
export type AccionDeRonda = (typeof ACCIONES_DE_RONDA)[number];

export type TipoDeCampo = "numero" | "texto" | "fecha" | "opcion" | "url";

/** Un campo del formulario «Registrar respuesta». Solo datos (viaja al navegador). */
export type Campo = {
  clave: string;
  nivel: Nivel;
  etiqueta: string;
  ayuda?: string;
  tipo: TipoDeCampo;
  opciones?: readonly { valor: string; etiqueta: string }[];
  unidad?: string;
  guarda: Destino;
};

/** Lo que un pedido mira para decidir si aplica y qué dice: el Personaje, el lote (si es de lote) y lo ya anotado en la ronda. */
export type ContextoDePedido = {
  objetivo: Objetivo;
  lote: LoteDeObjetivo | null;
  /** Lo último anotado en esta ronda para ese lote (o para el productor), campo por campo. */
  anotado: Record<string, ValorDeCampo>;
};

/** Un pedido: algo que le falta a un lote (o al productor) y que la ronda pide. */
export type Pedido = {
  clave: string;
  nivel: Nivel;
  titulo: string;
  aplica: (c: ContextoDePedido) => boolean;
  /** Lo que falta en concreto (p. ej. las secciones de la Ficha), en palabras para quien llama. */
  detalle?: (c: ContextoDePedido) => string[];
  /** La línea del mensaje de WhatsApp para este pedido. */
  mensaje: (c: ContextoDePedido) => string;
  /** Los campos del formulario que contestan este pedido (claves de `DefinicionDeRonda.campos`). */
  campos: readonly string[];
  /** Un campo que solo se pregunta en algunos lotes (p. ej. la venta anticipada, solo a los galardonados). */
  camposSi?: (c: ContextoDePedido) => readonly string[];
};

/** Los selectores de Personajes que existen (cada uno tiene su lector en `rondas/lectura.ts`). */
export const SELECTORES = ["productores_con_lotes"] as const;
export type Selector = (typeof SELECTORES)[number];

export type DefinicionDeRonda = {
  slug: string;
  titulo: string;
  /** Para qué es la ronda (una frase). */
  proposito: string;
  /** Por qué importa (una o dos frases). */
  porQue: string;
  /** El edificio de la Hacienda al que pertenece (un hub del Mapa CTC). */
  hub: Dominio;
  quien: { selector: Selector; descripcion: string; filtro?: (o: Objetivo) => boolean };
  pedidos: readonly Pedido[];
  campos: readonly Campo[];
  mensaje: {
    /** El saludo: recibe el nombre del Personaje y el de quien escribe. */
    saludo: (nombre: string, quienEscribe: string) => string;
    cierre: string;
  };
  /** Avisos fijos de la definición que todavía esperan una decisión (se pintan arriba, en su recuadro). */
  pendientes?: readonly string[];
};
