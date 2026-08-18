// ── El Análisis Intrínseco de los lotes MOCK ─────────────────────────────────
// Los diez atributos del formulario SCA de cada lote de muestra y la telaraña
// que los dibuja, más los datos físicos de su ficha de café verde.
//
// ⚠️ ESTOS NÚMEROS SON INVENTADOS, POR ENCARGO. El owner los pidió el 2026-08-17
// «for the sake of completeness»: sin ellos la ficha de muestra queda llena de
// huecos y no sirve para enseñar cómo se ve una ficha de verdad. Están hechos
// para ser PLAUSIBLES, no ciertos:
//   · los diez atributos suman EXACTAMENTE el puntaje SCA del lote, que es la
//     única regla que un catador comprobaría de un vistazo;
//   · uniformidad, taza limpia y dulzor van a 10, como en una taza sin defectos;
//   · el reparto del resto sigue el carácter del lote (un lavado de altura lleva
//     la acidez arriba; un Black, el cuerpo);
//   · humedad, actividad de agua, densidad y malla caen en los rangos de un café
//     verde de exportación.
// Lo que NO es inventado: el puntaje total, la variedad, el proceso, la finca y
// las notas de cata — eso sale de la base de Notion del owner.
//
// Por eso las tres páginas van selladas MUESTRA: un número analítico con pinta
// de oficial es exactamente el que alguien acaba citando. El sello es lo que
// impide que esta ficha se lea como el informe de un lote real.
//
// Se retira con el resto de los mock (receta en `src/lib/catalogo/sneakPeekMock.ts`).

/** Los diez atributos del formulario SCA, en el orden en que se catan. */
export const ATRIBUTOS = [
  { clave: "fragancia", etiqueta: "Fragancia/Aroma" },
  { clave: "sabor", etiqueta: "Sabor" },
  { clave: "residual", etiqueta: "Sabor residual" },
  { clave: "acidez", etiqueta: "Acidez" },
  { clave: "cuerpo", etiqueta: "Cuerpo" },
  { clave: "balance", etiqueta: "Balance" },
  { clave: "uniformidad", etiqueta: "Uniformidad" },
  { clave: "limpia", etiqueta: "Taza limpia" },
  { clave: "dulzor", etiqueta: "Dulzor" },
  { clave: "catador", etiqueta: "Puntaje del catador" },
];

/** Los tres que en una taza sin defectos valen 10 y no se reparten. */
const FIJOS = ["uniformidad", "limpia", "dulzor"];

const redondea = (n) => Math.round(n * 4) / 4; // la escala SCA va de cuarto en cuarto

/**
 * Reparte el puntaje total entre los diez atributos.
 * `sesgo` inclina el reparto según el carácter del lote (misma suma, distinto
 * dibujo en la telaraña), y el resto se ajusta en «Puntaje del catador» para que
 * la suma cuadre al céntimo.
 */
function reparte(total, sesgo = {}) {
  const repartibles = ATRIBUTOS.map((a) => a.clave).filter((c) => !FIJOS.includes(c));
  const base = (total - FIJOS.length * 10) / repartibles.length;
  const out = {};
  for (const c of FIJOS) out[c] = 10;
  for (const c of repartibles) out[c] = Math.min(9.75, Math.max(6, redondea(base + (sesgo[c] || 0))));

  // El resto del redondeo se REPARTE de cuarto en cuarto entre todos, no se
  // descarga en «Puntaje del catador»: dejarlo ahí producía un 6.75 al lado de
  // varios 8.75, y eso en un formulario SCA se ve raro a la primera ojeada.
  const suma = () => repartibles.reduce((s, c) => s + out[c], 0) + FIJOS.length * 10;
  let vueltas = 0;
  while (Math.abs(total - suma()) >= 0.01 && vueltas < 200) {
    const falta = total - suma();
    const paso = falta > 0 ? 0.25 : -0.25;
    // se toca primero el que más se aleja de su base, para no deformar el perfil
    const orden = [...repartibles].sort((a, b) =>
      (paso > 0 ? out[a] - out[b] : out[b] - out[a])
    );
    const c = orden.find((k) => {
      const v = out[k] + paso;
      return v >= 6 && v <= 9.75 && Math.abs(v - (base + (sesgo[k] || 0))) <= 0.75;
    });
    if (!c) break;
    out[c] = redondea(out[c] + paso);
    vueltas++;
  }
  return out;
}

/**
 * Los datos de muestra, lote a lote. `densidad` y `factor` del Gesha son los
 * únicos que vienen de Notion; el resto se inventó (ver la cabecera).
 */
export const ANALISIS = {
  "mock-lote-01": {
    tipo: "Macro Lote", densidad: 726, factor: 91, humedad: "10.8 %", aw: "0.55", malla: "15/16",
    defectos: "0 defectos primarios · 2 secundarios",
    sca: reparte(87.0, { fragancia: 0.5, sabor: 0.5, cuerpo: 0.5, residual: 0.25, acidez: -0.75, balance: -0.5 }),
  },
  "mock-lote-02": {
    tipo: "Micro Lote", densidad: 741, factor: 90, humedad: "10.5 %", aw: "0.54", malla: "16/18",
    defectos: "0 defectos primarios · 1 secundario",
    sca: reparte(87.0, { fragancia: 0.75, acidez: 0.75, residual: 0.5, cuerpo: -0.75, sabor: -0.25 }),
  },
  "mock-lote-03": {
    tipo: "Micro Lote", densidad: 900, factor: 88, humedad: "10.2 %", aw: "0.53", malla: "17/18",
    defectos: "0 defectos primarios · 0 secundarios",
    sca: reparte(86.25, { acidez: 0.75, fragancia: 0.75, sabor: 0.25, cuerpo: -0.75, balance: -0.5 }),
  },
  "mock-lote-04": {
    tipo: "Micro Lote", densidad: 712, factor: 92, humedad: "11.0 %", aw: "0.57", malla: "15/16",
    defectos: "0 defectos primarios · 3 secundarios",
    sca: reparte(85.0, { sabor: 0.75, acidez: 0.5, residual: 0.5, balance: -0.75, fragancia: -0.25 }),
  },
  "mock-lote-05": {
    tipo: "Macro Lote", densidad: 704, factor: 93, humedad: "11.2 %", aw: "0.58", malla: "15/16",
    defectos: "0 defectos primarios · 4 secundarios",
    sca: reparte(84.5, { cuerpo: 0.75, sabor: 0.5, balance: 0.25, acidez: -0.75, fragancia: -0.5 }),
  },
  "mock-lote-06": {
    tipo: "Macro Lote", densidad: 698, factor: 93, humedad: "11.1 %", aw: "0.57", malla: "15/16",
    defectos: "0 defectos primarios · 4 secundarios",
    sca: reparte(84.25, { balance: 0.75, cuerpo: 0.5, residual: 0.25, acidez: -0.75, fragancia: -0.25 }),
  },
  "mock-lote-07": {
    tipo: "Macro Lote", densidad: 683, factor: 94, humedad: "11.4 %", aw: "0.58", malla: "14/16",
    defectos: "0 defectos primarios · 5 secundarios",
    sca: reparte(81.5, { cuerpo: 0.75, balance: 0.5, acidez: -0.75, fragancia: -0.5, residual: -0.25 }),
  },
};

/**
 * La telaraña del Análisis Intrínseco, en SVG y sin dependencias.
 * Escala 6–10, que es donde vive un café de especialidad: dibujarla de 0 a 10
 * dejaría todos los lotes con la misma figura casi circular y no diría nada.
 */
export function radarSVG(sca, { size = 360 } = {}) {
  // El lienzo es MÁS ANCHO que alto: los rótulos de los lados («Sabor residual»,
  // «Taza limpia») salen del radio y con un lienzo cuadrado se cortaban contra
  // el borde del panel.
  const W = Math.round(size * 1.26);
  const H = size;
  const cx = W / 2;
  const cy = H / 2 + 2;
  const R = size * 0.30;
  const MIN = 6;
  const MAX = 10;
  const n = ATRIBUTOS.length;
  const ang = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const radio = (v) => (Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN) * R;
  const punto = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const fmt = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;

  const anillos = [7, 8, 9, 10]
    .map((v) => {
      const p = ATRIBUTOS.map((_, i) => fmt(punto(i, radio(v)))).join(" ");
      return `<polygon points="${p}" fill="none" stroke="#4b4468" stroke-width="1" opacity="${v === 10 ? 0.85 : 0.45}"/>`;
    })
    .join("");

  const ejes = ATRIBUTOS.map((_, i) => {
    const [x, y] = punto(i, R);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#4b4468" stroke-width="1" opacity="0.5"/>`;
  }).join("");

  const valores = ATRIBUTOS.map((a, i) => punto(i, radio(sca[a.clave])));
  const figura = `<polygon points="${valores.map(fmt).join(" ")}" fill="#6f60a8" fill-opacity="0.55" stroke="#cbbef2" stroke-width="2.5" stroke-linejoin="round"/>`;
  const puntos = valores.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#FFCD00"/>`).join("");

  const rotulos = ATRIBUTOS.map((a, i) => {
    const [x, y] = punto(i, R + 22);
    const anclaje = Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end";
    const dy = y < cy - R * 0.6 ? -2 : y > cy + R * 0.6 ? 10 : 4;
    return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anclaje}" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;fill:#c9c2e6">${a.etiqueta}</text>
      <text x="${x.toFixed(1)}" y="${(y + dy + 12).toFixed(1)}" text-anchor="${anclaje}" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;fill:#FFCD00">${sca[a.clave].toFixed(2)}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#1e1b2e"/>
    ${anillos}${ejes}${figura}${puntos}${rotulos}
  </svg>`;
}
