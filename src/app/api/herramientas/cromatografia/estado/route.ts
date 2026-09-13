import { NextResponse } from "next/server";

// ── Lector de Cromatografía de Suelo · ¿está viva la lectura con IA? ─────────
// Nació el 2026-09-13, cuando el owner repuso las claves y pidió verificarlas: sin
// este endpoint, la única forma de saber si la lectura funciona en producción era
// iniciar sesión con una cuenta Plus y gastar una lectura.
//
// Comprueba las DOS variables contra `GET /v1/models`, que no consume tokens, y
// devuelve solo un estado por variable. Nunca devuelve ni un carácter de la clave.
//
// LA PRECEDENCIA es la misma que en `../route.ts`: la clave propia del Lector
// (`CROMATOGRAPHY_ANTHROPIC_API_KEY`, que separa su gasto en la consola de
// Anthropic) y, si no está, la general de la plataforma (`ANTHROPIC_API_KEY`,
// la de Coffeed, Direccionamiento, Datawave, RT-Scriptor, el asesor de KR, las
// mejoras de Arena y el escáner de fichas del OCP).
//
// Es público a propósito: dice si un servicio está disponible, no quién lo usa.
// El resultado se guarda 10 minutos por instancia para que nadie convierta el
// endpoint en un martillo contra la API de Anthropic.

type EstadoClave = "ok" | "sin-clave" | "clave-invalida" | "limite-o-saldo" | "error";

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; cuerpo: Record<string, unknown> } | null = null;

async function probar(clave: string | undefined): Promise<EstadoClave> {
  const k = clave?.trim();
  if (!k) return "sin-clave";
  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": k, "anthropic-version": "2023-06-01" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (res.ok) return "ok";
    if (res.status === 401 || res.status === 403) return "clave-invalida";
    if (res.status === 402 || res.status === 429) return "limite-o-saldo";
    return "error";
  } catch {
    return "error";
  }
}

export async function GET() {
  const cabeceras = { "cache-control": "no-store" };
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ ...cache.cuerpo, en_cache: true }, { headers: cabeceras });
  }

  const [propia, general] = await Promise.all([
    probar(process.env.CROMATOGRAPHY_ANTHROPIC_API_KEY),
    probar(process.env.ANTHROPIC_API_KEY),
  ]);
  const claveEnUso = propia !== "sin-clave" ? "CROMATOGRAPHY_ANTHROPIC_API_KEY" : general !== "sin-clave" ? "ANTHROPIC_API_KEY" : null;
  const estadoEnUso = claveEnUso === "CROMATOGRAPHY_ANTHROPIC_API_KEY" ? propia : general;

  const cuerpo = {
    lectura_con_ia: estadoEnUso === "ok" ? "disponible" : "no-disponible",
    clave_en_uso: claveEnUso,
    claves: { CROMATOGRAPHY_ANTHROPIC_API_KEY: propia, ANTHROPIC_API_KEY: general },
    comprobado_at: new Date().toISOString(),
  };
  cache = { at: Date.now(), cuerpo };
  return NextResponse.json({ ...cuerpo, en_cache: false }, { headers: cabeceras });
}
