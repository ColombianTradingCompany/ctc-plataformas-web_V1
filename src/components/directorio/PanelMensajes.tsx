"use client";

import { useEffect, useRef, useState } from "react";
import { horaAhora, type Hilo } from "./data";

// Bandeja del directorio. Los hilos los tiene el panel de la app porque el
// directorio también los crea al escribirle a alguien desde una tarjeta.
export function PanelMensajes({
  activo,
  hilos,
  setHilos,
  hiloActivo,
  setHiloActivo,
}: {
  activo: boolean;
  hilos: Hilo[];
  setHilos: (h: Hilo[]) => void;
  hiloActivo: string | null;
  setHiloActivo: (id: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const cuerpo = useRef<HTMLDivElement>(null);
  const abierto = hilos.find((h) => h.id === hiloActivo) ?? null;

  // El hilo abre por el final, como cualquier chat. Solo mueve scrollTop, no
  // toca estado, así que no choca con react-hooks/set-state-in-effect.
  const ultimo = abierto?.mensajes.length ?? 0;
  useEffect(() => {
    if (cuerpo.current) cuerpo.current.scrollTop = cuerpo.current.scrollHeight;
  }, [hiloActivo, ultimo]);

  const enviar = () => {
    const t = texto.trim();
    if (!t || !abierto) return;
    setHilos(
      hilos.map((h) =>
        h.id === abierto.id ? { ...h, mensajes: [...h.mensajes, { yo: true, texto: t, hora: horaAhora() }] } : h
      )
    );
    setTexto("");
  };

  return (
    <section className={`panel${activo ? " activo" : ""}`} role="tabpanel" aria-label="Mensajes">
      <div className="panel__titulo con-cinta">
        <div>
          <p className="eyebrow">Mensajes</p>
          <h2>Tus conversaciones</h2>
        </div>
        <p>Escribes desde el directorio; las respuestas llegan aquí.</p>
      </div>

      <div className="mensajeria">
        <div className="mensajeria__hilos" role="listbox" aria-label="Conversaciones">
          {hilos.map((h) => (
            <button
              key={h.id}
              className="hilo"
              role="option"
              type="button"
              aria-selected={h.id === hiloActivo}
              onClick={() => setHiloActivo(h.id)}
            >
              <span className="avatar" style={{ background: h.color }}>{h.iniciales}</span>
              <span className="hilo__txt">
                <span className="hilo__n">{h.nombre}</span>
                <span className="hilo__p">{h.mensajes[h.mensajes.length - 1]?.texto}</span>
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
            {abierto?.mensajes.map((m, i) => (
              <div className={`burbuja burbuja--${m.yo ? "yo" : "otro"}`} key={i}>
                {m.texto}
                <time>{m.hora}</time>
              </div>
            ))}
          </div>
          <div className="conversacion__pie">
            <textarea
              placeholder="Escribe tu respuesta…"
              aria-label="Escribe tu respuesta"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
            />
            <button className="btn btn--sm" type="button" onClick={enviar}>Enviar</button>
          </div>
        </div>
      </div>
    </section>
  );
}
