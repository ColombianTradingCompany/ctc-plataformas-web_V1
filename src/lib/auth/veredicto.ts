// ── La política de «Recuperar acceso», en un módulo PURO ────────────────────
// (V5.12) Misma razón que `navActivo.ts` o `etapaComprador.ts`: la decisión
// vive detrás de un formulario que manda correos de verdad y toca contraseñas
// de verdad, así que no se puede ensayar a mano una y otra vez. Aquí no hay
// Supabase ni red — entran HECHOS y sale un VEREDICTO —, y el guardián
// `scripts/qa-recuperacion-check.mjs` los recorre todos sin levantar nada.
//
// La regla de fondo la fijó el owner el 2026-08-20: **la pantalla dice la
// verdad**. Si el correo no existe, se dice; si esa cuenta entra con Google, se
// dice. El motivo es el usuario real de esta red: un caficultor que teclea mal
// su correo tiene que enterarse en dos segundos, no quedarse esperando un
// mensaje que no va a llegar nunca. La base ya tiene el caso —
// `ete0109@yahoo.com` conviviendo con `etel0109@yahoo.com` — y con el mensaje
// genérico de «si existe, te llegará» ese error es invisible para siempre.
// El precio aceptado a cambio: se puede sondear si un correo está registrado.

/** Lo que `buscar_identidad_para_recuperacion()` sabe de un correo. */
export type HechosIdentidad = {
  profileId: string;
  /** El correo tal y como está en `auth.users` (ya normalizado por el registro). */
  correo: string;
  confirmado: boolean;
  tienePassword: boolean;
  tieneGoogle: boolean;
  rol: string | null;
  panelStatus: string | null;
  panelDelivery: string | null;
  socioStatus: string | null;
  socioDelivery: string | null;
  socioNodo: string | null;
};

export type Veredicto =
  /** Ni siquiera es un correo. Se corta antes de tocar la base. */
  | { estado: "correo-invalido" }
  /** No hay cuenta con ese correo — el caso del dedo, y el más frecuente. */
  | { estado: "sin-cuenta" }
  /** Existe, pero nunca tuvo contraseña: entró con Google y ahí sigue su puerta. */
  | { estado: "solo-google" }
  /** Existe y tiene contraseña, pero su credencial está suspendida. */
  | { estado: "bloqueada"; motivo: string }
  /** Adelante: hay a quién y a dónde escribirle. */
  | {
      estado: "puede-enviarse";
      profileId: string;
      correo: string;
      /** A dónde va DE VERDAD el vale (puede no ser el correo tecleado). */
      destino: string;
      /** El destino difiere del correo de acceso: hay que decírselo. */
      destinoDistinto: boolean;
      /** Nunca confirmó su correo; al usar el vale queda confirmado de paso. */
      sinConfirmar: boolean;
    };

const FORMA_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Un correo se compara SIEMPRE en minúsculas y sin espacios: es como lo guarda
 *  GoTrue y como lo teclea la gente en un móvil (con mayúscula automática). */
export function normalizarCorreo(crudo: string): string {
  return crudo.trim().toLowerCase();
}

export function esCorreoPlausible(crudo: string): boolean {
  const c = normalizarCorreo(crudo);
  return c.length > 0 && c.length <= 254 && FORMA_CORREO.test(c);
}

/**
 * A dónde se envía el vale.
 *
 * ⚠️ NO siempre es el correo con el que se entra, y esta es la trampa que
 * hundiría el flujo de Supabase: tres usuarios de la casa
 * (`gvb@ctcexport.com`, `gvg@ctcexport.com`, `gvg-estudiocontenido@ctcexport.com`)
 * son ETIQUETAS DE ACCESO SIN BUZÓN. Mandarles el enlace a su propio usuario
 * sería mandarlo a un agujero: se quedan fuera para siempre, y del lado de CTC
 * no falla nada visible. Por eso `panel_users` y `partner_accounts` guardan un
 * `delivery_email`, y por eso manda ese campo cuando existe.
 */
export function destinoDe(h: HechosIdentidad): string {
  return h.panelDelivery || h.socioDelivery || h.correo;
}

/** ¿Está suspendida esta credencial? Un socio dado de baja no puede reactivarse
 *  solo pidiendo una contraseña nueva — eso convertiría la baja en un trámite. */
function suspension(h: HechosIdentidad): string | null {
  if (h.panelStatus === "suspended") {
    return "Tu credencial de la CTC Web Platform está suspendida. Escríbenos y el equipo la revisa.";
  }
  if (h.socioStatus === "suspended") {
    return "La credencial de este nodo de la Red de Socios está suspendida. Escríbenos y el equipo la revisa.";
  }
  return null;
}

/**
 * El veredicto. `hechos` es `null` cuando la base no encontró el correo.
 *
 * El ORDEN importa y no es arbitrario:
 *   1. forma del correo — antes de gastar una consulta;
 *   2. existencia — la respuesta más útil de todas;
 *   3. suspensión — antes que Google, porque un socio suspendido con cuenta de
 *      Google tiene que oír que está suspendido, no que pruebe con Google;
 *   4. solo-Google — no hay contraseña que recuperar, hay una puerta que señalar.
 */
export function decidir(crudo: string, hechos: HechosIdentidad | null): Veredicto {
  if (!esCorreoPlausible(crudo)) return { estado: "correo-invalido" };
  if (!hechos) return { estado: "sin-cuenta" };

  const motivo = suspension(hechos);
  if (motivo) return { estado: "bloqueada", motivo };

  if (!hechos.tienePassword) {
    if (hechos.tieneGoogle) return { estado: "solo-google" };
    // Ni contraseña ni Google. No debería existir, pero si existiera, un vale
    // es justo lo que necesita: es la única forma de estrenar una contraseña.
  }

  const destino = destinoDe(hechos);
  return {
    estado: "puede-enviarse",
    profileId: hechos.profileId,
    correo: hechos.correo,
    destino,
    destinoDistinto: normalizarCorreo(destino) !== normalizarCorreo(hechos.correo),
    sinConfirmar: !hechos.confirmado,
  };
}

/**
 * Enmascara un correo para enseñarlo en pantalla: `gabriel.vasquez92@gmail.com`
 * → `ga••••••••••92@gmail.com`.
 *
 * Se usa SOLO para el destino cuando difiere del correo tecleado. La política
 * es decir la verdad sobre la cuenta que la persona escribió — no revelar un
 * buzón personal distinto que quizá no conoce. Que sepa que salió, y hacia
 * dónde lo suficiente para reconocerlo; no lo suficiente para copiárselo.
 */
export function enmascararCorreo(correo: string): string {
  const [local, dominio] = correo.split("@");
  if (!dominio) return "•••";
  if (local.length <= 4) return `${local[0] ?? "•"}•••@${dominio}`;
  return `${local.slice(0, 2)}${"•".repeat(Math.min(local.length - 4, 12))}${local.slice(-2)}@${dominio}`;
}

/** Cuánto vive un vale. Aquí —y no junto a la mecánica— porque la PANTALLA
 *  también lo dice («caduca en 60 minutos») y este es el único módulo que
 *  pueden leer a la vez el servidor, el cliente y el guardián. */
export const MINUTOS_DEL_VALE = 60;

// ── Las reglas de la contraseña nueva ───────────────────────────────────────
// Las mismas que el cambio forzado de `/cambiar-contrasena` (10 caracteres, no
// contener el usuario). Escritas aquí para que las compartan las DOS pantallas
// y el guardián — tenerlas dos veces era garantizar que un día divergieran.
export const MINIMO_CONTRASENA = 10;

export function validarContrasena(nueva: string, confirmacion: string, correo: string): string | null {
  if (nueva !== confirmacion) return "Las contraseñas no coinciden.";
  if (nueva.length < MINIMO_CONTRASENA) return `Usa al menos ${MINIMO_CONTRASENA} caracteres.`;
  const usuario = correo.split("@")[0]?.toLowerCase();
  if (usuario && usuario.length >= 3 && nueva.toLowerCase().includes(usuario)) {
    return "La contraseña no debe contener tu usuario.";
  }
  return null;
}
