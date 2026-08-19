// ── Herramientas del Café · quién puede abrir qué ───────────────────────────
// Módulo PURO: la regla, sin base de datos ni sesión. La corre el servidor al
// resolver el catálogo y la comprueba un guardián de QA sin levantar nada — el
// mismo patrón que `grados/definicion.ts` y `panel/navActivo.ts`.
//
// LAS DOS PREGUNTAS, que son distintas y conviene no mezclar:
//
//   1. ¿Esta persona puede usar Herramientas del Café? → `esMiembroHC()`.
//      Decisión A2/A5 del owner: hace falta una cuenta que sea **productor de
//      Kaffetal Regal O comprador de Cherry Picked**. No se crea una tercera
//      identidad, y sigue valiendo la exclusión productor ⊕ comprador que ya
//      impone `identidad/matriz.ts`. La landing `/herramientas` sigue siendo
//      pública: lo que exige cuenta es ABRIR una herramienta.
//
//   2. ¿Puede abrir ESTA herramienta? → `puedeAbrir()`.
//      Las `default` se abren con ser miembro. Las `plus` necesitan además un
//      permiso, y desde V4.33 ese permiso es **por persona y por herramienta**
//      (A6) — antes bastaba una activación por audiencia que abría el paquete
//      entero, lo que vaciaba de sentido tener herramientas «visibles pero
//      bloqueadas para crear deseo».
//
// ⚠️ EL COMODÍN HEREDADO. `tools_plus_grants` (una fila por perfil+audiencia)
// se sigue aceptando como permiso sobre CUALQUIER herramienta Plus, porque hay
// tres personas con ese acceso ya concedido y retirarlo hoy sería quitárselo
// sin avisar. Se migrará a filas por herramienta en una tanda aparte. Mientras
// tanto, `puedeAbrir` dice POR QUÉ se abrió — y ese `via` es lo que permitirá
// saber a quién hay que migrar.

export type NivelHerramienta = "default" | "plus";

/** Lo que la sesión trae ya resuelto desde la base. */
export type ContextoAcceso = {
  /** ¿Hay sesión? Sin cuenta no se abre ninguna herramienta. */
  autenticado: boolean;
  /** Membresías que ya calcula `identidad/matriz.ts`. */
  esProductor: boolean;
  esComprador: boolean;
  /** Experto del Directorio del Café (A8, 2026-08-19): la tercera puerta.
   *  El owner la sumó en la revisión V5.0 — «un login que puede coincidir con
   *  las credenciales del DC y de KR o CP». */
  esDirectorio: boolean;
  /** Permisos por herramienta concedidos a ESTA persona (ids de `tools`). */
  permisosPorHerramienta: readonly string[];
  /** ¿Arrastra el comodín viejo por audiencia? */
  comodinPlusHeredado: boolean;
};

export type Veredicto =
  | { abre: true; via: "default" | "permiso" | "comodin-heredado" }
  | { abre: false; motivo: "sin-cuenta" | "sin-membresia" | "sin-permiso" };

/**
 * ¿Esta identidad es miembro de Herramientas del Café?
 *
 * Productor de KR, comprador de CP **o** experto del Directorio (A8, revisión
 * V5.0). Sigue sin haber una cuarta identidad: son las puertas que ya existen.
 * La exclusión productor ⊕ comprador se mantiene; el DC compone con cualquiera
 * de las dos, así que esto es un O de tres patas sin casos a medias.
 */
export function esMiembroHC(ctx: ContextoAcceso): boolean {
  return ctx.autenticado && (ctx.esProductor || ctx.esComprador || ctx.esDirectorio);
}

/**
 * ¿Puede esta identidad ABRIR esta herramienta?
 *
 * El orden de los rechazos importa para lo que se le enseña a la persona: sin
 * cuenta se le invita a entrar, con cuenta pero sin membresía se le explica que
 * Herramientas es para productores y compradores, y con membresía pero sin
 * permiso se le ofrece «Solicitar». Colapsar los tres en un «no puede» genérico
 * deja al usuario sin saber qué hacer a continuación.
 */
export function puedeAbrir(ctx: ContextoAcceso, herramientaId: string, nivel: NivelHerramienta): Veredicto {
  if (!ctx.autenticado) return { abre: false, motivo: "sin-cuenta" };
  if (!esMiembroHC(ctx)) return { abre: false, motivo: "sin-membresia" };
  if (nivel === "default") return { abre: true, via: "default" };
  if (ctx.permisosPorHerramienta.includes(herramientaId)) return { abre: true, via: "permiso" };
  // El comodín va DESPUÉS del permiso propio a propósito: si alguien tiene las
  // dos cosas, el veredicto debe decir «permiso», que es el camino nuevo. Así
  // el `via` sirve para saber quién sigue dependiendo del legado.
  if (ctx.comodinPlusHeredado) return { abre: true, via: "comodin-heredado" };
  return { abre: false, motivo: "sin-permiso" };
}

/** El texto que ve la persona cuando no puede abrir. Uno por motivo. */
export const MOTIVO_COPY: Record<Exclude<Veredicto, { abre: true }>["motivo"], string> = {
  "sin-cuenta":
    "Entre con su cuenta de Kaffetal Regal, de Cherry Picked o del Directorio del Café para usar las herramientas.",
  "sin-membresia":
    "Herramientas del Café es para productores de Kaffetal Regal, compradores de Cherry Picked y expertos del Directorio del Café. Su cuenta todavía no es ninguna de las tres.",
  "sin-permiso":
    "Esta herramienta se activa por solicitud. Pídala y CTC la habilita en su cuenta.",
};
