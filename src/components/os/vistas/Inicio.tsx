import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { CONSOLES } from "@/lib/panel/consoles";
import { MODULOS_OS, type ClaveDeModulo, type EstadoDeModulo } from "@/lib/os/modulos";
import { DOMINIOS } from "@/lib/integraciones/dominios";
import { contextoParaTailor, type Tablero } from "@/lib/os/tablero";
import { textosDelOs } from "@/lib/os/textos/idioma";
import { Avisos } from "../Avisos";
import { CopiarContexto } from "../CopiarContexto";
import { porQueEstaApagado } from "../ModuloApagado";
import { SiElMapaFalla } from "../SiElMapaFalla";
import { Hacienda, type BaseDeModulos } from "./Hacienda";
import s from "../os.module.css";

// ── CTCx OS · Inicio (V6.19, F2) ─────────────────────────────────────────────
// No es un módulo: es la puerta. Desde el 5 nov (rumbo del owner: el OS es un juego y abre en el mapa)
// la puerta ES la Hacienda —la MISMA vista y las mismas hojas que `/os/m/hacienda`, no una copia—, con
// el Almacén y el Taller abriéndose desde sus edificios (hub 2 y hub 5). Debajo, lo que Inicio no puede
// perder: la lista corta de los módulos con su interruptor (para que nada quede escondido), la deuda de
// datos (los avisos de las lecturas que fallaron, con sus fuentes), «Copiar contexto para Tailor» y el
// logo oficial (el raster con hash, una sola vez).
// Si el módulo Hacienda está apagado, Inicio vuelve a las tarjetas de antes; y también si el mapa falla al pintarse
// (`SiElMapaFalla`, con su `Suspense` para que un fallo en el servidor se reintente en el navegador y caiga en el mismo
// sitio): un mapa caído no se lleva la lista de los módulos, los avisos ni «Copiar contexto para Tailor». Si TODOS los módulos están
// apagados (la consola apagada o el interruptor sin lectura), Inicio no lee el tablero: `tablero` llega en
// null y no se pinta ninguna cifra. `base` es la ruta de los módulos: la de la OS, o la de la demostración.

const QUE_HACE: Record<ClaveDeModulo, string> = {
  hacienda: "Los diez hubs del Mapa CTC como edificios: tareas abiertas y vencidas, hechos del turno, cola y salud de cada hub.",
  almacen: "El café de la casa en kilos: la franja del stock, los lotes por etapa y los despachos.",
  taller: "La salud del sistema: la versión, los crons, la cola de la espina y el registro de automatizaciones.",
  // F3 (en obra, apagados por defecto): sus textos viven en una fuente por idioma (`src/lib/os/textos/`).
  estafeta: textosDelOs().modulos.estafeta,
  acciones: textosDelOs().modulos.acciones,
  rondas: textosDelOs().modulos.rondas,
};

const hubDe = (clave: ClaveDeModulo) => {
  const edificio = MODULOS_OS.find((m) => m.clave === clave)?.edificio ?? null;
  return edificio ? (DOMINIOS.find((d) => d.id === edificio) ?? null) : null;
};

type Props = { tablero: Tablero | null; modulos: Record<ClaveDeModulo, EstadoDeModulo>; base: BaseDeModulos };

export function InicioVista({ tablero, modulos, base }: Props) {
  if (tablero && modulos.hacienda.encendido) return <InicioEnElMapa tablero={tablero} modulos={modulos} base={base} />;
  return <InicioEnTarjetas tablero={tablero} modulos={modulos} base={base} />;
}

/** La portada de la OS, dentro de su límite: si el mapa falla, Inicio vuelve a las tarjetas en vez de caerse entero. */
function InicioEnElMapa(p: Props & { tablero: Tablero }) {
  const tarjetas = <InicioEnTarjetas tablero={p.tablero} modulos={p.modulos} base={p.base} />;
  return (
    <SiElMapaFalla enSuLugar={tarjetas}>
      <Suspense fallback={tarjetas}>
        <ElMapaYLoDemas {...p} />
      </Suspense>
    </SiElMapaFalla>
  );
}

/** El mapa primero, y debajo lo que Inicio no puede perder. */
function ElMapaYLoDemas({ tablero, modulos, base }: Props & { tablero: Tablero }) {
  const c = CONSOLES.os;
  return (
    <div className={s.vista}>
      <Hacienda tablero={tablero} modulos={modulos} base={base} portada />

      <section className={s.seccion} aria-labelledby="os-modulos">
        <h2 id="os-modulos" className={s.seccionTitulo}>
          Los módulos
        </h2>
        <p className={s.seccionNota}>Cada módulo se abre desde su edificio del mapa; aquí están todos, con su interruptor.</p>
        <ul className={s.modulosLista}>
          {MODULOS_OS.map((m) => {
            const e = modulos[m.clave];
            const hub = hubDe(m.clave);
            return (
              <li key={m.clave} className={s.moduloFila}>
                <span className={s.moduloFilaNombre}>{m.titulo}</span>
                <span className={`${s.badge} ${e.encendido ? s.badgeBien : s.badgeNeutro}`}>{e.encendido ? "Encendido" : "Apagado"}</span>
                <span className={s.moduloFilaTexto}>
                  {!e.encendido
                    ? porQueEstaApagado(e)
                    : hub
                      ? `Se abre desde el hub ${hub.n} · ${hub.label}.`
                      : "Es este mapa."}
                </span>
                {e.encendido && m.clave !== "hacienda" && (
                  <Link href={`${base}/${m.clave}`} className={s.moduloFilaAbrir}>
                    Abrir {m.titulo}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <Avisos avisos={tablero.avisos} />
      <div className={s.acciones}>
        <CopiarContexto texto={contextoParaTailor(tablero)} />
      </div>

      <div className={s.firma}>
        <Image src="/images/shared/ctc-logo-full.png" alt="CTCx" width={2234} height={1231} className={s.firmaLogo} />
        <p className={s.texto}>
          <strong>{c.name}</strong> · {c.tagline}. Todo lo que se ve aquí se LEE de la plataforma, en este momento; cada cifra dice de dónde
          sale y abre la pantalla de la consola dueña.
        </p>
      </div>
    </div>
  );
}

/** Inicio de antes: con la Hacienda apagada (o sin lectura), una tarjeta por módulo. */
function InicioEnTarjetas({ tablero, modulos, base }: Props) {
  const c = CONSOLES.os;
  return (
    <div className={s.vista}>
      <div className={s.portada}>
        <Image src="/images/shared/ctc-logo-full.png" alt="CTCx" width={2234} height={1231} className={s.logo} priority />
        <div>
          <p className={s.eyebrow}>Inicio · puesto de mando</p>
          <h1 className={s.titulo}>{c.name}</h1>
          <p className={s.texto}>
            {c.tagline}. Todo lo que se ve aquí se LEE de la plataforma, en este momento; cada cifra dice de dónde sale y abre la pantalla de la consola
            dueña.
          </p>
        </div>
      </div>

      <section className={s.seccion} aria-labelledby="os-modulos">
        <h2 id="os-modulos" className={s.seccionTitulo}>
          Los módulos
        </h2>
        <ul className={s.modulos}>
          {MODULOS_OS.map((m) => {
            const e = modulos[m.clave];
            return (
              <li key={m.clave} className={s.modulo}>
                <div className={s.moduloCabeza}>
                  <h3 className={s.moduloTitulo}>{m.titulo}</h3>
                  <span className={`${s.badge} ${e.encendido ? s.badgeBien : s.badgeNeutro}`}>{e.encendido ? "Encendido" : "Apagado"}</span>
                </div>
                <p className={s.moduloTexto}>{QUE_HACE[m.clave]}</p>
                {!e.encendido && <p className={s.moduloTexto}>{porQueEstaApagado(e)}</p>}
                {e.encendido && (
                  <div className={s.acciones}>
                    <Link href={`${base}/${m.clave}`} className="btn btn-sm">
                      Abrir {m.titulo}
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {tablero ? (
        <>
          <Avisos avisos={tablero.avisos} />
          <div className={s.acciones}>
            <CopiarContexto texto={contextoParaTailor(tablero)} />
          </div>
        </>
      ) : (
        <p className={s.texto}>Todos los módulos están apagados: el puesto de mando no lee la plataforma hasta que se encienda alguno.</p>
      )}
    </div>
  );
}
