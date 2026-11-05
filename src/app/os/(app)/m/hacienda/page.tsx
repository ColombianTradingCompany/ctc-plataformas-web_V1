import { Hud } from "@/components/os/Hud";
import { Hacienda } from "@/components/os/vistas/Hacienda";
import { leerModulosOs, moduloEncendido } from "@/lib/os/interruptores";
import { identidadDeLaOs } from "@/app/os/(app)/quienMira";
import { leerTablero } from "@/lib/os/tableroServidor";

// CTCx OS · módulo «Hacienda» (V6.19, F2). Solo lectura. Desde el 5 nov la Hacienda es también la PORTADA de la OS (`/os`, rumbo
// del owner: el OS abre en el mapa); esta ruta se queda como su módulo, con la misma vista y las mismas hojas, para que el rail, el
// interruptor y los enlaces de siempre sigan valiendo. El layout del módulo pinta el aviso si está apagado; como en el App Router la
// página corre EN PARALELO con su layout, la página mira también el interruptor ANTES de leer (qa-os-check H2b): apagado, no lee nada
// y no pinta nada. `isOwner` sale de la identidad del layout (el Modelo Económico es solo del owner).
export const dynamic = "force-dynamic";

export default async function HaciendaPage() {
  const estado = await moduloEncendido("hacienda");
  if (!estado.encendido) return null;
  const { isOwner } = await identidadDeLaOs();
  const [tablero, modulos] = await Promise.all([leerTablero(isOwner), leerModulosOs()]);
  return (
    <>
      <Hud tablero={tablero} />
      <Hacienda tablero={tablero} modulos={modulos} base="/os/m" />
    </>
  );
}
