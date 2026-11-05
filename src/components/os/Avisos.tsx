import { FUENTES, type CodigoDeLectura } from "@/lib/os/fuentes";
import type { Aviso } from "@/lib/os/tablero";
import { IconoAlerta } from "./IconoAlerta";
import s from "./os.module.css";

// ── CTCx OS · la deuda de datos, dicha (V6.19, F2) ───────────────────────────
// Cada lectura que falló deja sus cifras en «Sin datos» y un aviso aquí, con las piezas que
// apagó y de dónde salen. El OS nunca rellena un hueco con un cero.

const QUE_FALLO: Record<CodigoDeLectura, string> = {
  lectura_tareas: "No se pudieron leer las tareas de la casa.",
  lectura_tratos: "No se pudieron leer los contratos y sus despachos.",
  lectura_stock: "No se pudo leer el circuito del stock.",
  lectura_pvc: "No se pudo leer el estado del Modelo Económico.",
  lectura_salud: "No se pudo leer la salud del sistema.",
  lectura_hechos: "No se pudieron leer los hechos del turno.",
  lectura_lotes: "No se pudieron leer los lotes.",
  lectura_fallida: "No se pudo abrir la lectura de la plataforma.",
};

export function Avisos({ avisos }: { avisos: readonly Aviso[] }) {
  if (!avisos.length) return null;
  return (
    <section className={s.avisos} aria-labelledby="os-avisos">
      <h2 id="os-avisos" className={s.seccionTitulo}>
        Lecturas que fallaron
      </h2>
      <ul className={s.avisosLista}>
        {avisos.map((a) => (
          <li key={a.error + a.fuentes.join()} className={s.aviso}>
            <span className={`${s.badge} ${s.badgeMal}`}>
              <IconoAlerta />
              Aviso
            </span>
            <span>
              {QUE_FALLO[a.error]} Quedan en «Sin datos»: {a.fuentes.map((p) => FUENTES[p].etiqueta).join(", ")}.
              <span className={s.fuente}>Plataforma › {[...new Set(a.fuentes.map((p) => FUENTES[p].fuente))].join(" · ")}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
