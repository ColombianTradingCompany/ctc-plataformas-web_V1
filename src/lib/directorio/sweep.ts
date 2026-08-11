import { createServiceRoleClient } from "@/lib/supabase/server";

// ── Retiro de soportes de certificación rechazados y vencidos ────────────────
// Cuando CTC rechaza un soporte, se le fija `remover_despues_de = now()+10 días`
// y se le avisa al usuario. Si no lo corrige (borrar + volver a subir), a los 10
// días se retira. `cargarDirectorio` ya barre los del propio usuario al entrar
// (la mitad visible de la promesa); esto es el BACKSTOP global para quien nunca
// vuelve. Se llama desde el cron de integraciones (diario, service-role) para no
// añadir un tercer cron y arriesgar el límite del plan Hobby de Vercel.
export async function barrerCertificadosVencidos(): Promise<{ retirados: number }> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("directorio_documents")
    .delete()
    .eq("verificacion", "rechazado")
    .lt("remover_despues_de", new Date().toISOString())
    .select("id");
  if (error) return { retirados: 0 };
  return { retirados: (data ?? []).length };
}
