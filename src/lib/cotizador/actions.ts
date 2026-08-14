"use server";

// ── OCP · Cotizaciones · Server Actions ──────────────────────────────────────
// Compartidas por los DOS cotizadores. La matemática de cada uno vive en su
// propio módulo (`./lote/model`, y el logístico cuando llegue el HTML); aquí
// solo se guarda, se numera, se emite y se busca a quién va dirigida.
//
// Gate: `requireConsoleWrite("ocp")` — un colaborador con grant solo de BCP no
// emite cotizaciones del OCP ni llamando la action a mano.
//
// ⚠️ En un módulo "use server" TODO export tiene que ser una función async
// (lección del 2026-07-30) — los tipos se importan desde ./types.

import { revalidatePath } from "next/cache";
import { requireConsoleWrite, quoteServiceClient } from "@/lib/panel/requireConsoleWrite";
import { emitEvent } from "@/lib/integraciones/emit";
import { QUOTE_BASE_PATH } from "./types";
import type { Counterparty, CounterpartyKind, CounterpartyOption, Quote, QuoteKind, QuoteResult, QuoteStatus, QuoteSummary } from "./types";

const NO_AUTH: QuoteResult = { ok: false, error: "Tu sesión del OCP no está activa. Vuelve a iniciar sesión." };

type Row = {
  id: string; kind: QuoteKind; code: string; title: string; status: QuoteStatus;
  counterparty_kind: CounterpartyKind; profile_id: string | null; lead_id: string | null;
  contact_name: string | null; contact_email: string | null;
  inputs: Record<string, unknown> | null; results: Record<string, unknown> | null;
  currency: string; total: string | number | null; unit_label: string | null;
  notes: string | null; valid_until: string | null;
  created_by: string | null; created_at: string; updated_at: string;
  issued_at: string | null; decided_at: string | null; change_log: unknown;
  nota_comercial: string | null; nota_comercial_at: string | null;
  notion_url: string | null; notion_synced_at: string | null;
  profiles?: { full_name: string | null; email: string | null } | null;
};

const LIST_COLS =
  "id, kind, code, title, status, counterparty_kind, profile_id, lead_id, contact_name, contact_email, " +
  "currency, total, unit_label, notes, valid_until, created_by, created_at, updated_at, issued_at, decided_at, change_log, " +
  "nota_comercial, nota_comercial_at, notion_url, notion_synced_at, " +
  "profiles:profile_id(full_name, email)";

function toCounterparty(r: Row): Counterparty {
  return {
    kind: r.counterparty_kind,
    profileId: r.profile_id,
    leadId: r.lead_id,
    name: r.contact_name,
    email: r.contact_email,
    currentName: r.profiles?.full_name ?? null,
  };
}

function toSummary(r: Row): QuoteSummary {
  return {
    id: r.id, kind: r.kind, code: r.code, title: r.title, status: r.status,
    counterparty: toCounterparty(r),
    currency: r.currency,
    total: r.total === null ? null : Number(r.total),
    unitLabel: r.unit_label, notes: r.notes, validUntil: r.valid_until,
    createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
    issuedAt: r.issued_at, decidedAt: r.decided_at,
    changeLog: Array.isArray(r.change_log) ? (r.change_log as QuoteSummary["changeLog"]) : [],
    // El espejo de Notion. Se lee aquí, no se escribe: lo pone `aplicar.ts`
    // cuando Make devuelve la página o la nota del comercial.
    notaComercial: r.nota_comercial,
    notaComercialAt: r.nota_comercial_at,
    notionUrl: r.notion_url,
    notionSyncedAt: r.notion_synced_at,
  };
}

// ---------- Lectura ----------

export async function listQuotes(kind: QuoteKind): Promise<QuoteSummary[] | null> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return null;
  const service = quoteServiceClient();
  const { data } = await service.from("quotes").select(LIST_COLS).eq("kind", kind).order("created_at", { ascending: false }).limit(200);
  return ((data ?? []) as unknown as Row[]).map(toSummary);
}

/** Las cifras guardadas de cada cotización de un módulo, en UNA consulta.
 *  Para el Cuadro de evaluación: `listQuotes` deja fuera los jsonb pesados a
 *  propósito, y pedir `getQuote` de cada fila serían N viajes para pintar una
 *  comparación. Aquí solo viaja `results`, que son las cifras del titular. */
export async function listQuoteMetrics(
  kind: QuoteKind,
): Promise<{ id: string; code: string; title: string; status: QuoteStatus; total: number | null; createdAt: string; results: Record<string, unknown> }[] | null> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return null;
  const service = quoteServiceClient();
  const { data } = await service
    .from("quotes")
    .select("id, code, title, status, total, valid_until, created_at, results")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as unknown as (Row & { results: Record<string, unknown> | null })[]).map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    status: effectiveStatusOf(r.status, r.valid_until),
    total: r.total === null ? null : Number(r.total),
    createdAt: r.created_at,
    results: r.results ?? {},
  }));
}

/** La misma regla que `effectiveStatus` del cliente, aplicada al leer. */
function effectiveStatusOf(status: QuoteStatus, validUntil: string | null): QuoteStatus {
  if (status !== "emitida" || !validUntil) return status;
  const d = new Date(`${validUntil}T23:59:59`);
  return Number.isFinite(d.getTime()) && d < new Date() ? "vencida" : status;
}

export async function getQuote(id: string): Promise<Quote | null> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return null;
  const service = quoteServiceClient();
  const { data } = await service.from("quotes").select(`${LIST_COLS}, inputs, results`).eq("id", id).maybeSingle();
  if (!data) return null;
  const r = data as unknown as Row;
  return { ...toSummary(r), inputs: r.inputs ?? {}, results: r.results ?? {} };
}

// ---------- Alta y guardado ----------

export async function createQuote(kind: QuoteKind, title: string): Promise<QuoteResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  if (!title.trim()) return { ok: false, error: "La cotización necesita un título." };

  const service = quoteServiceClient();
  // El código lo pone el trigger `quotes_assign_code`, no la app.
  const { data, error } = await service.from("quotes").insert({ kind, title: title.trim(), created_by: who.userId }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(QUOTE_BASE_PATH[kind]);
  return { ok: true, id: data.id as string };
}

/** Guarda el borrador. El trigger rechaza esto si ya se emitió. */
export async function saveQuoteDraft(
  id: string,
  patch: {
    title?: string;
    inputs?: Record<string, unknown>;
    results?: Record<string, unknown>;
    total?: number | null;
    unitLabel?: string | null;
    currency?: string;
    notes?: string | null;
    validUntil?: string | null;
  }
): Promise<QuoteResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const service = quoteServiceClient();

  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    if (!patch.title.trim()) return { ok: false, error: "El título no puede quedar vacío." };
    row.title = patch.title.trim();
  }
  if (patch.inputs !== undefined) row.inputs = patch.inputs;
  if (patch.results !== undefined) row.results = patch.results;
  if (patch.total !== undefined) row.total = patch.total;
  if (patch.unitLabel !== undefined) row.unit_label = patch.unitLabel;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.notes !== undefined) row.notes = patch.notes?.trim() || null;
  if (patch.validUntil !== undefined) row.valid_until = patch.validUntil || null;
  if (Object.keys(row).length === 0) return { ok: true };

  const { error } = await service.from("quotes").update(row).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Fija el destinatario. El nombre se COPIA: la cotización tiene que seguir
 *  diciendo a quién se le hizo aunque el perfil cambie o desaparezca. */
export async function setQuoteCounterparty(
  id: string,
  cp: { kind: CounterpartyKind; profileId?: string | null; leadId?: string | null; name?: string | null; email?: string | null }
): Promise<QuoteResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const service = quoteServiceClient();

  if (cp.kind === "externo" && !cp.name?.trim()) return { ok: false, error: "Escribe a nombre de quién va la cotización." };

  const { error } = await service
    .from("quotes")
    .update({
      counterparty_kind: cp.kind,
      profile_id: cp.kind === "productor" || cp.kind === "comprador" ? (cp.profileId ?? null) : null,
      lead_id: cp.kind === "lead" ? (cp.leadId ?? null) : null,
      contact_name: cp.name?.trim() || null,
      contact_email: cp.email?.trim() || null,
    })
    .eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Renombrar. Solo mientras sea borrador: el nombre viaja en el documento y en
 *  el código que se citó fuera, así que una emitida no cambia de nombre — se
 *  reabre primero. */
export async function renameQuote(id: string, title: string): Promise<QuoteResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  if (!title.trim()) return { ok: false, error: "El nombre no puede quedar vacío." };
  const service = quoteServiceClient();
  const { data: q } = await service.from("quotes").select("status, kind").eq("id", id).maybeSingle();
  if (!q) return { ok: false, error: "La cotización no existe." };
  if (q.status !== "borrador") return { ok: false, error: "Reábrela para poder cambiarle el nombre." };
  const { error } = await service.from("quotes").update({ title: title.trim() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(QUOTE_BASE_PATH[q.kind as QuoteKind]);
  return { ok: true };
}

/** Reabrir una cotización ya emitida para corregirla. Deja rastro SIEMPRE — el
 *  trigger rechaza la reapertura si la bitácora no creció — y ese rastro se
 *  imprime al final de los documentos que se generen después. */
export async function reopenQuote(id: string, note: string): Promise<QuoteResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const service = quoteServiceClient();

  const { data: q } = await service.from("quotes").select("status, change_log, code").eq("id", id).maybeSingle();
  if (!q) return { ok: false, error: "La cotización no existe." };
  if (q.status === "borrador") return { ok: false, error: "Ya está en borrador." };

  const { data: me } = await service.from("profiles").select("full_name, email").eq("id", who.userId).maybeSingle();
  const log = Array.isArray(q.change_log) ? (q.change_log as unknown[]) : [];
  const entry = {
    at: new Date().toISOString(),
    action: `Reabierta desde «${q.status}»`,
    note: note.trim() || null,
    by: (me?.full_name as string | null) ?? (me?.email as string | null) ?? null,
  };

  const { error } = await service.from("quotes").update({ status: "borrador", change_log: [...log, entry] }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------- Ciclo de vida ----------

export async function issueQuote(id: string): Promise<QuoteResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const service = quoteServiceClient();
  // El trigger exige total y congela el cálculo a partir de aquí.
  const { data, error } = await service
    .from("quotes")
    .update({ status: "emitida" })
    .eq("id", id)
    .eq("status", "borrador")
    .select("code, kind, title, currency, total, unit_label, valid_until, issued_at, contact_name, contact_email, counterparty_kind")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  // Emitir es lo que dispara el espejo de Notion (F2). Va DESPUÉS de que el
  // update haya ido bien y no puede tumbarlo: `emitEvent` nunca lanza, y si
  // Notion o Make están caídos la cotización ya está emitida igual.
  if (data) {
    await emitEvent({
      dominio: "ventas_marketing",
      tipo: "cotizacion.emitida",
      payload: {
        // El código es el `ctc_id` del espejo: único, estable y legible en
        // Notion sin tener que mirar un uuid.
        ctc_id: data.code,
        kind: data.kind,
        title: data.title,
        counterparty_kind: data.counterparty_kind,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        currency: data.currency,
        total: data.total === null ? null : Number(data.total),
        unit_label: data.unit_label,
        valid_until: data.valid_until,
        issued_at: data.issued_at,
        // Para poder volver del espejo al original de un clic.
        url: `https://www.ctcexport.com${QUOTE_BASE_PATH[data.kind as QuoteKind]}`,
      },
    });
  }
  return { ok: true };
}

export async function decideQuote(id: string, decision: "aceptada" | "rechazada"): Promise<QuoteResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const service = quoteServiceClient();
  const { error } = await service.from("quotes").update({ status: decision }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Rehacer una emitida = duplicarla. Es la salida que ofrece el trigger cuando
 *  alguien intenta recalcular algo ya emitido. */
export async function duplicateQuote(id: string): Promise<QuoteResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const service = quoteServiceClient();

  const { data: src } = await service.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!src) return { ok: false, error: "La cotización no existe." };

  const { data, error } = await service
    .from("quotes")
    .insert({
      kind: src.kind,
      title: `${src.title} (copia)`,
      counterparty_kind: src.counterparty_kind,
      profile_id: src.profile_id,
      lead_id: src.lead_id,
      contact_name: src.contact_name,
      contact_email: src.contact_email,
      inputs: src.inputs,
      results: src.results,
      currency: src.currency,
      total: src.total,
      unit_label: src.unit_label,
      notes: src.notes,
      created_by: who.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(QUOTE_BASE_PATH[src.kind as QuoteKind]);
  return { ok: true, id: data.id as string };
}

/** Borrar cualquiera (decisión del owner, 2026-08-04). El aviso lo da la
 *  interfaz; aquí se exige confirmación explícita para que una llamada suelta a
 *  la action no pueda borrar una cotización emitida por accidente. */
export async function deleteQuote(id: string, confirm: true): Promise<QuoteResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  if (confirm !== true) return { ok: false, error: "Falta la confirmación." };
  const service = quoteServiceClient();
  const { data: q } = await service.from("quotes").select("kind").eq("id", id).maybeSingle();
  if (!q) return { ok: false, error: "La cotización no existe." };
  const { error } = await service.from("quotes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(QUOTE_BASE_PATH[q.kind as QuoteKind]);
  return { ok: true };
}

// ---------- Buscador de destinatarios ----------

/** Busca en productores, compradores y leads a la vez. Un cotizador de lotes
 *  suele apuntar a un productor y el logístico a un comprador, pero ninguno de
 *  los dos lo impone: la vía CaaS cotiza logística para un productor. */
export async function searchCounterparties(term: string): Promise<CounterpartyOption[]> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return [];
  const q = term.trim();
  if (q.length < 2) return [];
  const service = quoteServiceClient();
  const like = `%${q}%`;

  const [{ data: profs }, { data: leads }] = await Promise.all([
    service.from("profiles").select("id, full_name, email, role, producer_profiles(company_name), buyer_profiles(company_name)")
      .or(`full_name.ilike.${like},email.ilike.${like}`)
      .in("role", ["producer", "buyer"])
      .limit(20),
    service.from("leads").select("id, nombre, email, pillar").or(`nombre.ilike.${like},email.ilike.${like}`).limit(10),
  ]);

  type ProfRow = {
    id: string; full_name: string | null; email: string | null; role: string;
    producer_profiles: { company_name: string | null } | { company_name: string | null }[] | null;
    buyer_profiles: { company_name: string | null } | { company_name: string | null }[] | null;
  };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const out: CounterpartyOption[] = ((profs ?? []) as unknown as ProfRow[]).map((p) => {
    const isProducer = p.role === "producer";
    const company = one(isProducer ? p.producer_profiles : p.buyer_profiles)?.company_name ?? null;
    return {
      kind: (isProducer ? "productor" : "comprador") as CounterpartyKind,
      profileId: p.id,
      leadId: null,
      name: p.full_name ?? p.email ?? "(sin nombre)",
      email: p.email,
      hint: company,
    };
  });

  for (const l of (leads ?? []) as { id: string; nombre: string | null; email: string | null; pillar: string }[]) {
    out.push({ kind: "lead", profileId: null, leadId: l.id, name: l.nombre ?? l.email ?? "(sin nombre)", email: l.email, hint: `lead · ${l.pillar}` });
  }
  return out;
}
