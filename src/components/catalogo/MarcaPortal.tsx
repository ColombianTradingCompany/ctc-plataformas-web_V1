// La marca del CTCx Public Catalogue (V5.50).
//
// EL CONCEPTO, EN UNA FRASE: una lupa cuyo cristal ES el grano. El círculo hace
// de lente y de grano a la vez, y la doble curva de dentro es la hendidura del
// café — así que el símbolo dice literalmente lo que hace la página: buscar un
// grano. Dos lecturas, un solo trazo.
//
// POR QUÉ ES UN SVG EN LÍNEA Y NO UN ARCHIVO. Hereda `currentColor`, así que la
// misma marca se pinta azul en CTC Home, verde en Kaffetal Regal y en la familia
// Cherry Picked, sin una imagen por tema y sin que nadie tenga que acordarse.
// Y por eso el trazo es monolínea y sin relleno: tiene que aguantar a 20 px en
// un botón y a 120 px en la cabecera con el mismo dibujo.
//
// Hay una copia en `public/images/ctcx-public-catalogue/marca-ctcx-portal.svg`
// para lo que no puede usar React (una tarjeta Open Graph, un favicon, un
// documento). Si se cambia una, se cambia la otra — lo vigila
// `qa-catalogo-publico-check.mjs`, que compara los dos trazados.

export function MarcaPortal({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      // Decorativo: donde se usa, el texto de al lado ya dice qué es. Un
      // `role="img"` con título aquí haría que el lector lo leyera dos veces.
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="13.2" cy="13.2" r="9.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M13.2 4.2c-3.1 2.9-3.1 5.5 0 9s3.1 6.1 0 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M19.9 19.9 27.6 27.6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
