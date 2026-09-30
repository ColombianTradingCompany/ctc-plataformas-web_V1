import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Borrar la cuenta de un productor sin finca ni lote (V5.103) ─────────────────────────────────────────────────────
// UNA sola rutina para el botón del OCP y para el barrido automático. `auth.admin.deleteUser` arrastra `profiles` y de
// ahí lo que va en cascada (producer_profiles, fincas, lots, arena_inscriptions, producer_inactividad…), pero cuatro
// tablas apuntan al perfil SIN cascada y bloquearían el borrado (comprobado por SQL el 2026-09-30):
//   · producer_comm_log (producer_id y created_by): el hilo del productor se va con él;
//   · producer_comm_ack (producer_id): sus «Entendido»;
//   · media_assets (uploaded_by): sus fotos — filas y objetos de Storage;
//   · audit_log (performed_by): el rastro se CONSERVA, solo pierde el autor (NULL).
// V5.104 (el owner lo topó limpiando cuentas): las fotos NO se pueden borrar ANTES del perfil, porque
// `producer_profiles.avatar_asset_id` / `video_asset_id` (y `fincas`/`lots.video_asset_id`) apuntan a `media_assets` sin
// cascada. El orden correcto es: soltar `uploaded_by` (nullable) para que el perfil pueda irse → borrar el usuario (la
// cascada se lleva producer_profiles, fincas y lots, y con ellos las referencias) → borrar las filas de `media_assets`
// por id y sus objetos de Storage.
// La REGLA (cero fincas, cero lotes, no protegida) se comprueba aquí otra vez, con datos frescos, porque entre la
// decisión y el borrado pudo registrar una finca.

export type ResultadoDeBorrado = { ok: true; correo: string | null } | { ok: false; error: string };

export async function borrarCuentaDeProductor(service: SupabaseClient, profileId: string): Promise<ResultadoDeBorrado> {
  const [{ data: perfil }, { count: fincas }, { count: lotes }, { data: estado }] = await Promise.all([
    service.from("profiles").select("id, email, role").eq("id", profileId).maybeSingle(),
    service.from("fincas").select("id", { count: "exact", head: true }).eq("producer_id", profileId),
    service.from("lots").select("id", { count: "exact", head: true }).eq("producer_id", profileId),
    service.from("producer_inactividad").select("protegida").eq("profile_id", profileId).maybeSingle(),
  ]);
  if (!perfil) return { ok: false, error: "La cuenta no existe." };
  if (perfil.role !== "producer") return { ok: false, error: "Solo se borran cuentas de productor." };
  if ((fincas ?? 0) > 0 || (lotes ?? 0) > 0) return { ok: false, error: "La cuenta tiene finca o lote registrados: no se borra." };
  if (estado?.protegida) return { ok: false, error: "La cuenta está protegida por el owner." };

  // 1. Lo que no cae en cascada y bloquearía al perfil. Las fotos solo se SUELTAN aquí (se borran al final).
  const { data: medios } = await service.from("media_assets").select("id, bucket, path").eq("uploaded_by", profileId);
  const pasos: Array<{ que: string; error: string | null | undefined }> = [];
  pasos.push({ que: "producer_comm_ack", error: (await service.from("producer_comm_ack").delete().eq("producer_id", profileId)).error?.message });
  pasos.push({ que: "producer_comm_log", error: (await service.from("producer_comm_log").delete().or(`producer_id.eq.${profileId},created_by.eq.${profileId}`)).error?.message });
  pasos.push({ que: "audit_log", error: (await service.from("audit_log").update({ performed_by: null }).eq("performed_by", profileId)).error?.message });
  if (medios?.length) pasos.push({ que: "media_assets (soltar)", error: (await service.from("media_assets").update({ uploaded_by: null }).eq("uploaded_by", profileId)).error?.message });
  const fallo = pasos.find((p) => p.error);
  if (fallo) return { ok: false, error: `No se pudo limpiar ${fallo.que}: ${fallo.error}` };

  // 2. El usuario: la cascada se lleva profiles → producer_profiles (y sus avatar/video_asset_id), fincas, lots…
  const { error } = await service.auth.admin.deleteUser(profileId);
  if (error) return { ok: false, error: error.message };

  // 3. Sus fotos, ya sin nadie que las apunte: filas y objetos de Storage (best effort: un objeto huérfano no bloquea).
  if (medios?.length) {
    for (const bucket of new Set(medios.map((m) => m.bucket))) {
      const rutas = medios.filter((m) => m.bucket === bucket).map((m) => m.path);
      if (rutas.length) await service.storage.from(bucket).remove(rutas);
    }
    await service.from("media_assets").delete().in("id", medios.map((m) => m.id));
  }
  return { ok: true, correo: perfil.email };
}
