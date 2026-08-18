"use client";

// ── ECP · IT y Plataforma · Automatizaciones ─────────────────────────────────
// El registro de automatizaciones y el pulso de la espina de integración.
//
// Existe para evitar el destino habitual de estas cosas: veinte escenarios que
// nadie recuerda para qué son y que nadie se atreve a apagar. Por eso el
// PROPÓSITO es obligatorio y la CRITICIDAD se contesta con una pregunta
// concreta: si esto se cae, ¿qué pasa?

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteAutomation, emitPing, listAutomations, listRecentEvents, retryFailedEvents, saveAutomation,
} from "@/lib/integraciones/actions";
import {
  CRITICIDADES, CRITICIDAD_HINT, CRITICIDAD_LABEL, DOMINIOS, DOMINIO_LABEL, ETAPAS, SISTEMAS,
} from "@/lib/integraciones/dominios";
import type { Automation, IntegrationEvent } from "@/lib/integraciones/types";
import styles from "@/components/panel/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";

const VACIA = {
  id: undefined as string | undefined,
  nombre: "", proposito: "", dominio: "it_plataforma", disparador: "webhook",
  sistemas: [] as string[], criticidad: "experimental", etapa: "propuesta",
  makeScenarioId: "" as string, notas: "",
};

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const badgeEstado = (e: IntegrationEvent["estado"]) =>
  e === "enviado" ? styles.badgeGood : e === "fallido" ? styles.badgeBad : styles.badge;

export function AutomatizacionesBoard() {
  const [rows, setRows] = useState<Automation[] | null>(null);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [form, setForm] = useState({ ...VACIA });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [a, e] = await Promise.all([listAutomations(), listRecentEvents()]);
    setRows(a ?? []);
    setEvents(e ?? []);
  }, []);

  useEffect(() => {
    Promise.all([listAutomations(), listRecentEvents()]).then(([a, e]) => {
      setRows(a ?? []);
      setEvents(e ?? []);
    });
  }, []);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setBusy(true); setError(""); setMsg("");
    const r = await fn();
    if (!r.ok) setError(r.error ?? "No se pudo.");
    else { setMsg(ok); await refresh(); }
    setBusy(false);
  }

  const pendientes = useMemo(() => events.filter((e) => e.estado === "pendiente").length, [events]);
  const fallidos = useMemo(() => events.filter((e) => e.estado === "fallido").length, [events]);

  if (rows === null) return <p className={styles.subtitle}>Cargando automatizaciones…</p>;

  return (
    <>
      <h1 className={styles.title}>Automatizaciones</h1>
      <p className={styles.subtitle}>
        Qué automatismos existen, para qué, y si siguen vivos. Cada uno declara su propósito en una frase — si no se
        puede escribir, probablemente no debería construirse. Las automatizaciones corren en Make; aquí se gobiernan.
      </p>

      <div className={styles.kpiGrid}>
        {[
          ["Registradas", rows.length, "en todas las etapas"],
          ["Activas", rows.filter((r) => r.etapa === "activa").length, "corriendo en Make"],
          ["Eventos en cola", pendientes, "esperando despacho"],
          ["Eventos fallidos", fallidos, fallidos ? "se rindieron tras 5 intentos" : "ninguno"],
        ].map(([k, v, sub]) => (
          <div key={String(k)} className={styles.kpiCard}>
            <span className={styles.kpiTop}><span className={styles.kpiK}>{k}</span></span>
            <span className={styles.kpiV} style={{ display: "block" }}>{v}</span>
            <span className={styles.kpiSub}>{sub}</span>
          </div>
        ))}
      </div>

      {/* ── El registro ── */}
      <div className={styles.card} style={{ marginTop: 18 }}>
        <div className={styles.sectionHead}>
          <strong>Registro</strong>
          <span className={styles.actions}>
            <button className="btn btn-sm btn-solid" type="button" onClick={() => { setForm({ ...VACIA }); setOpen(true); }}>
              Registrar automatización
            </button>
          </span>
        </div>

        {rows.length === 0 ? (
          <p className={styles.meta}>Todavía no hay ninguna. Empieza registrando la que quieras construir — primero el propósito, después el escenario.</p>
        ) : (
          <div className={table.scroll}>
            <table className={table.t}>
              <thead>
                <tr>
                  <th>Nombre</th><th>Propósito</th><th>Dominio</th><th>Sistemas</th>
                  <th>Criticidad</th><th>Etapa</th><th>Última corrida</th><th className={table.acts}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className={table.strong}>{a.nombre}</span>
                      {a.makeScenarioId && <small>Make #{a.makeScenarioId}</small>}
                    </td>
                    <td style={{ maxWidth: 280 }}>{a.proposito}</td>
                    <td>{DOMINIO_LABEL[a.dominio]}</td>
                    <td className={table.muted}>{a.sistemas.join(" · ") || "—"}</td>
                    <td>
                      <span className={a.criticidad === "critica" ? styles.badgeBad : styles.badge}>
                        {CRITICIDAD_LABEL[a.criticidad]}
                      </span>
                    </td>
                    <td>
                      <span className={a.etapa === "activa" ? styles.badgeGood : styles.badge}>{a.etapa}</span>
                    </td>
                    <td className={table.muted}>
                      {fecha(a.ultimaCorrida)}
                      {a.sincronizadoAt ? <small>sincronizado {fecha(a.sincronizadoAt)}</small> : <small>sin sincronizar</small>}
                    </td>
                    <td className={table.acts}>
                      <button className="btn btn-sm" type="button" disabled={busy}
                        onClick={() => {
                          setForm({
                            id: a.id, nombre: a.nombre, proposito: a.proposito, dominio: a.dominio,
                            disparador: a.disparador, sistemas: a.sistemas, criticidad: a.criticidad,
                            etapa: a.etapa, makeScenarioId: a.makeScenarioId ? String(a.makeScenarioId) : "",
                            notas: a.notas ?? "",
                          });
                          setOpen(true);
                        }}>
                        Editar
                      </button>
                      <button className="btn btn-sm" type="button" disabled={busy}
                        onClick={() => {
                          if (!window.confirm(`¿Borrar «${a.nombre}» del registro? El escenario en Make no se toca.`)) return;
                          void run(() => deleteAutomation(a.id), "Borrada del registro.");
                        }}>
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={styles.meta}>
          Última corrida, errores y operaciones se refrescarán del API de Make cuando se añada un token —
          <code>MAKE_API_TOKEN</code>. Hasta entonces esas columnas quedan vacías a propósito, en vez de mostrar algo inventado.
        </p>
      </div>

      {/* ── La espina ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Espina de integración</strong>
          <span className={styles.actions}>
            <button className="btn btn-sm" type="button" disabled={busy} onClick={() => run(emitPing, "Ping emitido: queda en la cola hasta que el despachador corra.")}>
              Emitir ping de prueba
            </button>
            {fallidos > 0 && (
              <button className="btn btn-sm" type="button" disabled={busy} onClick={() => run(retryFailedEvents, "Reencolados.")}>
                Reintentar fallidos
              </button>
            )}
          </span>
        </div>
        <p className={styles.meta}>
          Las Server Actions no llaman webhooks: dejan una fila aquí y siguen. El despachador la envía cada 15 minutos,
          reintenta hasta 5 veces y luego se rinde — un webhook mal configurado no puede quemar el presupuesto de Make.
        </p>

        {events.length === 0 ? (
          <p className={styles.meta}><em>Sin eventos todavía.</em></p>
        ) : (
          <div className={table.scroll}>
            <table className={table.t}>
              <thead><tr><th>Cuándo</th><th>Tipo</th><th>Dominio</th><th>Estado</th><th>Destino</th><th>Error</th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className={table.muted}>{fecha(e.created_at)}</td>
                    <td><span className={table.strong}>{e.tipo}</span></td>
                    <td className={table.muted}>{DOMINIO_LABEL[e.dominio] ?? e.dominio}</td>
                    <td>
                      <span className={badgeEstado(e.estado)}>{e.estado}</span>
                      {e.intentos > 0 && <small>{e.intentos} intento(s)</small>}
                    </td>
                    <td className={table.muted}>{e.destino ?? "—"}</td>
                    <td className={table.muted} style={{ maxWidth: 240 }}>{e.ultimo_error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {msg && <p className={styles.meta}>{msg}</p>}
      {error && <p className={styles.warn}>{error}</p>}

      {/* ── Alta / edición ── */}
      {open && (
        <div className={styles.card}>
          <div className={styles.sectionHead}>
            <strong>{form.id ? "Editar automatización" : "Registrar automatización"}</strong>
          </div>
          <form
            className={styles.formGrid}
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(
                () => saveAutomation({
                  id: form.id, nombre: form.nombre, proposito: form.proposito, dominio: form.dominio,
                  disparador: form.disparador, sistemas: form.sistemas, criticidad: form.criticidad,
                  etapa: form.etapa, makeScenarioId: form.makeScenarioId ? Number(form.makeScenarioId) : null,
                  notas: form.notas,
                }),
                form.id ? "Actualizada." : "Registrada."
              );
              void ok;
              setOpen(false);
            }}
          >
            <div className={styles.field} style={{ minWidth: 200 }}>
              <label htmlFor="a-nom">Nombre</label>
              <input id="a-nom" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div className={styles.field} style={{ flex: 1, minWidth: 300 }}>
              <label htmlFor="a-pro">Propósito · una frase</label>
              <input id="a-pro" value={form.proposito} placeholder="Ej: publica en Instagram lo que el ECP da por bueno en Coffeed"
                onChange={(e) => setForm({ ...form, proposito: e.target.value })} required />
            </div>
            <div className={styles.field} style={{ minWidth: 190 }}>
              <label htmlFor="a-dom">Dominio</label>
              <select id="a-dom" value={form.dominio} onChange={(e) => setForm({ ...form, dominio: e.target.value })}>
                {DOMINIOS.map((d) => <option key={d.id} value={d.id}>{d.n} · {d.label}</option>)}
              </select>
            </div>
            <div className={styles.field} style={{ minWidth: 150 }}>
              <label htmlFor="a-dis">Disparador</label>
              <select id="a-dis" value={form.disparador} onChange={(e) => setForm({ ...form, disparador: e.target.value })}>
                {["webhook", "calendario", "watch", "manual"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className={styles.field} style={{ minWidth: 160 }}>
              <label htmlFor="a-cri">Criticidad</label>
              <select id="a-cri" value={form.criticidad} onChange={(e) => setForm({ ...form, criticidad: e.target.value })}>
                {CRITICIDADES.map((c) => <option key={c} value={c}>{CRITICIDAD_LABEL[c]}</option>)}
              </select>
              <span className={styles.meta}>{CRITICIDAD_HINT[form.criticidad as keyof typeof CRITICIDAD_HINT]}</span>
            </div>
            <div className={styles.field} style={{ minWidth: 140 }}>
              <label htmlFor="a-eta">Etapa</label>
              <select id="a-eta" value={form.etapa} onChange={(e) => setForm({ ...form, etapa: e.target.value })}>
                {ETAPAS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.field} style={{ minWidth: 160 }}>
              <label htmlFor="a-make">Escenario de Make (id)</label>
              <input id="a-make" inputMode="numeric" value={form.makeScenarioId} placeholder="vacío si aún no existe"
                onChange={(e) => setForm({ ...form, makeScenarioId: e.target.value })} />
            </div>
            <div className={styles.field} style={{ flex: 1, minWidth: 260 }}>
              <label>Sistemas que toca</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SISTEMAS.map((s) => (
                  <label key={s} className={styles.taskCheck}>
                    <input type="checkbox" checked={form.sistemas.includes(s)}
                      onChange={(e) => setForm({
                        ...form,
                        sistemas: e.target.checked ? [...form.sistemas, s] : form.sistemas.filter((x) => x !== s),
                      })} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.field} style={{ flex: 1, minWidth: 260 }}>
              <label htmlFor="a-not">Notas</label>
              <input id="a-not" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </div>
            <div className={styles.actions}>
              <button className="btn btn-sm btn-solid" type="submit" disabled={busy}>Guardar</button>
              <button className="btn btn-sm" type="button" onClick={() => setOpen(false)}>Cancelar</button>
            </div>
          </form>
          <p className={styles.meta}>
            Marcar <b>activa</b> o <b>pausada</b> exige el id del escenario en Make — el registro no puede afirmar que
            algo está corriendo si no existe donde corre.
          </p>
        </div>
      )}
    </>
  );
}
