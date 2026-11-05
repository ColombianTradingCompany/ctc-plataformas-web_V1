// ── TAR-121 · la herramienta del taller como MÓDULO: lo que trae la URL ─────────────────────────────────────────────────
// Hasta aquí `herramientas.ctcexport.com/taller/<id>` solo entendía `?volver=`. Para que un asistente (o un tablero, un
// evento del calendario, el móvil) pueda mandar a alguien a una herramienta YA abierta en su trabajo, o prellenada con su
// finca o su lote, la página acepta además:
//
//   ?trabajo=<uuid>                         abre ese trabajo guardado — solo si es de la cuenta que entra
//   ?finca=<uuid | CTC-F-XXXXXXXX>          prellena un trabajo nuevo con una finca DE la cuenta
//   ?lote=<uuid | CTC-L-XXXXXXXX>           ídem con un lote de la cuenta (trae su finca)
//   ?volver=/herramientas/…                 la vuelta, con la lista blanca de siempre (`vueltaSegura`)
//
// Este módulo es PURO (sin red, sin base): LEE y VALIDA la forma de los parámetros y ARMA el prellenado a partir de un
// registro ya resuelto. Quién es dueño de qué lo decide el servidor (`entradaServidor.ts`), que filtra por la cuenta en la
// consulta — aquí nunca se toca la base. Lo vigila `scripts/qa-taller-entrada-check.mjs`.
//
// Lo que NO hace la URL, a propósito:
//   · No crea trabajos. Un enlace que crea filas al abrirse sería un GET con efectos; el menú propone el nombre y la
//     persona da UN clic. (Abrir un trabajo PROPIO con `?trabajo=` sí sella su `abierto_at`, igual que el clic del menú:
//     es la misma acción, hecha por la persona dueña.)
//   · No dice si un trabajo, una finca o un lote ajeno EXISTE: el aviso es el mismo para «no existe» y «no es suyo».
//   · No prellena un trabajo GUARDADO: si llegan `?trabajo=` y `?lote=` juntos, manda el trabajo tal como se dejó.

import { CARPETAS_HERRAMIENTAS, type DatoFinca, type DatoLote, type EntradaHerramienta } from "./carpetas";
import { normalizaReferencia } from "../catalogo/codigoPublico";
import { vueltaSegura } from "./volverSeguro";
import { origenDeSuperficie, ROOT_DOMAIN } from "../red/subdominios";

/** La vuelta por omisión del taller: la rejilla de herramientas (no la landing, que no abre ninguna). */
export const VUELTA_TALLER = "/herramientas/taller";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Ningún parámetro legítimo pasa de aquí; lo que sea más largo no se lee. */
const MAX_PARAM = 120;

export type RefRegistro = { tipo: "uuid"; valor: string } | { tipo: "referencia"; valor: string };

export type EntradaTaller = {
  volver: string;
  trabajo: string | null;
  finca: RefRegistro | null;
  lote: RefRegistro | null;
  /** Para la persona: qué no se pudo leer del enlace (nunca qué existe en la base). */
  avisos: string[];
};

export const AVISO = {
  trabajo: "El enlace trae un trabajo que no se reconoce: elige uno de tu lista.",
  finca: "El enlace trae una finca que no se reconoce: la herramienta abre sin prellenar.",
  lote: "El enlace trae un lote que no se reconoce: la herramienta abre sin prellenar.",
  fincaAjena: "Esa finca no está en tu cuenta: la herramienta abre sin prellenar.",
  loteAjeno: "Ese lote no está en tu cuenta: la herramienta abre sin prellenar.",
  fincaNoEsDelLote: "La finca del enlace no es la de ese lote: se usa la del lote.",
} as const;

type Param = string | string[] | undefined;

/** Un parámetro de la URL, solo si viene UNA vez y con un largo sensato. Repetido (`?lote=a&lote=b`) es ambiguo: se ignora. */
function uno(v: Param): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= MAX_PARAM ? t : null;
}

export function esUuid(v: string): boolean {
  return UUID_RE.test(v);
}

/** `CTC-F-XXXXXXXX` (o los ocho hexadecimales sueltos) → canónica, o `null`. Misma forma que `fincaCode()` de KR. */
export function normalizaReferenciaFinca(entrada: string): string | null {
  if (typeof entrada !== "string") return null;
  let limpio = entrada.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (limpio.startsWith("CTCF") && limpio.length === 12) limpio = limpio.slice(4);
  return /^[0-9A-F]{8}$/.test(limpio) ? `CTC-F-${limpio}` : null;
}

function refDe(v: string | null, normaliza: (s: string) => string | null): RefRegistro | null | undefined {
  if (v === null) return undefined; // no vino
  if (esUuid(v)) return { tipo: "uuid", valor: v.toLowerCase() };
  const r = normaliza(v);
  return r ? { tipo: "referencia", valor: r } : null; // vino y no se entiende
}

/** Lee los parámetros de la página del taller. Nunca lanza: lo que no se entiende se ignora y se avisa. */
export function leerEntrada(sp: Record<string, Param>): EntradaTaller {
  const avisos: string[] = [];

  const volverCrudo = uno(sp.volver);
  const volver = vueltaSegura(volverCrudo, "herramientas", VUELTA_TALLER);

  const t = uno(sp.trabajo);
  let trabajo: string | null = null;
  if (t !== null) {
    if (esUuid(t)) trabajo = t.toLowerCase();
    else avisos.push(AVISO.trabajo);
  } else if (sp.trabajo !== undefined) avisos.push(AVISO.trabajo);

  const f = refDe(uno(sp.finca), normalizaReferenciaFinca);
  if (f === null || (f === undefined && sp.finca !== undefined)) avisos.push(AVISO.finca);
  const l = refDe(uno(sp.lote), normalizaReferencia);
  if (l === null || (l === undefined && sp.lote !== undefined)) avisos.push(AVISO.lote);

  return { volver, trabajo, finca: f ?? null, lote: l ?? null, avisos };
}

// ── El registro resuelto y el prellenado ──────────────────────────────────────────────────────────────────────────────

export type FincaPrefill = {
  id: string;
  referencia: string;
  nombre: string;
  municipio: string | null;
  departamento: string | null;
  altitud_m: number | null;
};
export type LotePrefill = {
  referencia: string;
  nombre: string;
  variedad: string | null;
  proceso: string | null;
  altitud_m: number | null;
  /** La finca principal DEL LOTE (también de la cuenta), o `null`. La línea del lote siempre nombra ésta. */
  finca: FincaPrefill | null;
};
/** Lo que el servidor resolvió de la cuenta: solo datos que la persona ya ve en su panel. `finca` es la que llenan los
 *  campos de finca: la del parámetro o, si solo vino el lote, la del lote (ver `combinarRegistro`). */
export type RegistroPrefill = { finca: FincaPrefill | null; lote: LotePrefill | null };

/**
 * Junta la finca del parámetro y el lote. El lote TRAE su finca: si llegan los dos y la finca del enlace no es la del lote,
 * manda la del lote (un lote con la finca equivocada sería un origen falso escrito en el trabajo) y se avisa.
 */
export function combinarRegistro(fincaParam: FincaPrefill | null, lote: LotePrefill | null): { registro: RegistroPrefill | null; avisos: string[] } {
  const avisos: string[] = [];
  let finca = fincaParam ?? lote?.finca ?? null;
  if (lote?.finca && fincaParam && fincaParam.id !== lote.finca.id) {
    finca = lote.finca;
    avisos.push(AVISO.fincaNoEsDelLote);
  }
  return { registro: finca || lote ? { finca, lote } : null, avisos };
}

/** Lo que la concha le pasa a la herramienta. `campos` = selector → valor (lo aplica `ctc-bridge.js`); `registro` solo va
 *  a las herramientas que lo piden (`propio: true`) — mínimo privilegio: nadie recibe un dato que no declaró. */
export type PrefillHerramienta = {
  /** El nombre propuesto para el trabajo nuevo. */
  etiqueta: string;
  campos: { sel: string; valor: string }[];
  registro: RegistroPrefill | null;
};

const SELECTOR_RE = /^(#[A-Za-z][\w-]*|\[data-field="[\w-]+"\])$/;
/** Solo selectores simples: `#id` o `[data-field="x"]`. El guardián los busca en el archivo de la herramienta. */
export function esSelectorSimple(sel: string): boolean {
  return SELECTOR_RE.test(sel);
}

/** El contrato de entrada de una herramienta, o `null` si no prellena nada. */
export function entradaDe(toolId: string): EntradaHerramienta | null {
  return CARPETAS_HERRAMIENTAS.find((c) => c.id === toolId)?.entrada ?? null;
}

const unir = (partes: (string | null | undefined | false)[], sep = " · ") =>
  partes.map((p) => (typeof p === "string" ? p.trim() : "")).filter(Boolean).join(sep);

export function resumenFinca(f: FincaPrefill): string {
  const lugar = unir([f.municipio, f.departamento], ", ");
  return unir([`Finca ${f.nombre}`, lugar, f.altitud_m ? `${f.altitud_m} m` : null]).slice(0, 200);
}

export function resumenLote(l: LotePrefill): string {
  return unir([l.referencia, l.nombre, l.variedad, l.proceso, l.finca ? `Finca ${l.finca.nombre}` : null]).slice(0, 200);
}

function valorFinca(f: FincaPrefill, d: DatoFinca): string {
  switch (d) {
    case "id":
      return f.id;
    case "referencia":
      return f.referencia;
    case "nombre":
      return f.nombre;
    case "municipio":
      return f.municipio ?? "";
    case "departamento":
      return f.departamento ?? "";
    case "altitud_m":
      return f.altitud_m == null ? "" : String(f.altitud_m);
    case "resumen":
      return resumenFinca(f);
  }
}

function valorLote(l: LotePrefill, d: DatoLote): string {
  const f = l.finca;
  switch (d) {
    case "referencia":
      return l.referencia;
    case "nombre":
      return l.nombre;
    case "variedad":
      return l.variedad ?? "";
    case "proceso":
      return l.proceso ?? "";
    case "altitud_m":
      return l.altitud_m == null ? (f?.altitud_m == null ? "" : String(f.altitud_m)) : String(l.altitud_m);
    case "resumen":
      return resumenLote(l);
  }
}

/** El nombre propuesto para el trabajo nuevo (≤ 80, el techo de `crearTrabajo`). */
export function etiquetaDe(r: RegistroPrefill): string {
  if (r.lote) return unir([r.lote.nombre, r.lote.referencia]).slice(0, 80);
  if (r.finca) return `Finca ${r.finca.nombre}`.slice(0, 80);
  return "";
}

/**
 * Arma el prellenado de UNA herramienta con lo que su contrato declara. `null` si no hay registro o si la herramienta no
 * prellena nada (entonces la URL solo propone el nombre del trabajo: ver `etiquetaDe`).
 * Un mismo selector lo llena el PRIMER dato que lo pida, y el lote va antes que la finca (es lo más concreto).
 */
export function construirPrefill(toolId: string, registro: RegistroPrefill | null): PrefillHerramienta | null {
  if (!registro || (!registro.finca && !registro.lote)) return null;
  const etiqueta = etiquetaDe(registro);
  const contrato = entradaDe(toolId);
  if (!contrato) return { etiqueta, campos: [], registro: null };
  return { etiqueta, campos: camposDe(contrato, registro), registro: contrato.propio ? registro : null };
}

/** Los campos de un contrato con un registro: selector → valor. Un selector que no es simple, uno ya usado o un valor
 *  vacío no entran (un prellenado no escribe campos en blanco). */
export function camposDe(contrato: EntradaHerramienta, registro: RegistroPrefill): { sel: string; valor: string }[] {
  const campos: { sel: string; valor: string }[] = [];
  const usados = new Set<string>();
  const poner = (sel: string | undefined, valor: string) => {
    if (!sel || !esSelectorSimple(sel) || usados.has(sel) || !valor) return;
    usados.add(sel);
    campos.push({ sel, valor: valor.slice(0, 500) });
  };
  if (registro.lote && contrato.lote)
    for (const [d, sel] of Object.entries(contrato.lote) as [DatoLote, string][]) poner(sel, valorLote(registro.lote, d));
  if (registro.finca && contrato.finca)
    for (const [d, sel] of Object.entries(contrato.finca) as [DatoFinca, string][]) poner(sel, valorFinca(registro.finca, d));
  return campos;
}

// ── La puerta que devuelve a la herramienta (`?siguiente=`) ──────────────────────────────────────────────────────────
// Quien llega a un enlace de módulo SIN sesión ve «Entrar»; tras entrar, debe caer en la MISMA herramienta con sus
// parámetros, no en la rejilla. La puerta (`/herramientas/acceso`) lee `?siguiente=` y lo acepta solo si es una ruta del
// taller: misma lista blanca que la vuelta (`vueltaSegura`) y, además, dentro de `/herramientas/taller`. Todo lo demás
// cae al taller: un `siguiente` libre sería un redirect abierto DESPUÉS de un login, el sitio exacto donde la gente
// confía en lo que ve.

/** La puerta del taller. */
export const PUERTA_TALLER = "/herramientas/acceso";
/** La cookie que lleva el `siguiente` a través del camino de Google (vuelve al callback sin parámetros propios). */
export const COOKIE_SIGUIENTE = "ctc-herramientas-siguiente";

/** `siguiente` saneado, o `null` si no es una ruta del taller. */
export function siguienteSeguro(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > 600) return null;
  // Solo ASCII imprimible sin espacios: lo que escriben `urlDeHerramienta` y `rutaDeAcceso`. Un carácter de control o no-ASCII
  // llegaría crudo a la cabecera Location de `redirect()` y Node la rechaza (un 500 en la puerta).
  if (!/^[\x21-\x7e]+$/.test(t)) return null;
  if (vueltaSegura(t, "herramientas", VUELTA_TALLER) !== t) return null;
  return t === VUELTA_TALLER || t.startsWith(VUELTA_TALLER + "/") || t.startsWith(VUELTA_TALLER + "?") ? t : null;
}

/** El enlace «Entrar» de una herramienta: la puerta, con la herramienta como destino. */
export function rutaDeAcceso(siguiente: string): string {
  const s = siguienteSeguro(siguiente);
  return s && s !== VUELTA_TALLER ? `${PUERTA_TALLER}?siguiente=${encodeURIComponent(s)}` : PUERTA_TALLER;
}

/**
 * La URL de entrada de una herramienta del taller, relativa al host de Herramientas (`herramientas.ctcexport.com`). Para
 * quien construye enlaces (el tablero, un asistente, una notificación): mismo contrato que lee `leerEntrada`.
 */
export function urlDeHerramienta(
  slug: string,
  p: { trabajo?: string; finca?: string; lote?: string; volver?: string } = {}
): string {
  const q = new URLSearchParams();
  if (p.trabajo) q.set("trabajo", p.trabajo);
  if (p.finca) q.set("finca", p.finca);
  if (p.lote) q.set("lote", p.lote);
  if (p.volver) q.set("volver", p.volver);
  const s = q.toString();
  return `/herramientas/taller/${encodeURIComponent(slug)}${s ? `?${s}` : ""}`;
}

// ── La entrada que se comparte FUERA del sitio ───────────────────────────────────────────────────────────────────────
// Un asistente, un evento del calendario, un correo o el móvil necesitan la URL ABSOLUTA. La canónica es la del host de
// Herramientas sin la base: `https://herramientas.ctcexport.com/taller/<id>?…` (el proxy antepone `/herramientas`).

/** La URL absoluta y canónica de una entrada del taller. */
export function urlPublicaDeHerramienta(
  slug: string,
  p: { trabajo?: string; finca?: string; lote?: string; volver?: string } = {}
): string {
  return origenDeSuperficie("/herramientas") + urlDeHerramienta(slug, p).replace(/^\/herramientas(?=\/)/, "");
}

/**
 * El enlace de UN trabajo guardado, para «Copiar enlace» del Home Menu. Desde la red (`*.ctcexport.com`) es la canónica;
 * en local o en una vista previa, la del host donde se está (si no, el enlace llevaría a producción). El enlace NO es una
 * credencial: solo lo abre la cuenta dueña del trabajo (`abrirTrabajo` filtra `user_id`).
 */
export function enlaceDeTrabajo(slug: string, trabajoId: string, origenActual: string): string {
  let host = "";
  try {
    host = new URL(origenActual).hostname;
  } catch {
    host = "";
  }
  const red = host === ROOT_DOMAIN || host.endsWith("." + ROOT_DOMAIN);
  return red ? urlPublicaDeHerramienta(slug, { trabajo: trabajoId }) : `${origenActual}${urlDeHerramienta(slug, { trabajo: trabajoId })}`;
}
