"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarRespuestaDeRonda } from "@/app/ocp/(app)/rondasActions";
import { RESULTADOS, type Aplicadas, type Campo, type ResultadoDeContacto, type ValoresDeLotes, type ValoresDelProductor } from "@/lib/os/rondas/tipos";
import type { LecturaDeContactos } from "@/lib/os/rondas/nucleo";
import { textosDelOs } from "@/lib/os/textos/idioma";
import r from "./rondas.module.css";

// ── CTCx OS · Rondas · «Registrar respuesta» (el formulario corto de UNA tarjeta) ─────────────────────────────────────────────
// Solo los campos que la ronda espera para ESE productor (los de los pedidos que le aplican, de su definición). Guarda por el
// escritor del OCP (`registrarRespuestaDeRonda`: compuerta del OCP, clase `emite`), que valida otra vez contra la definición, llama
// a la acción dueña de cada registro y deja la bitácora con quién y cuándo. Es la ÚNICA acción que importa la OS (`qa-os-check` R).
// En la demostración (`demo`) no llama a nada. Cerrado por defecto (acordeones cerrados, regla de la casa).

const cx = (...c: string[]) => c.join(" ");

type LoteDelFormulario = { id: string; nombre: string; campos: Campo[] };
type Props = {
  ronda: string;
  productorId: string;
  lotes: LoteDelFormulario[];
  camposDelProductor: Campo[];
  bitacora: LecturaDeContactos;
  demo?: boolean;
};

function CampoDeEntrada({ campo, nombre, valor, cambiar }: { campo: Campo; nombre: string; valor: string; cambiar: (v: string) => void }) {
  const x = textosDelOs().rondas;
  const id = `${nombre}-${campo.clave}`;
  const destino =
    campo.guarda.tipo === "accion" ? `${x.guardaEnAccion} ${campo.guarda.registro}` : `${x.guardaEnBitacora} ${campo.guarda.aplicarEn}`;
  if (campo.tipo === "opcion") {
    return (
      <fieldset className={`${r.grupo} ${r.campo}`}>
        <legend className={r.etiqueta}>{campo.etiqueta}</legend>
        {campo.ayuda && <span className={r.ayuda}>{campo.ayuda}</span>}
        <div className={r.opciones}>
          {(campo.opciones ?? []).map((o) => (
            <label key={o.valor} className={r.opcion}>
              <input type="radio" name={id} value={o.valor} checked={valor === o.valor} onChange={() => cambiar(o.valor)} />
              {o.etiqueta}
            </label>
          ))}
        </div>
        <span className={r.destino}>{destino}</span>
      </fieldset>
    );
  }
  return (
    <div className={r.campo}>
      <label htmlFor={id} className={r.etiqueta}>
        {campo.etiqueta}
        {campo.unidad && <span className={r.ayuda}> · {campo.unidad}</span>}
      </label>
      {campo.ayuda && <span className={r.ayuda}>{campo.ayuda}</span>}
      <input
        id={id}
        className={r.entrada}
        type={campo.tipo === "fecha" ? "date" : "text"}
        inputMode={campo.tipo === "numero" ? "decimal" : campo.tipo === "url" ? "url" : undefined}
        value={valor}
        onChange={(e) => cambiar(e.target.value)}
      />
      <span className={r.destino}>{destino}</span>
    </div>
  );
}

export function RegistrarRespuesta({ ronda, productorId, lotes, camposDelProductor, bitacora, demo = false }: Props) {
  const x = textosDelOs().rondas;
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  // Sin genéricos `useState<…>` en esta vista: `qa-os-check` lee el texto JSX entre «>» y «<», y un genérico lo confunde.
  const [resultado, setResultado] = useState(null as ResultadoDeContacto | null);
  const [volverEl, setVolverEl] = useState("");
  const [nota, setNota] = useState("");
  const [deLotes, setDeLotes] = useState({} as ValoresDeLotes);
  const [delProductor, setDelProductor] = useState({} as ValoresDelProductor);
  const [ok, setOk] = useState(null as Aplicadas | null);
  const [error, setError] = useState(null as string | null);
  const nombre = `ronda-${productorId}`;
  const sinBitacora = bitacora !== "leidos";

  const guardar = () => {
    setOk(null);
    setError(null);
    if (demo || !resultado) return;
    empezar(async () => {
      const res = await registrarRespuestaDeRonda({ ronda, productorId, resultado, volverEl, nota, lotes: deLotes, productor: delProductor });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOk(res.aplicadas);
      setDeLotes({});
      setDelProductor({});
      setNota("");
      router.refresh();
    });
  };

  return (
    <details className={r.plegable}>
      <summary>{x.registrar}</summary>
      <div className={`${r.plegableCuerpo} ${r.form}`}>
        {demo && <p className={r.nota}>{x.demo}</p>}
        {!demo && sinBitacora && <p className={r.error}>{bitacora === "sin_registro" ? x.bitacoraSinRegistro : x.bitacoraFallo}</p>}

        <fieldset className={r.grupo}>
          <legend>{x.comoFue}</legend>
          <div className={r.opciones}>
            {RESULTADOS.map((v) => (
              <label key={v} className={r.opcion}>
                <input type="radio" name={`${nombre}-resultado`} value={v} checked={resultado === v} onChange={() => setResultado(v)} />
                {x.resultados[v]}
              </label>
            ))}
          </div>
        </fieldset>

        {resultado === "volver_a_llamar" && (
          <div className={r.campo}>
            <label htmlFor={`${nombre}-volver`} className={r.etiqueta}>
              {x.volverEl}
            </label>
            <input id={`${nombre}-volver`} className={r.entrada} type="date" value={volverEl} onChange={(e) => setVolverEl(e.target.value)} />
          </div>
        )}

        {resultado === "alcanzado" && (
          <>
            <p className={r.nota}>{x.soloSiAlcanzado}</p>
            {lotes
              .filter((l) => l.campos.length > 0)
              .map((l) => (
                <fieldset key={l.id} className={r.grupo}>
                  <legend>{l.nombre}</legend>
                  {l.campos.map((c) => (
                    <CampoDeEntrada
                      key={c.clave}
                      campo={c}
                      nombre={`${nombre}-${l.id}`}
                      valor={deLotes[l.id]?.[c.clave] ?? ""}
                      cambiar={(v) => setDeLotes((p) => ({ ...p, [l.id]: { ...(p[l.id] ?? {}), [c.clave]: v } }))}
                    />
                  ))}
                </fieldset>
              ))}
            {camposDelProductor.length > 0 && (
              <fieldset className={r.grupo}>
                <legend>{x.delProductor}</legend>
                {camposDelProductor.map((c) => (
                  <CampoDeEntrada
                    key={c.clave}
                    campo={c}
                    nombre={nombre}
                    valor={delProductor[c.clave] ?? ""}
                    cambiar={(v) => setDelProductor((p) => ({ ...p, [c.clave]: v }))}
                  />
                ))}
              </fieldset>
            )}
          </>
        )}

        <div className={r.campo}>
          <label htmlFor={`${nombre}-nota`} className={r.etiqueta}>
            {x.nota}
          </label>
          <span className={r.ayuda}>{x.notaAyuda}</span>
          <textarea id={`${nombre}-nota`} className={r.entrada} rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>

        <button type="button" className={cx("btn", "btn-solid", r.guardar)} disabled={demo || pendiente || !resultado} onClick={guardar}>
          {pendiente ? x.guardando : x.guardar}
        </button>
        {ok && (
          <div role="status" className={r.ok}>
            <p>{x.guardado}</p>
            {Object.entries(ok).map(([k, v]) => (
              <p key={k}>
                {lotes.find((l) => k.startsWith(`${l.id}.`))?.nombre ?? k} · {v === "ok" ? x.aplicadaOk : `${x.aplicadaError}: ${v}`}
              </p>
            ))}
          </div>
        )}
        {error && (
          <p role="alert" className={r.error}>
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
