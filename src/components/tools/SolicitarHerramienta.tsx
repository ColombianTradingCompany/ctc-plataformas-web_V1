"use client";

import { useState, useTransition } from "react";
import { solicitarHerramienta } from "@/lib/tools/solicitudes";

// El botón de «Solicitar» de una herramienta bloqueada. Deja escribir una nota
// porque la razón por la que alguien quiere una herramienta es justo lo que el
// owner necesita para decidir — y es lo único que no está ya en la base.
export function SolicitarHerramienta({ toolId, nombre }: { toolId: string; nombre: string }) {
  const [pendiente, startTransition] = useTransition();
  const [nota, setNota] = useState("");
  const [estado, setEstado] = useState<"inicial" | "enviada" | "error">("inicial");
  const [error, setError] = useState<string | null>(null);

  if (estado === "enviada") {
    return (
      <p role="status">
        Solicitud enviada. CTC revisa las peticiones y activa <b>{nombre}</b> en su cuenta; se le avisará por
        correo.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const r = await solicitarHerramienta(toolId, nota);
          if (r.ok) setEstado("enviada");
          else {
            setEstado("error");
            setError(r.error);
          }
        });
      }}
    >
      <label>
        <span>¿Para qué la necesita? (opcional)</span>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          placeholder="Para cotizar los lotes de esta cosecha…"
        />
      </label>
      <button type="submit" className="btn btn-sm btn-solid" disabled={pendiente}>
        {pendiente ? "Enviando…" : `Solicitar ${nombre}`}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
