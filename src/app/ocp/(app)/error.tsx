"use client";

// ── OCP · cuando un tablero falla (V5.203, owner 2026-10-10) ────────────────────────────────────────────────────────────────────
// El 2026-10-10 «Adquisición de Stock Café» se cayó cada vez que se abría (`a.stock_partidas.find is not a function`, bug B1) y, sin
// este archivo, la consola ENTERA quedaba en la página de error genérica. Este límite envuelve las páginas del OCP —no su layout—, así
// que el rail y la cabecera siguen en pie: el tablero dice que falló, da el código (`digest`) para buscarlo en los registros de Vercel
// y deja reintentar (`retry` — Next 16.3: vuelve a pedir y a pintar el segmento) o volver al inicio del OCP.

import { useEffect } from "react";
import Link from "next/link";
import styles from "@/components/panel/shared.module.css";

export default function OcpError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("OCP · un tablero falló", error);
  }, [error]);
  return (
    <div role="alert" className={styles.card} style={{ display: "block", maxWidth: 720 }}>
      <h1 className={styles.title} style={{ fontSize: 22 }}>Este tablero no se pudo abrir</h1>
      <p className={styles.meta} style={{ fontSize: 14 }}>
        Algo falló al leer o pintar esta pantalla. El resto de la consola sigue funcionando: puede reintentar, o seguir por el rail.
        {error.digest && (
          <>
            {" "}Si vuelve a pasar, pase este código a quien mantiene la plataforma: <code>{error.digest}</code>.
          </>
        )}
      </p>
      <div className={styles.actions} style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-sm btn-solid" onClick={() => retry()}>
          Reintentar
        </button>
        <Link href="/ocp" className="btn btn-sm">
          Volver al inicio del OCP
        </Link>
      </div>
    </div>
  );
}
