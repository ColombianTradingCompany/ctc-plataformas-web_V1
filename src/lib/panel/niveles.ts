// ── Niveles por consola · LA regla ───────────────────────────────────────────
// Módulo PURO (sin red, sin servidor) para que `scripts/qa-niveles-check.mjs`
// pueda comprobarlo sin levantar nada — y contra `docs/BCP_USER_ADMIN_PLAN.md`,
// que es la FUENTE: si el plan y esta tabla dicen cosas distintas, el guardián falla.
//
// POR QUÉ EXISTE (V5.57, 2026-09-19). `panel_users.consoles` guarda desde el
// 2026-07-15 un nivel por consola —"admin" o "viewer"— y durante dos meses
// NINGÚN código lo leyó: `grantedConsoles()` preguntaba solo si la consola
// estaba concedida (`Boolean("viewer")` es tan verdadero como `Boolean("admin")`)
// y las dos compuertas de escritura se conformaban con eso. Un «viewer» podía
// emitir una oferta, adjudicar una subasta o publicar un lote. No falló para
// nadie porque nadie lo intentó; lo destapó una auditoría, no un incidente.
//
// LA DECISIÓN DEL OWNER (2026-09-19, cierra la pregunta abierta n.º 2 del plan):
// dos niveles bastan, pero el de abajo NO es «solo mirar» — es **leer y preparar
// borradores**: crear y editar cosas sin consecuencia externa, y nada que emita,
// publique, cobre o notifique.

export type ConsoleLevel = "admin" | "viewer";

/** Lo que una acción HACE, que es lo que decide quién puede ejecutarla.
 *   · `lectura`  — no cambia nada (listar, cargar, firmar una URL para ver un archivo).
 *   · `borrador` — crea o edita algo INTERNO que nadie fuera de la consola ve, que no
 *                  dispara correo, evento, cobro ni gasto de IA, y que se puede deshacer.
 *   · `emite`    — todo lo demás: cambia lo que ve un productor, comprador, socio o el
 *                  público; mueve dinero; gasta; notifica; concede permisos; borra.
 *  EN CASO DE DUDA ES `emite`: la lista de borradores es una lista BLANCA y corta. */
export type ClaseDeAccion = "lectura" | "borrador" | "emite";

/** Qué clases puede ejecutar cada nivel. */
export const PUEDE: Record<ConsoleLevel, readonly ClaseDeAccion[]> = {
  admin: ["lectura", "borrador", "emite"],
  viewer: ["lectura", "borrador"],
};

/** El nivel CONCEDIDO en una consola, o null si no hay acceso. Un valor que no sea
 *  exactamente "admin" o "viewer" no es un nivel: no se adivina, se niega. */
export function nivelEn(
  consoles: Partial<Record<string, unknown>> | null | undefined,
  consola: string,
): ConsoleLevel | null {
  const v = consoles?.[consola];
  return v === "admin" || v === "viewer" ? v : null;
}

/** ¿Este nivel puede ejecutar una acción de esta clase? Sin nivel, nada. */
export function puede(nivel: ConsoleLevel | null, clase: ClaseDeAccion): boolean {
  return nivel !== null && PUEDE[nivel].includes(clase);
}

/** El rechazo que ve un «viewer»: dice qué pasó y cómo se arregla, y no se disculpa. */
export function mensajeSoloLectura(codigoConsola: string): string {
  return (
    `Tu nivel en ${codigoConsola} es de lectura y borradores: puedes ver todo y preparar borradores, ` +
    `pero esta acción emite, publica, cobra, notifica o borra. Pídele a un administrador de ${codigoConsola} ` +
    `que la ejecute, o al owner que suba tu nivel en BCP · Usuarios y credenciales.`
  );
}

/** Cuando la compuerta no puede distinguir el motivo (devuelve null y el módulo tiene UN mensaje). */
export function mensajeSinPermiso(codigoConsola: string): string {
  return (
    `No se pudo ejecutar: o tu sesión del ${codigoConsola} ya no está activa (vuelve a iniciar sesión), ` +
    `o tu nivel en ${codigoConsola} es de lectura y borradores y esta acción emite, publica, cobra, notifica o borra.`
  );
}
