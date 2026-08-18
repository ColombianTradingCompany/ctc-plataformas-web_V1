"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UNIDADES,
  PREGUNTAS,
  GENERALES,
  claveDe,
  claveGeneral,
  avanceDeUnidad,
  type UnidadId,
} from "@/lib/direccionamiento/definicion";
import styles from "./direccionamiento.module.css";

// ── Definición de contexto (F7 · plataforma V4.32) ──────────────────────────
// Las TRES preguntas —Producto · Cliente · Contexto— por cada una de las cuatro
// unidades de negocio, más tres campos globales. Es la estrella polar desde la
// que se redacta todo el material de la casa.
//
// SUSTITUYE AL MÓDULO VENDORIZADO de guion de vídeo (1.619 líneas, 103 KB) que
// ocupaba esta pantalla hasta V4.31. **Y con él se acaba el vendorizado aquí**:
// aquel archivo se mantenía verbatim para poder resincronizarlo con su autor,
// pero (a) el owner pidió retirar justo las partes que lo hacían suyo —formatos
// de vídeo, derivables, moodboard— y (b) ya traía dentro las unidades, colores
// y dominios de CTC, así que la resincronización era teórica desde el principio.
// Este archivo es de la casa y se mantiene como cualquier otro.
//
// La herramienta de guion NO desaparece del mundo: vive aparte, fuera de la
// plataforma, y el owner la estaba usando el mismo día de este cambio.
//
// QUÉ SE CONSERVA del módulo anterior, porque funcionaba: el guardado por
// `adapter` (mismo ámbito «record»), la redacción asistida campo a campo, y la
// MEMORIA del sistema inyectada en cada prompt — que es lo que impide que el
// modelo se invente un rango de Grados (ver `lib/direccionamiento/memoria.ts`).
//
// QUÉ SE VA: los tres formatos de vídeo, los derivables entre ellos, el
// moodboard y las referencias. El respaldo de todo lo escrito está en
// `docs/archive/direccionamiento_context_2026-08-18.json`.

type Adapter = {
  load: (scope: string) => Promise<unknown>;
  save: (scope: string, data: unknown) => Promise<unknown>;
};

type Props = {
  adapter: Adapter;
  aiComplete: (prompt: string) => Promise<string>;
  memory: () => Promise<string>;
  initialData: Record<string, unknown> | null;
};

const AUTOSAVE_MS = 3500;

export default function DefinicionDeContexto({ adapter, aiComplete, memory, initialData }: Props) {
  const inicial = (initialData?.values as Record<string, string> | undefined) ?? {};
  const [values, setValues] = useState<Record<string, string>>(inicial);
  const [unidad, setUnidad] = useState<UnidadId>("ctcx");
  const [estado, setEstado] = useState<"limpio" | "guardando" | "guardado" | "error">("limpio");
  const [redactando, setRedactando] = useState<string | null>(null);

  // El temporizador vive en una ref para que un re-render no lo duplique. Todo
  // el formulario es estado de React —ni una ref de DOM en el camino del
  // guardado—: la lección de FincaModal (2026-07-29), donde un flush de salida
  // leyó refs ya soltadas y escribió nulls encima de datos buenos.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef<string>(JSON.stringify(inicial));

  const guarda = useCallback(
    async (siguiente: Record<string, string>) => {
      const serie = JSON.stringify(siguiente);
      if (serie === ultimo.current) return;
      setEstado("guardando");
      try {
        await adapter.save("record", {
          version: "3.0",
          updatedAt: new Date().toISOString(),
          values: siguiente,
        });
        ultimo.current = serie;
        setEstado("guardado");
      } catch {
        setEstado("error");
      }
    },
    [adapter]
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void guarda(values), AUTOSAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [values, guarda]);

  const escribe = (clave: string, texto: string) =>
    setValues((v) => ({ ...v, [clave]: texto }));

  const U = useMemo(() => UNIDADES.find((u) => u.id === unidad)!, [unidad]);

  // La redacción asistida: el prompt lleva SIEMPRE la memoria del sistema
  // delante. Sin ella el modelo cita de memoria los rangos de los Grados, que
  // es exactamente el error que la casa lleva un año corrigiendo.
  const redacta = async (clave: string, label: string, ayuda: string) => {
    setRedactando(clave);
    try {
      const mem = await memory();
      const prompt = [
        mem,
        "",
        `Unidad de negocio: ${U.name} (${U.code}) — ${U.role}. Le habla a: ${U.quien}.`,
        `Tono de la casa: ${values[claveGeneral("tono")] ?? "(sin definir)"}`,
        `Momento: ${values[claveGeneral("momento")] ?? "(sin definir)"}`,
        "",
        `Redacte el campo «${label}» (${ayuda}).`,
        values[clave] ? `Texto actual, para mejorar: ${values[clave]}` : "El campo está vacío.",
        "Devuelva SOLO el texto del campo, sin encabezados ni comillas.",
      ].join("\n");
      const texto = await aiComplete(prompt);
      if (texto) escribe(clave, texto.trim());
    } finally {
      setRedactando(null);
    }
  };

  const avance = avanceDeUnidad(unidad, values);

  return (
    <div>
      <div className={styles.generales}>
        {GENERALES.map((c) => (
          <label key={c.id} className={styles.campo}>
            <span className={styles.campoLabel}>{c.label}</span>
            <span className={styles.campoHelp}>{c.help}</span>
            <textarea
              value={values[claveGeneral(c.id)] ?? ""}
              onChange={(e) => escribe(claveGeneral(c.id), e.target.value)}
              placeholder={c.ph}
              rows={c.id === "tono" ? 5 : 2}
            />
          </label>
        ))}
      </div>

      <div className={styles.unidades}>
        {UNIDADES.map((u) => {
          const a = avanceDeUnidad(u.id, values);
          const activa = u.id === unidad;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => setUnidad(u.id)}
              className={styles.unidadBtn}
              style={{
                borderColor: activa ? u.color : "var(--line)",
                background: activa ? u.tint : "transparent",
                color: activa ? u.color : "var(--ink)",
              }}
            >
              <b>{u.code}</b>
              <span>{u.name}</span>
              <small>
                {a.hechos}/{a.total}
              </small>
            </button>
          );
        })}
      </div>

      <div className={styles.unidadCabecera} style={{ borderLeftColor: U.color }}>
        <h2>{U.name}</h2>
        <p>
          {U.role} · le habla a {U.quien}
        </p>
        <p className={styles.avance}>
          {avance.hechos} de {avance.total} campos respondidos
          {estado === "guardando" && " · guardando…"}
          {estado === "guardado" && " · guardado ✓"}
          {estado === "error" && " · no se pudo guardar"}
        </p>
      </div>

      {PREGUNTAS.map((p) => (
        <section key={p.id} className={styles.pregunta}>
          <div className={styles.preguntaHead} style={{ borderColor: U.color }}>
            <h3 style={{ color: U.color }}>{p.titulo}</h3>
            <p>{p.pregunta}</p>
          </div>
          {p.campos.map((c) => {
            const clave = claveDe(unidad, p.id, c.id);
            return (
              <label key={c.id} className={styles.campo}>
                <span className={styles.campoLabel}>
                  {c.label}
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => void redacta(clave, c.label, c.help)}
                    disabled={redactando !== null}
                  >
                    {redactando === clave ? "Redactando…" : "Redactar"}
                  </button>
                </span>
                <span className={styles.campoHelp}>{c.help}</span>
                <textarea
                  value={values[clave] ?? ""}
                  onChange={(e) => escribe(clave, e.target.value)}
                  placeholder={c.ph}
                  rows={4}
                />
              </label>
            );
          })}
        </section>
      ))}
    </div>
  );
}
