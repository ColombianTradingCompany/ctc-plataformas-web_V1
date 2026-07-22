// ── Mapa de Trabajo · modelo de datos ────────────────────────────────────────
// El mapa interactivo del ECP (/ecp/mapa): cómo se construyen las tablas unas
// sobre otras a través de las compuertas del proceso (FT → FT2 → EUDR → EVA →
// MUE → Sondeo → Arena → GAL, más comercio / club / leads), y EN QUÉ UI(s) se
// muestra cada tabla. La estructura es real (semilla curada abajo); el owner la
// reordena cosméticamente y guarda. Sin librerías: se dibuja en SVG a mano.
//
// Coordenadas: x,y son el CENTRO del nodo (facilita anclar las flechas). Las
// bandas de etapa (stages) viven al fondo del lienzo y solo etiquetan tramos.

export type StageTint = "free" | "paid" | "support";
export type MapStage = { id: string; label: string; x0: number; x1: number; tint?: StageTint };

// table = tabla/registro · decision = compuerta · stop = alto del proceso
// milestone = punto de equilibrio / entrega (EVA, GAL) — los dos "puntos de parada".
// artifact = documento de cumplimiento que PRODUCE una compuerta (dossier EUDR de
//   finca, certificado EUDR de lote) — no es una tabla, es un entregable impreso.
export type MapNodeKind = "table" | "decision" | "stop" | "milestone" | "artifact";

// Catálogo de UIs seleccionables (dropdown en el panel del nodo). Agrupado por
// superficie; el owner puede además escribir una UI a mano ("otra…").
export const UI_CATALOG: { group: string; items: string[] }[] = [
  { group: "Kaffetal Regal (productor)", items: ["KR · Información general", "KR · Mis Fincas", "KR · Mis Lotes", "KR · Ficha", "KR · Panel", "KR · postulación", "KR · Mis contratos"] },
  { group: "Cherry Picked (comprador)", items: ["CP · tienda", "CP · Catálogo", "CP · checkout", "CP · Cuenta", "CP · membresía", "CP · Subastas"] },
  { group: "BCP", items: ["BCP · Panel", "BCP · Productores", "BCP · Fincas", "BCP · Lotes", "BCP · Nominados", "BCP · Arena", "BCP · Galardonados", "BCP · Catálogo", "BCP · Contratos", "BCP · Kaffetal Club", "BCP · códigos"] },
  { group: "ECP", items: ["ECP · Buzón", "ECP · Usuarios y credenciales", "ECP · Herramientas", "ECP · Documentación", "ECP · Mapa de Trabajo"] },
  { group: "OCP", items: ["OCP · Leads CTC Home", "OCP · Socios de la red"] },
  { group: "Otros", items: ["CTC Home", "Auth · todas las cuentas", "(interno)"] },
];
export const UI_OPTIONS: string[] = UI_CATALOG.flatMap((g) => g.items);
export type MapNode = {
  id: string;
  kind: MapNodeKind;
  label: string;
  /** Nombre real de la tabla (solo nodos 'table'), por si se quiere cotejar. */
  tableName?: string;
  /** UI(s) donde se muestra esta tabla. */
  uis?: string[];
  /** Etapa a la que pertenece (informativo). */
  stageId?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
};

export type EdgeTone = "ok" | "bad" | "info";
export type MapEdge = { id: string; from: string; to: string; tone?: EdgeTone; label?: string };

export type WorkMapConfig = { stages: MapStage[]; nodes: MapNode[]; edges: MapEdge[] };

/** Metadatos de una propuesta guardada (para la lista, sin el config completo). */
export type ProposalMeta = { id: string; name: string; note: string | null; updatedAt: string };

export const NODE_W = 168;
export const NODE_H = 62;
export const DECISION_SIZE = 118;
export const CANVAS_W = 3680;
export const CANVAS_H = 1440;
export const BAND_Y = 1300; // los rótulos de etapa arrancan aquí

// ── Semilla curada ───────────────────────────────────────────────────────────
const t = (
  id: string,
  label: string,
  tableName: string,
  uis: string[],
  stageId: string,
  x: number,
  y: number,
): MapNode => ({ id, kind: "table", label, tableName, uis, stageId, x, y });

const d = (id: string, label: string, stageId: string, x: number, y: number): MapNode => ({
  id,
  kind: "decision",
  label,
  stageId,
  x,
  y,
});

// Alto del proceso (punto de parada): un lote que sale del flujo.
const st = (id: string, label: string, stageId: string, x: number, y: number, uis: string[] = []): MapNode => ({
  id,
  kind: "stop",
  label,
  stageId,
  x,
  y,
  uis,
});

// Hito / entrega (EVA, GAL): los dos puntos de equilibrio con entrega al productor.
const ms = (id: string, label: string, tableName: string | null, uis: string[], stageId: string, x: number, y: number): MapNode => ({
  id,
  kind: "milestone",
  label,
  tableName: tableName ?? undefined,
  uis,
  stageId,
  x,
  y,
});

// Documento / artefacto de cumplimiento que produce una compuerta (dossier EUDR de
// finca, certificado EUDR de lote): no es tabla, es un entregable impreso.
const af = (id: string, label: string, uis: string[], stageId: string, x: number, y: number): MapNode => ({
  id,
  kind: "artifact",
  label,
  uis,
  stageId,
  x,
  y,
});

// Tramo GRATIS (FT→FT2→EUDR→VID→EVA) · tramo PAGADO (MUE→Sondeo→Arena→GAL, COP 80.000)
// · soporte (comercio/club/leads/plataforma). EVA y GAL son los dos puntos de equilibrio.
const STAGES: MapStage[] = [
  { id: "cuenta", label: "Cuenta", x0: 40, x1: 250, tint: "free" },
  { id: "ft", label: "FT · Finca + EUDR", x0: 270, x1: 480, tint: "free" },
  { id: "ft2", label: "FT2 · Lote", x0: 500, x1: 720, tint: "free" },
  { id: "eudr", label: "EUDR · Lote", x0: 740, x1: 960, tint: "free" },
  { id: "vid", label: "VID · Video", x0: 980, x1: 1160, tint: "free" },
  { id: "eva", label: "EVA · Evaluación", x0: 1180, x1: 1440, tint: "free" },
  { id: "mue", label: "MUE · Pago + Muestra", x0: 1460, x1: 1680, tint: "paid" },
  { id: "sondeo", label: "Sondeo", x0: 1700, x1: 1940, tint: "paid" },
  { id: "arena", label: "Arena", x0: 1960, x1: 2220, tint: "paid" },
  { id: "gal", label: "GAL · Galardón", x0: 2240, x1: 2460, tint: "paid" },
  { id: "comercio", label: "Comercio", x0: 2480, x1: 2860, tint: "support" },
  { id: "club", label: "Kaffetal Club", x0: 2880, x1: 3100, tint: "support" },
  { id: "leads", label: "Leads · Buzón", x0: 3120, x1: 3350, tint: "support" },
  { id: "plataforma", label: "Plataforma", x0: 3370, x1: 3600, tint: "support" },
];

const NODES: MapNode[] = [
  // Cuenta
  t("profiles", "profiles", "profiles", ["Auth · todas las cuentas"], "cuenta", 145, 170),
  t("producer_profiles", "producer_profiles", "producer_profiles", ["KR · Información general", "BCP · Productores"], "cuenta", 145, 320),
  t("buyer_profiles", "buyer_profiles", "buyer_profiles", ["CP · Cuenta"], "cuenta", 145, 470),
  // FT · Finca + EUDR de finca — compuerta PROPIA de la finca: BCP la aprueba en
  // /bcp/fincas (fincaEudrStatus: apta / pendiente / no apta) y produce el DOSSIER
  // EUDR de finca. Es aguas-arriba del lote: una finca no apta bloquea su EUDR.
  t("fincas", "fincas", "fincas", ["KR · Mis Fincas", "BCP · Fincas"], "ft", 375, 250),
  t("media_assets", "media_assets", "media_assets", ["KR · Fincas/Lotes", "BCP · Arena (jornada)"], "ft", 200, 395),
  d("finca_eudr_gate", "¿Finca apta EUDR?", "ft", 375, 470),
  af("finca_dossier", "Dossier EUDR · finca", ["KR · Mis Fincas", "BCP · Fincas"], "ft", 275, 680),
  st("finca_stop", "Finca no apta · corregir", "ft", 495, 680, ["BCP · Fincas", "KR · Mis Fincas"]),
  // FT2 · Lote
  t("lots", "lots", "lots", ["KR · Mis Lotes", "BCP · Lotes", "BCP · Galardonados", "CP · Catálogo"], "ft2", 610, 250),
  t("ficha_snap", "ficha_completion_snapshots", "ficha_completion_snapshots", ["KR · Ficha"], "ft2", 610, 410),
  // EUDR · Lote — compuerta PROPIA del lote y DEPENDIENTE de la finca: riesgo
  // Art. 10-11 (lotEudrStatus: bloqueado por finca / en revisión / eudr_ready) sobre
  // finca(s) de origen aptas → produce el CERTIFICADO EUDR de lote. El veredicto lo
  // cierra BCP dentro de EVA (1 de los 5 ítems del checklist), no antes.
  d("lot_eudr_gate", "¿Lote apto EUDR? (riesgo Art. 10-11)", "eudr", 850, 250),
  af("lot_certificate", "Certificado EUDR · lote", ["KR · Mis Lotes", "BCP · Lotes"], "eudr", 740, 490),
  st("lot_eudr_stop", "Bloqueado por finca / en revisión", "eudr", 970, 490, ["KR · Mis Lotes", "BCP · Lotes"]),
  // VID · video del lote (lots.video_asset_id + media_assets)
  t("vid", "Video del lote", "media_assets", ["KR · Mis Lotes", "BCP · Lotes"], "vid", 1070, 250),
  // EVA · veredicto documental (HITO / entrega: informe EUDR). Lee lots(eva_checklist,
  // eva_verdict) + fincas → stage apto/no_apto. NO es lot_evaluations.
  ms("eva", "EVA · veredicto documental", "lots", ["BCP · Lotes (checklist EVA)", "KR · Mis Lotes"], "eva", 1310, 230),
  st("eva_stop", "No Apto · fuera de Arena (con motivo)", "eva", 1310, 460, ["KR · Mis Lotes", "BCP · Lotes"]),
  // MUE · postulación (pago + muestra 2 kg) — arranca el tramo PAGADO
  t("arena_inscriptions", "arena_inscriptions", "arena_inscriptions", ["BCP · Nominados", "BCP · Arena", "KR · Panel"], "mue", 1570, 250),
  t("arena_entry_codes", "arena_entry_codes", "arena_entry_codes", ["BCP · códigos", "KR · postulación"], "mue", 1570, 420),
  // Sondeo · bache de laboratorio
  t("sondeo_batches", "sondeo_batches", "sondeo_batches", ["BCP · Nominados (Baches)"], "sondeo", 1820, 230),
  d("sondeo_gate", "Sondeo Apto / No Apto", "sondeo", 1820, 430),
  st("retiro_stop", "No Apto · resultado + feedback + 80% cashback", "sondeo", 1820, 660, ["KR · Panel", "BCP · Nominados (cashback)"]),
  // Arena · la jornada
  t("arena_sessions", "arena_sessions", "arena_sessions", ["BCP · Arena"], "arena", 2090, 175),
  t("arena_session_lots", "arena_session_lots", "arena_session_lots", ["BCP · Arena (sesión)"], "arena", 2090, 320),
  t("arena_scores", "arena_scores", "arena_scores", ["BCP · Arena (jornada)"], "arena", 2090, 465),
  d("grade_gate", "Grado CTC", "arena", 2090, 630),
  // lot_evaluations · REGISTRO de puntajes SCA (reclamos del productor + planillas de jornada)
  t("lot_evaluations", "lot_evaluations", "lot_evaluations", ["BCP · Arena (reclamos)", "KR · Ficha (SCA declarado)"], "arena", 2090, 820),
  // GAL · Galardón (HITO / entrega: evaluación Q-Grader — granulometría + perfil + Arena).
  // lots.grade + stage=galardonado.
  ms("gal", "GAL · Galardón + evaluación Q-Grader", "lots", ["BCP · Galardonados", "CP · Catálogo / Subastas"], "gal", 2350, 250),
  // Comercio
  t("lot_listings", "lot_listings", "lot_listings", ["BCP · Catálogo", "CP · tienda"], "comercio", 2670, 170),
  t("purchase_contracts", "purchase_contracts", "purchase_contracts", ["BCP · Contratos", "KR · Mis contratos"], "comercio", 2670, 320),
  t("orders", "orders / order_items", "orders", ["CP · checkout", "OCP"], "comercio", 2670, 470),
  t("black_negotiations", "black_negotiations", "black_negotiations", ["BCP · Contratos"], "comercio", 2670, 620),
  t("contract_releases", "contract_releases / humidity_readings", "contract_releases", ["BCP · Contratos / Humedad", "KR · Mis contratos"], "comercio", 2670, 790),
  // Kaffetal Club
  t("club_campaigns", "club_campaigns", "club_campaigns", ["BCP · Kaffetal Club"], "club", 2990, 190),
  t("club_member_codes", "club_member_codes", "club_member_codes", ["BCP · Kaffetal Club", "KR · Mis contratos"], "club", 2990, 340),
  t("points_ledger", "points_ledger", "points_ledger", ["CP · membresía"], "club", 2990, 490),
  // Leads · Buzón
  t("leads", "leads", "leads", ["OCP · Leads CTC Home", "CTC Home"], "leads", 3235, 170),
  t("lead_replies", "lead_replies", "lead_replies", ["OCP · Leads"], "leads", 3235, 320),
  t("inbound_emails", "inbound_emails", "inbound_emails", ["ECP · Buzón"], "leads", 3235, 470),
  t("buzon_outbound", "buzon_outbound", "buzon_outbound", ["ECP · Buzón"], "leads", 3235, 620),
  // Plataforma
  t("panel_users", "panel_users", "panel_users", ["ECP · Usuarios y credenciales"], "plataforma", 3485, 190),
  t("partner_accounts", "partner_accounts", "partner_accounts", ["OCP · Socios de la red"], "plataforma", 3485, 340),
  t("platform_settings", "platform_settings", "platform_settings", ["ECP · Herramientas / Admin Lock / Mapa"], "plataforma", 3485, 490),
  t("audit_log", "audit_log", "audit_log", ["(interno) · toda escritura"], "plataforma", 3485, 640),
];

const e = (id: string, from: string, to: string, tone?: EdgeTone, label?: string): MapEdge => ({ id, from, to, tone, label });

const EDGES: MapEdge[] = [
  e("e1", "profiles", "producer_profiles"),
  e("e2", "profiles", "buyer_profiles"),
  e("e3", "producer_profiles", "fincas"),
  e("e4", "fincas", "lots"),
  e("e5", "fincas", "media_assets", "info"),
  e("e6", "lots", "ficha_snap", "info"),
  // EUDR de FINCA (compuerta propia): produce el dossier; su verdicto habilita/bloquea
  // aguas abajo el EUDR del lote.
  e("e7f", "fincas", "finca_eudr_gate"),
  e("e7d", "finca_eudr_gate", "finca_dossier", "info", "apta · dossier"),
  e("e7s", "finca_eudr_gate", "finca_stop", "bad", "no apta"),
  e("e7dep", "finca_eudr_gate", "lot_eudr_gate", "info", "finca apta habilita"),
  // EUDR de LOTE (compuerta propia, DEPENDE de la finca): produce el certificado.
  e("e7l", "lots", "lot_eudr_gate"),
  e("e8c", "lot_eudr_gate", "lot_certificate", "info", "ready · certificado"),
  e("e8s", "lot_eudr_gate", "lot_eudr_stop", "bad", "bloqueado / revisión"),
  e("e8v", "lot_eudr_gate", "vid", "ok", "apto → video"),
  e("e_vid", "vid", "eva"),
  e("e10", "eva", "arena_inscriptions", "ok", "Apto → postula (pago)"),
  e("e9b", "eva", "eva_stop", "bad", "No Apto"),
  e("e11", "arena_entry_codes", "arena_inscriptions", "info"),
  e("e12", "arena_inscriptions", "sondeo_batches"),
  e("e13", "sondeo_batches", "sondeo_gate"),
  e("e14", "sondeo_gate", "arena_sessions", "ok", "Apto"),
  // No Apto ⇒ resultado + feedback + 80% cashback (NO contrato).
  e("e15", "sondeo_gate", "retiro_stop", "bad", "No Apto"),
  e("e16", "arena_sessions", "arena_session_lots"),
  e("e17", "arena_session_lots", "arena_scores"),
  e("e18", "arena_scores", "grade_gate"),
  // Las planillas de la jornada alimentan el registro SCA.
  e("e_le", "arena_scores", "lot_evaluations", "info", "planillas → registro"),
  e("e19", "grade_gate", "gal", "ok"),
  e("e20", "gal", "lot_listings"),
  e("e21", "gal", "purchase_contracts", "ok", "Red/Blue/Gold"),
  e("e22", "lot_listings", "orders"),
  // Grado Black NO va a contrato normal: sale del galardón a negociación aparte.
  e("e23", "gal", "black_negotiations", "info", "grado Black"),
  e("e24", "purchase_contracts", "contract_releases", "info"),
  e("e25", "purchase_contracts", "club_member_codes", "info"),
  e("e26", "club_campaigns", "club_member_codes"),
  e("e27", "club_member_codes", "points_ledger"),
  e("e28", "leads", "lead_replies"),
  e("e29", "inbound_emails", "buzon_outbound"),
];

export const DEFAULT_WORK_MAP: WorkMapConfig = { stages: STAGES, nodes: NODES, edges: EDGES };

// ── Normalizador (round-trip seguro con platform_settings.work_map) ──────────
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Devuelve una config válida a partir de datos arbitrarios (nunca lanza). */
export function toWorkMapConfig(value: unknown): WorkMapConfig {
  if (!value || typeof value !== "object") return DEFAULT_WORK_MAP;
  const v = value as Record<string, unknown>;
  const stages = Array.isArray(v.stages)
    ? v.stages
        .map((s): MapStage | null => {
          const o = s as Record<string, unknown>;
          const id = str(o.id);
          if (!id) return null;
          const tint = o.tint === "free" || o.tint === "paid" || o.tint === "support" ? (o.tint as StageTint) : undefined;
          return { id, label: str(o.label, id), x0: num(o.x0), x1: num(o.x1, num(o.x0) + 200), tint };
        })
        .filter((s): s is MapStage => s !== null)
    : [];
  const nodes = Array.isArray(v.nodes)
    ? v.nodes
        .map((n): MapNode | null => {
          const o = n as Record<string, unknown>;
          const id = str(o.id);
          if (!id) return null;
          const kind: MapNodeKind =
            o.kind === "decision"
              ? "decision"
              : o.kind === "stop"
                ? "stop"
                : o.kind === "milestone"
                  ? "milestone"
                  : o.kind === "artifact"
                    ? "artifact"
                    : "table";
          return {
            id,
            kind,
            label: str(o.label, id),
            tableName: o.tableName ? str(o.tableName) : undefined,
            uis: strArr(o.uis),
            stageId: o.stageId ? str(o.stageId) : undefined,
            x: num(o.x),
            y: num(o.y),
            w: o.w != null ? num(o.w) : undefined,
            h: o.h != null ? num(o.h) : undefined,
          };
        })
        .filter((n): n is MapNode => n !== null)
    : [];
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = Array.isArray(v.edges)
    ? v.edges
        .map((eg): MapEdge | null => {
          const o = eg as Record<string, unknown>;
          const id = str(o.id);
          const from = str(o.from);
          const to = str(o.to);
          if (!id || !nodeIds.has(from) || !nodeIds.has(to)) return null;
          const tone = o.tone === "ok" || o.tone === "bad" || o.tone === "info" ? (o.tone as EdgeTone) : undefined;
          return { id, from, to, tone, label: o.label ? str(o.label) : undefined };
        })
        .filter((eg): eg is MapEdge => eg !== null)
    : [];
  // Si viene vacío o corrupto, la semilla curada es el respaldo.
  if (!nodes.length) return DEFAULT_WORK_MAP;
  return { stages, nodes, edges };
}
