import Link from "next/link";
import { valeVivo } from "@/lib/auth/recuperacion";
import { hrefPuerta, hrefRecuperar, PUERTAS } from "@/lib/auth/puertas";
import styles from "@/components/panel/auth.module.css";
import { NuevaContrasena } from "./NuevaContrasena";

// El enlace del correo. Se comprueba que el vale siga vivo ANTES de pintar el
// formulario — enseñar los campos y rechazar al guardar sería hacerle escribir
// una contraseña a alguien para nada.
//
// Abrir esta página NO quema el vale (lo hace guardar). Motivo: hay antivirus
// corporativos y previsualizadores de correo que «visitan» todos los enlaces de
// un mensaje; si la visita consumiera el vale, el dueño lo encontraría gastado
// antes de tocarlo.
export default async function RecuperarConValePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const vivo = await valeVivo(token);

  if (!vivo) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1>Este enlace ya no sirve</h1>
          <p>
            Los enlaces de recuperación caducan y solo se pueden usar una vez. Pide uno nuevo y te llega al momento.
          </p>
          <Link
            className="btn btn-solid"
            style={{ width: "100%", padding: 12, display: "block", textAlign: "center" }}
            href={hrefRecuperar("kaffetal-regal")}
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <NuevaContrasena
      token={token}
      correo={vivo.correo}
      nombrePuerta={PUERTAS[vivo.puerta].nombre}
      volver={hrefPuerta(vivo.puerta, process.env.NODE_ENV === "production")}
    />
  );
}
