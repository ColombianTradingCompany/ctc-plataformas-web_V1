"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { puedeSer } from "@/lib/identidad/matriz";
import type { ConstanciaInput } from "./constanciaPrint";

// ── Terratalento · server actions ────────────────────────────────────────────
// El servicio del RECOLECTOR. Patrón Directorio: las tablas terratalento_* son
// service-role-only (RLS activada, cero políticas); el cliente NUNCA las toca
// directo — cada acción reautentica la sesión (auth.uid()) y luego opera con el
// cliente service-role. La identidad es la MISMA cuenta del ecosistema y es
// ORTOGONAL a profiles.role.
//
// Curaduría de lectura (regla public-catalog): de la finca solo viajan
// nombre/municipio/vereda — nunca geolocalización ni expediente EUDR.
//
// V2 · §5.1 (owner, 2026-08-02): el productor ve nombre y celular SOLO de los
// recolectores CONFIRMADOS. Postulados y descartados siguen invisibles para él
// — el control de la selección sigue siendo de CTC.

// Las columnas de términos que viajan tal cual y se interpretan con el módulo
// puro `terminos.ts` (única fuente de verdad para leer un trato).
const TERMINOS_COLS =
  "pago, condiciones, pago_modalidad, pago_valor, pago_unidad, pago_forma, pago_frecuencia, " +
  "alojamiento, alojamiento_detalle, alimentacion, alimentacion_detalle, transporte, transporte_detalle, " +
  "horario, duracion_estimada_dias, requisitos";

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
  contactoEmergenciaNombre: string;
  contactoEmergenciaCelular: string;
  medioPago: string;
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
  estado: string;
  miPostulacion: string | null;
  /** Columnas crudas de términos — se leen con `terminosFromRow()`. */
  terminos: Record<string, unknown>;
};

export type TerratalentoBundle = {
  correo: string;
  perfil: RecolectorPerfil | null;
  /** Jornadas abiertas a las que TODAVÍA no me postulé. */
  abiertas: JornadaPublica[];
  /** Mi propio embudo: las jornadas donde ya tengo postulación. */
  misPostulaciones: JornadaPublica[];
};

export type ConfirmadoLite = { nombre: string; celular: string };

export type ProducerJornada = {
  id: string;
  fincaId: string;
  fincaNombre: string;
  fechaInicio: string;
  fechaFin: string | null;
  cupos: number;
  estado: string;
  postulados: number;
  llamados: number;
  confirmados: number;
  /** §5.1: solo los confirmados, y solo nombre + celular. */
  rosterConfirmados: ConfirmadoLite[];
  terminos: Record<string, unknown>;
};

async function sessionUser() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return user;
}

const clamp = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

function pickTerminos(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of TERMINOS_COLS.split(",").map((c) => c.trim())) out[k] = row[k];
  return out;
}

// ── Lado recolector ──────────────────────────────────────────────────────────

export async function cargarTerratalento(): Promise<TerratalentoBundle | null> {
  const user = await sessionUser();
  if (!user?.email) return null;
  const service = createServiceRoleClient();

  const [{ data: perfilRow }, { data: jornadaRows }, { data: misRows }] = await Promise.all([
    service.from("terratalento_recolectores").select("*").eq("profile_id", user.id).maybeSingle(),
    service
      .from("terratalento_jornadas")
      .select(`id, fecha_inicio, fecha_fin, cupos, estado, ${TERMINOS_COLS}, fincas(name, municipio, vereda)`)
      .in("estado", ["abierta", "en_gestion"])
      .order("fecha_inicio", { ascending: true }),
    service.from("terratalento_postulaciones").select("jornada_id, estado").eq("recolector_id", user.id),
  ]);

  const jornadaIds = (jornadaRows ?? []).map((j) => (j as Record<string, unknown>).id as string);
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

  const mapJornada = (raw: Record<string, unknown>): JornadaPublica => {
    const finca = raw.fincas as { name: string; municipio: string | null; vereda: string | null } | null;
    const id = raw.id as string;
    return {
      id,
      fincaNombre: finca?.name ?? "Finca de la red",
      fincaMunicipio: finca?.municipio ?? "",
      fincaVereda: finca?.vereda ?? "",
      fechaInicio: raw.fecha_inicio as string,
      fechaFin: (raw.fecha_fin as string | null) ?? null,
      cupos: Number(raw.cupos),
      confirmados: confirmadosByJornada.get(id) ?? 0,
      estado: raw.estado as string,
      miPostulacion: miEstado.get(id) ?? null,
      terminos: pickTerminos(raw),
    };
  };

  const todas = ((jornadaRows ?? []) as unknown as Record<string, unknown>[]).map(mapJornada);

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
          contactoEmergenciaNombre: String(perfilRow.contacto_emergencia_nombre ?? ""),
          contactoEmergenciaCelular: String(perfilRow.contacto_emergencia_celular ?? ""),
          medioPago: String(perfilRow.medio_pago ?? ""),
        }
      : null,
    abiertas: todas.filter((j) => !j.miPostulacion || j.miPostulacion === "retirado"),
    misPostulaciones: todas.filter((j) => j.miPostulacion && j.miPostulacion !== "retirado"),
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
  contactoEmergenciaNombre: string;
  contactoEmergenciaCelular: string;
  medioPago: string;
};

export async function guardarPerfilRecolector(input: PerfilInput): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo." };

  // La matriz de membresías (owner, 2026-08-02): un productor o un comprador
  // real no puede ser también recolector — se le explica el porqué. Solo aplica
  // al CREAR el perfil; editar uno existente nunca se bloquea.
  const service0 = createServiceRoleClient();
  const { data: yaExiste } = await service0
    .from("terratalento_recolectores")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!yaExiste) {
    const veredicto = await puedeSer(user.id, "recolector");
    if (!veredicto.permitido) return { ok: false, error: veredicto.motivo };
  }

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
      contacto_emergencia_nombre: clamp(input.contactoEmergenciaNombre, 120) || null,
      contacto_emergencia_celular: clamp(input.contactoEmergenciaCelular, 40) || null,
      medio_pago: clamp(input.medioPago, 120) || null,
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

/** V2: postularse EXIGE aceptar los términos publicados de la jornada. */
export async function postularJornada(jornadaId: string, aceptaTerminos: boolean): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo." };
  if (!aceptaTerminos) return { ok: false, error: "Debes marcar que entiendes los términos de la jornada." };
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

  const aceptado = new Date().toISOString();
  const { data: existing } = await service
    .from("terratalento_postulaciones")
    .select("id, estado")
    .eq("jornada_id", jornadaId)
    .eq("recolector_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await service
      .from("terratalento_postulaciones")
      .insert({ jornada_id: jornadaId, recolector_id: user.id, terminos_aceptados_at: aceptado });
    if (error) return { ok: false, error: "No se pudo registrar tu postulación." };
    return { ok: true };
  }
  if (existing.estado === "retirado") {
    const { error } = await service
      .from("terratalento_postulaciones")
      .update({ estado: "postulado", terminos_aceptados_at: aceptado })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "No se pudo registrar tu postulación." };
    return { ok: true };
  }
  if (existing.estado === "descartado") return { ok: false, error: "Esta jornada ya no está disponible para ti." };
  return { ok: true };
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

/** Los datos de MI constancia (solo si mi cupo está confirmado). */
export async function miConstancia(jornadaId: string): Promise<ConstanciaInput | null> {
  const user = await sessionUser();
  if (!user) return null;
  const service = createServiceRoleClient();

  const { data: post } = await service
    .from("terratalento_postulaciones")
    .select("id, estado, terminos_snapshot, acuerdo_emitido_at, created_at")
    .eq("jornada_id", jornadaId)
    .eq("recolector_id", user.id)
    .maybeSingle();
  if (!post || post.estado !== "confirmado") return null;

  const [{ data: jornada }, { data: yo }] = await Promise.all([
    service
      .from("terratalento_jornadas")
      .select(`id, fecha_inicio, fecha_fin, producer_id, ${TERMINOS_COLS}, fincas(name, municipio, vereda)`)
      .eq("id", jornadaId)
      .maybeSingle(),
    service.from("terratalento_recolectores").select("nombre, cedula, celular").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!jornada || !yo) return null;

  const j = jornada as unknown as Record<string, unknown>;
  const finca = j.fincas as { name: string; municipio: string | null; vereda: string | null } | null;
  const { data: productor } = await service.from("profiles").select("full_name").eq("id", j.producer_id as string).maybeSingle();

  return {
    folio: `TT-${jornadaId.slice(0, 8).toUpperCase()}`,
    fincaNombre: finca?.name ?? "Finca de la red",
    fincaUbicacion: [finca?.vereda, finca?.municipio].filter(Boolean).join(", "),
    productorNombre: String(productor?.full_name ?? "Responsable de la finca"),
    recolectorNombre: String(yo.nombre ?? ""),
    recolectorCedula: (yo.cedula as string | null) ?? null,
    recolectorCelular: String(yo.celular ?? ""),
    fechaInicio: j.fecha_inicio as string,
    fechaFin: (j.fecha_fin as string | null) ?? null,
    acordadoEl: String(post.acuerdo_emitido_at ?? post.created_at),
    terminos: (post.terminos_snapshot as Record<string, unknown>) ?? pickTerminos(j),
  };
}

// ── Lado productor (Kaffetal Regal) ─────────────────────────────────────────

export async function misJornadasRecolecta(): Promise<ProducerJornada[]> {
  const user = await sessionUser();
  if (!user) return [];
  const service = createServiceRoleClient();

  const { data: rows } = await service
    .from("terratalento_jornadas")
    .select(`id, finca_id, fecha_inicio, fecha_fin, cupos, estado, ${TERMINOS_COLS}, fincas(name)`)
    .eq("producer_id", user.id)
    .order("created_at", { ascending: false });
  const jornadas = (rows ?? []) as unknown as Record<string, unknown>[];
  if (!jornadas.length) return [];

  const ids = jornadas.map((j) => j.id as string);
  const { data: postRows } = await service
    .from("terratalento_postulaciones")
    .select("jornada_id, estado, recolector_id")
    .in("jornada_id", ids);
  const posts = (postRows ?? []) as { jornada_id: string; estado: string; recolector_id: string }[];

  // §5.1 · el roster que ve la finca: SOLO confirmados, SOLO nombre y celular.
  const confirmadosIds = [...new Set(posts.filter((p) => p.estado === "confirmado").map((p) => p.recolector_id))];
  const contactos = new Map<string, ConfirmadoLite>();
  if (confirmadosIds.length) {
    const { data: recs } = await service
      .from("terratalento_recolectores")
      .select("profile_id, nombre, celular")
      .in("profile_id", confirmadosIds);
    for (const r of recs ?? []) {
      contactos.set(r.profile_id as string, { nombre: String(r.nombre ?? ""), celular: String(r.celular ?? "") });
    }
  }

  const counts = new Map<string, { postulados: number; llamados: number; confirmados: number }>();
  const roster = new Map<string, ConfirmadoLite[]>();
  for (const p of posts) {
    const c = counts.get(p.jornada_id) ?? { postulados: 0, llamados: 0, confirmados: 0 };
    if (p.estado === "postulado") c.postulados += 1;
    if (p.estado === "llamado") c.llamados += 1;
    if (p.estado === "confirmado") {
      c.confirmados += 1;
      const contacto = contactos.get(p.recolector_id);
      if (contacto) roster.set(p.jornada_id, [...(roster.get(p.jornada_id) ?? []), contacto]);
    }
    counts.set(p.jornada_id, c);
  }

  return jornadas.map((j) => {
    const id = j.id as string;
    const finca = j.fincas as { name: string } | null;
    return {
      id,
      fincaId: j.finca_id as string,
      fincaNombre: finca?.name ?? "—",
      fechaInicio: j.fecha_inicio as string,
      fechaFin: (j.fecha_fin as string | null) ?? null,
      cupos: Number(j.cupos),
      estado: j.estado as string,
      ...(counts.get(id) ?? { postulados: 0, llamados: 0, confirmados: 0 }),
      rosterConfirmados: roster.get(id) ?? [],
      terminos: pickTerminos(j),
    };
  });
}

export type JornadaInput = {
  fincaId: string;
  fechaInicio: string;
  fechaFin: string;
  cupos: string;
  // Pago
  pagoModalidad: string;
  pagoValor: string;
  pagoUnidad: string;
  pagoForma: string;
  pagoFrecuencia: string;
  pagoNota: string;
  // Qué incluye
  alojamiento: boolean;
  alojamientoDetalle: string;
  alimentacion: boolean;
  alimentacionDetalle: string;
  transporte: boolean;
  transporteDetalle: string;
  // Trabajo
  horario: string;
  duracionEstimadaDias: string;
  requisitos: string;
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

  const modalidad = clamp(input.pagoModalidad, 20);
  if (modalidad && !["por_kilo", "jornal", "mixto"].includes(modalidad)) {
    return { ok: false, error: "Modalidad de pago inválida." };
  }
  const valorRaw = clamp(input.pagoValor, 12);
  const pagoValor = valorRaw === "" ? null : Number(valorRaw);
  if (pagoValor !== null && (!Number.isFinite(pagoValor) || pagoValor < 0)) {
    return { ok: false, error: "El valor del pago debe ser un número positivo." };
  }
  const duracionRaw = clamp(input.duracionEstimadaDias, 4);
  const duracion = duracionRaw === "" ? null : Number(duracionRaw);
  if (duracion !== null && (!Number.isInteger(duracion) || duracion < 1 || duracion > 365)) {
    return { ok: false, error: "La duración estimada debe ser un número de días entre 1 y 365." };
  }

  const { error } = await service.from("terratalento_jornadas").insert({
    finca_id: finca.id,
    producer_id: user.id,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    cupos,
    pago_modalidad: modalidad || null,
    pago_valor: pagoValor,
    pago_unidad: clamp(input.pagoUnidad, 20) || null,
    pago_forma: clamp(input.pagoForma, 20) || null,
    pago_frecuencia: clamp(input.pagoFrecuencia, 20) || null,
    pago: clamp(input.pagoNota, 200) || null,
    alojamiento: !!input.alojamiento,
    alojamiento_detalle: clamp(input.alojamientoDetalle, 200) || null,
    alimentacion: !!input.alimentacion,
    alimentacion_detalle: clamp(input.alimentacionDetalle, 200) || null,
    transporte: !!input.transporte,
    transporte_detalle: clamp(input.transporteDetalle, 200) || null,
    horario: clamp(input.horario, 200) || null,
    duracion_estimada_dias: duracion,
    requisitos: clamp(input.requisitos, 500) || null,
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
