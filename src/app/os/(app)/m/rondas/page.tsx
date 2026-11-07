import { Rondas } from "@/components/os/vistas/Rondas";
import { moduloEncendido } from "@/lib/os/interruptores";

// CTCx OS · módulo «Rondas» · la lista de rondas (2026-11-07, nace apagado). No lee la base: cada ronda lee lo suyo al abrirse. Mira
// el interruptor igual (la página corre en paralelo con su layout): apagado, no pinta nada.
export const dynamic = "force-dynamic";

export default async function RondasPage() {
  const estado = await moduloEncendido("rondas");
  if (!estado.encendido) return null;
  return <Rondas base="/os/m" />;
}
