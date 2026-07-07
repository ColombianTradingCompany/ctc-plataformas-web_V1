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
    <Modal open={open} onClose={onClose} ariaLabel="Bienvenido a Kaffetal Regal">
      <Image className={styles.mlogo} src="/images/shared/kaffetal-regal-logo.png" alt="" width={1254} height={1254} />
      <h3>Bienvenido a Kaffetal Regal</h3>
      <p>Cuenta gratuita. Registre sus fincas y sus lotes, siga su fila para la Arena y administre sus tratos con CTC.</p>
      <div className={styles.field}>
        <label htmlFor="kr-email">Correo electrónico o celular</label>
        <input id="kr-email" ref={emailRef} type="text" placeholder="maria@fincaelroble.co" autoComplete="email" />
      </div>
      <div className={styles.field}>
        <label htmlFor="kr-pass">Contraseña</label>
        <input
          id="kr-pass"
          ref={passRef}
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {error && <span className={styles.err}>Escriba su correo y contraseña para continuar.</span>}
      </div>
      <button className="btn btn-solid" style={{ width: "100%", marginTop: 8, padding: 12 }} onClick={submit}>
        Entrar a mi panel
      </button>
      <p className={styles.alt}>¿Primera vez? La misma puerta: entre con su correo y cree su cuenta gratis.</p>
    </Modal>
  );
}
