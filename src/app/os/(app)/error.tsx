"use client";

// ── CTCx OS · cuando una pantalla falla (V6.19, F2) ────────────────────────────────────────────────────────────────────────────────
// El mismo límite que el del OCP (`src/app/ocp/(app)/error.tsx`): envuelve las páginas de la OS —no su layout—, así que el rail y la
// cabecera siguen en pie si Inicio no puede leer. Cada módulo (`m/*`) trae además el suyo, para que un módulo caído no tumbe Inicio.

import { useEffect } from "react";
import Link from "next/link";
import styles from "@/components/panel/shared.module.css";

export default function OsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("CTCx OS · una pantalla falló", error);
  }, [error]);
  return (
    <div role="alert" className={styles.card} style={{ display: "block", maxWidth: 720 }}>
      <h1 className={styles.title} style={{ fontSize: 22 }}>Esta pantalla no se pudo abrir</h1>
      <p className={styles.meta} style={{ fontSize: 14 }}>
        Algo falló al leer o pintar esta pantalla de la CTCx OS. Las demás consolas no dependen de ella: puede reintentar, o seguir por el
        rail.
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
        <Link href="/panel" className="btn btn-sm">
          Volver al selector de consolas
        </Link>
      </div>
    </div>
  );
}
