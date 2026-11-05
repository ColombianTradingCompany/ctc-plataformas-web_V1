import type { Dominio } from "@/lib/integraciones/dominios";
import type { ClaseDeAccion } from "@/lib/panel/niveles";

// ── CTCx OS · el registro de módulos y su interruptor (V6.19, F2) · PURO ──────
// Cada módulo del OS se puede apagar SOLO, sin tocar las otras 19 superficies ni el
// resto del OS (PLAN F2: «para que un fallo del OS no bloquee las 19 superficies»). El
// estado vive en `platform_settings`, llave `os_modulos`, con esta forma:
//   { "version": 1,
//     "consola": { "encendido": true, "motivo": null },
//     "modulos": { "<clave>": { "encendido": bool, "motivo": string | null } } }
// La historia de los cambios va en `audit_log`, no en el valor.
//
// En F2 el OS solo LEE el interruptor (`interruptores.ts`, con estos valores por
// defecto). Quien lo escribe vive con la dueña de la tabla (`consolas`, en el BCP) y
// llega en el PR1b (crítica 24): este es el ÚNICO archivo del OS que ese escritor puede
// importar (`qa-os-check` H4).
//
// Cada `clave` tiene su carpeta `src/app/os/(app)/m/<clave>/` y su enlace en el rail
// de la OS (`CONSOLES.os.nav`); `qa-os-check` H1 lo exige en las dos direcciones. Desde
// F4, todo módulo que escriba nace `porDefecto: "apagado"`: lo enciende el owner.

export const CLAVE_MODULOS_OS = "os_modulos";

export type ModuloOs = {
  clave: string;
  titulo: string;
  ruta: `/os/m/${string}`;
  porDefecto: "encendido" | "apagado";
  /** El lado del Code Master: su enlace es `ownerOnly` y su página redirige a quien no es el owner. */
  soloOwner: boolean;
  /** La clase más alta de lo que hace el módulo (F2: todo es lectura). */
  clase: ClaseDeAccion;
  /**
   * El edificio de la Hacienda desde cuya hoja se abre (rumbo del owner, 5 nov: el OS abre en el mapa y cada módulo se abre
   * desde su edificio). `null` = no vive en un edificio (la Hacienda ES el mapa).
   */
  edificio: Dominio | null;
};

export const MODULOS_OS = [
  { clave: "hacienda", titulo: "Hacienda", ruta: "/os/m/hacienda", porDefecto: "encendido", soloOwner: false, clase: "lectura", edificio: null },
  { clave: "almacen", titulo: "Almacén", ruta: "/os/m/almacen", porDefecto: "encendido", soloOwner: false, clase: "lectura", edificio: "operacion_logistica" },
  // Almacén: hub 2 · Operación y Logística. Taller: hub 5 · Plataformas e IT (la salud del sistema, que ve también GVB). «Pedidos a Code» (solo el owner) será OTRO módulo.
  { clave: "taller", titulo: "Taller", ruta: "/os/m/taller", porDefecto: "encendido", soloOwner: false, clase: "lectura", edificio: "plataformas_it" },
] as const satisfies readonly ModuloOs[];

export type ClaveDeModulo = (typeof MODULOS_OS)[number]["clave"];

export type EstadoDeModulo = {
  encendido: boolean;
  motivo: string | null;
  /** `ajuste`: lo dice la llave; `defecto`: la llave no lo dice y manda el registro; `sin_lectura`: no se pudo leer. */
  origen: "ajuste" | "defecto" | "sin_lectura";
};

export const MOTIVO_SIN_LECTURA = "No se pudo leer el interruptor del módulo.";
const MOTIVO_MAX = 280;

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const motivoDe = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, MOTIVO_MAX) : null;

/** Todos apagados: lo que vale cuando la lectura de la llave falla (apagar el OS, nunca la red). */
export function modulosSinLectura(): Record<ClaveDeModulo, EstadoDeModulo> {
  return Object.fromEntries(
    MODULOS_OS.map((m) => [m.clave, { encendido: false, motivo: MOTIVO_SIN_LECTURA, origen: "sin_lectura" }])
  ) as Record<ClaveDeModulo, EstadoDeModulo>;
}

/**
 * Lee el valor de la llave `os_modulos` sin fiarse de él:
 *   · sin fila (`null`/`undefined`)          → los valores por defecto del registro;
 *   · un valor que no tiene la forma (versión ≠ 1, no es un objeto) → todo apagado, como una lectura fallida;
 *   · `consola.encendido === false`          → todos apagados, con el motivo de la consola;
 *   · una entrada de módulo sin booleano     → el valor por defecto de ese módulo;
 *   · claves que no están en el registro     → se ignoran.
 */
export function parsearModulos(value: unknown): Record<ClaveDeModulo, EstadoDeModulo> {
  if (value === null || value === undefined) {
    return Object.fromEntries(
      MODULOS_OS.map((m) => [m.clave, { encendido: m.porDefecto === "encendido", motivo: null, origen: "defecto" }])
    ) as Record<ClaveDeModulo, EstadoDeModulo>;
  }
  if (!esObjeto(value) || value.version !== 1) return modulosSinLectura();
  const consola = esObjeto(value.consola) ? value.consola : null;
  const modulos = esObjeto(value.modulos) ? value.modulos : {};
  const consolaApagada = consola?.encendido === false;
  return Object.fromEntries(
    MODULOS_OS.map((m): [ClaveDeModulo, EstadoDeModulo] => {
      if (consolaApagada) return [m.clave, { encendido: false, motivo: motivoDe(consola?.motivo), origen: "ajuste" }];
      const e = modulos[m.clave];
      if (esObjeto(e) && typeof e.encendido === "boolean") {
        return [m.clave, { encendido: e.encendido, motivo: e.encendido ? null : motivoDe(e.motivo), origen: "ajuste" }];
      }
      return [m.clave, { encendido: m.porDefecto === "encendido", motivo: null, origen: "defecto" }];
    })
  ) as Record<ClaveDeModulo, EstadoDeModulo>;
}

export function esClaveDeModulo(v: string): v is ClaveDeModulo {
  return MODULOS_OS.some((m) => m.clave === v);
}
