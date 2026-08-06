// Comprobaciones de lógica pura de RT-Scriptor, contra el CÓDIGO REAL
// (src/components/coffeed/rtscriptor/model.ts + src/lib/coffeed/rtsPrevis.ts).
// El Estudio vive detrás de una credencial de socio, así que igual que el BCP no
// se puede recorrer con un navegador automatizado: esto guarda las reglas que
// comparten el taller y el servidor.
//
// Además escribe tres fotogramas de muestra en --out para poder MIRAR lo que
// produce «Acción» sin levantar la app.
//
// Correr: node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-rtscriptor-check.mjs [--out DIR]
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as m from "../src/components/coffeed/rtscriptor/model.ts";
import { previsFrame, frameTimes } from "../src/lib/coffeed/rtsPrevis.ts";

let pass = 0,
  fail = 0;
const check = (name, cond) => {
  if (cond) pass++;
  else {
    fail++;
    console.error("FAIL:", name);
  }
};

const take = (o) => ({
  id: o.id,
  sceneId: o.sceneId,
  no: o.no ?? 1,
  status: o.status ?? "open",
  cast: o.cast ?? ["A"],
  direction: o.direction ?? "",
  dur: o.dur ?? 30,
  cam: { ...m.CAMERA_DEFAULT, ...(o.shot ? m.applyShot(m.CAMERA_DEFAULT, o.shot) : {}), ...(o.cam ?? {}) },
  treatment: o.treatment ?? "normal",
  marks: o.marks ?? {},
});

const P = {
  id: "p1", slug: "p1", title: "Prueba", code: "PR", aspect: "16:9", seriesId: null, deckId: null, updatedAt: "",
  characters: [
    { id: "A", name: "Ana", role: "Protagonista", bio: "", color: "#E4472C", traits: [], pics: { profile: null, body: null, detail: null } },
    { id: "B", name: "Beto", role: "Apoyo", bio: "", color: "#4DD0C4", traits: [], pics: { profile: null, body: null, detail: null } },
  ],
  escenarios: [
    { id: "e1", name: "El patio", int: "EXT", location: "PATIO DE SECADO", tod: "AMANECER", note: "", palette: [], props: [{ propId: "pr1", x: 60, z: 90 }] },
  ],
  props: [
    { id: "pr1", name: "Marquesina", note: "", color: "#E0A73C", w: 200, h: 90, d: 120, ownerId: null },
    { id: "pr2", name: "Libro de cuentas", note: "", color: "#4DD0C4", w: 25, h: 4, d: 18, ownerId: "A" },
  ],
  scenes: [
    { id: "s1", title: "Patio", escenarioId: "e1", int: "EXT", location: "PATIO DE SECADO", tod: "AMANECER", cast: ["A", "B"], synopsis: "El café se voltea." },
    { id: "s2", title: "Bodega", escenarioId: null, int: "INT", location: "BODEGA", tod: "DÍA", cast: ["A"], synopsis: "Se pesa el lote." },
  ],
  storylines: [{ id: "sl1", name: "El lote", color: "#E4472C", note: "", cast: ["A"], sceneIds: ["s1", "s2"], keys: {} }],
  takes: [
    take({ id: "t1", sceneId: "s1", no: 1, status: "printed", dur: 40, cast: ["A", "B"] }),
    take({ id: "t2", sceneId: "s1", no: 2, status: "printed", dur: 20, cast: ["A"] }),
    take({ id: "t3", sceneId: "s1", no: 3, status: "ng", dur: 300, cast: ["A"] }),
    take({ id: "t4", sceneId: "s2", no: 1, status: "held", dur: 50, cast: ["A"] }),
    take({ id: "t5", sceneId: "s2", no: 2, status: "open", dur: 70, cast: ["A"] }),
  ],
  dialogue: {},
  voiceovers: {},
};

/* ── nota 1 · la duración se deriva de las tomas ─────────────────────────── */
const s1 = m.sceneLength(m.takesOfScene(P, "s1"));
check("escena con buenas = suma de las buenas (40+20)", s1.seconds === 60 && s1.provisional === false && s1.printed === 2);
check("la NG no suma aunque sea la más larga", s1.seconds === 60);

const s2 = m.sceneLength(m.takesOfScene(P, "s2"));
check("sin buenas = la toma más larga, marcada provisional", s2.seconds === 70 && s2.provisional === true);

check("escena sin tomas mide 0 y es provisional", m.sceneLength([]).seconds === 0 && m.sceneLength([]).provisional === true);
check("metraje del proyecto = suma de escenas (60+70)", m.projectDuration(P) === 130);
check("withDur devuelve la marca de provisional", m.withDur(P).find((s) => s.id === "s2").provisional === true);

/* ── reglas ─────────────────────────────────────────────────────────────── */
const flags = m.checkProject(P);
check("una escena provisional avisa", flags.some((f) => f.code === "duración provisional" && f.id === "s2"));
check("un hilo de 2 escenas NO bloquea", !flags.some((f) => f.code === "hilo delgado"));

const thin = { ...P, storylines: [{ ...P.storylines[0], sceneIds: ["s1"] }] };
check("un hilo de 1 escena bloquea", m.checkProject(thin).some((f) => f.kind === "block" && f.code === "hilo delgado"));

const offCast = { ...P, takes: P.takes.map((t) => (t.id === "t4" ? { ...t, cast: ["A", "B"] } : t)) };
check("reparto de toma fuera del reparto de escena bloquea", m.checkProject(offCast).some((f) => f.kind === "block" && f.code === "fuera de la escena"));
check("checkTake bloquea una toma vacía", m.checkTake(P, take({ id: "x", sceneId: "s1", cast: [] })).some((f) => f.kind === "block"));
check("checkTake bloquea duración 0", m.checkTake(P, take({ id: "x", sceneId: "s1", dur: 0 })).some((f) => f.code === "sin duración"));

/* ── nota 4 · guion → mandos ─────────────────────────────────────────────── */
const draft = m.draftOfProject(P);
check("el borrador trae una entrada por escena", draft.length === 2);
check("la toma que representa la escena es la BUENA", m.leadTake(P, "s1").id === "t1");

// «cuatro tiempos» = 8 s y no 4, que es el valor por defecto del plano a dos:
// una propuesta que no cambia nada NO debe proponerse, y aquí se comprueba
// justo eso eligiendo un número distinto del que ya hay.
const d2 = draft.map((d) => (d.sceneId === "s1" ? { ...d, direction: "Cámara en mano, cerrada sobre sus manos. 85mm. Sostener cuatro tiempos." } : d));
const props = m.deriveProposals(P, d2);
const has = (op) => props.some((p) => p.op.op === op);
check("«cámara en mano» → tratamiento", props.some((p) => p.op.op === "take.treatment" && p.op.value === "handheld"));
check("«cerrada sobre» → primer plano", props.some((p) => p.op.op === "take.shot" && p.op.value === "cu"));
check("«85mm» → óptica", props.some((p) => p.op.op === "take.cam" && p.op.key === "lens" && p.op.value === 85));
check("«sostener cuatro tiempos» → 8 s", props.some((p) => p.op.op === "take.cam" && p.op.key === "hold" && p.op.value === 8));
check("un valor que ya está NO se propone", m.deriveProposals(P, draft.map((d) => (d.sceneId === "s1" ? { ...d, direction: "Sostener cuatro segundos." } : d))).every((p) => !(p.op.op === "take.cam" && p.op.key === "hold")));
check("la dirección literal también se propone", has("take.direction"));
check("todas las propuestas de regla vienen etiquetadas", props.every((p) => p.source === "regla"));

// Sin cambios no hay propuestas: el empujón no debe inventar trabajo.
check("un borrador idéntico no propone nada", m.deriveProposals(P, draft).length === 0);

// Aplicar es puro y no toca lo que no le toca.
let applied = P;
for (const p of props) applied = m.applyProposal(applied, p.op);
check("aplicar cambió el tratamiento de t1", applied.takes.find((t) => t.id === "t1").treatment === "handheld");
check("aplicar dejó t4 intacta", applied.takes.find((t) => t.id === "t4").treatment === "normal");
check("aplicar no tocó el original", P.takes.find((t) => t.id === "t1").treatment === "normal");
check("la óptica quedó en la cámara", applied.takes.find((t) => t.id === "t1").cam.lens === 85);
check("el encuadre movió la cámara de verdad", applied.takes.find((t) => t.id === "t1").cam.dist === m.SHOTS.find((s) => s.key === "cu").cam.dist);

// Una línea marcada (V.O.) sale del diálogo y entra en la voz en off.
const withDlg = { ...P, dialogue: { t1: [{ c: "A", line: "Hola." }] } };
const dv = m.draftOfProject(withDlg).map((d) =>
  d.sceneId === "s1"
    ? { ...d, dialogue: [{ c: "A", line: "Hola." }, { c: "B", line: "(V.O.) Yo ya no estaba." }, { c: "A", line: "¿Quién habló?" }] }
    : d
);
const pv = m.deriveProposals(withDlg, dv);
check("la línea (V.O.) se propone como voz en off", pv.some((p) => p.op.op === "vo.set" && p.op.items.some((i) => i.text === "Yo ya no estaba.")));
check("y NO se queda en el diálogo", pv.some((p) => p.op.op === "dialogue.set" && p.op.lines.length === 2 && p.op.lines.every((l) => !l.line.includes("V.O."))));

/* ── hidratación defensiva y migración de la cámara (V3.1 → V3.2) ────────── */
const old = m.hydrateDoc({
  characters: [{ id: "A", name: "Ana", role: "", bio: "", color: "#fff" }],
  takes: [
    { id: "t", sceneId: "s", no: 1, status: "open", shot: "cu", lens: "Cámara en mano", direction: "", params: { cu: [110, 20, 60, 6] } },
    { id: "u", sceneId: "s", no: 2, status: "open", shot: "two", lens: "Cenital", direction: "" },
  ],
});
check("un personaje viejo gana sus tres huecos de foto", old.characters[0].pics.profile === null && "detail" in old.characters[0].pics);
check("una toma vieja gana una duración por defecto", old.takes[0].dur === 45);
check("hydrateDoc rellena las colecciones que faltan", Array.isArray(old.scenes) && typeof old.voiceovers === "object");
check("el `shot` viejo se traduce a una posición de cámara", old.takes[0].cam.dist === m.SHOTS.find((s) => s.key === "cu").cam.dist);
check("el modo «Cámara en mano» pasa a tratamiento", old.takes[0].treatment === "handheld");
check("la óptica guardada sobrevive a la migración", old.takes[0].cam.lens === 110);
check("el sostener guardado sobrevive", old.takes[0].cam.hold === 6);
check("el modo «Cenital» pasa a ser un encuadre", old.takes[1].cam.height === m.SHOTS.find((s) => s.key === "cenital").cam.height);
check("una toma ya migrada no se vuelve a migrar", m.hydrateDoc({ takes: [old.takes[0]] }).takes[0].cam.lens === 110);

/* ── la cámara ───────────────────────────────────────────────────────────── */
const camOf = (o) => ({ ...m.CAMERA_DEFAULT, ...o });
const stageOf = (cam, actors = [{ id: "A", color: "#E4472C", mark: { x: 0, z: 0 }, height: 172 }], treatment = "normal") =>
  m.composeStage({ cam, treatment, actors, props: [], palette: { sky: "#1B2A33", ground: "#141A1B", ink: "#C9C6BD" }, aspect: "16:9", width: 640 });

// El encuadre por defecto: la cámara APUNTA al pecho, así que el pecho cae en
// el centro y la cabeza queda por encima. Sin esta comprobación un signo
// cambiado en la inclinación pasa por «le falta encuadre» y no por un bug.
const framed = stageOf(camOf({ dist: 340, height: 160, lens: 35 }));
check("el sujeto queda dentro del cuadro", framed.hits[0].x > 0 && framed.hits[0].x < framed.w && framed.hits[0].y > 0 && framed.hits[0].y < framed.h);
check("la cabeza cae por encima del centro", framed.hits[0].y < framed.h / 2);
check("y el sujeto está centrado horizontalmente", Math.abs(framed.hits[0].x - framed.w / 2) < 1);
// Inclinar la cámara HACIA ABAJO deja al sujeto por encima del eje óptico, así
// que sube en el cuadro. Es contraintuitivo al escribirlo y por eso se fija.
check("inclinar hacia abajo sube al sujeto en el cuadro", stageOf(camOf({ dist: 340, height: 160, lens: 35, tilt: -20 })).hits[0].y < framed.hits[0].y);
check("inclinar hacia arriba lo baja", stageOf(camOf({ dist: 340, height: 160, lens: 35, tilt: 20 })).hits[0].y > framed.hits[0].y);
check("subir la cámara sin tocar nada más mantiene al sujeto encuadrado", (() => {
  const s = stageOf(camOf({ dist: 340, height: 420, lens: 35 })).hits[0];
  return s.y > 0 && s.y < 720 * 0.9;
})());

const near = stageOf(camOf({ dist: 120 })).hits[0];
const far = stageOf(camOf({ dist: 900 })).hits[0];
check("acercarse agranda al sujeto", near.r > far.r * 2);

const front = stageOf(camOf({ orbit: 0 })).hits[0];
const side = stageOf(camOf({ orbit: 90, dist: 320 })).hits[0];
check("orbitar no cambia el tamaño de quien está en el centro", Math.abs(front.r - side.r) < 0.5);

const twoA = stageOf(camOf({ orbit: 0, dist: 320 }), [
  { id: "A", color: "#E4472C", mark: { x: -80, z: 0 }, height: 172 },
  { id: "B", color: "#4DD0C4", mark: { x: 80, z: 0 }, height: 172 },
]);
const twoB = stageOf(camOf({ orbit: 90, dist: 320 }), [
  { id: "A", color: "#E4472C", mark: { x: -80, z: 0 }, height: 172 },
  { id: "B", color: "#4DD0C4", mark: { x: 80, z: 0 }, height: 172 },
]);
const spread = (s) => Math.abs(s.hits[0].x - s.hits[1].x);
check("de perfil, dos personas en línea se solapan", spread(twoB) < spread(twoA) / 3);

check("un tele encuadra más cerrado que un angular", stageOf(camOf({ lens: 135 })).hits[0].r > stageOf(camOf({ lens: 18 })).hits[0].r * 3);
check("la rodadura avisa", stageOf(camOf({ roll: 20 })).notes.some((n) => n.includes("torcido")));
check("el POV pone bandas", stageOf(camOf({}), undefined, "pov").prims.filter((p) => p.k === "rect").length >= 3);
check("el desvío saca al sujeto del centro", Math.abs(stageOf(camOf({ pan: 40 })).hits[0].x - 320) > 80);
check("un preset es una posición de cámara", m.applyShot(m.CAMERA_DEFAULT, "cenital").height === 620);
check("matchShot reconoce el preset aplicado", m.matchShot(m.applyShot(m.CAMERA_DEFAULT, "ots")) === "ots");
check("y deja de reconocerlo si mueves un mando", m.matchShot({ ...m.applyShot(m.CAMERA_DEFAULT, "ots"), dist: 999 }) === null);
check("la cámara en mano tiembla de forma DETERMINISTA", JSON.stringify(stageOf(camOf({}), undefined, "handheld").prims) === JSON.stringify(stageOf(camOf({}), undefined, "handheld").prims));
check("y de verdad tiembla", JSON.stringify(stageOf(camOf({}), undefined, "handheld").prims) !== JSON.stringify(stageOf(camOf({}), undefined, "normal").prims));

/* ── nota 6 · fotogramas ─────────────────────────────────────────────────── */
check("frameTimes reparte e incluye los extremos", JSON.stringify(frameTimes(60, 4)) === JSON.stringify([0, 20, 40, 60]));
check("un solo fotograma cae en el medio", frameTimes(60, 1)[0] === 30);

const deck = { id: "d", name: "Patio y sol", descriptors: ["luz dura", "polvo"], palette: ["#2A1F14", "#7A5B34", "#E6D3A3"], images: [] };
const svg = previsFrame({ project: P, scene: P.scenes[0], take: P.takes[0], deck, n: 2, frames: 4, at: 20, sceneNo: 1 });
check("el fotograma es un SVG", svg.startsWith("<svg") && svg.endsWith("</svg>"));
check("lleva quemado el pie de escena", svg.includes("PATIO DE SECADO"));
check("lleva el timecode del instante", svg.includes("00:20"));
check("usa la paleta de la baraja", svg.includes("#7A5B34"));

// Lo que de verdad importa de la unificación: el archivo revelado y el cuadro
// que se ve en la app salen de la MISMA composición.
const live = m.composeStage({
  cam: P.takes[0].cam,
  treatment: P.takes[0].treatment,
  actors: P.takes[0].cast.map((cid, i) => ({ id: cid, color: P.characters.find((c) => c.id === cid).color, mark: m.MARK_DEFAULT(i, P.takes[0].cast.length), height: 172 })),
  props: [],
  palette: { ground: deck.palette[0], sky: deck.palette[1], ink: deck.palette[2] },
  aspect: P.aspect,
  phase: 1 / 3,
});
check("el fotograma revelado ES el cuadro de la app", svg.includes(live.prims.filter((p) => p.k === "poly").length ? live.prims.find((p) => p.k === "poly").pts[0][0].toFixed(1) : ""));

const prompt = m.framePrompt({ project: P, scene: P.scenes[0], take: P.takes[0], deck, n: 1, frames: 1 });
check("el prompt describe la cámara en palabras", prompt.includes("Cámara de frente") || prompt.includes("de frente"));
check("el prompt lleva la óptica y la distancia", prompt.includes("mm") && prompt.includes("cm del sujeto"));
check("el prompt lleva la baraja", prompt.includes("Patio y sol") && prompt.includes("luz dura"));
check("el prompt nombra a quien está en cuadro y dónde", prompt.includes("Ana") && prompt.includes("Beto") && prompt.includes("profundidad"));

/* ── escenarios y props (V3.3) ───────────────────────────────────────────── */
check("el encabezado sale del ESCENARIO cuando lo hay", m.sceneHeading(P, P.scenes[0]).location === "PATIO DE SECADO" && m.sceneHeading(P, P.scenes[0]).int === "EXT");
check("sin escenario, sale de la escena", m.sceneHeading(P, P.scenes[1]).location === "BODEGA");
check("el momento del día es de la ESCENA aunque el escenario proponga otro", m.sceneHeading({ ...P, escenarios: [{ ...P.escenarios[0], tod: "NOCHE" }] }, P.scenes[0]).tod === "AMANECER");
check("cambiar el escenario cambia el encabezado de todas sus escenas", m.sceneHeading({ ...P, escenarios: [{ ...P.escenarios[0], location: "OTRO SITIO" }] }, P.scenes[0]).location === "OTRO SITIO");

const sp = m.sceneProps(P, P.scenes[0], ["A", "B"]);
check("el decorado del escenario entra en la escena", sp.some((x) => x.prop.id === "pr1" && x.x === 60 && x.z === 90));
check("lo que es de alguien viaja con esa persona", sp.some((x) => x.prop.id === "pr2"));
check("y NO entra si su dueño no está en cuadro", !m.sceneProps(P, P.scenes[0], ["B"]).some((x) => x.prop.id === "pr2"));
check("una escena sin escenario solo trae lo del reparto", m.sceneProps(P, P.scenes[1], ["A"]).every((x) => x.prop.id === "pr2"));

const withProps = stageOf(camOf({ dist: 400 }), [{ id: "A", color: "#E4472C", mark: { x: 0, z: 0 }, height: 172 }]);
const withBox = m.composeStage({
  cam: camOf({ dist: 400 }), treatment: "normal",
  actors: [{ id: "A", color: "#E4472C", mark: { x: 0, z: 0 }, height: 172 }],
  props: [{ id: "pr1", label: "Marquesina", x: 60, z: 90, w: 200, h: 90, d: 120, color: "#E0A73C" }],
  palette: { sky: "#1B2A33", ground: "#141A1B", ink: "#C9C6BD" }, aspect: "16:9", width: 640,
});
check("un objeto se dibuja en el cuadro", withBox.prims.length > withProps.prims.length);
check("y se puede señalar", withBox.hits.some((h) => h.kind === "prop" && h.label === "Marquesina"));
check("los personajes siguen siendo señalables", withBox.hits.some((h) => h.kind === "actor" && h.id === "A"));

check("hydrateDoc rellena escenarios y props que faltan", (() => {
  const d = m.hydrateDoc({ scenes: [{ id: "x", title: "t", int: "INT", location: "L", tod: "", cast: [], synopsis: "" }] });
  return Array.isArray(d.escenarios) && Array.isArray(d.props) && d.scenes[0].escenarioId === null;
})());
check("un prop viejo sin medidas gana unas por defecto", m.hydrateDoc({ props: [{ id: "p", name: "x", color: "#fff" }] }).props[0].w === 40);
check("camLabelOf lee una configuración guardada", m.camLabelOf({ cam: m.applyShot(m.CAMERA_DEFAULT, "cu"), treatment: "handheld" }).includes("Primer plano"));
check("y marca el tratamiento", m.camLabelOf({ cam: m.CAMERA_DEFAULT, treatment: "pov" }).includes("subjetivo"));

/* ── muestras para mirar ─────────────────────────────────────────────────── */
const outArg = process.argv.indexOf("--out");
if (outArg > -1 && process.argv[outArg + 1]) {
  const dir = process.argv[outArg + 1];
  mkdirSync(dir, { recursive: true });
  const samples = [
    ["01-a-dos", take({ id: "z0", sceneId: "s1", shot: "two", cast: ["A", "B"], dur: 30 })],
    ["02-primer-plano", take({ id: "z1", sceneId: "s1", shot: "cu", cast: ["A"], dur: 30 })],
    ["03-sobre-el-hombro-en-mano", take({ id: "z2", sceneId: "s1", shot: "ots", treatment: "handheld", cast: ["A", "B"], dur: 30 })],
    ["04-cenital", take({ id: "z3", sceneId: "s1", shot: "cenital", cast: ["A", "B"], dur: 30 })],
    ["05-contrapicado", take({ id: "z4", sceneId: "s1", shot: "contrapicado", cast: ["A", "B"], dur: 30 })],
    ["06-general-angular", take({ id: "z5", sceneId: "s1", shot: "general", cast: ["A", "B"], dur: 30, marks: { A: { x: -150, z: 120 }, B: { x: 160, z: -90 } } })],
    ["07-perfil-tele", take({ id: "z6", sceneId: "s1", shot: "perfil", cam: { lens: 135 }, cast: ["A", "B"], dur: 30 })],
    ["08-holandes-pov", take({ id: "z7", sceneId: "s1", shot: "holandes", treatment: "pov", cast: ["A", "B"], dur: 30 })],
  ];
  samples.forEach(([name, t], i) => {
    writeFileSync(join(dir, `${name}.svg`), previsFrame({ project: P, scene: P.scenes[0], take: t, deck, n: i + 1, frames: 4, at: i * 13, sceneNo: 1 }));
  });
  console.log(`Fotogramas de muestra en ${dir}`);
}

console.log(`\nRT-Scriptor: ${pass} pasan, ${fail} fallan`);
process.exit(fail ? 1 : 0);
