import { NextResponse } from "next/server";
import { requireConsoleWrite } from "@/lib/panel/requireConsoleWrite";
import { getPanelUser, isPanelOwner } from "@/lib/panel/panelUsers";
import { PARAMS_V211, type PvcEntradas, type PvcParams } from "@/lib/pvc/motor";
import { publicarEdicion, versionModeloVigente } from "@/lib/pvc/servicio";

// «Publicar Reporte» del tablero embebido. Llega el estado S del tablero (que
// mezcla parámetros y entradas); aquí se separa: las ENTRADAS van a la edición y
// los PARÁMETROS se comparan con la versión vigente del modelo — si difieren, se
// rechaza con la lista de lo que cambió, porque un cambio de parámetros es una
// versión nueva del modelo (con acta), no una edición.
export const dynamic = "force-dynamic";

const ENTRADA_KEYS = ["codigo", "fecha_corte", "fecha_pub", "vigencia", "fnc", "fnc_30d", "fnc_corte", "fnc_max90", "fnc_prom180", "c_strip", "delta", "trm", "costo", "escalamiento", "score", "pvc_anterior"] as const;
const NO_PARAM = new Set<string>([...ENTRADA_KEYS, "nivel", "destino", "lb_excelso", "lb_pergamino", "k", "lead", "disparador"]);

export async function POST(request: Request) {
  const who = await requireConsoleWrite("bcp");
  if (!who) return NextResponse.json({ ok: false, error: "No se pudo ejecutar: o tu sesión del BCP ya no está activa (vuelve a iniciar sesión), o tu nivel en el BCP es de lectura y borradores y esta acción emite, publica, cobra, notifica o borra." }, { status: 401 });
  if (!isPanelOwner(await getPanelUser(who.userId))) return NextResponse.json({ ok: false, error: "Publicar es una decisión del owner." }, { status: 403 });

  let body: { code?: string; S?: Record<string, unknown>; notes?: string; correctionOf?: string | null };
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: "Cuerpo inválido." }, { status: 400 }); }
  const S = body.S;
  if (!S || typeof S !== "object") return NextResponse.json({ ok: false, error: "Falta el estado del tablero." }, { status: 400 });

  const mv = await versionModeloVigente();
  if (!mv) return NextResponse.json({ ok: false, error: "No hay versión del modelo registrada." }, { status: 409 });

  // Los parámetros del tablero deben coincidir con la versión vigente.
  const difieren = (Object.keys(mv.params) as (keyof PvcParams)[])
    .filter((k) => !NO_PARAM.has(k) && JSON.stringify(S[k] ?? PARAMS_V211[k]) !== JSON.stringify(mv.params[k]));
  if (difieren.length) {
    return NextResponse.json({ ok: false, error: `Los parámetros del tablero no coinciden con el modelo ${mv.version}: ${difieren.join(", ")}. Restablezca los valores o registre una versión nueva del modelo en Parámetros.` }, { status: 409 });
  }

  const vig = String(S.vigencia ?? "");
  const entradas: PvcEntradas = {
    codigo: String(body.code ?? S.codigo ?? "").trim() || "PVC-SIN-CODIGO",
    fecha_corte: String(S.fecha_corte ?? ""), fecha_pub: new Date().toISOString().slice(0, 10),
    valid_from: String(S.valid_from ?? S.fecha_corte ?? ""), valid_to: /^\d{4}-\d{2}-\d{2}$/.test(vig) ? vig : String(S.valid_to ?? ""),
    fnc: S.fnc as PvcEntradas["fnc"], fnc_30d: Number(S.fnc_30d), fnc_corte: Number(S.fnc_corte), fnc_max90: Number(S.fnc_max90), fnc_prom180: Number(S.fnc_prom180),
    c_strip: Number(S.c_strip), delta: Number(S.delta), trm: Number(S.trm), costo: Number(S.costo), escalamiento: Number(S.escalamiento),
    score: S.score as PvcEntradas["score"], pvc_anterior: Number(S.pvc_anterior ?? 0),
  };
  if (!Array.isArray(entradas.fnc) || entradas.fnc.length !== 5 || !(entradas.trm > 0) || !(entradas.fnc_30d > 0)) {
    return NextResponse.json({ ok: false, error: "Entradas incompletas: FNC de cinco meses, FNC 30 días y TRM son obligatorios." }, { status: 400 });
  }

  const r = await publicarEdicion({ params: mv.params, entradas, modelVersionId: mv.id, userId: who.userId, notes: body.notes, correctionOf: body.correctionOf ?? null });
  if ("error" in r) return NextResponse.json({ ok: false, error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true, id: r.id, pvc: r.pvc, modelVersion: mv.version });
}
