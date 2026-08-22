"use client";

import { useCallback, useEffect, useState } from "react";
import { ToastProvider, useToast } from "@/components/Toast";
import { puedoSer } from "@/lib/identidad/matriz";
import { QuickNav, type QuickNavLabels, type QuickNavSection } from "@/components/QuickNav";
import { SneakPeek } from "@/components/catalogo/SneakPeek";
import { DIRECTORIO_HREF } from "@/lib/directorioLink";
import { CTC_RAZON } from "@/lib/legal";
import { createClient } from "@/lib/supabase/client";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { BlackSection } from "./BlackSection";
import { GradosSection } from "./GradosSection";
import { EnviosSection } from "./EnviosSection";
import { TyrianSection } from "./TyrianSection";
import { listarSubastas, pujar } from "@/lib/subastas/buyerActions";
import type { MembershipTier, SubastaPublica } from "@/lib/subastas/tipos";
import { MuestrasSection } from "./MuestrasSection";
import { NarrativaSection } from "./NarrativaSection";
import { CosechaSection } from "./CosechaSection";
import { CoffeedSection } from "./CoffeedSection";
import { ManifiestoSection } from "./ManifiestoSection";
import { HistoriaSection } from "./HistoriaSection";
import { GadgetsSection } from "./GadgetsSection";
import { Footer } from "./Footer";
import { Cart, type ShippingZone } from "./Cart";
import { LoginModal } from "./LoginModal";
import { ProfileView, type Billing, type OrderSummary } from "./ProfileView";
import { GRADE_DB, cartData, fmt, listingCode, moqOf, type Grade, type Lot } from "./data";
import { FamilyBubble } from "./FamilyBubble";
import { LangBubble } from "./LangBubble";
import { VisitCtcBand } from "./VisitCtcBand";
import { LangProvider, useLang, type Lang } from "./i18n";

type View = "store" | "profile";

const EN = {
  quickNav: [
    { id: "grados", n: "01", label: "The catalogue", sub: "Red · Blue · Gold" },
    { id: "black", n: "02", label: "Black Selection", sub: "The coffee your bar runs on" },
    { id: "envios", n: "03", label: "Shipping", sub: "One shipping price, no surprises" },
    { id: "tyrian", n: "04", label: "Tyrian", sub: "The flagship auction" },
    { id: "muestras", n: "05", label: "Samples", sub: "Harvest sample packs" },
    { id: "narrativa", n: "06", label: "Narrative", sub: "From the plot to your cup" },
    { id: "cosecha", n: "07", label: "The coffee year", sub: "Seen from your roastery" },
    { id: "coffeed", n: "08", label: "Coffeed", sub: "The network's newsfeed, in chapters" },
    { id: "manifiesto", n: "09", label: "Manifesto", sub: "How we work" },
    { id: "historia", n: "10", label: "Our story", sub: "Who we are" },
    { id: "gadgets", n: "11", label: "Coffee Gadgets", sub: "Free tools, no sign-in" },
  ] as QuickNavSection[],
  quickNavLabels: {
    homeSub: "Back to the mother house · Colombian Trading Company",
    fabLabel: "Navigate",
    panelAria: "Page index",
    fabAria: "Quick navigation",
  } as QuickNavLabels,
  dcSub: "The ecosystem's people layer · professional profile",
  roaster: "roaster",
  loginToReserve: "Sign in to reserve mitaca fractions",
  noQty: "That quantity is no longer available in this lot",
  minAdded: (kg: string, code: string) => `Minimum fraction of ${kg} kg of ${code} added to your order`,
  packAdded: "Sample pack added to your order",
  loginToCheckout: "Sign in or create your account to confirm the order",
  orderFailed: "The order couldn't be confirmed.",
  orderOk: "Order confirmed. You'll receive the pro-forma order by email.",
  billingFailed: "The details couldn't be saved.",
  billingOk: "Billing details updated ✓",
  loginToBid: "Sign in to bid (Pintón level or higher)",
  bidLeading: (half: string) => `Your bid for Half ${half} is leading`,
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    quickNav: [
      { id: "grados", n: "01", label: "El catálogo", sub: "Red · Blue · Gold" },
      { id: "black", n: "02", label: "Black Selection", sub: "El café que sostiene tu barra" },
      { id: "envios", n: "03", label: "Envíos", sub: "Un precio de envío, sin sorpresas" },
      { id: "tyrian", n: "04", label: "Tyrian", sub: "La subasta insignia" },
      { id: "muestras", n: "05", label: "Muestras", sub: "Sample packs de la cosecha" },
      { id: "narrativa", n: "06", label: "Narrativa", sub: "Del predio a tu taza" },
      { id: "cosecha", n: "07", label: "El año cafetero", sub: "Visto desde tu tostaduría" },
      { id: "coffeed", n: "08", label: "Coffeed", sub: "El noticiero de la red, en capítulos" },
      { id: "manifiesto", n: "09", label: "Manifiesto", sub: "Cómo trabajamos" },
      { id: "historia", n: "10", label: "Historia", sub: "Quiénes somos" },
      { id: "gadgets", n: "11", label: "Coffee Gadgets", sub: "Herramientas libres, sin registro" },
    ],
    quickNavLabels: {
      homeSub: "Volver a la casa matriz · Colombian Trading Company",
      fabLabel: "Navegar",
      panelAria: "Índice de la página",
      fabAria: "Navegación rápida",
    },
    dcSub: "La capa de personas del ecosistema · ficha profesional",
    roaster: "tostador",
    loginToReserve: "Inicia sesión para reservar fracciones de la mitaca",
    noQty: "No queda esa cantidad disponible en el lote",
    minAdded: (kg: string, code: string) => `Fracción mínima de ${kg} kg de ${code} añadida al pedido`,
    packAdded: "Pack de muestras añadido al pedido",
    loginToCheckout: "Inicia sesión o crea tu cuenta para confirmar el pedido",
    orderFailed: "No se pudo confirmar el pedido.",
    orderOk: "Pedido confirmado. Recibirás la orden proforma por correo.",
    billingFailed: "No se pudo guardar la información.",
    billingOk: "Datos de facturación actualizados ✓",
    loginToBid: "Inicia sesión para pujar (nivel Pintón o superior)",
    bidLeading: (half: string) => `Tu puja por la Mitad ${half} va ganando`,
  },
  de: {
    quickNav: [
      { id: "grados", n: "01", label: "Der Katalog", sub: "Red · Blue · Gold" },
      { id: "black", n: "02", label: "Black Selection", sub: "Der Kaffee, der deine Bar trägt" },
      { id: "envios", n: "03", label: "Versand", sub: "Ein Versandpreis, keine Überraschungen" },
      { id: "tyrian", n: "04", label: "Tyrian", sub: "Die Flaggschiff-Auktion" },
      { id: "muestras", n: "05", label: "Muster", sub: "Musterpakete der Ernte" },
      { id: "narrativa", n: "06", label: "Erzählung", sub: "Von der Parzelle in deine Tasse" },
      { id: "cosecha", n: "07", label: "Das Kaffeejahr", sub: "Aus deiner Rösterei gesehen" },
      { id: "coffeed", n: "08", label: "Coffeed", sub: "Der Newsfeed des Netzwerks, in Kapiteln" },
      { id: "manifiesto", n: "09", label: "Manifest", sub: "Wie wir arbeiten" },
      { id: "historia", n: "10", label: "Unsere Geschichte", sub: "Wer wir sind" },
      { id: "gadgets", n: "11", label: "Coffee Gadgets", sub: "Freie Werkzeuge, ohne Anmeldung" },
    ],
    quickNavLabels: {
      homeSub: "Zurück zum Stammhaus · Colombian Trading Company",
      fabLabel: "Navigieren",
      panelAria: "Seitenindex",
      fabAria: "Schnellnavigation",
    },
    dcSub: "Die Menschen-Ebene des Ökosystems · Fachprofil",
    roaster: "Rösterei",
    loginToReserve: "Melde dich an, um Mitaca-Fraktionen zu reservieren",
    noQty: "Diese Menge ist in diesem Lot nicht mehr verfügbar",
    minAdded: (kg: string, code: string) => `Mindestanteil von ${kg} kg von ${code} zur Bestellung hinzugefügt`,
    packAdded: "Musterpaket zur Bestellung hinzugefügt",
    loginToCheckout: "Melde dich an oder erstelle ein Konto, um die Bestellung zu bestätigen",
    orderFailed: "Die Bestellung konnte nicht bestätigt werden.",
    orderOk: "Bestellung bestätigt. Du erhältst die Proforma-Rechnung per E-Mail.",
    billingFailed: "Die Daten konnten nicht gespeichert werden.",
    billingOk: "Rechnungsdaten aktualisiert ✓",
    loginToBid: "Melde dich an, um zu bieten (Level Pintón oder höher)",
    bidLeading: (half: string) => `Dein Gebot für Hälfte ${half} führt`,
  },
};

type ListingRow = {
  id: string;
  lot_id: string;
  commercial_mode: "spot" | "pre";
  unit_kg: number;
  moq_kg: number;
  total_kg: number;
  sold_kg: number;
  price_per_kg: number;
};

type CatalogRow = {
  lot_id: string;
  name: string;
  grade: string | null;
  ficha_variedad: string | null;
  ficha_proceso: string | null;
  ficha_altitud_m: number | null;
  ficha_puntaje_estimado: number | null;
  official_score: number | null;
  ficha_notas_cata: string | null;
  finca_name: string | null;
  ctc_selection: boolean;
  municipio: string | null;
  departamento: string | null;
};

type TransparencyRow = { lot_listing_id: string; price_per_kg_locked: number; reference_price_snapshot: number };

function listingToLot(row: ListingRow, catalog: CatalogRow | undefined, transparency: TransparencyRow | undefined): Lot | null {
  const grade = catalog?.grade ? GRADE_DB[catalog.grade] : null;
  if (!catalog || !grade) return null;
  return {
    id: row.id,
    code: listingCode(row.id, grade),
    mode: row.commercial_mode,
    grade,
    tc: `var(--t-${catalog.grade})`,
    name: catalog.name,
    // Un lote que CTC compró en firme se muestra a nombre de CTC (D3.1): el
    // REGISTRO conserva la finca real —pasaporte y rastro EUDR intactos—,
    // la VITRINA enseña a quien vende. La vista ya no devuelve el nombre de
    // la finca en ese caso, así que aquí solo se pone el rótulo.
    origin: `${catalog.ctc_selection ? CTC_RAZON : catalog.finca_name ?? "—"} · ${catalog.municipio ?? "—"}, ${catalog.departamento ?? "—"}`,
    variety: catalog.ficha_variedad || "—",
    process: catalog.ficha_proceso || "—",
    // Prefer the real official average (accepted lot_evaluations) over the
    // producer's own self-report -- and flag the self-report as an estimate
    // so the UI can label it (per-language) and never show it
    // indistinguishable from a verified score. See public_lot_catalog.
    score:
      catalog.official_score != null
        ? catalog.official_score.toFixed(1)
        : catalog.ficha_puntaje_estimado != null
        ? String(catalog.ficha_puntaje_estimado)
        : "—",
    scoreEstimated: catalog.official_score == null && catalog.ficha_puntaje_estimado != null,
    alt: catalog.ficha_altitud_m != null ? `${catalog.ficha_altitud_m} m` : "—",
    total: row.total_kg,
    sold: row.sold_kg,
    unit: row.unit_kg,
    moq: row.moq_kg,
    price: row.price_per_kg,
    cup: catalog.ficha_notas_cata || "—",
    transparency: transparency ? { locked: Number(transparency.price_per_kg_locked), reference: Number(transparency.reference_price_snapshot) } : undefined,
  };
}

const EMPTY_BILLING: Billing = { companyName: "", vatNumber: "", deliveryAddress: "" };

function Experience() {
  const { showToast } = useToast();
  const lang = useLang();
  const t = T[lang];
  const [supabase] = useState(() => createClient());
  const [view, setView] = useState<View>("store");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  const [lots, setLots] = useState<Lot[]>([]);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [myKg, setMyKg] = useState<Record<string, number>>({});
  const [openLots, setOpenLots] = useState<Record<string, boolean>>({});
  const [packInCart, setPackInCart] = useState(false);
  const [activeGrade, setActiveGrade] = useState<"all" | Grade>("all");
  const [shipZone, setShipZone] = useState("Z1");
  const [cartClosed, setCartClosed] = useState(false);

  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState<"verde" | "pinton" | "maduro">("verde");
  const [billing, setBilling] = useState<Billing>(EMPTY_BILLING);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [samplePackOrdered, setSamplePackOrdered] = useState(false);

  // V5.24: la subasta Tyrian REAL (lot_auctions, vía Server Actions). La
  // vitrina se carga para todos; pujar exige sesión + nivel Pintón.
  const [subastas, setSubastas] = useState<SubastaPublica[]>([]);
  const [buyerTier, setBuyerTier] = useState<MembershipTier | null>(null);
  const myBids = subastas.filter((s) => s.status === "abierta").reduce((n, s) => n + s.fraccionesDetalle.filter((f) => f.miPuja != null).length, 0);

  const loadCatalog = useCallback(async () => {
    const [{ data: listingRows }, { data: catalogRows }, { data: transparencyRows }, { data: zoneRows }] = await Promise.all([
      supabase
        .from("lot_listings")
        .select("id, lot_id, commercial_mode, unit_kg, moq_kg, total_kg, sold_kg, price_per_kg")
        .eq("status", "published"),
      supabase
        .from("public_lot_catalog")
        .select(
          "lot_id, name, grade, ficha_variedad, ficha_proceso, ficha_altitud_m, ficha_puntaje_estimado, official_score, ficha_notas_cata, finca_name, municipio, departamento, ctc_selection"
        ),
      supabase.from("public_transparency_pricing").select("lot_listing_id, price_per_kg_locked, reference_price_snapshot"),
      supabase.from("shipping_zones").select("code, label, rate_per_kg").order("sort_order"),
    ]);
    const catalogByLotId = new Map(((catalogRows ?? []) as CatalogRow[]).map((c) => [c.lot_id, c]));
    const transparencyByListingId = new Map(((transparencyRows ?? []) as TransparencyRow[]).map((t) => [t.lot_listing_id, t]));
    setLots(
      ((listingRows as ListingRow[] | null) ?? [])
        .map((r) => listingToLot(r, catalogByLotId.get(r.lot_id), transparencyByListingId.get(r.id)))
        .filter((l): l is Lot => l !== null)
    );
    setZones(((zoneRows ?? []) as { code: string; label: string; rate_per_kg: number }[]).map((z) => ({ code: z.code, label: z.label, ratePerKg: Number(z.rate_per_kg) })));
  }, [supabase]);

  const loadBuyerData = useCallback(
    async (uid: string) => {
      type OrderRow = {
        id: string;
        placed_at: string;
        total_now: number;
        points_earned: number;
        order_items: { kg: number; lot_name: string }[];
      };

      const [{ data: profile }, { data: buyerProfile }, { data: reservationRows }, { data: orderRows }, { data: packRows }] =
        await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", uid).single(),
          supabase.from("buyer_profiles").select("membership_tier, lifetime_points, company_name, vat_number, delivery_address").eq("profile_id", uid).single(),
          supabase.from("lot_reservations").select("lot_listing_id, kg").eq("buyer_id", uid),
          supabase
            .from("orders")
            .select("id, placed_at, total_now, points_earned, order_items(kg, lot_name)")
            .eq("buyer_id", uid)
            .order("placed_at", { ascending: false }),
          supabase.from("sample_pack_orders").select("id").eq("buyer_id", uid).limit(1),
        ]);

      setUserName((profile?.full_name || "").split(" ")[0]);
      setPoints(buyerProfile?.lifetime_points ?? 0);
      setTier((buyerProfile?.membership_tier as "verde" | "pinton" | "maduro") ?? "verde");
      setBilling({
        companyName: buyerProfile?.company_name ?? "",
        vatNumber: buyerProfile?.vat_number ?? "",
        deliveryAddress: buyerProfile?.delivery_address ?? "",
      });
      setMyKg(Object.fromEntries((reservationRows ?? []).map((r) => [r.lot_listing_id, Number(r.kg)])));
      setSamplePackOrdered((packRows ?? []).length > 0);
      setOrders(
        ((orderRows as unknown as OrderRow[] | null) ?? []).map((o) => ({
          id: o.id,
          code: o.id.replace(/-/g, "").slice(0, 6).toUpperCase(),
          placedAt: o.placed_at,
          kg: o.order_items.reduce((a, i) => a + Number(i.kg), 0),
          totalNow: Number(o.total_now),
          pointsEarned: o.points_earned,
          items: o.order_items.map((i) => ({ name: i.lot_name || "—", kg: Number(i.kg) })),
        }))
      );
    },
    [supabase]
  );

  // La matriz de membresías (owner, 2026-08-02): un productor o un recolector
  // no puede comprar con el mismo correo. Se le explica y se cierra la sesión.
  const gateMatriz = useCallback(async (): Promise<boolean> => {
    const v = await puedoSer("comprador");
    if (v.permitido) return true;
    showToast(v.motivo);
    await supabase.auth.signOut();
    return false;
  }, [supabase, showToast]);

  // ── El catálogo SOLO con sesión (owner, 2026-08-17) ────────────────────────
  // Antes `loadCatalog()` corría para cualquier visitante, así que los lotes y
  // SUS PRECIOS eran públicos y solo reservar pedía entrar. La decisión del
  // owner invierte eso: el Catálogo Activo completo se ve dentro de las
  // plataformas de Cherry Picked, y lo que ve quien no ha entrado es la cinta
  // «Sneak Peek» —los mismos lotes sin nada comercial— más la puerta.
  // Consecuencia asumida: la parrilla deja de ser rastreable por buscadores (la
  // portada, las fichas de grado y la propia cinta siguen siéndolo) y los
  // precios salen de la internet pública, que era el objetivo.
  // Ver docs/V5_CONSOLAS_PLAN.md §1 (D0.5).
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session?.user) return;
      const uid = data.session.user.id;
      gateMatriz().then((ok) => {
        if (!ok || !active) return;
        setUserId(uid);
        loadCatalog();
        loadBuyerData(uid);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const uid = session.user.id;
        gateMatriz().then((ok) => {
          if (!ok) return;
          setUserId(uid);
          setLoginOpen(false);
          loadCatalog();
          loadBuyerData(uid);
        });
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        setUserName("");
        // Los lotes se vacían al salir: son el dato que la sesión autorizaba.
        setLots([]);
        setMyKg({});
        setPackInCart(false);
        setOrders([]);
        setPoints(0);
        setTier("verde");
        setBilling(EMPTY_BILLING);
        setView("store");
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadCatalog, loadBuyerData, gateMatriz]);

  function toggleOpen(id: string, open: boolean) {
    setOpenLots((prev) => ({ ...prev, [id]: open }));
  }

  async function changeQty(id: string, delta: number) {
    const lot = lots.find((l) => l.id === id);
    if (!lot) return;
    const cur = myKg[id] ?? 0;
    if (delta > 0 && !userId && lot.mode === "pre") {
      setLoginOpen(true);
      showToast(t.loginToReserve);
      return;
    }
    const m = moqOf(lot, !!userId);
    let next: number;
    if (delta > 0) {
      next = cur === 0 ? m : cur + lot.unit;
      if (next > lot.total - lot.sold) {
        showToast(t.noQty);
        return;
      }
      if (cur === 0) showToast(t.minAdded(fmt(m, lang), lot.code));
    } else {
      next = cur - lot.unit;
      if (next < m) next = 0;
    }
    setMyKg((prev) => ({ ...prev, [id]: next }));

    if (!userId) return; // anonymous Black/spot browsing stays local-only until login
    if (next === 0) {
      await supabase.from("lot_reservations").delete().eq("lot_listing_id", id).eq("buyer_id", userId);
    } else {
      await supabase.from("lot_reservations").upsert({ lot_listing_id: id, buyer_id: userId, kg: next }, { onConflict: "lot_listing_id,buyer_id" });
    }
  }

  async function removeLot(id: string) {
    setMyKg((prev) => ({ ...prev, [id]: 0 }));
    if (userId) await supabase.from("lot_reservations").delete().eq("lot_listing_id", id).eq("buyer_id", userId);
  }

  function addPack() {
    setPackInCart(true);
    showToast(t.packAdded);
  }
  function removePack() {
    setPackInCart(false);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function checkout() {
    if (!userId) {
      setLoginOpen(true);
      showToast(t.loginToCheckout);
      return;
    }
    const hasLots = Object.values(myKg).some((q) => q > 0);
    if (!hasLots && !packInCart) return;

    if (hasLots) {
      const { error } = await supabase.rpc("place_order", { p_zone_code: shipZone });
      if (error) {
        showToast(error.message || t.orderFailed);
        return;
      }
    }
    if (packInCart) {
      await supabase.from("sample_pack_orders").insert({ buyer_id: userId });
    }

    setMyKg({});
    setPackInCart(false);
    showToast(t.orderOk);
    await Promise.all([loadCatalog(), loadBuyerData(userId)]);
  }

  async function saveBilling(next: Billing) {
    if (!userId) return;
    const { error } = await supabase
      .from("buyer_profiles")
      .update({ company_name: next.companyName || null, vat_number: next.vatNumber || null, delivery_address: next.deliveryAddress || null })
      .eq("profile_id", userId);
    if (error) {
      showToast(t.billingFailed);
      return;
    }
    setBilling(next);
    showToast(t.billingOk);
  }

  const loadSubastas = useCallback(async () => {
    const res = await listarSubastas();
    setSubastas(res.subastas);
    setBuyerTier(res.tier);
  }, []);

  // La vitrina se carga para todos y se recarga al cambiar la sesión (las
  // pujas «mías» dependen de quién mira). El setState va en el .then — nunca
  // síncrono dentro del efecto.
  useEffect(() => {
    let activo = true;
    listarSubastas().then((res) => {
      if (!activo) return;
      setSubastas(res.subastas);
      setBuyerTier(res.tier);
    });
    return () => {
      activo = false;
    };
  }, [userId]);

  async function bid(auctionId: string, fraccion: 1 | 2, amount: number) {
    if (!userId) {
      setLoginOpen(true);
      showToast(t.loginToBid);
      return;
    }
    const res = await pujar(auctionId, fraccion, amount);
    await loadSubastas();
    if (!res.ok) {
      showToast(res.error);
      return;
    }
    showToast(t.bidLeading(fraccion === 1 ? "A" : "B"));
  }

  const summary = cartData(lots, myKg, packInCart, shipZone, zones);

  return (
    <div data-theme="cherry-picked">
      {view === "store" ? (
        <>
          <Header loggedIn={!!userId} onLogin={() => setLoginOpen(true)} onShowProfile={() => setView("profile")} />
          <Hero />
          {/* The product leads, right below the hero's manifest board: first
              the graded harvest (the flagship), then the Black workhorse —
              **for a signed-in buyer**. A visitor gets the Sneak Peek band in
              that same slot (owner, 2026-08-17): the same lots, no prices, no
              MOQ, no kilos, and a door. It inherits the `grados` anchor because
              it occupies the catalogue's place in the page and in the QuickNav. */}
          {userId ? (
            <>
              <GradosSection
                lots={lots}
                myKg={myKg}
                openLots={openLots}
                loggedIn={!!userId}
                activeGrade={activeGrade}
                onSetGrade={setActiveGrade}
                onToggleOpen={toggleOpen}
                onChangeQty={changeQty}
              />
              <BlackSection lots={lots} myKg={myKg} openLots={openLots} loggedIn={!!userId} onToggleOpen={toggleOpen} onChangeQty={changeQty} />
            </>
          ) : (
            <SneakPeek lang={lang} variant="cp" onOpenLogin={() => setLoginOpen(true)} id="grados" />
          )}
          <EnviosSection />
          <VisitCtcBand />
          <TyrianSection loggedIn={!!userId} subastas={subastas} tier={buyerTier} onBid={bid} />
          <MuestrasSection packInCart={packInCart} onAddPack={addPack} loggedIn={!!userId} onOpenLogin={() => setLoginOpen(true)} />
          <NarrativaSection lots={lots} loggedIn={!!userId} />
          <CosechaSection />
          <CoffeedSection />
          <ManifiestoSection />
          <HistoriaSection />
          <GadgetsSection />
          <Footer />
          {/* Bottom-LEFT bubble column, on purpose: the cart owns the
              bottom-right corner. QuickNav FAB at 24, family at 92,
              language at 148. */}
          <QuickNav
            sections={userId ? t.quickNav : t.quickNav.filter((s) => s.id !== "black")}
            side="left"
            labels={t.quickNavLabels}
            extraLinks={[{ href: DIRECTORIO_HREF, code: "DC", label: "Directorio del Café", sub: t.dcSub }]}
          />
          <FamilyBubble active="green" bottom={92} />
          <LangBubble bottom={148} />
          <Cart
            summary={summary}
            packInCart={packInCart}
            shipZone={shipZone}
            zones={zones}
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
          userName={userName || t.roaster}
          summary={summary}
          packInCart={packInCart}
          myBids={myBids}
          points={points}
          tier={tier}
          orders={orders}
          samplePackOrdered={samplePackOrdered}
          billing={billing}
          onBack={() => setView("store")}
          onLogout={logout}
          onSaveBilling={saveBilling}
        />
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export function CherryPickedExperience() {
  return (
    <ToastProvider>
      <LangProvider>
        <Experience />
      </LangProvider>
    </ToastProvider>
  );
}
