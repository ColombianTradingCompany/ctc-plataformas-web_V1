"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

// ── Terratalento · server actions ────────────────────────────────────────────
// El servicio del RECOLECTOR. Patrón Directorio calcado: las tablas
// terratalento_* son service-role-only (RLS activada, cero políticas); el
// cliente NUNCA las toca directo — cada acción reautentica la sesión
// (auth.uid()) y luego opera con el cliente service-role. La identidad es la
// MISMA cuenta del ecosistema y es ORTOGONAL a profiles.role: un recolector
// puede ser también productor o comprador sin que nada se pise.
//
// Curaduría de lectura (regla public-catalog): lo que el recolector ve de una
// finca son SOLO columnas de exhibición (nombre, municipio, vereda) — nunca
// geolocalización ni expediente EUDR.

export type ActionResult = { ok: true } | { ok: false; error: string };

export type RecolectorPerfil = {
  nombre: string;
  cedula: string;
  celular: string;
  whatsapp: boolean;
  departamento: string;
  municipio: string;
  experienciaAnios: number | null;
  disponible: boolean;
  notas: string;
};

export type JornadaPublica = {
  id: string;
  fincaNombre: string;
  fincaMunicipio: string;
  fincaVereda: string;
  fechaInicio: string;
  fechaFin: string | null;
  cupos: number;
  confirmados: number;
  pago: string | null;
  condiciones: string | null;
  estado: string;
  miPostulacion: string | null; // estado de la postulación propia, si existe
};

export type TerratalentoBundle = {
  correo: string;
  perfil: RecolectorPerfil | null;
  jornadas: JornadaPublica[];
};

export type ProducerJornada = {
  id: string;
  fincaId: string;
  fincaNombre: string;
  fechaInicio: string;
  fechaFin: string | null;
  cupos: number;
  pago: string | null;
  condiciones: string | null;
  estado: string;
  postulados: number;
  llamados: number;
  confirmados: number;
};

async function sessionUser() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return user;
}

const clamp = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

// ── Lado recolector ──────────────────────────────────────────────────────────

export async function cargarTerratalento(): Promise<TerratalentoBundle | null> {
  const user = await sessionUser();
  if (!user?.email) return null;
  const service = createServiceRoleClient();

  const [{ data: perfilRow }, { data: jornadaRows }, { data: misRows }] = await Promise.all([
    service.from("terratalento_recolectores").select("*").eq("profile_id", user.id).maybeSingle(),
    service
      .from("terratalento_jornadas")
      .select("id, fecha_inicio, fecha_fin, cupos, pago, condiciones, estado, fincas(name, municipio, vereda)")
      .in("estado", ["abierta", "en_gestion"])
      .order("fecha_inicio", { ascending: true }),
    service.from("terratalento_postulaciones").select("jornada_id, estado").eq("recolector_id", user.id),
  ]);

  const jornadaIds = (jornadaRows ?? []).map((j) => j.id as string);
  const confirmadosByJornada = new Map<string, number>();
  if (jornadaIds.length) {
    const { data: confRows } = await service
      .from("terratalento_postulaciones")
      .select("jornada_id")
      .in("jornada_id", jornadaIds)
      .eq("estado", "confirmado");
    for (const r of confRows ?? []) {
      const id = r.jornada_id as string;
      confirmadosByJornada.set(id, (confirmadosByJornada.get(id) ?? 0) + 1);
    }
  }
  const miEstado = new Map(((misRows ?? []) as { jornada_id: string; estado: string }[]).map((r) => [r.jornada_id, r.estado]));

  type Row = {
    id: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    cupos: number;
    pago: string | null;
    condiciones: string | null;
    estado: string;
    fincas: { name: string; municipio: string | null; vereda: string | null } | null;
  };

  return {
    correo: user.email,
    perfil: perfilRow
      ? {
          nombre: String(perfilRow.nombre ?? ""),
          cedula: String(perfilRow.cedula ?? ""),
          celular: String(perfilRow.celular ?? ""),
          whatsapp: !!perfilRow.whatsapp,
          departamento: String(perfilRow.departamento ?? ""),
          municipio: String(perfilRow.municipio ?? ""),
          experienciaAnios: perfilRow.experiencia_anios === null ? null : Number(perfilRow.experiencia_anios),
          disponible: !!perfilRow.disponible,
          notas: String(perfilRow.notas ?? ""),
        }
      : null,
    jornadas: ((jornadaRows ?? []) as unknown as Row[]).map((j) => ({
      id: j.id,
      fincaNombre: j.fincas?.name ?? "Finca de la red",
      fincaMunicipio: j.fincas?.municipio ?? "",
      fincaVereda: j.fincas?.vereda ?? "",
      fechaInicio: j.fecha_inicio,
      fechaFin: j.fecha_fin,
      cupos: Number(j.cupos),
      confirmados: confirmadosByJornada.get(j.id) ?? 0,
      pago: j.pago,
      condiciones: j.condiciones,
      estado: j.estado,
      miPostulacion: miEstado.get(j.id) ?? null,
    })),
  };
}

export type PerfilInput = {
  nombre: string;
  cedula: string;
  celular: string;
  whatsapp: boolean;
  departamento: string;
  municipio: string;
  experienciaAnios: string;
  notas: string;
};

export async function guardarPerfilRecolector(input: PerfilInput): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo." };

  const nombre = clamp(input.nombre, 120);
  const celular = clamp(input.celular, 40);
  const departamento = clamp(input.departamento, 80);
  const municipio = clamp(input.municipio, 80);
  if (!nombre || !celular || !departamento || !municipio) {
    return { ok: false, error: "Nombre, celular, departamento y municipio son obligatorios." };
  }
  const expRaw = clamp(input.experienciaAnios, 3);
  const experiencia = expRaw === "" ? null : Number(expRaw);
  if (experiencia !== null && (!Number.isInteger(experiencia) || experiencia < 0 || experiencia > 80)) {
    return { ok: false, error: "Los años de experiencia deben ser un número entre 0 y 80." };
  }

  const service = createServiceRoleClient();
  const { error } = await service.from("terratalento_recolectores").upsert(
    {
      profile_id: user.id,
      nombre,
      cedula: clamp(input.cedula, 30) || null,
      celular,
      whatsapp: !!input.whatsapp,
      departamento,
      municipio,
      experiencia_anios: experiencia,
      notas: clamp(input.notas, 600) || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" }
  );
  if (error) return { ok: false, error: "No se pudo guardar tu perfil. Intenta de nuevo." };
  return { ok: true };
}

export async function setDisponibleRecolector(disponible: boolean): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo." };
  const service = createServiceRoleClient();
  const { error } = await service
    .from("terratalento_recolectores")
    .update({ disponible, updated_at: new Date().toISOString() })
    .eq("profile_id", user.id);
  if (error) return { ok: false, error: "No se pudo actualizar tu disponibilidad." };
  return { ok: true };
}

export async function postularJornada(jornadaId: string): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo." };
  const service = createServiceRoleClient();

  const { data: perfil } = await service
    .from("terratalento_recolectores")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!perfil) return { ok: false, error: "Completa tu perfil de recolector antes de postularte." };

  const { data: jornada } = await service
    .from("terratalento_jornadas")
    .select("id, estado")
    .eq("id", jornadaId)
    .maybeSingle();
  if (!jornada || !["abierta", "en_gestion"].includes(String(jornada.estado))) {
    return { ok: false, error: "Esta jornada ya no recibe postulaciones." };
  }

  const { data: existing } = await service
    .from("terratalento_postulaciones")
    .select("id, estado")
    .eq("jornada_id", jornadaId)
    .eq("recolector_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await service
      .from("terratalento_postulaciones")
      .insert({ jornada_id: jornadaId, recolector_id: user.id });
    if (error) return { ok: false, error: "No se pudo registrar tu postulación." };
    return { ok: true };
  }
  if (existing.estado === "retirado") {
    const { error } = await service.from("terratalento_postulaciones").update({ estado: "postulado" }).eq("id", existing.id);
    if (error) return { ok: false, error: "No se pudo registrar tu postulación." };
    return { ok: true };
  }
  if (existing.estado === "descartado") return { ok: false, error: "Esta jornada ya no está disponible para ti." };
  return { ok: true }; // ya postulado/llamado/confirmado — idempotente
}

export async function retirarPostulacion(jornadaId: string): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo." };
  const service = createServiceRoleClient();
  const { error } = await service
    .from("terratalento_postulaciones")
    .update({ estado: "retirado" })
    .eq("jornada_id", jornadaId)
    .eq("recolector_id", user.id)
    .in("estado", ["postulado", "llamado"]);
  if (error) return { ok: false, error: "No se pudo retirar tu postulación." };
  return { ok: true };
}

// ── Lado productor (Kaffetal Regal) ─────────────────────────────────────────

export async function misJornadasRecolecta(): Promise<ProducerJornada[]> {
  const user = await sessionUser();
  if (!user) return [];
  const service = createServiceRoleClient();

  const { data: rows } = await service
    .from("terratalento_jornadas")
    .select("id, finca_id, fecha_inicio, fecha_fin, cupos, pago, condiciones, estado, fincas(name)")
    .eq("producer_id", user.id)
    .order("created_at", { ascending: false });
  const jornadas = (rows ?? []) as unknown as {
    id: string; finca_id: string; fecha_inicio: string; fecha_fin: string | null; cupos: number;
    pago: string | null; condiciones: string | null; estado: string; fincas: { name: string } | null;
  }[];
  if (!jornadas.length) return [];

  const { data: postRows } = await service
    .from("terratalento_postulaciones")
    .select("jornada_id, estado")
    .in("jornada_id", jornadas.map((j) => j.id));
  const counts = new Map<string, { postulados: number; llamados: number; confirmados: number }>();
  for (const p of (postRows ?? []) as { jornada_id: string; estado: string }[]) {
    const c = counts.get(p.jornada_id) ?? { postulados: 0, llamados: 0, confirmados: 0 };
    if (p.estado === "postulado") c.postulados += 1;
    if (p.estado === "llamado") c.llamados += 1;
    if (p.estado === "confirmado") c.confirmados += 1;
    counts.set(p.jornada_id, c);
  }

  return jornadas.map((j) => ({
    id: j.id,
    fincaId: j.finca_id,
    fincaNombre: j.fincas?.name ?? "—",
    fechaInicio: j.fecha_inicio,
    fechaFin: j.fecha_fin,
    cupos: Number(j.cupos),
    pago: j.pago,
    condiciones: j.condiciones,
    estado: j.estado,
    ...(counts.get(j.id) ?? { postulados: 0, llamados: 0, confirmados: 0 }),
  }));
}

export type JornadaInput = {
  fincaId: string;
  fechaInicio: string;
  fechaFin: string;
  cupos: string;
  pago: string;
  condiciones: string;
};

export async function crearJornadaRecolecta(input: JornadaInput): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo." };
  const service = createServiceRoleClient();

  // La finca tiene que ser SUYA — misma regla de propiedad que todo KR.
  const { data: finca } = await service
    .from("fincas")
    .select("id, producer_id")
    .eq("id", clamp(input.fincaId, 60))
    .maybeSingle();
  if (!finca || finca.producer_id !== user.id) return { ok: false, error: "Esa finca no está registrada a tu nombre." };

  const fechaInicio = clamp(input.fechaInicio, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) return { ok: false, error: "La fecha de inicio es obligatoria." };
  const fechaFin = clamp(input.fechaFin, 10) || null;
  if (fechaFin && fechaFin < fechaInicio) return { ok: false, error: "La fecha final no puede ser antes del inicio." };
  const cupos = Number(clamp(input.cupos, 4));
  if (!Number.isInteger(cupos) || cupos < 1 || cupos > 200) return { ok: false, error: "Los cupos deben ser un número entre 1 y 200." };

  const { error } = await service.from("terratalento_jornadas").insert({
    finca_id: finca.id,
    producer_id: user.id,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    cupos,
    pago: clamp(input.pago, 200) || null,
    condiciones: clamp(input.condiciones, 800) || null,
  });
  if (error) return { ok: false, error: "No se pudo publicar la jornada. Intenta de nuevo." };
  return { ok: true };
}

export async function cerrarJornadaRecolecta(jornadaId: string, cancelar = false): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo." };
  const service = createServiceRoleClient();
  const { error } = await service
    .from("terratalento_jornadas")
    .update({ estado: cancelar ? "cancelada" : "cerrada" })
    .eq("id", jornadaId)
    .eq("producer_id", user.id)
    .in("estado", ["abierta", "en_gestion"]);
  if (error) return { ok: false, error: "No se pudo actualizar la jornada." };
  return { ok: true };
}
