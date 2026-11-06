import { Hud } from "@/components/os/Hud";
import { Acciones } from "@/components/os/vistas/Acciones";
import { moduloEncendido } from "@/lib/os/interruptores";
import { identidadDeLaOs } from "@/app/os/(app)/quienMira";
import { leerTablero } from "@/lib/os/tableroServidor";
import { leerTareasDeNotion } from "@/lib/os/lecturaNotion";
import { armarAcciones } from "@/lib/os/acciones";

// CTCx OS · módulo «Acciones» (F3, en obra; nace apagado). Solo lectura. El layout del módulo pinta el aviso si está apagado;
// como en el App Router la página corre EN PARALELO con su layout, la página mira también el interruptor ANTES de leer
// (qa-os-check H2b): apagado, no lee nada y no pinta nada. Las tareas de la plataforma salen del MISMO tablero que la Hacienda
// (`leerTablero(isOwner)`, con el Modelo Económico solo del owner: H12); las de Notion, de su lector, que hasta la integración de
// solo lectura del OS (decisión CON-28) devuelve «sin integración» y el módulo pinta «Sin datos».
export const dynamic = "force-dynamic";

export default async function AccionesPage() {
  const estado = await moduloEncendido("acciones");
  if (!estado.encendido) return null;
  const { isOwner } = await identidadDeLaOs();
  const [tablero, notion] = await Promise.all([leerTablero(isOwner), leerTareasDeNotion()]);
  return (
    <>
      <Hud tablero={tablero} />
      <Acciones acciones={armarAcciones(tablero, notion)} />
    </>
  );
}
