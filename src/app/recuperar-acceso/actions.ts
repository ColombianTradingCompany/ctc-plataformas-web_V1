"use server";

import { headers } from "next/headers";
import { diagnosticar, emitirVale, anularVale, canjearVale, valeVivo } from "@/lib/auth/recuperacion";
import { enviarCorreoRecuperacion } from "@/lib/email/recuperacionEmails";
import { enmascararCorreo, validarContrasena } from "@/lib/auth/veredicto";
import { puertaDe, RUTA_RECUPERAR, type PuertaId } from "@/lib/auth/puertas";

// ── Las dos acciones de «Recuperar acceso» (V5.12) ──────────────────────────
// Ninguna LANZA: una excepción en una Server Action atada a un formulario
// tumba la página entera y en producción el mensaje sale redactado (regla de
// AGENTS.md). Todo rechazo alcanzable vuelve como `{estado}` y la pantalla lo
// pinta.
//
// ⚠️ Un archivo `"use server"` SOLO puede exportar funciones asíncronas: las
// constantes y el registro de puertas se importan de sus módulos puros
// (`veredicto.ts`, `puertas.ts`), que el cliente también puede leer.

export type Respuesta =
  | { estado: "correo-invalido" }
  | { estado: "sin-cuenta" }
  | { estado: "solo-google" }
  | { estado: "bloqueada"; motivo: string }
  | { estado: "demasiadas" }
  | { estado: "fallo" }
  | { estado: "enviado"; destino: string; destinoDistinto: boolean };

/**
 * El origen absoluto de ESTA petición.
 *
 * El enlace del correo se firma con el host desde el que se pidió — quien lo
 * pide desde `kaffetal-regal.ctcexport.com` lo recibe apuntando ahí, y quien
 * lo pide en `localhost:3000` lo recibe apuntando a localhost. Funciona porque
 * `/recuperar-acceso` se sirve desde la RAÍZ en todos los hosts (ver la lista
 * `RAIZ_COMPARTIDA` de `src/proxy.ts`).
 *
 * Se usa la cabecera `host`, no `nextUrl`: el servidor de desarrollo normaliza
 * `nextUrl` a «localhost» pase lo que pase (verificado el 2026-07-17), y en
 * Vercel es la cabecera la que trae el hostname real.
 */
async function origenDeLaPeticion(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "www.ctcexport.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function solicitarRecuperacion(correo: string, puertaCruda: string): Promise<Respuesta> {
  const puerta: PuertaId = puertaDe(puertaCruda);

  let veredicto;
  try {
    veredicto = await diagnosticar(correo);
  } catch (e) {
    console.error("[recuperar] diagnóstico falló:", e);
    return { estado: "fallo" };
  }

  if (veredicto.estado !== "puede-enviarse") {
    // correo-invalido · sin-cuenta · solo-google · bloqueada salen tal cual.
    return veredicto;
  }

  let emision;
  try {
    emision = await emitirVale(veredicto.profileId, puerta, veredicto.destino);
  } catch (e) {
    console.error("[recuperar] emisión falló:", e);
    return { estado: "fallo" };
  }
  if (!emision.ok) return { estado: "demasiadas" };

  const enlace = `${await origenDeLaPeticion()}${RUTA_RECUPERAR}/${emision.token}`;
  const envio = await enviarCorreoRecuperacion(veredicto.destino, {
    puerta,
    correoDeAcceso: veredicto.correo,
    enlace,
    expiraEn: emision.expiraEn,
    destinoDistinto: veredicto.destinoDistinto,
    sinConfirmar: veredicto.sinConfirmar,
  });

  if (!envio.ok) {
    // Misma lección que el OTP del panel (2026-08-13): NO reportar éxito —
    // dejaría a alguien esperando un correo que no salió — y devolver el vale,
    // para que el reintento no queme uno de los tres de la ventana.
    console.error("[recuperar] envío falló:", envio.error);
    await anularVale(emision.token);
    return { estado: "fallo" };
  }

  return {
    estado: "enviado",
    // Enmascarado SOLO cuando el destino es otro buzón: la política es decir la
    // verdad sobre la cuenta que la persona escribió, no revelar una dirección
    // personal distinta que quizá no conoce.
    destino: veredicto.destinoDistinto ? enmascararCorreo(veredicto.destino) : veredicto.destino,
    destinoDistinto: veredicto.destinoDistinto,
  };
}

export type ResultadoNueva = { ok: true; puerta: PuertaId } | { ok: false; error: string };

export async function guardarContrasenaNueva(
  token: string,
  nueva: string,
  confirmacion: string
): Promise<ResultadoNueva> {
  let vivo;
  try {
    vivo = await valeVivo(token);
  } catch (e) {
    console.error("[recuperar] verificación del vale falló:", e);
    return { ok: false, error: "No se pudo verificar el enlace. Intenta de nuevo." };
  }
  if (!vivo) {
    return { ok: false, error: "Este enlace ya no sirve. Vuelve a pedir uno." };
  }

  // Se valida contra el correo REAL de la cuenta, no contra nada que venga del
  // formulario: la regla «no contenga tu usuario» solo significa algo si el
  // usuario lo pone el servidor.
  const problema = validarContrasena(nueva, confirmacion, vivo.correo);
  if (problema) return { ok: false, error: problema };

  try {
    const res = await canjearVale(token, nueva);
    if (!res.ok) return { ok: false, error: res.error };
  } catch (e) {
    console.error("[recuperar] canje falló:", e);
    return { ok: false, error: "No se pudo guardar la contraseña. Intenta de nuevo." };
  }

  return { ok: true, puerta: vivo.puerta };
}
