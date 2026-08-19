import Link from "next/link";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { LeadModalRow } from "@/app/ecp/(app)/leads/LeadModalRow";
import { resumenTerminos, terminosFromRow } from "@/lib/terratalento/terminos";
import type { ConstanciaInput } from "@/lib/terratalento/constanciaPrint";
import { ConstanciaButton } from "./ConstanciaButton";
import { reenviarNotificacionLlamado, setJornadaEstadoAdmin, setPostulacionEstado } from "./actions";
import { InteresTerratalentoBoard } from "@/components/panel/interes/InteresTerratalentoBoard";
import styles from "@/components/panel/shared.module.css";

// ── Terratalento · el tablero de match del ECP (V2) ─────────────────────────
// Dos niveles: arriba las JORNADAS por estado; dentro de cada una, las
// POSTULACIONES como kanban (Postulado → Llamado → Confirmado → Descartado),
// que es literalmente el trabajo de emparejar. Al confirmar se congelan los
// términos y se puede emitir la constancia de acuerdo.

type JornadaRow = {
  id: string;
  finca_id: string;
  producer_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  cupos: number;
  estado: string;
  created_at: string;
  fincas: { name: string; municipio: string | null; vereda: string | null } | null;
  [k: string]: unknown;
};

type PostRow = {
  id: string;
  jornada_id: string;
  recolector_id: string;
  estado: string;
  created_at: string;
  notificado_at: string | null;
  notificacion_error: string | null;
  terminos_aceptados_at: string | null;
  terminos_snapshot: Record<string, unknown> | null;
  acuerdo_emitido_at: string | null;
};

type RecolectorRow = {
  profile_id: string;
  nombre: string;
  cedula: string | null;
  celular: string;
  whatsapp: boolean;
  departamento: string;
  municipio: string;
  experiencia_anios: number | null;
  disponible: boolean;
  notas: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_celular: string | null;
  medio_pago: string | null;
  created_at: string;
};

const TERMINOS_COLS =
  "pago, condiciones, pago_modalidad, pago_valor, pago_unidad, pago_forma, pago_frecuencia, " +
  "alojamiento, alojamiento_detalle, alimentacion, alimentacion_detalle, transporte, transporte_detalle, " +
  "horario, duracion_estimada_dias, requisitos";

const COL_JORNADA = [
  { key: "abierta", label: "Abiertas" },
  { key: "en_gestion", label: "En gestión" },
  { key: "cerrada", label: "Cerradas" },
] as const;

const COL_POST = [
  { key: "postulado", label: "Postulado" },
  { key: "llamado", label: "Llamado" },
  { key: "confirmado", label: "Confirmado" },
  { key: "descartado", label: "Descartado" },
] as const;

const ESTADO_JORNADA: Record<string, string> = {
  abierta: "Abierta",
  en_gestion: "En gestión",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

const fecha = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default async function EcpTerratalentoPage({
  searchParams,
}: {
  searchParams: Promise<{ mun?: string; disp?: string }>;
}) {
  await requireConsoleAccess("ecp");
  const { mun, disp } = await searchParams;
  const service = createServiceRoleClient();

  const [{ data: jornadaRows }, { data: postRows }, { data: recolectorRows }] = await Promise.all([
    service
      .from("terratalento_jornadas")
      .select(`id, finca_id, producer_id, fecha_inicio, fecha_fin, cupos, estado, created_at, ${TERMINOS_COLS}, fincas(name, municipio, vereda)`)
      .order("created_at", { ascending: false }),
    service
      .from("terratalento_postulaciones")
      .select("id, jornada_id, recolector_id, estado, created_at, notificado_at, notificacion_error, terminos_aceptados_at, terminos_snapshot, acuerdo_emitido_at"),
    service.from("terratalento_recolectores").select("*").order("created_at", { ascending: false }),
  ]);

  const jornadas = (jornadaRows ?? []) as unknown as JornadaRow[];
  const posts = (postRows ?? []) as PostRow[];
  const recolectores = (recolectorRows ?? []) as RecolectorRow[];
  const recolectorById = new Map(recolectores.map((r) => [r.profile_id, r]));
  const producers = await fetchProducerContacts(service, jornadas.map((j) => j.producer_id));

  const postsByJornada = new Map<string, PostRow[]>();
  for (const p of posts) postsByJornada.set(p.jornada_id, [...(postsByJornada.get(p.jornada_id) ?? []), p]);
  const postCountByRecolector = new Map<string, number>();
  for (const p of posts) {
    if (p.estado !== "retirado") postCountByRecolector.set(p.recolector_id, (postCountByRecolector.get(p.recolector_id) ?? 0) + 1);
  }

  const activas = jornadas.filter((j) => ["abierta", "en_gestion"].includes(j.estado));
  const pendientes = posts.filter((p) => p.estado === "postulado").length;
  const confirmadosTotal = posts.filter((p) => p.estado === "confirmado").length;

  const kpis = [
    { k: "Jornadas activas", v: String(activas.length), sub: `${jornadas.length} en total` },
    { k: "Postulaciones por gestionar", v: String(pendientes), sub: "en estado Postulado" },
    { k: "Cupos confirmados", v: String(confirmadosTotal), sub: "en todas las jornadas" },
    { k: "Recolectores registrados", v: String(recolectores.length), sub: `${recolectores.filter((r) => r.disponible).length} disponibles` },
  ];

  // Filtros de emparejamiento sobre el roster (server-side, patrón pestañas).
  const municipios = [...new Set(recolectores.map((r) => r.municipio).filter(Boolean))].sort();
  const rosterFiltrado = recolectores.filter(
    (r) => (!mun || r.municipio === mun) && (disp !== "1" || r.disponible)
  );

  const constanciaDe = (j: JornadaRow, p: PostRow, r: RecolectorRow | undefined): ConstanciaInput => ({
    folio: `TT-${j.id.slice(0, 8).toUpperCase()}`,
    fincaNombre: j.fincas?.name ?? "Finca de la red",
    fincaUbicacion: [j.fincas?.vereda, j.fincas?.municipio].filter(Boolean).join(", "),
    productorNombre: producers.get(j.producer_id)?.fullName ?? "Responsable de la finca",
    recolectorNombre: r?.nombre ?? "Recolector",
    recolectorCedula: r?.cedula ?? null,
    recolectorCelular: r?.celular ?? "",
    fechaInicio: j.fecha_inicio,
    fechaFin: j.fecha_fin,
    acordadoEl: p.acuerdo_emitido_at ?? p.created_at,
    terminos: p.terminos_snapshot ?? j,
  });

  return (
    <div>
      <h1 className={styles.title}>Terratalento</h1>
      <p className={styles.subtitle}>
        El match entre las Jornadas de Recolecta (publicadas por las fincas desde Kaffetal Regal) y los recolectores.
        CTC llama, confirma cupos o descarta; al confirmar se congelan los términos y se emite la constancia de acuerdo.
        La finca solo ve a los confirmados.
      </p>

      {/* La lista de espera PRE-LANZAMIENTO va ARRIBA del match (A6, 2026-08-19).
          Mientras Terratalento no abra, esto es lo único que se mueve en esta
          pantalla: el kanban de jornadas está vacío por definición hasta que
          haya fincas publicando. El día que abra, esta sección envejece hacia
          abajo sola — no hay que moverla, deja de crecer. */}
      <div style={{ marginBottom: 40 }}>
        <InteresTerratalentoBoard />
      </div>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <div key={kpi.k} className={styles.kpiCard}>
            <span className={styles.kpiTop}>
              <span className={styles.kpiK}>{kpi.k}</span>
            </span>
            <span className={styles.kpiV}>{kpi.v}</span>
            <span className={styles.kpiSub}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 30 }}>
        <div className={styles.sectionHead}>
          <h2>Jornadas de Recolecta ({jornadas.length})</h2>
        </div>
        {jornadas.length === 0 ? (
          <p className={styles.empty}>
            Sin jornadas todavía — la primera nace cuando una finca publique la suya desde su panel de Kaffetal Regal.
          </p>
        ) : (
          <div className={styles.board}>
            {COL_JORNADA.map((c) => {
              const col = jornadas.filter((j) =>
                c.key === "cerrada" ? ["cerrada", "cancelada"].includes(j.estado) : j.estado === c.key
              );
              return (
                <div className={styles.column} key={c.key}>
                  <div className={styles.columnHead}>
                    <h3>{c.label}</h3>
                    <span className={styles.columnCount}>{col.length}</span>
                  </div>
                  <div className={styles.columnList}>
                    {col.map((j) => {
                      const jPosts = (postsByJornada.get(j.id) ?? []).filter((p) => p.estado !== "retirado");
                      const confirmados = jPosts.filter((p) => p.estado === "confirmado").length;
                      const lineas = resumenTerminos(terminosFromRow(j));
                      return (
                        <LeadModalRow
                          key={j.id}
                          title={`${j.fincas?.name ?? "Finca"} · ${fecha(j.fecha_inicio)}`}
                          anchorId={`jornada-${j.id}`}
                          summary={
                            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <b style={{ fontSize: 13.5, color: "var(--ink)" }}>{j.fincas?.name ?? "Finca"}</b>
                              <span className={styles.meta} style={{ marginTop: 0 }}>
                                {fecha(j.fecha_inicio)} · {confirmados}/{j.cupos} cupos · {jPosts.length} postulación
                                {jPosts.length === 1 ? "" : "es"}
                              </span>
                            </span>
                          }
                        >
                          <p className={styles.meta} style={{ marginTop: 2 }}>
                            {[j.fincas?.vereda, j.fincas?.municipio].filter(Boolean).join(" · ")} · publicada el{" "}
                            {fecha(j.created_at)} por {producers.get(j.producer_id)?.fullName ?? "Productor"}
                          </p>

                          <h4 style={{ margin: "16px 0 6px", fontSize: 13.5, borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
                            Los términos publicados
                          </h4>
                          {lineas.length === 0 ? (
                            <p className={styles.meta} style={{ margin: 0 }}>La finca no detalló términos.</p>
                          ) : (
                            lineas.map((l) => (
                              <p key={l.label} className={styles.meta} style={{ margin: "3px 0" }}>
                                {l.label}: <b style={{ color: "var(--ink)" }}>{l.value}</b>
                              </p>
                            ))
                          )}

                          <h4 style={{ margin: "16px 0 6px", fontSize: 13.5, borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
                            El match ({jPosts.length}) · {confirmados}/{j.cupos} confirmados
                          </h4>
                          {jPosts.length === 0 && <p className={styles.meta} style={{ margin: 0 }}>Nadie se ha postulado todavía.</p>}
                          {jPosts.length > 0 && (
                            <div className={styles.board} style={{ marginTop: 8 }}>
                              {COL_POST.map((pc) => {
                                const pcol = jPosts.filter((p) => p.estado === pc.key);
                                return (
                                  <div className={styles.column} key={pc.key} style={{ minWidth: 200, flexBasis: 200 }}>
                                    <div className={styles.columnHead}>
                                      <h3>{pc.label}</h3>
                                      <span className={styles.columnCount}>{pcol.length}</span>
                                    </div>
                                    <div className={styles.columnList}>
                                      {pcol.map((p) => {
                                        const r = recolectorById.get(p.recolector_id);
                                        return (
                                          <div key={p.id} className={styles.miniCard}>
                                            <h4>{r?.nombre ?? "Recolector"}</h4>
                                            {r && (
                                              <p className={styles.meta} style={{ margin: 0 }}>
                                                {r.celular}
                                                {r.whatsapp && " (WA)"} · {r.municipio}
                                                {r.experiencia_anios !== null && ` · ${r.experiencia_anios} año${r.experiencia_anios === 1 ? "" : "s"}`}
                                                {!r.disponible && " · EN PAUSA"}
                                              </p>
                                            )}
                                            {p.terminos_aceptados_at && (
                                              <p className={styles.meta} style={{ margin: "3px 0 0" }}>
                                                <span className={styles.badgeGood}>Aceptó los términos</span>
                                              </p>
                                            )}
                                            {["llamado", "confirmado"].includes(p.estado) && (
                                              <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                                                {p.notificado_at ? (
                                                  <span className={styles.badgeGood}>Correo enviado</span>
                                                ) : (
                                                  <span className={styles.badgeBad}>Correo sin enviar</span>
                                                )}
                                              </p>
                                            )}
                                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                                              {p.estado !== "llamado" && p.estado !== "confirmado" && (
                                                <form action={async () => { "use server"; await setPostulacionEstado(p.id, "llamado"); }}>
                                                  <button className="btn btn-sm" type="submit">Llamar</button>
                                                </form>
                                              )}
                                              {p.estado !== "confirmado" && (
                                                <form action={async () => { "use server"; await setPostulacionEstado(p.id, "confirmado"); }}>
                                                  <button className="btn btn-sm btn-solid" type="submit">Confirmar</button>
                                                </form>
                                              )}
                                              {p.estado !== "descartado" && (
                                                <form action={async () => { "use server"; await setPostulacionEstado(p.id, "descartado"); }}>
                                                  <button className="btn btn-sm" type="submit">Descartar</button>
                                                </form>
                                              )}
                                              {["llamado", "confirmado"].includes(p.estado) && (
                                                <form action={async () => { "use server"; await reenviarNotificacionLlamado(p.id); }}>
                                                  <button className="btn btn-sm" type="submit">Reenviar correo</button>
                                                </form>
                                              )}
                                              {p.estado === "confirmado" && (
                                                <ConstanciaButton datos={constanciaDe(j, p, r)} label="Constancia" />
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <h4 style={{ margin: "16px 0 6px", fontSize: 13.5, borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
                            Estado de la jornada
                          </h4>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {Object.entries(ESTADO_JORNADA).map(([key, label]) => (
                              <form key={key} action={async () => { "use server"; await setJornadaEstadoAdmin(j.id, key); }}>
                                <button className={`btn btn-sm ${j.estado === key ? "btn-solid" : ""}`} type="submit" disabled={j.estado === key}>
                                  {label}
                                </button>
                              </form>
                            ))}
                          </div>
                        </LeadModalRow>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ marginTop: 34 }}>
        <div className={styles.sectionHead}>
          <h2>Recolectores registrados ({rosterFiltrado.length}{rosterFiltrado.length !== recolectores.length && ` de ${recolectores.length}`})</h2>
        </div>
        {recolectores.length > 0 && (
          <div className={styles.tabs} style={{ flexWrap: "wrap" }}>
            <Link href="/ecp/terratalento" className={!mun && disp !== "1" ? styles.tabActive : undefined}>Todos</Link>
            <Link href="/ecp/terratalento?disp=1" className={disp === "1" && !mun ? styles.tabActive : undefined}>Solo disponibles</Link>
            {municipios.map((m) => (
              <Link key={m} href={`/ecp/terratalento?mun=${encodeURIComponent(m)}`} className={mun === m ? styles.tabActive : undefined}>
                {m}
              </Link>
            ))}
          </div>
        )}
        {rosterFiltrado.length === 0 ? (
          <p className={styles.empty}>
            {recolectores.length === 0 ? "Nadie se ha registrado todavía en terratalento.ctcexport.com." : "Ningún recolector con ese filtro."}
          </p>
        ) : (
          <div className={styles.list}>
            {rosterFiltrado.map((r) => (
              <div key={r.profile_id} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <h3>{r.nombre}</h3>
                  <span className={r.disponible ? styles.badgeGood : styles.badge}>
                    {r.disponible ? "Disponible" : "En pausa"}
                  </span>
                </div>
                <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                  {r.celular}
                  {r.whatsapp && " (WhatsApp)"} · {r.municipio}, {r.departamento}
                  {r.cedula && ` · CC ${r.cedula}`}
                  {r.experiencia_anios !== null && ` · ${r.experiencia_anios} año${r.experiencia_anios === 1 ? "" : "s"} de experiencia`}
                  {" · "}
                  {postCountByRecolector.get(r.profile_id) ?? 0} postulación
                  {(postCountByRecolector.get(r.profile_id) ?? 0) === 1 ? "" : "es"}
                </p>
                {(r.contacto_emergencia_nombre || r.medio_pago) && (
                  <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                    {r.contacto_emergencia_nombre && `Emergencia: ${r.contacto_emergencia_nombre} ${r.contacto_emergencia_celular ?? ""}`}
                    {r.contacto_emergencia_nombre && r.medio_pago && " · "}
                    {r.medio_pago && `Pago: ${r.medio_pago}`}
                  </p>
                )}
                {r.notas && (
                  <p className={styles.meta} style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>
                    &quot;{r.notas}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
