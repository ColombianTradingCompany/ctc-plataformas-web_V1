// Guardián del BORRADO NUCLEAR de lotes y fincas (V5.134, owner 2026-10-01).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-borrado-nuclear-check.mjs
//
// GRATIS y sin red: ejercita el módulo puro y lee las fuentes y el acta. No toca la base ni borra nada.
//
// QUÉ VIGILA. El owner pidió «una manera desde OCP para poder borrar Lotes y Fincas, incluso después de haber procesado
// todo, […] como si no hubiese existido […] con doble confirmación y [que] le mande un mensaje al Productor […]. Agreguemos
// un módulo que guarde esta info como archivo». Es la acción más destructiva de la plataforma; cada garantía está aquí:
//   1. Es de quien administra el OCP (clase `emite`) y solo el servidor llega a las funciones de la base.
//   2. DOBLE confirmación, y la segunda se vuelve a comprobar en el servidor.
//   3. Primero se ARCHIVA, después se borra, y todo en una transacción de la base.
//   4. Hay cosas que NO se borran desde aquí (dinero de terceros, stock compartido): la función se niega.
//   5. El productor recibe el aviso, sin el motivo interno, y el resultado de cada envío queda escrito.
//   6. El archivo es un módulo de SOLO lectura.

import { readFileSync } from "node:fs";
import { MOTIVO_MINIMO, ROTULO_DE_TABLA, avisoAlProductor, conteosOrdenados, fraseNuclear } from "../src/lib/ocp/borradoNuclearTexto.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const acta = lee("docs/migraciones/2026-10-01_borrado_nuclear.sql");
const acciones = lee("src/app/ocp/(app)/nuclearActions.ts");
const servidor = lee("src/lib/ocp/borradoNuclear.ts");
const boton = lee("src/app/ocp/(app)/kr/BotonNuclear.tsx");
const pagina = lee("src/app/ocp/(app)/borrados/page.tsx");
const ruta = lee("src/app/ocp/(app)/borrados/[id]/json/route.ts");
const kr = lee("src/app/ocp/(app)/kr/page.tsx");
const rail = lee("src/lib/panel/consoles.ts");

// ── 1. Quién puede ──────────────────────────────────────────────────────────
{
  const dos = acciones.match(/export async function (inventarioNuclearAction|borradoNuclearAction)[\s\S]*?permisoDeEscritura\("ocp", "emite"\)/g) ?? [];
  check("las dos acciones son de clase `emite` del OCP — también la que solo lee el inventario", dos.length === 2 && (acciones.match(/permisoDeEscritura\(/g) ?? []).length === 2);
  check("ninguna acción lanza: devuelven resultado", !/\bthrow\b/.test(acciones.replace(/\/\/.*$/gm, "")));
  const funciones = ["_nuclear_filas(regclass, text, uuid[])", "_nuclear_ids(jsonb, text)", "_nuclear_recoger(text, uuid)", "nuclear_inventario(text, uuid)", "nuclear_borrar(text, uuid, text, uuid, text, text)"];
  check("las funciones de la base solo las ejecuta el servidor (revoke a public/anon/authenticated, grant a service_role)", funciones.every((f) => acta.includes(`revoke all on function public.${f} from public, anon, authenticated;`) && acta.includes(`grant execute on function public.${f} to service_role;`)));
  check("el archivo es una tabla service-role-only (RLS encendido, sin políticas)", acta.includes("alter table public.borrados_nucleares enable row level security;") && !/create policy/i.test(acta));
  check("la descarga de la instantánea pasa por la puerta de la consola", ruta.includes('await requireConsoleAccess("ocp");') && ruta.includes('"cache-control": "private, no-store"'));
}

// ── 2. La doble confirmación ────────────────────────────────────────────────
{
  check("la frase es «BORRAR <código>»", fraseNuclear("CTC-L-ABCDEF12") === "BORRAR CTC-L-ABCDEF12" && fraseNuclear("CTC-F-00000000") === "BORRAR CTC-F-00000000");
  check("1.ª confirmación: el inventario que da la base, el motivo y la casilla; sin los tres no se pasa a la segunda", boton.includes("inventarioNuclearAction(tipo, id)") && boton.includes("conteosOrdenados(inv.inventario.conteos)") && boton.includes("const puedeSeguir = !!inv && !bloqueado && motivo.trim().length >= MOTIVO_MINIMO && entiendo;") && boton.includes("disabled={!puedeSeguir}"));
  check("2.ª confirmación: el botón final solo se enciende con la frase exacta", boton.includes("const fraseOk = !!inv && frase.trim() === inv.frase;") && boton.includes("disabled={!fraseOk || cargando}") && boton.includes("confirmación {paso} de 2"));
  check("un bloqueo no deja ni empezar: se enseña el porqué y no hay botón de continuar", boton.includes("inv.inventario.bloqueos.map((b) => (") && boton.includes("{!bloqueado && ("));
  check("el servidor vuelve a exigir el motivo, la casilla y la frase (lo que valida la pantalla no cuenta)", acciones.includes("if (motivo.length < MOTIVO_MINIMO)") && acciones.includes('if (formData.get("entiendo") !== "si")') && acciones.includes("if (frase !== fraseNuclear(codigo))") && MOTIVO_MINIMO >= 10);
  check("el código de la frase lo calcula el servidor del id, no lo manda la pantalla", acciones.includes('const codigoDe = (tipo: TipoNuclear, id: string) => (tipo === "lote" ? ctcLotReference(id) : fincaCode(id));') && !/formData\.get\("codigo"\)/.test(acciones));
  // V5.135 (owner: «no veo el botón»): ARRIBA, junto al título, y una sola vez por vista.
  check("el botón está arriba, junto al título, en la vista del lote y en la de la finca cuando es la protagonista", /<h1 className=\{styles\.title\}>\{titulo\}<\/h1>\s*\{protagonista === "lote" && loteId && nombreLote && <BotonNuclear tipo="lote" id=\{loteId\} \/>\}\s*\{protagonista === "finca" && fincaId && nombreFinca && <BotonNuclear tipo="finca" id=\{fincaId\} \/>\}/.test(kr) && (kr.match(/<BotonNuclear /g) ?? []).length === 2);
}

// ── 3. Primero se archiva, después se borra; una transacción ────────────────
{
  const cuerpo = acta.slice(acta.indexOf("create or replace function public.nuclear_borrar("));
  const pos = (t) => cuerpo.indexOf(t);
  check("`nuclear_borrar` guarda la instantánea ANTES de borrar nada", pos("insert into borrados_nucleares") > 0 && pos("insert into borrados_nucleares") < pos("delete from producer_comm_log") && pos("delete from producer_comm_log") < pos("delete from lots where id = p_id;"));
  check("y se niega si falta el motivo o hay un bloqueo — antes de escribir nada", pos("Falta el motivo del borrado.") < pos("insert into borrados_nucleares") && pos("raise exception 'BLOQUEADO: %'") < pos("insert into borrados_nucleares"));
  check("el inventario y el borrado leen con la MISMA función (lo que se anuncia es lo que se borra)", (acta.match(/_nuclear_recoger\(p_tipo, p_id\)/g) ?? []).length === 2);
  check("deja una fila de auditoría de la operación, que apunta al archivo", cuerpo.includes("values ('borrado_nuclear', v_archivo, 'borrado_nuclear_' || p_tipo, p_admin,"));
  const tablas = ["fincas", "finca_parcelas", "finca_certificates", "lots", "lot_contributions", "lot_fichas", "arena_inscriptions", "muestras", "muestra_movimientos", "lot_evaluations", "lot_offers", "purchase_contracts", "contract_months", "contract_releases", "humidity_readings", "compras", "ctcx_selection_lotes", "lot_listings", "lot_auctions", "producer_comm_log", "audit_log"];
  // V5.143: `lot_referencias` (lo que el productor agrega con la Ficha cerrada) se archiva con el lote.
  const actaRefs = lee("docs/migraciones/2026-10-02_lot_referencias_y_fotos_opcionales.sql");
  check("las referencias agregadas por el productor entran en la instantánea, se van con el lote y tienen rótulo", actaRefs.includes("_nuclear_filas(''lot_referencias'', ''lot_id'', v_lotes)") && actaRefs.includes("lot_id uuid not null references public.lots(id) on delete cascade") && !!ROTULO_DE_TABLA.lot_referencias);
  check("la instantánea recoge el circuito entero del lote y la finca, y cada tabla tiene su rótulo en la pantalla", tablas.every((t) => acta.includes(`'${t}', _nuclear_filas('${t}'`) && ROTULO_DE_TABLA[t]), tablas.filter((t) => !acta.includes(`'${t}', _nuclear_filas('${t}'`) || !ROTULO_DE_TABLA[t]).join(", "));
  check("el servidor llama a la base primero; los objetos de Storage y el aviso van después", servidor.indexOf('service.rpc("nuclear_borrar"') > 0 && servidor.indexOf('service.rpc("nuclear_borrar"') < servidor.indexOf(".storage.from(bucket).remove(rutas)") && servidor.indexOf(".storage.from(bucket).remove(rutas)") < servidor.indexOf("sendTransactionalEmail("));
  check("el servidor no borra tablas por su cuenta: solo la función de la base", !/\.from\("(lots|fincas|purchase_contracts|lot_evaluations|arena_inscriptions|muestras|compras)"\)\s*\.delete\(/.test(servidor) && !/\.delete\(\)/.test(acciones));
}

// ── 4. Lo que NO se borra desde aquí ────────────────────────────────────────
{
  const bloqueos = ["order_items", "lot_reservations", "auction_bids", "mezcla_componentes", "sample_kit_items"];
  check("cinco bloqueos: pedidos, reservas y pujas de compradores; mezclas y Sample Kits", bloqueos.every((t) => new RegExp(`select count\\(\\*\\) into n from ${t} where[^;]+;\\s*if n > 0 then bloqueos := bloqueos \\|\\|`).test(acta)), bloqueos.filter((t) => !new RegExp(`select count\\(\\*\\) into n from ${t} where`).test(acta)).join(", "));
  check("una finca que aporta a un lote de OTRA finca no se borra: primero ese lote", acta.includes("where c.finca_id = p_id and l.finca_id is distinct from p_id") && acta.includes("borre primero esos lotes"));
  check("el mensaje del bloqueo llega a la pantalla en palabras", servidor.includes('.replace(/^BLOQUEADO: /, "No se puede borrar todavía. ")'));
}

// ── 5. El aviso al productor ────────────────────────────────────────────────
{
  const lote = avisoAlProductor({ tipo: "lote", nombre: "Castillo 2026", codigo: "CTC-L-7E360302", lotes: [], productor: "Wilson" });
  const finca = avisoAlProductor({ tipo: "finca", nombre: "La Primavera", codigo: "CTC-F-46D04770", lotes: ["A", "B"], productor: null });
  check("dice qué se retiró, que fue CTCx de forma unilateral y por razones del sistema, y que no tiene que hacer nada", /Castillo 2026/.test(lote.nota) && /CTC-L-7E360302/.test(lote.nota) && /unilateral/.test(lote.nota) && /razones del sistema/.test(lote.nota) && /no requiere ninguna acción/.test(lote.nota) && /unilateral/.test(lote.text) && /razones del sistema/.test(lote.text));
  check("el de una finca nombra sus lotes", /sus 2 lotes \(A, B\)/.test(finca.nota) && /una finca/.test(finca.subject) && /^Hola,/.test(finca.text));
  check("el aviso NO lleva el motivo interno (la función ni lo recibe)", !/motivo/i.test(lote.nota + lote.text) && avisoAlProductor.length === 1 && !servidor.includes("motivo: o.motivo,\n    lotes"));
  check("la nota queda en el hilo del productor SIN lote ni finca (ya no existen)", (() => { const i = servidor.indexOf('.from("producer_comm_log").insert({'); const bloque = servidor.slice(i, servidor.indexOf("});", i)); return i > 0 && bloque.includes("producer_id: archivo.producer_id,") && bloque.includes("note: aviso.nota,") && !/lot_id|finca_id/.test(bloque); })());
  check("el resultado de la nota y del correo queda escrito en el archivo (ningún envío se traga un fallo)", servidor.includes("aviso_comm_at: commAt, aviso_email_estado: emailEstado, aviso_email_error: emailError") && servidor.includes('emailEstado = envio.ok ? "enviado" : "fallo";') && servidor.includes("archivos_error: errorDeArchivos"));
}

// ── 6. El módulo de archivo ─────────────────────────────────────────────────
{
  check("«Archivo de Borrados» está en el rail del OCP y tiene su página", rail.includes('{ href: "/ocp/borrados", label: "Archivo de Borrados" }') && pagina.includes("Archivo de Borrados"));
  check("enseña quién, cuándo, el motivo, lo borrado, los archivos y el aviso; y deja bajar la instantánea", ["f.motivo", "conteosOrdenados(f.conteos ?? {})", "f.archivos_borrados_at", "f.aviso_comm_at", "f.aviso_email_estado", "f.ejecutado_por_nombre", "`/ocp/borrados/${f.id}/json`"].every((x) => pagina.includes(x)));
  check("es de SOLO lectura: ni acciones ni escrituras", !/\.(insert|update|delete|upsert)\(/.test(pagina) && !/Action/.test(pagina.replace(/\/\/.*$/gm, "")) && !/\.(insert|update|delete|upsert)\(/.test(ruta));
  check("la lista no arrastra la instantánea (pesa): solo se baja por operación", !/select\("\*"\)/.test(pagina) && !/["\s,]snapshot[",\s]/.test(pagina.match(/\.select\("([^"]+)"\)/)?.[1] ?? "") && ruta.includes('.select("*")'));
  check("los conteos se leen en orden: la entidad primero", conteosOrdenados({ audit_log: 7, lots: 2, fincas: 1, muestras: 3 }).map((c) => c.tabla).join() === "fincas,lots,audit_log,muestras" && conteosOrdenados({ tabla_nueva: 1 })[0].rotulo === "tabla_nueva");
}

if (fallos.length) {
  console.error(`✗ qa-borrado-nuclear: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ qa-borrado-nuclear: ${ok} comprobaciones OK, 0 fallos`);
