"use client";

import Image from "next/image";
import { useState } from "react";
import { LegalFooter } from "@/components/LegalFooter";
import type { Plataforma } from "./data";

// Ingreso de la maqueta: acepta cualquier credencial. En la versión real esta
// pantalla desaparece — el directorio entra con la MISMA cuenta de Kaffetal
// Regal o Cherry Picked (Supabase Auth), que es justo lo que promete el paso
// 02 de la landing.
export function Login({
  mail: mailInicial,
  plataforma,
  onPlataforma,
  onEntrar,
  onInscribirme,
  onVolver,
}: {
  mail: string;
  plataforma: Plataforma;
  onPlataforma: (p: Plataforma) => void;
  onEntrar: (mail: string) => void;
  onInscribirme: () => void;
  onVolver: () => void;
}) {
  const [mail, setMail] = useState(mailInicial);
  const [pass, setPass] = useState("demo1234");

  // "Ambas" no tiene botón propio: el segmento marca Kaffetal Regal.
  const marcado = plataforma === "Ambas" ? "Kaffetal Regal" : plataforma;

  return (
    <>
      <div className="pantalla-login">
        <div className="login">
          <div className="cinta login__cinta" />
          <div className="login__cuerpo">
            <div className="login__marca">
              <Image src="/images/shared/ctc-logo-parrot.jpg" alt="" width={1484} height={1662} />
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Directorio del café · Santander</p>
                <h3 style={{ lineHeight: 1 }}>Entrar al directorio</h3>
              </div>
            </div>

            <div className="campo"><label>Entra con tu cuenta de</label></div>
            <div className="segmento" role="group" aria-label="Plataforma">
              {(["Kaffetal Regal", "Cherry Picked"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={marcado === p}
                  onClick={() => onPlataforma(p)}
                >
                  <b>{p}</b>
                  <span>{p === "Kaffetal Regal" ? "Origen · Colombia" : "Tueste · Europa"}</span>
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onEntrar(mail);
              }}
            >
              <div className="campo">
                <label htmlFor="l-mail">Correo electrónico</label>
                <input id="l-mail" type="email" required value={mail}
                  onChange={(e) => setMail(e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor="l-pass">Contraseña</label>
                <input id="l-pass" type="password" required value={pass}
                  onChange={(e) => setPass(e.target.value)} />
              </div>
              <p className="pista">
                Demo · cualquier correo y contraseña sirven.<br />
                Precargado: <b>marcela.rueda@kaffetal.co</b> / <b>demo1234</b>
              </p>
              <button className="btn" type="submit" style={{ width: "100%", justifyContent: "center" }}>
                Entrar a mi panel
              </button>
            </form>

            <p className="login__pie">
              ¿Primera vez?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); onInscribirme(); }}>Inscríbete gratis</a>
              {" · "}
              <a href="#" onClick={(e) => { e.preventDefault(); onVolver(); }}>Volver</a>
            </p>
          </div>
        </div>
      </div>
      <LegalFooter />
    </>
  );
}
