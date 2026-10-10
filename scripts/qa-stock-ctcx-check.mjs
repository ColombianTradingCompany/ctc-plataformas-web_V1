// Guardián del STOCK CTCx (V5.195) — OCP · Manejo de Stock Físico.
//
//   node --experimental-strip-types --no-warnings --import ./scripts/ts-resolve.mjs scripts/qa-stock-ctcx-check.mjs
//
// El owner, 2026-10-09: el café que físicamente llega a CTCx «debe poder moverse de estado "Pergamino", "Verde", "Tostado" y
// "Empacado", de tal manera que pueda saber qué viene de dónde de manera visual […] las cantidades deben sumar al final lo mismo en
// equivalente del estado más primordial entre mermas de humedad, residuos y pérdidas». Plan `docs/PLAN_TRIAGE_CATALOGO.md` §2.1.
// Lo que se protege:
//
//   1. LAS CUENTAS (`src/lib/stock/linaje.ts`, puro) contra un escenario hecho a mano — el MISMO con que se probó la base el
//      2026-10-09 dentro de una transacción revertida: 100 kg de pergamino a $10.000 → trilla (50 + 30 de verde, 3 de humedad,
//      17 de residuos, $50.000) → tostión de 40 (34 + 5,5 + 0,5 de pérdidas) → empaque de 10 (5 + 5, $20.000) → una venta de 5 y
//      un kit armado de 0,25: costos, equivalencias, disponibles y el cuadre (100 kg en masa y en equivalente).
//   2. LAS REGLAS: las transiciones, el cuadre ± 0,01 kg, el disponible, quién surte un kit; y que la pantalla y la base usen las
//      MISMAS fórmulas (costo y equivalencia de las hijas) y la misma tolerancia.
//   3. EL ACOMODO del tablero: cuatro columnas, ninguna caja pisa otra, una madre abarca a sus hijas; el camino de una partida.
//   4. LA BASE (el acta): tablas con RLS sin políticas, nada se borra, los campos congelados, las funciones atómicas, los permisos.
//   5. LAS RAÍCES: recibir un despacho, pagar el mes de una compra en firme, la compra a mano que llegó y el ingreso a mano entran
//      por `crearRaizDeStock` (y lo vendido, comprometido); las acciones emiten, no lanzan y dejan auditoría.
//   6. LA PANTALLA y EL RAIL: `/ocp/stock` con el linaje y sus pestañas; las curvas se miden sin setState directo en el efecto; el
//      Stock CTCx en Manejo de Stock Físico y el talón de `RUTAS_MOVIDAS` hacia sus Sample Kits.
//   7. V5.203 (owner, 2026-10-10 · hueco H1): la pantalla resta lo DECLARADO vivo en el Triage, como `stock_disponible` (la base lo
//      hacía desde la V5.196 y la pantalla no: ofrecía transformar, dar salida o armar kits con kilos ya en el catálogo); y la FRANJA
//      del circuito (Por recibir → En stock → Por declarar → En el Catálogo Activo → Vendido) con los mismos números.
//   8. V5.203 · corrección (nodo final, 2026-10-10): «Por declarar» en kg de VERDE con la cuenta del Triage (H5); la marca Selection
//      por LOTE en el panel de la partida —vendido o sin lote: no va a la vitrina— (H6); el éxito parcial en ámbar (H12); la compra de
//      cada raíz se lee con `anulada_at` y la franja no cuenta las partidas anuladas (H13); la raíz de un despacho y su compra (H1/H2).

import { existsSync, readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c, detalle = "") => (c ? ok++ : fallos.push(n + (detalle ? ` — ${detalle}` : "")));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const existe = (r) => existsSync(new URL(`../${r}`, import.meta.url));
const cerca = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

const L = await import("../src/lib/stock/linaje.ts");
const { CONSOLES } = await import("../src/lib/panel/consoles.ts");
const { RUTAS_MOVIDAS } = await import("../src/lib/panel/rutasMovidas.ts");

// ── 1. El escenario ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const partida = (id, o) => ({
  id, codigo: id.toUpperCase(), lotId: "lote-1", origenTexto: null, estado: "pergamino", contenido: "pergamino", kg: 0, costoCopKg: 0,
  equivalencia: 1, raizId: "r", madreTransformacionId: null, origen: "transformacion", despachoId: null, compraId: null, comprometido: false,
  ubicacion: null, presentacion: null, nota: null, createdAt: "2026-10-09T10:00:00Z", anulada: false, anuladaMotivo: null, ...o,
});
const tx = (id, o) => ({ id, codigo: id.toUpperCase(), tipo: "trilla", madreId: "r", kgEntrada: 0, humedadKg: 0, residuosKg: 0, perdidasKg: 0, costoOperacionCop: 0, fecha: "2026-10-09", nota: null, anulada: false, anuladaMotivo: null, ...o });

const raiz = partida("r", { kg: 100, costoCopKg: 10000, origen: "manual", createdAt: "2026-10-09T09:00:00Z" });
const sTrilla = { tipo: "trilla", kgEntrada: 100, hijas: [{ kg: 50 }, { kg: 30 }], humedadKg: 3, residuosKg: 17, perdidasKg: 0, costoOperacionCop: 50000 };
const pTrilla = L.previaDeTransformacion(raiz, sTrilla);
check("1 · trilla: cada kg de verde a $13.125 (lo que entró más la maquila, por kg de lo que sale) y ≈ 1,25 kg de pergamino", pTrilla && cerca(pTrilla.costoCopKg, 13125) && cerca(pTrilla.equivalencia, 1.25) && pTrilla.hacia === "verde" && pTrilla.contenido === "verde", JSON.stringify(pTrilla));
const v1 = partida("v1", { estado: "verde", contenido: "verde", kg: 50, costoCopKg: 13125, equivalencia: 1.25, madreTransformacionId: "t1", createdAt: "2026-10-09T10:00:00Z" });
const v2 = partida("v2", { estado: "verde", contenido: "verde", kg: 30, costoCopKg: 13125, equivalencia: 1.25, madreTransformacionId: "t1", createdAt: "2026-10-09T10:00:01Z" });
const sTostion = { tipo: "tostion", kgEntrada: 40, hijas: [{ kg: 34 }], humedadKg: 5.5, residuosKg: 0, perdidasKg: 0.5, costoOperacionCop: 0 };
const pTostion = L.previaDeTransformacion(v1, sTostion);
check("1 · tostión: el tostado a $15.441,1765/kg y ≈ 1,452206 kg de pergamino (las pérdidas no se cargan a la equivalencia)", pTostion && cerca(pTostion.costoCopKg, 15441.1765) && cerca(pTostion.equivalencia, 1.452206), JSON.stringify(pTostion));
const sEmpaque = { tipo: "empaque", kgEntrada: 10, hijas: [{ kg: 5 }, { kg: 5 }], humedadKg: 0, residuosKg: 0, perdidasKg: 0, costoOperacionCop: 20000 };
const pEmpaque = L.previaDeTransformacion(v2, sEmpaque);
check("1 · empaque: lo empacado sigue siendo verde por dentro, a $15.125/kg y ≈ 1,25 kg de pergamino", pEmpaque && pEmpaque.hacia === "empacado" && pEmpaque.contenido === "verde" && cerca(pEmpaque.costoCopKg, 15125) && cerca(pEmpaque.equivalencia, 1.25), JSON.stringify(pEmpaque));
const t1 = partida("t1p", { estado: "tostado", contenido: "tostado", kg: 34, costoCopKg: 15441.1765, equivalencia: 1.452206, madreTransformacionId: "t2", createdAt: "2026-10-09T11:00:00Z" });
const e1 = partida("e1", { estado: "empacado", contenido: "verde", kg: 5, costoCopKg: 15125, equivalencia: 1.25, madreTransformacionId: "t3", presentacion: "bolsas de 250 g", createdAt: "2026-10-09T12:00:00Z" });
const e2 = partida("e2", { estado: "empacado", contenido: "verde", kg: 5, costoCopKg: 15125, equivalencia: 1.25, madreTransformacionId: "t3", createdAt: "2026-10-09T12:00:01Z" });
const stock = {
  partidas: [raiz, v1, v2, t1, e1, e2],
  transformaciones: [
    tx("t1", { tipo: "trilla", madreId: "r", kgEntrada: 100, humedadKg: 3, residuosKg: 17, costoOperacionCop: 50000 }),
    tx("t2", { tipo: "tostion", madreId: "v1", kgEntrada: 40, humedadKg: 5.5, perdidasKg: 0.5 }),
    tx("t3", { tipo: "empaque", madreId: "v2", kgEntrada: 10, costoOperacionCop: 20000 }),
  ],
  salidas: [{ id: "s1", partidaId: "v1", tipo: "venta", kg: 5, kitId: null, motivo: "venta de prueba", fecha: "2026-10-09", anulada: false }],
  reservasKit: [{ partidaId: "e1", kg: 0.25, kitId: "k1", kitCodigo: "SK-2026-001" }],
  reservasMezcla: [],
};
const disp = (p) => L.movimientosDe(p, stock).disponibleKg;
check("1 · disponibles: raíz 0 · verde 50 → 5 (tostó 40, vendió 5) · verde 30 → 20 · tostado 34 · empacado 4,75 (0,25 en un kit armado)", disp(raiz) === 0 && disp(v1) === 5 && disp(v2) === 20 && disp(t1) === 34 && disp(e1) === 4.75 && disp(e2) === 5, [raiz, v1, v2, t1, e1, e2].map(disp).join(" · "));
check("1 · lo reservado en un kit sigue en la bodega (resto) pero no está disponible", L.movimientosDe(e1, stock).restoKg === 5 && L.movimientosDe(e1, stock).reservadoKitKg === 0.25);
const fams = L.familias(stock);
const f = fams[0];
check("1 · una familia por raíz, con sus seis partidas", fams.length === 1 && f.partidas.length === 6 && f.raiz.id === "r");
const c = f.cuadre;
check("1 · el cuadre en MASA: cada kilo de la raíz en una cubeta (lo que sigue por estado + salidas + humedad + residuos + pérdidas = 100)", c.cuadra && cerca(c.sumaKg, 100, 1e-9) && c.enEstado.pergamino === 0 && c.enEstado.verde === 25 && c.enEstado.tostado === 34 && c.enEstado.empacado === 10 && c.salidas.venta === 5 && c.humedadKg === 8.5 && c.residuosKg === 17 && c.perdidasKg === 0.5, JSON.stringify(c));
check("1 · el cuadre en EQUIVALENTE del estado de la raíz también da 100 kg de pergamino", cerca(c.equivalenteKg, 100, 0.01), String(c.equivalenteKg));
// Una mezcla que reserva kilos de la compra de la raíz descuenta de SU disponible (y de nadie más).
const conMezcla = { ...stock, partidas: [{ ...raiz, kg: 100, compraId: "c1" }, v1, v2], transformaciones: [], salidas: [], reservasKit: [], reservasMezcla: [{ compraId: "c1", kg: 30 }] };
check("1 · lo asignado a una mezcla (aún sobre compras) se descuenta de la raíz de esa compra", L.movimientosDe(conMezcla.partidas[0], conMezcla).disponibleKg === 70 && L.movimientosDe(v1, conMezcla).disponibleKg === 50);

// ── 2. Las reglas ────────────────────────────────────────────────────────────────────────────────────────────────────────────
check("2 · cuatro estados, en el orden del dibujo del owner", L.ESTADOS.join(",") === "pergamino,verde,tostado,empacado" && L.ESTADOS.every((e) => /^#[0-9a-f]{6}$/i.test(L.ESTADO_INFO[e].color)));
check("2 · trilla: pergamino → verde · tostión: verde → tostado · empaque: pergamino, verde o tostado → empacado; de lo empacado no sale nada",
  L.transformacionesDesde("pergamino").join(",") === "trilla,empaque" && L.transformacionesDesde("verde").join(",") === "tostion,empaque" &&
  L.transformacionesDesde("tostado").join(",") === "empaque" && L.transformacionesDesde("empacado").length === 0 &&
  L.TRANSFORMACIONES.trilla.hacia === "verde" && L.TRANSFORMACIONES.tostion.hacia === "tostado" && L.TRANSFORMACIONES.empaque.hacia === "empacado");
check("2 · validar: lo que cuadra pasa; lo que no cuadra, lo que excede el disponible, el estado equivocado y una hija sin kg no",
  L.erroresDeTransformacion(raiz, 100, sTrilla).length === 0 &&
  L.erroresDeTransformacion(raiz, 100, { ...sTrilla, residuosKg: 16 }).some((e) => e.includes("faltan 1 kg")) &&
  L.erroresDeTransformacion(raiz, 100, { ...sTrilla, residuosKg: 18 }).some((e) => e.includes("salen 1 kg más")) &&
  L.erroresDeTransformacion(raiz, 60, sTrilla).some((e) => e.includes("quedan 60 kg")) &&
  L.erroresDeTransformacion(v1, 50, { ...sTrilla, kgEntrada: 10, hijas: [{ kg: 10 }], humedadKg: 0, residuosKg: 0 }).length > 0 &&
  L.erroresDeTransformacion(raiz, 100, { ...sTrilla, hijas: [{ kg: 80 }, { kg: 0 }] }).length > 0);
check("2 · la tolerancia del cuadre es ± 0,01 kg (la de la base)", L.TOLERANCIA_KG === 0.01 && L.erroresDeTransformacion(raiz, 100, { ...sTrilla, residuosKg: 16.995 }).length === 0);
check("2 · la propuesta de reparto siempre cuadra (trilla, tostión, empaque)", ["trilla", "tostion", "empaque"].every((t) => { const p = L.propuestaDeTransformacion(t, 123.4); return Math.abs(L.faltaPorCuadrar({ tipo: t, kgEntrada: 123.4, costoOperacionCop: 0, ...p })) <= 0.001; }));
check("2 · quién surte un kit: verde (o empacado de verde) para CP/Plus, pergamino para Max; ni lo comprometido ni lo que no tiene lote",
  L.surteKit(v1, "verde") && L.surteKit(e1, "verde") && !L.surteKit(t1, "verde") && L.surteKit(raiz, "pergamino") && !L.surteKit(raiz, "verde") &&
  !L.surteKit({ ...v1, comprometido: true }, "verde") && !L.surteKit({ ...v1, lotId: null }, "verde"));
check("2 · las salidas a mano son venta, consumo y ajuste; la de un kit no", L.SALIDAS_A_MANO.join(",") === "venta,consumo,ajuste");

// ── 3. El acomodo y el camino ────────────────────────────────────────────────────────────────────────────────────────────────
{
  const celdas = new Map(f.celdas.map((x) => [x.partidaId, x]));
  check("3 · cada partida en la columna de su estado", f.partidas.every((p) => celdas.get(p.id)?.columna === L.ESTADOS.indexOf(p.estado)));
  const pisa = f.celdas.some((a) => f.celdas.some((b) => a !== b && a.columna === b.columna && a.filaDesde <= b.filaHasta && b.filaDesde <= a.filaHasta));
  check("3 · ninguna caja pisa otra de su columna", !pisa);
  check("3 · una madre abarca las filas de sus hijas; cada hoja (el tostado y los dos empacados) ocupa una fila", f.aristas.every((a) => { const m = celdas.get(a.madreId), h = celdas.get(a.hijaId); return m && h && m.filaDesde <= h.filaDesde && h.filaHasta <= m.filaHasta && m.columna < h.columna; }) && f.filas === 3, `filas ${f.filas}`);
  const camino = L.caminoDe("t1p", f.aristas);
  check("3 · el camino del tostado: su verde y la raíz (de dónde viene); no el otro verde ni lo empacado", camino.has("t1p") && camino.has("v1") && camino.has("r") && !camino.has("v2") && !camino.has("e1"));
  const caminoRaiz = L.caminoDe("r", f.aristas);
  check("3 · el camino de la raíz es toda la familia (a dónde fue)", f.partidas.every((p) => caminoRaiz.has(p.id)));
}

// ── 4. La base ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const acta = lee("docs/migraciones/2026-10-09_stock_ctcx.sql");
  const sql = acta.replace(/^--.*$/gm, "");
  check("4 · tres tablas con RLS y ninguna política", ["stock_partidas", "stock_transformaciones", "stock_salidas"].every((t) => sql.includes(`create table if not exists public.${t}`) && sql.includes(`alter table public.${t} enable row level security;`)) && !/create policy/i.test(sql));
  check("4 · códigos SX-AAAA-NNNN y TR-AAAA-NNNN", sql.includes("('SX-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.stock_partidas_seq')::text, 4, '0'))") && sql.includes("('TR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.stock_transformaciones_seq')::text, 4, '0'))"));
  check("4 · los cuatro estados; lo empacado dice qué lleva dentro; una raíz se apunta a sí misma", sql.includes("check (estado in ('pergamino', 'verde', 'tostado', 'empacado'))") && sql.includes("constraint stock_partidas_empacado_check check (estado = 'empacado' or contenido = estado)") && sql.includes("constraint stock_partidas_raiz_check check ((madre_transformacion_id is null) = (raiz_id = id))"));
  check("4 · nada se borra: las tres compuertas rechazan el DELETE", sql.includes("Una partida del Stock CTCx no se borra: se anula.") && sql.includes("Una transformación del Stock CTCx no se borra: se anula.") && sql.includes("Una salida del Stock CTCx no se borra: se anula."));
  check("4 · de una partida solo cambian ubicación, presentación y nota (y los kg o el costo de una raíz sin movimientos)", /new\.estado is distinct from old\.estado/.test(sql) && /new\.equivalencia is distinct from old\.equivalencia/.test(sql) && sql.includes("if old.madre_transformacion_id is not null or old.anulada_at is not null or public.stock_tiene_movimientos(old.id) then"));
  check("4 · una transformación y una salida quedan como se registraron: solo se anulan, y lo anulado no vuelve", (sql.match(/\(to_jsonb\(new\) - 'anulada_at' - 'anulada_por' - 'anulada_motivo'\) is distinct from \(to_jsonb\(old\) - 'anulada_at' - 'anulada_por' - 'anulada_motivo'\)/g) ?? []).length === 2 && sql.includes("Una transformación anulada no vuelve.") && sql.includes("Una salida anulada no vuelve."));
  check("4 · el disponible: kg − transformado − salidas − kits armados − mezclas de su compra", /p\.kg\s*- coalesce\(\(select sum\(t\.kg_entrada\)[\s\S]*?t\.anulada_at is null\), 0\)\s*- coalesce\(\(select sum\(s\.kg\)[\s\S]*?s\.anulada_at is null\), 0\)\s*- coalesce\(\(select sum\(i\.kg\)[\s\S]*?k\.status = 'armado'\), 0\)\s*- case when p\.compra_id is null then 0::numeric else[\s\S]*?m\.status <> 'anulada'\), 0\) end/.test(sql));
  check("4 · transformar valida la transición, el disponible y el cuadre ± 0,01 kg", sql.includes("if m.estado <> 'pergamino' then raise exception 'Se trilla el pergamino") && sql.includes("if m.estado <> 'verde' then raise exception 'Se tuesta el verde") && sql.includes("if m.estado = 'empacado' then raise exception 'Lo empacado ya está empacado.'") && sql.includes("if p_kg_entrada > v_disp + 0.0005 then") && sql.includes("if abs(p_kg_entrada - (v_suma + v_h + v_r + v_p)) > 0.01 then"));
  check("4 · la pantalla y la base reparten igual: costo = (entrada × costo de la madre + operación) ÷ salen; equivalencia = madre × (entrada − pérdidas) ÷ salen",
    sql.includes("v_costo_hija := (p_kg_entrada * m.costo_cop_kg + v_c) / v_suma;") && sql.includes("v_eq := m.equivalencia * (p_kg_entrada - v_p) / v_suma;") &&
    lee("src/lib/stock/linaje.ts").includes("costoCopKg: r4((s.kgEntrada * madre.costoCopKg + (Number(s.costoOperacionCop) || 0)) / salen)") &&
    lee("src/lib/stock/linaje.ts").includes("equivalencia: r6((madre.equivalencia * (s.kgEntrada - (Number(s.perdidasKg) || 0))) / salen)"));
  check("4 · anular una transformación solo si ninguna hija se movió; las hijas quedan anuladas", sql.includes("if public.stock_tiene_movimientos(h.id) then") && sql.includes("anulada_motivo = left('Transformación anulada: ' || btrim(p_motivo), 300)"));
  check("4 · la raíz es idempotente por compra y por despacho (se corrige solo sin movimientos)", sql.includes("where (p_compra is not null and compra_id = p_compra) or (p_despacho is not null and despacho_id = p_despacho)") && sql.includes("if v.anulada_at is null and not public.stock_tiene_movimientos(v.id)") && /despacho_id uuid unique references public\.contract_despachos/.test(sql) && /compra_id uuid unique references public\.compras/.test(sql));
  check("4 · las funciones solo para el service role", ["stock_disponible(uuid)", "stock_tiene_movimientos(uuid)", "stock_anular_transformacion(uuid, text, uuid)"].every((f) => sql.includes(`revoke all on function public.${f} from public, anon, authenticated;`) && sql.includes(`grant execute on function public.${f} to service_role;`)) && /revoke all on function public\.stock_raiz\(/.test(sql) && /revoke all on function public\.stock_transformar\(/.test(sql));
}

// ── 5. Las raíces y las acciones ─────────────────────────────────────────────────────────────────────────────────────────────
{
  const servidor = lee("src/lib/stock/servidor.ts");
  check("5 · crearRaizDeStock es la única puerta: llama a stock_raiz y no lanza", servidor.startsWith('import "server-only";') && servidor.includes('service.rpc("stock_raiz"') && servidor.includes("return { ok: false, error:") && !/\bthrow\b/.test(servidor.replace(/\/\/.*$/gm, "")));
  const ventana = lee("src/app/ocp/(app)/ventanaActions.ts");
  const contrato = lee("src/app/ocp/(app)/contractActions.ts");
  const compras = lee("src/app/ocp/(app)/comprasActions.ts");
  const acciones = lee("src/app/ocp/(app)/stockActions.ts");
  // V5.203 · corrección (H1/H2): la raíz de un despacho la arma `raizDelDespacho` —la MISMA al recibir y al reintentar—.
  check("5 · recibir un despacho: pergamino a lo pagado por kg; lo vendido, comprometido; una devolución no entra", ventana.includes('if (resultado !== "devolucion") {') && ventana.includes("crearRaizDeStock(service, raizDelDespacho(c, lot.name, d, { kg: kgRecibido, pagado, compraId, por: p.userId }))") && /function raizDelDespacho\([\s\S]*?return \{ lotId: c\.lot_id, estado: "pergamino", kg: e\.kg, costoCopKg: e\.pagado > 0 && e\.kg > 0 \? e\.pagado \/ e\.kg : Number\(d\.cop_kg\), origen: "despacho", despachoId: d\.id, compraId: e\.compraId, comprometido: d\.tipo === "vendido"/.test(ventana));
  check("5 · pagar el mes de una compra en firme y la compra a mano que ya llegó entran por la misma puerta", contrato.includes('crearRaizDeStock(service, { lotId: contract.lot_id, estado: "pergamino", kg: kgComprados') && /if \(recibidaAt\) \{\s*const raiz = await crearRaizDeStock\(/.test(compras));
  check("5 · «Entrar al stock» (la compra registrada antes de llegar) y el ingreso a mano también", /export async function entrarCompraAlStock\([\s\S]*?crearRaizDeStock\(\s*service,[\s\S]*?\{ lotId: compra\.lot_id, estado: "pergamino", kg, costoCopKg: Number\(compra\.cop_kg\), origen: "compra", compraId: compra\.id/.test(acciones) && /export async function ingresarAlStock\([\s\S]*?crearRaizDeStock\(service, \{ lotId, origenTexto, estado, contenido, kg, costoCopKg: costo, origen: "manual"/.test(acciones));
  // V5.203 · corrección (H1/H2): la compra de un saco o un adelanto entra con SU despacho, y si la partida del despacho ya existe no se
  // duplica (ni se le reescriben kg y costo).
  check("5 · H1/H2: «Entrar al stock» de una compra de despacho no duplica la partida del despacho (y entra con origen despacho)", /export async function entrarCompraAlStock\([\s\S]*?if \(compra\.despacho_id\) \{[\s\S]*?\.eq\("despacho_id", compra\.despacho_id\)[\s\S]*?if \(delDespacho\) return \{ ok: false/.test(acciones) && /origen: "despacho", despachoId: compra\.despacho_id, compraId: compra\.id/.test(acciones));
  check("5 · H1/H2: ubicar la raíz de un despacho ubica la compra enlazada por el despacho", /export async function ubicarPartida\([\s\S]*?else if \(p0\.despachoId && p0\.raizId === p0\.id\)[\s\S]*?\.eq\("despacho_id", p0\.despachoId\)/.test(acciones));
  check("5 · un ingreso a mano lleva su nota; sin lote, dice de dónde es el café", acciones.includes("Un ingreso a mano lleva su nota") && acciones.includes("Sin lote de la plataforma, diga de dónde es el café"));
  const exportadas = [...acciones.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
  check("5 · todas las acciones del stock EMITEN (lo que escriben lo declara el Triage y surte los kits)", acciones.startsWith('"use server";') && acciones.includes('const permiso = () => permisoDeEscritura("ocp", "emite");') && exportadas.length === 8 && exportadas.every((fn) => new RegExp(`export async function ${fn}\\([\\s\\S]*?\\)\\s*:\\s*Promise<[\\s\\S]*?>\\s*\\{\\s*const p = await permiso\\(\\);\\s*if \\(!p\\.ok\\) return`).test(acciones)), exportadas.join(","));
  check("5 · ninguna lanza (devuelven { ok:false }) y en un módulo «use server» solo hay funciones exportadas", !/\bthrow\b/.test(acciones) && !/^export (const|let|function )/m.test(acciones));
  check("5 · cada acción que escribe deja su fila en audit_log", (acciones.match(/from\("audit_log"\)\.insert/g) ?? []).length >= 8);
  check("5 · transformar valida con la regla pura ANTES de la base, con el disponible que dice la base", /const \{ data: disp \} = await service\.rpc\("stock_disponible", \{ p_partida: madre\.id \}\);[\s\S]*?erroresDeTransformacion\(madre,[\s\S]*?service\.rpc\("stock_transformar"/.test(acciones));
  check("5 · la salida de un kit no se registra ni se anula a mano (va con el kit)", acciones.includes("if (!SALIDAS_A_MANO.includes(tipo))") && acciones.includes('if (fila.tipo === "kit") return { ok: false'));
}

// ── 6. La pantalla y el rail ─────────────────────────────────────────────────────────────────────────────────────────────────
{
  check("6 · /ocp/stock monta el linaje con sus dos pestañas; los Sample Kits son la segunda", existe("src/app/ocp/(app)/stock/page.tsx") && lee("src/app/ocp/(app)/stock/page.tsx").includes('<StockTabs activa="linaje" />') && lee("src/app/ocp/(app)/stock/StockTabs.tsx").includes("`${STOCK_PATH}/sample-kits`") && existe("src/app/ocp/(app)/stock/sample-kits/page.tsx") && existe("src/app/ocp/(app)/stock/sample-kits/[id]/page.tsx"));
  const tablero = lee("src/app/ocp/(app)/stock/LinajeBoard.tsx");
  check("6 · el tablero usa las cuentas puras: familias, camino, movimientos, validación y previa", ["familias(stock)", "caminoDe(activo, familia.aristas)", "movimientosDe(p, stock)", "erroresDeTransformacion(partida, disponibleKg, solicitud)", "previaDeTransformacion(partida, solicitud)"].every((x) => tablero.includes(x)));
  const efecto = tablero.slice(tablero.indexOf("useLayoutEffect(() => {"), tablero.indexOf("}, [familia, porId]);"));
  check("6 · las curvas se miden en el callback del ResizeObserver, nunca con un setState directo en el efecto", efecto.includes("const ro = new ResizeObserver(() => medir());") && efecto.includes("ro.observe(el);") && efecto.includes("return () => ro.disconnect();") && !/\n\s*medir\(\);/.test(efecto));
  check("6 · el cuadre se pinta con sus cubetas y dice si cuadra", tablero.includes("function CuadreBar(") && tablero.includes("cuadre.cuadra") && tablero.includes("Merma de humedad") && tablero.includes("Residuos") && tablero.includes("Pérdidas"));
  const fisico = CONSOLES.ocp.nav.find((g) => g.label === "OCP · Manejo de Stock Físico");
  check("6 · el rail: «Stock CTCx» en Manejo de Stock Físico", (fisico?.links ?? []).some((l) => l.href === L.STOCK_PATH && l.label === "Stock CTCx"));
  const mudanza = RUTAS_MOVIDAS.find((r) => r.a === `${L.STOCK_PATH}/sample-kits`);
  check("6 · la ruta vieja de los Sample Kits va con un 308 a su pestaña nueva (RUTAS_MOVIDAS + talón)", !!mudanza && mudanza.desde === "V5.195" && existe(`src/app${mudanza.de}/[[...resto]]/page.tsx`));
  check("6 · el plan nombra la tanda y este guardián", lee("docs/PLAN_TRIAGE_CATALOGO.md").includes("| **B · Stock CTCx** | V5.195 |") && lee("docs/PLAN_TRIAGE_CATALOGO.md").includes("`qa-stock-ctcx`"));
}

// ── 7. V5.203: lo declarado se resta (H1) y la franja del circuito ──────────────────────────────────────────────────────────────
{
  // El mismo escenario, con 8 kg del verde v2 declarados vivos en el Triage (CF-…): siguen en la bodega, ya no están libres.
  const conCatalogo = { ...stock, reservasCatalogo: [{ partidaId: "v2", kg: 8, codigo: "CF-2026-0001", fuenteId: "cf1" }] };
  const m2 = L.movimientosDe(v2, conCatalogo);
  check("7 · H1: lo declarado vivo se resta del disponible (20 → 12) y sigue en la bodega (resto 20)", m2.disponibleKg === 12 && m2.declaradoKg === 8 && m2.restoKg === 20, JSON.stringify(m2));
  check("7 · H1: lo declarado de una partida no toca a las demás; sin declaraciones (un escenario de antes) nada cambia", L.movimientosDe(v1, conCatalogo).disponibleKg === 5 && L.movimientosDe(v2, stock).disponibleKg === 20 && L.movimientosDe(v2, stock).declaradoKg === 0);
  check("7 · H1: kits + mezclas + lo declarado nunca dejan el disponible negativo", L.movimientosDe(v2, { ...stock, reservasCatalogo: [{ partidaId: "v2", kg: 25, codigo: "CF-X", fuenteId: "x" }] }).disponibleKg === 0);
  check("7 · H1: una partida anulada no tiene nada declarado ni libre", L.movimientosDe({ ...v2, anulada: true }, conCatalogo).disponibleKg === 0 && L.movimientosDe({ ...v2, anulada: true }, conCatalogo).declaradoKg === 0);
  check("7 · H1: el cuadre de la familia no cambia por declarar (lo declarado sigue físicamente aquí)", L.familias(conCatalogo)[0].cuadre.sumaKg === f.cuadre.sumaKg && L.familias(conCatalogo)[0].cuadre.cuadra);
  check("7 · H1: las declaraciones de una partida se listan (para «En el Catálogo Activo: N kg (CF-…)»)", L.declaracionesDe("v2", conCatalogo).map((d) => d.codigo).join(",") === "CF-2026-0001" && L.declaracionesDe("v1", conCatalogo).length === 0);
  const servidor = lee("src/lib/stock/servidor.ts");
  const tablero = lee("src/app/ocp/(app)/stock/LinajeBoard.tsx");
  check("7 · H1: cargarStock lee lo declarado vivo de cada partida (y así lo usan el linaje, el Triage, los kits y la franja)", servidor.includes('service.from("catalogo_fuentes").select("id, codigo, partida_id, kg_origen").eq("estado", "declarada").not("partida_id", "is", null)') && servidor.includes("return { partidas, transformaciones, salidas, reservasKit, reservasMezcla, reservasCatalogo, lotes, origenes, kits, lotesSelection: conSelection };") && lee("src/lib/compras/sampleKitsServidor.ts").includes("movimientosDe(p, stock).disponibleKg") && lee("src/lib/triage/servidor.ts").includes("movimientosDe(p, stockCrudo)"));
  check("7 · H1: el panel de la partida dice «En el Catálogo Activo: N kg (CF-…) → Triage»; una partida declarada ya se movió", tablero.includes("<dt>En el Catálogo Activo</dt>") && tablero.includes("<Link href={`/ocp/contratos?partida=${partida.id}`}>Triage →</Link>") && tablero.includes("mh.reservadoKitKg > 0 || mh.declaradoKg > 0") && /salidas\.length === 0 && reservas\.length === 0 && declaradas\.length === 0/.test(tablero));
  check("7 · el comentario de la cuenta dice la verdad: la misma que `stock_disponible` CON lo declarado", lee("src/lib/stock/linaje.ts").includes("resto − kits − mezclas − lo declarado. La misma cuenta que `stock_disponible` en la base (V5.196)"));

  // La franja del circuito.
  const F = await import("../src/lib/stock/franja.ts");
  const datos = {
    porRecibir: { despachosKg: 420, despachos: 6, comprasKg: 0, compras: 0 },
    enStock: { pergaminoKg: 15, verdeKg: 0, otrosKg: 0, partidas: 1 },
    porDeclarar: { stockKg: 15, stockPartidas: 1, contratosKgCps: 39200, contratos: 6, verdeKg: 25100 },
    enCatalogo: { kgVerde: 0, declaraciones: 0, listados: 0 },
    vendido: null,
  };
  const pasos = F.pasosDeLaFranja(datos, "compras");
  check("7 · la franja: cuatro pasos en el orden del circuito (y «Vendido» solo si hay listados)", pasos.map((p) => p.clave).join(",") === "por_recibir,en_stock,por_declarar,en_catalogo" && F.pasosDeLaFranja({ ...datos, vendido: { kgVerde: 12 } }, "compras").length === 5);
  check("7 · la franja resalta el paso de cada pantalla", ["compras", "stock", "triage", "selection", "catalogo"].every((pantalla) => F.pasosDeLaFranja(datos, pantalla).filter((p) => p.actual).length === 1 && F.pasosDeLaFranja(datos, pantalla).find((p) => p.actual)?.clave === F.PASO_DE_LA_PANTALLA[pantalla]) && F.PASO_DE_LA_PANTALLA.triage === "por_declarar" && F.PASO_DE_LA_PANTALLA.stock === "en_stock");
  check("7 · la franja marca lo pendiente: por recibir y por declarar (con los tratos por ventana)", pasos[0].pendiente && pasos[2].pendiente && !pasos[1].pendiente && !F.pasosDeLaFranja({ ...datos, porRecibir: { despachosKg: 0, despachos: 0, comprasKg: 0, compras: 0 }, porDeclarar: { stockKg: 0, stockPartidas: 0, contratosKgCps: 0, contratos: 0, verdeKg: 0 } }, "stock").some((p) => p.pendiente));
  check("7 · la franja enlaza a cada tablero (Por recibir abre su pestaña en Adquisición)", pasos[0].href === "/ocp/compras?vista=por-recibir" && pasos[1].href === L.STOCK_PATH && pasos[2].href === "/ocp/contratos" && pasos[3].href === "/ocp/catalogo");
  const carga = lee("src/lib/stock/circuito.ts");
  check("7 · la carga de la franja usa las MISMAS cuentas (movimientosDe, cuentaDelContrato) y solo sacos/adelantos de tratos vigentes", carga.startsWith('import "server-only";') && carga.includes("movimientosDe(p, stock).disponibleKg") && carga.includes("cuentaDelContrato({") && carga.includes('.in("tipo", ["saco", "adelanto"]).eq("purchase_contracts.status", "active")'));
  const pantallas = [["src/app/ocp/(app)/compras/page.tsx", "compras"], ["src/app/ocp/(app)/stock/page.tsx", "stock"], ["src/app/ocp/(app)/contratos/page.tsx", "triage"], ["src/app/ocp/(app)/ctc-selection/page.tsx", "selection"], ["src/app/ocp/(app)/catalogo/page.tsx", "catalogo"]].filter(([f, a]) => !lee(f).includes(`<CircuitoDelStock actual="${a}"`)).map(([f]) => f);
  check("7 · la franja encabeza Adquisición, Stock CTCx, Triage, CTCx Selection y Catálogo Activo", pantallas.length === 0, pantallas.join(", "));
  const comp = existe("src/app/ocp/(app)/CircuitoDelStock.tsx") ? lee("src/app/ocp/(app)/CircuitoDelStock.tsx") : "";
  check("7 · la franja es un componente de SERVIDOR que, si la lectura falla, no se pinta (no tumba el tablero)", !comp.includes('"use client"') && comp.includes("export async function CircuitoDelStock(") && /try \{\s*datos = await cargarCircuitoDelStock\(/.test(comp) && comp.includes("if (!datos) return null;"));

  // ── 8. V5.203 · corrección (nodo final, 2026-10-10) ──
  // H5: «Por declarar» = la cifra del Triage, en kg de verde. 15 kg de pergamino a 0,6 + 10 de verde + 100 de CPS de un trato a 0,6 = 79.
  const verde = F.porDeclararEnVerde([{ kg: 15, conversion: 0.6 }, { kg: 10, conversion: 1 }, { kg: 100, conversion: 0.6 }]);
  check("8 · H5: porDeclararEnVerde suma kg × conversión (1 para lo verde) y redondea como el Triage", verde === 79 && F.porDeclararEnVerde([]) === 0 && F.porDeclararEnVerde([{ kg: 0.4, conversion: 1 }]) === 0);
  const pd = pasos.find((p) => p.clave === "por_declarar");
  check("8 · H5: la franja dice «≈ N kg verde» (no suma pergamino y verde tal cual) y cuenta partidas y tratos", pd?.valor === `≈ ${L.fmtKg(25100)} kg verde` && /1 partida/.test(pd?.sub ?? "") && /6 tratos por ventana/.test(pd?.sub ?? ""), JSON.stringify(pd));
  const tablero3 = lee("src/app/ocp/(app)/contratos/TriageBoard.tsx");
  check("8 · H5: el Triage y la franja usan la MISMA cuenta (porDeclararEnVerde) y el mismo FR (factoresQueRigen + conversionDeFactor)", tablero3.includes("porDeclararEnVerde([") && tablero3.includes("...contratos.map((c) => ({ kg: c.porDeclararKg, conversion: c.conversion })),") && tablero3.includes("...stock.filter((x) => x.declarable).map((x) => ({ kg: x.disponibleKg, conversion: x.conversion })),") && tablero3.includes("<b>≈ {fmtKg(porDeclararVerde)} kg</b>") && carga.includes("porDeclararEnVerde([") && carga.includes("...declarables.map((d) => ({ kg: d.kg, conversion: d.verde ? 1 : conv(d.lotId) })),") && carga.includes("...tratosPorDeclarar.map((t) => ({ kg: t.kg, conversion: conv(t.lotId) })),") && carga.includes("factoresQueRigen(service,") && carga.includes("conversionDeFactor(fr.get(lotId) ?? null).conversion") && lee("src/lib/triage/servidor.ts").includes("export async function factoresQueRigen(") && /fr: fr\.get\(l\.id\) \?\? null/.test(lee("src/lib/triage/servidor.ts")));
  // H13: lo que la franja da por «ya en el stock» son las partidas VIVAS; y la compra de cada raíz se lee con su anulación.
  check("8 · H13: la franja no cuenta la partida anulada de una compra como «ya en el stock»", carga.includes("stock.partidas.filter((p) => !p.anulada).map((p) => p.compraId)"));
  // V5.203 · verificación (nodo final, 2026-10-10): la compra creada al reintentar está en el stock por su DESPACHO (la partida nació sin
  // ella): la franja no la cuenta «sin entrar», igual que Adquisición.
  check("8 · H1/H2: la franja reconoce en el stock la compra de un reintento por su despacho (como Adquisición)", carga.includes('service.from("compras").select("id, kg, anulada_at, despacho_id")') && carga.includes("stock.partidas.filter((p) => !p.anulada).map((p) => p.despachoId)") && carga.includes("!(c.despacho_id && despachoConPartida.has(c.despacho_id))"));
  check("8 · H13: cargarStock lee la compra de cada raíz CON anulada_at (esCompraSelection no ve viva una anulada)", servidor.includes('service.from("compras").select("id, origen, destino, contract_id, mes, anulada_at").in("id", compraIds)'));
  // H6: la marca Selection va por LOTE.
  check("8 · H6: cargarStock dice qué LOTES son CTCx Selection (lotesSelection, la regla de la vitrina)", servidor.includes('service.from("compras").select("lot_id, destino, anulada_at").eq("destino", "selection")') && servidor.includes("lotesSelection((selRaw"));
  check("8 · H6: el panel de la partida dice la vitrina por LOTE; lo vendido y lo sin lote no van a la vitrina; un Tyrian, a subasta", tablero.includes("function enLaVitrina(partida: Partida, stock: StockCargado): string") && tablero.includes('if (partida.comprometido) return "No va a la vitrina (vendido: ya tiene comprador).";') && tablero.includes('if (!partida.lotId) return "No va a la vitrina (sin lote de la plataforma).";') && tablero.includes("stock.lotesSelection.includes(partida.lotId)") && tablero.includes("<dd>{enLaVitrina(partida, stock)}</dd>") && !tablero.includes("sale como lote del productor.`"));
  // H12: tres tonos.
  const css = lee("src/app/ocp/(app)/stock/stock.module.css");
  check("8 · H12: el éxito parcial (un aviso) va en ámbar, no en el rojo del error", tablero.includes('aviso.tono === "error" ? s.error : aviso.tono === "parcial" ? s.avisoParcial : s.ok') && /\.avisoParcial \{[^}]*#fffbeb/.test(css) && !tablero.includes("error: !!avisoDeLaAccion"));
  // H15: la franja va primero en los cinco tableros (antes, en el Triage y el Catálogo, debajo de las pestañas).
  const franjaTarde = [["src/app/ocp/(app)/compras/page.tsx", "<nav className={s.tabs}"], ["src/app/ocp/(app)/stock/page.tsx", "<StockTabs"], ["src/app/ocp/(app)/contratos/page.tsx", "<CatalogoTabs"], ["src/app/ocp/(app)/catalogo/page.tsx", "<CatalogoTabs"]].filter(([f, tabs]) => { const t = lee(f); return !(t.indexOf("<CircuitoDelStock") > -1 && t.indexOf("<CircuitoDelStock") < t.indexOf(tabs)); }).map(([f]) => f);
  check("8 · H15: la franja va antes que las pestañas en todos los tableros", franjaTarde.length === 0, franjaTarde.join(", "));
  // H11: los rótulos del origen salen del diccionario único.
  check("8 · H11: ETIQUETA_DE_ORIGEN se arma con el diccionario único (DESTINO_LABEL · ORIGEN_LABEL)", servidor.includes("selection: `Compra ${DESTINO_LABEL.selection}`") && servidor.includes("despacho: ORIGEN_LABEL.saco") && servidor.includes("manual: ORIGEN_LABEL.ingreso"));
}

if (fallos.length) {
  console.error(`✗ qa-stock-ctcx: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const x of fallos) console.error("   " + x);
  process.exit(1);
}
console.log(`✓ qa-stock-ctcx: ${ok} comprobaciones OK, 0 fallos`);
