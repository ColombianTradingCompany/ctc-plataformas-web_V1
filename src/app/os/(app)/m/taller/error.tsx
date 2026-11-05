"use client";

// CTCx OS · módulo «Taller» · su límite de error (V6.19, F2). Un fallo aquí se queda en el módulo: Inicio, los
// otros módulos y el rail siguen en pie (el límite de `(app)/error.tsx` cubre Inicio).

import { useEffect } from "react";
import Link from "next/link";
import styles from "@/components/panel/shared.module.css";

export default function TallerError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("CTCx OS · el módulo «Taller» falló", error);
  }, [error]);
  return (
    <div role="alert" className={styles.card} style={{ display: "block", maxWidth: 720 }}>
      <h1 className={styles.title} style={{ fontSize: 22 }}>Este módulo no pudo cargar</h1>
      <p className={styles.meta} style={{ fontSize: 14 }}>
        Algo falló al leer o pintar «Taller». El resto de la CTCx OS sigue funcionando: puede reintentar, o volver a Inicio.
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
        <Link href="/os" className="btn btn-sm">
          Volver a Inicio
        </Link>
      </div>
    </div>
  );
}
