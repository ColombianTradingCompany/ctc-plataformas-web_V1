"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { FAMILY_LINKS, useLang, type Lang } from "./i18n";
import { LoginModal } from "./LoginModal";

// ── La cuenta del comprador en TODA la familia Cherry Picked (V6.3, objetivo 3 · tanda A) ────────────────────────────────────
// Hasta la V6.2 el login vivía solo en Green: la portada, Roast y X no tenían botón, la ventana de la cinta («el catálogo completo
// está detrás del login») mandaba a la portada, y «Crear cuenta gratis» sacaba al comprador de donde estaba. Un laberinto
// (`docs/PLAN_V6_OBJETIVOS.md` §3, problema 2). Ahora la cuenta es UNA en las cuatro superficies:
//   · `ProveedorDeCuenta` envuelve cada landing: conoce la sesión (Supabase), pinta la ventana de login UNA vez y expone
//     `abrirLogin()` a quien lo necesite (la cabecera, la cinta, cualquier botón).
//   · `AccesoDeCuenta` es el botón de la cabecera: «Entrar» sin sesión; «Mi cuenta» con ella (lleva a la tienda, que es donde
//     están los pedidos, las reservas y las muestras).
//   · Un login que ocurre en la portada, en Roast o en X ATERRIZA en Green (`?cuenta=1` abre «Mi cuenta»): el catálogo con precio
//     vive allí. En Green, la propia tienda lleva su sesión (`CherryPickedExperience`) y no usa este proveedor.
//   · `?login=1` en la URL abre la ventana al cargar (la puerta desde CTC Home y Kaffetal Regal: «I need great coffee → I want to
//     buy it», `SellBuyCtas`), si no hay sesión.
// La regla productor/comprador (la matriz de identidad, `puedoSer("comprador")`) la aplica la tienda al entrar, como siempre; la
// ventana de login la AVISA antes de crear la cuenta (`LoginModal`, `aviso`).

type Cuenta = {
  userId: string | null;
  nombre: string;
  cargando: boolean;
  abrirLogin: () => void;
  cerrarSesion: () => Promise<void>;
};

const Ctx = createContext<Cuenta | null>(null);

export function useCuenta(): Cuenta {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCuenta() fuera de <ProveedorDeCuenta>");
  return c;
}

/** ¿`?login=1` en la URL? (solo en el navegador; en el servidor, no). */
export function pideLoginLaUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("login") === "1";
}

/** Envuelve una landing de la familia (portada, Roast, X). `destinoTrasEntrar`: a dónde va el comprador al iniciar sesión aquí. */
export function ProveedorDeCuenta({ children, destinoTrasEntrar = `${FAMILY_LINKS.green}?cuenta=1` }: { children: ReactNode; destinoTrasEntrar?: string }) {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      const u = data.session?.user ?? null;
      setUserId(u?.id ?? null);
      setNombre(String(u?.user_metadata?.full_name ?? "").split(" ")[0] ?? "");
      setCargando(false);
      // La puerta desde fuera: `?login=1` abre la ventana si no hay sesión.
      if (!u && pideLoginLaUrl()) setAbierta(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
        setAbierta(false);
        // El login ocurrió fuera de la tienda: se aterriza en Green, donde está lo que la sesión abre.
        window.location.assign(destinoTrasEntrar);
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        setNombre("");
      }
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, destinoTrasEntrar]);

  const abrirLogin = useCallback(() => setAbierta(true), []);
  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);
  const valor = useMemo<Cuenta>(() => ({ userId, nombre, cargando, abrirLogin, cerrarSesion }), [userId, nombre, cargando, abrirLogin, cerrarSesion]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <LoginModal open={abierta} onClose={() => setAbierta(false)} />
    </Ctx.Provider>
  );
}

const T: Record<Lang, { entrar: string; cuenta: string; cuentaAria: string }> = {
  en: { entrar: "Sign in", cuenta: "My account", cuentaAria: "Open my account in Cherry Picked Green" },
  es: { entrar: "Iniciar sesión", cuenta: "Mi cuenta", cuentaAria: "Abrir mi cuenta en Cherry Picked Green" },
  de: { entrar: "Anmelden", cuenta: "Mein Konto", cuentaAria: "Mein Konto in Cherry Picked Green öffnen" },
};

/** El botón de la cabecera de la familia: «Entrar» abre la ventana aquí mismo; «Mi cuenta» lleva a la tienda. */
export function AccesoDeCuenta() {
  const lang = useLang();
  const t = T[lang];
  const { userId, nombre, cargando, abrirLogin } = useCuenta();
  if (cargando) return <span style={{ minWidth: 96, display: "inline-block" }} aria-hidden="true" />;
  return userId ? (
    <a className="btn btn-sm btn-solid" href={`${FAMILY_LINKS.green}?cuenta=1`} aria-label={t.cuentaAria} data-cuenta="con-sesion">
      {t.cuenta}
      {nombre ? ` · ${nombre}` : ""}
    </a>
  ) : (
    <button type="button" className="btn btn-sm" onClick={abrirLogin} data-cuenta="sin-sesion">
      {t.entrar}
    </button>
  );
}
