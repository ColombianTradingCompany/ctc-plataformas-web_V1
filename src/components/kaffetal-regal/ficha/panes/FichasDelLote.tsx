import { useState } from "react";
import { FICHA_SOURCE_LABEL, type LotFicha } from "@/lib/fichas/tipos";
import { FichaDatos } from "@/components/fichas/FichaDatos";
import styles from "./FichasDelLote.module.css";

// ── FichasDelLote: el set de Fichas Técnicas, visto por el productor ────────
// Cierra el círculo del rediseño B2/B3 (V5.20→V5.23): el productor adjuntó
// sus soportes, CTCx los escaneó y compiló las Fichas — y aquí, en los mismos
// panes B2 y B3 donde nació el reporte, el set se lista (owner: «aquí mismo
// se listarán esas Fichas al existir»). Solo lectura; la oficial va primero
// con su estrella. `mostrar` filtra al idioma del pane: sensorial en B2,
// físico en B3.

export function FichasDelLote({ fichas, mostrar }: { fichas: LotFicha[]; mostrar: "sensorial" | "fisico" }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  if (!fichas.length) return null;

  return (
    <div className={styles.wrap}>
      <p className={styles.head}>
        Fichas Técnicas del lote <span className={styles.count}>({fichas.length})</span>
      </p>
      <p className={styles.sub}>
        Los documentos que CTC compiló de sus soportes y su reporte. La marcada con ★ es <b>la ficha oficial</b> del
        lote.
      </p>
      <div className={styles.list}>
        {fichas.map((f) => {
          const open = abierta === f.id;
          return (
            <div key={f.id} className={f.isOfficial ? `${styles.card} ${styles.oficial}` : styles.card}>
              <button type="button" className={styles.row} onClick={() => setAbierta(open ? null : f.id)}>
                <span className={styles.titulo}>
                  {f.isOfficial && <span className={styles.star}>★</span>}
                  {f.title}
                </span>
                <span className={styles.meta}>
                  {FICHA_SOURCE_LABEL[f.source]} · {new Date(f.createdAt).toLocaleDateString("es-CO")} {open ? "▴" : "▾"}
                </span>
              </button>
              {open && (
                <div className={styles.datos}>
                  <FichaDatos data={f.data} mostrar={mostrar} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
