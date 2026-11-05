import Link from "next/link";
import { MODULOS_OS, type ClaveDeModulo, type EstadoDeModulo } from "@/lib/os/modulos";
import s from "./os.module.css";

// CTCx OS · lo que se ve en lugar de un módulo apagado (V6.19, F2). Lo pinta el layout del módulo cuando su interruptor
// (`os_modulos`, `interruptores.ts`) está apagado o no se pudo leer: dice el motivo y deja volver a Inicio. Nunca lanza ni
// llama a `notFound`: el rail y los otros módulos siguen en pie. Las MISMAS palabras (`porQueEstaApagado`) las dice la hoja
// de un edificio de la Hacienda cuando el módulo que se abre desde él está apagado: entonces no hay enlace.

const ORIGEN: Record<EstadoDeModulo["origen"], string> = {
  // Neutro hasta el PR1b: en F2 no hay control en el BCP que lo apague (solo la fila `os_modulos`). Con el escritor, vuelve «desde el BCP».
  ajuste: "Lo apagó el owner (ajuste del interruptor del módulo).",
  defecto: "El módulo nace apagado hasta que el owner lo encienda.",
  sin_lectura: "No se pudo leer su interruptor: por prudencia, el módulo se queda apagado.",
};

export const tituloDeModulo = (clave: ClaveDeModulo): string => MODULOS_OS.find((m) => m.clave === clave)?.titulo ?? clave;

/** Por qué un módulo está apagado, en palabras: de dónde sale el apagado y, si lo hay, su motivo. */
export function porQueEstaApagado(estado: EstadoDeModulo): string {
  const motivo = estado.motivo && estado.origen !== "sin_lectura" ? ` Motivo: ${estado.motivo}` : "";
  return `${ORIGEN[estado.origen]}${motivo}`;
}

export function ModuloApagado({ clave, estado }: { clave: ClaveDeModulo; estado: EstadoDeModulo }) {
  return (
    <div role="status" className={s.apagado}>
      <p className={s.eyebrow}>Módulo apagado</p>
      <h1 className={s.titulo}>«{tituloDeModulo(clave)}» está apagado</h1>
      <p className={s.texto}>{porQueEstaApagado(estado)}</p>
      <div className={s.acciones}>
        <Link href="/os" className="btn btn-sm">
          Volver a Inicio
        </Link>
      </div>
    </div>
  );
}
