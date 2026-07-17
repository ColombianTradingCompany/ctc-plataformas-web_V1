// Pure-logic checks for jornada v2 gates, run against the REAL source
// (src/lib/arena/jornada.ts). BCP can't be browser-driven, so this guards the
// shared gates. Node 24 strips TS types natively.
// Run: node --experimental-strip-types scripts/qa-jornada-check.mjs
import * as j from "../src/lib/arena/jornada.ts";

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) pass++; else { fail++; console.error("FAIL:", name); } };

// discardPlan always leaves exactly 3 finalists.
for (const [n, exp] of [[7, [2, 2]], [5, [1, 1]], [3, [0, 0]]]) {
  const p = j.discardPlan(n);
  check(`discardPlan(${n})`, p[0] === exp[0] && p[1] === exp[1] && n - p[0] - p[1] === 3);
}

check("R1 = black,red", JSON.stringify(j.allowedDiscardGrades(0)) === JSON.stringify(["black", "red"]));
check("R2 = red,blue", JSON.stringify(j.allowedDiscardGrades(1)) === JSON.stringify(["red", "blue"]));

const st = (r2, r2Grades) => ({ cup_order: ["a", "b", "c", "d", "e", "f", "g"], discards: [["f", "g"], r2], discard_grades: r2Grades });
check("no R2 blue -> red ok", j.finalistAllowedGrades(st(["d", "e"], { d: "red", e: "red" })).includes("red"));
check("R2 blue -> red forbidden", !j.finalistAllowedGrades(st(["d", "e"], { d: "red", e: "blue" })).includes("red"));
check("R2 blue -> gold ok", j.finalistAllowedGrades(st(["d", "e"], { d: "blue", e: "red" })).includes("gold"));

const full = { fragrance: "8", flavor: "8", aftertaste: "8", acidity: "8", body: "8", balance: "8", uniformity: "10", clean_cup: "10", sweetness: "10", cuppers: "8" };
const mkState = (ranking, grades) => {
  const s = {
    // Etapa 4 (stage 3): reveal_origin(0), filter_prep(1), verdict(2), ...
    version: 2, started_at: "", stage: 3, step: 2,
    guests: [{ role: "host", name: "H" }, { role: "q_grader", name: "Q" }, { role: "invitado", name: "I" }],
    cup_order: ["a", "b", "c", "d", "e", "f", "g"],
    granulometria: {}, sca: {}, notes: {},
    discards: [["a", "b"], ["c", "d"]],
    discard_grades: { a: "black", b: "red", c: "red", d: "blue" },
    verdict: { ranking, grades },
  };
  for (const id of s.cup_order) s.sca[id] = { ...full };
  return s;
};
// finalists e,f,g; R2 gave a blue (d) so red is forbidden.
check("valid verdict passes", j.stepBlocker(mkState(["e", "f", "g"], { e: "gold", f: "blue", g: "tyrian" })) === null);
check("incomplete ranking blocks", j.stepBlocker(mkState(["e", "f"], { e: "gold", f: "blue", g: "tyrian" })) !== null);
check("illegal red finalist blocks", j.stepBlocker(mkState(["e", "f", "g"], { e: "red", f: "blue", g: "tyrian" })) !== null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
