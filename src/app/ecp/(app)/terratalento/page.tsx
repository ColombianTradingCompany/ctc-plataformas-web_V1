import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { LeadModalRow } from "@/app/ocp/(app)/leads/LeadModalRow";
import { setJornadaEstadoAdmin, setPostulacionEstado } from "./actions";
import styles from "@/app/bcp/(app)/shared.module.css";

// ── Terratalento · el tablero de match del ECP ──────────────────────────────
// Las fincas publican Jornadas de Recolecta desde Kaffetal Regal; los
// recolectores se postulan desde terratalento.ctcexport.com; aquí CTC hace el
// MATCH: llama, confirma cupos o descarta, y ve el roster completo. El
// productor solo ve conteos — los datos de contacto del recolector viven aquí.

type JornadaRow = {
  id: string;
  finca_id: string;
  producer_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  cupos: number;
  pago: string | null;
  condiciones: string | null;
  estado: string;
  created_at: string;
  fincas: { name: string; municipio: string | null; vereda: string | null } | null;
};

type PostRow = {
  id: string;
  jornada_id: string;
  recolector_id: string;
  estado: string;
  created_at: string;
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
  created_at: string;
};

const ESTADO_JORNADA: Record<string, string> = {
  abierta: "Abierta",
  en_gestion: "En gestión",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};
const ESTADO_POST: Record<string, string> = {
  postulado: "Postulado",
  llamado: "Llamado",
  confirmado: "Confirmado",
  descartado: "Descartado",
  retirado: "Retirado",
};

const fecha = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default async function EcpTerratalentoPage() {
  await requireConsoleAccess("ecp");
  const service = createServiceRoleClient();

  const [{ data: jornadaRows }, { data: postRows }, { data: recolectorRows }] = await Promise.all([
    service
      .from("terratalento_jornadas")
      .select("id, finca_id, producer_id, fecha_inicio, fecha_fin, cupos, pago, condiciones, estado, created_at, fincas(name, municipio, vereda)")
      .order("created_at", { ascending: false }),
    service.from("terratalento_postulaciones").select("id, jornada_id, recolector_id, estado, created_at"),
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

  return (
    <div>
      <h1 className={styles.title}>Terratalento</h1>
      <p className={styles.subtitle}>
        El match entre las Jornadas de Recolecta (publicadas por las fincas desde Kaffetal Regal) y los recolectores
        (registrados en terratalento.ctcexport.com). CTC llama, confirma cupos o descarta — el productor solo ve
        conteos; el contacto del recolector vive aquí.
      </p>

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
          <div className={styles.list}>
            {jornadas.map((j) => {
              const jPosts = (postsByJornada.get(j.id) ?? []).filter((p) => p.estado !== "retirado");
              const confirmados = jPosts.filter((p) => p.estado === "confirmado").length;
              const producer = producers.get(j.producer_id);
              return (
                <LeadModalRow
                  key={j.id}
                  title={`${j.fincas?.name ?? "Finca"} · ${fecha(j.fecha_inicio)}`}
                  anchorId={`jornada-${j.id}`}
                  summary={
                    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <b style={{ fontSize: 13.5, color: "var(--ink)" }}>{j.fincas?.name ?? "Finca"}</b>
                        <span className={j.estado === "abierta" ? styles.badgeGood : j.estado === "en_gestion" ? styles.badgeWarn : styles.badge}>
                          {ESTADO_JORNADA[j.estado] ?? j.estado}
                        </span>
                      </span>
                      <span className={styles.meta} style={{ marginTop: 0 }}>
                        {fecha(j.fecha_inicio)}
                        {j.fecha_fin && ` – ${fecha(j.fecha_fin)}`} · {confirmados}/{j.cupos} cupos · {jPosts.length} postulación
                        {jPosts.length === 1 ? "" : "es"} · {producer?.fullName ?? "Productor"}
                      </span>
                    </span>
                  }
                >
                  <p className={styles.meta} style={{ marginTop: 2 }}>
                    {[j.fincas?.vereda, j.fincas?.municipio].filter(Boolean).join(" · ")} · publicada el {fecha(j.created_at)} por{" "}
                    {producer?.fullName ?? "Productor"}
                    {j.pago && <> · <b style={{ color: "var(--ink)" }}>{j.pago}</b></>}
                  </p>
                  {j.condiciones && (
                    <p className={styles.meta} style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
                      &quot;{j.condiciones}&quot;
                    </p>
                  )}

                  <h4 style={{ margin: "16px 0 6px", fontSize: 13.5, borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
                    Postulados ({jPosts.length}) · {confirmados}/{j.cupos} confirmados
                  </h4>
                  {jPosts.length === 0 && <p className={styles.meta} style={{ margin: 0 }}>Nadie se ha postulado todavía.</p>}
                  {jPosts.map((p) => {
                    const r = recolectorById.get(p.recolector_id);
                    return (
                      <div key={p.id} style={{ borderLeft: "2px solid var(--line)", paddingLeft: 10, marginTop: 10 }}>
                        <p className={styles.meta} style={{ margin: 0 }}>
                          <b style={{ color: "var(--ink)" }}>{r?.nombre ?? "Recolector"}</b>{" "}
                          <span className={p.estado === "confirmado" ? styles.badgeGood : p.estado === "descartado" ? styles.badge : styles.badgeWarn}>
                            {ESTADO_POST[p.estado] ?? p.estado}
                          </span>
                        </p>
                        {r && (
                          <p className={styles.meta} style={{ margin: "3px 0 0" }}>
                            {r.celular}
                            {r.whatsapp && " (WhatsApp)"} · {r.municipio}, {r.departamento}
                            {r.experiencia_anios !== null && ` · ${r.experiencia_anios} año${r.experiencia_anios === 1 ? "" : "s"} de experiencia`}
                            {!r.disponible && " · EN PAUSA"}
                          </p>
                        )}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          {p.estado !== "llamado" && p.estado !== "confirmado" && (
                            <form
                              action={async () => {
                                "use server";
                                await setPostulacionEstado(p.id, "llamado");
                              }}
                            >
                              <button className="btn btn-sm" type="submit">Marcar llamado</button>
                            </form>
                          )}
                          {p.estado !== "confirmado" && (
                            <form
                              action={async () => {
                                "use server";
                                await setPostulacionEstado(p.id, "confirmado");
                              }}
                            >
                              <button className="btn btn-sm btn-solid" type="submit">Confirmar cupo</button>
                            </form>
                          )}
                          {p.estado !== "descartado" && (
                            <form
                              action={async () => {
                                "use server";
                                await setPostulacionEstado(p.id, "descartado");
                              }}
                            >
                              <button className="btn btn-sm" type="submit">Descartar</button>
                            </form>
                          )}
                          {p.estado !== "postulado" && (
                            <form
                              action={async () => {
                                "use server";
                                await setPostulacionEstado(p.id, "postulado");
                              }}
                            >
                              <button className="btn btn-sm" type="submit">Volver a postulado</button>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <h4 style={{ margin: "16px 0 6px", fontSize: 13.5, borderBottom: "1px solid var(--line)", paddingBottom: 4 }}>
                    Estado de la jornada
                  </h4>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(ESTADO_JORNADA).map(([key, label]) => (
                      <form
                        key={key}
                        action={async () => {
                          "use server";
                          await setJornadaEstadoAdmin(j.id, key);
                        }}
                      >
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
        )}
      </section>

      <section style={{ marginTop: 34 }}>
        <div className={styles.sectionHead}>
          <h2>Recolectores registrados ({recolectores.length})</h2>
        </div>
        {recolectores.length === 0 ? (
          <p className={styles.empty}>Nadie se ha registrado todavía en terratalento.ctcexport.com.</p>
        ) : (
          <div className={styles.list}>
            {recolectores.map((r) => (
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
