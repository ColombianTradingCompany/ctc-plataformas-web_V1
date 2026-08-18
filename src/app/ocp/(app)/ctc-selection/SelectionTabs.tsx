"use client";

// Pestañas de «CTC Selection» (paso (iii)-1 del plan V5, V4.27).
//
// CTC Selection es el PARAGUAS: todo lote que CTC compra en firme para venderlo
// como productor. Black Stock dejó de ser un módulo suelto del rail y es su
// rama de grado Black — la histórica, la clase de volumen. «Selección» es la
// otra rama: Red, Blue y Gold comprados en firme.
//
// La partición no es cosmética, y por eso son dos pestañas y no un filtro: las
// dos ramas se PUBLICAN distinto. Black va a la pestaña Black de Cherry Picked
// Green, que es una superficie de volumen; los demás grados van al catálogo
// normal, y ahí aparece la pregunta que esta tanda deja abierta a propósito
// (quién figura como productor de un lote que CTC compró en firme). Mezclarlas
// en una sola lista escondería esa diferencia justo donde importa.

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/ocp/ctc-selection", label: "Black Stock", exact: true },
  { href: "/ocp/ctc-selection/seleccion", label: "Selección" },
];

export function SelectionTabs() {
  const pathname = usePathname();
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--line)" }}>
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "9px 15px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 13.5,
              color: active ? "var(--ink)" : "var(--muted)",
              borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
