"use client";

// ── «Hacer revisión» de una referencia del productor (V5.191, owner 2026-10-08) ─────────────────────────────────────────────
// «Cambiemos este botón de "Marcar Revisada" por "Hacer Revisión", lo cual abre un panel igual al de la evaluación, pero solo con la
// parte relevante (solo B2 o solo B3 si es de granulometría) […] Haz que el adjunto y la interfaz de evaluación estén en bloques
// paralelos lado a lado para compararse.»
// Un panel a pantalla completa con dos columnas que corren cada una por su cuenta: a la izquierda el ADJUNTO (el PDF en el visor del
// navegador, o la foto); a la derecha lo que el lector encontró en él, la planilla de evaluación con SOLO el bloque del reporte
// (`LabEvalEditor` con `bloques`) y, abajo y siempre a la vista, la nota para el productor y «Guardar la revisión».
// La lectura del texto corre sola al abrir (gratis, `leerReferencia`); la de la IA es un botón con su aviso de costo. Lo llenado se
// conserva mientras la página siga abierta: cerrar el panel no lo borra. Una referencia ya revisada se VE (sin editar).

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { AVANCE, ProgresoDeAccion, useAvance } from "@/components/panel/ProgresoDeAccion";
import { computeCva, computeFactor, computeSca2004, toLabEvaluation, type BloqueDePlanilla, type LabEvaluation } from "@/lib/arena/labEvaluation";
import type { IdiomaDePlanilla } from "@/lib/arena/planillaI18n";
import { MODO_LABEL, aplicaLectura, cotejoDeIdentidad, type ChoqueDeLectura, type ContextoDelLote, type LecturaDeReporte } from "@/lib/kaffetal/lectorDeReportes";
import { bloquesDeLaReferencia, resumenDeReferencia, type LotReferencia } from "@/lib/kaffetal/referencias";
import { guardarRevisionDeReferencia, leerReferencia, leerReferenciaConIA, type AdjuntoDeReferencia } from "../referenciasActions";
import css from "./revisionDeReferencia.module.css";

const NOMBRE_DEL_BLOQUE: Record<BloqueDePlanilla, string> = { b2: "B2 · Perfil de taza", b3: "B3 · Análisis físico y granulometría" };
const mimeDelNombre = (nombre: string) => (/\.pdf$/i.test(nombre) ? "application/pdf" : "image/*");
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });

/** Lo que viaja de vuelta al servidor de una lectura: qué propuso y de dónde (sin la identidad del reporte). */
const paraGuardar = (l: LecturaDeReporte) => ({
  origen: l.origen,
  formato: l.formato,
  confianza: l.confianza,
  avisos: l.avisos,
  campos: l.campos.map((c) => ({ clave: c.clave, modo: c.modo, mostrado: c.mostrado, origen: c.origen })),
});

export function RevisionDeReferencia({ referencia, url, contexto }: { referencia: LotReferencia; url: string | null; contexto: ContextoDelLote }) {
  const router = useRouter();
  const propios = bloquesDeLaReferencia(referencia.tipo);
  const otro: BloqueDePlanilla = propios[0] === "b3" ? "b2" : "b3";
  const guardada = referencia.planillaCtcx;
  const soloVer = Boolean(referencia.revisadaAt);

  const [abierto, setAbierto] = useState(false);
  const [adjunto, setAdjunto] = useState<AdjuntoDeReferencia | null>(url ? { url, mime: mimeDelNombre(referencia.fileName), nombre: referencia.fileName } : null);
  const [leyendo, setLeyendo] = useState<"no" | "en_curso" | "hecho">("no");
  const [lectura, setLectura] = useState<LecturaDeReporte | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lecturaIa, setLecturaIa] = useState<LecturaDeReporte | null>(null);
  const [choques, setChoques] = useState<ChoqueDeLectura[]>([]);
  const [planilla, setPlanilla] = useState<LabEvaluation>(() =>
    guardada ? guardada.planilla : toLabEvaluation(referencia.tipo === "taza" ? { vista: referencia.escala === "sca" ? "sca" : "cva", escala: referencia.escala === "sca" ? "sca" : "cva" } : {}),
  );
  const [conOtro, setConOtro] = useState(Boolean(guardada?.bloques.includes(otro)));
  const [nota, setNota] = useState("");
  const [tocada, setTocada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<IdiomaDePlanilla>("es");
  const [pending, start] = useTransition();
  const { enCurso, conAvance } = useAvance();
  // La planilla al día para lo que vuelve del servidor después de un rato (el revisor sigue escribiendo mientras tanto).
  const planillaRef = useRef(planilla);
  useEffect(() => {
    planillaRef.current = planilla;
  }, [planilla]);

  const bloques: BloqueDePlanilla[] = soloVer && guardada ? guardada.bloques : (["b2", "b3"] as const).filter((b) => propios.includes(b) || (conOtro && b === otro));

  // Con el panel abierto, la página de atrás no se mueve; Escape lo cierra.
  useEffect(() => {
    if (!abierto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const abrir = () => {
    setAbierto(true);
    if (soloVer || leyendo !== "no") return;
    setLeyendo("en_curso");
    start(async () => {
      try {
        const r = await conAvance(() => leerReferencia(referencia.id), AVANCE.leerReferencia);
        if (!r.ok) {
          setError(r.error);
        } else {
          setAdjunto(r.adjunto);
          setAviso(r.aviso);
          setLectura(r.lectura);
          if (r.lectura) setPlanilla(aplicaLectura(planillaRef.current, r.lectura.campos, propios, { soloVacios: true }).planilla);
        }
      } catch {
        setError("La lectura del adjunto no respondió. Puede llenar la planilla mirando el adjunto, o cerrar y volver a abrir.");
      }
      setLeyendo("hecho");
    });
  };

  const incluirOtro = (si: boolean) => {
    setConOtro(si);
    if (!si) return;
    let p = planillaRef.current;
    for (const l of [lectura, lecturaIa]) if (l) p = aplicaLectura(p, l.campos, [otro], { soloVacios: true }).planilla;
    setPlanilla(p);
  };

  const leerConIa = () => {
    if (!confirm("La lectura con IA envía el adjunto al modelo de visión (costo de IA: centavos de dólar; queda en el libro de consumo). Solo llena lo que la planilla tenga vacío. ¿Leer ahora?")) return;
    setError(null);
    start(async () => {
      try {
        const r = await conAvance(() => leerReferenciaConIA(referencia.id), AVANCE.leerReferenciaIa);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setLecturaIa(r.lectura);
        const res = aplicaLectura(planillaRef.current, r.lectura.campos, bloques, { soloVacios: true });
        setPlanilla(res.planilla);
        setChoques(res.choques);
      } catch {
        setError("La lectura con IA no respondió. Revise su conexión y vuelva a intentarlo.");
      }
    });
  };

  const guardar = () => {
    setError(null);
    start(async () => {
      try {
        const lecturas = [lectura, lecturaIa].filter((l): l is LecturaDeReporte => l !== null).map(paraGuardar);
        const r = await conAvance(() => guardarRevisionDeReferencia(referencia.id, { planilla, bloques, nota, lecturas }), AVANCE.guardarRevision);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setTocada(false);
        setAbierto(false);
        router.refresh();
      } catch {
        setError("La acción no respondió. Revise su conexión y vuelva a intentarlo; si persiste, recargue la página.");
      }
    });
  };

  const cambiar = (patch: Partial<LabEvaluation>) => {
    setPlanilla((p) => ({ ...p, ...patch }));
    setTocada(true);
  };

  // Lo que el reporte dice contra lo que da la planilla: el total (mismo protocolo) y el factor de los pesos.
  const delReporte = lecturaIa?.puntaje ?? lectura?.puntaje ?? null;
  const totalPlanilla = delReporte ? (delReporte.protocolo === "cva" ? computeCva(planilla).total : computeSca2004(planilla).total) : null;
  const factorDelReporte = lecturaIa?.factor ?? lectura?.factor ?? null;
  const factorDeLosPesos = computeFactor(planilla).yieldFactor;
  const cotejo = lectura ? cotejoDeIdentidad(lectura.identidad, contexto) : lecturaIa ? cotejoDeIdentidad(lecturaIa.identidad, contexto) : [];
  const delOtroBloque = [lectura, lecturaIa].reduce((n, l) => n + (l?.campos.filter((c) => c.bloque === otro).length ?? 0), 0);

  const etiquetaDelBoton = soloVer ? "Ver la revisión" : tocada ? "Seguir la revisión" : "Hacer revisión";

  return (
    <>
      <button type="button" className="btn btn-sm" onClick={abrir}>
        {etiquetaDelBoton}
      </button>
      {abierto && (
        <div className={css.fondo} role="dialog" aria-modal="true" aria-label={`Revisión de «${referencia.fileName}»`}>
          <div className={css.panel}>
            <div className={css.cabecera}>
              <h3>
                {soloVer ? "Revisión de la referencia" : "Hacer revisión"} · {resumenDeReferencia(referencia)}
              </h3>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Agregada el {fecha(referencia.createdAt)}
                {referencia.revisionSolicitadaAt && ` · revisión pedida el ${fecha(referencia.revisionSolicitadaAt)}`}
                {referencia.revisadaAt && ` · revisada el ${fecha(referencia.revisadaAt)}`}
              </span>
              <button type="button" className={css.cerrar} onClick={() => setAbierto(false)} aria-label="Cerrar el panel" title="Cerrar (Esc)">
                ×
              </button>
            </div>

            <div className={css.cuerpo}>
              {/* ── Izquierda: el adjunto, tal cual lo subió el productor ── */}
              <div className={css.adjunto}>
                <div className={css.adjuntoBarra}>
                  <span>📎 {referencia.fileName}</span>
                  {adjunto?.url && (
                    <a href={adjunto.url} target="_blank" rel="noopener noreferrer">
                      Abrir en otra pestaña ↗
                    </a>
                  )}
                </div>
                {!adjunto?.url ? (
                  <div className={css.vacio}>{leyendo === "en_curso" ? "Abriendo el adjunto…" : "No se pudo abrir el adjunto."}</div>
                ) : adjunto.mime === "application/pdf" ? (
                  <iframe className={css.visor} src={adjunto.url} title={`Adjunto: ${referencia.fileName}`} />
                ) : (
                  <div className={css.imagen}>
                    {/* Una URL firmada de Storage, que vence: no pasa por el optimizador de imágenes. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={adjunto.url} alt={`Adjunto: ${referencia.fileName}`} />
                  </div>
                )}
              </div>

              {/* ── Derecha: lo que el lector encontró y la planilla con solo el bloque del reporte ── */}
              <div className={css.columna}>
                <div className={css.planilla}>
                  {referencia.nota && (
                    <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--muted)" }}>
                      Nota del productor: «{referencia.nota}»
                    </p>
                  )}

                  {!soloVer && (
                    <div className={css.caja}>
                      <h4>Lo que el lector encontró en el adjunto</h4>
                      {leyendo === "en_curso" && <p style={{ margin: 0 }}>Leyendo el texto del adjunto…</p>}
                      {aviso && <p style={{ margin: "0 0 6px" }}>{aviso}</p>}
                      {lectura && (
                        <p style={{ margin: "0 0 6px", color: "var(--muted)" }}>
                          {lectura.formato === "fnc" ? "Formato de la Federación Nacional de Cafeteros" : "Formato libre"} ·{" "}
                          {lectura.campos.filter((c) => bloques.includes(c.bloque)).length} datos puestos en la planilla. Cada uno dice de dónde salió;
                          «derivado» sale de cifras del reporte y «interpretado» lleva una palabra del reporte a la planilla: revíselos.
                        </p>
                      )}
                      {[lectura, lecturaIa].map((l) =>
                        l && l.campos.some((c) => bloques.includes(c.bloque)) ? (
                          <details key={l.origen} open={l.origen === "ia" || !lecturaIa}>
                            <summary style={{ cursor: "pointer", fontWeight: 600, margin: "4px 0" }}>
                              {l.origen === "ia" ? `Leído con IA${l.confianza ? ` (confianza ${l.confianza})` : ""}` : "Leído del texto del PDF"}
                            </summary>
                            <table className={css.campos}>
                              <tbody>
                                {l.campos
                                  .filter((c) => bloques.includes(c.bloque))
                                  .map((c) => (
                                    <tr key={`${l.origen}-${c.clave}`}>
                                      <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{c.etiqueta}</td>
                                      <td>
                                        {c.mostrado}
                                        {c.fuente && <div className={css.fuente}>«{c.fuente}»</div>}
                                      </td>
                                      <td>
                                        <span className={`${css.modo} ${c.modo === "derivado" ? css.modoDerivado : c.modo === "interpretado" ? css.modoInterpretado : ""}`}>{MODO_LABEL[c.modo]}</span>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </details>
                        ) : null,
                      )}
                      {choques.length > 0 && (
                        <>
                          <p style={{ margin: "8px 0 2px", fontWeight: 600 }}>La IA leyó otra cosa en {choques.length} campo(s) ya llenos (se dejó lo de la planilla):</p>
                          <ul className={css.avisos}>
                            {choques.map((c) => (
                              <li key={c.campo.clave}>
                                {c.campo.etiqueta}: la IA leyó <b>{c.campo.mostrado}</b>; la planilla tiene <b>{c.actual}</b>.
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {[...new Set([...(lectura?.avisos ?? []), ...(lecturaIa?.avisos ?? [])])].length > 0 && (
                        <ul className={css.avisos}>
                          {[...new Set([...(lectura?.avisos ?? []), ...(lecturaIa?.avisos ?? [])])].map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      )}
                      {cotejo.length > 0 && (
                        <details style={{ marginTop: 8 }} open={cotejo.some((c) => c.coincide === false)}>
                          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                            De quién y de dónde es el reporte{cotejo.some((c) => c.coincide === false) ? " · hay datos que no coinciden con el lote" : ""}
                          </summary>
                          <div className={css.cotejo} style={{ marginTop: 6 }}>
                            {cotejo.map((c) => (
                              <div key={c.etiqueta} style={{ display: "contents" }}>
                                <span style={{ color: "var(--muted)" }}>{c.etiqueta}</span>
                                <span>
                                  {c.reporte}
                                  {c.lote && c.coincide === true && <span className={css.coincide}> · ✓ el lote dice «{c.lote}»</span>}
                                  {c.lote && c.coincide === false && <span className={css.difiere}> · ≠ el lote dice «{c.lote}»</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
                        <button type="button" className="btn btn-sm" onClick={leerConIa} disabled={pending || leyendo === "en_curso" || lecturaIa !== null}>
                          {lecturaIa ? "Leído con IA" : "Leer también con IA"}
                        </button>
                        <span className={css.fuente}>
                          Para lo que el texto no trae: las gráficas (el radar de atributos de la FNC) o un reporte en foto. Opt-in, con costo de IA.
                        </span>
                      </div>
                    </div>
                  )}

                  {!soloVer && (
                    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", margin: "0 0 10px", fontSize: 12.5 }}>
                      <span>
                        Se revisa: <b>{bloques.map((b) => NOMBRE_DEL_BLOQUE[b]).join(" + ")}</b>
                      </span>
                      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                        <input type="checkbox" checked={conOtro} onChange={(e) => incluirOtro(e.target.checked)} />
                        Incluir también {NOMBRE_DEL_BLOQUE[otro]}
                        {delOtroBloque > 0 && <span className={css.fuente}>(el adjunto trae {delOtroBloque} dato(s) de ese bloque)</span>}
                      </label>
                    </div>
                  )}

                  {(delReporte || factorDelReporte != null) && (
                    <div className={css.comparacion}>
                      {delReporte && (
                        <span>
                          Puntaje del reporte <b>{delReporte.valor.toFixed(2)}</b> ({delReporte.protocolo === "cva" ? "CVA" : "SCA 2004"}) · la planilla{" "}
                          {totalPlanilla == null ? (
                            <span style={{ color: "var(--muted)" }}>— (faltan atributos)</span>
                          ) : Math.abs(totalPlanilla - delReporte.valor) < 0.005 ? (
                            <span className={css.coincide}>{totalPlanilla.toFixed(2)} ✓</span>
                          ) : (
                            <span className={css.difiere}>{totalPlanilla.toFixed(2)} ≠</span>
                          )}
                        </span>
                      )}
                      {factorDelReporte != null && bloques.includes("b3") && (
                        <span>
                          Factor del reporte <b>{factorDelReporte.toFixed(2)}</b> · el de los pesos{" "}
                          {factorDeLosPesos == null ? (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          ) : Math.abs(factorDeLosPesos - factorDelReporte) < 0.05 ? (
                            <span className={css.coincide}>{factorDeLosPesos.toFixed(2)} ✓</span>
                          ) : (
                            <span className={css.difiere}>{factorDeLosPesos.toFixed(2)} ≠</span>
                          )}
                        </span>
                      )}
                    </div>
                  )}

                  <LabEvalEditor value={planilla} onChange={cambiar} disabled={soloVer || pending} lang={lang} onLang={setLang} ocultaGrado bloques={bloques} />
                </div>

                <div className={css.pie}>
                  {soloVer ? (
                    <p style={{ margin: 0, fontSize: 12.5 }}>
                      {referencia.notaCtc ? (
                        <>
                          <b>Nota de CTCx:</b> {referencia.notaCtc}
                        </>
                      ) : (
                        "Revisada sin nota para el productor."
                      )}
                    </p>
                  ) : (
                    <>
                      <textarea
                        rows={2}
                        maxLength={1200}
                        value={nota}
                        onChange={(e) => {
                          setNota(e.target.value);
                          setTocada(true);
                        }}
                        placeholder="Nota para el productor (opcional; obligatoria si el reporte no se lleva a la planilla)"
                        aria-label="Nota para el productor"
                      />
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <button type="button" className="btn btn-solid btn-sm" onClick={guardar} disabled={pending || leyendo === "en_curso"}>
                          Guardar la revisión
                        </button>
                        <span className={css.fuente}>
                          Guarda la planilla en formato CTCx ({bloques.map((b) => b.toUpperCase()).join(" + ")}), marca la referencia revisada y se lo dice al productor. No cambia el puntaje ni el grado del lote.
                        </span>
                      </div>
                      <ProgresoDeAccion enCurso={enCurso} />
                      {error && (
                        <p className={css.error} role="alert">
                          {error}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
