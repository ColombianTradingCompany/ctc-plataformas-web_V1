// ── Proveedor Desacoplado · la parte PURA (V5.75, owner 2026-09-23) ──────────
// La Ruta Desacoplada del Kaffetal Regal (`docs/componentes/briefs/consolas-rutas-del-proveedor.md`):
// CTCx encuentra un café que vale la pena en manos de alguien que no quiere
// entender ni usar la plataforma, y lleva el proceso EN SU NOMBRE. Para eso la
// cuenta de productor la crea CTCx, con un correo-ETIQUETA sin buzón —el mismo
// desdoblamiento que `panel_users.delivery_email` y `partner_accounts`: el
// correo de acceso es identidad, no bandeja— y sin contraseña conocida. Si
// algún día se le entrega, se le asigna el correo real de alguien; si no, nunca.
//
// Este módulo no importa nada con efectos: lo leen las acciones, el remitente de
// correo (que NO manda nada a una etiqueta: iría al catch-all y aparecería en el
// Buzón) y el guardián `scripts/qa-asistencia-check.mjs`.
import { ROOT_DOMAIN } from "@/lib/red/subdominios";

export type Gestion = "desacoplado" | "entregado";

/** Cómo se rotula en el OCP. `null` = cuenta propia del productor, sin rótulo. */
export const GESTION_LABEL: Record<Gestion, string> = {
  desacoplado: "Desacoplado · lo lleva CTCx",
  entregado: "Entregado al productor",
};
/** La versión corta, para la línea bajo el nombre en la tabla `/ocp/kr`. */
export const GESTION_CORTA: Record<Gestion, string> = { desacoplado: "Desacoplado · CTCx", entregado: "Entregado" };

export const PREFIJO_ETIQUETA = "desacoplado-";
const ALFABETO = "abcdefghijklmnopqrstuvwxyz0123456789";
const LARGO_SLUG = 8;

/** Un slug de 8 caracteres [a-z0-9]. `aleatorio` se inyecta para poder probarlo sin azar. */
export function slugDesacoplado(aleatorio: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < LARGO_SLUG; i++) s += ALFABETO[Math.min(ALFABETO.length - 1, Math.floor(aleatorio() * ALFABETO.length))];
  return s;
}

export function correoEtiquetaDesacoplado(slug: string): string {
  return `${PREFIJO_ETIQUETA}${slug}@${ROOT_DOMAIN}`;
}

const RX_ETIQUETA = new RegExp(`^${PREFIJO_ETIQUETA}[a-z0-9]{${LARGO_SLUG}}@${ROOT_DOMAIN.replace(/\./g, "\\.")}$`, "i");

/** ¿Es un correo-etiqueta de proveedor desacoplado? (Ningún correo sale hacia uno de estos.) */
export function esCorreoEtiquetaDesacoplado(correo: string | null | undefined): boolean {
  return !!correo && RX_ETIQUETA.test(correo.trim());
}

const RX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Un correo real para ENTREGAR la cuenta: con forma de correo y que no sea otra etiqueta. */
export function correoRealValido(correo: string): boolean {
  const c = correo.trim();
  return RX_CORREO.test(c) && !esCorreoEtiquetaDesacoplado(c);
}
