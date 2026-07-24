"use client";

import { useEffect, useRef, useState } from "react";
import type { Hilo } from "@/lib/directorio/types";

// Bandeja del directorio. Controlada por AppView: los hilos y el hilo activo
// viven arriba (para sobrevivir a las recargas tras enviar/marcar leído). El
// canal 'ecp' es la conversación con CTC; 'directo', con otros miembros.
export function PanelMensajes({
  activo,
  hilos,
  activa,
  soloCtc,
  onSeleccionar,
  onEnviar,
}: {
  activo: boolean;
  hilos: Hilo[];
  activa: string;
  soloCtc: boolean;
  onSeleccionar: (clave: string, canal: "ecp" | "directo") => void;
  onEnviar: (clave: string, canal: "ecp" | "directo", texto: string) => Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const cuerpo = useRef<HTMLDivElement>(null);

  const abierto = hilos.find((h) => h.clave === activa) ?? hilos[0] ?? null;
  const ultimo = abierto?.mensajes.length ?? 0;

  useEffect(() => {
    if (cuerpo.current) cuerpo.current.scrollTop = cuerpo.current.scrollHeight;
  }, [activa, ultimo]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || !abierto) return;
    setEnviando(true);
    await onEnviar(abierto.clave, abierto.canal, t);
    setEnviando(false);
    setTexto("");
  };

  return (
    <section className={`panel${activo ? " activo" : ""}`} role="tabpanel" aria-label="Mensajes">
      <div className="panel__titulo con-cinta">
        <div>
          <p className="eyebrow">{soloCtc ? "Conversación con CTC" : "Mensajes"}</p>
          <h2>{soloCtc ? "Tu verificación y soporte" : "Tus conversaciones"}</h2>
        </div>
        <p>
          {soloCtc
            ? "Escríbele al equipo de CTC sobre tu inscripción. Aquí te llega tu Código de Verificado."
            : "Escribes desde el directorio; las respuestas llegan aquí. Arriba está tu chat con CTC."}
        </p>
      </div>

      <div className="mensajeria">
        <div className="mensajeria__hilos" role="listbox" aria-label="Conversaciones">
          {hilos.map((h) => (
            <button key={h.clave} className="hilo" role="option" type="button"
              aria-selected={h.clave === abierto?.clave} onClick={() => onSeleccionar(h.clave, h.canal)}>
              <span className="avatar" style={{ background: h.color }}>{h.iniciales}</span>
              <span className="hilo__txt">
                <span className="hilo__n">{h.nombre}</span>
                <span className="hilo__p">{h.mensajes[h.mensajes.length - 1]?.texto ?? h.sub}</span>
              </span>
              {h.noLeido ? <span className="hilo__no-leido" aria-label="Sin leer" /> : null}
            </button>
          ))}
        </div>

        <div className="conversacion">
          <div className="conversacion__top">
            <span className="avatar" style={{ width: 34, height: 34, fontSize: ".85rem", background: abierto?.color ?? "#4A1E8C" }}>
              {abierto?.iniciales ?? "—"}
            </span>
            <div>
              <p className="hilo__n">{abierto?.nombre ?? "Selecciona una conversación"}</p>
              <p className="hilo__p">{abierto?.sub ?? "—"}</p>
            </div>
          </div>
          <div className="conversacion__cuerpo" ref={cuerpo}>
            {abierto?.mensajes.length ? (
              abierto.mensajes.map((m) => (
                <div className={`burbuja burbuja--${m.yo ? "yo" : "otro"}`} key={m.id}>
                  {m.texto}
                  <time>{m.hora}</time>
                </div>
              ))
            ) : (
              <p className="aviso-linea" style={{ padding: "1rem" }}>
                {abierto?.canal === "ecp"
                  ? "Aún no hay mensajes. Escríbenos si tienes dudas sobre tu inscripción."
                  : "Aún no hay mensajes en esta conversación."}
              </p>
            )}
          </div>
          <div className="conversacion__pie">
            <textarea placeholder="Escribe tu respuesta…" aria-label="Escribe tu respuesta" value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
            <button className="btn btn--sm" type="button" onClick={enviar} disabled={enviando || !abierto}>
              {enviando ? "…" : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
