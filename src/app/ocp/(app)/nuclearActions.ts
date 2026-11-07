"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { SIN_CODIGO } from "@/components/kaffetal-regal/data";
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

// ── V6.23 (TAR-149) · la frase usa el código GUARDADO ─────────────────────────────────────────────────────────────────
// El código del lote es `lots.public_code` y el de la finca `fincas.codigo`; nada se deriva del uuid. Un lote sin finca no tiene
// código: su frase es fija («BORRAR LOTE SIN CÓDIGO») y el archivo lo guarda como «Sin código».
type Service = ReturnType<typeof createServiceRoleClient>;

/** El código guardado del lote o la finca; null si no tiene (un lote sin finca) o ya no existe. */
async function codigoGuardado(service: Service, tipo: TipoNuclear, id: string): Promise<string | null> {
  const { data } =
    tipo === "lote"
      ? await service.from("lots").select("public_code").eq("id", id).maybeSingle()
      : await service.from("fincas").select("codigo").eq("id", id).maybeSingle();
  const fila = data as { public_code?: string | null; codigo?: string | null } | null;
  const codigo = (tipo === "lote" ? fila?.public_code : fila?.codigo)?.trim();
  return codigo || null;
}

/** La frase de la segunda confirmación: «BORRAR <código>», o la fija del registro sin código. */
const fraseDe = (tipo: TipoNuclear, codigo: string | null) => (codigo ? fraseNuclear(codigo) : tipo === "lote" ? "BORRAR LOTE SIN CÓDIGO" : "BORRAR FINCA SIN CÓDIGO");

export async function inventarioNuclearAction(tipo: string, id: string): Promise<{ ok: true; inventario: InventarioNuclear; codigo: string; frase: string } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  if (!esTipo(tipo) || !esUuid(id)) return { ok: false, error: "Petición inválida." };
  const service = createServiceRoleClient();
  const r = await inventarioNuclear(service, tipo, id);
  if (!r.ok) return r;
  const codigo = await codigoGuardado(service, tipo, id);
  return { ok: true, inventario: r.inventario, codigo: codigo ?? SIN_CODIGO, frase: fraseDe(tipo, codigo) };
}

export async function borradoNuclearAction(tipo: string, id: string, formData: FormData): Promise<{ ok: true; archivoId: string; avisos: string[] } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  if (!esTipo(tipo) || !esUuid(id)) return { ok: false, error: "Petición inválida." };

  const motivo = String(formData.get("motivo") ?? "").trim();
  const frase = String(formData.get("frase") ?? "").trim();
  const service = createServiceRoleClient();
  const codigo = await codigoGuardado(service, tipo, id);
  const esperada = fraseDe(tipo, codigo);
  if (motivo.length < MOTIVO_MINIMO) return { ok: false, error: `Escriba el motivo del borrado (al menos ${MOTIVO_MINIMO} caracteres): queda en el archivo.` };
  if (formData.get("entiendo") !== "si") return { ok: false, error: "Marque la casilla: el borrado es irreversible y el productor recibe un aviso." };
  if (frase !== esperada) return { ok: false, error: `La frase no coincide. Escriba exactamente: ${esperada}` };

  const { data: admin } = await service.from("profiles").select("full_name, email").eq("id", permiso.userId).maybeSingle();
  const r = await ejecutarBorradoNuclear(service, {
    tipo,
    id,
    // El archivo exige un código: el guardado, o «Sin código» para el lote sin finca.
    codigo: codigo ?? SIN_CODIGO,
    adminId: permiso.userId,
    adminNombre: (admin as { full_name: string | null; email: string | null } | null)?.full_name ?? (admin as { email: string | null } | null)?.email ?? null,
    motivo,
  });
  if (!r.ok) return r;
  for (const p of ["/ocp/kr", "/ocp/borrados", "/ocp", "/ocp/solicitudes", "/ocp/a-evaluar", "/ocp/en-evaluacion", "/ocp/ofertas", "/ocp/contratos", "/ocp/muestras", "/ocp/compras", "/ocp/catalogo"]) revalidatePath(p);
  return r;
}
