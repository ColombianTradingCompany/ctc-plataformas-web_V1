import Image from "next/image";
import Link from "next/link";
import { CONSOLES } from "@/lib/panel/consoles";
import { MODULOS_OS, type ClaveDeModulo, type EstadoDeModulo } from "@/lib/os/modulos";
import { contextoParaTailor, type Tablero } from "@/lib/os/tablero";
import { Avisos } from "../Avisos";
import { CopiarContexto } from "../CopiarContexto";
import s from "../os.module.css";

// ── CTCx OS · Inicio (V6.19, F2) ─────────────────────────────────────────────
// No es un módulo: es la puerta. El logo oficial (el raster con hash, una sola vez), una tarjeta por
// módulo con su interruptor (encendido o apagado, y el motivo) y la deuda de datos (los avisos de las
// lecturas que fallaron, con sus fuentes). Si TODOS los módulos están apagados (la consola apagada o el
// interruptor sin lectura), Inicio no lee el tablero: `tablero` llega en null y no se pinta ninguna cifra.
// `base` es la ruta de los módulos: la de la OS, o la de la demostración.

const QUE_HACE: Record<ClaveDeModulo, string> = {
  hacienda: "Los diez hubs del Mapa CTC como edificios: tareas abiertas y vencidas, hechos del turno, cola y salud de cada hub.",
  almacen: "El café de la casa en kilos: la franja del stock, los lotes por etapa y los despachos.",
  taller: "La salud del sistema: la versión, los crons, la cola de la espina y el registro de automatizaciones.",
};

export function InicioVista({
  tablero,
  modulos,
  base,
}: {
  tablero: Tablero | null;
  modulos: Record<ClaveDeModulo, EstadoDeModulo>;
  base: "/os/m" | "/os/demo";
}) {
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
                {!e.encendido && e.motivo && <p className={s.moduloTexto}>Motivo: {e.motivo}</p>}
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
