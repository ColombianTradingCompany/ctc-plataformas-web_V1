import type { SupabaseClient } from "@supabase/supabase-js";
import { ActionForm } from "@/components/panel/ActionForm";
import { CONSEJO_FOTO_PUBLICA, TABLA_FOTOS_PUBLICAS, fotosAprobadasEnOrden } from "@/lib/catalogo/fotosPublicas";
import { aprobarFotoPublica, retirarFotoPublica } from "./fotosPublicasActions";
import styles from "@/components/panel/shared.module.css";

// ── V5.202 (owner, 2026-10-10) · «Pública en la vitrina: sí/no», foto por foto ─────────────────────────────────────────────────
// El owner: lo público debe «omitir info que haga fácil circumventar a CTCx para llegar al Productor». Decisión del nodo final:
// ninguna foto de la cámara del productor sale en público sin que CTCx la APRUEBE. Aquí, en la vista del lote, se ven sus fotos B4
// con su estado y el botón para aprobarla o retirarla (`fotosPublicasActions.ts`, clase `emite`, con su fila en `audit_log`). Lo
// público enseña UNA: la primera aprobada en el orden de la Ficha (la cinta, `/api/catalogo/foto/…` y la portada del Dossier
// público); el grado del Dossier lleva la ilustración de CTCx (o la imagen de CTCx Selection), nunca otra foto del lote.
// Servidor: lee las aprobaciones con el service role que le pasa `LoteSeccion`. Si la tabla aún no existe, lo dice y no ofrece
// botones (la migración la aplica el nodo final).

export type FotoDelLote = { assetId: string; fileName: string; url: string | null };

export async function FotosPublicas({ service, lotId, fotos }: { service: SupabaseClient; lotId: string; fotos: FotoDelLote[] }) {
  const { data, error } = await service.from(TABLA_FOTOS_PUBLICAS).select("asset_id, aprobada_at").eq("lot_id", lotId);
  const tablaLista = !error;
  const aprobadas = new Map(((data as { asset_id: string; aprobada_at: string }[] | null) ?? []).map((r) => [String(r.asset_id).toLowerCase(), r.aprobada_at]));
  const [portada] = fotosAprobadasEnOrden(
    fotos.map((f) => f.assetId),
    new Set(aprobadas.keys())
  );

  return (
    <div className={styles.card} style={{ display: "block", margin: "10px 0" }}>
      <h4 style={{ margin: "0 0 6px", fontSize: 13.5 }}>Fotos del lote en el catálogo público</h4>
      <p className={styles.meta} style={{ margin: "0 0 6px" }}>
        Ninguna foto del productor sale en lo público (la cinta del Catálogo Activo, la vitrina y la portada del Dossier público) sin que CTCx la apruebe aquí. Sale UNA: la primera aprobada, en el orden de la Ficha. Sin ninguna aprobada, el lote lleva el sello de su grado y la ilustración de CTCx. Un lote de CTCx Selection lleva siempre la imagen de CTCx. Retirar una foto se nota en la cinta en unos minutos (caché de 10 minutos).
      </p>
      <p className={styles.warn} style={{ margin: "0 0 8px" }}>
        Antes de aprobar, revise la foto entera: {CONSEJO_FOTO_PUBLICA.charAt(0).toLowerCase() + CONSEJO_FOTO_PUBLICA.slice(1)} Tampoco la casa ni nada que permita reconocer la finca o llegar al productor.
      </p>
      {!tablaLista && (
        <p className={styles.warn} style={{ margin: "0 0 8px" }}>
          La aprobación de fotos públicas se activa al aplicar la migración docs/migraciones/2026-10-10_fotos_publicas.sql. Hasta entonces ninguna foto del productor sale en público.
        </p>
      )}
      {fotos.length === 0 ? (
        <p className={styles.meta} style={{ margin: 0 }}>
          El lote no tiene fotos B4: en lo público lleva el sello de su grado y la ilustración de CTCx.
        </p>
      ) : (
        fotos.map((f) => {
          const k = f.assetId.toLowerCase();
          const publica = aprobadas.has(k);
          const desde = aprobadas.get(k);
          return (
            <div key={f.assetId} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderTop: "1px dashed var(--line)", padding: "8px 0" }}>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noopener noreferrer" title="Abrir la foto entera">
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura firmada de Storage (bucket privado), solo en la consola */}
                  <img src={f.url} alt={`Foto B4 del lote: ${f.fileName}`} width={120} height={80} style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 6, display: "block" }} />
                </a>
              ) : (
                <span className={styles.meta} style={{ width: 120 }}>
                  sin vista previa
                </span>
              )}
              <span style={{ flex: 1, minWidth: 200, fontSize: 13 }}>
                {f.fileName}
                <span style={{ display: "block" }}>
                  Pública en la vitrina: <b>{publica ? "sí" : "no"}</b>
                  {publica && portada && portada.toLowerCase() === k ? " · es la portada pública" : ""}
                  {publica && desde ? ` · aprobada el ${new Date(desde).toLocaleDateString("es-CO")}` : ""}
                </span>
              </span>
              {tablaLista &&
                (publica ? (
                  <ActionForm action={retirarFotoPublica.bind(null, lotId, f.assetId)} submitLabel="Retirar de lo público" pendingLabel="Retirando…" buttonClassName="btn btn-sm" />
                ) : (
                  <ActionForm action={aprobarFotoPublica.bind(null, lotId, f.assetId)} submitLabel="Aprobar para lo público" pendingLabel="Aprobando…" />
                ))}
            </div>
          );
        })
      )}
    </div>
  );
}
