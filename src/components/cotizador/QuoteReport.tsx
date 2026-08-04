"use client";

// ── Cotización · el documento del cliente ────────────────────────────────────
// Lo que sale de CTC hacia afuera. Dos reglas que lo gobiernan:
//
// 1. NUNCA lleva margen ni desglose de CoGS. El cliente ve el precio y qué
//    cubre; cuánto gana CTC es interno y se queda en la barra de resumen.
// Ojo con las etiquetas: el documento usa <div>, no <section>, porque globals.css
// le mete `padding: 78px 0` a toda <section> (es la retícula del sitio público) y
// el documento salía con 78px de aire entre bloques. Los <h2> mantienen la
// estructura del documento.
//
// 2. Los nombres son los MISMOS que en el formulario. En la V19 el campo se
//    llamaba «Notas de la cotización» al escribirlo y salía como «Observaciones»
//    al imprimirlo, y la «Descripción del Lote» se colaba sin encabezado: dos
//    cosas que el owner marcó el 2026-08-04 y que aquí quedan resueltas.

import { INCO_DATA, TARIFF_LABELS, type LogisticoInputs, type LogisticoResults } from "@/lib/cotizador/logistico/model";
import type { Quote } from "@/lib/cotizador/types";
import styles from "./quoteReport.module.css";

const usd2 = (v: number) => v.toFixed(2);
const int0 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "—";

export function QuoteReport({ quote, inp, res }: { quote: Quote; inp: LogisticoInputs; res: LogisticoResults }) {
  const m = inp.meta;
  const totalUsd = inp.usdCop > 0 ? res.precioVentaTotal / inp.usdCop : 0;
  const cov = res.coverage;
  const ruta = [m.originCity, m.originCountry].filter(Boolean).join(", ");
  const destino = [m.destCity, m.destCountry].filter(Boolean).join(", ");

  const incluye = [
    "Exportación en origen (repeso, SIA, ICA, documentación)",
    cov.sellerPaysFreight ? "Flete internacional hasta destino" : null,
    cov.sellerInsures ? "Seguro de transporte" : null,
    cov.sellerImportsAtDestination ? "Importación en destino, aranceles e impuestos" : null,
    cov.sellerDoesLastMile ? "Entrega en el lugar acordado (última milla)" : null,
  ].filter(Boolean) as string[];

  const noIncluye = [
    !cov.sellerPaysFreight ? "Flete internacional" : null,
    !cov.sellerInsures ? "Seguro de transporte" : null,
    !cov.sellerImportsAtDestination ? "Importación en destino, aranceles e impuestos" : null,
    !cov.sellerDoesLastMile ? "Transporte local en destino" : null,
  ].filter(Boolean) as string[];

  return (
    <article className={styles.doc}>
      <header className={styles.head}>
        <div>
          <p className={styles.brand}>Colombian Trading Company</p>
          <p className={styles.sub}>Piedecuesta, Santander, Colombia · Exportadores de café de especialidad</p>
        </div>
        <div className={styles.headRight}>
          <p className={styles.code}>{quote.code}</p>
          <p className={styles.sub}>
            Emitida: {fecha(quote.issuedAt ?? quote.createdAt)}
            {quote.validUntil ? <> · Válida hasta: {fecha(quote.validUntil)}</> : null}
          </p>
        </div>
      </header>

      <h1 className={styles.title}>{m.quoteName || quote.title}</h1>
      <p className={styles.route}>
        {ruta || "Origen por definir"} <span aria-hidden>→</span> {destino || "Destino por definir"}
        {" · "}
        <strong>{cov.effective}</strong> {INCO_DATA[cov.effective].name}
      </p>

      {quote.counterparty.name && (
        <div className={styles.block}>
          <h2>Cliente</h2>
          <p>
            {quote.counterparty.name}
            {quote.counterparty.email ? <><br />{quote.counterparty.email}</> : null}
          </p>
        </div>
      )}

      <div className={styles.block}>
        <h2>Producto</h2>
        <p className={styles.product}>
          <strong>{TARIFF_LABELS[inp.tariff]} — grado {m.qualityGrade}</strong>
          <br />
          {int0.format(res.kgFinal)} kg
        </p>
      </div>

      {/* El owner pidió que esto se identifique claramente: en la V19 el texto
          aparecía suelto, pegado al párrafo de origen, sin decir qué era. */}
      {m.lotDescription.trim() && (
        <div className={styles.block}>
          <h2>Descripción del lote</h2>
          <p>{m.lotDescription}</p>
        </div>
      )}

      <div className={styles.priceBox}>
        <div>
          <span className={styles.k}>Precio unitario</span>
          <p className={styles.big}>US$ {usd2(res.precioVentaUsdPorKg)} /kg</p>
          <p className={styles.sub}>US$ {usd2(res.precioVentaUsdPorLb)} /lb</p>
        </div>
        <div className={styles.priceTotal}>
          <span className={styles.k}>Total</span>
          <p className={styles.big}>US$ {int0.format(totalUsd)}</p>
          <p className={styles.sub}>Tasa de referencia: {int0.format(inp.usdCop)} COP/USD</p>
        </div>
      </div>

      <div className={styles.cols}>
        <div className={styles.block}>
          <h2>El precio incluye</h2>
          <ul>{incluye.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        {noIncluye.length > 0 && (
          <div className={styles.block}>
            <h2>Por cuenta del comprador</h2>
            <ul>{noIncluye.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}
      </div>

      {/* Mismo nombre que en el formulario: «Observaciones». */}
      {quote.notes?.trim() && (
        <div className={styles.block}>
          <h2>Observaciones</h2>
          <p className={styles.pre}>{quote.notes}</p>
        </div>
      )}

      {m.preparedBy.trim() && (
        <div className={styles.block}>
          <h2>Cotización preparada por</h2>
          <p>{m.preparedBy}</p>
        </div>
      )}

      <footer className={styles.foot}>
        <p>
          Café seleccionado y preparado para exportación, con certificado de origen OIC y documentación fitosanitaria ICA.
          Precio sujeto a confirmación de disponibilidad y a la tasa de cambio vigente al cierre.
        </p>
        {/* La franja de la empresa (2026-08-04): sustituye al bloque de «documento
            generado el…» que el owner tachó. Datos de contacto, no jerga legal. */}
        <div className={styles.company}>
          <span>
            <strong>Colombian Trading Company S.A.S.</strong>
            <br />
            NIT: 901.483.425-7
          </span>
          <span>
            <a href="https://ctcexport.com">ctcexport.com</a>
            <br />
            <a href="mailto:info@ctcexport.com">info@ctcexport.com</a>
          </span>
          <span>
            <a href="tel:+573152948371">+57 315 294 8371</a>
            <br />
            <a href="tel:+4917642020585">+49 176 4202 0585</a>
          </span>
        </div>
      </footer>
    </article>
  );
}
