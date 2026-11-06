import { DOMINIO_LABEL } from "@/lib/integraciones/dominios";
import { contextoDeLaEstafeta, type Estafeta as DatosDeLaEstafeta } from "@/lib/os/estafeta";
import { textosDelOs } from "@/lib/os/textos/idioma";
import { Avisos } from "../Avisos";
import { Cifra, Hora } from "../Cifra";
import { CopiarContexto } from "../CopiarContexto";
import { Encabezado } from "./Encabezado";
import s from "../os.module.css";

// ── CTCx OS · el módulo Estafeta (F3, en obra) ───────────────────────────────
// El mostrador del hub 7 · Directorios (CANALES §4.2): las tres bandejas (Te toca · Esperando a otros ·
// Por revisar), las cartas en «Te toca» por hub con la más vieja, y el Libro de entrada y salida. Solo
// punteros: ni el texto, ni el asunto, ni la persona de un mensaje llegan hasta aquí. No tiene botones salvo
// «Copiar contexto para Tailor»: no envía ni escribe borradores. Hasta la integración de solo lectura del
// OS (decisión CON-28) todo dice «Sin datos». Todos sus textos salen de `textos/` (`qa-os-check` F3).

export function Estafeta({ estafeta: e }: { estafeta: DatosDeLaEstafeta }) {
  const t = textosDelOs();
  const x = t.estafeta;
  return (
    <div className={s.vista}>
      <Encabezado eyebrow={x.eyebrow} titulo={x.titulo} texto={x.texto} />

      {e.notion === "sin_integracion" && (
        <p role="status" className={`${s.apagado} ${s.texto}`}>
          <strong>{t.enObra}.</strong> {x.obra}
        </p>
      )}

      <section className={s.seccion} aria-labelledby="os-estafeta-bandejas">
        <h2 id="os-estafeta-bandejas" className={s.seccionTitulo}>
          {x.bandejasTitulo}
        </h2>
        <p className={s.seccionNota}>{x.bandejasNota}</p>
        <div className={s.kpis}>
          <div className={s.kpi}>
            <span className={s.kpiK}>{x.bandejas.te_toca}</span>
            <Cifra medida={e.bandejas.teToca} grande />
            <span className={s.seccionNota}>{x.bandejaNotas.te_toca}</span>
          </div>
          <div className={s.kpi}>
            <span className={s.kpiK}>{x.bandejas.esperando}</span>
            <Cifra medida={e.bandejas.esperando} grande />
            <span className={s.seccionNota}>{x.bandejaNotas.esperando}</span>
          </div>
          <div className={s.kpi}>
            <span className={s.kpiK}>{x.bandejas.revisar}</span>
            <Cifra medida={e.bandejas.revisar} grande />
            <span className={s.seccionNota}>{x.bandejaNotas.revisar}</span>
          </div>
        </div>
      </section>

      <section className={s.seccion} aria-labelledby="os-estafeta-hubs">
        <h2 id="os-estafeta-hubs" className={s.seccionTitulo}>
          {x.porHubTitulo}
        </h2>
        <p className={s.seccionNota}>{x.porHubNota}</p>
        <div className={s.marco}>
          <table className={s.tabla}>
            <thead>
              <tr>
                <th scope="col">{x.columnaHub}</th>
                <th scope="col">{x.columnaTeToca}</th>
                <th scope="col">{x.columnaMasVieja}</th>
              </tr>
            </thead>
            <tbody>
              {e.porHub.map((h) => (
                <tr key={h.dominio}>
                  <td>
                    {h.n} · {h.label}
                  </td>
                  <td>
                    <Cifra medida={h.teToca} sinFuente />
                  </td>
                  <td>{h.masVieja ? <Hora iso={h.masVieja} /> : h.teToca.valor === null ? null : x.sinCartas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.seccion} aria-labelledby="os-estafeta-libro">
        <h2 id="os-estafeta-libro" className={s.seccionTitulo}>
          {x.libroTitulo}
        </h2>
        <p className={s.seccionNota}>{x.libroNota}</p>
        <Cifra medida={e.libro.total} />
        {e.libro.cartas !== null && e.libro.cartas.length === 0 && <p className={s.texto}>{x.libroVacio}</p>}
        {e.libro.cartas !== null && e.libro.cartas.length > 0 && (
          <>
            <div className={s.marco} role="region" aria-label={x.libroTitulo} tabIndex={0} style={{ marginTop: 12 }}>
              <table className={s.tabla}>
                <thead>
                  <tr>
                    <th scope="col">{x.columnaFecha}</th>
                    <th scope="col">{x.columnaCanal}</th>
                    <th scope="col">{x.columnaDireccion}</th>
                    <th scope="col">{x.columnaHub}</th>
                    <th scope="col">{x.columnaEstado}</th>
                    <th scope="col">{x.columnaBandeja}</th>
                  </tr>
                </thead>
                <tbody>
                  {e.libro.cartas.map((c, i) => (
                    <tr key={`${c.fecha}-${i}`}>
                      <td>
                        <Hora iso={c.fecha} />
                      </td>
                      <td>{x.canales[c.canal]}</td>
                      <td>{x.direcciones[c.direccion]}</td>
                      <td>{c.hub ? DOMINIO_LABEL[c.hub] : x.sinHub}</td>
                      <td>{x.estados[c.visible]}</td>
                      <td>
                        <span className={`${s.badge} ${s.badgeNeutro}`}>{x.bandejas[c.bandeja]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className={s.seccionNota} style={{ marginTop: 12 }}>
          {x.nadaSale}
        </p>
      </section>

      <Avisos avisos={e.avisos} />
      <div className={s.acciones}>
        <CopiarContexto texto={contextoDeLaEstafeta(e)} />
      </div>
    </div>
  );
}
