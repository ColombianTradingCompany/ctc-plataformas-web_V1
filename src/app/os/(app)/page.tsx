import { Hud } from "@/components/os/Hud";
import { InicioVista } from "@/components/os/vistas/Inicio";
import { leerModulosOs } from "@/lib/os/interruptores";
import { leerTablero } from "@/lib/os/tableroServidor";

// CTCx OS · Inicio (V6.19, F2). La puerta de la consola: el HUD, el logo, los módulos con su interruptor y la deuda de
// datos. Inicio no es un módulo y no tiene interruptor propio; pero si TODOS los módulos están apagados (la consola
// apagada desde el BCP o el interruptor sin lectura), no lee el tablero: apagar el OS apaga también sus lecturas.
export const dynamic = "force-dynamic";

export default async function OsInicioPage() {
  const modulos = await leerModulosOs();
  const alguno = Object.values(modulos).some((m) => m.encendido);
  const tablero = alguno ? await leerTablero() : null;
  return (
    <>
      <Hud tablero={tablero} />
      <InicioVista tablero={tablero} modulos={modulos} base="/os/m" />
    </>
  );
}
