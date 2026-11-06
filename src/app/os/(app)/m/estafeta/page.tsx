import { Hud } from "@/components/os/Hud";
import { Estafeta } from "@/components/os/vistas/Estafeta";
import { moduloEncendido } from "@/lib/os/interruptores";
import { identidadDeLaOs } from "@/app/os/(app)/quienMira";
import { leerTablero } from "@/lib/os/tableroServidor";
import { leerCorrespondencia } from "@/lib/os/lecturaNotion";
import { armarEstafeta } from "@/lib/os/estafeta";

// CTCx OS · módulo «Estafeta» (F3, en obra; nace apagado). Solo lectura sobre los punteros del registro «Correspondencia» de
// Notion (nunca el texto de un mensaje). Como en el App Router la página corre EN PARALELO con su layout, mira también el
// interruptor ANTES de leer (qa-os-check H2b). El HUD es el de toda la OS (el tablero, con el Modelo Económico solo del owner:
// H12); la correspondencia sale de su lector, que hasta la integración de solo lectura del OS (decisión CON-28) devuelve «sin
// integración» y el módulo pinta «Sin datos».
export const dynamic = "force-dynamic";

export default async function EstafetaPage() {
  const estado = await moduloEncendido("estafeta");
  if (!estado.encendido) return null;
  const { isOwner } = await identidadDeLaOs();
  const [tablero, correspondencia] = await Promise.all([leerTablero(isOwner), leerCorrespondencia()]);
  return (
    <>
      <Hud tablero={tablero} />
      <Estafeta estafeta={armarEstafeta(correspondencia, tablero.leidoAt)} />
    </>
  );
}
