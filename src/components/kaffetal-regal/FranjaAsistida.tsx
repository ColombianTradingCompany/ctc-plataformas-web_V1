"use client";

import styles from "./FranjaAsistida.module.css";

// ── La franja «Sesión asistida» (V5.139, owner 2026-10-02) ────────────────────────────────────────────────────────────
// Solo la ve CTCx: sale cuando la sesión cargada es la que abrió el OCP con «Entrar como el productor»
// (`src/lib/asistencia/marca.ts`). Dice COMO QUIÉN se está trabajando —nombre y código de proveedor—, que es lo que
// faltó el día en que la cookie se quedó con el productor anterior: nada en la pantalla lo decía.
//
// Va fija arriba y por encima de todo (cabecera, pestañas, modales): es un aviso de modo, no un elemento de la página.
// Es angosta y va centrada para no tapar ni el logo ni las acciones de la cabecera. «Salir» cierra la sesión del
// productor en este navegador; la consola del operador sigue abierta en su pestaña.
export function FranjaAsistida({ nombre, codigo, onSalir }: { nombre: string; codigo: string; onSalir: () => void }) {
  return (
    <>
      <div className={styles.linea} aria-hidden="true" />
      <div className={styles.franja} role="status" aria-label={`Sesión asistida: está trabajando como ${nombre}`}>
        <span className={styles.texto} title={`CTCx está trabajando en nombre de ${nombre} (${codigo}). Lo que guarde queda en SU cuenta.`}>
          <b>Sesión asistida</b> · {nombre} · <span className={styles.codigo}>{codigo}</span>
        </span>
        <button type="button" className={styles.salir} onClick={onSalir} title="Cierra la sesión de este productor en este navegador">
          Salir
        </button>
      </div>
    </>
  );
}
