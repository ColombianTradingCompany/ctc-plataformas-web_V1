import { contextoDeAcciones, type Acciones as DatosDeAcciones } from "@/lib/os/acciones";
import { textosDelOs } from "@/lib/os/textos/idioma";
import { Avisos } from "../Avisos";
import { Cifra } from "../Cifra";
import { CopiarContexto } from "../CopiarContexto";
import { Encabezado } from "./Encabezado";
import s from "../os.module.css";

// ── CTCx OS · el módulo Acciones (F3, en obra) ───────────────────────────────
// La sala de mando del hub 8 · Ejecución: las tareas de la plataforma y las Tareas de Notion, lado a lado
// por hub, cada cifra con su pieza (su fuente y su «Abrir») y ninguna suma que mezcle las dos. Hasta la
// integración de solo lectura del OS (decisión CON-28), la mitad de Notion dice «Sin datos» con su nota.
// No marca ni cierra nada: cada tarea se resuelve en su pantalla. Todos sus textos salen de `textos/`
// (una fuente por idioma; `qa-os-check` F3 vigila que esta vista no escriba texto propio).

export function Acciones({ acciones: a }: { acciones: DatosDeAcciones }) {
  const t = textosDelOs();
  const x = t.acciones;
  return (
    <div className={s.vista}>
      <Encabezado eyebrow={x.eyebrow} titulo={x.titulo} texto={x.texto} />

      {a.notion === "sin_integracion" && (
        <p role="status" className={`${s.apagado} ${s.texto}`}>
          <strong>{t.enObra}.</strong> {x.obra}
        </p>
      )}

      <section className={s.seccion} aria-labelledby="os-acciones-totales">
        <h2 id="os-acciones-totales" className={s.seccionTitulo}>
          {x.totalesTitulo}
        </h2>
        <div className={s.kpis}>
          <div className={s.kpi}>
            <span className={s.kpiK}>{x.totalPlataforma}</span>
            <Cifra medida={a.totales.plataformaAbiertas} grande abrir />
          </div>
          <div className={s.kpi}>
            <span className={s.kpiK}>{x.totalNotion}</span>
            <Cifra medida={a.totales.notionAbiertas} grande />
          </div>
          <div className={s.kpi}>
            <span className={s.kpiK}>{x.totalEsperando}</span>
            <Cifra medida={a.totales.notionEsperando} grande />
          </div>
          <div className={s.kpi}>
            <span className={s.kpiK}>{x.totalSinHub}</span>
            <Cifra medida={a.totales.notionSinHub} grande />
          </div>
        </div>
      </section>

      <section className={s.seccion} aria-labelledby="os-acciones-hubs">
        <h2 id="os-acciones-hubs" className={s.seccionTitulo}>
          {x.porHubTitulo}
        </h2>
        <p className={s.seccionNota}>{x.porHubNota}</p>
        <div className={s.marco} role="region" aria-label={x.marcoAria} tabIndex={0}>
          <table className={s.tabla}>
            <thead>
              <tr>
                <th scope="col">{x.columnaHub}</th>
                <th scope="col">{x.columnaPlataformaAbiertas}</th>
                <th scope="col">{x.columnaPlataformaVencidas}</th>
                <th scope="col">{x.columnaNotionAbiertas}</th>
                <th scope="col">{x.columnaNotionVencidas}</th>
                <th scope="col">{x.columnaNotionEsperando}</th>
              </tr>
            </thead>
            <tbody>
              {a.filas.map((f) => (
                <tr key={f.dominio}>
                  <td>
                    {f.n} · {f.label}
                  </td>
                  <td>
                    <Cifra medida={f.plataforma.abiertas} sinFuente />
                  </td>
                  <td>
                    <Cifra medida={f.plataforma.vencidas} sinFuente />
                  </td>
                  <td>
                    <Cifra medida={f.notion.abiertas} sinFuente />
                  </td>
                  <td>
                    <Cifra medida={f.notion.vencidas} sinFuente />
                  </td>
                  <td>
                    <Cifra medida={f.notion.esperando} sinFuente />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.seccionNota} style={{ marginTop: 12 }}>
          {x.nadaSale}
        </p>
      </section>

      <Avisos avisos={a.avisos} />
      <div className={s.acciones}>
        <CopiarContexto texto={contextoDeAcciones(a)} />
      </div>
    </div>
  );
}
