import s from "./os.module.css";

// CTCx OS · el icono de una alerta (V6.19, F2). PLAN §7.7: cada alerta lleva su icono Y su palabra. El icono es
// decorativo (aria-hidden): el nombre accesible sigue siendo la palabra de al lado («Aviso», «Falló», «Atrasada»).
// Toma el color del texto de su insignia (`currentColor`); el trazo del signo va en el fondo de la tarjeta.

export function IconoAlerta() {
  return (
    <svg className={s.icono} viewBox="0 0 12 12" width={11} height={11} aria-hidden="true" focusable="false">
      <path d="M6 1 11.5 11H.5Z" fill="currentColor" />
      <path d="M6 4.6v3M6 9.2v.1" className={s.iconoMarca} />
    </svg>
  );
}
