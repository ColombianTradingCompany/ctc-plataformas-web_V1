// ── El emisor de datos estructurados ─────────────────────────────────────────
// Componente de SERVIDOR (sin "use client" a propósito): el JSON-LD tiene que
// estar en el HTML que recibe el rastreador, no aparecer después por JavaScript.
// Un buscador que no lo encuentra en la primera respuesta, para efectos
// prácticos, no lo tiene.
//
// ⚠️ POR QUÉ EL `replace` NO ES OPCIONAL. Dentro de un `<script>` el navegador
// no está parseando JSON: busca el cierre `</script>` en el texto crudo. Si un
// dato llegara a contener esa secuencia —hoy no ocurre, todo sale de constantes
// de la casa— cerraría la etiqueta antes de tiempo y lo que viniera detrás se
// ejecutaría como código. Escapar `<` a `<` lo hace imposible POR
// CONSTRUCCIÓN, que es la única garantía que sobrevive a que mañana alguien
// meta aquí un campo administrable desde el panel.

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
