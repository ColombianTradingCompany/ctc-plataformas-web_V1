// ── CTCx OS · el catálogo de los HECHOS (puro) ───────────────────────────────
// BORRADOR · decide el owner (componente `ctcx-os`, charter en
// `docs/componentes/ctcx-os.md`; el atlas en `docs/componentes/ctcx-os/atlas.md`).
//
// Un HECHO es una acción de negocio que YA quedó escrita en una bitácora de la
// plataforma. Este archivo no lee nada: dice cómo se NORMALIZA una fila de cada
// bitácora a una sola forma —tipo, actor, entidad, cuándo, efecto en el juego—
// para que el turno, el mapa y las barras de victoria lean UNA lista. El que lee
// las tablas es `hechos.ts` (server-only); este es puro para que el guardián
// `scripts/qa-os-hechos-check.mjs` lo pruebe sin base ni credenciales.
//
// Las fuentes (las tres que existen hoy, ninguna tabla nueva):
//   · `audit_log`          — entity_type · entity_id · action · previous_status ·
//                            new_status · performed_by · created_at (+ notes, que
//                            NO se lee: es texto libre y puede llevar datos).
//   · `integration_events` — dominio (Mapa CTC 0–9) · tipo · created_at (+ payload,
//                            del que se leen SOLO las llaves de `LLAVES_DEL_PAYLOAD`:
//                            el de `cotizacion.emitida` lleva nombre y correo del
//                            contacto y no debe salir de la base).
//   · `latidos`            — clave · estado · inicio · fin (las corridas de los crons).
//
// Las reglas que este catálogo NO rompe (guardarraíles del componente):
//   1. Ninguna mecánica inventa una cifra. `efectos[].medidas` dice en qué
//      columna REAL vive el número («tabla.columna»); quien pinte una barra lo
//      lee de ahí. Un efecto sin medida solo CUENTA.
//   2. El signo de la barra financiera es el sentido del dinero PARA CTCx:
//      +1 entra, −1 sale, 0 se compromete (oferta, contrato, cotización).
//      En «felicidad» y «realización» +1 sube y −1 baja.
//   3. Lo derivado no se persiste: nada de aquí se guarda; se calcula al leer.
//   4. Los pesos, las metas y lo que vale cada barra son DECISIÓN DEL OWNER
//      (decisiones abiertas del charter). Aquí solo hay dirección y medida.

import type { Dominio } from "@/lib/integraciones/dominios";

export type FuenteDeHecho = "audit_log" | "integration_events" | "latidos";

/** Los términos del vocabulario del juego que una entidad puede encarnar. «Sistema»
 *  es la infraestructura de la casa (modelos, ajustes, crons): cuenta, no juega. */
export type TerminoDelJuego =
  | "Ficha" | "Partida" | "Recibo" | "Cuenta" | "Personaje"
  | "Parcela" | "Sello" | "Módulo" | "Acción" | "Sistema";

export type Barra = "financiera" | "felicidad" | "realizacion";

export type RolDelActor = "equipo" | "productor" | "comprador" | "socio" | "sistema" | "desconocido";

export type EfectoEnBarra = {
  barra: Barra;
  sentido: 1 | 0 | -1;
  /** «tabla.columna» donde vive la cifra real. Vacío = el hecho solo cuenta. */
  medidas: readonly string[];
};

export type Hecho = {
  /** `<fuente>:<id de la fila>` — estable, sin datos. */
  id: string;
  fuente: FuenteDeHecho;
  /** audit_log: `<entity_type>.<action>` · integration_events: su `tipo` · latidos: `cron.<estado>`. */
  tipo: string;
  dominio: Dominio;
  /** El perfil (uuid) y su rol. Nunca un nombre: el nombre lo pone quien pinta. */
  actor: { rol: RolDelActor; perfil: string | null };
  entidad: { termino: TerminoDelJuego; tabla: string | null; id: string | null; ref: string | null };
  /** ISO 8601, tal como lo guardó la base. */
  cuando: string;
  transicion: { de: string | null; a: string | null } | null;
  /** El nodo de la Red de Socios que selló el hecho (`partner_accounts.node_type`). */
  sello: string | null;
  efectos: readonly EfectoEnBarra[];
  /** La entidad se puede llevar a una Casilla (lote → finca → parcela con lat/lng). */
  ubicable: boolean;
};

// ── Las entidades de audit_log ───────────────────────────────────────────────

export type ReglaDeEntidad = {
  termino: TerminoDelJuego;
  /** La tabla donde vive `entity_id` (null si no es una fila: `identidad`). */
  tabla: string | null;
  dominio: Dominio;
  ubicable: boolean;
};

/** Cada `entity_type` que el código o una función SQL escribe en `audit_log`.
 *  El guardián exige que TODO `entity_type` literal de `src/` esté aquí: si una
 *  tanda nueva estrena uno, el juego se entera en la misma tanda. */
export const ENTIDADES: Readonly<Record<string, ReglaDeEntidad>> = {
  // Origen (hub 1): el productor, su finca, su lote y la evaluación
  lot:                      { termino: "Ficha",     tabla: "lots",                     dominio: "origen",              ubicable: true },
  lot_evaluation:           { termino: "Ficha",     tabla: "lot_evaluations",          dominio: "origen",              ubicable: true },
  finca:                    { termino: "Parcela",   tabla: "fincas",                   dominio: "origen",              ubicable: true },
  producer:                 { termino: "Personaje", tabla: "profiles",                 dominio: "origen",              ubicable: false },
  producer_profile:         { termino: "Personaje", tabla: "producer_profiles",        dominio: "origen",              ubicable: false },
  arena_inscription:        { termino: "Ficha",     tabla: "arena_inscriptions",       dominio: "origen",              ubicable: true },
  arena_entry_code:         { termino: "Ficha",     tabla: "arena_entry_codes",        dominio: "origen",              ubicable: false },
  arena_session:            { termino: "Ficha",     tabla: "arena_sessions",           dominio: "origen",              ubicable: false },
  club_campaign:            { termino: "Ficha",     tabla: "club_campaigns",           dominio: "origen",              ubicable: false },
  sondeo_batch:             { termino: "Ficha",     tabla: "sondeo_batches",           dominio: "origen",              ubicable: false },
  lot_offer:                { termino: "Ficha",     tabla: "lot_offers",               dominio: "origen",              ubicable: true },
  purchase_contract:        { termino: "Ficha",     tabla: "purchase_contracts",       dominio: "origen",              ubicable: true },
  terratalento_jornada:     { termino: "Parcela",   tabla: "terratalento_jornadas",    dominio: "origen",              ubicable: true },
  terratalento_postulacion: { termino: "Personaje", tabla: "terratalento_postulaciones", dominio: "origen",            ubicable: false },
  terratalento_interes:     { termino: "Personaje", tabla: "terratalento_interes",     dominio: "origen",              ubicable: false },
  // Operación y Logística (hub 2): el café físico
  compra:                   { termino: "Partida",   tabla: "compras",                  dominio: "operacion_logistica", ubicable: true },
  stock_partida:            { termino: "Partida",   tabla: "stock_partidas",           dominio: "operacion_logistica", ubicable: true },
  mezcla:                   { termino: "Partida",   tabla: "mezclas",                  dominio: "operacion_logistica", ubicable: false },
  muestra:                  { termino: "Partida",   tabla: "muestras",                 dominio: "operacion_logistica", ubicable: true },
  bodega_muestras:          { termino: "Partida",   tabla: "bodegas_muestras",         dominio: "operacion_logistica", ubicable: false },
  empaque_fob_referencia:   { termino: "Sistema",   tabla: "empaque_fob_referencias",  dominio: "operacion_logistica", ubicable: false },
  // Comercial (hub 3): el catálogo, los compradores, el embudo, el modelo de precio
  catalogo_fuente:          { termino: "Ficha",     tabla: "catalogo_fuentes",         dominio: "comercial",           ubicable: false },
  lot_listing:              { termino: "Ficha",     tabla: "lot_listings",             dominio: "comercial",           ubicable: false },
  sample_kit:               { termino: "Partida",   tabla: "sample_kits",              dominio: "comercial",           ubicable: false },
  sample_pack_order:        { termino: "Cuenta",    tabla: "sample_pack_orders",       dominio: "comercial",           ubicable: false },
  buyer_profile:            { termino: "Cuenta",    tabla: "buyer_profiles",           dominio: "comercial",           ubicable: false },
  lead:                     { termino: "Cuenta",    tabla: "leads",                    dominio: "comercial",           ubicable: false },
  lead_form:                { termino: "Módulo",    tabla: "lead_forms",               dominio: "comercial",           ubicable: false },
  pvc_edition:              { termino: "Sistema",   tabla: "pvc_editions",             dominio: "comercial",           ubicable: false },
  pvc_correccion:           { termino: "Sistema",   tabla: "pvc_correcciones",         dominio: "comercial",           ubicable: false },
  pvc_model_version:        { termino: "Sistema",   tabla: "pvc_model_versions",       dominio: "comercial",           ubicable: false },
  // Marca y Contenido (hub 4)
  newsletter_subscriber:    { termino: "Cuenta",    tabla: "newsletter_subscribers",   dominio: "marca_contenido",     ubicable: false },
  // Plataformas e IT (hub 5)
  panel_user:               { termino: "Personaje", tabla: "panel_users",              dominio: "plataformas_it",      ubicable: false },
  profile:                  { termino: "Personaje", tabla: "profiles",                 dominio: "plataformas_it",      ubicable: false },
  identidad:                { termino: "Sistema",   tabla: null,                       dominio: "plataformas_it",      ubicable: false },
  platform_setting:         { termino: "Sistema",   tabla: "platform_settings",        dominio: "plataformas_it",      ubicable: false },
  platform_surface:         { termino: "Sistema",   tabla: "platform_surfaces",        dominio: "plataformas_it",      ubicable: false },
  // Conocimiento (hub 6): las herramientas
  tool:                     { termino: "Módulo",    tabla: "tools",                    dominio: "conocimiento",        ubicable: false },
  tool_access_request:      { termino: "Módulo",    tabla: "tool_access_requests",     dominio: "conocimiento",        ubicable: false },
  tool_user_grant:          { termino: "Módulo",    tabla: "tool_user_grants",         dominio: "conocimiento",        ubicable: false },
  tools_plus_grant:         { termino: "Módulo",    tabla: "tools_plus_grants",        dominio: "conocimiento",        ubicable: false },
  // Directorios (hub 7): aliados, socios, el Directorio del Café
  partner_account:          { termino: "Sello",     tabla: "partner_accounts",         dominio: "directorios",         ubicable: false },
  directorio_profile:       { termino: "Personaje", tabla: "directorio_profiles",      dominio: "directorios",         ubicable: false },
  directorio_document:      { termino: "Personaje", tabla: "directorio_documents",     dominio: "directorios",         ubicable: false },
  // Ejecución (hub 8)
  work_map_proposal:        { termino: "Acción",    tabla: "work_map_proposals",       dominio: "ejecucion",           ubicable: false },
  // Archivo (hub 9): el borrado nuclear deja su fila (función SQL `nuclear_borrar`)
  borrado_nuclear:          { termino: "Sistema",   tabla: "borrados_nucleares",       dominio: "archivo",             ubicable: false },
};

/** Lo que se usa cuando un `entity_type` no está en `ENTIDADES` (una fila vieja o
 *  una función SQL que no pasó por aquí): el hecho entra al turno, sin efecto. */
export const ENTIDAD_DESCONOCIDA: ReglaDeEntidad = { termino: "Sistema", tabla: null, dominio: "plataformas_it", ubicable: false };

// ── Las acciones con efecto ──────────────────────────────────────────────────

export type ReglaDeAccion = {
  efectos: readonly EfectoEnBarra[];
  /** Cambia el término de la entidad para ESTA acción (un despacho recibido es un Recibo). */
  termino?: TerminoDelJuego;
  dominio?: Dominio;
  /** El nodo de la Red de Socios que hace esta acción. */
  sello?: string;
};

const sube = (barra: Barra, ...medidas: string[]): EfectoEnBarra => ({ barra, sentido: 1, medidas });
const baja = (barra: Barra, ...medidas: string[]): EfectoEnBarra => ({ barra, sentido: -1, medidas });
const compromete = (...medidas: string[]): EfectoEnBarra => ({ barra: "financiera", sentido: 0, medidas });

const PUNTO = "lot_evaluations.sca_total";
const OFERTA = ["lot_offers.price_per_kg", "lot_offers.quantity_kg"];
const CONTRATO = ["purchase_contracts.quantity_frozen_kg", "purchase_contracts.price_per_kg_locked"];

/** `<entity_type>.<action>` → efecto. Solo las acciones que mueven una barra; las
 *  demás entran al turno y cuentan. Las medidas son columnas que existen (las de
 *  `docs/migraciones/*.sql` o las que el código selecciona); el guardián lo vigila
 *  contra esa lista. */
export const ACCIONES: Readonly<Record<string, ReglaDeAccion>> = {
  // La Ficha avanza por el circuito del lote (realización)
  "lot.ficha_transcrita":                   { efectos: [sube("realizacion")] },
  "lot.dds_registered":                     { efectos: [sube("realizacion")] },
  "lot.sample_received":                    { efectos: [sube("realizacion")] },
  "lot.existencia_registrada":              { efectos: [sube("realizacion")] },
  "lot.evaluacion_registrada_centro":       { efectos: [sube("realizacion", PUNTO)], sello: "centro-calidad" },
  "lot.evaluacion_anulada_centro":          { efectos: [baja("realizacion")], sello: "centro-calidad" },
  "lot.graded":                             { efectos: [sube("realizacion", PUNTO)] },
  "lot.eva_apto":                           { efectos: [sube("realizacion")] },
  "lot.eva_no_apto":                        { efectos: [baja("realizacion")] },
  "lot.sin_oferta":                         { efectos: [baja("realizacion")] },
  "finca.approved":                         { efectos: [sube("realizacion")] },
  "finca.rejected":                         { efectos: [baja("realizacion")] },
  "finca.cert_verified":                    { efectos: [sube("realizacion")] },
  "arena_inscription.postulated":           { efectos: [sube("realizacion")] },
  "arena_inscription.postulated_on_behalf": { efectos: [sube("realizacion")] },
  // La evaluación se cobra (COP 200.000 menos la coinversión): el dinero entra
  "arena_inscription.factura_emitida":      { efectos: [compromete("arena_inscriptions.amount_due_cop")] },
  "arena_inscription.payment_confirmed":    { efectos: [sube("financiera", "arena_inscriptions.amount_due_cop")] },
  "arena_inscription.cashback_paid":        { efectos: [baja("financiera")] },
  // La oferta y el contrato (el trato con el productor)
  "lot_offer.offer_emitted":                { efectos: [compromete(...OFERTA)] },
  "lot_offer.offer_accepted":               { efectos: [sube("felicidad"), compromete(...OFERTA)] },
  "lot_offer.offer_accepted_provisionally": { efectos: [compromete(...OFERTA)] },
  "lot_offer.offer_rejected":               { efectos: [baja("felicidad")] },
  "lot_offer.offer_expired":                { efectos: [baja("realizacion")] },
  "purchase_contract.created":              { efectos: [sube("felicidad"), compromete(...CONTRATO)] },
  "purchase_contract.signed":               { efectos: [sube("felicidad"), compromete(...CONTRATO)] },
  "purchase_contract.accepted_provisionally": { efectos: [compromete(...CONTRATO)] },
  "purchase_contract.ratified":             { efectos: [sube("felicidad")] },
  "purchase_contract.venta_semanal_confirmada": { efectos: [compromete("contract_ventas.kg", "contract_ventas.total_cop")] },
  "purchase_contract.ventana_cumplida":     { efectos: [sube("realizacion")] },
  "purchase_contract.completed":            { efectos: [sube("realizacion")] },
  "purchase_contract.ruptura_declarada":    { efectos: [baja("felicidad")] },
  "purchase_contract.faltante_cobrado":     { efectos: [baja("felicidad")] },
  "purchase_contract.cancelado_por_despacho": { efectos: [baja("felicidad")] },
  // El envío (Ficha) y su recepción (Recibo): humedad, actividad de agua, 60/40
  "purchase_contract.despacho_registrado":  { efectos: [sube("realizacion", "contract_despachos.kg")], dominio: "operacion_logistica" },
  "purchase_contract.despacho_confirmado_60": {
    efectos: [baja("financiera", "contract_despachos.pago_despacho_cop"), sube("felicidad")],
    dominio: "operacion_logistica",
  },
  "purchase_contract.despacho_recibido": {
    efectos: [sube("realizacion", "contract_despachos.peso_kg", "contract_despachos.humedad_pct", "contract_despachos.aw")],
    termino: "Recibo",
    dominio: "operacion_logistica",
  },
  "purchase_contract.despacho_sin_stock":   { efectos: [baja("realizacion")], dominio: "operacion_logistica" },
  // La Partida: compra, stock, mezcla
  "compra.compra_registrada":               { efectos: [baja("financiera", "compras.total_cop", "compras.kg")] },
  "compra.compra_al_stock":                 { efectos: [sube("realizacion", "compras.kg")] },
  "stock_partida.stock_raiz_compra":        { efectos: [sube("realizacion", "stock_partidas.kg")] },
  "stock_partida.stock_raiz_despacho":      { efectos: [sube("realizacion", "stock_partidas.kg")] },
  "stock_partida.stock_ingreso_manual":     { efectos: [sube("realizacion", "stock_partidas.kg")] },
  "mezcla.mezcla_cerrada":                  { efectos: [sube("realizacion")] },
  // Comercial: el catálogo y el embudo
  "catalogo_fuente.triage_declarada":       { efectos: [sube("realizacion")] },
  "catalogo_fuente.triage_retirada":        { efectos: [baja("realizacion")] },
  "sample_kit.kit_enviado":                 { efectos: [sube("realizacion")] },
  "sample_pack_order.pedido_muestra_enviado": { efectos: [sube("felicidad")] },
  "lead.replied":                           { efectos: [sube("felicidad")] },
  "pvc_edition.published":                  { efectos: [sube("realizacion")] },
  // Personajes: la relación con la gente
  "producer_profile.cuenta_congelada":      { efectos: [baja("felicidad")] },
  "producer_profile.cuenta_descongelada":   { efectos: [sube("felicidad")] },
  "directorio_profile.aceptar":             { efectos: [sube("felicidad")] },
  "directorio_profile.rechazar":            { efectos: [baja("felicidad")] },
  // Módulos
  "tool.version_publicada":                 { efectos: [sube("realizacion")] },
};

/** Acciones con nombre armado en el código (`stock_${tipo}`, `mes_${n}_…`). El
 *  primer prefijo que case gana; el orden importa. */
export const PREFIJOS: readonly { prefijo: string; regla: ReglaDeAccion }[] = [
  // `contract_months` está dormida desde la V5.176 (`PLAN_CICLOS.md` §8): cuenta, no juega.
  { prefijo: "purchase_contract.mes_", regla: { efectos: [] } },
  { prefijo: "stock_partida.stock_salida_", regla: { efectos: [] } },
  { prefijo: "stock_partida.stock_", regla: { efectos: [sube("realizacion", "stock_partidas.kg")] } },
  { prefijo: "lot_offer.selection_", regla: { efectos: [] } },
  { prefijo: "borrado_nuclear.", regla: { efectos: [] } },
];

/** Lo que nunca mueve una barra aunque un prefijo lo atrape: deshacer no es jugar. */
const ES_ANULACION = /_(anulad[ao]|reset|undone|retirad[ao])$/;

export function reglaDeAccion(entityType: string, action: string): ReglaDeAccion | null {
  const clave = `${entityType}.${action}`;
  const exacta = ACCIONES[clave];
  if (exacta) return exacta;
  if (ES_ANULACION.test(action)) return null;
  for (const p of PREFIJOS) if (clave.startsWith(p.prefijo)) return p.regla;
  return null;
}

// ── Los eventos de la espina (integration_events) ────────────────────────────

/** Las ÚNICAS llaves del payload que se leen (por ruta JSON en el select): ids y
 *  referencias, nunca nombres, correos ni importes. */
export const LLAVES_DEL_PAYLOAD = ["ctc_id", "ref", "deliverableId", "projectId", "usuario"] as const;
export type LlaveDelPayload = (typeof LLAVES_DEL_PAYLOAD)[number];

export type ReglaDeEvento = {
  termino: TerminoDelJuego;
  tabla: string | null;
  actor: RolDelActor;
  ubicable: boolean;
  efectos: readonly EfectoEnBarra[];
  /** De qué llave del payload sale la referencia de la entidad. */
  ref?: LlaveDelPayload;
  /** De qué llave del payload sale el id de la entidad. */
  id?: LlaveDelPayload;
  /** De qué llave del payload sale el perfil del actor. */
  perfil?: LlaveDelPayload;
  sello?: string;
};

/** Cada `tipo` que el código emite con `emitEvent` (`qa-os-hechos-check` los cuenta). */
export const EVENTOS: Readonly<Record<string, ReglaDeEvento>> = {
  "cotizacion.emitida":            { termino: "Cuenta",  tabla: "quotes",                actor: "equipo",      ubicable: false, efectos: [compromete("quotes.total")], ref: "ctc_id" },
  "coffeed.redaccion.post_creado": { termino: "Módulo",  tabla: "coffeed_deliverables",  actor: "equipo",      ubicable: false, efectos: [sube("realizacion")], id: "deliverableId" },
  "rts.tablero":                   { termino: "Módulo",  tabla: "coffeed_rts_projects",  actor: "desconocido", ubicable: false, efectos: [sube("realizacion")], id: "projectId", sello: "estudio-contenido" },
  "jornada.creada":                { termino: "Parcela", tabla: "terratalento_jornadas", actor: "productor",   ubicable: true,  efectos: [], ref: "ref" },
  "jornada.cerrada":               { termino: "Parcela", tabla: "terratalento_jornadas", actor: "productor",   ubicable: true,  efectos: [sube("realizacion")], ref: "ref" },
  "jornada.cancelada":             { termino: "Parcela", tabla: "terratalento_jornadas", actor: "productor",   ubicable: true,  efectos: [], ref: "ref" },
};

/** `herramienta.<id>.<evento>` (el puente `CTC.emitir` de las herramientas). */
export const EVENTO_DE_HERRAMIENTA: ReglaDeEvento = {
  termino: "Módulo", tabla: "tools", actor: "desconocido", ubicable: false, efectos: [], perfil: "usuario",
};

/** Los tipos que no son hechos del negocio (la prueba de vida del tablero). */
export const EVENTOS_FUERA_DEL_JUEGO: readonly string[] = ["prueba.ping"];

export function reglaDeEvento(tipo: string): ReglaDeEvento | null {
  if (EVENTOS_FUERA_DEL_JUEGO.includes(tipo)) return null;
  const exacta = EVENTOS[tipo];
  if (exacta) return exacta;
  if (tipo.startsWith("herramienta.")) return EVENTO_DE_HERRAMIENTA;
  return { termino: "Sistema", tabla: null, actor: "desconocido", ubicable: false, efectos: [] };
}

// ── Las filas tal como se leen (solo las columnas que se seleccionan) ────────

export type FilaDeAuditoria = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  performed_by: string | null;
  created_at: string;
};

export type FilaDeEvento = {
  id: string;
  dominio: Dominio;
  tipo: string;
  created_at: string;
} & Partial<Record<LlaveDelPayload, string | null>>;

export type FilaDeLatido = {
  id: string;
  clave: string;
  estado: "ok" | "parcial" | "fallido" | "en_curso";
  inicio: string;
  fin: string | null;
};

/** Quién es cada perfil: su rol y, si es socio, su nodo. Lo arma `hechos.ts` con
 *  tres lecturas de ids y roles (nunca nombres). */
export type Actores = ReadonlyMap<string, { rol: RolDelActor; sello: string | null }>;

// ── Normalizar ───────────────────────────────────────────────────────────────

/** Sin perfil, el rol es el que dice la regla (un evento sabe de qué consola sale);
 *  en `audit_log` un `performed_by` nulo es un cron o una cuenta ya borrada
 *  (`borrarCuenta` lo pone a null): «desconocido», no «sistema». */
function actorDe(perfil: string | null, actores: Actores, porDefecto: RolDelActor): Hecho["actor"] & { sello: string | null } {
  if (!perfil) return { rol: porDefecto, perfil: null, sello: null };
  const a = actores.get(perfil);
  return { rol: a?.rol ?? porDefecto, perfil, sello: a?.sello ?? null };
}

export function normalizarAuditoria(f: FilaDeAuditoria, actores: Actores): Hecho {
  const ent = ENTIDADES[f.entity_type] ?? ENTIDAD_DESCONOCIDA;
  const regla = reglaDeAccion(f.entity_type, f.action);
  const actor = actorDe(f.performed_by, actores, "desconocido");
  const hayTransicion = f.previous_status !== null || f.new_status !== null;
  return {
    id: `audit_log:${f.id}`,
    fuente: "audit_log",
    tipo: `${f.entity_type}.${f.action}`,
    dominio: regla?.dominio ?? ent.dominio,
    actor: { rol: actor.rol, perfil: actor.perfil },
    entidad: { termino: regla?.termino ?? ent.termino, tabla: ent.tabla, id: f.entity_id, ref: null },
    cuando: f.created_at,
    transicion: hayTransicion ? { de: f.previous_status, a: f.new_status } : null,
    sello: regla?.sello ?? actor.sello,
    efectos: regla?.efectos ?? [],
    ubicable: ent.ubicable,
  };
}

export function normalizarEvento(f: FilaDeEvento, actores: Actores): Hecho | null {
  const regla = reglaDeEvento(f.tipo);
  if (!regla) return null;
  const perfil = regla.perfil ? (f[regla.perfil] ?? null) : null;
  const actor = actorDe(perfil, actores, regla.actor);
  return {
    id: `integration_events:${f.id}`,
    fuente: "integration_events",
    tipo: f.tipo,
    dominio: f.dominio,
    actor: { rol: actor.rol, perfil: actor.perfil },
    entidad: {
      termino: regla.termino,
      tabla: regla.tabla,
      id: regla.id ? (f[regla.id] ?? null) : null,
      ref: regla.ref ? (f[regla.ref] ?? null) : null,
    },
    cuando: f.created_at,
    transicion: null,
    sello: regla.sello ?? actor.sello,
    efectos: regla.efectos,
    ubicable: regla.ubicable,
  };
}

export function normalizarLatido(f: FilaDeLatido): Hecho | null {
  if (f.estado === "en_curso") return null;
  return {
    id: `latidos:${f.id}`,
    fuente: "latidos",
    tipo: `cron.${f.estado}`,
    dominio: "plataformas_it",
    actor: { rol: "sistema", perfil: null },
    entidad: { termino: "Sistema", tabla: "latidos", id: f.id, ref: f.clave },
    cuando: f.fin ?? f.inicio,
    transicion: null,
    sello: null,
    efectos: [],
    ubicable: false,
  };
}

// ── El resumen del turno (puro): lo que el turno, el mapa y las barras leen ──

export type ResumenDelTurno = {
  total: number;
  porTermino: Partial<Record<TerminoDelJuego, number>>;
  porDominio: Partial<Record<Dominio, number>>;
  /** Cuántos hechos mueven cada barra y en qué sentido. Las CIFRAS se leen de
   *  `medidas`; aquí solo se cuenta. */
  barras: Record<Barra, { sube: number; baja: number; compromete: number; medidas: string[] }>;
  ubicables: number;
};

export function resumirTurno(hechos: readonly Hecho[]): ResumenDelTurno {
  const barras: ResumenDelTurno["barras"] = {
    financiera: { sube: 0, baja: 0, compromete: 0, medidas: [] },
    felicidad: { sube: 0, baja: 0, compromete: 0, medidas: [] },
    realizacion: { sube: 0, baja: 0, compromete: 0, medidas: [] },
  };
  const porTermino: ResumenDelTurno["porTermino"] = {};
  const porDominio: ResumenDelTurno["porDominio"] = {};
  let ubicables = 0;
  for (const h of hechos) {
    porTermino[h.entidad.termino] = (porTermino[h.entidad.termino] ?? 0) + 1;
    porDominio[h.dominio] = (porDominio[h.dominio] ?? 0) + 1;
    if (h.ubicable) ubicables++;
    for (const e of h.efectos) {
      const b = barras[e.barra];
      if (e.sentido === 1) b.sube++;
      else if (e.sentido === -1) b.baja++;
      else b.compromete++;
      for (const m of e.medidas) if (!b.medidas.includes(m)) b.medidas.push(m);
    }
  }
  return { total: hechos.length, porTermino, porDominio, barras, ubicables };
}
