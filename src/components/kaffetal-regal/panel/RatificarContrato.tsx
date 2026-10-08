"use client";

import { useEffect, useState } from "react";
import { previsualizarRatificacion, ratificarContrato, type VistaDeRatificacion } from "@/lib/ofertas/producerActions";
import { validarDeclaracion } from "@/lib/trato/minimos";
import { RETIRO_LIBRE_CICLO_PCT, RETIRO_LIBRE_EXTENDIDA_PCT } from "@/lib/trato/ventanas";
import { useToast } from "@/components/Toast";
import { FirmaDelContrato, type FirmaDelProductor } from "./FirmaDelContrato";

// ── V5.190 (owner, 2026-10-08) · «Ratificar y firmar» un contrato que CTCx aceptó provisionalmente ──────────────────────────
// El productor lo ratifica desde SU cuenta: lee el texto (ya con su nombre, su documento y la fecha de hoy), puede ajustar la cantidad
// declarada —el mínimo de la ventana, lo que le queda al lote y lo que ya se vendió o retiró— y firma con el dedo. El precio, la
// ventana y las demás condiciones no cambian. La acción (`ratificarContrato`) vuelve a validar todo y guarda la huella nueva.

export function RatificarContrato({ contractId, onListo, onCancelar }: { contractId: string; onListo: () => void; onCancelar: () => void }) {
  const { showToast } = useToast();
  const [vista, setVista] = useState<VistaDeRatificacion | null>(null);
  const [kg, setKg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    previsualizarRatificacion(contractId).then((r) => {
      if (!vivo) return;
      setVista(r);
      if (r.ok) setKg(String(r.actualKg));
    });
    return () => {
      vivo = false;
    };
  }, [contractId]);

  if (!vista) return <div style={{ marginTop: 8, fontSize: 12.5 }}>Preparando su contrato…</div>;
  if (!vista.ok) return <div role="alert" style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--accent)" }}>{vista.message}</div>;

  const n = Number(kg.replace(",", "."));
  const valido = Number.isFinite(n) && n > 0;
  const decl = valido ? validarDeclaracion({ kg: n, minimo: vista.minimoKg, disponibleKg: vista.disponibleKg }) : null;
  const sinRetiro = decl?.ok ? !decl.conRetiro : vista.datos.sinRetiro;
  const pct = sinRetiro ? 0 : vista.datos.ventana?.tipo === "ciclo" ? RETIRO_LIBRE_CICLO_PCT : RETIRO_LIBRE_EXTENDIDA_PCT;
  const datos = {
    ...vista.datos,
    declaradoKg: valido ? n : vista.actualKg,
    sinRetiro,
    ventana: vista.datos.ventana ? { ...vista.datos.ventana, retiroLibrePct: pct } : null,
  };
  const problema = !valido
    ? "Escriba cuántos kilos de CPS deja declarados."
    : n + 1e-9 < vista.movidoKg
      ? `Ya se vendió o se retiró ${vista.movidoKg} kg de este contrato: no puede declarar menos.`
      : vista.maxKg != null && n > vista.maxKg
        ? `Esta invitación admite hasta ${vista.maxKg} kg.`
        : decl && !decl.ok
          ? decl.motivo
          : null;

  async function ratificar(f: FirmaDelProductor) {
    if (problema) {
      setError(problema);
      return;
    }
    setBusy(true);
    const r = await ratificarContrato(contractId, n, f);
    setBusy(false);
    if (r.ok) {
      setError(null);
      showToast("Contrato ratificado y firmado ✓");
      onListo();
    } else {
      setError(r.message);
      showToast(r.message);
    }
  }

  return (
    <FirmaDelContrato
      datos={datos}
      ocupado={busy}
      onFirmar={ratificar}
      onVolver={onCancelar}
      error={error}
      titulo="Ratifique su contrato con CTCx"
      textoBoton="Ratificar y firmar"
      textoVolver="Ahora no"
      arriba={
        <label style={{ fontSize: 12.5, display: "grid", gap: 4 }}>
          Cantidad que deja declarada (kg de CPS)
          <input
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            inputMode="decimal"
            aria-label="Cantidad declarada en kg de CPS"
            style={{ padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)", maxWidth: 200 }}
          />
          <span style={{ fontSize: 11.5, color: problema ? "var(--accent)" : "var(--muted)", fontWeight: problema ? 700 : 400 }}>
            {problema ??
              `Hoy: ${vista.actualKg} kg · mínimo de su ventana ${vista.minimoKg} kg${vista.disponibleKg != null ? ` · el lote admite hasta ${vista.disponibleKg} kg` : ""}${vista.movidoKg > 0 ? ` · ya vendido o retirado ${vista.movidoKg} kg` : ""}.`}
          </span>
        </label>
      }
    />
  );
}
