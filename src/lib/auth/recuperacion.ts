// ── «Recuperar acceso» · la mecánica (V5.12) ────────────────────────────────
// La política vive en `veredicto.ts` (puro, con guardián). Aquí está lo que
// toca el mundo: la consulta a la base, la emisión del vale, el correo y el
// cambio de contraseña.
//
// POR QUÉ NO SE USA `supabase.auth.resetPasswordForEmail()`. No es rechazo del
// proveedor por gusto; es que el suyo no sabe tres cosas que esta red necesita:
//   1. **A dónde escribir.** Tres usuarios de la casa son etiquetas
//      @ctcexport.com SIN BUZÓN; su enlace tiene que ir al `delivery_email` de
//      `panel_users`/`partner_accounts`. GoTrue solo sabe escribir al correo de
//      acceso — les mandaría el rescate a un agujero y los dejaría fuera para
//      siempre, sin que del lado de CTC fallara nada visible.
//   2. **Que hay cuentas sin contraseña.** 8 de 29 entran solo con Google.
//      GoTrue les mandaría un enlace de «restablecer» que, al usarlo, les
//      ESTRENA una contraseña que nunca pidieron; lo correcto es señalarles su
//      puerta.
//   3. **Que existe o no existe.** Su flujo responde igual en los dos casos por
//      diseño — justo lo que el owner decidió no hacer (ver `veredicto.ts`).
// Y una cuarta, práctica: su enlace obliga a mantener una allowlist de
// redirecciones con 19 subdominios dentro. Este vale no necesita ninguna.
//
// DEUDA ANOTADA, no olvido: cambiar la contraseña por el admin de GoTrue NO
// revoca las sesiones abiertas en otros dispositivos. Para el caso de uso real
// —olvidé mi contraseña— da igual; para el caso «me robaron la cuenta» haría
// falta revocar los refresh tokens, y la única vía sería escribir en las tablas
// internas de `auth`, que esta casa no toca. Si algún día importa, se resuelve
// con una función `security definer` acotada, no desde aquí.

import { createHash, randomBytes } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { PUERTAS, type PuertaId } from "./puertas";
import { decidir, MINUTOS_DEL_VALE, normalizarCorreo, type HechosIdentidad, type Veredicto } from "./veredicto";

/** Una hora. Suficiente para ir a buscar el correo al móvil y volver; poco para
 *  que un vale olvidado en una bandeja compartida siga sirviendo mañana.
 *  El número vive en `veredicto.ts` porque la pantalla también lo dice. */
export const VALE_TTL_MS = MINUTOS_DEL_VALE * 60 * 1000;

/** Tres vales por cuenta cada quince minutos — el mismo tope que el OTP del
 *  login maestro. Lo que limita no es el sondeo (la pantalla ya responde sin
 *  enviar nada), sino el CORREO: sin tope, cualquiera podría usar el formulario
 *  para bombardear el buzón de otro. */
const MAX_VALES_POR_VENTANA = 3;
const VENTANA_MS = 15 * 60 * 1000;

export function hashVale(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 32 bytes de aleatoriedad criptográfica en base64url — el vale nunca se
 *  guarda en claro, ni en la base ni en los registros. Solo viaja en el correo. */
function generarVale(): string {
  return randomBytes(32).toString("base64url");
}

type FilaHechos = {
  profile_id: string;
  correo: string | null;
  confirmado: boolean;
  tiene_password: boolean;
  tiene_google: boolean;
  rol: string | null;
  panel_status: string | null;
  panel_delivery: string | null;
  socio_status: string | null;
  socio_delivery: string | null;
  socio_nodo: string | null;
};

/** Los hechos de la base, o `null` si ese correo no existe. */
export async function buscarHechos(correoCrudo: string): Promise<HechosIdentidad | null> {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("buscar_identidad_para_recuperacion", {
    p_correo: normalizarCorreo(correoCrudo),
  });
  if (error) throw new Error(error.message);
  const fila = (data as FilaHechos[] | null)?.[0];
  if (!fila || !fila.correo) return null;
  return {
    profileId: fila.profile_id,
    correo: fila.correo,
    confirmado: fila.confirmado,
    tienePassword: fila.tiene_password,
    tieneGoogle: fila.tiene_google,
    rol: fila.rol,
    panelStatus: fila.panel_status,
    panelDelivery: fila.panel_delivery,
    socioStatus: fila.socio_status,
    socioDelivery: fila.socio_delivery,
    socioNodo: fila.socio_nodo,
  };
}

/** El veredicto completo para un correo tecleado. */
export async function diagnosticar(correoCrudo: string): Promise<Veredicto> {
  const veredicto = decidir(correoCrudo, null);
  // Si ni siquiera tiene forma de correo, no se consulta la base.
  if (veredicto.estado === "correo-invalido") return veredicto;
  return decidir(correoCrudo, await buscarHechos(correoCrudo));
}

export type EmisionVale =
  | { ok: true; token: string; expiraEn: Date }
  | { ok: false; motivo: "demasiadas" };

/**
 * Emite el vale. Antes de emitirlo QUEMA los anteriores de esa cuenta: pedir un
 * enlace nuevo tiene que invalidar el viejo, o un correo reenviado hace un mes
 * seguiría abriendo la puerta.
 */
export async function emitirVale(
  profileId: string,
  puerta: PuertaId,
  destino: string
): Promise<EmisionVale> {
  const service = createServiceRoleClient();

  const desde = new Date(Date.now() - VENTANA_MS).toISOString();
  const { count } = await service
    .from("password_reset_tokens")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .gte("created_at", desde);
  if ((count ?? 0) >= MAX_VALES_POR_VENTANA) return { ok: false, motivo: "demasiadas" };

  await service
    .from("password_reset_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .is("consumed_at", null);

  const token = generarVale();
  const expiraEn = new Date(Date.now() + VALE_TTL_MS);
  const { error } = await service.from("password_reset_tokens").insert({
    profile_id: profileId,
    token_hash: hashVale(token),
    puerta,
    delivered_to: destino,
    expires_at: expiraEn.toISOString(),
  });
  if (error) throw new Error(error.message);

  return { ok: true, token, expiraEn };
}

/** Deshace una emisión cuyo correo no llegó a salir. Misma lección que el OTP
 *  del login maestro (2026-08-13): si el envío falla y la fila se queda, el
 *  reintento cuenta doble contra el tope y el usuario se queda sin intentos
 *  por un fallo que no es suyo. */
export async function anularVale(token: string): Promise<void> {
  const service = createServiceRoleClient();
  await service.from("password_reset_tokens").delete().eq("token_hash", hashVale(token));
}

export type ValeVivo = {
  id: string;
  profileId: string;
  correo: string;
  puerta: PuertaId;
};

/** ¿Sigue vivo este vale? Ni consumido ni caducado. No lo consume: eso pasa al
 *  guardar la contraseña, no al abrir la página (un antivirus corporativo que
 *  «visita» los enlaces del correo quemaría el vale antes que su dueño). */
export async function valeVivo(token: string): Promise<ValeVivo | null> {
  if (!token || token.length < 20) return null;
  const service = createServiceRoleClient();
  const { data } = await service
    .from("password_reset_tokens")
    .select("id, profile_id, puerta, expires_at, consumed_at")
    .eq("token_hash", hashVale(token))
    .is("consumed_at", null)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  // Por ID, no por correo: el vale ya identifica a su dueño y `getUserById` es
  // la única lectura de `auth.users` que el SDK expone directamente.
  const { data: perfil } = await service.auth.admin.getUserById(data.profile_id);
  const correo = perfil?.user?.email;
  if (!correo) return null;

  return {
    id: data.id,
    profileId: data.profile_id,
    correo,
    puerta: (data.puerta in PUERTAS ? data.puerta : "kaffetal-regal") as PuertaId,
  };
}

export type Canje = { ok: true } | { ok: false; error: string };

/**
 * Quema el vale y estrena la contraseña. El orden importa: primero se marca
 * consumido (con la condición `is null` puesta en el propio UPDATE, que es lo
 * que hace la carrera imposible: dos pestañas enviando a la vez, solo una
 * cambia la fila), y solo si esa fila era realmente la que estaba viva se toca
 * la contraseña.
 */
export async function canjearVale(token: string, nueva: string): Promise<Canje> {
  const service = createServiceRoleClient();
  const vivo = await valeVivo(token);
  if (!vivo) return { ok: false, error: "Este enlace ya no sirve. Pide uno nuevo." };

  const { data: quemado } = await service
    .from("password_reset_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", vivo.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (!quemado) return { ok: false, error: "Este enlace ya se usó. Pide uno nuevo." };

  // `email_confirm: true` de paso: quien abre el enlace DEMOSTRÓ que el buzón es
  // suyo, que es exactamente lo que confirmar un correo significa. Sin esto, la
  // cuenta sin confirmar de la base (`ete0109@yahoo.com`) recuperaría su
  // contraseña y seguiría sin poder entrar.
  const { error } = await service.auth.admin.updateUserById(vivo.profileId, {
    password: nueva,
    email_confirm: true,
  });
  if (error) {
    // Se devuelve el vale a la vida: el fallo no es del usuario.
    await service.from("password_reset_tokens").update({ consumed_at: null }).eq("id", vivo.id);
    return { ok: false, error: "No se pudo guardar la contraseña. Intenta de nuevo." };
  }

  // Si venía de una temporal emitida por el BCP, el cambio forzado ya está
  // cumplido: la persona acaba de elegir la suya.
  await service.from("panel_users").update({ must_change_password: false }).eq("profile_id", vivo.profileId);

  await service.from("audit_log").insert({
    entity_type: "identidad",
    entity_id: vivo.profileId,
    action: "password_recovered",
    performed_by: vivo.profileId,
    notes: `Recuperación por correo desde ${PUERTAS[vivo.puerta].nombre}.`,
  });

  return { ok: true };
}
