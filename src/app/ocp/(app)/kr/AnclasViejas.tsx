"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// ── Las anclas viejas (`#lot-…`, `#finca-…`, `#prod-…`) → el parámetro nuevo (V5.61) ──
// Hasta la V5.60 un enlace profundo era un ANCLA: la ruta del módulo Lotes más `#lot-<id>` desplazaba el tablero hasta la
// tarjeta y le abría el modal. Los tres tableros se fundieron en esta página y el detalle va por
// parámetro (`?lote=`), pero un ancla NO VIAJA en un 308 —el navegador la conserva, el servidor ni la
// ve—: un marcador viejo llega aquí como `/ocp/kr#lot-<id>`. Esto la traduce, una vez, al montar.
const PREFIJOS: [string, string][] = [
  ["#lot-", "lote"],
  ["#finca-", "finca"],
  ["#prod-", "productor"],
];

export function AnclasViejas() {
  const router = useRouter();
  useEffect(() => {
    const traducir = () => {
      const hash = window.location.hash;
      for (const [prefijo, parametro] of PREFIJOS) {
        if (hash.startsWith(prefijo) && hash.length > prefijo.length) {
          router.replace(`/ocp/kr?${parametro}=${encodeURIComponent(hash.slice(prefijo.length))}`);
          return;
        }
      }
    };
    traducir();
    window.addEventListener("hashchange", traducir);
    return () => window.removeEventListener("hashchange", traducir);
  }, [router]);
  return null;
}
