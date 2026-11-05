"use client";

import { useCallback, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { DOMINIOS, type Dominio } from "@/lib/integraciones/dominios";
import { FUENTES } from "@/lib/os/fuentes";
import { contextoParaTailor, etiquetaDeClave, type Edificio, type Tablero } from "@/lib/os/tablero";
import {
  CALLE,
  VIEWBOX,
  anclaDelRotulo,
  anilloDe,
  arbolesArte,
  callesArte,
  edificioArte,
  granosArte,
  matasArte,
  ondasArte,
  profundidad,
  sueloArte,
  type Cara,
} from "@/lib/os/haciendaArte";
import { Cifra, Hora, RotuloLeido, SaludLeida, textoDeCifra } from "../Cifra";
import { CopiarContexto } from "../CopiarContexto";
import { useMovimientoReducido } from "../identidad/useMovimientoReducido";
import { Encabezado } from "./Encabezado";
import s from "../os.module.css";

// ── CTCx OS · la Hacienda (V6.19, F2) ────────────────────────────────────────
// Los diez hubs del Mapa CTC como edificios de una finca (la geometría sale de `haciendaArte.ts`;
// los colores, de `os-tokens.css`). Cada edificio es un BOTÓN con nombre (Enter o Espacio), con su
// rótulo en mono y una ficha con sus tareas abiertas en el morado de la casa. La bandera roja con
// la palabra «VENCIDAS» sale solo si las hay; la ficha punteada dice «Sin datos · llega con Notion
// (F3)» en los hubs que la plataforma todavía no alimenta. El anillo punteado morado es la
// selección y el foco del teclado.
// En el teléfono el dibujo es una vista de conjunto y la lista de los diez hubs, debajo, es el
// control (también es la alternativa para un lector de pantalla). Elegir un hub abre su hoja: sus
// cifras, sus piezas con «Abrir» y «Copiar contexto para Tailor». Ningún edificio usa un color de grado.

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
  const [x, y] = anclaDelRotulo(e.dominio);
  const texto = `${e.n} · ${e.label.toUpperCase()}`;
  const ancho = texto.length * 6.6 + 16;
  const vacio = sinFuente(e) || e.abiertas.valor === null;
  const izq = x - (ancho + 22) / 2;
  // La bandera de las vencidas: un banderín rojo con su palabra, colgado del rótulo (el color nunca va solo). Va aquí y
  // no en la cumbre del edificio porque allí el rótulo la tapaba.
  const vencidas = e.vencidas.valor ? `VENCIDAS ${textoDeCifra(e.vencidas)}` : null;
  const bx = izq + ancho + 24;
  const banderin = vencidas ? vencidas.length * 6 + 18 : 0;
  return (
    <g>
      <rect x={izq} y={y - 10} width={ancho} height={20} rx={10} className={s.rotuloFondo} />
      <text x={izq + 8} y={y + 3.5} className={s.rotuloTexto}>
        {texto}
      </text>
      <circle cx={izq + ancho + 10} cy={y} r={11} className={vacio ? s.chipVacio : s.chip} />
      <text x={izq + ancho + 10} y={y + 3.6} textAnchor="middle" className={`${s.chipTexto}${vacio ? ` ${s.chipTextoVacio}` : ""}`}>
        {textoDeCifra(e.abiertas)}
      </text>
      {vencidas && (
        <>
          <path d={`M${bx} ${y - 9}h${banderin}l-7 9 7 9h${-banderin}Z`} className={s.bandera} />
          <text x={bx + 5} y={y + 3.2} className={s.banderaTexto}>
            {vencidas}
          </text>
        </>
      )}
    </g>
  );
}


function Hoja({ t, e }: { t: Tablero; e: Edificio }) {
  return (
    <div className={s.hoja}>
      <div>
        <p className={s.eyebrow}>Hub {e.n} del Mapa CTC</p>
        <h3>
          {e.n} · {e.label}
        </h3>
        <p>
          Leído el <Hora iso={t.leidoAt} /> · Solo conteos y estados; cada cifra abre la pantalla de la consola dueña.
        </p>
      </div>
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
          <SaludLeida salud={e.salud.valor} vacio="Sin crons" />
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

export function Hacienda({ tablero: t }: { tablero: Tablero }) {
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
        eyebrow="Módulo · Hacienda"
        titulo="La Hacienda"
        texto="Los diez hubs del Mapa CTC como edificios de la finca. La ficha morada cuenta las tareas abiertas de cada hub; el banderín rojo, las vencidas. Elija un edificio para ver sus cifras."
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
        <p className={s.seccionNota}>La misma Hacienda en lista. Un hub en «Sin datos» no tiene todavía tareas en la plataforma: llegan con Notion (F3).</p>
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
                  <SaludLeida salud={e.salud.valor} vacio="Sin crons" sinFuente />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Modal open={edificioSel !== null} onClose={cerrar} ariaLabel={edificioSel ? `${edificioSel.n} · ${edificioSel.label}` : "Hub"}>
        {edificioSel && <Hoja t={t} e={edificioSel} />}
      </Modal>
    </div>
  );
}
