"use client";

import { useCallback, useEffect, useState } from "react";
import { ToastProvider, useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { Landing } from "./Landing";
import { LoginModal } from "./LoginModal";
import { AppDashboard } from "./AppDashboard";
import { FichaView, type FichaSaveUpdate } from "./FichaView";
import { FincaModal } from "./FincaModal";
import { InfoModal } from "./InfoModal";
import {
  EMPTY_GI,
  GRADE_DB,
  STAGE_DB,
  lotCode,
  type Finca,
  type GeneralInfo,
  type Lot,
  type ProducerContract,
} from "./data";

type View = "landing" | "app" | "ficha";

const STAGE_EXTRA = [
  "Recién creado · complete la ficha técnica",
  "Ficha guardada · siguen videos y muestra",
  "Video recibido · falta enviar la muestra",
  "Muestra en tránsito hacia CTC",
  "En fila para la Arena",
  "Evaluado por el panel de la Arena",
  "Galardonado · en trato con CTC",
];

type FincaRow = {
  id: string;
  name: string;
  vereda: string | null;
  municipio: string | null;
  departamento: string | null;
  altitude_m: number | null;
  hectares: string | number | null;
  history_text: string | null;
  characteristics_text: string | null;
};

type LotRow = {
  id: string;
  finca_id: string | null;
  name: string;
  stage: string;
  grade: string | null;
  status_note: string | null;
  datasheet: Lot["datasheet"];
};

function dbFincaToFinca(row: FincaRow): Finca {
  return {
    id: row.id,
    name: row.name,
    vereda: row.vereda || "—",
    mun: row.municipio || "—",
    depto: row.departamento || "—",
    alt: row.altitude_m != null ? String(row.altitude_m) : "—",
    ha: row.hectares != null ? String(row.hectares) : "—",
    geo: "",
    hist: row.history_text || "—",
    carac: row.characteristics_text || "—",
  };
}

function dbLotToLot(row: LotRow, fincaNameById: Map<string, string>): Lot {
  const stage = STAGE_DB.indexOf(row.stage as (typeof STAGE_DB)[number]);
  const stageIdx = stage < 0 ? 0 : stage;
  return {
    id: row.id,
    code: lotCode(row.id),
    name: row.name,
    finca: (row.finca_id && fincaNameById.get(row.finca_id)) || "—",
    stage: stageIdx,
    grade: row.grade ? GRADE_DB[row.grade] : null,
    extra: row.status_note || STAGE_EXTRA[stageIdx],
    datasheet: row.datasheet ?? null,
  };
}

function Experience() {
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());
  const [view, setView] = useState<View>("landing");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("productor");
  const [loginOpen, setLoginOpen] = useState(false);

  const [gi, setGi] = useState<GeneralInfo>(EMPTY_GI);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [contracts, setContracts] = useState<ProducerContract[]>([]);
  const [curLotId, setCurLotId] = useState<string | null>(null);

  const [fincaModalOpen, setFincaModalOpen] = useState(false);
  const [editingFincaIdx, setEditingFincaIdx] = useState(-1);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const loadData = useCallback(
    async (uid: string) => {
      const [{ data: profile }, { data: producerProfile }, { data: fincaRows }, { data: lotRows }, { data: contractRows }] =
        await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", uid).single(),
          supabase.from("producer_profiles").select("company_name, tax_id").eq("profile_id", uid).single(),
          supabase.from("fincas").select("*").eq("producer_id", uid).order("created_at", { ascending: true }),
          supabase.from("lots").select("*").eq("producer_id", uid).order("created_at", { ascending: false }),
          supabase
            .from("purchase_contracts")
            .select("*, lots(id, name, grade), contract_releases(*), humidity_readings(*)")
            .order("created_at", { ascending: false }),
        ]);

      const fincaList = ((fincaRows as FincaRow[] | null) ?? []).map(dbFincaToFinca);
      const fincaNameById = new Map(fincaList.map((f) => [f.id, f.name]));
      setFincas(fincaList);
      setLots(((lotRows as LotRow[] | null) ?? []).map((r) => dbLotToLot(r, fincaNameById)));

      type ContractRow = {
        id: string;
        lot_id: string;
        status: ProducerContract["status"];
        price_per_kg_locked: number | null;
        quantity_frozen_kg: number | null;
        lots: { id: string; name: string; grade: string | null } | null;
        contract_releases: {
          month_number: number;
          max_release_pct: string | number;
          released_kg: number | null;
          released_at: string | null;
          payment_confirmed_at: string | null;
          shipped_at: string | null;
        }[];
        humidity_readings: { reading_month: number; humidity_pct: string | number; flagged: boolean; reported_at: string }[];
      };

      setContracts(
        ((contractRows as ContractRow[] | null) ?? []).map((c) => ({
          id: c.id,
          lotId: c.lot_id,
          lotCode: lotCode(c.lot_id),
          lotName: c.lots?.name ?? "—",
          grade: c.lots?.grade ? GRADE_DB[c.lots.grade] : null,
          status: c.status,
          pricePerKgLocked: c.price_per_kg_locked,
          quantityFrozenKg: c.quantity_frozen_kg,
          releases: (c.contract_releases ?? [])
            .slice()
            .sort((a, b) => a.month_number - b.month_number)
            .map((r) => ({
              month: r.month_number,
              maxReleasePct: Number(r.max_release_pct),
              releasedKg: r.released_kg,
              releasedAt: r.released_at,
              paymentConfirmedAt: r.payment_confirmed_at,
              shippedAt: r.shipped_at,
            })),
          humidity: (c.humidity_readings ?? [])
            .slice()
            .sort((a, b) => a.reading_month - b.reading_month)
            .map((h) => ({ month: h.reading_month, pct: Number(h.humidity_pct), flagged: h.flagged, reportedAt: h.reported_at })),
        }))
      );

      setGi({
        razon: producerProfile?.company_name || "—",
        nit: producerProfile?.tax_id || "—",
        agri: profile?.full_name || "—",
      });
      setUserName((profile?.full_name || "productor").split(" ")[0]);
    },
    [supabase]
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session?.user) return;
      setUserId(data.session.user.id);
      setView((v) => (v === "landing" ? "app" : v));
      loadData(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
        setLoginOpen(false);
        setView("app");
        loadData(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        setFincas([]);
        setLots([]);
        setContracts([]);
        setGi(EMPTY_GI);
        setCurLotId(null);
        setView("landing");
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadData]);

  async function logout() {
    await supabase.auth.signOut();
  }

  async function newLot() {
    if (!userId) return;
    const { data, error } = await supabase
      .from("lots")
      .insert({ producer_id: userId, name: "Lote nuevo · sin nombre" })
      .select("*")
      .single();
    if (error || !data) {
      showToast("No se pudo crear el lote. Intente de nuevo.");
      return;
    }
    const fincaNameById = new Map(fincas.map((f) => [f.id, f.name]));
    const lot = dbLotToLot(data as LotRow, fincaNameById);
    setLots((ls) => [lot, ...ls]);
    setCurLotId(lot.id);
    setView("ficha");
  }

  function openFicha(id: string) {
    setCurLotId(id);
    setView("ficha");
  }

  async function renameLot(id: string, name: string) {
    const { error } = await supabase.from("lots").update({ name }).eq("id", id);
    if (error) {
      showToast("No se pudo renombrar el lote.");
      return;
    }
    setLots((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)));
    showToast(`Lote ${lotCode(id)} renombrado ✓`);
  }

  async function saveFicha(updates: FichaSaveUpdate) {
    if (!curLotId) return;
    const finca = updates.finca ? fincas.find((f) => f.name === updates.finca) : undefined;
    const current = lots.find((l) => l.id === curLotId);

    const patch: Record<string, unknown> = {
      datasheet: updates.datasheet,
      ficha_variedad: updates.summary.ficha_variedad,
      ficha_proceso: updates.summary.ficha_proceso,
      ficha_altitud_m: updates.summary.ficha_altitud_m,
      ficha_notas_cata: updates.summary.ficha_notas_cata,
      ficha_puntaje_estimado: updates.summary.ficha_puntaje_estimado,
    };
    if (updates.name) patch.name = updates.name;
    if (finca) patch.finca_id = finca.id;
    if (current && current.stage === 0) patch.stage = "ficha_completa";

    const { data, error } = await supabase.from("lots").update(patch).eq("id", curLotId).select("*").single();
    if (error || !data) {
      showToast("No se pudo guardar la ficha. Intente de nuevo.");
      return;
    }
    const fincaNameById = new Map(fincas.map((f) => [f.id, f.name]));
    const saved = dbLotToLot(data as LotRow, fincaNameById);
    setLots((ls) => ls.map((l) => (l.id === curLotId ? saved : l)));
  }

  async function saveFinca(f: Finca) {
    if (!userId) return;
    const payload = {
      producer_id: userId,
      name: f.name,
      vereda: f.vereda === "—" ? null : f.vereda,
      municipio: f.mun === "—" ? null : f.mun,
      departamento: f.depto === "—" ? null : f.depto,
      altitude_m: f.alt !== "—" && f.alt.trim() ? Number(f.alt) : null,
      hectares: f.ha !== "—" && f.ha.trim() ? Number(f.ha.replace(",", ".")) : 0,
      history_text: f.hist === "—" ? null : f.hist,
      characteristics_text: f.carac === "—" ? null : f.carac,
    };
    const editing = editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null;

    if (editing) {
      const { data, error } = await supabase.from("fincas").update(payload).eq("id", editing.id).select("*").single();
      if (error || !data) {
        showToast("No se pudo actualizar la finca.");
        return;
      }
      setFincas((prev) => prev.map((x) => (x.id === editing.id ? dbFincaToFinca(data as FincaRow) : x)));
    } else {
      const { data, error } = await supabase.from("fincas").insert(payload).select("*").single();
      if (error || !data) {
        showToast("No se pudo registrar la finca.");
        return;
      }
      setFincas((prev) => [...prev, dbFincaToFinca(data as FincaRow)]);
    }
    setFincaModalOpen(false);
    showToast(`Finca "${f.name}" guardada ✓ · ya puede asociarle cafés`);
  }

  async function saveInfo(next: GeneralInfo) {
    if (!userId) return;
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("profiles").update({ full_name: next.agri }).eq("id", userId),
      supabase.from("producer_profiles").update({ company_name: next.razon, tax_id: next.nit }).eq("profile_id", userId),
    ]);
    if (e1 || e2) {
      showToast("No se pudo actualizar la información.");
      return;
    }
    setGi(next);
    setUserName(next.agri !== "—" ? next.agri.split(" ")[0] : "productor");
    setInfoModalOpen(false);
    showToast("Información general actualizada ✓ · aplica a todos sus lotes");
  }

  const curLot = lots.find((l) => l.id === curLotId) ?? null;

  return (
    <div data-theme="kaffetal-regal">
      {view === "landing" && <Landing onLogin={() => (userId ? setView("app") : setLoginOpen(true))} />}

      {view === "app" && (
        <AppDashboard
          userName={userName}
          lots={lots}
          fincas={fincas}
          gi={gi}
          contracts={contracts}
          onBackHome={() => setView("landing")}
          onLogout={logout}
          onNewLot={newLot}
          onOpenFicha={openFicha}
          onRenameLot={renameLot}
          onOpenFincaModal={(i) => {
            setEditingFincaIdx(i);
            setFincaModalOpen(true);
          }}
          onOpenInfoModal={() => setInfoModalOpen(true)}
        />
      )}

      {view === "ficha" && curLot && (
        <FichaView
          key={curLot.id}
          lot={curLot}
          fincas={fincas}
          gi={gi}
          onBack={() => setView(userId ? "app" : "landing")}
          onSave={saveFicha}
          onOpenNewFinca={() => {
            setEditingFincaIdx(-1);
            setFincaModalOpen(true);
          }}
        />
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <FincaModal
        open={fincaModalOpen}
        onClose={() => setFincaModalOpen(false)}
        finca={editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null}
        onSave={saveFinca}
      />
      <InfoModal open={infoModalOpen} onClose={() => setInfoModalOpen(false)} gi={gi} onSave={saveInfo} />
    </div>
  );
}

export function KaffetalExperience() {
  return (
    <ToastProvider>
      <Experience />
    </ToastProvider>
  );
}
