// Guardián del TRIAGE DE CATÁLOGO ACTIVO (V5.196) — OCP · Catálogo.
//
//   node --experimental-strip-types --no-warnings --import ./scripts/ts-resolve.mjs scripts/qa-triage-catalogo-check.mjs
//
// El owner, 2026-10-09: en «Ofertas CP Aceptadas» —«Triage de Catálogo Activo» desde ahora— «debo recibir las ofertas que fueron
// aceptadas y también las cantidades del Stock CTCx, añadirles una referencia de costos de empaque hasta FOB, poner el O&P de CTCx y
// declararlo con ello como parte del catálogo activo», con «el ancla fundamental de cada lote en precio FOB mínimo». Plan
// `docs/PLAN_TRIAGE_CATALOGO.md` §2.3. Lo que se protege:
//
//   1. LA CUENTA (`src/lib/triage/fobMinimo.ts`, pura): café = (precio de origen + trilla) ÷ conversión; FOB mínimo = (café +
//      Empacado hasta FOB) × (1 + O&P); US$ = ÷ TRM; la conversión del FR (70 ÷ FR × 78 ÷ 93,09); el precio inicial redondeado hacia
//      arriba a US$ 0,05; el ancla = el mayor FOB mínimo; lo que un contrato puede ofrecer = declarado − retirado. Con un O&P
//      FICTICIO (17,5 %): el real vive SOLO en la base.
//   2. LA BASE (el acta): la misma cuenta en `triage_declarar`; el ancla fuera de `lot_listings` (esa tabla la lee cualquiera) y su
//      compuerta; una declaración viva por fuente; congeladas; el stock descuenta lo declarado; el sincronizador viejo retirado; el
//      séptimo bloqueo nuclear; los permisos.
//   3. LA CONFIDENCIALIDAD: ningún archivo trae un valor del O&P ni lo escribe en el rastro.
//   4. LAS ACCIONES: emiten, no lanzan, toman el lote y el precio de origen de la base, y dejan auditoría; el Catálogo Activo ya no
//      publica a mano.
//   5. LAS PANTALLAS y EL RAIL: el Triage en `/ocp/contratos` (los contratos en `/lista`), el Catálogo sobre las declaraciones.
//   6. V5.203 (owner, 2026-10-10): los ENLACES PROFUNDOS (`?partida=` · `?contrato=` desplazan y abren el formulario de esa entrada),
//      el ORIGEN de cada entrada del stock (Compra CTCx Selection · Compra solo stock · Saco de trato por ventana) y lo que verá la
//      vitrina, lo que el Triage deja fuera explicado, y cada declaración CF- enlazada a su partida o a su contrato.
//   7. V5.203 · corrección (nodo final, 2026-10-10 · H15): un enlace de CONSULTA (`?partida=`) desplaza y resalta, y solo «Declarar en
//      el Triage →» (`rutaDelTriage({ …, declarar: true })` → `&declarar=1`) abre el formulario; los textos de la vitrina dicen la
//      diferencia real desde la V5.202 —el rótulo y la imagen de CTCx frente a las fotos del lote, nunca «la finca»— (H14); el plural.

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let ok = 0;
const fallos = [];
const check = (n, c, detalle = "") => (c ? ok++ : fallos.push(n + (detalle ? ` — ${detalle}` : "")));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const existe = (r) => existsSync(new URL(`../${r}`, import.meta.url));
const cerca = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

const F = await import("../src/lib/triage/fobMinimo.ts");
const { CONSOLES } = await import("../src/lib/panel/consoles.ts");

// ── 1. La cuenta ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const c94 = F.conversionDeFactor(94);
  check("1 · FR 94 → 0,623967 kg de verde por kg de CPS (70 ÷ 94 × 78 ÷ 93,09: el rendimiento garantizado del PVC)", cerca(c94.conversion, 0.623967) && c94.fuente === "factor");
  check("1 · sin FR (o un FR imposible) se usa el del PVC (94)", F.conversionDeFactor(null).fuente === "pvc" && F.conversionDeFactor(200).fr === 94 && cerca(F.conversionDeFactor(null).conversion, 0.623967));
  check("1 · un FR mejor (90) da más verde por kg de CPS", F.conversionDeFactor(90).conversion > c94.conversion);
  // El mismo caso que se probó en la base el 2026-10-09 (transacción revertida), con un O&P FICTICIO de 17,5 %.
  const d = F.calcularFobMinimo({ precioOrigenCopKg: 32200, trillaCopKg: 400, conversion: 0.626, empaqueCopKg: 6900, opPct: 17.5, trm: 3141.36 });
  check("1 · café = (32.200 + 400) ÷ 0,626 = $52.076,68/kg de verde", d && cerca(d.cafeCopKg, 52076.6773, 1e-4), JSON.stringify(d));
  check("1 · base = café + empacado = $58.976,68; FOB mínimo = base × 1,175 = $69.297,60", d && cerca(d.baseCopKg, 58976.6773, 1e-4) && cerca(d.fobCopKg, 69297.5958, 1e-4) && cerca(d.opCopKg, d.fobCopKg - d.baseCopKg, 1e-3));
  check("1 · en US$ a la TRM 3.141,36: 22,059744 por kg de verde", d && cerca(d.fobUsdKg, 22.059744, 1e-6));
  check("1 · una cuenta imposible (sin TRM, conversión 0, negativo) no sale", F.calcularFobMinimo({ precioOrigenCopKg: 1, trillaCopKg: 0, conversion: 0, empaqueCopKg: 1, opPct: 1, trm: 1 }) === null && F.calcularFobMinimo({ precioOrigenCopKg: 1, trillaCopKg: 0, conversion: 1, empaqueCopKg: 1, opPct: 1, trm: 0 }) === null && F.calcularFobMinimo({ precioOrigenCopKg: 1, trillaCopKg: 0, conversion: 1, empaqueCopKg: -1, opPct: 1, trm: 1 }) === null);
  check("1 · el precio inicial sube a US$ 0,05 (22,06 → 22,10) y no se pasa en un múltiplo CALCULADO (0,1 + 0,2 → 0,30, no 0,35)", F.precioInicial(22.059744) === 22.1 && F.precioInicial(0.1 + 0.2) === 0.3 && F.precioInicial(16.0500001) === 16.1 && F.precioInicial(22.529100) === 22.55);
  check("1 · el ancla es el mayor FOB mínimo de las entradas VIVAS", F.anclaDelListado([{ fobUsdKg: 22.53, viva: true }, { fobUsdKg: 25.56, viva: false }, { fobUsdKg: 23.1, viva: true }]) === 23.1 && F.anclaDelListado([{ fobUsdKg: 1, viva: false }]) === null);
  const k = F.cuentaDelContrato({ declaradoKg: 3500, retiradoKg: 0, declaradoEnCatalogoKg: 1000 });
  const k2 = F.cuentaDelContrato({ declaradoKg: 3500, retiradoKg: 3000, declaradoEnCatalogoKg: 1000 });
  check("1 · un contrato ofrece declarado − retirado; lo vendido no se resta otra vez (sale de lo ya declarado)", k.baseKg === 3500 && k.porDeclararKg === 2500 && k.deMasKg === 0 && F.baseDelContrato({ declaradoKg: 3500, retiradoKg: 700 }) === 2800);
  check("1 · si el productor retira café ya declarado, queda «declarado de más»", k2.baseKg === 500 && k2.porDeclararKg === 0 && k2.deMasKg === 500);
  check("1 · el N2 de la banda se lee de la pila del PVC (se exhibe, no gobierna)", F.n2DelGrado([{ b: "Blue", n2: 19.32 }, { b: "Black", n2: 14.433 }], "blue") === 19.32 && F.n2DelGrado([{ b: "Blue", n2: 19.32 }], "gold") === null && F.n2DelGrado(null, "blue") === null);
  check("1 · un listado nace con la bolsa del modelo (6 kg) y el MOQ de su banda", F.terminosIniciales("blue").unidadKg === 6 && F.terminosIniciales("blue").moqKg === 150 && F.terminosIniciales("black").moqKg === 228);
  check("1 · a lo ya empacado se le descuenta la sección de empaque de la referencia", cerca(F.empaqueSinEmpacar({ copKg: 6900, secciones: [{ clave: "empaque", copKg: 2901.4 }, { clave: "tramites", copKg: 3998.6 }] }), 3998.6));
  check("1 · la ruta del Triage es la de «Ofertas CP Aceptadas» y la lista de contratos su pestaña", F.TRIAGE_PATH === "/ocp/contratos" && F.CONTRATOS_LISTA_PATH === "/ocp/contratos/lista");
}

// ── 2. La base ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const acta = lee("docs/migraciones/2026-10-09_triage_catalogo.sql");
const sql = acta.replace(/^--.*$/gm, "");
{
  const fob = lee("src/lib/triage/fobMinimo.ts");
  check("2 · la base hace LA MISMA cuenta que la pantalla", sql.includes("v_cafe := (p_precio_origen + v_trilla) / p_conversion;") && sql.includes("v_fob_cop := (v_cafe + p_empaque_cop) * (1 + p_op_pct / 100);") && sql.includes("v_fob_usd := v_fob_cop / p_trm;") && fob.includes("const cafeCopKg = (e.precioOrigenCopKg + e.trillaCopKg) / e.conversion;") && fob.includes("const fobCopKg = baseCopKg * (1 + e.opPct / 100);") && fob.includes("fobUsdKg: r6(fobCopKg / e.trm)"));
  check("2 · catalogo_fuentes: RLS sin políticas, una declaración viva por contrato y por partida", sql.includes("alter table public.catalogo_fuentes enable row level security;") && !/create policy/i.test(sql) && sql.includes("create unique index if not exists catalogo_fuentes_contrato_viva on public.catalogo_fuentes (contract_id) where estado = 'declarada'") && sql.includes("create unique index if not exists catalogo_fuentes_partida_viva on public.catalogo_fuentes (partida_id) where estado = 'declarada'"));
  check("2 · una declaración queda como se hizo y una retirada no vuelve", sql.includes("(to_jsonb(new) - 'estado' - 'retirada_at' - 'retirada_por' - 'retirada_motivo') is distinct from (to_jsonb(old) - 'estado' - 'retirada_at' - 'retirada_por' - 'retirada_motivo')") && sql.includes("Una declaración retirada no vuelve."));
  check("2 · el ancla NO es una columna de lot_listings (esa tabla la lee cualquiera): se calcula de las declaraciones", !/alter table public\.lot_listings add column/i.test(sql) && sql.includes("select max(fob_min_usd_kg) from public.catalogo_fuentes where listing_id = p_listing and estado = 'declarada'"));
  check("2 · la compuerta: el precio de venta no baja del ancla", /create trigger trg_guard_listing_ancla before insert or update on public\.lot_listings/.test(sql) && sql.includes("if v_ancla is not null and new.price_per_kg < v_ancla then"));
  check("2 · el listado: total = kg de VERDE declarados; el precio sube al ancla redondeada; sin entradas, se archiva", sql.includes("set total_kg = round(v_total, 3),") && sql.includes("price_per_kg = greatest(price_per_kg, ceil(v_ancla * 20) / 20),") && sql.includes("update public.lot_listings set total_kg = 0, status = 'archived' where id = p_listing;"));
  check("2 · declarar el primer café de un lote crea su listado y acuña el código público", sql.includes("v_codigo := public.ctc_public_code();") && sql.includes("insert into public.lot_listings (lot_id, commercial_mode, unit_kg, moq_kg, total_kg, sold_kg, price_per_kg, deposit_pct, status)"));
  check("2 · lo que un contrato puede ofrecer: declarado − retirado (ni las ventas se restan dos veces)", /quantity_frozen_kg, 0\) - coalesce\(\(select sum\(r\.kg\) from public\.contract_retiros r where r\.contract_id = pc\.id\), 0\)/.test(sql) && !/contract_ventas/.test(sql.slice(sql.indexOf("function public.contrato_base_kg"), sql.indexOf("function public.triage_recalcular_listado"))));
  check("2 · se declara un trato por ventana VIGENTE, una partida libre del lote (ni comprometida ni tostada) y nunca un Tyrian", sql.includes("if c.status <> 'active' or c.ventana_tipo is null then") && sql.includes("if p.comprometido then") && sql.includes("if p.contenido not in ('pergamino', 'verde') then") && sql.includes("if l.grade = 'tyrian' then") && sql.includes("if p.contenido = 'verde' and p_conversion <> 1 then"));
  check("2 · corregir = retirar y declarar en la misma transacción", sql.includes("if p_reemplaza is not null then") && sql.includes("retirada_motivo = 'Corregida: la reemplaza una declaración nueva.'"));
  check("2 · el Stock CTCx descuenta lo declarado y una partida declarada ya «se movió»", /- coalesce\(\(select sum\(cf\.kg_origen\) from public\.catalogo_fuentes cf where cf\.partida_id = p\.id and cf\.estado = 'declarada'\), 0\)/.test(sql) && sql.includes("or exists (select 1 from public.catalogo_fuentes cf where cf.partida_id = p_partida and cf.estado = 'declarada')"));
  check("2 · el sincronizador viejo del listado (contract_releases) se retiró", sql.includes("drop trigger if exists contract_releases_sync_listing_total on public.contract_releases;") && sql.includes("drop function if exists public.sync_listing_total_from_releases();"));
  check("2 · el borrado nuclear: séptimo bloqueo (declaraciones vivas) y las declaraciones en la copia", sql.includes("select count(*) into n from catalogo_fuentes where lot_id = any(v_lotes) and estado = 'declarada';") && sql.includes("'catalogo_fuentes', _nuclear_filas('catalogo_fuentes', 'lot_id', v_lotes),"));
  check("2 · las funciones, solo para el service role", ["triage_ancla_usd(uuid)", "contrato_base_kg(uuid)", "triage_recalcular_listado(uuid)", "triage_retirar(uuid, text, uuid)"].every((f) => sql.includes(`revoke all on function public.${f} from public, anon, authenticated;`) && sql.includes(`grant execute on function public.${f} to service_role;`)) && /revoke all on function public\.triage_declarar\(/.test(sql));
}

// ── 3. La confidencialidad del O&P ───────────────────────────────────────────────────────────────────────────────────────────
{
  const fob = lee("src/lib/triage/fobMinimo.ts");
  const acc = lee("src/app/ocp/(app)/triageActions.ts");
  check("3 · el acta no siembra un O&P (lo escribe un colaborador en la base)", !/platform_settings/i.test(sql.replace(/`platform_settings\.triage_catalogo`/g, "")) && !/op_pct\s+numeric[^,\n]*default/i.test(sql));
  check("3 · el código no trae un O&P por defecto", !/opPct\s*[:=]\s*\d/.test(fob) && !/op_pct\s*:\s*\d/.test(acc) && !/opPct\s*[:=]\s*\d/.test(lee("src/lib/triage/servidor.ts")));
  check("3 · el rastro dice que el O&P cambió, no su valor", acc.includes("notes: `O&P actualizado · trilla $${Math.round(trilla)}/kg CPS`") && !/notes:[^\n]*\$\{op\b/.test(acc) && !/notes:[^\n]*opPct/.test(acc));
}

// ── 4. Las acciones ──────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const acc = lee("src/app/ocp/(app)/triageActions.ts");
  const cat = lee("src/app/ocp/(app)/catalogActions.ts");
  const exportadas = [...acc.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
  check("4 · las tres acciones del Triage EMITEN y no lanzan", acc.startsWith('"use server";') && acc.includes('const permiso = () => permisoDeEscritura("ocp", "emite");') && exportadas.join(",") === "guardarAjustesDelTriage,declararEnCatalogo,retirarDelCatalogo" && exportadas.every((fn) => new RegExp(`export async function ${fn}\\([\\s\\S]*?\\)\\s*:\\s*Promise<[\\s\\S]*?>\\s*\\{\\s*const p = await permiso\\(\\);`).test(acc)) && !/\bthrow\b/.test(acc), exportadas.join(","));
  check("4 · el lote y el precio de origen salen de la base, nunca del navegador", acc.includes('.from("purchase_contracts").select("lot_id, price_per_kg_locked")') && acc.includes('.from("stock_partidas").select("lot_id, costo_cop_kg")') && !/datos\.(precioOrigen|lotId)/.test(acc));
  check("4 · declarar y retirar van por las funciones atómicas y dejan auditoría", acc.includes('service.rpc("triage_declarar"') && acc.includes('service.rpc("triage_retirar"') && (acc.match(/from\("audit_log"\)\.insert/g) ?? []).length === 3);
  check("4 · el Catálogo Activo ya no publica a mano: edita lo comercial (con el ancla) y archiva lo que no tiene entradas", !/export async function publishLot\(/.test(cat) && cat.includes('service.rpc("triage_ancla_usd", { p_listing: listingId })') && cat.includes("if (count) return { ok: false") && !/\bthrow\b/.test(cat));
  const src = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "src"], { encoding: "utf8" }).split(/\r?\n/).filter((f) => /\.tsx?$/.test(f) && existsSync(f));
  const borra = src.filter((f) => /from\("catalogo_fuentes"\)\s*\.\s*delete\(/.test(readFileSync(f, "utf8")));
  const escribeTotal = src.filter((f) => /from\("lot_listings"\)[\s\S]{0,80}\.update\(\{[^}]*total_kg/.test(readFileSync(f, "utf8")));
  check("4 · nadie borra una declaración ni escribe el total de un listado fuera de la base", borra.length === 0 && escribeTotal.length === 0, [...borra, ...escribeTotal].join(", "));
  const viejo = src.filter((f) => /export async function (sincronizarListado|totalEnVentaPorVentanas|publishLot)\(|\b(sincronizarListado|totalEnVentaPorVentanas)\(service/.test(readFileSync(f, "utf8")));
  check("4 · el sincronizador viejo (sincronizarListado, totalEnVentaPorVentanas, publishLot) no queda en el código", viejo.length === 0, viejo.join(", "));
}

// ── 5. Las pantallas y el rail ───────────────────────────────────────────────────────────────────────────────────────────────
{
  const pagina = lee("src/app/ocp/(app)/contratos/page.tsx");
  check("5 · /ocp/contratos es el Triage; un enlace viejo con ?status= va a la lista de contratos", pagina.includes('triage={triage} abrir={{ partida: esUuid(partida), contrato: esUuid(contrato), declarar: declarar === "1" }} />') && pagina.includes("<TriageBoard key={`${partida ?? \"\"}:${contrato ?? \"\"}:${declarar ?? \"\"}`}") && pagina.includes("if (status) redirect(`${CONTRATOS_LISTA_PATH}?status=${encodeURIComponent(status)}`);") && existe("src/app/ocp/(app)/contratos/lista/page.tsx"));
  const tabs = lee("src/app/ocp/(app)/catalogo/CatalogoTabs.tsx");
  check("5 · las pestañas: Triage · Contratos · Humedad", tabs.includes('{ href: "/ocp/contratos", label: "Triage" }') && tabs.includes('{ href: "/ocp/contratos/lista", label: "Contratos" }') && tabs.includes('{ href: "/ocp/contratos/humedad", label: "Humedad" }'));
  const catalogo = CONSOLES.ocp.nav.find((g) => g.label === "OCP · Catálogo");
  check("5 · el rail dice «Triage de Catálogo Activo» (la ruta se conservó)", (catalogo?.links ?? []).some((l) => l.href === "/ocp/contratos" && l.label === "Triage de Catálogo Activo") && !(catalogo?.links ?? []).some((l) => l.label === "Ofertas CP Aceptadas"));
  const tablero = lee("src/app/ocp/(app)/contratos/TriageBoard.tsx");
  check("5 · el tablero desglosa el FOB mínimo en vivo con la cuenta pura y exhibe el N2", tablero.includes("calcularFobMinimo({") && tablero.includes("se exhibe, no gobierna") && tablero.includes("declararEnCatalogo({") && tablero.includes("retirarDelCatalogo(d.id, motivo)"));
  check("5 · el tablero marca lo declarado de más y el contrato que ya no está vigente", tablero.includes("Declarado de más:") && tablero.includes("El contrato ya no está vigente: retire esta declaración."));
  const cat = lee("src/app/ocp/(app)/catalogo/page.tsx");
  check("5 · el Catálogo Activo lee las declaraciones (cargarTriage), enseña el ancla y edita lo comercial", cat.includes("cargarTriage(service)") && cat.includes("ancla {usd(l.anclaUsdKg, 3)}/kg") && cat.includes("editarListado.bind(null, l.id)") && !cat.includes("publishLot"));
  // V5.203: el enlace abre ESA entrada (la partida del lote de Selection; el trato por ventana); un trato mes a mes no se declara como
  // contrato (el Triage solo carga tratos por ventana): su compra entra al Stock y esa partida se declara (hueco H9).
  const detalle = lee("src/app/ocp/(app)/contratos/[id]/page.tsx");
  check("5 · CTCx Selection y el detalle del contrato mandan a declarar en el Triage, a SU entrada", lee("src/app/ocp/(app)/ctc-selection/page.tsx").includes("<Link href={rutaDelTriage({ partida: l.declarable.id, declarar: true })}>Declarar en el Triage →</Link>") && detalle.includes("<Link href={rutaDelTriage({ contrato: id, declarar: true })}>Declarar en el Triage →</Link>") && !detalle.includes('<Link href="/ocp/contratos">Declarar en el Triage →</Link>'));
  check("5 · el plan nombra la tanda y este guardián", lee("docs/PLAN_TRIAGE_CATALOGO.md").includes("| **C · Triage de Catálogo Activo** | V5.196 |") && lee("docs/PLAN_TRIAGE_CATALOGO.md").includes("`qa-triage-catalogo`"));
}

// ── 6. V5.203: enlaces profundos, origen de cada entrada, lo excluido, declaraciones enlazadas ───────────────────────────────────
{
  const pagina = lee("src/app/ocp/(app)/contratos/page.tsx");
  const tablero = lee("src/app/ocp/(app)/contratos/TriageBoard.tsx");
  const servidor = lee("src/lib/triage/servidor.ts");
  const stockServ = lee("src/lib/stock/servidor.ts");
  const cat = lee("src/app/ocp/(app)/catalogo/page.tsx");
  check("6 · la página lee ?partida= y ?contrato= (solo uuid) y se los pasa al tablero", pagina.includes("searchParams: Promise<{ status?: string; partida?: string; contrato?: string; declarar?: string }>") && /const esUuid = \(v: string \| undefined\) => \(v && \/\^\[0-9a-f-\]\{36\}\$\/i\.test\(v\) \? v : null\);/.test(pagina));
  check("6 · el enlace abre el formulario de ESA entrada (corregir su declaración viva, o declarar) y desplaza hasta ella", tablero.includes("useState<string | null>(() => claveInicial(triage, abrir))") && tablero.includes("if (!abrir?.declarar) return null;") && tablero.includes("if (d && x) return `f:${d.id}`;") && tablero.includes("if (x && x.declarable && x.disponibleKg > 0) return `s:${x.partidaId}`;") && tablero.includes("if (c && c.porDeclararKg > 0) return `c:${c.contractId}`;") && tablero.includes("document.getElementById(destino)?.scrollIntoView({ block: \"center\" })") && tablero.includes("id={`entrada-s-${x.partidaId}`}") && tablero.includes("id={`entrada-c-${c.contractId}`}"));
  check("6 · si la entrada pedida no está, lo dice (y manda al Stock o al contrato)", tablero.includes("La partida pedida no está entre las entradas del Triage") && tablero.includes("El contrato pedido no está entre los tratos por ventana vigentes"));
  // V5.203 · corrección (H11): los rótulos se arman con el diccionario único de `compras/selection.ts`; aquí se comprueba el resultado.
  const SEL = await import("../src/lib/compras/selection.ts");
  const etiqueta = { selection: `Compra ${SEL.DESTINO_LABEL.selection}`, stock: `Compra ${SEL.DESTINO_LABEL.stock.toLowerCase()}`, despacho: SEL.ORIGEN_LABEL.saco, manual: SEL.ORIGEN_LABEL.ingreso };
  check("6 · los rótulos del origen, en UN sitio: Compra CTCx Selection · Compra solo stock · Saco de trato por ventana · Ingreso a mano", etiqueta.selection === "Compra CTCx Selection" && etiqueta.stock === "Compra solo stock" && etiqueta.despacho === "Saco de trato por ventana" && etiqueta.manual === "Ingreso a mano" && /selection: `Compra \$\{DESTINO_LABEL\.selection\}`,\s*stock: `Compra \$\{DESTINO_LABEL\.stock\.toLowerCase\(\)\}`,\s*despacho: ORIGEN_LABEL\.saco,/.test(stockServ) && stockServ.includes("manual: ORIGEN_LABEL.ingreso") && stockServ.includes('const clase: ClaseDeOrigen = c && esCompraSelection(c) ? "selection" : "stock";'));
  check("6 · cada entrada del stock lleva el origen de su RAÍZ y si su lote sale como CTCx Selection", servidor.includes("const o = stockCrudo.origenes[p.raizId];") && servidor.includes("loteSelection: selection.has(lote.id)") && servidor.includes("lotesSelection(") && tablero.includes("{x.origen.etiqueta}"));
  // V5.203 · corrección (H14): desde la V5.202 ningún lote enseña la finca; lo que cambia es el rótulo y la imagen de CTCx.
  check("6 · si es Selection, el aviso: en la vitrina sale con el rótulo y la imagen de CTCx, no con las fotos del lote (también un trato de un lote Selection)", tablero.includes("Compra CTCx Selection: en la vitrina el lote sale con el rótulo y la imagen de CTCx, no con las fotos del lote.") && tablero.includes("{c.loteSelection && <p className={s.vitrinaSelection}>") && !/no con la finca|perfil de CTCx, no/.test(tablero));
  check("6 · lo que se queda fuera se explica: sin lote (al Stock CTCx), comprometido, Tyrian", servidor.includes("const excluidas: ExcluidasDelTriage = { sinLote: 0, comprometidas: 0, tyrian: 0 };") && tablero.includes("sin lote de la plataforma (ingreso a mano)") && tablero.includes('<Link href="/ocp/stock">Stock CTCx →</Link>') && tablero.includes("va{excluidas.tyrian === 1 ? \"\" : \"n\"} a subasta"));
  check("6 · cada declaración CF- enlaza a su partida o a su contrato (Triage y Catálogo Activo)", tablero.includes("<Link href={`/ocp/stock?partida=${d.partidaId}`}>") && tablero.includes("<Link href={`/ocp/contratos/${d.contractId}`}>contrato</Link>") && cat.includes("<Link href={`/ocp/stock?partida=${d.partidaId}`}>") && cat.includes("`${TRIAGE_PATH}?partida=${d.partidaId}`"));
  check("6 · la franja del circuito encabeza el Triage y el Catálogo Activo", pagina.includes('<CircuitoDelStock actual="triage" />') && cat.includes('<CircuitoDelStock actual="catalogo" />'));
  check("6 · el disponible de cada entrada es el de la base (movimientosDe ya resta lo declarado, H1)", servidor.includes("const m = movimientosDe(p, stockCrudo);") && stockServ.includes('service.from("catalogo_fuentes").select("id, codigo, partida_id, kg_origen").eq("estado", "declarada")'));
}

// ── 7. V5.203 · corrección (nodo final, 2026-10-10): consulta ≠ declarar (H15), los textos de la vitrina (H14), el plural ──────────
{
  const F = await import("../src/lib/triage/fobMinimo.ts");
  check("7 · H15: rutaDelTriage — la consulta solo desplaza; «declarar» añade &declarar=1; sin entrada, el Triage a secas", F.rutaDelTriage({ partida: "p1" }) === "/ocp/contratos?partida=p1" && F.rutaDelTriage({ partida: "p1", declarar: true }) === "/ocp/contratos?partida=p1&declarar=1" && F.rutaDelTriage({ contrato: "c1", declarar: true }) === "/ocp/contratos?contrato=c1&declarar=1" && F.rutaDelTriage({ declarar: true }) === "/ocp/contratos");
  const tablero = lee("src/app/ocp/(app)/contratos/TriageBoard.tsx");
  const pagina = lee("src/app/ocp/(app)/contratos/page.tsx");
  check("7 · H15: el tablero solo abre un formulario con «declarar»; la página lo lee de ?declarar=1", /function claveInicial\(t: Triage, abrir: AbrirEnElTriage \| undefined\): string \| null \{\s*if \(!abrir\?\.declarar\) return null;/.test(tablero) && pagina.includes('declarar: declarar === "1"'));
  const A = await import("../src/lib/compras/adquisicion.ts");
  const pasos = A.siguientesPasos({ anulada: false, raiz: { id: "r1", codigo: "SX-1" }, disponibleKg: 15, declarable: { partidaId: "p9", kg: 15 }, declaraciones: [{ codigo: "CF-1", partidaId: "p8", kgVerde: 9 }], mezclas: [] });
  check("7 · H15: en Adquisición, «En catálogo CF-…» es consulta y «Declarar en el Triage →» abre el formulario", pasos.find((p) => p.tipo === "catalogo")?.href === "/ocp/contratos?partida=p8" && pasos.find((p) => p.tipo === "declarar")?.href === "/ocp/contratos?partida=p9&declarar=1");
  check("7 · H15: «Para declararla(s)» concuerda con el número de partidas sin lote", tablero.includes('declarar{excluidas.sinLote === 1 ? "la" : "las"}') && tablero.includes('ingresar{excluidas.sinLote === 1 ? "la" : "las"}'));
  check("7 · H14: el Triage no dice que la vitrina enseñe la finca", !/(no con la finca|en vez de la finca|perfil de CTCx, no con)/.test(tablero));
}

if (fallos.length) {
  console.error(`✗ qa-triage-catalogo: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const x of fallos) console.error("   " + x);
  process.exit(1);
}
console.log(`✓ qa-triage-catalogo: ${ok} comprobaciones OK, 0 fallos`);
