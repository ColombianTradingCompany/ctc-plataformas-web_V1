// Guardián del log de arquitectura (2026-09-11, ALINEACION §5).
//
//   node scripts/qa-arqlog-check.mjs
//
// Con desarrollos en paralelo, el ASIENTO del mapa interactivo lo escribe el
// componente que despliega, en el mismo commit que sube APP_VERSION; el WRAP
// lo compila la vía plataforma. Lo que este guardián exige es lo primero: toda
// versión del CHANGELOG posterior al último wrap tiene que estar mencionada en
// el log vigente (`docs/architecture/Log_Documentacion_Interactiva_V<N>.txt`).
// Nació porque V5.25–V5.30 se desplegaron desde seis sesiones distintas y
// ninguna dejó asiento — el mapa quedó seis versiones atrás sin que nada
// avisara.

import { readFileSync, readdirSync } from "node:fs";

const raiz = new URL("../", import.meta.url);
const lee = (r) => readFileSync(new URL(r, raiz), "utf8");

const logs = readdirSync(new URL("docs/architecture/", raiz))
  .map((f) => f.match(/^Log_Documentacion_Interactiva_V(\d+)\.txt$/))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const n = Math.max(...logs);
const log = lee(`docs/architecture/Log_Documentacion_Interactiva_V${n}.txt`);

// La cabecera del log dice sobre qué versión de la plataforma se cerró el wrap.
const base = log.match(/plataforma V(\d+)\.(\d+)/);
if (!base) {
  console.error(`✗ qa-arqlog: el log V${n} no declara «plataforma VN.N» en su cabecera`);
  process.exit(1);
}
const [bMaj, bMin] = [Number(base[1]), Number(base[2])];
const posterior = (maj, min) => maj > bMaj || (maj === bMaj && min > bMin);

const changelog = lee("CHANGELOG.md");
const versiones = [...changelog.matchAll(/^## \[V(\d+)\.(\d+)\]/gm)]
  .map((m) => [Number(m[1]), Number(m[2])])
  .filter(([maj, min]) => posterior(maj, min));

const sinAsiento = versiones.filter(([maj, min]) => !new RegExp(`V${maj}\\.${min}(?!\\d)`).test(log));

const total = versiones.length;
if (sinAsiento.length) {
  console.error(`✗ qa-arqlog: ${sinAsiento.length}/${total} versiones posteriores al wrap V${n} (plataforma V${bMaj}.${bMin}) NO tienen asiento en Log V${n}:`);
  for (const [maj, min] of sinAsiento) console.error(`  · V${maj}.${min} — añade «## [fecha] V${maj}.${min} · …» al log en el mismo commit que la versión`);
  process.exit(1);
}
console.log(`✓ qa-arqlog: ${total}/${total} versiones desde el wrap V${n} (plataforma V${bMaj}.${bMin}) con asiento en el log`);
