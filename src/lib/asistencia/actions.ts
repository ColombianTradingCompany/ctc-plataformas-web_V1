"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { RUTA_RECUPERAR } from "@/lib/auth/puertas";
import { anularVale, emitirVale } from "@/lib/auth/recuperacion";
import { enviarCorreoRecuperacion } from "@/lib/email/recuperacionEmails";
import type { ActionResult } from "@/components/panel/ActionForm";
import { correoEtiquetaDesacoplado, correoRealValido, slugDesacoplado, type Gestion } from "./desacoplado";

// ── Asistencia a Proveedores · Proveedor Desacoplado (V5.75, owner 2026-09-23) ──
// Los dos módulos son UN mecanismo con dos puertas: «entrar al perfil de un
// productor» para crear fincas y lotes y hacer el proceso en su nombre.
//
// LA SESIÓN ASISTIDA. En vez de reconstruir en el OCP los editores que Kaffetal
// Regal ya tiene (finca, parcelas, mapa EUDR, la Ficha de ~60 campos, fotos), el
// OCP genera un enlace de sesión para el productor (`auth.admin.generateLink`,
// que NO manda correo) y lo canjea en la cookie COMPARTIDA (`sb-…`, la de las
// superficies públicas): el operador abre KR en otra pestaña y ES el productor.
//   · Las subidas caen en `kaffetal-media/{producer_id}/…` porque `auth.uid()`
//     es el productor: la política de Storage se cumple sola.
//   · Los guard triggers aplican como al productor — y eso es lo correcto: en su
//     nombre CTCx hace lo que él podría hacer; lo que solo puede hacer CTC sigue
//     en el OCP con el service role.
//   · La consola vive en `ctc-panel-auth` (contrato «Sesiones y cookies»): abrir
//     la sesión del productor en la cookie compartida no toca la del operador.
//     Sí PISA lo que hubiera en la compartida (si el operador estaba entrado como
//     comprador o como su propio productor en el mismo navegador): es el efecto
//     buscado, y «Cerrar sesión asistida» la limpia.
//   · Queda rastro: `audit_log` (quién y cuándo) y una nota en
//     `producer_comm_log`, que el productor SÍ ve en su feed.
//
// Todas las acciones son `emite` (solo admin) y devuelven resultado — nunca lanzan.

const PATHS = ["/ocp/asistencia", "/ocp/desacoplado", "/ocp/kr", "/ecp"];
function revalidar() {
  for (const p of PATHS) revalidatePath(p);
}

/** El origen de Kaffetal Regal para abrir la pestaña: el subdominio en producción, el mismo host en local. */
async function origenDeKaffetalRegal(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
    const proto = h.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}/kaffetal-regal`;
  }
  return `${origenDeSuperficie("/kaffetal-regal")}/kaffetal-regal`;
}

type ProfileRow = { id: string; role: string | null; email: string | null; full_name: string | null };

export type AperturaAsistida = { ok: true; url: string } | { ok: false; error: string };

/** Abre Kaffetal Regal COMO el productor: canjea un enlace de sesión en la cookie compartida y devuelve a dónde ir. */
export async function abrirSesionAsistida(producerId: string): Promise<AperturaAsistida> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const { data: pRaw } = await service.from("profiles").select("id, role, email, full_name").eq("id", producerId).maybeSingle();
  const p = pRaw as ProfileRow | null;
  if (!p) return { ok: false, error: "Productor no encontrado." };
  // SOLO productores. Ni el equipo, ni un socio, ni un comprador: la sesión asistida
  // existe para hacer el proceso del Kaffetal Regal en nombre de quien lo vive.
  if (p.role !== "producer") return { ok: false, error: "La sesión asistida solo se abre para una cuenta de productor." };
  if (!p.email) return { ok: false, error: "Esta cuenta no tiene correo de acceso; no se puede abrir una sesión." };

  const { data: link, error: linkErr } = await service.auth.admin.generateLink({ type: "magiclink", email: p.email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) return { ok: false, error: `No se pudo generar el enlace de sesión${linkErr ? `: ${linkErr.message}` : "."}` };

  // El canje escribe la cookie COMPARTIDA (no la del panel) en esta misma respuesta.
  const compartida = await createSessionClient();
  const { data: sesion, error: otpErr } = await compartida.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (otpErr || !sesion.user) return { ok: false, error: `No se pudo abrir la sesión del productor${otpErr ? `: ${otpErr.message}` : "."}` };

  await service.from("audit_log").insert({
    entity_type: "producer",
    entity_id: producerId,
    action: "assisted_session_opened",
    performed_by: adminId,
    notes: `Sesión asistida en Kaffetal Regal como ${p.full_name || p.email}.`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: producerId,
    context_label: "Asistencia CTCx",
    note: "CTCx entró a su cuenta de Kaffetal Regal para ayudarle con su información (sesión asistida, con registro). Si tiene alguna duda sobre lo que ve cambiado, escríbanos.",
    created_by: adminId,
  });
  revalidar();
  return { ok: true, url: await origenDeKaffetalRegal() };
}

/** Limpia la cookie compartida en ESTE navegador (`scope: "local"`: no revoca la sesión del productor en su teléfono). */
export async function cerrarSesionAsistida(): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const compartida = await createSessionClient();
  const {
    data: { user },
  } = await compartida.auth.getUser();
  await compartida.auth.signOut({ scope: "local" });
  if (user) {
    await createServiceRoleClient().from("audit_log").insert({
      entity_type: "producer",
      entity_id: user.id,
      action: "assisted_session_closed",
      performed_by: permiso.userId,
    });
  }
  revalidar();
  return { ok: true };
}

/** Crea la cuenta de un Proveedor Desacoplado: correo-etiqueta sin buzón, contraseña que nadie conoce, `gestion = desacoplado`. */
export async function crearProveedorDesacoplado(formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length < 3) return { ok: false, error: "Escriba el nombre del dueño del café (mínimo 3 caracteres)." };
  const companyName = String(formData.get("company_name") ?? "").trim() || null;
  const department = String(formData.get("department") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  const email = correoEtiquetaDesacoplado(slugDesacoplado());
  // `handle_new_user` lee `role` y `full_name` de los metadatos y crea `profiles` + `producer_profiles`.
  const { data: creado, error } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
    user_metadata: { role: "producer", full_name: fullName },
  });
  if (error || !creado.user) return { ok: false, error: `No se pudo crear la cuenta${error ? `: ${error.message}` : "."}` };
  const id = creado.user.id;

  const gestion: Gestion = "desacoplado";
  const { error: ppErr } = await service
    .from("producer_profiles")
    .update({ gestion, gestion_desde: new Date().toISOString(), company_name: companyName, department })
    .eq("profile_id", id);
  if (ppErr) return { ok: false, error: `La cuenta se creó (${email}) pero no quedó marcada como desacoplada: ${ppErr.message}` };
  if (phone) await service.from("profiles").update({ phone }).eq("id", id);

  await service.from("audit_log").insert({
    entity_type: "producer",
    entity_id: id,
    action: "desacoplado_created",
    new_status: gestion,
    performed_by: adminId,
    notes: `${fullName} · ${email}`,
  });
  revalidar();
  return { ok: true };
}

/** Entrega la cuenta: le asigna el correo real, la marca `entregado` y le manda el enlace para elegir contraseña. */
export async function entregarCuentaDesacoplada(producerId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const correo = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!correoRealValido(correo)) return { ok: false, error: "Escriba un correo real (no una etiqueta de desacoplado)." };

  const [{ data: ppRaw }, { data: pRaw }, { data: ocupado }] = await Promise.all([
    service.from("producer_profiles").select("gestion").eq("profile_id", producerId).maybeSingle(),
    service.from("profiles").select("id, role, email, full_name").eq("id", producerId).maybeSingle(),
    service.from("profiles").select("id").eq("email", correo).maybeSingle(),
  ]);
  const pp = ppRaw as { gestion: Gestion | null } | null;
  const p = pRaw as ProfileRow | null;
  if (!p || !pp) return { ok: false, error: "Productor no encontrado." };
  if (pp.gestion !== "desacoplado") return { ok: false, error: "Solo se entrega una cuenta que hoy lleva CTCx (desacoplada)." };
  if (ocupado) return { ok: false, error: "Ya existe una cuenta de la red con ese correo: una identidad, una cuenta." };

  const { error: authErr } = await service.auth.admin.updateUserById(producerId, { email: correo, email_confirm: true });
  if (authErr) return { ok: false, error: `No se pudo asignar el correo: ${authErr.message}` };
  // `guard_profiles_protected_columns` impide que el usuario cambie su correo; el service role sí.
  await service.from("profiles").update({ email: correo }).eq("id", producerId);
  const ahora = new Date().toISOString();
  await service.from("producer_profiles").update({ gestion: "entregado", entregado_at: ahora }).eq("profile_id", producerId);
  await service.from("audit_log").insert({
    entity_type: "producer",
    entity_id: producerId,
    action: "desacoplado_entregado",
    previous_status: "desacoplado",
    new_status: "entregado",
    performed_by: adminId,
    notes: `Correo asignado: ${correo}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: producerId,
    context_label: "Asistencia CTCx",
    note: "CTCx le entregó su cuenta de Kaffetal Regal: la información de su finca y sus lotes la cargó CTCx en su nombre. Con el enlace que le enviamos por correo elige su contraseña.",
    created_by: adminId,
  });

  // El enlace para elegir contraseña: el MISMO flujo de «Recuperar acceso» (vale de un solo uso).
  let emision;
  try {
    emision = await emitirVale(producerId, "kaffetal-regal", correo);
  } catch {
    emision = null;
  }
  if (!emision || !emision.ok) {
    revalidar();
    return { ok: false, error: "La cuenta quedó entregada, pero no se pudo emitir el enlace de contraseña: pídalo desde «Recuperar acceso» con el correo nuevo." };
  }
  const h = await headers();
  const host = h.get("host") ?? "www.ctcexport.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const envio = await enviarCorreoRecuperacion(correo, {
    puerta: "kaffetal-regal",
    correoDeAcceso: correo,
    enlace: `${proto}://${host}${RUTA_RECUPERAR}/${emision.token}`,
    expiraEn: emision.expiraEn,
    destinoDistinto: false,
    sinConfirmar: false,
  });
  if (!envio.ok) {
    await anularVale(emision.token);
    revalidar();
    return { ok: false, error: `La cuenta quedó entregada, pero el correo no salió (${envio.error}): pídalo desde «Recuperar acceso» con el correo nuevo.` };
  }
  revalidar();
  return { ok: true };
}
