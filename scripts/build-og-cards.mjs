// ── Las tarjetas de enlace de la red (Open Graph) ────────────────────────────
// Genera `public/images/og/*.jpg`: la imagen que WhatsApp, LinkedIn y Slack
// enseñan cuando alguien pega el enlace de una superficie. Se ejecuta A MANO
// (`node scripts/build-og-cards.mjs`) y el resultado se comitea — NO corre en
// el build: los logotipos de origen viven fuera del repo, en
// `reference_logos/`, y Vercel no los tiene.
//
// POR QUÉ ES UN SCRIPT Y NO CINCO MINUTOS EN UN EDITOR DE IMAGEN: son
// diecinueve tarjetas. Cuando el owner cambie un logotipo —ya pasó con el de
// Kaffetal Regal, que va por la V69— rehacerlas a mano es media tarde y una de
// ellas queda desalineada. Así es un comando.
//
// EL DISEÑO, Y POR QUÉ ES ASÍ: fondo degradado con el color de la superficie +
// una placa BLANCA con el logotipo dentro. La placa no es decorativa: casi
// todos los logotipos de `reference_logos/` vienen en RGB opaco sobre blanco
// (sin alfa), así que sobre un fondo oscuro se verían como un recorte
// rectangular. Puestos sobre su propia placa, el blanco del archivo y el blanco
// de la placa son el mismo blanco y el recorte desaparece.
//
// FORMATO: JPEG 1200×630. La proporción 1.91:1 es la que pide el protocolo
// (ogp.me) y la que usan las tres plataformas. JPEG y no WebP porque WhatsApp
// —por donde de verdad circulan estos enlaces— no previsualiza WebP de forma
// fiable.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const LOGOS = "C:/Users/gabri/OneDrive/Desktop/CTC Web Platform/reference_logos";
const OUT = "public/images/og";

const W = 1200;
const H = 630;

// LA PLACA SE MIDE POR EL LOGOTIPO, no al revés. El primer intento la fijaba en
// 1048×424 para las diecinueve: los logotipos apaisados quedaban bien, pero los
// CUADRADOS —Kaffetal Regal, Terratalento, Directorio, Herramientas, todos
// 1254×1254— sólo podían crecer hasta los 424 px de alto y flotaban perdidos en
// una placa el doble de ancha que el dibujo. Ahora el logotipo se escala dentro
// de esta caja y la placa se recorta a su medida, así que un logotipo cuadrado
// recibe una placa cuadrada y uno apaisado, una apaisada.
const CAJA = { width: 800, height: 348 }; // lo máximo que puede medir un logotipo
const PAD = 40; // aire entre el logotipo y el filo de la placa
const MIN_ANCHO_PLACA = 470; // que un logotipo muy alto no deje una placa flaca
const RADIO = 20;
const BANDA = 6; // el filo de color al pie de la placa
/** El alto donde vive la placa: todo menos la franja de la firma. */
const ZONA = H - 118;

// Las paletas son las de `globals.css` — no se inventan colores aquí.
//
// `acc` y `filo` son DOS trabajos distintos y por eso no siempre coinciden:
// `acc` se dibuja sobre el fondo OSCURO (el resplandor y la firma del dominio),
// así que tiene que ser claro; `filo` es la línea al pie de la placa, que se
// dibuja sobre BLANCO y tiene que ser oscura. En la mayoría de temas el dorado
// de la casa sirve para las dos cosas. En Roast y X no: sus acentos claros
// —pensados para leerse sobre marrón y sobre morado— desaparecían contra la
// placa, así que ahí el filo lo pone el color propio del programa.
const TEMA = {
  azul: { deep: "#0E2C48", base: "#16436B", acc: "#E3A32C" }, // ctc-home
  verdeKR: { deep: "#0E2B1C", base: "#17402B", acc: "#A87B2F" }, // kaffetal-regal
  verdeCP: { deep: "#123324", base: "#1E4D35", acc: "#A87A14" }, // cherry-picked
  morado: { deep: "#2A0760", base: "#3C0A86", acc: "#FFCD00", filo: "#3C0A86" }, // corporativo (bcp)
  // Los dos programas que tienen color propio en FAMILY_COLORS (i18n.tsx).
  cafe: { deep: "#3F2C1F", base: "#6F4E37", acc: "#D9B382", filo: "#6F4E37" }, // Roast
  tyrian: { deep: "#3D0124", base: "#66023C", acc: "#E0A9C6", filo: "#66023C" }, // X
  // El Directorio no usa los tokens de globals.css: tiene su propia paleta
  // violeta en `app/directorio/directorio.css` (--papel #F2EFF7, --oro #F5C518).
  violeta: { deep: "#2A0A55", base: "#432076", acc: "#F5C518", filo: "#432076" },
};

/** Una fila por superficie pública. El nombre del archivo de salida es la clave
 *  con la que la página lo pide en `metadatosDeSuperficie`. */
const TARJETAS = [
  { out: "ctc-home", logo: "CTC Logo - Full - Colorful.png", tema: "azul" },
  { out: "kaffetal-regal", logo: "Kaffetal Regal V69.png", tema: "verdeKR" },
  { out: "cherry-picked", logo: "Cherry Picked Logo.png", tema: "verdeCP" },
  { out: "cherry-picked-green", logo: "Cherry Picked - Green.png", tema: "verdeCP" },
  { out: "cherry-picked-roast", logo: "Cherry Picked - Roast.png", tema: "cafe" },
  { out: "cherry-picked-x", logo: "Cherry Picked - X.png", tema: "tyrian" },
  // CaaS · Coffee as a Service. Conserva el logotipo de Co-Create porque el
  // owner cambió el término, no la marca gráfica. La tarjeta vieja se mantiene
  // generada: `co-create.jpg` sigue indexada y su ruta responde con un 308,
  // así que hasta que los buscadores la reemplacen conviene que exista.
  { out: "caas", logo: "Cherry Picked - CoCreate.png", tema: "azul" },
  { out: "co-create", logo: "Cherry Picked - CoCreate.png", tema: "azul" },
  { out: "directorio", logo: "Directorio del Cafe - Logo (Full).png", tema: "violeta" },
  { out: "ctc-tech", logo: "CTC Tech - Logo.png", tema: "azul" },
  { out: "varietales", logo: "Varietales Registrados - Logo.png", tema: "verdeKR" },
  { out: "coffeed", logo: "Coffeed Logo.png", tema: "azul" },
  { out: "herramientas", logo: "Herramientas del Cafe.png", tema: "azul" },
  { out: "terratalento", logo: "Terratalento.png", tema: "verdeKR" },
  { out: "control-panel", logo: "Ecosistema de valor.png", tema: "morado" },
  // Los cinco nodos socios (landing pública + puerta de credenciales).
  { out: "socio-centro-calidad", logo: "KR - Centro de Calidad.png", tema: "verdeKR" },
  { out: "socio-agente-carga", logo: "Agente de Carga.png", tema: "azul" },
  { out: "socio-agente-nacionalizacion", logo: "Agente de Nacionalizacion.png", tema: "azul" },
  { out: "socio-master-roaster", logo: "CP -Master Roaster.png", tema: "cafe" },
  { out: "socio-estudio-contenido", logo: "Estudio de Contenido.png", tema: "morado" },
];

/** El blanco de la placa lo dicta el LOGOTIPO, no el diseño.
 *
 *  Los PNG de marca no vienen sobre blanco puro: el de Kaffetal Regal es
 *  254,254,254 y el de Terratalento otro parecido. Sobre una placa #FFFFFF ese
 *  punto de diferencia se ve — un recuadro fantasma alrededor del dibujo, muy
 *  suave pero visible, y en una tarjeta de enlace que se mira a 400 px de ancho
 *  parece un recorte mal hecho. Pintando la placa del mismo blanco que trae el
 *  archivo, la costura no existe porque no hay dos blancos.
 *
 *  Solo se acepta si de verdad es un fondo claro (los tres logotipos con alfa y
 *  cualquier futuro logotipo sobre color caen al blanco puro). */
async function blancoDelLogo(ruta) {
  const { data, info } = await sharp(ruta).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [r, g, b, a] = [data[0], data[1], data[2], data[3]];
  if (a < 250 || r < 240 || g < 240 || b < 240) return "#FFFFFF";
  const hex = (n) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** El lienzo: degradado + placa a la medida + firma. El logotipo va encima. */
function lienzo(t, placa) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.deep}"/>
      <stop offset="100%" stop-color="${t.base}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.12" r="0.6">
      <stop offset="0%" stop-color="${t.acc}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${t.acc}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <!-- La placa. El filo de color al pie es lo único que la ata a la superficie:
       sin él, sobre el degradado, flota como un papel suelto. -->
  <rect x="${placa.x}" y="${placa.y}" width="${placa.w}" height="${placa.h}" rx="${RADIO}" fill="${placa.blanco}"/>
  <!-- El filo va METIDO el radio por cada lado: a ras de la placa, sus puntas
       cuadradas asomaban por fuera de las esquinas redondeadas y parecía un
       error de montaje en vez de un remate. -->
  <rect x="${placa.x + RADIO}" y="${placa.y + placa.h - BANDA}" width="${placa.w - RADIO * 2}" height="${BANDA}" rx="${BANDA / 2}" fill="${t.filo ?? t.acc}"/>
  <text x="${W / 2}" y="${H - 52}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="27"
        letter-spacing="7" fill="${t.acc}">ctcexport.com</text>
</svg>`);
}

await mkdir(OUT, { recursive: true });

for (const c of TARJETAS) {
  const t = TEMA[c.tema];
  const logo = await sharp(`${LOGOS}/${c.logo}`)
    // `trim` ANTES de escalar, y es lo que arregla dos cosas a la vez. Los PNG
    // de marca vienen con un margen muerto de distinto grosor cada uno, así que
    // sin recortarlo el logotipo se escala a su MARGEN y no a su dibujo — y
    // además ese margen no siempre es blanco puro (el de Kaffetal Regal es
    // 254,254,254), así que sobre una placa #FFFFFF se veía el recuadro.
    // Recortado, el blanco del archivo deja de existir y no hay borde que ver.
    .trim({ threshold: 12 })
    .resize({ ...CAJA, fit: "inside", withoutEnlargement: false })
    .toBuffer();
  const { width: lw, height: lh } = await sharp(logo).metadata();

  const placa = {
    w: Math.max(lw + PAD * 2, MIN_ANCHO_PLACA),
    h: lh + PAD * 2 + BANDA,
    blanco: await blancoDelLogo(`${LOGOS}/${c.logo}`),
  };
  placa.x = Math.round((W - placa.w) / 2);
  placa.y = Math.round((ZONA - placa.h) / 2);

  const info = await sharp(lienzo(t, placa))
    .composite([
      {
        input: logo,
        left: Math.round(placa.x + (placa.w - lw) / 2),
        top: Math.round(placa.y + (placa.h - BANDA - lh) / 2),
      },
    ])
    // Los tres logotipos CON alfa (CTC full, Cherry Picked, Coffeed) se
    // componen encima de la placa ya dibujada, así que su transparencia deja
    // ver blanco — el mismo blanco que traen de fábrica los otros dieciséis.
    // Por eso las diecinueve tarjetas salen idénticas de tono.
    .jpeg({ quality: 86, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(`${OUT}/${c.out}.jpg`);

  console.log(`${c.out}.jpg`.padEnd(34), `${(info.size / 1024).toFixed(0)} KB`);
}
