"use client";

import Link from "next/link";
import { FUENTES, describirFuente, enlaceVisible, type Medida, type NotaDeMedida, type PiezaId, type Rotulo } from "@/lib/os/fuentes";
import { textosDelOs } from "@/lib/os/textos/idioma";
import { SALUD_LABEL, type Salud } from "@/lib/integraciones/registroCrons";
import { IconoAlerta } from "./IconoAlerta";
import { useProcedencia } from "./Procedencia";
import s from "./os.module.css";

// ── CTCx OS · la cifra (V6.19, F2) ───────────────────────────────────────────
// El ÚNICO componente que formatea un número del OS (qa-os-check C5): en es-CO, con su unidad.
// Su `medida` es OBLIGATORIA, así que una cifra sin pieza (sin fuente) no se puede pintar.
//   · `valor: null` → «Sin datos», nunca un cero; con la nota `solo_owner` (el Modelo Económico y quien mira
//     no es el owner) → «Solo el owner», que no es un error ni un hueco: la pieza no se leyó para él;
//   · `demo` → la etiqueta «EJEMPLO»;
//   · con «Ver fuentes» encendido → una línea en mono «Plataforma › tabla.columna» (o la función
//     reusada; o, en F3, «Notion › «Base» · propiedad»), su filtro y sus notas (por ejemplo «cuenta
//     cero si falla una lectura» o «sin la lectura de Notion todavía»);
//   · «Abrir» → la pantalla de la consola dueña de la pieza, SOLO si quien mira la tiene y su rail
//     se la enseña (`enlaceVisible`, crítica 12). Sin enlace visible, no hay «Abrir».
// Aquí viven también el rótulo leído (un texto, como el código de la edición del PVC), la salud
// (que se dice con palabra, no con número) y la hora de lectura: todo lo que se lee pasa por aquí.

const NUMERO = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const HORA = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const NOTA: Record<NotaDeMedida, string> = {
  cuenta_cero_si_falla: "cuenta cero si falla una lectura",
  tope_de_filas: "llegó al tope de filas: es un mínimo",
  sin_fuente_aun: "sin fuente aún: llega con Notion (F3)",
  solo_owner: "el Modelo Económico es solo del owner: no se lee para quien mira",
  sin_el_pvc: "sin lo del Modelo Económico (solo del owner)",
  sin_integracion_notion: textosDelOs().notas.sin_integracion_notion,
};

const esSoloOwner = (m: { notas?: readonly NotaDeMedida[] }) => !!m.notas?.includes("solo_owner");

/** Una pieza del Modelo Económico para quien no es el owner: ni cifra, ni «Sin datos», ni cero. */
const SoloOwner = () => <span className={s.soloOwner}>Solo el owner</span>;

/** El texto corto de una cifra (para el dibujo de la Hacienda, donde no cabe una línea de fuente). */
export function textoDeCifra(m: Medida): string {
  return m.valor === null ? "–" : NUMERO.format(m.valor);
}

function LineaDeFuente({ pieza, notas, abrir }: { pieza: PiezaId; notas?: readonly NotaDeMedida[]; abrir: string | null }) {
  const f = FUENTES[pieza];
  const d = describirFuente(pieza);
  return (
    <span className={s.fuente}>
      {d.origen} › {d.texto}
      {f.filtro && <> · {f.filtro}</>}
      {notas?.map((n) => (
        <span key={n} className={s.fuenteNota}>
          {" "}· {NOTA[n]}
        </span>
      ))}
      {abrir && (
        <>
          {" "}·{" "}
          <Link href={abrir} className={s.fuenteAbrir}>
            Abrir
          </Link>
        </>
      )}
    </span>
  );
}

function useEnlace(pieza: PiezaId): string | null {
  const { consolas, isOwner } = useProcedencia();
  return enlaceVisible(FUENTES[pieza].enlace, { consoles: consolas, isOwner });
}

export function Cifra({
  medida,
  abrir = false,
  sinFuente = false,
  grande = false,
}: {
  medida: Medida;
  /** Pone «Abrir» al lado aunque «Ver fuentes» esté apagado (las piezas de un hub, en su hoja). */
  abrir?: boolean;
  /** No pinta la línea de fuente (el HUD: la fuente se ve en el resto de la pantalla). */
  sinFuente?: boolean;
  grande?: boolean;
}) {
  const { ver } = useProcedencia();
  const enlace = useEnlace(medida.pieza);
  const unidad = FUENTES[medida.pieza].unidad;
  return (
    <span className={`${s.cifra}${grande ? ` ${s.cifraGrande}` : ""}`}>
      <span className={s.cifraFila}>
        {esSoloOwner(medida) ? (
          <SoloOwner />
        ) : medida.valor === null ? (
          <span className={s.sinDatos}>Sin datos</span>
        ) : (
          <span className={s.cifraValor}>
            {NUMERO.format(medida.valor)}
            {unidad && <span className={s.cifraUnidad}> {unidad}</span>}
          </span>
        )}
        {/* «EJEMPLO» marca una cifra inventada; un «Sin datos» no es una cifra, no la lleva. */}
        {medida.demo && medida.valor !== null && <span className={s.ejemplo}>EJEMPLO</span>}
        {abrir && !ver && enlace && (
          <Link href={enlace} className={s.abrir}>
            Abrir
          </Link>
        )}
      </span>
      {ver && !sinFuente && <LineaDeFuente pieza={medida.pieza} notas={medida.notas} abrir={enlace} />}
    </span>
  );
}

/** Un texto leído (el código de una edición): `null` → «Sin datos»; con `solo_owner` → «Solo el owner». */
export function RotuloLeido({ rotulo, abrir = false }: { rotulo: Rotulo; abrir?: boolean }) {
  const { ver } = useProcedencia();
  const enlace = useEnlace(rotulo.pieza);
  return (
    <span className={s.cifra}>
      <span className={s.cifraFila}>
        {esSoloOwner(rotulo) ? (
          <SoloOwner />
        ) : rotulo.texto === null ? (
          <span className={s.sinDatos}>Sin datos</span>
        ) : (
          <span className={s.rotulo}>{rotulo.texto}</span>
        )}
        {rotulo.demo && rotulo.texto !== null && <span className={s.ejemplo}>EJEMPLO</span>}
        {abrir && !ver && enlace && (
          <Link href={enlace} className={s.abrir}>
            Abrir
          </Link>
        )}
      </span>
      {ver && <LineaDeFuente pieza={rotulo.pieza} notas={rotulo.notas} abrir={enlace} />}
    </span>
  );
}

/** Las saludes que son una alerta: llevan su icono además de su palabra (PLAN §7.7). */
const ALERTA: ReadonlySet<Salud> = new Set<Salud>(["atrasada", "fallo"]);

const TONO_DE_SALUD: Record<Salud, string> = {
  ok: s.badgeBien,
  parcial: s.badgeAviso,
  sin_corrida: s.badgeNeutro,
  atrasada: s.badgeMal,
  fallo: s.badgeMal,
};

/** La salud se dice con su palabra (`SALUD_LABEL`) y un tono; nunca solo con color. `null` = sin crons o sin lectura. */
export function SaludLeida({ salud, vacio = "Sin datos", sinFuente = false }: { salud: Salud | null; vacio?: string; sinFuente?: boolean }) {
  const { ver } = useProcedencia();
  const enlace = useEnlace("salud_crons");
  return (
    <span className={s.cifra}>
      <span className={s.cifraFila}>
        {salud === null ? <span className={s.sinDatos}>{vacio}</span> : <span className={`${s.badge} ${TONO_DE_SALUD[salud]}`}>
            {ALERTA.has(salud) && <IconoAlerta />}
            {SALUD_LABEL[salud]}
          </span>}
      </span>
      {ver && !sinFuente && <LineaDeFuente pieza="salud_crons" abrir={enlace} />}
    </span>
  );
}

/** Una hora de lectura, en es-CO y hora de Colombia. */
export function Hora({ iso }: { iso: string }) {
  const d = new Date(iso);
  // La hora del servidor y la del navegador pueden escribir distinto el espacio de «p. m.» (ICU): se acepta la del servidor.
  return <time dateTime={iso} suppressHydrationWarning>{Number.isNaN(d.getTime()) ? "Sin datos" : HORA.format(d)}</time>;
}
