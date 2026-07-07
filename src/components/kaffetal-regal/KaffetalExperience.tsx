"use client";

import { useState } from "react";
import { ToastProvider, useToast } from "@/components/Toast";
import { Landing } from "./Landing";
import { LoginModal } from "./LoginModal";
import { AppDashboard } from "./AppDashboard";
import { FichaView } from "./FichaView";
import { FincaModal } from "./FincaModal";
import { InfoModal } from "./InfoModal";
import { INITIAL_FINCAS, INITIAL_GI, INITIAL_LOTS, type Finca, type GeneralInfo, type Lot } from "./data";

type View = "landing" | "app" | "ficha";

function Experience() {
  const { showToast } = useToast();
  const [view, setView] = useState<View>("landing");
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("productor");
  const [loginOpen, setLoginOpen] = useState(false);

  const [gi, setGi] = useState<GeneralInfo>(INITIAL_GI);
  const [fincas, setFincas] = useState<Finca[]>(INITIAL_FINCAS);
  const [lots, setLots] = useState<Lot[]>(INITIAL_LOTS);
  const [lotSeq, setLotSeq] = useState(13);
  const [curLotId, setCurLotId] = useState<string | null>(null);

  const [fincaModalOpen, setFincaModalOpen] = useState(false);
  const [editingFincaIdx, setEditingFincaIdx] = useState(-1);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  function doLogin(email: string) {
    const name = email.split("@")[0];
    setGi((g) => ({ ...g, razon: name + " S.A.S.", agri: name }));
    setUserName(name);
    setLoggedIn(true);
    setLoginOpen(false);
    setView("app");
    showToast(`Bienvenido a su panel, ${name}.`);
  }

  function newLot() {
    const id = "L-00" + lotSeq;
    setLotSeq((n) => n + 1);
    const lot: Lot = { id, name: "Lote nuevo · sin nombre", finca: "—", stage: 0, grade: null, extra: "Recién creado · complete la ficha técnica" };
    setLots((ls) => [lot, ...ls]);
    setCurLotId(id);
    setView("ficha");
  }

  function openFicha(id: string) {
    setCurLotId(id);
    setView("ficha");
  }

  function renameLot(id: string, name: string) {
    setLots((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)));
    showToast(`Lote ${id} renombrado ✓`);
  }

  function saveFicha(updates: { name?: string; finca?: string }) {
    setLots((ls) =>
      ls.map((l) => {
        if (l.id !== curLotId) return l;
        const next = { ...l };
        if (updates.name) next.name = updates.name;
        if (updates.finca) next.finca = updates.finca;
        if (next.stage === 0) {
          next.stage = 1;
          next.extra = "Ficha guardada · siguen videos y muestra";
        }
        return next;
      })
    );
  }

  function saveFinca(f: Finca) {
    setFincas((prev) => {
      if (editingFincaIdx >= 0) {
        const copy = [...prev];
        copy[editingFincaIdx] = f;
        return copy;
      }
      return [...prev, f];
    });
    setFincaModalOpen(false);
    showToast(`Finca "${f.name}" guardada ✓ · ya puede asociarle cafés`);
  }

  const curLot = lots.find((l) => l.id === curLotId) ?? null;

  return (
    <div data-theme="kaffetal-regal">
      {view === "landing" && <Landing onLogin={() => setLoginOpen(true)} />}

      {view === "app" && (
        <AppDashboard
          userName={userName}
          lots={lots}
          fincas={fincas}
          gi={gi}
          onBackHome={() => setView("landing")}
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
          lot={curLot}
          fincas={fincas}
          gi={gi}
          onBack={() => setView(loggedIn ? "app" : "landing")}
          onSave={saveFicha}
          onOpenNewFinca={() => {
            setEditingFincaIdx(-1);
            setFincaModalOpen(true);
          }}
        />
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={doLogin} />
      <FincaModal
        open={fincaModalOpen}
        onClose={() => setFincaModalOpen(false)}
        finca={editingFincaIdx >= 0 ? fincas[editingFincaIdx] : null}
        onSave={saveFinca}
      />
      <InfoModal
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        gi={gi}
        onSave={(next) => {
          setGi(next);
          setInfoModalOpen(false);
          showToast("Información general actualizada ✓ · aplica a todos sus lotes");
        }}
      />
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
