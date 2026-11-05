import { GRADOS } from "@/lib/grados/definicion";
import { FUENTES, type Medida } from "@/lib/os/fuentes";
import { etiquetaDeClave, ordenDeClave, type Tablero } from "@/lib/os/tablero";
import { Cifra } from "../Cifra";
import { SelloGrado } from "../identidad/SelloGrado";
import { Encabezado } from "./Encabezado";
import s from "../os.module.css";

// ── CTCx OS · el Almacén (V6.19, F2) ─────────────────────────────────────────
// El café de la casa en tres tiras, todas de la plataforma y todas con su fuente:
//   · la franja del circuito del stock en kilos (la MISMA que pintan Adquisición, Stock y Triage);
//   · los lotes por etapa, en el orden de su pasaporte (una etapa vacía se ve punteada: es un dato);
//   · los despachos y los contratos.
// Sin dinero y sin nombres de lote en F2: solo conteos y kilos. Los sellos de grado salen de su
// fuente única (`SelloGrado`); los lotes POR grado llegan con el pasaporte del lote, en una fase posterior.

const nombreDe = (m: Medida) => (m.clave ? etiquetaDeClave(m.pieza, m.clave) : FUENTES[m.pieza].etiqueta);

function Tarjetas({ medidas }: { medidas: readonly Medida[] }) {
  return (
    <div className={s.kpis}>
      {medidas.map((m, i) => (
        <div key={`${m.pieza}-${m.clave ?? i}`} className={s.kpi}>
          <span className={s.kpiK}>{nombreDe(m)}</span>
          <Cifra medida={m} grande abrir />
        </div>
      ))}
    </div>
  );
}

export function Almacen({ tablero: t }: { tablero: Tablero }) {
  const { franja, lotesPorEtapa, despachos } = t.almacen;
  const lotes = [...lotesPorEtapa].sort((a, b) => ordenDeClave(a.pieza, a.clave) - ordenDeClave(b.pieza, b.clave));
  const despachosYVentanas = despachos.filter((m) => m.pieza !== "contratos_por_estado");
  const contratos = [...despachos.filter((m) => m.pieza === "contratos_por_estado")].sort(
    (a, b) => ordenDeClave(a.pieza, a.clave) - ordenDeClave(b.pieza, b.clave)
  );
  return (
    <div className={s.vista}>
      <Encabezado
        eyebrow="Módulo · Almacén"
        titulo="El Almacén"
        texto="El café de la casa por dónde va: en kilos, por etapa del lote y por despacho. Solo conteos y kilos; ni dinero ni nombres de lote."
      />

      <section className={s.seccion} aria-labelledby="os-franja">
        <h2 id="os-franja" className={s.seccionTitulo}>
          La franja del stock
        </h2>
        <p className={s.seccionNota}>Las mismas sumas que la franja de Adquisición, Stock y Triage (kilos; lo declarado y lo vendido, en verde).</p>
        <Tarjetas medidas={franja} />
      </section>

      <section className={s.seccion} aria-labelledby="os-lotes">
        <h2 id="os-lotes" className={s.seccionTitulo}>
          Lotes por etapa
        </h2>
        <p className={s.seccionNota}>En el orden del pasaporte del lote. Una etapa punteada no tiene lotes hoy.</p>
        <ol className={s.tira}>
          {lotes.map((m, i) => (
            <li key={`${m.clave ?? "todas"}-${i}`} className={`${s.paso}${m.valor === 0 ? ` ${s.pasoVacio}` : ""}`}>
              <span className={s.pasoNombre}>{nombreDe(m)}</span>
              <Cifra medida={m} />
            </li>
          ))}
        </ol>
      </section>

      <section className={s.seccion} aria-labelledby="os-despachos">
        <h2 id="os-despachos" className={s.seccionTitulo}>
          Despachos
        </h2>
        <p className={s.seccionNota}>Los despachos de los contratos activos (kilos en café pergamino seco) y los contratos con ventana vigente.</p>
        <Tarjetas medidas={despachosYVentanas} />
      </section>

      <section className={s.seccion} aria-labelledby="os-contratos">
        <h2 id="os-contratos" className={s.seccionTitulo}>
          Contratos por estado
        </h2>
        <Tarjetas medidas={contratos} />
      </section>

      <section className={s.seccion} aria-labelledby="os-grados">
        <h2 id="os-grados" className={s.seccionTitulo}>
          Los grados de la casa
        </h2>
        <p className={s.seccionNota}>Los cinco sellos, de su fuente única. Los lotes por grado llegan con el pasaporte del lote, en una fase posterior.</p>
        <ul className={s.sellos}>
          {GRADOS.map((g) => (
            <li key={g.id}>
              <SelloGrado id={g.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
