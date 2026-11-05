import s from "../os.module.css";

// CTCx OS · la cabecera de una vista (V6.19, F2): la etiqueta en mono encima y el título en Fraunces (PLAN §7.3, `.sec-head`).
export function Encabezado({ eyebrow, titulo, texto }: { eyebrow: string; titulo: string; texto?: string }) {
  return (
    <div className={s.encabezado}>
      <p className={s.eyebrow}>{eyebrow}</p>
      <h1 className={s.titulo}>{titulo}</h1>
      {texto && <p className={s.texto}>{texto}</p>}
    </div>
  );
}
