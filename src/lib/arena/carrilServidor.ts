import type { createServiceRoleClient } from "@/lib/supabase/server";
import { CLAVE_CARRIL_DE_PAGO, leerCarrilDePago, type CarrilDePago } from "@/lib/arena/payment";

// ── El carril de pago, del lado del servidor (V5.129) ────────────────────────────────────────────────────────────────
// `platform_settings` es service-role-only (RLS sin políticas, como casi todas): el OCP lo lee al pintar Solicitudes de
// Evaluación, y el productor lo recibe por `carrilDePagoAction` (`producerActions.ts`). La forma la valida `payment.ts`.

type Service = ReturnType<typeof createServiceRoleClient>;

export async function cargarCarrilDePago(service: Service): Promise<CarrilDePago> {
  const { data } = await service.from("platform_settings").select("value").eq("key", CLAVE_CARRIL_DE_PAGO).maybeSingle();
  return leerCarrilDePago((data as { value: unknown } | null)?.value);
}
