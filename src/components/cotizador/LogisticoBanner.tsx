"use client";

// ── Cotizador Logístico · la barra de resumen ────────────────────────────────
// El encabezado que pidió el owner (2026-08-04), calcado de la V19: identidad
// del lote y la ruta arriba, y debajo tres columnas — el Incoterm objetivo, el
// precio de venta con su margen, y el reparto del costo en dona.
//
// El MARGEN se calcula y se muestra AQUÍ, que es la vista interna. NO viaja al
// documento del cliente: ver QuoteReport, que recibe solo el precio final.

import {
  GRADE_COLORS, INCO_DATA, QUALITY_GRADES, TARIFF_LABELS,
  type LogisticoInputs, type LogisticoResults, type QualityGrade, type TariffCode,
} from "@/lib/cotizador/logistico/model";
import { InfoDot } from "./InfoDot";
import styles from "./logisticoBanner.module.css";

const usd2 = (v: number) => v.toFixed(2);
const int0 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** Dona en SVG puro: sin librería y sin dependencias de tema. */
function Donut({ slices }: { slices: { key: string; label: string; val: number; color: string }[] }) {
  const total = slices.reduce((a, s) => a + s.val, 0) || 1;
  const cx = 100, cy = 100, r = 92;

  // Los ángulos se acumulan ANTES de pintar: mutar una variable dentro del map
  // del render es justo lo que prohíbe react-hooks/immutability, y con razón.
  const visible = slices.filter((s) => s.val > 0);
  const arcs = visible.reduce<{ key: string; color: string; from: number; sweep: number }[]>((acc, s) => {
    const prev = acc[acc.length - 1];
    const from = prev ? prev.from + prev.sweep : -90;
    return [...acc, { key: s.key, color: s.color, from, sweep: (s.val / total) * 360 }];
  }, []);

  const paths = arcs.map(({ key, color, from, sweep }) => {
    // Una sola tajada no se puede dibujar con un arco: es el círculo entero.
    if (sweep >= 359.99) return <circle key={key} cx={cx} cy={cy} r={r} fill={color} />;
    const a0 = (from * Math.PI) / 180;
    const a1 = ((from + sweep) * Math.PI) / 180;
    const [x0, y0] = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    const [x1, y1] = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const large = sweep > 180 ? 1 : 0;
    return <path key={key} d={`M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`} fill={color} />;
  });
  return (
    <svg viewBox="0 0 200 200" className={styles.donut} role="img" aria-label="Reparto del costo">
      {paths}
      <circle cx={cx} cy={cy} r={r * 0.52} fill="var(--card, #fff)" />
    </svg>
  );
}

export function LogisticoBanner({
  inp, res, locked, onMeta, onMargen, onTariff, onFormato,
}: {
  inp: LogisticoInputs;
  res: LogisticoResults;
  locked: boolean;
  onMeta: (patch: Partial<LogisticoInputs["meta"]>) => void;
  onMargen: (v: number) => void;
  /** La partida arancelaria NO es metadato: cambia el cálculo (verde vs tostado). */
  onTariff: (t: TariffCode) => void;
  /** Comprar pergamino o verde hecho: cambia qué bloques existen. */
  onFormato: (f: LogisticoInputs["purchaseFormat"]) => void;
}) {
  const m = inp.meta;
  const totalLoteUsd = inp.usdCop > 0 ? res.precioVentaTotal / inp.usdCop : 0;
  // El margen entra en la dona como una tajada más, para que el owner vea de un
  // vistazo cuánto del precio es margen y cuánto es costo.
  const slices = [...res.phases, { key: "margen", label: "Margen de ganancia", val: res.margen, color: "#c9920a" }];
  const total = slices.reduce((a, s) => a + s.val, 0) || 1;

  return (
    <div className={styles.banner}>
      {/* ── Identidad del lote y la ruta ── */}
      <div className={styles.head}>
        <label className={styles.f} style={{ minWidth: 150 }}>
          <span className={styles.k}>Nombre de la cotización</span>
          <input className={styles.strong} value={m.quoteName} disabled={locked} onChange={(e) => onMeta({ quoteName: e.target.value })} />
        </label>
        <label className={styles.f}>
          <span className={styles.k}>País origen</span>
          <input value={m.originCountry} disabled={locked} onChange={(e) => onMeta({ originCountry: e.target.value })} />
        </label>
        <label className={styles.f} style={{ minWidth: 150 }}>
          <span className={styles.k}>Ciudad / lugar origen</span>
          <input value={m.originCity} disabled={locked} placeholder="Bucaramanga" onChange={(e) => onMeta({ originCity: e.target.value })} />
        </label>
        <span className={styles.arrow} aria-hidden>→</span>
        <label className={styles.f}>
          <span className={styles.k}>País destino</span>
          <input value={m.destCountry} disabled={locked} placeholder="Estados Unidos" onChange={(e) => onMeta({ destCountry: e.target.value })} />
        </label>
        <label className={styles.f}>
          <span className={styles.k}>Ciudad destino</span>
          <input value={m.destCity} disabled={locked} placeholder="New York" onChange={(e) => onMeta({ destCity: e.target.value })} />
        </label>
        <label className={styles.f}>
          <span className={styles.k}>
            Grado de calidad
            <InfoDot label="el grado de calidad" text="El grado de la Arena con el que sale el lote. «Mix» es para un lote que combina grados." />
          </span>
          <select
            value={m.qualityGrade} disabled={locked}
            style={{ color: GRADE_COLORS[m.qualityGrade], fontWeight: 600 }}
            onChange={(e) => onMeta({ qualityGrade: e.target.value as QualityGrade })}
          >
            {QUALITY_GRADES.map((g) => (
              <option key={g} value={g} style={{ color: GRADE_COLORS[g] }}>⬤ {g}</option>
            ))}
          </select>
        </label>
        <label className={styles.f} style={{ minWidth: 170 }}>
          <span className={styles.k}>Código arancelario</span>
          <select value={inp.tariff} disabled={locked} onChange={(e) => onTariff(e.target.value as TariffCode)}>
            {(Object.keys(TARIFF_LABELS) as TariffCode[]).map((c) => <option key={c} value={c}>{TARIFF_LABELS[c]}</option>)}
          </select>
        </label>
        <label className={styles.f}>
          <span className={styles.k}>
            Formato de compra
            <InfoDot label="el formato de compra" text="Si CTC compra pergamino y recorre la cadena, o si compra el café verde ya hecho." />
          </span>
          <select value={inp.purchaseFormat} disabled={locked} onChange={(e) => onFormato(e.target.value as LogisticoInputs["purchaseFormat"])}>
            <option value="pergamino">Pergamino</option>
            <option value="verde">Verde</option>
          </select>
        </label>
      </div>

      {/* ── Resumen ── */}
      <div className={styles.body}>
        <div className={styles.inco}>
          <span className={styles.k}>Incoterm objetivo</span>
          <div className={styles.incoRow}>
            <span className={styles.incoCode}>{res.coverage.effective}{inp.transportMode === "courrier" ? "*" : ""}</span>
            <span>
              <strong>{INCO_DATA[res.coverage.effective].name}</strong>
              <small>{INCO_DATA[res.coverage.effective].point}</small>
            </span>
          </div>
          {inp.transportMode === "courrier" && (
            <p className={styles.note}>Modalidad courier seleccionada — entrega puerta a puerta y gestiona aranceles por defecto, así que equivale a DDP.</p>
          )}
        </div>

        <div className={styles.price}>
          <span className={styles.k}>Precio de venta sugerido</span>
          <p className={styles.big}>
            US$ {usd2(res.precioVentaUsdPorKg)}/kg · <span>US$ {usd2(res.precioVentaUsdPorLb)}/lb</span>
          </p>
          <p className={styles.sub}>
            CoGS US$ {usd2(res.cogsUsdPorKg)}/kg + {int0.format(inp.margenPct)}% margen
          </p>
          <div className={styles.totalRow}>
            <span>
              <strong>US$ {int0.format(totalLoteUsd)}</strong>
              <small>Total lote</small>
            </span>
            <span className={styles.margen}>
              <span className={styles.k}>
                Margen de ganancia
                <InfoDot label="el margen" text="Se suma al CoGS para dar el precio de venta. Es información interna: NO aparece en el documento que se le manda al cliente." />
              </span>
              <span className={styles.stepper}>
                <button type="button" disabled={locked} onClick={() => onMargen(Math.max(0, inp.margenPct - 1))} aria-label="Bajar margen">−</button>
                <input type="number" step="any" value={inp.margenPct} disabled={locked} onChange={(e) => onMargen(Number(e.target.value))} />
                <span>%</span>
                <button type="button" disabled={locked} onClick={() => onMargen(inp.margenPct + 1)} aria-label="Subir margen">+</button>
              </span>
            </span>
          </div>
        </div>

        <div className={styles.chart}>
          <Donut slices={slices} />
          <ul className={styles.legend}>
            {slices.map((s) => (
              <li key={s.key}>
                <span className={styles.swatch} style={{ background: s.color }} />
                <span className={styles.legendLabel}>{s.label}</span>
                <strong>{Math.round((s.val / total) * 100)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
