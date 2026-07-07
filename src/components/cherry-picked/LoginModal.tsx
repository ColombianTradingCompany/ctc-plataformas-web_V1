"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/Modal";
import styles from "./LoginModal.module.css";

export function LoginModal({
  open,
  onClose,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string) => void;
}) {
  const [error, setError] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  function submit() {
    const email = emailRef.current?.value.trim() ?? "";
    const pass = passRef.current?.value ?? "";
    if (!email || !pass) {
      setError(true);
      return;
    }
    setError(false);
    onLogin(email);
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Iniciar sesión en Cherry Picked">
      <Image className={styles.mlogo} src="/images/shared/cherry-picked-logo.png" alt="" width={852} height={858} />
      <h3>Iniciar sesión</h3>
      <p>Tus pedidos, puntos, muestras y fracciones reservadas, en un solo lugar.</p>
      <div className={styles.field}>
        <label htmlFor="cp-email">Correo electrónico</label>
        <input id="cp-email" ref={emailRef} type="email" placeholder="tueste@tutostaduria.eu" autoComplete="email" />
      </div>
      <div className={styles.field}>
        <label htmlFor="cp-pass">Contraseña</label>
        <input
          id="cp-pass"
          ref={passRef}
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {error && <span className={styles.err}>Escribe tu correo y contraseña para continuar.</span>}
      </div>
      <button className="btn btn-solid" style={{ width: "100%", marginTop: 8, padding: 12 }} onClick={submit}>
        Entrar
      </button>
      <p className={styles.alt}>¿Aún no tienes cuenta? Crea una gratis con cualquier correo y contraseña (demo).</p>
    </Modal>
  );
}
