import { moduloEncendido } from "@/lib/os/interruptores";
import { ModuloApagado } from "@/components/os/ModuloApagado";

// CTCx OS · módulo «Rondas» · su layout (2026-11-07; nace APAGADO: es el primer módulo que escribe). Lee el interruptor del módulo
// (`os_modulos`, con los valores por defecto del registro): apagado o sin lectura, pinta el aviso con su motivo en vez de la página
// —nunca lanza ni llama a `notFound`—. Vale también para `/os/m/rondas/<slug>`. OJO: en el App Router la página corre EN PARALELO
// con su layout; cada página que lee datos llama también a `moduloEncendido("rondas")` antes de leer (`qa-os-check` H2b y R).
export default async function RondasLayout({ children }: { children: React.ReactNode }) {
  const estado = await moduloEncendido("rondas");
  if (!estado.encendido) return <ModuloApagado clave="rondas" estado={estado} />;
  return <>{children}</>;
}
