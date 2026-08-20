"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cargarRedaccion,
  descartarNoticia,
  generarPost,
  refrescarNoticias,
  type Noticia,
  type Redaccion,
} from "@/lib/coffeed/redaccion";
import { Ring } from "./Ring";
import styles from "./coffeedConsole.module.css";
import flow from "./redaccionFlow.module.css";

// ── REDACCIÓN · la bandeja de noticias del ECP (V5.9, owner · A12) ──────────
// Entre Entregas y Muro, que fue donde el owner la señaló. Las noticias entran
// solas de los feeds de la lista blanca (con los medios colombianos nuevos) y
// se hojean en COVER FLOW — la misma mecánica de Cool PDF que ya conduce el
// taller de Herramientas, con las mismas constantes. Elegir una dispara el
// generador: capítulo elaborado + portada → la cola de Entregas.
//
// El REFRESCO va por tandas (CHUNK medios por llamada) y aquí se encadena
// hasta terminar, contando el progreso — el patrón del barrido del Estudio.
// Al entrar, si el último refresco tiene más de 6 h, se refresca solo: eso es
// «automate the income» sin cron — la bandeja se mantiene sola con el uso.

const VELOCIDAD_TARJETA = 300; // ancho de tarjeta en el escenario

function fmtDia(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function RedaccionView({
  onEntregada,
}: {
  /** El padre recarga el bundle: la entrega nueva tiene que aparecer en la cola. */
  onEntregada: () => Promise<void>;
}) {
  const [data, setData] = useState<Redaccion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "err"; texto: string } | null>(null);
  const [centro, setCentro] = useState(0);
  // La portada de Gemini es el renglón más caro del proceso, así que se
  // ENSEÑA como decisión en vez de esconderse: encendida por defecto (el owner
  // pidió posts con visuales) pero a un clic de apagarse, con el precio al lado.
  const [conPortada, setConPortada] = useState(true);

  const recargar = useCallback(async () => {
    const r = await cargarRedaccion();
    if (r.ok) setData(r.data);
    else setAviso({ tono: "err", texto: r.error });
    setCargando(false);
  }, []);

  // El refresco encadenado: repite hasta que no queden medios pendientes.
  const refrescar = useCallback(async () => {
    setRefrescando("Leyendo los medios…");
    let nuevas = 0;
    // Los fallidos se ACUMULAN y se saltan en las vueltas siguientes: un medio
    // caído conserva su last_swept_at viejo y sin esto encabezaría cada tanda
    // para siempre — el bucle no terminaría nunca.
    const fallidos: { id: string; name: string }[] = [];
    try {
      let vuelta = await refrescarNoticias();
      while (vuelta.ok) {
        nuevas += vuelta.nuevas;
        fallidos.push(...vuelta.fallidos);
        if (vuelta.pendientes <= 0) break;
        setRefrescando(`Leyendo los medios… quedan ${vuelta.pendientes}`);
        vuelta = await refrescarNoticias(fallidos.map((f) => f.id));
      }
      if (!vuelta.ok) setAviso({ tono: "err", texto: vuelta.error });
      else
        setAviso({
          tono: "ok",
          texto:
            `${nuevas} noticia${nuevas === 1 ? "" : "s"} nueva${nuevas === 1 ? "" : "s"}` +
            (fallidos.length ? ` · sin leer: ${[...new Set(fallidos.map((f) => f.name))].join(", ")}` : ""),
        });
    } catch {
      setAviso({ tono: "err", texto: "El refresco se cortó a mitad. Vuelve a intentarlo." });
    }
    setRefrescando(null);
    await recargar();
  }, [recargar]);

  // Carga inicial + auto-refresco si está rancio (>6 h). Solo .then en el
  // cuerpo del efecto — gotcha set-state-in-effect.
  const autoRefrescado = useRef(false);
  useEffect(() => {
    cargarRedaccion().then((r) => {
      if (r.ok) {
        setData(r.data);
        if (r.data.rancio && !autoRefrescado.current) {
          autoRefrescado.current = true;
          refrescar();
        }
      } else {
        setAviso({ tono: "err", texto: r.error });
      }
      setCargando(false);
    });
  }, [refrescar]);

  async function elegir(n: Noticia, rehacer = false) {
    if (generando) return;
    setGenerando(true);
    setAviso(null);
    const r = await generarPost(n.id, { conPortada, rehacer });
    setGenerando(false);
    if (!r.ok) {
      setAviso({ tono: "err", texto: r.error });
      return;
    }
    setAviso({
      tono: "ok",
      texto:
        `El post quedó en la cola de Entregas${r.conPortada ? ", con su portada" : ", sin portada"}.` +
        (r.aviso ? ` ${r.aviso}` : " Dale luz verde allí para publicarlo."),
    });
    await Promise.all([recargar(), onEntregada()]);
  }

  async function descartar(n: Noticia) {
    if (generando) return;
    const r = await descartarNoticia(n.id);
    if (!r.ok) {
      setAviso({ tono: "err", texto: r.error });
      return;
    }
    setCentro((c) => Math.max(0, c - (data && c >= data.noticias.length - 1 ? 1 : 0)));
    await recargar();
  }

  if (cargando) {
    return (
      <section>
        <span className={styles.ringRow}>
          <Ring /> Cargando la bandeja…
        </span>
      </section>
    );
  }

  const noticias = data?.noticias ?? [];
  const actual = noticias[Math.min(centro, Math.max(0, noticias.length - 1))] ?? null;

  return (
    <section>
      <div className={styles.viewHead}>
        <div>
          <span className={styles.eyebrow}>La bandeja</span>
          <h1>Redacción</h1>
          <p>
            Lo que publicaron los medios de la lista blanca — los del ticker de la portada y los colombianos — filtrado
            a café. Hojéalas; al elegir una, el redactor escribe el capítulo completo con su portada y lo deja en{" "}
            <b>Entregas</b>: la luz verde y el publicar siguen siendo tuyos.
          </p>
          <p className={flow.coste}>
            Leer los medios no cuesta nada (son feeds, no un modelo). Escribir un capítulo cuesta menos de un centavo
            —lo redacta Haiku— y la portada de Gemini es el renglón caro: por eso se pide, no se da por hecho.
          </p>
        </div>
        <div className={flow.mandoCabeza}>
          <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} disabled={Boolean(refrescando) || generando} onClick={refrescar}>
            {refrescando ?? "Refrescar medios"}
          </button>
          {data?.refrescadoAt && (
            <span className={flow.refrescado}>último refresco: {new Date(data.refrescadoAt).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          )}
        </div>
      </div>

      {aviso && <p className={aviso.tono === "ok" ? flow.avisoOk : flow.avisoErr}>{aviso.texto}</p>}

      {noticias.length === 0 ? (
        <div className={styles.empty}>
          <h3>La bandeja está vacía</h3>
          <p>Refresca los medios, o espera a que publiquen: las piezas de los últimos 14 días entran solas.</p>
        </div>
      ) : (
        <>
          <NoticiasFlow noticias={noticias} centro={centro} setCentro={setCentro} />

          {actual && (
            <div className={flow.ficha}>
              <div className={flow.fichaTexto}>
                <span className={styles.eyebrow}>
                  {actual.outlet}
                  {actual.categoria ? ` · ${actual.categoria}` : ""} · {fmtDia(actual.publishedAt)}
                  {actual.kind === "video" ? " · video" : ""}
                </span>
                <h2>{actual.titulo}</h2>
                {actual.resumen && <p>{actual.resumen}</p>}
                <a href={actual.url} target="_blank" rel="noopener noreferrer" className={flow.fuente}>
                  Leer la pieza original ↗
                </a>
              </div>
              {/* Acciones abajo a la derecha, apiladas: la convención de la casa. */}
              <div className={flow.acciones}>
                <label className={flow.portada} title="Gemini cobra por imagen: es lo más caro del proceso">
                  <input type="checkbox" checked={conPortada} onChange={(e) => setConPortada(e.target.checked)} disabled={generando} />
                  Con portada <i>(lo más caro)</i>
                </label>
                {actual.estado === "elegida" ? (
                  <>
                    <span className={flow.yaElegida}>En Entregas ✓</span>
                    {/* Rehacer: para cuando el redactor o la portada fallaron y
                        el post quedó a medias. Solo funciona mientras la
                        entrega siga esperando luz verde. */}
                    <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} disabled={generando} onClick={() => elegir(actual, true)}>
                      {generando ? (
                        <span className={styles.ringRow}>
                          <Ring /> Rehaciendo…
                        </span>
                      ) : (
                        "Regenerar"
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button className={`${styles.btn} ${styles.btnGo}`} disabled={generando} onClick={() => elegir(actual)}>
                      {generando ? (
                        <span className={styles.ringRow}>
                          <Ring /> Redactando el capítulo…
                        </span>
                      ) : (
                        "Crear el post →"
                      )}
                    </button>
                    <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} disabled={generando} onClick={() => descartar(actual)}>
                      Descartar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ── El Cover Flow de la bandeja ─────────────────────────────────────────────
// La MISMA mecánica de RENDER.flow de Cool PDF que ya conduce el taller de
// Herramientas (rotateY 54°, z −170, escala −.14, brillo −.38): si una se
// siente bien, las dos se sienten igual. Aquí las portadas son PAPEL — el
// medio, el titular y la fecha — porque una noticia no tiene captura.
function NoticiasFlow({
  noticias,
  centro,
  setCentro,
}: {
  noticias: Noticia[];
  centro: number;
  setCentro: (n: number | ((c: number) => number)) => void;
}) {
  const escenario = useRef<HTMLDivElement | null>(null);
  const cartas = useRef<(HTMLDivElement | null)[]>([]);
  const frac = useRef(0);
  const arrastre = useRef<{ x0: number; activo: boolean }>({ x0: 0, activo: false });

  const layout = useCallback(() => {
    const caja = escenario.current;
    if (!caja) return;
    const w = Math.min(VELOCIDAD_TARJETA, Math.max(200, caja.clientWidth * 0.34));
    const h = w * 1.25;
    cartas.current.forEach((el, i) => {
      if (!el) return;
      const o = i - centro - frac.current;
      const a = Math.abs(o);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      if (a > 4.6) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }
      el.style.opacity = a > 3.4 ? ".12" : "1";
      el.style.pointerEvents = "auto";
      el.style.zIndex = String(200 - Math.round(a * 10));
      const s = Math.sign(o);
      const ab = Math.min(a, 5);
      const x = s * (w * 0.3 * Math.min(1, ab) + Math.max(0, ab - 1) * w * 0.2);
      const ry = -s * Math.min(1, ab) * 54;
      const z = -Math.min(1, ab) * 170 - Math.max(0, ab - 1) * 55;
      const sc = 1 - Math.min(1, ab) * 0.14;
      el.style.transform = `translate(-50%,-50%) translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg) scale(${sc})`;
      el.style.filter = ab < 0.5 ? "none" : `brightness(${1 - Math.min(1, ab) * 0.38})`;
    });
  }, [centro]);

  useEffect(() => {
    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
  }, [layout]);

  const ir = useCallback(
    (d: number) => setCentro((c: number) => Math.max(0, Math.min(noticias.length - 1, c + d))),
    [noticias.length, setCentro]
  );

  function onPointerDown(e: React.PointerEvent) {
    arrastre.current = { x0: e.clientX, activo: true };
    cartas.current.forEach((el) => el?.classList.remove(flow.anim));
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!arrastre.current.activo) return;
    frac.current = -(e.clientX - arrastre.current.x0) / 220;
    layout();
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!arrastre.current.activo) return;
    const dx = e.clientX - arrastre.current.x0;
    arrastre.current.activo = false;
    cartas.current.forEach((el) => el?.classList.add(flow.anim));
    const n = Math.max(-3, Math.min(3, Math.round(-dx / 150)));
    frac.current = 0;
    if (n !== 0) ir(n);
    else layout();
  }

  return (
    <div className={flow.envoltura}>
      <div
        className={flow.escenario}
        ref={escenario}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 16) ir(e.deltaX > 0 ? 1 : -1);
        }}
        role="listbox"
        aria-label="Noticias de la bandeja"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); ir(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); ir(-1); }
        }}
      >
        {noticias.map((n, i) => (
          <div
            key={n.id}
            ref={(el) => { cartas.current[i] = el; }}
            className={`${flow.carta} ${flow.anim}${n.estado === "elegida" ? ` ${flow.cartaElegida}` : ""}`}
            role="option"
            aria-selected={i === centro}
            onClick={() => { if (i !== centro) setCentro(i); }}
          >
            <span className={flow.cartaOutlet}>{n.outlet}</span>
            <b className={flow.cartaTitulo}>{n.titulo}</b>
            <span className={flow.cartaPie}>
              {fmtDia(n.publishedAt)}
              {n.kind === "video" ? " · video" : ""}
              {n.estado === "elegida" ? " · en Entregas ✓" : ""}
            </span>
          </div>
        ))}
      </div>
      <div className={flow.mando}>
        <button type="button" className={flow.flecha} onClick={() => ir(-1)} disabled={centro === 0} aria-label="Anterior">
          ←
        </button>
        <span className={flow.contador} aria-hidden>
          {Math.min(centro + 1, noticias.length)} / {noticias.length}
        </span>
        <button type="button" className={flow.flecha} onClick={() => ir(1)} disabled={centro >= noticias.length - 1} aria-label="Siguiente">
          →
        </button>
      </div>
    </div>
  );
}
