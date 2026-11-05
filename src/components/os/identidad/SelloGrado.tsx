import Image from "next/image";
import { GRADO_POR_ID, type GradoId } from "@/lib/grados/definicion";
import s from "../os.module.css";

// ── CTCx OS · el sello de un grado (V6.19, F2) ───────────────────────────────
// El ÚNICO archivo del OS que pinta un color de grado o un sello de grado (qa-os-check D5). Los
// lee de su fuente única, `GRADO_POR_ID` en `definicion.ts` (`.colorVar`, `.logo`, `.nombre`):
// nunca escribe un hexadecimal ni una ruta de sello. El nombre va SIEMPRE escrito (el color nunca
// va solo, PLAN §7.7) y sobre el oro el texto va en tinta (4,9:1; en blanco serían 3,8:1).
// Lo usa el Almacén; la Hacienda, nunca (ningún edificio lleva color de grado).

export function SelloGrado({ id }: { id: GradoId }) {
  const g = GRADO_POR_ID[id];
  const texto = g.id === "gold" ? "var(--ink)" : "var(--card)";
  return (
    <span className={s.sello} style={{ background: `var(${g.colorVar})`, color: texto }}>
      <Image src={g.logo} alt="" width={28} height={28} className={s.selloImagen} />
      <span>{g.nombre}</span>
    </span>
  );
}
