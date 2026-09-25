import { CONSOLE_ORDER, consolaDelModulo, type PanelConsoleKey } from "./consoles";
import { CONSOLAS_DE_LEADS } from "./leadsPilares";

// ── Las tareas derivadas de la casa · la parte PURA (V5.60) ──────────────────
// Una «tarea» no se guarda: se DEDUCE de un estado que pide a alguien —un lead
// sin responder, una finca por revisar, un mensaje de productor, una humedad
// fuera de rango, un lote en fila para la Arena—. Lo único que se persiste es la
// casilla (`bcp_task_state`: hecho / pendiente), por la clave de la tarea.
//
// Nació en el Panel del OCP (2026-07-20) con todo escrito dentro de la página.
// La V5.60 lo generaliza para el **Tablero de Ejecución** del ECP: cada tarea
// dice de QUÉ CONSOLA es, y cada Panel enseña las suyas. Este módulo es puro
// (lo leen la carga, la acción y el guardián); las consultas viven en
// `tareasCarga.ts`.

export type TareaDeConsola = {
  /** `<tipo>:<id>` — la clave con la que se guarda su casilla. */
  key: string;
  icon: string;
  label: string;
  sublabel?: string;
  href: string;
  state: "tbd" | "done";
  /** La consola DUEÑA: donde se resuelve, no donde se mira. */
  consola: PanelConsoleKey;
};

/** Los tipos de tarea que existen. Uno nuevo se declara aquí o su casilla no se puede marcar.
 *  `muestra` (V5.88): la revisión de almacenaje a los 90 días de la catación (Gestión de Muestras, 2.ª tanda); su clave lleva
 *  el ciclo (`muestra:<lote>:<fecha>`) para que una casilla marcada no tape la revisión siguiente. */
export const TIPOS_DE_TAREA = ["lead", "finca", "comm", "humidity", "lot", "muestra"] as const;
export type TipoDeTarea = (typeof TIPOS_DE_TAREA)[number];

export function tipoDeLaTarea(key: string): TipoDeTarea | null {
  const tipo = key.split(":")[0] as TipoDeTarea;
  return TIPOS_DE_TAREA.includes(tipo) ? tipo : null;
}

/** La consola donde se mira el Tablero de Ejecución: quien lo ve puede marcar sus casillas. */
const CONSOLA_DEL_TABLERO: PanelConsoleKey = "ecp";

/**
 * Qué consolas pueden marcar la casilla de una tarea: la dueña (o dueñas, si el tipo se reparte entre
 * varias, como los leads) y la del Tablero. Clave desconocida → ninguna: la acción CIERRA.
 */
export function consolasDeLaTarea(key: string): PanelConsoleKey[] {
  const tipo = tipoDeLaTarea(key);
  if (!tipo) return [];
  const duenas: PanelConsoleKey[] =
    tipo === "lead"
      ? CONSOLAS_DE_LEADS
      : tipo === "lot"
        ? [consolaDelModulo("arena") ?? "ocp"] // el lote espera en la fila de la Arena
        : ["ocp"]; // finca, mensaje de productor y humedad son del pasaporte del lote
  return [...new Set<PanelConsoleKey>([...duenas, CONSOLA_DEL_TABLERO])];
}

/** Los Paneles que hay que revalidar cuando cambia una casilla: el de cada consola que la enseña. */
export function panelesDeLaTarea(key: string): string[] {
  return consolasDeLaTarea(key).map((k) => `/${k}`);
}

/** Agrupa por consola dueña, en el orden del rail, saltando las que no tienen nada. */
export function porConsola(tareas: TareaDeConsola[]): { consola: PanelConsoleKey; tareas: TareaDeConsola[] }[] {
  return CONSOLE_ORDER.map((consola) => ({ consola, tareas: tareas.filter((t) => t.consola === consola) })).filter(
    (g) => g.tareas.length > 0
  );
}
