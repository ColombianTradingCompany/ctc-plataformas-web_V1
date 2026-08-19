import { createServiceRoleClient } from "@/lib/supabase/server";
import { InteresTtRow } from "./InteresTtRow";
import styles from "@/components/panel/shared.module.css";

// ── Terratalento · la lista de espera PRE-LANZAMIENTO (A6, 2026-08-19) ───────
// Tablero propio y no un `InteresBoard` más, por la misma razón por la que la
// tabla es propia: aquí la pregunta no es «a quién hay que escribirle» sino
// **dónde hay manos y de qué lado están**. Los KPI son el reparto por rol y los
// municipios con más gente — que es lo que decide por dónde se abre Terratalento
// cuando abra. Contar idiomas aquí no habría dicho nada.
//
// Lee `terratalento_interes` con service role (RLS encendida, cero políticas).

type TtRow = {
  id: string;
  email: string;
  rol: string;
  municipio: string;
  lang: string | null;
  created_at: string;
  contacted_at: string | null;
};

const ROL_LABEL: Record<string, string> = { recolector: "Recoge café", finca: "Busca manos" };

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

export async function InteresTerratalentoBoard() {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("terratalento_interes")
    .select("id, email, rol, municipio, lang, created_at, contacted_at")
    .order("created_at", { ascending: false });
  const filas = (data as TtRow[] | null) ?? [];

  const pendientes = filas.filter((f) => !f.contacted_at);
  const contactados = filas.filter((f) => f.contacted_at);

  const recolectores = filas.filter((f) => f.rol === "recolector").length;
  const fincas = filas.filter((f) => f.rol === "finca").length;

  // El municipio se normaliza SOLO para contar: se guarda tal y como lo
  // escribieron, pero «San Gil» y «san gil» son el mismo sitio y contarlos
  // aparte convertiría el KPI en ruido.
  const porMunicipio = new Map<string, { nombre: string; n: number }>();
  for (const f of filas) {
    const clave = f.municipio.trim().toLocaleLowerCase("es-CO");
    const previo = porMunicipio.get(clave);
    porMunicipio.set(clave, { nombre: previo?.nombre ?? f.municipio.trim(), n: (previo?.n ?? 0) + 1 });
  }
  const municipiosTop = [...porMunicipio.values()].sort((a, b) => b.n - a.n).slice(0, 3);

  const kpis = [
    { k: "Apuntados", v: String(filas.length), sub: "antes de abrir" },
    { k: "Recolectores", v: String(recolectores), sub: recolectores ? "manos disponibles" : "todavía ninguno" },
    { k: "Fincas", v: String(fincas), sub: fincas ? "buscando manos" : "todavía ninguna" },
    {
      k: "Municipios",
      v: porMunicipio.size ? String(porMunicipio.size) : "—",
      sub: municipiosTop.map((m) => `${m.nombre}: ${m.n}`).join(" · ") || "sin datos",
    },
  ];

  return (
    <div>
      <h2 className={styles.title} style={{ fontSize: 20 }}>
        Lista de espera · antes de abrir
      </h2>
      <p className={styles.subtitle}>
        Quién dejó sus datos en la ficha de Terratalento del índice de la red, mientras la plataforma todavía no abre.
        No es una lista de correo: el rol y el municipio son lo que dice dónde hay manos y de qué lado están, y eso no
        se puede reconstruir después. Las altas llegan solas desde la portada — aquí no se crea ninguna.
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

      <section style={{ marginTop: 26 }}>
        <div className={styles.sectionHead}>
          <h2>Sin contactar ({pendientes.length})</h2>
        </div>
        {pendientes.length === 0 ? (
          <p className={styles.empty}>
            {filas.length === 0
              ? "Todavía no se ha apuntado nadie. Las altas llegan desde la ficha de Terratalento, en el índice de la red de la portada."
              : "No queda nadie por contactar en esta lista."}
          </p>
        ) : (
          <div className={styles.list}>
            {pendientes.map((f) => (
              <InteresTtRow
                key={f.id}
                id={f.id}
                email={f.email}
                detalle={`${ROL_LABEL[f.rol] ?? f.rol} · ${f.municipio}`}
                desde={fecha(f.created_at)}
                contactado={false}
              />
            ))}
          </div>
        )}
      </section>

      {contactados.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <div className={styles.sectionHead}>
            <h2>Ya contactados ({contactados.length})</h2>
          </div>
          <div className={styles.list}>
            {contactados.map((f) => (
              <InteresTtRow
                key={f.id}
                id={f.id}
                email={f.email}
                detalle={`${ROL_LABEL[f.rol] ?? f.rol} · ${f.municipio}`}
                desde={fecha(f.created_at)}
                contactado
                contactadoEl={f.contacted_at ? fecha(f.contacted_at) : null}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
