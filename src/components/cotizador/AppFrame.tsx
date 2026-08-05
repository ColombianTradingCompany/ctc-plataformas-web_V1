"use client";

// ── OCP · Cotizadores · la app real, embebida ────────────────────────────────
// Las dos calculadoras del owner (Mermas V15 y CoGS V19) se montan TAL CUAL en
// `public/ocp-apps/`. No se reescriben ni se reinterpretan: son las mismas
// aplicaciones, con sus mismos paneles, sus mismas curvas y sus mismos
// exportadores. Lo ÚNICO que cambia es cómo se conectan al sistema de CTC.
//
// Por qué un iframe y no un puerto a React: reescribirlas significaría dos
// motores que se van separando en cuanto el owner toque el HTML, y el owner las
// mantiene. Así, actualizar una calculadora es reemplazar un archivo.
//
// El puente aprovecha que el iframe es del MISMO origen: desde aquí se leen y se
// escriben sus propios <input>, y se llama a su `recalc()`. Nada de postMessage
// ni de tocar su código para que "hable" con nosotros.

import { useCallback, useEffect, useRef, useState } from "react";
import { issueQuote, reopenQuote, saveQuoteDraft } from "@/lib/cotizador/actions";
import { latestAnchor } from "@/lib/anclas/actions";
import type { Quote } from "@/lib/cotizador/types";
import styles from "./appFrame.module.css";
import panel from "@/app/bcp/(app)/shared.module.css";

/** El estado de la app: el valor de cada control con id, más su marca. */
type AppState = {
  values: Record<string, string>;
  checks: Record<string, boolean>;
  /** Variables sueltas de la app que no viven en un input (unidades por fila…). */
  globals: Record<string, unknown>;
};

const GLOBAL_KEYS = [
  "rowUnits", "unitPriceMode", "bolsaSize", "cajaVacioSize", "verdeLimpioMode", "tuesteUnit",
  "currentTariffCode", "currentPurchaseFormat", "currentTransportMode", "currentIncoCode", "currentCurrency",
  "state", // la V15 guarda TODO su modelo aquí
];

function readState(win: Window): AppState {
  const doc = win.document;
  const values: Record<string, string> = {};
  const checks: Record<string, boolean> = {};
  doc.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input[id], select[id], textarea[id]").forEach((el) => {
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) checks[el.id] = el.checked;
    else values[el.id] = el.value;
  });
  const globals: Record<string, unknown> = {};
  for (const k of GLOBAL_KEYS) {
    try {
      const v = (win as unknown as Record<string, unknown>)[k];
      if (v !== undefined && typeof v !== "function") globals[k] = JSON.parse(JSON.stringify(v));
    } catch {
      /* una global que no serializa no bloquea el guardado */
    }
  }
  return { values, checks, globals };
}

function writeState(win: Window, st: AppState) {
  const doc = win.document;
  // El evento tiene que venir de la realm del iframe o sus listeners no lo ven.
  // TS no declara `Event` en Window, de ahí el acceso por índice.
  const W = win as unknown as { Event: typeof Event };
  const fire = (el: Element, type: string) => el.dispatchEvent(new W.Event(type, { bubbles: true }));
  for (const [k, v] of Object.entries(st.globals ?? {})) {
    try {
      const w = win as unknown as Record<string, unknown>;
      // `state` se fusiona en vez de reemplazarse: la app guarda ahí campos que
      // se calculan al vuelo y que no queremos pisar con los de hace un mes.
      if (k === "state" && w.state && typeof w.state === "object") Object.assign(w.state as object, v as object);
      else w[k] = v;
    } catch {
      /* idem */
    }
  }
  for (const [id, v] of Object.entries(st.values ?? {})) {
    const el = doc.getElementById(id) as HTMLInputElement | null;
    if (el && el.value !== v) {
      el.value = v;
      fire(el, "input");
      fire(el, "change");
    }
  }
  for (const [id, c] of Object.entries(st.checks ?? {})) {
    const el = doc.getElementById(id) as HTMLInputElement | null;
    if (el && el.checked !== c) {
      el.checked = c;
      fire(el, "change");
    }
  }
  const recalc = (win as unknown as { recalc?: () => void }).recalc;
  if (typeof recalc === "function") recalc();
}

/** El titular que se guarda en la fila para poder listar sin abrir el jsonb.
 *  Se LEE de la app —ella es la que calcula—, nunca se recalcula aquí.
 *  Los ids y las variables se comprobaron contra las apps corriendo, no de oídas:
 *  la V15 muestra los importes abreviados ($4,1 M), así que sus cifras se toman
 *  de su objeto `state` y de su `lotValue()`, que son exactos. */
function readHeadline(win: Window, kind: Quote["kind"]) {
  const doc = win.document;
  const w = win as unknown as Record<string, unknown>;
  const txt = (id: string) => doc.getElementById(id)?.textContent?.trim() ?? "";
  const val = (id: string) => (doc.getElementById(id) as HTMLInputElement | null)?.value ?? "";
  const round2 = (v: number) => Math.round(v * 100) / 100;

  if (kind === "logistico") {
    // La app ya tiene su fecha y sus días de vigencia: se copian a la fila para
    // que el tablero marque «vencida» sin tener que abrir el jsonb. No se le
    // pregunta al operador dos veces lo mismo.
    const issue = val("q-date");
    const days = parseInt(val("q-validity") || "15", 10);
    let validUntil: string | null = null;
    if (issue && Number.isFinite(days)) {
      const d = new Date(`${issue}T12:00:00`);
      if (Number.isFinite(d.getTime())) { d.setDate(d.getDate() + days); validUntil = d.toISOString().slice(0, 10); }
    }
    // "$23.08 USD/kg · $10.49/lb" — el precio de VENTA, que es lo que se cotiza.
    const venta = txt("cb-price-venta") || txt("ss-price-pill");
    const usdKg = parseFloat((venta.match(/([\d.]+)\s*USD\/kg/) ?? venta.match(/\$([\d.]+)/) ?? [])[1] ?? "");
    const kg = parseFloat(val("kg-verde").replace(/\./g, "").replace(",", "."));
    const ok = Number.isFinite(usdKg) && Number.isFinite(kg);
    return {
      // La app cotiza en dólares: se guarda en dólares, no se convierte.
      currency: "USD",
      validUntil,
      total: ok ? round2(usdKg * kg) : null,
      unitLabel: ok ? `${kg} kg · US$ ${usdKg.toFixed(2)}/kg` : null,
      headline: { usdPorKg: ok ? usdKg : null, kg: ok ? kg : null, cogsUsd: txt("ss-total-usd"), cogsCop: txt("ss-total-cop"), venta },
    };
  }

  // Mermas V15: el valor del lote al precio ancla, en pesos.
  const st = w.state as { _final?: number; _totalMerma?: number; _cf?: number; _costs?: { total?: number; perKgFinal?: number } } | undefined;
  const lotValue = typeof w.lotValue === "function" ? (w.lotValue as () => number)() : NaN;
  const ok = Number.isFinite(lotValue);
  return {
    currency: "COP",
    validUntil: null as string | null,
    total: ok ? Math.round(lotValue) : null,
    unitLabel: st?._final ? `${Math.round(st._final)} kg finales · merma ${Math.round(st._totalMerma ?? 0)}%` : null,
    headline: {
      valorLote: ok ? Math.round(lotValue) : null,
      kgFinal: st?._final ?? null,
      mermaPct: st?._totalMerma ?? null,
      factorConversion: st?._cf ?? null,
      costoTotal: st?._costs?.total ?? null,
      costoPorKgFinal: st?._costs?.perKgFinal ?? null,
    },
  };
}

export function AppFrame({ quote, onSaved }: { quote: Quote; onSaved: () => void }) {
  const src = quote.kind === "logistico" ? "/ocp-apps/cotizador-logistico.html" : "/ocp-apps/cotizador-lotes.html";
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const locked = quote.status !== "borrador";
  const restored = useRef(false);

  const win = useCallback(() => ref.current?.contentWindow ?? null, []);

  // Al cargar la app, se le devuelve el estado guardado de esta cotización.
  const onLoad = useCallback(() => {
    setReady(true);
    const w = win();
    if (!w || restored.current) return;
    const saved = quote.inputs as unknown as AppState;
    if (saved && (saved.values || saved.globals)) {
      // Un tick: la app termina su primer recalc antes de que le escribamos.
      setTimeout(() => {
        try {
          writeState(w, saved);
        } catch (e) {
          setError(`No se pudo restaurar el estado guardado: ${(e as Error).message}`);
        }
      }, 350);
    }
    restored.current = true;
  }, [quote.inputs, win]);

  // Emitida = no se guarda encima, pero la app queda VIVA: exportar, imprimir y
  // trastear con los números tienen que seguir funcionando. Antes se apagaban
  // todos los controles del iframe y eso mataba los botones de Exportar.
  // Para volver a guardar hay que reabrirla, y reabrir deja rastro.

  // El ancla de mercado entra en la Calculadora de Mermas por su PROPIA función
  // (`fncRecord`), no escribiéndole el estado por dentro: así el precio queda
  // registrado como una lectura más y la herramienta lo pinta como siempre.
  // El precio se sigue usando en la herramienta; lo que se mudó a «Anclas de
  // mercado» es dónde se consulta y se acumula.
  useEffect(() => {
    if (!ready || quote.kind !== "lote") return;
    let alive = true;
    latestAnchor("fnc_carga").then((a) => {
      if (!alive || !a) return;
      const w = win() as unknown as { fncRecord?: (e: { value: number; date: string; src: string }) => void; recalc?: () => void } | null;
      if (!w?.fncRecord) return;
      w.fncRecord({ value: a.value, date: a.asOf, src: a.source === "fnc" ? "FNC" : "Anclas" });
      w.recalc?.();
    });
    return () => { alive = false; };
  }, [ready, quote.kind, win]);

  // La bitácora viaja a la app para que salga al final de los documentos que
  // genere a partir de ahora.
  useEffect(() => {
    if (!ready) return;
    const w = win();
    if (!w) return;
    const t = setTimeout(() => {
      (w as unknown as Record<string, unknown>).CTC_CHANGELOG = quote.changeLog ?? [];
    }, 300);
    return () => clearTimeout(t);
  }, [ready, quote.changeLog, win]);

  async function reopen() {
    const note = window.prompt("¿Por qué se reabre? Queda en la bitácora y se imprime al final de los documentos que generes después.", "");
    if (note === null) return; // canceló
    setBusy(true);
    setError("");
    setMsg("");
    const r = await reopenQuote(quote.id, note);
    setBusy(false);
    if (!r.ok) setError(r.error);
    else {
      setMsg("Reabierta. El cambio quedó anotado.");
      onSaved();
    }
  }

  async function save(alsoIssue: boolean) {
    const w = win();
    if (!w) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const st = readState(w);
      const head = readHeadline(w, quote.kind);
      const r = await saveQuoteDraft(quote.id, {
        inputs: st as unknown as Record<string, unknown>,
        results: head.headline as unknown as Record<string, unknown>,
        total: head.total,
        unitLabel: head.unitLabel,
        currency: head.currency,
        validUntil: head.validUntil,
      });
      if (!r.ok) {
        setError(r.error);
        setBusy(false);
        return;
      }
      if (alsoIssue) {
        if (head.total === null) {
          setError("No se pudo leer el total de la calculadora — revisa que tenga cantidad y precios.");
          setBusy(false);
          return;
        }
        const e = await issueQuote(quote.id);
        if (!e.ok) {
          setError(e.error);
          setBusy(false);
          return;
        }
      }
      setMsg(alsoIssue ? "Cotización emitida: el cálculo queda congelado." : "Borrador guardado.");
      onSaved();
    } catch (e) {
      setError(`No se pudo leer la calculadora: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <span className={panel.meta}>
          {locked
            ? "Cotización emitida — puedes consultarla y exportarla. Para cambiar los números, reábrela: queda anotado en la bitácora y sale al final de los documentos nuevos."
            : "La calculadora es la del owner, íntegra. Al guardar se archiva su estado completo en esta cotización."}
        </span>
        <span className={panel.actions}>
          {locked ? (
            <button className="btn btn-sm btn-solid" type="button" disabled={busy} onClick={reopen}>
              Reabrir para corregir
            </button>
          ) : (
            <>
              <button className="btn btn-sm" type="button" disabled={busy || !ready} onClick={() => save(false)}>
                Guardar borrador
              </button>
              <button className="btn btn-sm btn-solid" type="button" disabled={busy || !ready} onClick={() => save(true)}>
                Emitir cotización
              </button>
            </>
          )}
        </span>
      </div>
      {msg && <p className={panel.meta}>{msg}</p>}
      {error && <p className={panel.warn}>{error}</p>}
      <iframe ref={ref} src={src} className={styles.frame} title="Calculadora" onLoad={onLoad} />
    </div>
  );
}
