import { CRONS } from "@/lib/integraciones/registroCrons";
import { DOMINIOS, DOMINIO_LABEL } from "@/lib/integraciones/dominios";
import { etiquetaDeClave, type Tablero } from "@/lib/os/tablero";
import { Avisos } from "../Avisos";
import { Cifra, Hora, SaludLeida } from "../Cifra";
import { Encabezado } from "./Encabezado";
import s from "../os.module.css";

// ── CTCx OS · el Taller: la salud del sistema (V6.19, F2) ────────────────────
// Lo que ven el owner y GVB: qué versión corre, cómo van los crons (con la MISMA regla que el tablero
// de Automatizaciones), la cola de la espina por hub y las automatizaciones del registro por etapa.
// El registro de automatizaciones todavía NO está conciliado con Make (F1, crítica 25): ese bloque
// lo dice en su rótulo. El lado del Code Master («Pedidos a Code», solo el owner) será otro módulo;
// aquí no hay «Pedir un parche».

const NOMBRE_DE_CRON = new Map(CRONS.map((c) => [c.clave, c.nombre]));

export function Taller({ tablero: t, version, sha }: { tablero: Tablero; version: string; sha: string }) {
  const { crons, cola, automatizaciones } = t.taller;
  return (
    <div className={s.vista}>
      <Encabezado
        eyebrow="Módulo · Taller"
        titulo="El Taller"
        texto="La salud del sistema: la versión que corre, sus crons, la cola de la espina y el registro de automatizaciones."
      />

      <section className={s.seccion} aria-labelledby="os-version">
        <h2 id="os-version" className={s.seccionTitulo}>
          La versión que corre
        </h2>
        <div className={s.version}>
          <span className={s.versionValor}>{version}</span>
          <span className={s.mono}>build {sha}</span>
          <span className={s.mono}>
            leído <Hora iso={t.leidoAt} />
          </span>
        </div>
      </section>

      <section className={s.seccion} aria-labelledby="os-crons">
        <h2 id="os-crons" className={s.seccionTitulo}>
          Los crons
        </h2>
        <p className={s.seccionNota}>La salud de cada cron activo del registro: la misma regla que el tablero de Automatizaciones del ECP.</p>
        {crons.filas === null ? (
          <SaludLeida salud={null} />
        ) : crons.filas.length === 0 ? (
          <p className={s.texto}>El registro no tiene crons activos.</p>
        ) : (
          <div className={s.marco}>
            <table className={`${s.tabla} ${s.apilada}`}>
              <thead>
                <tr>
                  <th scope="col">Cron</th>
                  <th scope="col">Hub</th>
                  <th scope="col">Salud</th>
                </tr>
              </thead>
              <tbody>
                {crons.filas.map((c) => (
                  <tr key={c.clave}>
                    <td>
                      {NOMBRE_DE_CRON.get(c.clave) ?? c.clave}
                      <span className={s.mono} style={{ display: "block" }}>
                        {c.clave}
                      </span>
                    </td>
                    <td>{DOMINIO_LABEL[c.dominio]}</td>
                    <td>
                      <SaludLeida salud={c.salud} sinFuente />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={s.seccion} aria-labelledby="os-cola">
        <h2 id="os-cola" className={s.seccionTitulo}>
          La cola de la espina
        </h2>
        <p className={s.seccionNota}>Los eventos de integración que esperan o fallaron, en total y por hub.</p>
        <div className={s.kpis}>
          <div className={s.kpi}>
            <span className={s.kpiK}>Eventos en cola</span>
            <Cifra medida={cola.pendientes} grande abrir />
          </div>
          <div className={s.kpi}>
            <span className={s.kpiK}>Eventos fallidos</span>
            <Cifra medida={cola.fallidos} grande abrir />
          </div>
        </div>
        <div className={s.marco} style={{ marginTop: 12 }}>
          <table className={s.tabla}>
            <thead>
              <tr>
                <th scope="col">Hub</th>
                <th scope="col">En cola</th>
                <th scope="col">Fallidos</th>
              </tr>
            </thead>
            <tbody>
              {DOMINIOS.map((d) => {
                const e = t.edificios[d.id];
                return (
                  <tr key={d.id}>
                    <td>
                      {d.n} · {d.label}
                    </td>
                    <td>
                      <Cifra medida={e.cola.pendientes} sinFuente />
                    </td>
                    <td>
                      <Cifra medida={e.cola.fallidos} sinFuente />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.seccion} aria-labelledby="os-automatizaciones">
        <h2 id="os-automatizaciones" className={s.seccionTitulo}>
          Automatizaciones del registro <span className={`${s.badge} ${s.badgeAviso}`}>Registro sin conciliar</span>
        </h2>
        <p className={s.seccionNota}>
          Cuántas hay en el registro de la plataforma, por etapa. El registro todavía no está conciliado con Make (F1): estas cuentas son las del
          registro, no las de Make.
        </p>
        <div className={s.kpis}>
          {automatizaciones.map((m, i) => (
            <div key={`${m.clave ?? i}`} className={s.kpi}>
              <span className={s.kpiK}>{m.clave ? etiquetaDeClave(m.pieza, m.clave) : "Automatizaciones"}</span>
              <Cifra medida={m} grande abrir />
            </div>
          ))}
        </div>
      </section>

      <Avisos avisos={t.avisos} />
    </div>
  );
}
