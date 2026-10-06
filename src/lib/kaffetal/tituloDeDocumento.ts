// V5.169 · el título (= el nombre con que se guarda el PDF) de los documentos del productor y de la finca, resuelto en el
// servidor con el nombre general y el código. Del lado del productor solo se nombra si el documento es suyo: a quien no lo es,
// el título no le dice de qué lote o finca se trata.
import type { Metadata } from "next";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { ctcLotReference, fincaCode } from "@/components/kaffetal-regal/data";
import { nombreDeArchivo } from "./nombreDeArchivo";

const PRIVADO = { index: false, follow: false } as const;

async function usuario(): Promise<string | null> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return user?.id ?? null;
}

export async function tituloDeLote(documento: string, lotId: string, opts: { verificarDueno?: boolean } = {}): Promise<Metadata> {
  const { data } = await createServiceRoleClient().from("lots").select("id, name, producer_id").eq("id", lotId).maybeSingle();
  const lote = data as { id: string; name: string; producer_id: string } | null;
  if (!lote || (opts.verificarDueno !== false && lote.producer_id !== (await usuario()))) return { title: `${documento} · CTCx`, robots: PRIVADO };
  return { title: nombreDeArchivo([documento, lote.name, ctcLotReference(lote.id)]), robots: PRIVADO };
}

export async function tituloDeFinca(documento: string, fincaId: string, opts: { verificarDueno?: boolean } = {}): Promise<Metadata> {
  const { data } = await createServiceRoleClient().from("fincas").select("id, name, producer_id").eq("id", fincaId).maybeSingle();
  const finca = data as { id: string; name: string | null; producer_id: string } | null;
  if (!finca || (opts.verificarDueno !== false && finca.producer_id !== (await usuario()))) return { title: `${documento} · CTCx`, robots: PRIVADO };
  return { title: nombreDeArchivo([documento, finca.name, fincaCode(finca.id)]), robots: PRIVADO };
}

export async function tituloDeContrato(contractId: string): Promise<Metadata> {
  const { data } = await createServiceRoleClient().from("purchase_contracts").select("lot_id").eq("id", contractId).maybeSingle();
  return data ? tituloDeLote("Contrato", (data as { lot_id: string }).lot_id) : { title: "Contrato · CTCx", robots: PRIVADO };
}
