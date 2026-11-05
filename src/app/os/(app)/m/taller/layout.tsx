// CTCx OS · módulo «Taller» · su layout (V6.19, F2 — el esqueleto).
// PROVISIONAL: hoy deja pasar. Aquí irá el interruptor del módulo (`os_modulos`, solo LECTURA en F2, con los
// valores por defecto del registro): apagado, pinta un aviso con su motivo en vez de la página —nunca lanza ni
// llama a `notFound`—. Llega con el lector de interruptores, en un paso siguiente de F2.
export default function TallerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
