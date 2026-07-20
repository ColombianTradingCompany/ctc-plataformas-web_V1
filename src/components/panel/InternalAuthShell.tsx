import { LegalFooter } from "@/components/LegalFooter";
import styles from "./internalAuthShell.module.css";

// Envoltura común de las pantallas de acceso interno (/login, /verify,
// /cambiar-contrasena, /panel). Fija el tema BCP y cierra con la barra legal —
// la insignia de versión también tiene que estar ANTES de entrar, que es
// justamente cuando uno se pregunta si el despliegue ya subió.
//
// El shell es columna con min-height:100vh y el contenido lleva flex:1 (por eso
// `.wrap` de auth.module.css y hub.module.css cambió su min-height:100vh por
// flex): así la barra queda al pie del viewport sin obligar a hacer scroll en
// una pantalla que de por sí cabe entera.
export function InternalAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="bcp" className={styles.shell}>
      {children}
      <LegalFooter />
    </div>
  );
}
