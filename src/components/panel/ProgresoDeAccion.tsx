"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

/** Lo que dice el botón mientras corre: qué hace, y cuánto suele tardar (lo aprende por navegador). */
export type Progreso = { clave: string; etiqueta: string; tipicoMs: number };

// ── V5.163 (owner, 2026-10-06): «si se hizo el trigger pero toma un momento, necesito algo que muestre que es así y cuánto falta» ──
// Una Server Action no reporta avance; lo honesto es decir que YA arrancó, cuánto lleva, y cuánto suele tardar. El estimado
// parte de un valor típico por acción y APRENDE: cada vez que una acción termina, su duración se mezcla en una media móvil
// guardada en este navegador (localStorage, con try/catch — si no hay almacenamiento, se queda el valor típico).

export type EnCurso = { clave: string; etiqueta: string; desde: number; estimadoMs: number };

const LLAVE = (clave: string) => `ctc-duracion-accion:${clave}`;

/** El estimado de una acción: lo aprendido en este navegador, o el valor típico. */
export function estimadoDe(clave: string, tipicoMs: number): number {
  try {
    const v = Number(window.localStorage.getItem(LLAVE(clave)));
    return Number.isFinite(v) && v > 300 ? v : tipicoMs;
  } catch {
    return tipicoMs;
  }
}

/** Al terminar: mezcla la duración real en la media móvil (70 % lo anterior, 30 % lo nuevo). */
export function aprendeDuracion(clave: string, tipicoMs: number, duracionMs: number) {
  try {
    const previo = estimadoDe(clave, tipicoMs);
    window.localStorage.setItem(LLAVE(clave), String(Math.round(previo * 0.7 + duracionMs * 0.3)));
  } catch {
    /* sin almacenamiento: no pasa nada, queda el típico */
  }
}

const seg = (ms: number) => Math.max(0, Math.round(ms / 1000));

/** V5.164 (owner: «extiende el avance a las demás acciones largas de las consolas»): un hook para cualquier pantalla.
 *  `conAvance(fn, progreso)` envuelve la llamada: enseña el avance mientras corre, aprende cuánto tardó y siempre limpia. */
export function useAvance() {
  const [enCurso, setEnCurso] = useState<EnCurso | null>(null);
  async function conAvance<T>(fn: () => Promise<T>, progreso?: Progreso): Promise<T> {
    if (!progreso) return fn();
    const desde = Date.now();
    setEnCurso({ clave: progreso.clave, etiqueta: progreso.etiqueta, desde, estimadoMs: estimadoDe(progreso.clave, progreso.tipicoMs) });
    try {
      const r = await fn();
      aprendeDuracion(progreso.clave, progreso.tipicoMs, Date.now() - desde);
      return r;
    } finally {
      setEnCurso(null);
    }
  }
  return { enCurso, conAvance };
}

/** Las acciones largas de las consolas y su tiempo típico (el de arranque; luego manda lo aprendido). */
export const AVANCE = {
  galardonar: { clave: "galardonar", etiqueta: "Registrando el galardón", tipicoMs: 4000 },
  noSupera: { clave: "no-supera", etiqueta: "Registrando «No supera» y redactando el reporte de mejoras con IA", tipicoMs: 25000 },
  devolver: { clave: "devolver", etiqueta: "Enviando de vuelta al Centro", tipicoMs: 2500 },
  factura: { clave: "factura", etiqueta: "Emitiendo la factura de cobro y avisando al productor", tipicoMs: 5000 },
  alCentro: { clave: "al-centro", etiqueta: "Enviando el bache al Centro de Calidad", tipicoMs: 5000 },
  reevaluar: { clave: "reevaluar", etiqueta: "Abriendo la re-evaluación", tipicoMs: 4000 },
  mejoras: { clave: "mejoras", etiqueta: "Redactando las recomendaciones de mejora con IA", tipicoMs: 25000 },
  escanear: { clave: "escanear-fichas", etiqueta: "Escaneando los soportes con IA (lee cada PDF y foto)", tipicoMs: 45000 },
  compilar: { clave: "compilar-ficha", etiqueta: "Compilando la ficha desde el reporte del productor", tipicoMs: 4000 },
  invitarSocio: { clave: "invitar-socio", etiqueta: "Emitiendo la credencial y enviando el correo", tipicoMs: 6000 },
  reenviarSocio: { clave: "reenviar-socio", etiqueta: "Reenviando la credencial por correo", tipicoMs: 5000 },
  invitarUsuario: { clave: "invitar-usuario", etiqueta: "Creando el acceso y enviando la invitación", tipicoMs: 6000 },
  reenviarUsuario: { clave: "reenviar-usuario", etiqueta: "Reenviando la invitación por correo", tipicoMs: 5000 },
  restablecer: { clave: "restablecer", etiqueta: "Restableciendo la contraseña y enviándola por correo", tipicoMs: 5000 },
  responderBuzon: { clave: "responder-buzon", etiqueta: "Enviando la respuesta (y archivando la copia)", tipicoMs: 5000 },
  redactarIa: { clave: "redactar-contexto", etiqueta: "Redactando el campo con IA", tipicoMs: 15000 },
  reenviarLlamado: { clave: "reenviar-llamado", etiqueta: "Reenviando la notificación del llamado", tipicoMs: 5000 },
  // V5.191: «Hacer revisión» de una referencia del productor (OCP · vista del lote).
  leerReferencia: { clave: "leer-referencia", etiqueta: "Leyendo el adjunto (el texto del PDF)", tipicoMs: 3000 },
  leerReferenciaIa: { clave: "leer-referencia-ia", etiqueta: "Leyendo el adjunto con IA (gráficas incluidas)", tipicoMs: 30000 },
  guardarRevision: { clave: "guardar-revision-ref", etiqueta: "Guardando la revisión y avisando al productor", tipicoMs: 3000 },
} satisfies Record<string, Progreso>;

export function ProgresoDeAccion({ enCurso }: { enCurso: EnCurso | null }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!enCurso) return;
    const t = window.setInterval(() => setAhora(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [enCurso]);
  if (!enCurso) return null;
  const lleva = Math.max(0, ahora - enCurso.desde);
  const faltan = enCurso.estimadoMs - lleva;
  // La barra avanza con el estimado y nunca llega sola al 100 %: se acerca a 95 % si tarda más de lo habitual.
  const pct = faltan > 0 ? Math.min(90, (lleva / enCurso.estimadoMs) * 90) : 90 + 5 * (1 - Math.exp(-(lleva - enCurso.estimadoMs) / 8000));
  return (
    <div role="status" aria-live="polite" style={{ margin: "8px 0", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--paper)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12.5 }}>
        <b>⏳ {enCurso.etiqueta}…</b>
        <span style={{ color: "var(--muted)" }}>
          {seg(lleva)} s
          {faltan > 0
            ? <> · faltan ~{Math.max(1, seg(faltan))} s (estimado)</>
            : <> · tarda más de lo habitual; sigue en curso — no cierre esta ventana</>}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--line)", marginTop: 6, overflow: "hidden" }} aria-hidden>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary, #3C0A86)", borderRadius: 999, transition: "width .25s linear" }} />
      </div>
    </div>
  );
}

/** V5.164: para un `<form action>` de servidor (sin JavaScript propio): el botón de envío enseña el avance mientras el formulario
 *  se procesa (`useFormStatus`). Va DENTRO del `<form>`. */
export function EnviarConAvance({ children, progreso, className = "btn btn-sm" }: { children: React.ReactNode; progreso: Progreso; className?: string }) {
  const { pending } = useFormStatus();
  // El inicio se anota en el CLIC (no en un efecto); el avance se pinta mientras el formulario esté en curso.
  const [desde, setDesde] = useState<number | null>(null);
  useEffect(() => {
    if (!pending || desde == null) return;
    return () => aprendeDuracion(progreso.clave, progreso.tipicoMs, Date.now() - desde);
  }, [pending, desde, progreso.clave, progreso.tipicoMs]);
  const enCurso: EnCurso | null = pending && desde != null ? { clave: progreso.clave, etiqueta: progreso.etiqueta, desde, estimadoMs: estimadoDe(progreso.clave, progreso.tipicoMs) } : null;
  return (
    <>
      <button className={className} type="submit" disabled={pending} onClick={() => setDesde(Date.now())}>
        {children}
      </button>
      <ProgresoDeAccion enCurso={enCurso} />
    </>
  );
}
