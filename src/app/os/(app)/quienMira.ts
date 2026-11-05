import "server-only";
import { cache } from "react";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";

// ── CTCx OS · quién mira (V6.19, F2) · SOLO SERVIDOR ─────────────────────────
// La compuerta de la consola, UNA vez por petición (`cache` de React): la llama el layout de la OS
// (que redirige si no hay llave `os`) y la llaman las páginas que leen el tablero, para pasarle
// `isOwner` al lector (el Modelo Económico es solo del owner). Así la página no vuelve a leer la
// identidad y nunca decide «owner» por su cuenta. No escribe.

export const identidadDeLaOs = cache(() => requireConsoleAccess("os"));
