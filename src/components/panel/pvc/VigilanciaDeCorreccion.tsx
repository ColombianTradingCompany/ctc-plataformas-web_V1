"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/panel/shared.module.css";
import type { MedicionDePvc, PropuestaDeCorreccion } from "@/lib/pvc/vigilancia";
import { CORRECCION } from "@/lib/pvc/correccion";
import { aprobarCorreccionAction, rechazarCorreccionAction } from "@/lib/pvc/actions";

// ── Modelo Económico · la vigilancia de la corrección (V5.178 · docs/PLAN_CICLOS.md §6) ───────────────────────────────────────────
// Lo que el barrido diario mide del ciclo en curso (contra el PVC vigente y, en el ciclo 2, contra el siguiente) y las propuestas
// por resolver: aprobar publica la edición corregida (aplica solo a lo que se firme después); rechazar pide el motivo.

export type EstadoDeLaVigilancia = { hoy: string; mediciones: MedicionDePvc[]; motivo: string | null; pendientes: PropuestaDeCorreccion[]; historial: PropuestaDeCorreccion[] };

const cop = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const dia = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "UTC" });
const ESTADO: Record<PropuestaDeCorreccion["estado"], string> = { propuesta: "Por resolver", aprobada: "Aprobada", rechazada: "Rechazada", vencida: "Vencida" };

function Barra({ n, de, color }: { n: number; de: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, verticalAlign: "middle" }} aria-label={`${n} de ${de}`}>
      {Array.from({ length: de }, (_, i) => (
        <span key={i} style={{ width: 6, height: 12, borderRadius: 2, background: i < n ? color : "var(--line)", outline: i === CORRECCION.aciertos - 1 ? "1px solid var(--ink)" : undefined }} />
      ))}
    </span>
  );
}

function Medicion({ m }: { m: MedicionDePvc }) {
  const r = m.medicion.resultado;
  const u = m.medicion.ultimas;
  // El mejor bloque completo del ciclo (si ya hay uno) o, mientras se forma, las últimas lecturas.
  const mejorAlza = r.tipo === null ? r.aciertosAlza : r.tipo === "alza" ? r.aciertos : 0;
  const mejorBaja = r.tipo === null ? r.aciertosBaja : r.tipo === "baja" ? r.aciertos : 0;
  const falta = Math.max(0, CORRECCION.bloque - u.n);
  const nota = (mejor: number, ahora: number) => (falta ? ` de las ${u.n} lecturas que hay (el primer bloque de ${CORRECCION.bloque} se completa con ${falta} más)` : ` de las últimas ${CORRECCION.bloque}${mejor > ahora ? ` · mejor bloque del ciclo: ${mejor}` : ""}`);
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", display: "grid", gap: 4 }}>
      <div style={{ fontSize: 12.5 }}>
        <b>{m.codigo}</b> ({m.relacion === "vigente" ? "vigente: se corrige" : "siguiente: se enmienda"}) · PVC <b>{cop(m.pvc)}</b> · {m.medicion.ciclo} ({dia(m.medicion.desde)} → {dia(m.medicion.hasta)})
      </div>
      <div style={{ fontSize: 12, display: "grid", gap: 3 }}>
        <span>
          Alza (FNC &gt; {cop(m.pvc)}): <Barra n={u.alza} de={CORRECCION.bloque} color="var(--good, #2e7d4f)" /> <b>{u.alza}</b>
          {nota(mejorAlza, u.alza)}
        </span>
        <span>
          Baja (FNC ≤ {cop(m.medicion.umbralBaja)}): <Barra n={u.baja} de={CORRECCION.bloque} color="var(--warn, #b5532a)" /> <b>{u.baja}</b>
          {nota(mejorBaja, u.baja)}
        </span>
      </div>
      <span className={styles.meta} style={{ margin: 0 }}>
        {m.medicion.lecturas} lecturas FNC en el ciclo{m.medicion.previas ? ` + ${m.medicion.previas} de la última semana del anterior` : ""}
        {m.medicion.ultima ? ` · la última, ${cop(m.medicion.ultima.valor)} (${dia(m.medicion.ultima.fecha)})` : ""}.{" "}
        {r.tipo ? <b>Se cumplió: {r.tipo === "alza" ? "alza" : "baja"} de {cop(r.monto)} → {cop(r.nuevoPvc)}.</b> : `Hacen falta ${CORRECCION.aciertos} en un bloque de ${CORRECCION.bloque}.`}
      </span>
    </div>
  );
}

function Pendiente({ p }: { p: PropuestaDeCorreccion }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modo, setModo] = useState<"ver" | "rechazar">("ver");
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const correr = (f: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      setMsg(null);
      const r = await f();
      if (r.ok) {
        setMsg({ ok: true, text: ok });
        router.refresh();
      } else setMsg({ ok: false, text: r.error ?? "No se pudo." });
    });
  return (
    <div style={{ border: "1.5px solid var(--primary)", borderRadius: 8, padding: "10px 12px", display: "grid", gap: 6 }}>
      <b style={{ fontSize: 13 }}>
        {p.relacion === "vigente" ? "Corrección" : "Enmienda"} propuesta · {p.codigo} · {p.tipo === "alza" ? "alza" : "baja"} de {cop(p.monto)}
        {p.topado ? ` (topada al ${CORRECCION.topePct} %)` : ""}: {cop(p.pvcActual)} → {cop(p.pvcNuevo)}
      </b>
      <span className={styles.meta} style={{ margin: 0 }}>
        {p.ciclo} · {p.aciertos} de {CORRECCION.bloque} lecturas FNC del {dia(p.bloque.desde)} al {dia(p.bloque.hasta)}; promedio {cop(p.promedio)}. Aplica solo a los contratos
        que se firmen después de aprobarla (las ofertas abiertas firman con el PVC corregido). Vence el {dia(p.cicloHasta)} si nadie la resuelve.
        {p.avisoError ? ` El correo de aviso falló: ${p.avisoError}` : ""}
      </span>
      {modo === "rechazar" && (
        <textarea className={styles.campoTexto} rows={2} placeholder="Por qué se rechaza (queda en el registro)" value={nota} onChange={(e) => setNota(e.target.value)} />
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
        {msg && (
          <span className={msg.ok ? styles.meta : styles.warn} style={{ margin: 0 }} role="status">
            {msg.text}
          </span>
        )}
        {modo === "ver" ? (
          <>
            <button type="button" className="btn btn-sm" disabled={pending} onClick={() => setModo("rechazar")}>
              Rechazar…
            </button>
            <button type="button" className="btn btn-sm btn-solid" disabled={pending} onClick={() => correr(() => aprobarCorreccionAction(p.id), "Edición corregida publicada ✓")}>
              {pending ? "Publicando…" : `Aprobar y publicar ${cop(p.pvcNuevo)}`}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-sm" disabled={pending} onClick={() => setModo("ver")}>
              Volver
            </button>
            <button type="button" className="btn btn-sm btn-solid" disabled={pending || nota.trim().length < 5} onClick={() => correr(() => rechazarCorreccionAction(p.id, nota), "Rechazada ✓")}>
              Rechazar la propuesta
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function VigilanciaDeCorreccion({ estado }: { estado: EstadoDeLaVigilancia }) {
  return (
    <div className={styles.card} id="vigilancia" style={{ display: "grid", gap: 10 }}>
      <div className={styles.sectionHead}>
        <strong>Vigilancia de la corrección</strong>
        <span className={styles.badge}>
          {CORRECCION.aciertos} de {CORRECCION.bloque} lecturas · ±{CORRECCION.topePct} %
        </span>
      </div>
      <p className={styles.meta} style={{ margin: 0 }}>
        Cada día, después de leer el FNC, se mide el ciclo en curso: <b>alza</b> si el FNC supera el PVC, <b>baja</b> si queda en o bajo PVC / 1,2. Con {CORRECCION.aciertos} de{" "}
        {CORRECCION.bloque} lecturas seguidas se propone la corrección (tope {CORRECCION.topePct} %, redondeada a $1.000), una por ciclo y por PVC; en el ciclo 2 el PVC siguiente se
        mide aparte y se enmienda.
      </p>
      {estado.motivo && <p className={styles.warn} style={{ margin: 0 }}>{estado.motivo}</p>}
      {estado.pendientes.map((p) => (
        <Pendiente key={p.id} p={p} />
      ))}
      {estado.mediciones.map((m) => (
        <Medicion key={`${m.codigo}-${m.relacion}`} m={m} />
      ))}
      {estado.historial.length > 0 && (
        <details>
          <summary className={styles.meta} style={{ cursor: "pointer", margin: 0 }}>
            Propuestas resueltas ({estado.historial.length})
          </summary>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
            {estado.historial.map((p) => (
              <li key={p.id}>
                {ESTADO[p.estado]} · {p.codigo} · {p.ciclo} · {p.tipo} {cop(p.monto)} ({cop(p.pvcActual)} → {cop(p.pvcNuevo)}){p.nota ? ` — ${p.nota}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
