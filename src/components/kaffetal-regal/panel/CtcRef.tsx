import { ctcLotReference, ctcLotReferenceShort } from "../data";

// V5.100: el código es CTC-L-XXXXXXXX entero (ya no hay parte «larga»); se sigue resaltando lo que va en el paquete, que es todo.
// (Movida de AppDashboard a esta carpeta en V5.16: la usan varias pestañas.)
export function CtcRef({ id }: { id: string }) {
  const ref = ctcLotReference(id);
  const short = ctcLotReferenceShort(id);
  const idx = ref.indexOf(short);
  return <span className="mono">{ref.slice(0, idx)}<b style={{ color: "var(--ink)" }}>{short}</b>{ref.slice(idx + short.length)}</span>;
}
