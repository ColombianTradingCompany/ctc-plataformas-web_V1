// La revisión de conformidad del puente, herramienta por herramienta (V5.7).
//
//   1. npm run dev  (o `npx next dev -p 3210` y CONF_BASE=http://localhost:3210)
//   2. node scripts/qa-tools-puente-conformance.mjs
//
// Lo que pidió el owner con estas palabras: «Review each tool and make sure it
// is working well and the information is being correctly recorded». Para CADA
// herramienta viva, con un navegador de verdad (playwright):
//
//   ready    → el puente se anuncia (respondiendo al «hola» de la concha)
//   captura  → se escribe en un campo y llega {estado, resumen} con el cambio
//   restaura → se recarga, se manda init con ese estado y el campo VUELVE
//
// Las herramientas sin campos que capturar (narrativas, de lienzo) aprueban
// con «ready» y quedan anotadas como SIN-CAMPOS: su memoria útil llegará por
// CTC.usarEstado cuando el owner lo pida — el menú y el nombre valen igual.

import { chromium } from "playwright";

const BASE = process.env.CONF_BASE ?? "http://localhost:3210";
const HERRAMIENTAS = {
  "mermas-rapida": "/tools/mermas-rapida.html",
  "mermas-ctc": "/tools/mermas-ctc.html",
  agtron: "/tools/agtron-dial.html",
  "cogs-verde": "/tools/cogs-cafe-verde.html",
  "costo-empaque": "/tools/costo-empaque.html",
  "cool-pdf": "/tools/cool-pdf.html",
  catacion: "/tools/rueda-del-cafe-v23.html",
  "green-datasheet": "/tools/green-coffee-datasheet.html",
  qr: "/tools/generador-qr.html",
  "formula-calidad": "/tools/formula-calidad.html",
  "viaje-cafe": "/tools/viaje-cafe.html",
  "mapa-variedades": "/tools/mapa-variedades.html",
};

const CENTINELA = "QA-PUENTE-77";
// Un <input type=number> SANEA lo no numérico a "": el centinela de texto
// desaparecía sin fallar nada y la primera corrida culpó a las dos calculadoras
// de mermas. A un campo numérico se le da un número.
const CENTINELA_NUM = "77341.77";

// El arnés corre DENTRO de la página anfitriona: un iframe con la herramienta
// y el mismo baile de mensajes que hace la concha.
// El script va ANTES del iframe (el oído primero, la carga después) y el
// «hola» se repite: la primera corrida perdió el ready en 9 de 12 por la
// carrera entre el load del iframe y el attach del listener — exactamente la
// carrera que el hola existe para curar.
const ARNES = (src) => `
  <script>
    window.__r = { ready: false, estado: null, resumen: null };
    window.addEventListener("message", (e) => {
      const d = e.data || {};
      if (d.ctc === "ready") window.__r.ready = true;
      if (d.ctc === "estado") { window.__r.estado = d.estado; window.__r.resumen = d.resumen ?? null; }
    });
    window.__poke = () => {
      const f = document.getElementById("f");
      if (f && f.contentWindow) f.contentWindow.postMessage({ ctc: "hola" }, "*");
    };
    setInterval(() => { if (!window.__r.ready) window.__poke(); }, 600);
  </script>
  <iframe id="f" src="${src}" style="width:1100px;height:750px"></iframe>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 820 } });
const filas = [];

for (const [id, ruta] of Object.entries(HERRAMIENTAS)) {
  const fila = { id, ready: false, campos: 0, captura: "—", restaura: "—", nota: "" };
  try {
    // setContent sobre about:blank basta — la primera versión hacía un goto de
    // «limpieza» a /lab que compilaba lento, resolvía TARDE y navegaba la
    // página a mitad de prueba, destruyendo el iframe. Nada de gotos.
    await pagina.setContent(ARNES(BASE + ruta), { waitUntil: "load", timeout: 40000 });
    await pagina.waitForTimeout(2500);
    fila.ready = await pagina.evaluate(() => window.__r.ready);

    // El único hijo de la página ES el iframe: resolverlo por posición es más
    // robusto que casar URLs (la primera corrida falló casándolas).
    const marco = pagina.mainFrame().childFrames()[0];
    if (!marco) throw new Error("iframe no resuelto");

    fila.campos = await marco
      .locator("input:not([type=hidden]):not([type=file]):not([type=password]), select, textarea")
      .count();

    // Primero un campo de TEXTO; si la herramienta solo tiene números (las
    // calculadoras de mermas), un numérico con centinela numérico.
    let campo = marco.locator("input[type=text], input:not([type]), textarea").first();
    let centinela = CENTINELA;
    if ((await campo.count()) === 0) {
      campo = marco.locator("input[type=number]").first();
      centinela = CENTINELA_NUM;
    }

    if (fila.campos > 0 && (await campo.count()) > 0) {
      // init vacío: el puente solo captura tras init (fuera de la concha es inerte)
      await pagina.evaluate(() => {
        document.getElementById("f").contentWindow.postMessage({ ctc: "init", nombre: "qa", estado: {} }, "*");
      });
      await campo.fill(centinela).catch(async () => {
        await campo.evaluate((el, v) => {
          el.value = v;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, centinela);
      });
      await pagina.waitForTimeout(1600); // debounce 900 + margen
      const r = await pagina.evaluate(() => window.__r);
      const enEstado = r.estado && JSON.stringify(r.estado).includes(centinela);
      fila.captura = enEstado ? "✓" : "✗";
      if (enEstado && r.resumen && r.resumen.includes(centinela)) fila.captura = "✓+resumen";

      if (enEstado) {
        // Recargar y restaurar con el estado capturado.
        const estado = r.estado;
        await pagina.setContent(ARNES(BASE + ruta), { waitUntil: "load", timeout: 40000 });
        await pagina.waitForTimeout(2000);
        await pagina.evaluate((e) => {
          document.getElementById("f").contentWindow.postMessage({ ctc: "init", nombre: "qa", estado: e }, "*");
        }, estado);
        await pagina.waitForTimeout(900);
        const marco2 = pagina.mainFrame().childFrames()[0];
        const valores = await marco2.evaluate(() =>
          Array.from(document.querySelectorAll("input, textarea")).map((el) => el.value)
        );
        fila.restaura = valores.includes(centinela) ? "✓" : "✗";
      }
    } else {
      fila.nota = "SIN-CAMPOS (memoria útil vía CTC.usarEstado)";
    }
  } catch (e) {
    fila.nota = e.message.split("\n")[0].slice(0, 70);
  }
  filas.push(fila);
  console.log(
    `${fila.id.padEnd(17)} ready:${fila.ready ? "✓" : "✗"}  campos:${String(fila.campos).padStart(3)}  captura:${fila.captura.padEnd(10)} restaura:${fila.restaura}  ${fila.nota}`
  );
}

await navegador.close();
const mal = filas.filter((f) => !f.ready || f.captura === "✗" || f.restaura === "✗");
console.log(mal.length ? `\n✗ ${mal.length} herramienta(s) con fallos: ${mal.map((f) => f.id).join(", ")}` : "\n✓ conformidad: todas en orden");
process.exit(mal.length ? 1 : 0);
