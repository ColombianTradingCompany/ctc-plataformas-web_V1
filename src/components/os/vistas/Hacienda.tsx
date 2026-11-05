"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { MODULOS_OS, type ClaveDeModulo, type EstadoDeModulo } from "@/lib/os/modulos";
import { DOMINIOS, type Dominio } from "@/lib/integraciones/dominios";
import { FUENTES } from "@/lib/os/fuentes";
import { contextoParaTailor, etiquetaDeClave, type Edificio, type Tablero } from "@/lib/os/tablero";
import {
  CALLE,
  VIEWBOX,
  anilloDe,
  arbolesArte,
  callesArte,
  edificioArte,
  granosArte,
  matasArte,
  ondasArte,
  profundidad,
  rotuloArte,
  sueloArte,
  type Cara,
} from "@/lib/os/haciendaArte";
import { Cifra, Hora, RotuloLeido, SaludLeida, textoDeCifra } from "../Cifra";
import { CopiarContexto } from "../CopiarContexto";
import { porQueEstaApagado } from "../ModuloApagado";
import { useMovimientoReducido } from "../identidad/useMovimientoReducido";
import { Encabezado } from "./Encabezado";
import s from "../os.module.css";

// ── CTCx OS · la Hacienda (V6.19, F2) ────────────────────────────────────────
// Los diez hubs del Mapa CTC como edificios de una finca (la geometría sale de `haciendaArte.ts`;
// los colores, de `os-tokens.css`). Cada edificio es un BOTÓN con nombre (Enter o Espacio), con su
// rótulo en mono y una ficha con sus tareas abiertas en el morado de la casa. La bandera roja con
// la palabra «VENCIDAS» sale solo si las hay; en los hubs sin cifra (la plataforma todavía no los
// alimenta, o su lectura falló) la ficha va punteada con una raya, y el texto del encabezado dice qué
// significa (el dibujo no tiene sitio para «Sin datos»). El anillo punteado morado es la selección y
// el foco del teclado. Los edificios reciben el foco en el orden en que se pintan (de atrás adelante);
// el camino ordenado por número de hub es la lista de debajo.
// En el teléfono el dibujo es una vista de conjunto y la lista de los diez hubs, debajo, es el
// control (también es la alternativa para un lector de pantalla). Elegir un hub abre su hoja: sus
// cifras, sus piezas con «Abrir» y «Copiar contexto para Tailor». Ningún edificio usa un color de grado.
//
// Desde el 5 nov la Hacienda es la PORTADA de la OS (rumbo del owner: el OS es un juego y abre en el
// mapa). Cada módulo se abre desde SU edificio (`MODULOS_OS[].edificio`): la hoja del hub 2 ofrece
// «Abrir Almacén» y la del hub 5 «Abrir Taller», cada una según su interruptor; apagado, la hoja lo
// dice con las palabras de `ModuloApagado` y no enlaza. `portada` cambia solo el encabezado.

/** La franja de arriba del lienzo queda vacía (el cielo de la rejilla): la vista no la enseña. */
const RECORTE = 84;
const SUELO = sueloArte();
const CALLES = callesArte();
const ONDAS = ondasArte();
const GRANOS = granosArte();
const MATAS = matasArte();
type Capa = { z: number; arbol: Cara[] } | { z: number; dominio: Dominio };
const CAPAS: Capa[] = [
  ...arbolesArte().map((a) => ({ z: a.z, arbol: a.caras })),
  ...DOMINIOS.map((d) => ({ z: profundidad(d.id), dominio: d.id })),
].sort((a, b) => a.z - b.z);

const sinFuente = (e: Edificio) => !!e.abiertas.notas?.includes("sin_fuente_aun");
/** Una salud sin valor: «Sin datos» si su lectura falló, «Sin crons» solo si se leyó y el hub no tiene ninguno. */
const vacioDeSalud = (e: Edificio) => (e.salud.sinLectura ? "Sin datos" : "Sin crons");

function resumenEnPalabras(e: Edificio): string {
  if (sinFuente(e)) return `${e.n} · ${e.label}: tareas sin datos, llegan con Notion (F3)`;
  const v = e.vencidas.valor;
  return `${e.n} · ${e.label}: ${textoDeCifra(e.abiertas)} tareas abiertas${v ? `, ${textoDeCifra(e.vencidas)} vencidas` : ""}`;
}

const Caras = ({ caras }: { caras: readonly Cara[] }) => (
  <>
    {caras.map((c, i) => (
      <path key={i} d={c.d} fill={`var(${c.token})`} className={s.cara} />
    ))}
  </>
);

/** El rótulo de un hub en el dibujo: su número y nombre en mono, y la ficha con sus tareas abiertas. */
function Rotulo({ e }: { e: Edificio }) {
  const texto = `${e.n} · ${e.label.toUpperCase()}`;
  const vacio = sinFuente(e) || e.abiertas.valor === null;
  // La bandera de las vencidas: un banderín rojo con su icono y su palabra, colgado del rótulo (el color nunca va solo).
  // Va aquí y no en la cumbre del edificio porque allí el rótulo la tapaba.
  const vencidas = e.vencidas.valor ? `VENCIDAS ${textoDeCifra(e.vencidas)}` : null;
  const { y, ancho, izq, chipX, bx, banderin, icono } = rotuloArte(e.dominio, texto, vencidas);
  return (
    <g>
      <rect x={izq} y={y - 10} width={ancho} height={20} rx={10} className={s.rotuloFondo} />
      <text x={izq + 8} y={y + 3.5} className={s.rotuloTexto}>
        {texto}
      </text>
      <circle cx={chipX} cy={y} r={11} className={vacio ? s.chipVacio : s.chip} />
      <text x={chipX} y={y + 3.6} textAnchor="middle" className={`${s.chipTexto}${vacio ? ` ${s.chipTextoVacio}` : ""}`}>
        {textoDeCifra(e.abiertas)}
      </text>
      {vencidas && (
        <>
          <path d={`M${bx} ${y - 9}h${banderin}l-7 9 7 9h${-banderin}Z`} className={s.bandera} />
          <path d={`M${bx + 9} ${y - 5}l4.5 8h-9Z`} className={s.banderaIcono} />
          <path d={`M${bx + 9} ${y - 2.2}v2.6`} className={s.banderaIconoMarca} />
          <text x={bx + 5 + icono} y={y + 3.2} className={s.banderaTexto}>
            {vencidas}
          </text>
        </>
      )}
    </g>
  );
}


type Modulos = Record<ClaveDeModulo, EstadoDeModulo>;
export type BaseDeModulos = "/os/m" | "/os/demo";

/**
 * Dónde se abre cada módulo encendido, en palabras y desde el registro (`MODULOS_OS[].edificio` → hub de `DOMINIOS`):
 * «el módulo Almacén se abre desde el hub 2 y el módulo Taller, desde el hub 5». Un módulo apagado no se promete; sin
 * ninguno encendido en un edificio, la frase queda vacía.
 */
function dondeSeAbren(modulos: Modulos): string {
  const frases = MODULOS_OS.flatMap((m) => {
    const hub = m.edificio && modulos[m.clave].encendido ? DOMINIOS.find((d) => d.id === m.edificio) : undefined;
    return hub ? [{ titulo: m.titulo, n: hub.n }] : [];
  }).map((x, i) => (i === 0 ? `el módulo ${x.titulo} se abre desde el hub ${x.n}` : `el módulo ${x.titulo}, desde el hub ${x.n}`));
  if (frases.length < 2) return frases.join("");
  return `${frases.slice(0, -1).join(", ")} y ${frases[frases.length - 1]}`;
}

/** Los módulos que se abren desde el edificio de un hub: «Abrir <módulo>» si está encendido; si no, por qué está apagado. */
function ModulosDelEdificio({ dominio, modulos, base }: { dominio: Dominio; modulos: Modulos; base: BaseDeModulos }) {
  const suyos = MODULOS_OS.filter((m) => m.edificio === dominio);
  if (!suyos.length) return null;
  return (
    <div className={s.edificioModulos}>
      <p className={s.subtitulo}>Se abre desde este edificio</p>
      {suyos.map((m) => {
        const e = modulos[m.clave];
        return e.encendido ? (
          <div key={m.clave} className={s.acciones}>
            <Link href={`${base}/${m.clave}`} className="btn btn-sm btn-solid">
              Abrir {m.titulo}
            </Link>
          </div>
        ) : (
          <p key={m.clave} role="status" className={s.edificioApagado}>
            <strong>«{m.titulo}» está apagado.</strong> {porQueEstaApagado(e)}
          </p>
        );
      })}
    </div>
  );
}

/** Lo que recibe el foco con Tab dentro de la hoja (el «Cerrar» del modal incluido), en orden y visible. */
const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Hoja({ t, e, modulos, base }: { t: Tablero; e: Edificio; modulos: Modulos; base: BaseDeModulos }) {
  // Al abrirse, el foco entra en la hoja (su título): el modal de la casa no lo mueve, y sin esto el siguiente Tab
  // seguiría por los edificios de detrás del velo. Al cerrar, `cerrar` lo devuelve a quien la abrió.
  const titulo = useRef<HTMLHeadingElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
  }, [e.dominio]);
  // El foco no sale de la hoja mientras está abierta (es un diálogo modal): Tab desde el último control vuelve al primero
  // (el «Cerrar»), y Mayús+Tab desde el primero va al último. El modal de la casa solo atiende Escape; esto vive aquí, en la
  // OS, para no repintar las otras consolas (el arreglo del modal compartido es de la decisión 20).
  useEffect(() => {
    const dialogo = hoja.current?.closest<HTMLElement>('[role="dialog"]');
    if (!dialogo) return;
    const alTab = (ev: KeyboardEvent) => {
      if (ev.key !== "Tab") return;
      const lista = [...dialogo.querySelectorAll<HTMLElement>(ENFOCABLES)].filter((el) => el.getClientRects().length > 0);
      if (!lista.length) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const activo = document.activeElement;
      const dentro = activo instanceof Node && dialogo.contains(activo);
      if (ev.shiftKey && (activo === primero || !dentro)) {
        ev.preventDefault();
        ultimo.focus();
      } else if (!ev.shiftKey && (activo === ultimo || !dentro)) {
        ev.preventDefault();
        primero.focus();
      }
    };
    dialogo.addEventListener("keydown", alTab);
    return () => dialogo.removeEventListener("keydown", alTab);
  }, []);
  return (
    <div ref={hoja} className={s.hoja}>
      <div>
        <p className={s.eyebrow}>Hub {e.n} del Mapa CTC</p>
        <h3 ref={titulo} tabIndex={-1} className={s.hojaTitulo}>
          {e.n} · {e.label}
        </h3>
        <p>
          Leído el <Hora iso={t.leidoAt} /> · Solo conteos y estados; cada cifra abre la pantalla de la consola dueña.
        </p>
      </div>
      <ModulosDelEdificio dominio={e.dominio} modulos={modulos} base={base} />
      <div className={s.kpis}>
        <div className={s.kpi}>
          <span className={s.kpiK}>Tareas abiertas</span>
          <Cifra medida={e.abiertas} grande abrir />
        </div>
        <div className={s.kpi}>
          <span className={s.kpiK}>Vencidas</span>
          <Cifra medida={e.vencidas} grande abrir />
        </div>
        <div className={s.kpi}>
          <span className={s.kpiK}>Hechos del turno</span>
          <Cifra medida={e.hechos} grande />
        </div>
        <div className={s.kpi}>
          <span className={s.kpiK}>Eventos en cola</span>
          <Cifra medida={e.cola.pendientes} grande abrir />
        </div>
        <div className={s.kpi}>
          <span className={s.kpiK}>Eventos fallidos</span>
          <Cifra medida={e.cola.fallidos} grande abrir />
        </div>
        <div className={s.kpi}>
          <span className={s.kpiK}>Salud de sus crons</span>
          <SaludLeida salud={e.salud.valor} vacio={vacioDeSalud(e)} />
        </div>
      </div>
      <div>
        <p className={s.subtitulo}>Piezas de este hub</p>
        {e.piezas.length ? (
          <ul className={s.piezas}>
            {e.piezas.map((p, i) => (
              <li key={`${p.pieza}-${i}`} className={s.pieza}>
                <span className={s.piezaNombre}>
                  {FUENTES[p.pieza].etiqueta}
                  {"clave" in p && p.clave ? ` · ${etiquetaDeClave(p.pieza, p.clave)}` : ""}
                </span>
                {"valor" in p ? <Cifra medida={p} abrir /> : <RotuloLeido rotulo={p} abrir />}
              </li>
            ))}
          </ul>
        ) : (
          <p>Este hub todavía no tiene piezas propias en la plataforma.</p>
        )}
      </div>
      <div className={s.acciones}>
        <CopiarContexto texto={contextoParaTailor(t, e.dominio)} />
      </div>
    </div>
  );
}

const ENCABEZADO = {
  modulo: {
    eyebrow: "Módulo · Hacienda",
    titulo: "La Hacienda",
  },
  portada: {
    eyebrow: "Inicio · la Hacienda",
    titulo: "CTCx OS",
  },
} as const;

export function Hacienda({
  tablero: t,
  modulos,
  base,
  portada = false,
}: {
  tablero: Tablero;
  /** El estado de cada módulo: la hoja de su edificio ofrece «Abrir <módulo>» o dice por qué está apagado. */
  modulos: Modulos;
  base: BaseDeModulos;
  /** En la portada (`/os`) el encabezado es el de la OS; en el módulo, el de la Hacienda. El mapa y las hojas son los mismos. */
  portada?: boolean;
}) {
  const enc = ENCABEZADO[portada ? "portada" : "modulo"];
  const donde = dondeSeAbren(modulos);
  const [sel, setSel] = useState<Dominio | null>(null);
  const origen = useRef<HTMLElement | SVGGElement | null>(null);
  const reducido = useMovimientoReducido();

  const abrir = (d: Dominio, desde: HTMLElement | SVGGElement) => {
    origen.current = desde;
    setSel(d);
  };
  // Al cerrar la hoja, el foco vuelve a quien la abrió (el edificio o su botón de la lista).
  const cerrar = useCallback(() => {
    setSel(null);
    const el = origen.current;
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "nearest", behavior: reducido ? "auto" : "smooth" });
    }
  }, [reducido]);
  const teclado = (d: Dominio) => (ev: React.KeyboardEvent<SVGGElement>) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      abrir(d, ev.currentTarget);
    }
  };
  const edificioSel = sel ? t.edificios[sel] : null;

  return (
    <div className={s.vista}>
      <Encabezado
        eyebrow={enc.eyebrow}
        titulo={enc.titulo}
        texto={`${portada ? "La casa entera, en un mapa: " : ""}los diez hubs del Mapa CTC como edificios de la finca. La ficha morada cuenta las tareas abiertas de cada hub; el banderín rojo, las vencidas; una ficha punteada con una raya es un hub sin datos todavía. Elija un edificio para ver sus cifras${portada && donde ? `: ${donde}` : ""}.`}
      />
      <figure className={s.lienzo}>
        <svg
          viewBox={`0 ${RECORTE} ${VIEWBOX.ancho} ${VIEWBOX.alto - RECORTE}`}
          className={s.dibujo}
          role="group"
          aria-label="La Hacienda: diez edificios, uno por hub del Mapa CTC. Cada edificio es un botón."
        >
          <g aria-hidden="true">
            <Caras caras={SUELO} />
            <path d={CALLES} className={s.calleBorde} strokeWidth={CALLE.borde} />
            <path d={CALLES} className={s.calle} strokeWidth={CALLE.calzada} />
            {ONDAS.map((d, i) => (
              <path key={i} d={d} className={s.onda} />
            ))}
            <Caras caras={GRANOS} />
            <Caras caras={MATAS} />
          </g>
          {CAPAS.map((c, i) => {
            if ("arbol" in c) {
              return (
                <g key={`a${i}`} aria-hidden="true">
                  <Caras caras={c.arbol} />
                </g>
              );
            }
            const e = t.edificios[c.dominio];
            const a = anilloDe(c.dominio);
            return (
              <g
                key={c.dominio}
                className={s.edificio}
                role="button"
                tabIndex={0}
                aria-label={resumenEnPalabras(e)}
                aria-haspopup="dialog"
                onClick={(ev) => abrir(c.dominio, ev.currentTarget)}
                onKeyDown={teclado(c.dominio)}
              >
                <ellipse cx={a.cx} cy={a.cy} rx={a.rx} ry={a.ry} className={`${s.anillo}${sel === c.dominio ? ` ${s.anilloSel}` : ""}`} />
                <Caras caras={edificioArte(c.dominio)} />
              </g>
            );
          })}
          <g className={s.rotulos} aria-hidden="true">
            {DOMINIOS.map((d) => (
              <Rotulo key={`r${d.id}`} e={t.edificios[d.id]} />
            ))}
          </g>
        </svg>
      </figure>

      <section className={s.seccion} aria-labelledby="os-hubs">
        <h2 id="os-hubs" className={s.seccionTitulo}>
          Los diez hubs
        </h2>
        <p className={s.seccionNota}>
          La misma Hacienda en lista, en el orden del Mapa CTC (es también el camino ordenado con el teclado). Un hub con sus tareas en «Sin datos» no las
          tiene todavía en la plataforma (llegan con Notion, F3) o su lectura falló: entonces el aviso de Inicio lo dice.
        </p>
        <ul className={s.hubLista}>
          {DOMINIOS.map((d) => {
            const e = t.edificios[d.id];
            return (
              <li key={d.id}>
                <button
                  type="button"
                  className={`${s.hubBoton}${sel === d.id ? ` ${s.hubSel}` : ""}`}
                  aria-haspopup="dialog"
                  onClick={(ev) => abrir(d.id, ev.currentTarget)}
                >
                  <span className={s.hubN}>Hub {d.n}</span>
                  <span className={s.hubNombre}>{d.label}</span>
                  <span className={s.hubCifras}>
                    <span>
                      Abiertas <Cifra medida={e.abiertas} sinFuente />
                    </span>
                    {!sinFuente(e) && (
                      <span>
                        Vencidas <Cifra medida={e.vencidas} sinFuente />
                      </span>
                    )}
                  </span>
                  <SaludLeida salud={e.salud.valor} vacio={vacioDeSalud(e)} sinFuente />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Modal open={edificioSel !== null} onClose={cerrar} ariaLabel={edificioSel ? `${edificioSel.n} · ${edificioSel.label}` : "Hub"}>
        {edificioSel && <Hoja t={t} e={edificioSel} modulos={modulos} base={base} />}
      </Modal>
    </div>
  );
}
