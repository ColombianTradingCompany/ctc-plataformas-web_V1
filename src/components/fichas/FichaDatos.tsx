import { ATRIBUTO_LABEL, ATRIBUTOS_SCA, type FichaTecnicaData } from "@/lib/fichas/tipos";

// ── FichaDatos: una Ficha Técnica del set, en filas legibles ────────────────
// Presentacional puro, compartido por las DOS superficies que muestran el set:
// /ocp/fichas (CTCx revisa lo extraído) y los panes B2/B3 del productor
// (FichasDelLote). Sin estilos propios de módulo: hereda tipografía del
// contenedor y usa una grilla mínima inline — cada superficie lo enmarca con
// su propia tarjeta.

const fmt = (n: number | null) => (n == null ? null : String(n));
const pct = (n: number | null) => (n == null ? null : `${n}%`);

function Fila({ label, value }: { label: string; value: string | null }) {
  if (value == null) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "2px 0" }}>
      <span style={{ opacity: 0.75 }}>{label}</span>
      <b style={{ textAlign: "right" }}>{value}</b>
    </div>
  );
}

export function FichaDatos({ data, mostrar = "todo" }: { data: FichaTecnicaData; mostrar?: "sensorial" | "fisico" | "todo" }) {
  const sensorial = mostrar !== "fisico";
  const fisico = mostrar !== "sensorial";

  const atributos = data.atributos
    ? ATRIBUTOS_SCA.filter((k) => data.atributos?.[k] != null).map((k) => `${ATRIBUTO_LABEL[k]} ${data.atributos?.[k]}`)
    : [];
  const mallas = data.mallas?.length ? data.mallas.map((m) => `${m.malla} ${m.porcentaje}%`).join(" · ") : null;

  const nadaSensorial = data.puntaje == null && !atributos.length && !data.notas_cata && !data.catador && !data.laboratorio;
  const nadaFisico =
    data.factor_rendimiento == null && data.almendra_total_g == null && data.densidad_verde_gl == null &&
    data.humedad_pergamino_pct == null && data.humedad_verde_pct == null && data.actividad_agua == null &&
    !mallas && !data.defectos;

  return (
    <div style={{ fontSize: 13, lineHeight: 1.45 }}>
      {sensorial && (
        <>
          <Fila label="Puntaje en taza" value={data.puntaje != null ? `${data.puntaje}${data.escala ? ` (${data.escala.toUpperCase()})` : ""}` : null} />
          {atributos.length > 0 && (
            <div style={{ padding: "2px 0" }}>
              <span style={{ opacity: 0.75 }}>Atributos</span>
              <div style={{ marginTop: 2 }}>{atributos.join(" · ")}</div>
            </div>
          )}
          {data.notas_cata && (
            <div style={{ padding: "2px 0" }}>
              <span style={{ opacity: 0.75 }}>Notas de cata</span>
              <div style={{ marginTop: 2 }}>{data.notas_cata}</div>
            </div>
          )}
          <Fila label="Catador" value={data.catador} />
          <Fila label="Laboratorio" value={data.laboratorio} />
          <Fila label="Fecha del análisis" value={data.fecha_analisis} />
          {nadaSensorial && mostrar === "sensorial" && <p style={{ margin: 0, opacity: 0.6 }}>Esta ficha no trae datos sensoriales.</p>}
        </>
      )}
      {fisico && (
        <>
          <Fila label="Factor de Rendimiento" value={fmt(data.factor_rendimiento)} />
          <Fila label="Almendra Total" value={data.almendra_total_g != null ? `${data.almendra_total_g} g` : null} />
          <Fila label="Densidad en Verde" value={data.densidad_verde_gl != null ? `${data.densidad_verde_gl} g/L` : null} />
          <Fila label="Humedad en Pergamino" value={pct(data.humedad_pergamino_pct)} />
          <Fila label="Humedad en Verde" value={pct(data.humedad_verde_pct)} />
          <Fila label="Actividad de Agua" value={fmt(data.actividad_agua)} />
          {mallas && (
            <div style={{ padding: "2px 0" }}>
              <span style={{ opacity: 0.75 }}>Granulometría</span>
              <div style={{ marginTop: 2 }}>{mallas}</div>
            </div>
          )}
          {data.defectos && (
            <div style={{ padding: "2px 0" }}>
              <span style={{ opacity: 0.75 }}>Defectos</span>
              <div style={{ marginTop: 2 }}>{data.defectos}</div>
            </div>
          )}
          {nadaFisico && mostrar === "fisico" && <p style={{ margin: 0, opacity: 0.6 }}>Esta ficha no trae datos físicos.</p>}
        </>
      )}
    </div>
  );
}
