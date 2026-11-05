"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  abrirTrabajo,
  borrarTrabajo,
  crearTrabajo,
  emitirDesdeHerramienta,
  guardarTrabajo,
  listarTrabajos,
  type TrabajoResumen,
} from "@/lib/tools/trabajos";
import { enlaceDeTrabajo, type PrefillHerramienta } from "@/lib/tools/entrada";
import styles from "./ConchaHerramienta.module.css";

// ── El Home Menu de una herramienta con memoria (A11, 2026-08-19) ───────────
// Palabra del owner: las herramientas «initialized directly there», con «a sort
// of Home Menu... to start a new registration with at least a name and a time
// stamp list to retrieve them». Esto es ese menú, y el cableado del puente:
//
//   menú (lista de trabajos) → abrir/crear → iframe + ctc-bridge
//
// EL CONTRATO CON EL IFRAME (mismo origen SIEMPRE — repo y Storage se sirven
// bajo /tools de este host): la concha solo escucha mensajes cuyo `source` es
// SU iframe y cuyo origen es el propio; y al iframe le habla con
// `location.origin` como destino, nunca "*". Un tercero no puede ni inyectar
// estado ni leerlo.
//
// EL AUTOGUARDADO no pisa al usuario: el puente manda la foto completa con
// debounce; aquí se encadena UN guardado a la vez (si llega otro estado
// mientras se guarda, se guarda al terminar — el último gana). El indicador
// dice la verdad: «Guardando…», «Guardado HH:MM» o el error, nunca un tic
// decorativo.
//
// TAR-121 · LA ENTRADA DE MÓDULO. La página puede traer `trabajoInicial`
// (`?trabajo=`): se abre por `abrirTrabajo`, que filtra por la cuenta — un id
// ajeno da el mismo «ya no existe» que uno borrado, y cae al menú. Y puede traer
// `prefill` (`?finca=` / `?lote=`, resuelto contra la cuenta en el servidor):
// el menú propone el nombre del trabajo, y SOLO un trabajo NUEVO o «Abrir sin
// guardar» lo reciben — un trabajo guardado se abre como se dejó. El prellenado
// viaja en un mensaje propio, `{ctc:"prefill", campos, registro}`, después del
// `init` (lo aplica `ctc-bridge.js`), a SU iframe y con el origen propio, igual
// que el resto del protocolo. No se crea nada en la base sin el clic de la persona.

type Modo =
  | { tipo: "cargando" }
  | { tipo: "menu"; trabajos: TrabajoResumen[]; error: string | null }
  | { tipo: "abierta"; trabajoId: string; nombreTrabajo: string; estado: Record<string, unknown>; conPrefill: boolean }
  | { tipo: "suelta"; conPrefill: boolean };

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) +
  " · " +
  new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

export function SesionHerramienta({
  toolId,
  nombre,
  src,
  guia,
  trabajoInicial = null,
  prefill = null,
  avisoEntrada = null,
}: {
  toolId: string;
  nombre: string;
  src: string;
  /** Que es y como funciona (V5.7): el acordeon del menu, CERRADO por defecto
   *  — la convencion de la casa para todo acordeon. */
  guia?: string | null;
  /** TAR-121: el trabajo que pide la URL. */
  trabajoInicial?: string | null;
  /** TAR-121: el prellenado de un trabajo nuevo, ya resuelto contra la cuenta. */
  prefill?: PrefillHerramienta | null;
  /** TAR-121: lo que no se pudo usar del enlace. */
  avisoEntrada?: string | null;
}) {
  const [modo, setModo] = useState<Modo>({ tipo: "cargando" });
  const [nuevoNombre, setNuevoNombre] = useState(prefill?.etiqueta ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(avisoEntrada);
  const [guardado, setGuardado] = useState<string>("");
  // El trabajo cuyo enlace se acaba de copiar (para el «Copiado» del botón).
  const [copiado, setCopiado] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // El oído del puente necesita el modo VIGENTE sin re-suscribirse por cambio:
  // se espeja a un ref desde un efecto (la regla de hooks prohíbe escribirlo
  // durante el render).
  const modoRef = useRef<Modo>(modo);
  useEffect(() => {
    modoRef.current = modo;
  }, [modo]);
  const prefillRef = useRef<PrefillHerramienta | null>(prefill);
  useEffect(() => {
    prefillRef.current = prefill;
  }, [prefill]);
  // El trabajo de la URL se abre una vez; si la persona pide «Mis trabajos» antes de que termine, manda ella.
  const inicialVigente = useRef(true);
  // El prellenado se re-envía tras cada init del ARRANQUE (una herramienta que se re-anuncia vuelve a restaurar su
  // estado vacío), pero solo mientras arranca: hasta el primer guardado de ese marco o unos segundos, lo que llegue
  // antes. Después, un «ready» tardío no pisa lo que la persona escribió.
  const prefillHasta = useRef<{ marco: string; hasta: number } | null>(null);
  // Volver al menú cierra esa sesión: la próxima («Crear y abrir» o «Abrir sin guardar») estrena su ventana.
  useEffect(() => {
    if (modo.tipo === "menu" || modo.tipo === "cargando") prefillHasta.current = null;
  }, [modo]);
  // Cadena de guardado: una promesa a la vez; el estado más nuevo espera turno.
  const guardando = useRef<Promise<void>>(Promise.resolve());
  const pendiente = useRef<Record<string, unknown> | null>(null);

  // NO pone «cargando» por dentro: el estado inicial ya lo es, y los botones
  // que la reinvocan lo ponen ellos (setState síncrono en un efecto dispara
  // renders en cascada y eslint lo veta con razón).
  const cargarLista = useCallback(async () => {
    const r = await listarTrabajos(toolId);
    if (r.ok) setModo({ tipo: "menu", trabajos: r.data, error: null });
    else setModo({ tipo: "menu", trabajos: [], error: r.error });
  }, [toolId]);

  // La carga inicial va con .then y no llamando a cargarLista: la regla
  // set-state-in-effect no puede probar que el setState de dentro es asíncrono
  // y lo marca; en un callback de promesa no hay duda. El flag `vivo` evita
  // escribir estado en un componente ya desmontado.
  // TAR-121: con `trabajoInicial`, primero se intenta abrir ESE trabajo (la
  // server action comprueba sesión, acceso y dueño); si no se puede, el menú,
  // con el motivo a la vista.
  useEffect(() => {
    let vivo = true;
    const alMenu = (avisoExtra: string | null) =>
      listarTrabajos(toolId).then((r) => {
        if (!vivo) return;
        if (avisoExtra) setAviso((a) => [a, avisoExtra].filter(Boolean).join(" "));
        if (r.ok) setModo({ tipo: "menu", trabajos: r.data, error: null });
        else setModo({ tipo: "menu", trabajos: [], error: r.error });
      });
    if (trabajoInicial) {
      abrirTrabajo(toolId, trabajoInicial).then((r) => {
        if (!vivo || !inicialVigente.current) return;
        if (r.ok) setModo({ tipo: "abierta", trabajoId: trabajoInicial, nombreTrabajo: r.data.nombre, estado: r.data.estado, conPrefill: false });
        else alMenu(`${r.error} Elige uno de tu lista.`);
      });
    } else alMenu(null);
    return () => {
      vivo = false;
    };
  }, [toolId, trabajoInicial]);

  // La rueda dentada de la cinta (V5.8) pide «Mis trabajos» por evento y no por
  // prop: la cinta la pinta la PÁGINA (servidor) y este menú vive dentro de la
  // concha, así que no hay padre común de cliente al que colgar un callback.
  // Un CustomEvent en window los une sin inventar contexto ni subir estado.
  useEffect(() => {
    function alMenu() {
      inicialVigente.current = false;
      setAviso(null);
      setModo({ tipo: "cargando" });
      cargarLista();
    }
    window.addEventListener("ctc:mis-trabajos", alMenu);
    return () => window.removeEventListener("ctc:mis-trabajos", alMenu);
  }, [cargarLista]);

  // El oído del puente. Se monta una vez; valida fuente y origen SIEMPRE.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const marco = iframeRef.current;
      if (!marco || e.source !== marco.contentWindow) return;
      if (e.origin !== window.location.origin) return;
      const d = e.data as { ctc?: string; estado?: Record<string, unknown>; evento?: string; payload?: Record<string, unknown> };
      if (!d || typeof d !== "object") return;
      const m = modoRef.current;

      if (d.ctc === "ready" && (m.tipo === "abierta" || m.tipo === "suelta")) {
        if (m.tipo === "abierta")
          marco.contentWindow?.postMessage(
            { ctc: "init", nombre: m.nombreTrabajo, estado: m.estado },
            window.location.origin
          );
        // El prellenado va DESPUÉS del init (y otra vez tras cada init: una
        // herramienta que se re-anuncia vuelve a restaurar su estado vacío), y
        // solo a un trabajo nuevo o a la sesión sin guardar.
        const p = prefillRef.current;
        const clave = m.tipo === "abierta" ? m.trabajoId : "suelta";
        const ahora = Date.now();
        if (!prefillHasta.current || prefillHasta.current.marco !== clave) prefillHasta.current = { marco: clave, hasta: ahora + 8000 };
        if (m.conPrefill && p && (p.campos.length > 0 || p.registro) && ahora < prefillHasta.current.hasta)
          marco.contentWindow?.postMessage({ ctc: "prefill", campos: p.campos, registro: p.registro }, window.location.origin);
        return;
      }
      if (d.ctc === "estado" && m.tipo === "abierta" && d.estado) {
        // Primer guardado de este marco: se cierra la ventana del prellenado.
        if (prefillHasta.current?.marco === m.trabajoId) prefillHasta.current = { marco: m.trabajoId, hasta: 0 };
        const resumen = typeof (d as { resumen?: unknown }).resumen === "string" ? (d as { resumen: string }).resumen : "";
        pendiente.current = d.estado;
        setGuardado("guardando");
        guardando.current = guardando.current.then(async () => {
          const estado = pendiente.current;
          if (!estado) return;
          pendiente.current = null;
          const mm = modoRef.current;
          if (mm.tipo !== "abierta") return;
          const r = await guardarTrabajo(toolId, mm.trabajoId, estado, resumen);
          setGuardado(
            r.ok
              ? "Guardado " + new Date(r.data.guardadoAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
              : "⚠ " + r.error
          );
        });
        return;
      }
      if (d.ctc === "emitir" && m.tipo === "abierta" && d.evento) {
        // Empujar al ecosistema es secundario: si falla, no interrumpe a nadie.
        emitirDesdeHerramienta(toolId, d.evento, d.payload ?? {}).catch(() => {});
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [toolId]);

  async function abrir(t: TrabajoResumen) {
    if (ocupado) return;
    setOcupado(true);
    setAviso(null);
    const r = await abrirTrabajo(toolId, t.id);
    setOcupado(false);
    if (!r.ok) {
      setAviso(r.error);
      return;
    }
    setGuardado("");
    setModo({ tipo: "abierta", trabajoId: t.id, nombreTrabajo: r.data.nombre, estado: r.data.estado, conPrefill: false });
  }

  async function crear() {
    if (ocupado) return;
    setOcupado(true);
    setAviso(null);
    const r = await crearTrabajo(toolId, nuevoNombre);
    setOcupado(false);
    if (!r.ok) {
      setAviso(r.error);
      return;
    }
    setNuevoNombre("");
    setGuardado("");
    setModo({ tipo: "abierta", trabajoId: r.data.id, nombreTrabajo: nuevoNombre.trim(), estado: {}, conPrefill: !!prefill });
  }

  // TAR-121 · «Copiar enlace»: el enlace directo a un trabajo (`?trabajo=`), para pegarlo en un asistente, un evento del
  // calendario o una nota. No es una credencial: solo lo abre la cuenta dueña. Si el portapapeles no está (http, permisos),
  // el enlace se enseña para copiarlo a mano.
  async function copiarEnlace(trabajoId: string) {
    const url = enlaceDeTrabajo(toolId, trabajoId, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(trabajoId);
      setTimeout(() => setCopiado((c) => (c === trabajoId ? null : c)), 2500);
    } catch {
      window.prompt("Copia el enlace de este trabajo (solo tu cuenta lo abre):", url);
    }
  }

  async function borrar(t: TrabajoResumen) {
    if (ocupado) return;
    if (!window.confirm(`¿Borrar «${t.nombre}»? No se puede deshacer.`)) return;
    setOcupado(true);
    const r = await borrarTrabajo(toolId, t.id);
    setOcupado(false);
    if (!r.ok) {
      setAviso(r.error);
      return;
    }
    setModo({ tipo: "cargando" });
    cargarLista();
  }

  if (modo.tipo === "cargando") {
    return <p className={styles.menuCargando}>Cargando tus trabajos…</p>;
  }

  if (modo.tipo === "menu") {
    return (
      <div className={styles.menuTrabajos}>
        <div className={styles.menuCabeza}>
          <h2>Tus trabajos en {nombre}</h2>
          <p>
            Un trabajo guarda lo que llevas hecho en la herramienta, con nombre y fecha, en tu cuenta — lo retomas
            desde cualquier equipo.
          </p>
        </div>

        {modo.error && <p className={styles.menuError}>{modo.error}</p>}
        {aviso && <p className={styles.menuError}>{aviso}</p>}
        {prefill && (
          <p className={styles.menuEntrada}>
            Este enlace la abre para <b>{prefill.etiqueta}</b>:{" "}
            {prefill.campos.length > 0 || prefill.registro
              ? "un trabajo nuevo, o «Abrir sin guardar», llega prellenado; tus trabajos guardados se abren como los dejaste."
              : "el trabajo nuevo ya lleva ese nombre."}
          </p>
        )}

        {guia && (
          <details className={styles.menuGuia}>
            <summary>
              ¿Qué es esta herramienta y cómo funciona? <span aria-hidden>▾</span>
            </summary>
            <p>{guia}</p>
          </details>
        )}

        {modo.trabajos.length > 0 && (
          <ul className={styles.menuLista}>
            {modo.trabajos.map((t) => (
              <li key={t.id}>
                <button type="button" className={styles.menuAbrir} onClick={() => abrir(t)} disabled={ocupado}>
                  <b>{t.nombre}</b>
                  {t.resumen && <i className={styles.menuResumen}>{t.resumen}</i>}
                  <span>
                    creado {fecha(t.createdAt)} · último cambio {fecha(t.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.menuBorrar}
                  onClick={() => copiarEnlace(t.id)}
                  aria-label={`Copiar el enlace de ${t.nombre}`}
                  title="El enlace directo a este trabajo. Solo tu cuenta lo abre."
                >
                  {copiado === t.id ? "Copiado" : "Enlace"}
                </button>
                <button
                  type="button"
                  className={styles.menuBorrar}
                  onClick={() => borrar(t)}
                  disabled={ocupado}
                  aria-label={`Borrar ${t.nombre}`}
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}

        {modo.trabajos.length === 0 && !modo.error && (
          <p className={styles.menuVacio}>Todavía no tienes trabajos aquí. Crea el primero con un nombre y a trabajar.</p>
        )}

        <div className={styles.menuNuevo}>
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nombre del trabajo nuevo (p. ej. «Lote La Cumbre · mitaca»)"
            maxLength={80}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nuevoNombre.trim()) crear();
            }}
          />
          {/* Botones abajo a la derecha, apilados: la convención de la casa. */}
          <div className={styles.menuAcciones}>
            <button type="button" className="btn btn-sm btn-solid" onClick={crear} disabled={ocupado || !nuevoNombre.trim()}>
              Crear y abrir
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setModo({ tipo: "suelta", conPrefill: !!prefill })} disabled={ocupado}>
              Abrir sin guardar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // abierta o suelta: el marco, con su barra de estado encima.
  const enTrabajo = modo.tipo === "abierta";
  return (
    <div className={styles.sesion}>
      {/* Una LÍNEA, no una barra (V5.8): qué trabajo está abierto y si está
          guardado. «Mis trabajos» se fue a la rueda dentada de la cinta — era
          una de las cuatro filas que el owner reclamó. */}
      <div className={styles.sesionBarra}>
        {enTrabajo ? (
          <>
            <span className={styles.sesionNombre}>{modo.nombreTrabajo}</span>
            <button
              type="button"
              className={styles.menuBorrar}
              onClick={() => copiarEnlace(modo.trabajoId)}
              title="El enlace directo a este trabajo. Solo tu cuenta lo abre."
            >
              {copiado === modo.trabajoId ? "Enlace copiado" : "Copiar enlace"}
            </button>
            <span className={styles.sesionGuardado} aria-live="polite">
              {guardado === "guardando" ? "Guardando…" : guardado}
            </span>
          </>
        ) : (
          <span className={styles.sesionGuardado}>Sin trabajo: lo que hagas aquí no se guarda.</span>
        )}
      </div>
      {/* key = trabajo: cambiar de trabajo REINICIA la herramienta y el puente
          vuelve a anunciarse — sin esto, el estado viejo se quedaría pegado. */}
      <iframe
        key={enTrabajo ? modo.trabajoId : "suelta"}
        ref={iframeRef}
        className={styles.marco}
        src={src}
        title={`Herramienta: ${nombre}`}
        // El toque a la puerta: si el «ready» del puente se anunció antes de
        // que este componente escuchara (una carrera que el harness local
        // reprodujo), el «hola» lo hace anunciarse otra vez. Sin puente, cae
        // en el vacío y no pasa nada.
        onLoad={() => iframeRef.current?.contentWindow?.postMessage({ ctc: "hola" }, window.location.origin)}
      />
    </div>
  );
}
