"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import styles from "./TallerBarra.module.css";

// ── La barra del taller (revisión V5.0 · A8, segunda pasada 2026-08-19) ─────
// Lo que el owner echó en falta al probar: «no log out button nor any head
// banner with profile buttons and settings». Esto es ese banner: la marca (que
// vuelve a la landing), quién está dentro, y la salida.
//
// ⚠️ SALIR CIERRA LA IDENTIDAD ÚNICA: la cookie es una sola para toda la red,
// así que cerrar sesión aquí la cierra también en Kaffetal Regal, Cherry
// Picked y el Directorio. No es un defecto — es la otra cara de entrar una
// sola vez — pero el botón lo dice, para que nadie se sorprenda.

export function TallerBarra({ email, compacta = false }: { email: string | null; compacta?: boolean }) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    await createClient().auth.signOut();
    router.push("/herramientas");
    router.refresh();
  }

  return (
    <header className={`${styles.barra}${compacta ? ` ${styles.compacta}` : ""}`}>
      <Link href="/herramientas" className={styles.marca}>
        <Image src="/images/shared/herramientas-logo.png" alt="" width={30} height={28} />
        <span>Herramientas del Café</span>
      </Link>
      <nav className={styles.lado}>
        <Link href="/herramientas/taller" className={styles.enlace}>
          Mis herramientas
        </Link>
        {email && (
          <span className={styles.quien} title="La cuenta con la que estás dentro">
            {email}
          </span>
        )}
        <button
          type="button"
          className={styles.salir}
          onClick={salir}
          disabled={saliendo}
          title="Cierra la sesión en toda la red CTC — es la misma cuenta en todas las plataformas"
        >
          {saliendo ? "Saliendo…" : "Salir"}
        </button>
      </nav>
    </header>
  );
}
