// ── Mapa de Trabajo · modelo de datos ────────────────────────────────────────
// El mapa interactivo del ECP (/ecp/mapa): cómo se construyen las tablas unas
// sobre otras a través de las compuertas del proceso (FT → FT2 → EUDR → EVA →
// MUE → Sondeo → Arena → GAL, más comercio / club / leads), y EN QUÉ UI(s) se
// muestra cada tabla. La estructura es real (semilla curada abajo); el owner la
// reordena cosméticamente y guarda. Sin librerías: se dibuja en SVG a mano.
//
// Coordenadas: x,y son el CENTRO del nodo (facilita anclar las flechas). Las
// bandas de etapa (stages) viven al fondo del lienzo y solo etiquetan tramos.

export type MapStage = { id: string; label: string; x0: number; x1: number };

export type MapNodeKind = "table" | "decision" | "stop";

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

export const NODE_W = 168;
export const NODE_H = 62;
export const DECISION_SIZE = 118;
export const CANVAS_W = 3360;
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

// Alto del proceso (punto de parada / equilibrio): un lote que sale del flujo.
const st = (id: string, label: string, stageId: string, x: number, y: number, uis: string[] = []): MapNode => ({
  id,
  kind: "stop",
  label,
  stageId,
  x,
  y,
  uis,
});

const STAGES: MapStage[] = [
  { id: "cuenta", label: "Cuenta", x0: 40, x1: 250 },
  { id: "ft", label: "FT · Finca", x0: 270, x1: 480 },
  { id: "ft2", label: "FT2 · Lote", x0: 500, x1: 740 },
  { id: "eudr", label: "EUDR", x0: 760, x1: 980 },
  { id: "eva", label: "EVA", x0: 1000, x1: 1230 },
  { id: "mue", label: "MUE", x0: 1250, x1: 1480 },
  { id: "sondeo", label: "Sondeo", x0: 1500, x1: 1730 },
  { id: "arena", label: "Arena", x0: 1750, x1: 2010 },
  { id: "gal", label: "GAL", x0: 2030, x1: 2230 },
  { id: "comercio", label: "Comercio", x0: 2250, x1: 2620 },
  { id: "club", label: "Kaffetal Club", x0: 2640, x1: 2860 },
  { id: "leads", label: "Leads · Buzón", x0: 2880, x1: 3110 },
  { id: "plataforma", label: "Plataforma", x0: 3130, x1: 3340 },
];

const NODES: MapNode[] = [
  // Cuenta
  t("profiles", "profiles", "profiles", ["Auth · todas las cuentas"], "cuenta", 145, 170),
  t("producer_profiles", "producer_profiles", "producer_profiles", ["KR · Información general", "BCP · Productores"], "cuenta", 145, 320),
  t("buyer_profiles", "buyer_profiles", "buyer_profiles", ["CP · Cuenta"], "cuenta", 145, 470),
  // FT · Finca
  t("fincas", "fincas", "fincas", ["KR · Mis Fincas", "BCP · Fincas"], "ft", 375, 250),
  t("media_assets", "media_assets", "media_assets", ["KR · Fincas/Lotes", "BCP"], "ft", 375, 410),
  // FT2 · Lote
  t("lots", "lots", "lots", ["KR · Mis Lotes", "BCP · Lotes", "BCP · Galardonados", "CP · Catálogo"], "ft2", 620, 250),
  t("ficha_snap", "ficha_completion_snapshots", "ficha_completion_snapshots", ["KR · Ficha"], "ft2", 620, 410),
  // EUDR (compuerta)
  d("eudr_gate", "¿Finca apta EUDR?", "eudr", 870, 250),
  st("eudr_stop", "Finca no apta · corregir", "eudr", 870, 470, ["BCP · Fincas", "KR · Mis Fincas"]),
  // EVA
  t("lot_evaluations", "lot_evaluations", "lot_evaluations", ["BCP · Arena (reclamos)", "KR · Ficha"], "eva", 1115, 250),
  d("eva_gate", "Apto / No Apto", "eva", 1115, 440),
  st("eva_stop", "No Apto · fuera de Arena", "eva", 1115, 640, ["KR · Ficha"]),
  // MUE
  t("arena_inscriptions", "arena_inscriptions", "arena_inscriptions", ["BCP · Nominados", "BCP · Arena", "KR · Panel"], "mue", 1365, 250),
  t("arena_entry_codes", "arena_entry_codes", "arena_entry_codes", ["BCP · códigos", "KR · postulación"], "mue", 1365, 430),
  // Sondeo
  t("sondeo_batches", "sondeo_batches", "sondeo_batches", ["BCP · Nominados (Baches)"], "sondeo", 1615, 250),
  d("sondeo_gate", "Sondeo Apto / No Apto", "sondeo", 1615, 440),
  // Un No Apto del Sondeo NO va a contrato: recibe resultado, feedback y el 80% de cashback.
  st("retiro_stop", "No Apto · resultado + feedback + 80% cashback", "sondeo", 1615, 680, ["KR · Panel", "BCP · Nominados (cashback)"]),
  // Arena
  t("arena_sessions", "arena_sessions", "arena_sessions", ["BCP · Arena"], "arena", 1880, 190),
  t("arena_session_lots", "arena_session_lots", "arena_session_lots", ["BCP · Arena (sesión)"], "arena", 1880, 340),
  t("arena_scores", "arena_scores", "arena_scores", ["BCP · Arena (jornada)"], "arena", 1880, 490),
  d("grade_gate", "Grado CTC", "arena", 1880, 660),
  // GAL
  t("galardon", "Galardón (lots.grade)", "lots", ["BCP · Galardonados", "CP · Catálogo / Subastas"], "gal", 2130, 250),
  // Comercio
  t("lot_listings", "lot_listings", "lot_listings", ["BCP · Catálogo", "CP · tienda"], "comercio", 2400, 170),
  t("purchase_contracts", "purchase_contracts", "purchase_contracts", ["BCP · Contratos", "KR · Mis contratos"], "comercio", 2400, 320),
  t("orders", "orders / order_items", "orders", ["CP · checkout", "OCP"], "comercio", 2400, 470),
  t("black_negotiations", "black_negotiations", "black_negotiations", ["BCP · Contratos"], "comercio", 2400, 620),
  t("contract_releases", "contract_releases / humidity_readings", "contract_releases", ["BCP · Contratos / Humedad", "KR"], "comercio", 2400, 780),
  // Kaffetal Club
  t("club_campaigns", "club_campaigns", "club_campaigns", ["BCP · Kaffetal Club"], "club", 2740, 190),
  t("club_member_codes", "club_member_codes", "club_member_codes", ["BCP · Kaffetal Club", "KR · contratos"], "club", 2740, 340),
  t("points_ledger", "points_ledger", "points_ledger", ["CP · membresía"], "club", 2740, 490),
  // Leads · Buzón
  t("leads", "leads", "leads", ["OCP · Leads CTC Home", "CTC Home"], "leads", 2985, 170),
  t("lead_replies", "lead_replies", "lead_replies", ["OCP · Leads"], "leads", 2985, 320),
  t("inbound_emails", "inbound_emails", "inbound_emails", ["ECP · Buzón"], "leads", 2985, 470),
  t("buzon_outbound", "buzon_outbound", "buzon_outbound", ["ECP · Buzón"], "leads", 2985, 620),
  // Plataforma
  t("panel_users", "panel_users", "panel_users", ["ECP · Usuarios y credenciales"], "plataforma", 3230, 190),
  t("partner_accounts", "partner_accounts", "partner_accounts", ["OCP · Socios de la red"], "plataforma", 3230, 340),
  t("platform_settings", "platform_settings", "platform_settings", ["ECP · Herramientas / Admin Lock / Mapa"], "plataforma", 3230, 490),
  t("audit_log", "audit_log", "audit_log", ["(interno) · toda escritura"], "plataforma", 3230, 640),
];

const e = (id: string, from: string, to: string, tone?: EdgeTone, label?: string): MapEdge => ({ id, from, to, tone, label });

const EDGES: MapEdge[] = [
  e("e1", "profiles", "producer_profiles"),
  e("e2", "profiles", "buyer_profiles"),
  e("e3", "producer_profiles", "fincas"),
  e("e4", "fincas", "lots"),
  e("e5", "fincas", "media_assets", "info"),
  e("e6", "lots", "ficha_snap", "info"),
  e("e7", "lots", "eudr_gate"),
  e("e8", "eudr_gate", "lot_evaluations", "ok", "apta"),
  e("e8b", "eudr_gate", "eudr_stop", "bad", "no apta"),
  e("e9", "lot_evaluations", "eva_gate"),
  e("e10", "eva_gate", "arena_inscriptions", "ok", "Apto → postula"),
  e("e9b", "eva_gate", "eva_stop", "bad", "No Apto"),
  e("e11", "arena_entry_codes", "arena_inscriptions", "info"),
  e("e12", "arena_inscriptions", "sondeo_batches"),
  e("e13", "sondeo_batches", "sondeo_gate"),
  e("e14", "sondeo_gate", "arena_sessions", "ok", "Apto"),
  // No Apto ⇒ resultado + feedback + 80% cashback (NO contrato).
  e("e15", "sondeo_gate", "retiro_stop", "bad", "No Apto"),
  e("e16", "arena_sessions", "arena_session_lots"),
  e("e17", "arena_session_lots", "arena_scores"),
  e("e18", "arena_scores", "grade_gate"),
  e("e19", "grade_gate", "galardon", "ok"),
  e("e20", "galardon", "lot_listings"),
  e("e21", "galardon", "purchase_contracts"),
  e("e22", "lot_listings", "orders"),
  e("e23", "purchase_contracts", "black_negotiations", "info"),
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
          return { id, label: str(o.label, id), x0: num(o.x0), x1: num(o.x1, num(o.x0) + 200) };
        })
        .filter((s): s is MapStage => s !== null)
    : [];
  const nodes = Array.isArray(v.nodes)
    ? v.nodes
        .map((n): MapNode | null => {
          const o = n as Record<string, unknown>;
          const id = str(o.id);
          if (!id) return null;
          const kind: MapNodeKind = o.kind === "decision" ? "decision" : o.kind === "stop" ? "stop" : "table";
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
