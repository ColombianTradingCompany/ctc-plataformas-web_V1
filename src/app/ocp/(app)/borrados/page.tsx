import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { TIPO_NUCLEAR_LABEL, conteosOrdenados, type TipoNuclear } from "@/lib/ocp/borradoNuclearTexto";
import { supplierCode } from "@/components/kaffetal-regal/data";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── OCP · Kaffetal Regal · Archivo de Borrados (V5.134, owner 2026-10-01) ────────────────────────────────────────────
// «Agreguemos un módulo que guarde esta info como archivo.» Cada BORRADO NUCLEAR de un lote o una finca (`kr/BotonNuclear`)
// deja aquí una fila: quién lo hizo, cuándo, el motivo interno, qué se borró tabla por tabla, qué pasó con los archivos y
// cómo se le avisó al productor. La instantánea completa (todas las filas borradas, en JSON) se descarga por operación.
// Es SOLO lectura: de aquí no se restaura ni se borra nada. La tabla es `borrados_nucleares` (service-role-only).

type Fila = {
  id: string;
  tipo: TipoNuclear;
  codigo: string;
  nombre: string;
  producer_id: string | null;
  productor_nombre: string | null;
  productor_email: string | null;
  motivo: string;
  conteos: Record<string, number> | null;
  archivos: { path: string }[] | null;
  archivos_borrados_at: string | null;
  archivos_error: string | null;
  aviso_nota: string | null;
  aviso_comm_at: string | null;
  aviso_email_estado: string | null;
  aviso_email_error: string | null;
  ejecutado_por_nombre: string | null;
  ejecutado_at: string;
};

const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
const EMAIL: Record<string, string> = { enviado: "correo enviado", fallo: "el correo NO salió", sin_correo: "sin correo en la cuenta" };

export default async function ArchivoDeBorradosPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id: abierto } = await searchParams;
  const service = createServiceRoleClient();
  const { data } = await service
    .from("borrados_nucleares")
    .select("id, tipo, codigo, nombre, producer_id, productor_nombre, productor_email, motivo, conteos, archivos, archivos_borrados_at, archivos_error, aviso_nota, aviso_comm_at, aviso_email_estado, aviso_email_error, ejecutado_por_nombre, ejecutado_at")
    .order("ejecutado_at", { ascending: false });
  const filas = (data as Fila[] | null) ?? [];

  return (
    <div>
      <h1 className={styles.title}>Archivo de Borrados</h1>
      <p className={styles.subtitle}>
        Los lotes y las fincas que CTCx retiró con el <b>borrado nuclear</b> (desde la vista del lote o de la finca en{" "}
        <Link href="/ocp/kr">Productores, Fincas y Lotes</Link>). En la plataforma ya no existen; aquí queda la copia de lo que se borró, quién lo hizo, por qué y el aviso que
        recibió el productor. Es un archivo: solo se lee.
      </p>

      {filas.length === 0 ? (
        <p className={styles.empty}>Todavía no se ha hecho ningún borrado nuclear.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filas.map((f) => {
            const total = Object.values(f.conteos ?? {}).reduce((s, n) => s + n, 0);
            const nArchivos = f.archivos?.length ?? 0;
            return (
              <details key={f.id} open={f.id === abierto} id={`borrado-${f.id}`} className={styles.card} style={{ display: "block", ...(f.id === abierto ? { borderColor: "#991B1B" } : {}) }}>
                <summary style={{ cursor: "pointer", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                  <span className={`${styles.badge} ${styles.badgeBad}`}>{TIPO_NUCLEAR_LABEL[f.tipo] ?? f.tipo}</span>
                  <b>{f.nombre}</b>
                  <span className="mono" style={{ fontSize: 12 }}>{f.codigo}</span>
                  <span className={styles.meta}>
                    {f.productor_nombre ?? "Productor"}
                    {f.producer_id ? ` · ${supplierCode(f.producer_id)}` : ""} · {fechaHora(f.ejecutado_at)} · por {f.ejecutado_por_nombre ?? "—"} · {total} registro(s)
                  </span>
                </summary>

                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  <div>
                    <p className={styles.meta} style={{ margin: "0 0 2px", fontWeight: 700 }}>Motivo (interno)</p>
                    <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>{f.motivo}</p>
                  </div>

                  <div>
                    <p className={styles.meta} style={{ margin: "0 0 4px", fontWeight: 700 }}>Lo que se borró</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "2px 16px", fontSize: 13 }}>
                      {conteosOrdenados(f.conteos ?? {}).map((c) => (
                        <div key={c.tabla} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: "1px dashed var(--line)", padding: "2px 0" }}>
                          <span>{c.rotulo}</span>
                          <b className="mono">{c.n}</b>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className={styles.meta} style={{ margin: "0 0 2px", fontWeight: 700 }}>Archivos</p>
                    <p style={{ margin: 0, fontSize: 13 }}>
                      {nArchivos === 0 ? "No tenía archivos." : `${nArchivos} archivo(s) (fotos, videos, documentos).`}{" "}
                      {nArchivos > 0 && (f.archivos_borrados_at ? <span>Quitados del almacenamiento el {fechaHora(f.archivos_borrados_at)}.</span> : <span className={styles.warn}>Sin confirmar que se quitaran del almacenamiento{f.archivos_error ? `: ${f.archivos_error}` : "."}</span>)}
                    </p>
                  </div>

                  <div>
                    <p className={styles.meta} style={{ margin: "0 0 2px", fontWeight: 700 }}>Aviso al productor</p>
                    <p style={{ margin: 0, fontSize: 13 }}>
                      {f.aviso_comm_at ? <>Nota en su hilo de mensajes el {fechaHora(f.aviso_comm_at)}</> : <span className={styles.warn}>La nota en su hilo NO quedó</span>}
                      {" · "}
                      {f.aviso_email_estado === "fallo" ? (
                        <span className={styles.warn}>
                          {EMAIL.fallo}
                          {f.aviso_email_error ? ` (${f.aviso_email_error})` : ""}
                        </span>
                      ) : (
                        <>
                          {EMAIL[f.aviso_email_estado ?? ""] ?? "correo sin registrar"}
                          {f.aviso_email_estado === "enviado" && f.productor_email ? ` a ${f.productor_email}` : ""}
                        </>
                      )}
                      .
                    </p>
                    {f.aviso_nota && (
                      <p className={styles.meta} style={{ margin: "4px 0 0", fontStyle: "italic" }}>
                        «{f.aviso_nota}»
                      </p>
                    )}
                  </div>

                  <div>
                    <a className="btn btn-sm" href={`/ocp/borrados/${f.id}/json`}>
                      ⬇ Descargar la instantánea (JSON)
                    </a>
                    <span className={styles.meta} style={{ marginLeft: 10 }}>Todas las filas borradas, tabla por tabla, tal como estaban.</span>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
