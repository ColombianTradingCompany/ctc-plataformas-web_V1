"use client";

// ── ECP · IT y Plataforma · Automatizaciones ─────────────────────────────────
// El registro de automatizaciones y el pulso de la espina de integración.
//
// Existe para evitar el destino habitual de estas cosas: veinte escenarios que
// nadie recuerda para qué son y que nadie se atreve a apagar. Por eso el
// PROPÓSITO es obligatorio y la CRITICIDAD se contesta con una pregunta
// concreta: si esto se cae, ¿qué pasa?
//
// Desde el P2 (B6.0) el registro lleva también los 8 crons de la plataforma
// (`registroCrons.ts`), con su SALUD calculada de su último latido: «Atrasada»
// si una corrida esperada no cerró a tiempo, «Falló» si la última falló. Esas
// filas no se crean, borran ni cambian de disparador o etapa desde aquí.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteAutomation, emitPing, listAutomations, listRecentEvents, listUltimosLatidos, retryFailedEvents, saveAutomation,
} from "@/lib/integraciones/actions";
import { CRONS, SALUD_LABEL, saludDeCron, type Salud } from "@/lib/integraciones/registroCrons";
import {
  CRITICIDADES, CRITICIDAD_HINT, CRITICIDAD_LABEL, DOMINIOS, DOMINIO_LABEL, ETAPAS, SISTEMAS,
} from "@/lib/integraciones/dominios";
import type { Automation, IntegrationEvent, UltimoLatido } from "@/lib/integraciones/types";
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

const badgeSalud = (s: Salud) =>
  s === "ok" ? styles.badgeGood : s === "atrasada" || s === "fallo" ? styles.badgeBad : styles.badge;

const HORARIO = new Map(CRONS.map((c) => [c.clave, c.horario ?? ""]));
const esCron = (a: { disparador: string }) => a.disparador === "cron";

export function AutomatizacionesBoard() {
  const [rows, setRows] = useState<Automation[] | null>(null);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [latidos, setLatidos] = useState<UltimoLatido[]>([]);
  const [form, setForm] = useState({ ...VACIA });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [a, e, l] = await Promise.all([listAutomations(), listRecentEvents(), listUltimosLatidos()]);
    setRows(a ?? []);
    setEvents(e ?? []);
    setLatidos(l ?? []);
  }, []);

  useEffect(() => {
    Promise.all([listAutomations(), listRecentEvents(), listUltimosLatidos()]).then(([a, e, l]) => {
      setRows(a ?? []);
      setEvents(e ?? []);
      setLatidos(l ?? []);
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

  // La salud solo existe para las filas `activa` de cron con clave (B6.0); el resto no muestra estado.
  const ultimoDe = useMemo(() => new Map(latidos.map((l) => [l.clave, l])), [latidos]);
  const salud = useMemo(() => {
    const ahora = new Date();
    const out = new Map<string, Salud>();
    for (const a of rows ?? []) {
      const horario = a.clave ? HORARIO.get(a.clave) : undefined;
      if (a.etapa !== "activa" || !esCron(a) || !a.clave || !horario) continue;
      out.set(a.id, saludDeCron(horario, new Date(a.createdAt), ultimoDe.get(a.clave) ?? null, ahora));
    }
    return out;
  }, [rows, ultimoDe]);
  const alertas = [...salud.values()].filter((s) => s === "atrasada" || s === "fallo").length;

  if (rows === null) return <p className={styles.subtitle}>Cargando automatizaciones…</p>;

  return (
    <>
      <h1 className={styles.title}>Automatizaciones</h1>
      <p className={styles.subtitle}>
        Qué automatismos existen, para qué, y si siguen vivos. Cada uno declara su propósito en una frase — si no se
        puede escribir, probablemente no debería construirse. Unas corren en Make y otras son crons de la plataforma;
        todas se gobiernan aquí.
      </p>

      <div className={styles.kpiGrid}>
        {[
          ["Registradas", rows.length, `${rows.filter((r) => !esCron(r)).length} de Make · ${rows.filter(esCron).length} de la plataforma`],
          ["Activas", rows.filter((r) => r.etapa === "activa").length,
            `${rows.filter((r) => r.etapa === "activa" && !esCron(r)).length} en Make · ${rows.filter((r) => r.etapa === "activa" && esCron(r)).length} crons`],
          ["Crons con alerta", alertas, alertas ? "atrasados o fallidos" : "ninguno"],
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
                  <th>Criticidad</th><th>Etapa</th><th>Salud</th><th>Última corrida</th><th className={table.acts}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className={table.strong}>{a.nombre}</span>
                      {a.makeScenarioId && <small>Make #{a.makeScenarioId}</small>}
                      {esCron(a) && a.clave && <small>{a.clave} · {HORARIO.get(a.clave)} (UTC)</small>}
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
                    <td>
                      {salud.has(a.id)
                        ? <span className={badgeSalud(salud.get(a.id)!)}>{SALUD_LABEL[salud.get(a.id)!]}</span>
                        : <span className={table.muted}>—</span>}
                    </td>
                    <td className={table.muted}>
                      {esCron(a) && a.clave ? (
                        <>
                          {fecha(ultimoDe.get(a.clave)?.inicio ?? null)}
                          {ultimoDe.get(a.clave)?.codigo_error && <small>{ultimoDe.get(a.clave)!.codigo_error}</small>}
                        </>
                      ) : (
                        <>
                          {fecha(a.ultimaCorrida)}
                          {a.sincronizadoAt ? <small>sincronizado {fecha(a.sincronizadoAt)}</small> : <small>sin sincronizar</small>}
                        </>
                      )}
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
                      {!esCron(a) && (
                        <button className="btn btn-sm" type="button" disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`¿Borrar «${a.nombre}» del registro? El escenario en Make no se toca.`)) return;
                            void run(() => deleteAutomation(a.id), "Borrada del registro.");
                          }}>
                          Borrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={styles.meta}>
          Para los crons de la plataforma, la salud y la última corrida salen de su último latido: «Atrasada» si una corrida
          esperada no cerró a tiempo (30 min de gracia; 15 para las que corren cada hora o más seguido), «Falló» si la última
          falló. Para Make, última corrida, errores y operaciones se refrescarán de su API cuando se añada un token —
          <code>MAKE_API_TOKEN</code>. Hasta entonces esas columnas quedan vacías a propósito, en vez de mostrar algo inventado.
        </p>
      </div>

      {/* ── La espina ── */}
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Espina de integración</strong>
          <span className={styles.actions}>
            <button className="btn btn-sm" type="button" disabled={busy} onClick={() => run(emitPing, "Ping emitido: sale en seguida; si Make no responde, el despachador lo reintenta en 10 minutos.")}>
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
          Las Server Actions no llaman webhooks por su cuenta: dejan una fila aquí y el despachador la intenta enviar en
          seguida (con un techo de 3 s). Lo que no pudo salir lo recoge el despachador cada 10 minutos, que reintenta hasta
          5 veces y luego se rinde — un webhook mal configurado no puede quemar el presupuesto de Make. La columna Error solo
          muestra códigos.
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
              <select id="a-dis" value={form.disparador} disabled={esCron(form)}
                onChange={(e) => setForm({ ...form, disparador: e.target.value })}>
                {(esCron(form) ? ["cron"] : ["webhook", "calendario", "watch", "manual"]).map((d) => <option key={d} value={d}>{d}</option>)}
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
              <select id="a-eta" value={form.etapa} disabled={esCron(form)} onChange={(e) => setForm({ ...form, etapa: e.target.value })}>
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
            algo está corriendo si no existe donde corre. Las filas de <b>cron</b> son de la plataforma: su disparador, su
            etapa y su clave no se cambian aquí (un cron se para con un deploy).
          </p>
        </div>
      )}
    </>
  );
}
