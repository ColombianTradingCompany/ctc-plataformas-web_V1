import Link from "next/link";
import { GRADO_POR_ID, esGradoValido } from "@/lib/grados/definicion";
import type { RondaArmada, Tarjeta } from "@/lib/os/rondas/nucleo";
import { textosDelOs } from "@/lib/os/textos/idioma";
import { Hora } from "../Cifra";
import { RegistrarRespuesta } from "../rondas/RegistrarRespuesta";
import { Encabezado } from "./Encabezado";
import s from "../os.module.css";
import r from "../rondas/rondas.module.css";

// ── CTCx OS · el módulo Rondas · UNA ronda (2026-11-07) ──────────────────────
// El ÚNICO componente que pinta cualquier ronda: la cabecera (para qué, por qué, cuántos van), y una tarjeta por Personaje con sus
// lotes, lo que le falta a cada uno, «Abrir WhatsApp» (un enlace `wa.me` con el mensaje escrito: la persona lo envía ella misma) y
// «Registrar respuesta». Todo lo propio de la ronda sale de su DEFINICIÓN, ya armado por `armarRonda` (puro); las palabras de la
// pantalla, de `textos/` (una fuente por idioma). Móvil primero: una columna, botones de pulgar, sin arte de juego.

/** Las clases de la casa juntas (así ninguna cadena de la vista lleva un espacio: `qa-os-check` R9, sin texto propio). */
const cx = (...c: string[]) => c.join(" ");

const ESTADO_BADGE = { hecho: s.badgeBien, volver_a_llamar: s.badgeAviso, no_contesta: s.badgeNeutro, sin_contacto: s.badgeNeutro } as const;

function nombreDelGrado(grado: string | null): string | null {
  return grado && esGradoValido(grado) ? GRADO_POR_ID[grado].nombre : grado;
}

function TarjetaDeProductor({ t, slug, bitacora, demo }: { t: Tarjeta; slug: string; bitacora: RondaArmada["contactos"]; demo: boolean }) {
  const x = textosDelOs().rondas;
  return (
    <li className={`${r.tarjeta} ${t.estado === "hecho" ? r.tarjetaHecha : ""}`}>
      <div className={r.cabeza}>
        <h3 className={r.nombre}>{t.nombre}</h3>
        <span className={`${s.badge} ${ESTADO_BADGE[t.estado]}`}>{x.estados[t.estado]}</span>
      </div>
      <p className={r.meta}>
        <span className={r.codigo}>{t.codigo ?? x.sinCodigo}</span>
        {t.empresa && <> · {t.empresa}</>} · {t.whatsappConfirmado ? x.whatsappConfirmado : x.whatsappSinConfirmar} ·{" "}
        {t.pendientes ? (
          <>
            {t.pendientes} {x.pendientes}
          </>
        ) : (
          x.sinPendientes
        )}
      </p>

      <ul className={r.lotes}>
        {t.lotes.map((l) => (
          <li key={l.id} className={r.lote}>
            <p className={r.loteNombre}>
              {l.nombre} <span className={r.codigo}>{l.codigo ?? x.sinCodigo}</span>
            </p>
            <p className={r.meta}>
              {l.finca ? (
                <>
                  {x.finca}: {l.finca.nombre}
                  {l.finca.estado === "pending_review" && <> ({x.fincaEnRevision})</>}
                </>
              ) : (
                x.sinFinca
              )}
              {l.grado && (
                <>
                  {" "}
                  · {x.grado} {nombreDelGrado(l.grado)}
                </>
              )}
              {l.fichaPct != null && (
                <>
                  {" "}
                  · {x.fichaAl} {l.fichaPct} %
                </>
              )}
            </p>
            {l.pedidos.length ? (
              <ul className={r.pedidos}>
                {l.pedidos.map((p) => (
                  <li key={p.clave}>
                    <span className={r.pedidoTitulo}>{p.titulo}</span>
                    {p.detalle.map((d, i) => (
                      <span key={i} className={r.detalle}>
                        {d}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={r.nada}>{x.sinPendientes}</p>
            )}
          </li>
        ))}
        {t.pedidosDelProductor.length > 0 && (
          <li className={r.lote}>
            <p className={r.loteNombre}>{x.delProductor}</p>
            <ul className={r.pedidos}>
              {t.pedidosDelProductor.map((p) => (
                <li key={p.clave}>
                  <span className={r.pedidoTitulo}>{p.titulo}</span>
                  {p.detalle.map((d, i) => (
                    <span key={i} className={r.detalle}>
                      {d}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>

      <div className={r.botones}>
        {t.enlaceWhatsapp ? (
          <>
            <a className={cx("btn", "btn-solid", r.whatsapp)} href={t.enlaceWhatsapp} target="_blank" rel="noreferrer">
              {x.abrirWhatsapp}
            </a>
            <p className={r.nota}>{x.abrirWhatsappNota}</p>
          </>
        ) : (
          <p className={r.error}>{x.sinTelefono}</p>
        )}
        <details className={r.plegable}>
          <summary>{x.verMensaje}</summary>
          <div className={r.plegableCuerpo}>
            <p className={r.mensaje}>{t.mensaje}</p>
          </div>
        </details>
        <RegistrarRespuesta
          ronda={slug}
          productorId={t.productorId}
          lotes={t.lotes.map((l) => ({ id: l.id, nombre: l.nombre, campos: l.campos }))}
          camposDelProductor={t.camposDelProductor}
          bitacora={bitacora}
          demo={demo}
        />
      </div>

      {t.ultimo && (
        <p className={r.meta}>
          {x.ultimoContacto}: {x.resultados[t.ultimo.resultado]} · <Hora iso={t.ultimo.registradoAt} /> · {x.por} {t.ultimo.registradoPor ?? x.alguien}
          {t.ultimo.volverEl && (
            <>
              {" "}
              · {x.volverElCorto} {t.ultimo.volverEl}
            </>
          )}
        </p>
      )}
      {t.historial.length > 0 && (
        <details className={r.plegable}>
          <summary>{x.bitacora}</summary>
          <ul className={`${r.plegableCuerpo} ${r.bitacora}`}>
            {t.historial.map((c) => (
              <li key={c.id}>
                <strong>{x.resultados[c.resultado]}</strong> · <Hora iso={c.registradoAt} /> · {x.por} {c.registradoPor ?? x.alguien}
                {c.volverEl && (
                  <>
                    {" "}
                    · {x.volverElCorto} {c.volverEl}
                  </>
                )}
                {c.nota && <span className={r.detalle}>{c.nota}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

export function Ronda({ ronda, demo = false, volver }: { ronda: RondaArmada | null; demo?: boolean; volver: string }) {
  const x = textosDelOs().rondas;
  if (!ronda) {
    return (
      <div className={s.vista}>
        <Encabezado eyebrow={x.eyebrow} titulo={x.titulo} />
        <p role="alert" className={`${s.apagado} ${s.texto}`}>
          {x.sinLectura}
        </p>
      </div>
    );
  }
  const pct = ronda.total ? Math.round((ronda.hechos / ronda.total) * 100) : 0;
  return (
    <div className={s.vista}>
      <Encabezado eyebrow={x.eyebrow} titulo={ronda.titulo} texto={ronda.proposito} />
      <p className={s.texto}>
        <strong>{x.porQue}:</strong> {ronda.porQue}
      </p>

      <div className={r.progreso} role="status">
        <span className={r.progresoCifra}>
          {ronda.hechos} {x.de} {ronda.total}
        </span>
        <span className={r.progresoTexto}>{x.hechos}</span>
        <div className={r.barra} aria-hidden="true">
          <div className={r.barraLlena} style={{ width: `${pct}%` }} />
        </div>
        <span className={r.nota}>{x.hechoNota}</span>
      </div>

      {ronda.pendientesDeLaDefinicion.length > 0 && (
        <div className={r.pendiente}>
          <strong>{x.pendientesTitulo}</strong>
          {ronda.pendientesDeLaDefinicion.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
      {ronda.contactos === "sin_registro" && <p className={r.pendiente}>{x.bitacoraSinRegistro}</p>}
      {ronda.contactos === "fallo" && <p className={r.pendiente}>{x.bitacoraFallo}</p>}

      <ul className={r.lista}>
        {ronda.tarjetas.map((t) => (
          <TarjetaDeProductor key={t.productorId} t={t} slug={ronda.slug} bitacora={ronda.contactos} demo={demo} />
        ))}
      </ul>
      <div className={s.acciones}>
        <Link href={volver} className={cx("btn", "btn-sm")}>
          {x.titulo}
        </Link>
      </div>
    </div>
  );
}
