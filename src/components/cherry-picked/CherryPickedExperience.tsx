"use client";

import { useState } from "react";
import { ToastProvider, useToast } from "@/components/Toast";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { BlackSection } from "./BlackSection";
import { GradosSection } from "./GradosSection";
import { EnviosSection } from "./EnviosSection";
import { TyrianSection } from "./TyrianSection";
import { MuestrasSection } from "./MuestrasSection";
import { NarrativaSection } from "./NarrativaSection";
import { CosechaSection } from "./CosechaSection";
import { ManifiestoSection } from "./ManifiestoSection";
import { HistoriaSection } from "./HistoriaSection";
import { Footer } from "./Footer";
import { Cart } from "./Cart";
import { LoginModal } from "./LoginModal";
import { ProfileView } from "./ProfileView";
import { LOTS, cartData, fmt, moqOf, type Grade } from "./data";

type View = "store" | "profile";
const BID_STEP = 0.5;

function Experience() {
  const { showToast } = useToast();
  const [view, setView] = useState<View>("store");
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("tostador");
  const [loginOpen, setLoginOpen] = useState(false);

  const [myKg, setMyKg] = useState<Record<string, number>>({});
  const [openLots, setOpenLots] = useState<Record<string, boolean>>({ "BK-2620": true });
  const [packInCart, setPackInCart] = useState(false);
  const [activeGrade, setActiveGrade] = useState<"all" | Grade>("all");
  const [shipZone, setShipZone] = useState("Z1");
  const [cartClosed, setCartClosed] = useState(false);

  const [bidA, setBidA] = useState(24.5);
  const [bidB, setBidB] = useState(23.0);
  const [myBids, setMyBids] = useState(0);

  function toggleOpen(id: string, open: boolean) {
    setOpenLots((prev) => ({ ...prev, [id]: open }));
  }

  function changeQty(id: string, delta: number) {
    const lot = LOTS.find((l) => l.id === id)!;
    const cur = myKg[id] ?? 0;
    if (delta > 0 && !loggedIn && lot.mode === "pre") {
      setLoginOpen(true);
      showToast("Inicia sesión para reservar fracciones de la mitaca");
      return;
    }
    const m = moqOf(lot, loggedIn);
    let next: number;
    if (delta > 0) {
      next = cur === 0 ? m : cur + lot.unit;
      if (next > lot.total - lot.sold) {
        showToast("No queda esa cantidad disponible en el lote");
        return;
      }
      if (cur === 0) showToast(`Fracción mínima de ${fmt(m)} kg de ${id} añadida al pedido`);
    } else {
      next = cur - lot.unit;
      if (next < m) next = 0;
    }
    setMyKg((prev) => ({ ...prev, [id]: next }));
  }

  function removeLot(id: string) {
    setMyKg((prev) => ({ ...prev, [id]: 0 }));
  }

  function addPack() {
    setPackInCart(true);
    showToast("Pack de muestras de la cosecha principal añadido");
  }
  function removePack() {
    setPackInCart(false);
  }

  function doLogin(email: string) {
    const name = email.split("@")[0];
    setUserName(name);
    setLoggedIn(true);
    setLoginOpen(false);
    showToast(`Bienvenido de vuelta · Nivel Pintón · Black desde 350 kg activo`);
  }

  function logout() {
    setLoggedIn(false);
    setView("store");
    showToast("Sesión cerrada.");
  }

  function checkout() {
    if (!loggedIn) {
      setLoginOpen(true);
      showToast("Inicia sesión o crea tu cuenta para confirmar el pedido");
      return;
    }
    showToast("Pedido confirmado (demo): recibirás la orden proforma con la referencia DDS por correo.");
  }

  function bid(half: "A" | "B") {
    if (!loggedIn) {
      setLoginOpen(true);
      showToast("Inicia sesión para pujar (nivel Pintón o superior)");
      return;
    }
    if (half === "A") setBidA((b) => Math.round((b + BID_STEP) * 100) / 100);
    else setBidB((b) => Math.round((b + BID_STEP) * 100) / 100);
    setMyBids((n) => n + 1);
    showToast(`Tu puja por la Mitad ${half} va ganando (demo)`);
  }

  const summary = cartData(myKg, packInCart, shipZone);

  return (
    <div data-theme="cherry-picked">
      {view === "store" ? (
        <>
          <Header loggedIn={loggedIn} onLogin={() => setLoginOpen(true)} onShowProfile={() => setView("profile")} />
          <Hero />
          <BlackSection myKg={myKg} openLots={openLots} loggedIn={loggedIn} onToggleOpen={toggleOpen} onChangeQty={changeQty} />
          <GradosSection
            myKg={myKg}
            openLots={openLots}
            loggedIn={loggedIn}
            activeGrade={activeGrade}
            onSetGrade={setActiveGrade}
            onToggleOpen={toggleOpen}
            onChangeQty={changeQty}
          />
          <EnviosSection />
          <TyrianSection loggedIn={loggedIn} bidA={bidA} bidB={bidB} onBid={bid} />
          <MuestrasSection packInCart={packInCart} onAddPack={addPack} loggedIn={loggedIn} onOpenLogin={() => setLoginOpen(true)} />
          <NarrativaSection />
          <CosechaSection />
          <ManifiestoSection />
          <HistoriaSection />
          <Footer />
          <Cart
            summary={summary}
            packInCart={packInCart}
            shipZone={shipZone}
            onSetZone={setShipZone}
            onRemoveLot={removeLot}
            onRemovePack={removePack}
            closed={cartClosed}
            onToggleClosed={() => setCartClosed((c) => !c)}
            onCheckout={checkout}
          />
        </>
      ) : (
        <ProfileView
          userName={userName}
          summary={summary}
          packInCart={packInCart}
          myBids={myBids}
          onBack={() => setView("store")}
          onLogout={logout}
        />
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={doLogin} />
    </div>
  );
}

export function CherryPickedExperience() {
  return (
    <ToastProvider>
      <Experience />
    </ToastProvider>
  );
}
