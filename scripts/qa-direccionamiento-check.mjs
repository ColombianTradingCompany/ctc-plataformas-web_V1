// Guardián de ECP · Direccionamiento, contra el CÓDIGO REAL
// (src/lib/direccionamiento/memoria.ts + src/lib/grados/definicion.ts + el
// cliente compartido de Claude).
//
// POR QUÉ EXISTE. El módulo vive detrás del login maestro con OTP por correo,
// así que —igual que el BCP y el taller del Estudio— no se puede conducir en un
// navegador automatizado. Lo que sí se puede es ejercitar TODO lo que hay
// detrás del botón «Dame una mano» menos la compuerta de sesión: el texto de la
// memoria, el system prompt, la llamada real al modelo y el contrato de JSON
// que el componente espera de vuelta.
//
// LA COMPROBACIÓN QUE IMPORTA. El componente vendorizado trae embebido un
// contexto de compañía donde los grados están citados como ÍNDICE DE PRECIO
// sobre base 100. Este guardián LEE ESE PÁRRAFO DEL ARCHIVO REAL, lo mete en el
// prompt tal cual —igual que hace el componente— y comprueba que la memoria
// gana: que el modelo cita la escala SCA y no el índice de precio. Si alguien
// resincroniza el .jsx con una versión nueva del autor y el conflicto cambia,
// esto se entera.
//
// Correr:
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-direccionamiento-check.mjs
//   ... --live    para incluir la llamada REAL a la API (consume tokens)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { textoMemoria, escalaCanonica, SISTEMA_REDACCION } from "../src/lib/direccionamiento/memoria.ts";
import { GRADOS, SCA_MINIMO, SCA_MAXIMO } from "../src/lib/grados/definicion.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = process.argv.includes("--live");

let pass = 0, fail = 0;
const check = (name, cond, detalle) => {
  if (cond) { pass++; console.log("  ok  ", name); }
  else { fail++; console.error("  FAIL", name, detalle ? `\n        ${detalle}` : ""); }
};

/* ── 1. La memoria, contra la fuente única ────────────────────────────────── */
console.log("\n1 · El texto de la memoria");

const mem = textoMemoria();

for (const g of GRADOS) {
  check(`cita ${g.nombre} con su rango real (${g.scaMin}–${g.scaMax})`,
    mem.includes(`${g.nombre} (SCA ${g.scaMin}–${g.scaMax})`));
}
check("dice que PREVALECE sobre el contexto de compañía", /prevalece/i.test(mem));
check("dice explícitamente que no es un índice de precio", /no de un índice de precio/i.test(mem));
check("prohíbe inventar o redondear un umbral", /nunca inventes ni redondees un umbral/i.test(mem));
check(`declara la escala completa ${SCA_MINIMO}–${SCA_MAXIMO}`,
  mem.includes(`de ${SCA_MINIMO} a ${SCA_MAXIMO}`));
check("la escala sale de definicion.ts, no de una copia", mem.includes(escalaCanonica()));

// El índice de precio NO puede haberse colado en la memoria.
const CIFRAS_DE_PRECIO = ["105", "110–125", "125–135", "135–150", "150–200"];
check("la memoria no repite el índice de precio",
  !CIFRAS_DE_PRECIO.some((c) => mem.includes(c)),
  CIFRAS_DE_PRECIO.filter((c) => mem.includes(c)).join(" · "));

check("el system prompt exige JSON sin vallas de markdown",
  /ÚNICAMENTE con el JSON/.test(SISTEMA_REDACCION) && /sin vallas de markdown/.test(SISTEMA_REDACCION));

/* ── 2. El conflicto, leído del archivo del autor ──────────────────────────── */
console.log("\n2 · El párrafo en conflicto: RETIRADO con el módulo vendorizado (V4.32)");

/* Esta sección comprobaba que el `.jsx` vendorizado siguiera trayendo su propio
   párrafo sobre los Grados —que los citaba como ÍNDICE DE PRECIO sobre base 100,
   contradiciendo la definición de la casa— y que nadie lo hubiera "arreglado"
   editando el archivo del autor en vez de la memoria del sistema.

   Ya no aplica. El rework de F7 (V4.32) retiró el módulo vendorizado entero: la
   pantalla es ahora un componente de la casa (`DefinicionDeContexto.tsx`) que no
   embebe ningún párrafo de grados. Con él desapareció el riesgo que la sección
   vigilaba — no queda archivo de tercero que alguien pueda tocar.

   ⚠️ NOTA HISTÓRICA, porque explica dos fallos que estuvieron encendidos mucho
   tiempo: esta sección llevaba en 2/3 desde antes del 2026-08-18. El `.jsx` ya no
   contenía aquel párrafo —el autor lo habría cambiado en alguna resincronización—,
   así que el guardián comprobaba una premisa que había dejado de ser cierta y
   nadie lo miró. **Un guardián que falla y se ignora es peor que no tenerlo:
   enseña a ignorar los fallos.**

   LO QUE SÍ SIGUE PROTEGIDO es lo que de verdad importaba, y está en la sección
   1: que la MEMORIA del sistema inyecte la escala SCA canónica desde
   `lib/grados/definicion.ts` y le diga al modelo que prevalece. Eso vale para
   cualquier texto que se redacte, venga de donde venga el contexto. */
check(
  "el módulo vendorizado ya no existe",
  !existsSync(join(RAIZ, "src/components/panel/direccionamiento/DefinicionDeContexto.jsx"))
);
check(
  "y la pantalla que lo sustituye no embebe su propio párrafo de grados",
  !readFileSync(join(RAIZ, "src/components/panel/direccionamiento/DefinicionDeContexto.tsx"), "utf8").includes(
    "GRADOS DE CALIDAD CTC"
  )
);

/* ── 3. La llamada real ────────────────────────────────────────────────────── */
if (!LIVE) {
  console.log("\n3 · Llamada al modelo: OMITIDA (pasa --live para ejecutarla)");
} else {
  console.log("\n3 · La llamada REAL al modelo (consume tokens)");
  const { claude, parseJson, MODEL_WRITE } = await import("../src/lib/coffeed/claude.ts");

  // El prompt se arma como lo arma el componente: contexto de compañía (con su
  // párrafo equivocado), memoria del sistema, brief, pieza, campo y tarea.
  const prompt = `Eres el estratega de contenido y copy de Colombian Trading Company. Escribes en español de Colombia.

<contexto_compania>
${parrafoEmbebido}
</contexto_compania>

<memoria_del_sistema>
${mem}
</memoria_del_sistema>

<brief_general>
Objetivo de la realineación: que el tostador europeo entienda qué significa cada grado.
</brief_general>

<pieza>
Unidad de negocio: CHP — Cherry Picked (En Europa · para el tostador). Audiencia: tostadurías de especialidad.
Formato: Video largo — 5–6 min · pieza madre. Pieza 1 de 1.
</pieza>

<campo>
Bloque: ¿Cuál es el producto?
Campo: "Promesa en una frase" — Lo que se lleva quien mira.
</campo>

<borrador_del_usuario>
(vacío)
</borrador_del_usuario>

Tarea: propón 3 redacciones alternativas para ese campo. CADA UNA debe citar el rango numérico exacto de al menos un grado de calidad CTC. Concretas, en la voz de la marca, sin superlativos vacíos.

Responde ÚNICAMENTE con un array JSON, sin markdown:
[{"titulo":"ángulo en 2-4 palabras","texto":"la redacción propuesta"}]`;

  const t0 = Date.now();
  let crudo;
  try {
    crudo = await claude({ model: MODEL_WRITE, system: SISTEMA_REDACCION, user: prompt, maxTokens: 2000 });
  } catch (e) {
    fail++;
    console.error("  FAIL  la llamada al modelo falló:", e.message);
    console.log(`\n${pass} ok · ${fail} fail`);
    process.exit(1);
  }
  console.log(`  (respuesta en ${((Date.now() - t0) / 1000).toFixed(1)} s)`);

  // El contrato exacto que el componente espera: parseJson y un array de items.
  let items;
  try { items = parseJson(crudo); } catch (e) { items = null; }
  check("la respuesta pasa por parseJson (lo que hace el Server Action)", !!items);
  check("es un array", Array.isArray(items));
  check("cada item trae titulo y texto (el contrato del componente)",
    Array.isArray(items) && items.length > 0 && items.every((i) => typeof i?.titulo === "string" && typeof i?.texto === "string"));

  const texto = JSON.stringify(items ?? "");
  const scaCitados = GRADOS.filter((g) => texto.includes(String(g.scaMin)) || texto.includes(String(g.scaMax)));
  const precioCitados = CIFRAS_DE_PRECIO.filter((c) => texto.includes(c.replace("–", "-")) || texto.includes(c));

  check("LA MEMORIA GANA: cita al menos un rango SCA real", scaCitados.length > 0,
    `grados citados: ${scaCitados.map((g) => g.nombre).join(", ") || "ninguno"}`);
  check("LA MEMORIA GANA: no cita el índice de precio del contexto embebido",
    precioCitados.length === 0, `coladas: ${precioCitados.join(" · ")}`);

  console.log("\n  --- lo que respondió ---");
  (Array.isArray(items) ? items : []).forEach((i, n) => console.log(`  ${n + 1}. [${i.titulo}] ${i.texto}`));
}

console.log(`\n${pass} ok · ${fail} fail`);
process.exit(fail ? 1 : 0);
