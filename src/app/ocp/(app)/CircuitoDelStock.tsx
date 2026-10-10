import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { cargarCircuitoDelStock } from "@/lib/stock/circuito";
import { pasosDeLaFranja, type DatosDeLaFranja, type PantallaDelCircuito } from "@/lib/stock/franja";
import type { StockCargado } from "@/lib/stock/servidor";
import s from "./circuito.module.css";

// ── La franja del circuito del stock (V5.203, owner 2026-10-10) ─────────────────────────────────────────────────────────────────
// «CTCx Compras no parece estar funcionando bien; revísalo y mejora el UI/UX […] también en relación a su interacción con el Triage de
// Catálogo Activo y la Oferta de CTCx Selection». Adquisición, Stock CTCx, Triage, CTCx Selection y Catálogo Activo eran cinco tableros
// que no se hablaban; esta franja (componente de SERVIDOR) los pone en una sola línea con los mismos números (`lib/stock/circuito.ts`).
// Si la lectura falla, no se pinta: la franja informa, cada tablero manda.
export async function CircuitoDelStock({ actual, stock }: { actual: PantallaDelCircuito; stock?: StockCargado }) {
  let datos: DatosDeLaFranja | null = null;
  try {
    datos = await cargarCircuitoDelStock(createServiceRoleClient(), stock);
  } catch (e) {
    console.error("CircuitoDelStock: no se pudo leer el circuito", e);
  }
  if (!datos) return null;
  const pasos = pasosDeLaFranja(datos, actual);
  return (
    <nav className={s.franja} aria-label="El circuito del stock: de la compra al Catálogo Activo">
      {pasos.map((p) => (
        <Link key={p.clave} href={p.href} className={`${s.paso} ${p.actual ? s.actual : ""}`} aria-current={p.actual ? "step" : undefined} title={p.pendiente ? "Hay trabajo pendiente en este paso" : undefined}>
          <span className={s.titulo}>
            {p.titulo}
            {p.pendiente && <span className={s.punto} aria-label="pendiente" />}
          </span>
          <span className={s.valor}>{p.valor}</span>
          <span className={s.sub}>{p.sub}</span>
        </Link>
      ))}
    </nav>
  );
}
