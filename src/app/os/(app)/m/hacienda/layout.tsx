import { moduloEncendido } from "@/lib/os/interruptores";
import { ModuloApagado } from "@/components/os/ModuloApagado";

// CTCx OS · módulo «Hacienda» · su layout (V6.19, F2). Lee el interruptor del módulo (`os_modulos`, solo LECTURA en F2, con
// los valores por defecto del registro): apagado o sin lectura, pinta el aviso con su motivo en vez de la página —nunca
// lanza ni llama a `notFound`—. OJO: en el App Router la página corre EN PARALELO con su layout; la página que lea datos
// llama también a `moduloEncendido("hacienda")` antes de leer (`qa-os-check` H2b lo exige).
export default async function HaciendaLayout({ children }: { children: React.ReactNode }) {
  const estado = await moduloEncendido("hacienda");
  if (!estado.encendido) return <ModuloApagado clave="hacienda" estado={estado} />;
  return <>{children}</>;
}
