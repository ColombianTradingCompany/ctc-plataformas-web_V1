// ── Las palabras del trato (V5.188) ─────────────────────────────────────────────────────────────────────────────────────────
// Feedback de revisión de «Contratos y Compras»: «PVC, CPS, "Grado Red" y Cherry Picked no están definidos». Un desplegable
// nativo (<details>, sin JavaScript y legible en el celular, donde los tooltips no existen) en cada oferta, antes de la
// calculadora y de la firma. Las cifras salen de la casa: los multiplicadores son los del modelo del PVC (`PARAMS_V211.mult`,
// motor.ts) y `qa-ciclos` exige que coincidan; el retiro, el saco, los baches y el 60/40, de `terminos.ts` y `ventanas.ts`.

import { BACHES_DE_DESPACHO, CARGA_KG, PAGO_AL_DESPACHO_PCT, PENALIDAD_RETIRO_PCT, SACO_INICIAL_KG } from "@/lib/trato/terminos";
import { RETIRO_LIBRE_CICLO_PCT, RETIRO_LIBRE_EXTENDIDA_PCT } from "@/lib/trato/ventanas";

/** Los multiplicadores del grado (los del modelo del PVC, motor.ts · PARAMS_V211.mult). */
export const MULTIPLICADOR_DEL_GRADO = { Black: 1.15, Red: 1.3, Blue: 1.6, Gold: 2.0 } as const;

const coma = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function GlosarioDelTrato({ grado }: { grado?: string | null }) {
  const g = grado && grado in MULTIPLICADOR_DEL_GRADO ? (grado as keyof typeof MULTIPLICADOR_DEL_GRADO) : null;
  const palabras: [string, React.ReactNode][] = [
    [
      "PVC",
      <>
        <b>Ponderación de Valor de Cosecha</b>: el precio de referencia de CTCx por carga, en pesos, público e igual para todos los productores. Se
        publica cada trimestre y toma el mayor de tres valores: el costo de producir (con margen), lo que paga la cooperativa (con una prima) y el
        mercado.
      </>,
    ],
    ["CPS", <>Café pergamino seco: el café como sale de su finca, seco y con su pergamino.</>],
    ["Carga", <>{CARGA_KG} kg de CPS. Los precios se dicen por carga y por kilo.</>],
    [
      "Grado",
      <>
        La calidad de su lote según la evaluación (el Punto de la taza y la Tríada): Black, Red, Blue, Gold o Tyrian. El grado multiplica el PVC: Black ×{" "}
        {coma(MULTIPLICADOR_DEL_GRADO.Black)} · Red × {coma(MULTIPLICADOR_DEL_GRADO.Red)} · Blue × {coma(MULTIPLICADOR_DEL_GRADO.Blue)} · Gold ×{" "}
        {coma(MULTIPLICADOR_DEL_GRADO.Gold)}; Tyrian va a subasta.
        {g && (
          <>
            {" "}
            Su lote es <b>{g}</b>: su precio es el PVC × {coma(MULTIPLICADOR_DEL_GRADO[g])}, más el Flete a CTCx.
          </>
        )}
      </>,
    ],
    [
      "Cherry Picked",
      <>
        La vitrina de CTCx donde su café se ofrece a compradores <b>con su nombre y su finca</b>. Se vende mientras el café sigue en su finca; cada semana
        CTCx le confirma lo vendido.
      </>,
    ],
    ["CTCx Selection", <>Las compras directas de CTCx: una compra en firme de una cantidad acordada, a hasta el PVC − 8 %, que se negocia.</>],
    ["Ventana", <>El tiempo que su café está a la venta en Cherry Picked. La fija la fecha en que usted firma, y el precio no cambia mientras dura.</>],
    [
      "Saco",
      <>
        El café que CTCx le compra con la firma ({SACO_INICIAL_KG.min}–{SACO_INICIAL_KG.max} kg, aparte de lo que declara). <b>Es lo único seguro desde
        el primer día</b>; lo demás depende de lo que se venda.
      </>,
    ],
    [
      "Retiro libre",
      <>
        Lo que puede sacar de lo declarado sin costo ({RETIRO_LIBRE_CICLO_PCT} % o {RETIRO_LIBRE_EXTENDIDA_PCT} % según su ventana), solo de lo que no
        se ha vendido. Por encima paga el {PENALIDAD_RETIRO_PCT} % del precio de cada carga.
      </>,
    ],
    [
      "Bache",
      <>
        Un envío que junta lo vendido de una o varias semanas: se recomienda cada {BACHES_DE_DESPACHO.recomendadas.join(" o ")} semanas, nunca más de{" "}
        {BACHES_DE_DESPACHO.maxSemanas}.
      </>,
    ],
    ["Flete a CTCx", <>Un valor por carga que CTCx le suma al precio según su región, para ayudarle con el envío por Servientrega.</>],
    [
      `${PAGO_AL_DESPACHO_PCT}/${100 - PAGO_AL_DESPACHO_PCT}`,
      <>
        CTCx paga el {PAGO_AL_DESPACHO_PCT} % de cada envío con el tiquete de despacho y el {100 - PAGO_AL_DESPACHO_PCT} % al recibirlo, si la humedad
        y la actividad de agua están en rango.
      </>,
    ],
  ];
  return (
    <details style={{ marginTop: 8, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", background: "var(--card)" }}>
      <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--green)" }}>
        ¿Qué significan PVC, CPS, carga, grado, Cherry Picked…? Las palabras de este trato
      </summary>
      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "5px 10px", margin: "8px 0 2px", fontSize: 12.5, lineHeight: 1.45 }}>
        {palabras.map(([palabra, def]) => (
          <div key={palabra} style={{ display: "contents" }}>
            <dt style={{ fontWeight: 700 }}>{palabra}</dt>
            <dd style={{ margin: 0 }}>{def}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
