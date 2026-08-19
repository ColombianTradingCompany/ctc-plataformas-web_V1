import Link from "next/link";
import { NOMBRE_SUPERFICIE, vueltaSegura, type SuperficieHerramientas } from "@/lib/tools/volverSeguro";
import { MOTIVO_COPY, type Veredicto } from "@/lib/tools/accesoHerramienta";
import { SolicitarHerramienta } from "./SolicitarHerramienta";
import { SesionHerramienta } from "./SesionHerramienta";
import styles from "./ConchaHerramienta.module.css";

// ── La concha de una herramienta DENTRO de la webapp (A5, V4.34) ────────────
// El owner lo pidió con estas palabras: las herramientas tienen que funcionar
// dentro de la aplicación, «con botones seguros que le permitan al usuario
// volver a lo que estaba haciendo». Las dos mitades de esa frase mandan aquí:
//
//   · DENTRO. La herramienta se abre en una ruta de SU superficie
//     (`/kaffetal-regal/herramientas/<slug>`), no en una pestaña suelta ni en
//     el dominio de las consolas. Así el proxy le antepone la base correcta por
//     construcción y el usuario no sale nunca de la plataforma.
//   · VOLVER A LO QUE ESTABA HACIENDO. No a la portada: a la pantalla de la
//     que vino. La ruta la trae en `?volver=` y la sanea `vueltaSegura()` —
//     obedecerla a ciegas sería un redirect abierto con el dominio de CTC
//     delante, que es phishing servido por la casa.
//
// EL HTML DE LA HERRAMIENTA NO SE TOCA: sigue sirviéndose desde `/tools/h/<id>`
// o `/tools/<archivo>.html`, fuera del matcher del proxy, que es lo que hace
// que la misma URL funcione en los 18 hosts (gotcha 12 del HANDOFF). La concha
// solo lo enmarca.

export function ConchaHerramienta({
  superficie,
  volver,
  nombre,
  descripcion,
  esPlus,
  src,
  veredicto,
  toolId,
  soportaMemoria = false,
}: {
  superficie: SuperficieHerramientas;
  volver: string | null;
  nombre: string;
  descripcion: string;
  esPlus: boolean;
  src: string;
  veredicto: Veredicto;
  toolId: string;
  /** true = la herramienta habla el puente y la concha antepone el Home Menu
   *  de trabajos (A11). false = se abre directa, como siempre. */
  soportaMemoria?: boolean;
}) {
  const destino = vueltaSegura(volver, superficie);
  const casa = NOMBRE_SUPERFICIE[superficie];

  return (
    <div className={styles.concha}>
      <header className={styles.barra}>
        <Link href={destino} className={styles.volver}>
          ← Volver a {casa}
        </Link>
        <div className={styles.titulo}>
          <h1>{nombre}</h1>
          {esPlus && (
            <span className={veredicto.abre ? styles.plusAbierta : styles.plusCerrada}>
              {veredicto.abre ? "Plus · activa" : "Plus · bloqueada"}
            </span>
          )}
        </div>
        <p className={styles.desc}>{descripcion}</p>
      </header>

      {veredicto.abre ? (
        soportaMemoria ? (
          <SesionHerramienta toolId={toolId} nombre={nombre} src={src} />
        ) : (
          <iframe className={styles.marco} src={src} title={`Herramienta: ${nombre}`} loading="lazy" />
        )
      ) : (
        <div className={styles.bloqueada}>
          <p className={styles.motivo}>{MOTIVO_COPY[veredicto.motivo]}</p>
          {/* Solo se ofrece pedirla a quien YA es miembro: a quien no tiene
              cuenta o no es productor/comprador, pedir no le sirve de nada
              todavía, y ofrecérselo sería mandarlo a una cola que no avanza. */}
          {veredicto.motivo === "sin-permiso" && <SolicitarHerramienta toolId={toolId} nombre={nombre} />}
          {veredicto.motivo === "sin-cuenta" && (
            <Link href={destino} className="btn btn-sm btn-solid">
              Entrar a {casa}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
