"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { ctcLotReference, fincaCode } from "@/components/kaffetal-regal/data";
import { ejecutarBorradoNuclear, inventarioNuclear } from "@/lib/ocp/borradoNuclear";
import { MOTIVO_MINIMO, fraseNuclear, type InventarioNuclear, type TipoNuclear } from "@/lib/ocp/borradoNuclearTexto";

// ── OCP · el BORRADO NUCLEAR de un lote o una finca (V5.134, owner 2026-10-01) ───────────────────────────────────────
// «Una manera desde OCP para poder borrar Lotes y Fincas, incluso después de haber procesado todo, […] como si no hubiese
// existido […] con doble confirmación.» Las DOS acciones son de clase `emite` (solo quien administra el OCP): hasta leer el
// inventario de lo que se borraría es cosa de quien puede borrarlo. Ninguna lanza: devuelven resultado (lección V12).
//   · inventarioNuclearAction  la PRIMERA confirmación: qué se va (conteos por tabla), qué lo bloquea, cuántos archivos.
//   · borradoNuclearAction     la SEGUNDA: exige el motivo, la casilla y la frase «BORRAR <código>» escrita tal cual — y
//                              las vuelve a comprobar aquí, porque lo que valida la pantalla no cuenta.

const esTipo = (v: unknown): v is TipoNuclear => v === "lote" || v === "finca";
const esUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const codigoDe = (tipo: TipoNuclear, id: string) => (tipo === "lote" ? ctcLotReference(id) : fincaCode(id));

export async function inventarioNuclearAction(tipo: string, id: string): Promise<{ ok: true; inventario: InventarioNuclear; codigo: string; frase: string } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  if (!esTipo(tipo) || !esUuid(id)) return { ok: false, error: "Petición inválida." };
  const r = await inventarioNuclear(createServiceRoleClient(), tipo, id);
  if (!r.ok) return r;
  const codigo = codigoDe(tipo, id);
  return { ok: true, inventario: r.inventario, codigo, frase: fraseNuclear(codigo) };
}

export async function borradoNuclearAction(tipo: string, id: string, formData: FormData): Promise<{ ok: true; archivoId: string; avisos: string[] } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  if (!esTipo(tipo) || !esUuid(id)) return { ok: false, error: "Petición inválida." };

  const motivo = String(formData.get("motivo") ?? "").trim();
  const frase = String(formData.get("frase") ?? "").trim();
  const codigo = codigoDe(tipo, id);
  if (motivo.length < MOTIVO_MINIMO) return { ok: false, error: `Escriba el motivo del borrado (al menos ${MOTIVO_MINIMO} caracteres): queda en el archivo.` };
  if (formData.get("entiendo") !== "si") return { ok: false, error: "Marque la casilla: el borrado es irreversible y el productor recibe un aviso." };
  if (frase !== fraseNuclear(codigo)) return { ok: false, error: `La frase no coincide. Escriba exactamente: ${fraseNuclear(codigo)}` };

  const service = createServiceRoleClient();
  const { data: admin } = await service.from("profiles").select("full_name, email").eq("id", permiso.userId).maybeSingle();
  const r = await ejecutarBorradoNuclear(service, {
    tipo,
    id,
    codigo,
    adminId: permiso.userId,
    adminNombre: (admin as { full_name: string | null; email: string | null } | null)?.full_name ?? (admin as { email: string | null } | null)?.email ?? null,
    motivo,
  });
  if (!r.ok) return r;
  for (const p of ["/ocp/kr", "/ocp/borrados", "/ocp", "/ocp/solicitudes", "/ocp/a-evaluar", "/ocp/en-evaluacion", "/ocp/ofertas", "/ocp/contratos", "/ocp/muestras", "/ocp/compras", "/ocp/catalogo"]) revalidatePath(p);
  return r;
}
