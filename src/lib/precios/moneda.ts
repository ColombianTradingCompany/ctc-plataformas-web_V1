// La MONEDA con la que se le habla al comprador — fuente única (V5.52, CP-1).
//
// POR QUÉ EXISTE, QUE ES LO IMPORTANTE.
//
// El precio de un lote lo fija el PVC, y la pila del motor está en **USD/kg**
// (`lib/pvc/motor.ts`: `n0 = copc / trm / kg_g` — se divide por la TRM, así que
// lo que sale son dólares). La tienda Green, en cambio, tenía el símbolo «€»
// escrito a mano en seis archivos. El resultado, cuando se publicó el primer
// lote el 2026-09-18, fue exactamente lo que se había anotado como pendiente
// bloqueante: **la tienda mostrando «€31,00/kg» sobre un número en dólares**.
//
// La decisión es del owner y está en `ALINEACION` §3 (2026-09-17): «US$ y COP
// con el FOB en US$ como base — la tienda y la puja dejan el EUR». Esto ejecuta
// la primera mitad.
//
// ⚠️ LA SUBASTA NO ENTRA AQUÍ, Y NO ES UN OLVIDO. `lot_auctions` lleva la
// moneda EN EL NOMBRE DE SUS COLUMNAS: `precio_salida_eur_kg` e
// `incremento_eur_kg`. Cambiarle el símbolo a la pantalla sin renombrarlas
// dejaría el esquema diciendo una cosa y la pantalla otra — que es justo la
// clase de divergencia callada que este archivo viene a cerrar. La puja pasa a
// US$ en la tanda **CN-4**, que sí lleva migración. Hasta entonces el euro de
// la subasta se DECLARA aquí en vez de estar suelto en el JSX, para que se vea
// que es una decisión con fecha y no un despiste.
//
// ⚠️ Y OJO CON LO QUE ESTE CAMBIO SIGNIFICA PARA EL FLETE Y EL PACK.
// `cartData()` suma en UN solo total los kilos del lote, el flete
// (`shipping_zones.rate_per_kg`, 0,10–0,45) y el pack de muestras
// (`PACK_PRICE = 300`). Los tres tienen que ir en la misma moneda o el total no
// significa nada, así que pasan a leerse en dólares con el MISMO número. El del
// lote es una corrección —ese número siempre fue USD—; los otros dos se
// escribieron pensando en euros, así que para ellos esto es un cambio de precio
// implícito de ~8 %. Se hace con eso sabido y dicho (0 pedidos de lote y 1 pack
// de prueba el día del cambio), no por descuido. Si el owner quiere convertir
// en vez de reetiquetar, el sitio es este archivo y una tasa.

export type Moneda = {
  /** ISO 4217 — lo que iría en una factura. */
  codigo: string;
  /** Lo que se pinta junto al número. */
  simbolo: string;
};

/** Lo que el comprador ve en la tienda Green: catálogo, carrito, envíos,
 *  pedidos y el pack de muestras. Sale del PVC, que calcula en dólares. */
export const MONEDA_TIENDA: Moneda = { codigo: "USD", simbolo: "US$" };

/** La subasta Tyrian, que sigue en euros porque sus COLUMNAS se llaman
 *  `*_eur_kg`. Se mueve en CN-4, con su migración. */
export const MONEDA_SUBASTA: Moneda = { codigo: "EUR", simbolo: "€" };

/** El separador decimal por idioma. El alemán y el español comparten el estilo
 *  continental (1.234,56); el inglés usa 1,234.56. Se declara aquí y no se
 *  importa de un `i18n` porque este módulo lo leen las DOS familias de
 *  superficies, que tienen proveedores de idioma distintos. */
const LOCALE: Record<string, string> = { es: "es-CO", en: "en-GB", de: "de-DE" };

/** Un importe con dos decimales, en el formato del idioma. Es el que era
 *  `eur()` en `cherry-picked/data.ts` — mismo cálculo, sin la moneda en el
 *  nombre, que era justamente el problema. */
export function importe(n: number, lang: string): string {
  return n.toLocaleString(LOCALE[lang] ?? LOCALE.es, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
