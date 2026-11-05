import { Hud } from "@/components/os/Hud";
import { Hacienda } from "@/components/os/vistas/Hacienda";
import { moduloEncendido } from "@/lib/os/interruptores";
import { leerTablero } from "@/lib/os/tableroServidor";

// CTCx OS · módulo «Hacienda» (V6.19, F2). Solo lectura. El layout del módulo pinta el aviso si está apagado; como en el App
// Router la página corre EN PARALELO con su layout, la página mira también el interruptor ANTES de leer (qa-os-check H2b):
// apagado, no lee nada y no pinta nada.
export const dynamic = "force-dynamic";

export default async function HaciendaPage() {
  const estado = await moduloEncendido("hacienda");
  if (!estado.encendido) return null;
  const tablero = await leerTablero();
  return (
    <>
      <Hud tablero={tablero} />
      <Hacienda tablero={tablero} />
    </>
  );
}
