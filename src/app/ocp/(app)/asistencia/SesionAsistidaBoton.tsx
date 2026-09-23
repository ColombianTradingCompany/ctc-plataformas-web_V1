"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { abrirSesionAsistida, cerrarSesionAsistida } from "@/lib/asistencia/actions";
import styles from "@/components/panel/shared.module.css";

// «Entrar como el productor» (V5.75): pide la sesión asistida y abre Kaffetal Regal en otra pestaña.
// Si el navegador bloquea la pestaña nueva, deja el enlace a mano.
export function SesionAsistidaBoton({ producerId, nombre, compacto }: { producerId: string; nombre?: string; compacto?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        className={compacto ? "btn btn-sm" : "btn btn-sm btn-solid"}
        disabled={pending}
        onClick={() => {
          setError(null);
          setUrl(null);
          start(async () => {
            const r = await abrirSesionAsistida(producerId);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            setUrl(r.url);
            window.open(r.url, "_blank", "noopener");
            router.refresh();
          });
        }}
        title={`Abre Kaffetal Regal como ${nombre ?? "este productor"} en otra pestaña, con registro`}
      >
        {pending ? "Abriendo…" : "Entrar como el productor ↗"}
      </button>
      {url && (
        <span className={styles.meta} style={{ margin: 0 }}>
          Sesión abierta.{" "}
          <a href={url} target="_blank" rel="noopener noreferrer">
            Si la pestaña no se abrió, ábrala aquí ↗
          </a>
        </span>
      )}
      {error && (
        <span className={styles.warn} style={{ margin: 0 }}>
          {error}
        </span>
      )}
    </span>
  );
}

export function CerrarSesionAsistidaBoton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        className="btn btn-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await cerrarSesionAsistida();
            setMsg(r.ok ? "La sesión del productor se cerró en este navegador." : r.error);
            router.refresh();
          })
        }
      >
        {pending ? "Cerrando…" : "Cerrar sesión asistida"}
      </button>
      {msg && <span className={styles.meta} style={{ margin: 0 }}>{msg}</span>}
    </span>
  );
}
