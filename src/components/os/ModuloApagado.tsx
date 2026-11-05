import Link from "next/link";
import { MODULOS_OS, type ClaveDeModulo, type EstadoDeModulo } from "@/lib/os/modulos";
import s from "./os.module.css";

// CTCx OS · lo que se ve en lugar de un módulo apagado (V6.19, F2). Lo pinta el layout del módulo cuando su interruptor
// (`os_modulos`, `interruptores.ts`) está apagado o no se pudo leer: dice el motivo y deja volver a Inicio. Nunca lanza ni
// llama a `notFound`: el rail y los otros módulos siguen en pie.

const ORIGEN: Record<EstadoDeModulo["origen"], string> = {
  ajuste: "Lo apagó el owner desde el BCP.",
  defecto: "El módulo nace apagado hasta que el owner lo encienda.",
  sin_lectura: "No se pudo leer su interruptor: por prudencia, el módulo se queda apagado.",
};

export function ModuloApagado({ clave, estado }: { clave: ClaveDeModulo; estado: EstadoDeModulo }) {
  const titulo = MODULOS_OS.find((m) => m.clave === clave)?.titulo ?? clave;
  return (
    <div role="status" className={s.apagado}>
      <p className={s.eyebrow}>Módulo apagado</p>
      <h1 className={s.titulo}>«{titulo}» está apagado</h1>
      <p className={s.texto}>
        {ORIGEN[estado.origen]}
        {estado.motivo && estado.origen !== "sin_lectura" && <> Motivo: {estado.motivo}</>}
      </p>
      <div className={s.acciones}>
        <Link href="/os" className="btn btn-sm">
          Volver a Inicio
        </Link>
      </div>
    </div>
  );
}
