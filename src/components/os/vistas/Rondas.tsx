import Link from "next/link";
import { RONDAS } from "@/lib/os/rondas/definiciones";
import { textosDelOs } from "@/lib/os/textos/idioma";
import { Encabezado } from "./Encabezado";
import s from "../os.module.css";
import r from "../rondas/rondas.module.css";

// ── CTCx OS · el módulo Rondas · la lista (2026-11-07) ───────────────────────
// Las rondas que existen, una por DEFINICIÓN (`src/lib/os/rondas/definiciones.ts`), cada una con su «Abrir». No lee la base: los
// Personajes y la bitácora se leen al abrir una ronda. `base` es la ruta de los módulos (la de la OS o la de la demostración).
const cx = (...c: string[]) => c.join(" ");

export function Rondas({ base }: { base: string }) {
  const x = textosDelOs().rondas;
  return (
    <div className={s.vista}>
      <Encabezado eyebrow={x.eyebrow} titulo={x.titulo} texto={x.texto} />
      <ul className={r.rondas}>
        {RONDAS.map((d) => (
          <li key={d.slug} className={r.ronda}>
            <h2 className={r.rondaTitulo}>{d.titulo}</h2>
            <p className={s.texto}>{d.proposito}</p>
            <p className={r.meta}>
              <strong>{x.quien}:</strong> {d.quien.descripcion}
            </p>
            <div className={s.acciones}>
              <Link href={`${base}/rondas/${d.slug}`} className={cx("btn", "btn-solid", r.guardar)}>
                {x.abrir}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
