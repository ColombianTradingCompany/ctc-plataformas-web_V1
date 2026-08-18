"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

// ── La matriz de membresías de la red (owner, 2026-08-02) ────────────────────
// UNA identidad (auth.users) puede tener varias membresías, pero no cualquier
// combinación. Las reglas:
//   · Productor ⊕ Comprador — nunca los dos (y se le EXPLICA al usuario).
//   · Directorio (DC) — compone con productor O comprador (no ambos, por la
//     regla anterior), con Terratalento y con socios.
//   · Terratalento (recolector) — NO puede ser productor ni comprador; DC sí.
//   · Socios — componen entre sí y con DC; nunca productor/comprador/recolector.
//
// El MATIZ que hace esto posible: handle_new_user le pone role='buyer' y una
// fila inerte de buyer_profiles a TODO registro que no pida producer (los de
// Terratalento, el Directorio y Google entran así). Por eso "es comprador" NO
// es "tiene fila": es role='buyer' CON actividad real en Cherry Picked
// (pedidos, reservas, puntos o escalón por encima de verde). Un default
// inerte puede convertirse en cualquier cosa — para eso existe.

export type Membresias = {
  productor: boolean;
  compradorReal: boolean;
  directorio: boolean;
  recolector: boolean;
  socio: boolean;
  admin: boolean;
};

export async function membresiasDe(profileId: string): Promise<Membresias> {
  const service = createServiceRoleClient();
  const [{ data: prof }, { data: buyer }, { data: dc }, { data: rec }, { data: socio }, { count: pedidos }, { count: reservas }] =
    await Promise.all([
      service.from("profiles").select("role").eq("id", profileId).maybeSingle(),
      service.from("buyer_profiles").select("membership_tier, lifetime_points").eq("profile_id", profileId).maybeSingle(),
      service.from("directorio_profiles").select("profile_id").eq("profile_id", profileId).maybeSingle(),
      service.from("terratalento_recolectores").select("profile_id").eq("profile_id", profileId).maybeSingle(),
      service.from("partner_accounts").select("profile_id").eq("profile_id", profileId).maybeSingle(),
      service.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", profileId),
      service.from("lot_reservations").select("id", { count: "exact", head: true }).eq("buyer_id", profileId),
    ]);
  const role = String(prof?.role ?? "");
  const compradorReal =
    role === "buyer" &&
    ((pedidos ?? 0) > 0 ||
      (reservas ?? 0) > 0 ||
      (buyer ? Number(buyer.lifetime_points ?? 0) > 0 || String(buyer.membership_tier ?? "verde") !== "verde" : false));
  return {
    productor: role === "producer",
    compradorReal,
    directorio: !!dc,
    recolector: !!rec,
    socio: !!socio || role === "partner",
    admin: role === "bcp_admin",
  };
}

/**
 * `herramientas` (A2/A5, V4.33) NO es una identidad nueva: es una PUERTA que se
 * abre con una de las que ya existen. Por eso vive en esta lista aunque nadie
 * «se registre como herramientas» — la pregunta que responde es «¿puedo entrar
 * a Herramientas del Café?», y la respuesta se calcula con lo que la persona ya
 * es. Añadir una identidad propia habría roto la exclusión productor ⊕ comprador
 * que sostiene toda esta matriz.
 */
export type ObjetivoMembresia =
  | "productor"
  | "comprador"
  | "directorio"
  | "recolector"
  | "socio"
  | "herramientas";

export type VeredictoMatriz = { permitido: true } | { permitido: false; motivo: string };

/** ¿Puede ESTA identidad ganar la membresía objetivo? Con la explicación lista. */
export async function puedeSer(profileId: string, objetivo: ObjetivoMembresia): Promise<VeredictoMatriz> {
  const m = await membresiasDe(profileId);

  switch (objetivo) {
    case "productor":
      if (m.compradorReal)
        return {
          permitido: false,
          motivo:
            "Este correo ya es una cuenta de comprador en Cherry Picked. Un mismo correo no puede ser productor y comprador a la vez — para registrar su finca use otro correo.",
        };
      if (m.recolector)
        return {
          permitido: false,
          motivo:
            "Este correo ya es una cuenta de recolector en Terratalento. Un recolector no puede ser también productor — para registrar una finca use otro correo.",
        };
      if (m.socio)
        return { permitido: false, motivo: "Este correo opera un nodo de la Red de Socios y no puede ser también productor." };
      return { permitido: true };

    case "herramientas":
      // Herramientas del Café se entra con la cuenta que YA se tiene: productor
      // de Kaffetal Regal o comprador de Cherry Picked. Es un O real y no un
      // caso a medias, porque la exclusión de arriba impide ser las dos.
      if (m.productor || m.compradorReal) return { permitido: true };
      if (m.recolector)
        return {
          permitido: false,
          motivo:
            "Las Herramientas del Café son para productores de Kaffetal Regal y compradores de Cherry Picked. Una cuenta de recolector de Terratalento no las abre.",
        };
      if (m.socio)
        return {
          permitido: false,
          motivo:
            "Las Herramientas del Café son para productores y compradores. Una credencial de nodo de la Red de Socios no las abre.",
        };
      return {
        permitido: false,
        motivo:
          "Las Herramientas del Café son para productores de Kaffetal Regal y compradores de Cherry Picked. Regístrese en una de las dos y quedan disponibles.",
      };

    case "comprador":
      if (m.productor)
        return {
          permitido: false,
          motivo:
            "Este correo ya es una cuenta de productor en Kaffetal Regal. Un mismo correo no puede ser productor y comprador a la vez — para comprar use otro correo.",
        };
      if (m.recolector)
        return {
          permitido: false,
          motivo:
            "Este correo ya es una cuenta de recolector en Terratalento. Un recolector no puede ser también comprador — para comprar use otro correo.",
        };
      if (m.socio)
        return { permitido: false, motivo: "Este correo opera un nodo de la Red de Socios y no puede ser también comprador." };
      return { permitido: true };

    case "recolector":
      if (m.productor)
        return {
          permitido: false,
          motivo:
            "Este correo ya es una cuenta de productor en Kaffetal Regal. Un productor no puede ser también recolector — usa otro correo para tu perfil de Terratalento.",
        };
      if (m.compradorReal)
        return {
          permitido: false,
          motivo:
            "Este correo ya es una cuenta de comprador en Cherry Picked. Un comprador no puede ser también recolector — usa otro correo para tu perfil de Terratalento.",
        };
      if (m.socio)
        return { permitido: false, motivo: "Este correo opera un nodo de la Red de Socios y no puede ser también recolector." };
      return { permitido: true };

    case "directorio":
      // El DC compone con todo: productor O comprador (nunca ambos, ya
      // impedido arriba), recolector y socios.
      return { permitido: true };

    case "socio":
      if (m.productor)
        return { permitido: false, motivo: "Ese correo es una cuenta de productor. Un socio no puede ser productor ni comprador — emita la credencial sobre otro correo." };
      if (m.compradorReal)
        return { permitido: false, motivo: "Ese correo es una cuenta de comprador. Un socio no puede ser productor ni comprador — emita la credencial sobre otro correo." };
      if (m.recolector)
        return { permitido: false, motivo: "Ese correo es un recolector de Terratalento. Un socio no puede ser recolector — emita la credencial sobre otro correo." };
      return { permitido: true };
  }
}

/** La versión para la sesión actual (la usan las superficies públicas). */
export async function puedoSer(objetivo: ObjetivoMembresia): Promise<VeredictoMatriz> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { permitido: true }; // sin sesión no hay conflicto que explicar
  return puedeSer(user.id, objetivo);
}

// ── El conmutador de red (owner, 2026-08-02 · §3.1 del análisis) ─────────────
// Generaliza el misPlataformas() del Directorio: a qué superficies pertenece
// ESTA identidad, para que el conmutador ofrezca el salto. "Comprador" usa la
// misma vara de la matriz (comprador REAL), así el default inerte no muestra
// una tienda a la que en realidad no pertenece.
export type MisPlataformasRed = {
  kr: boolean;
  cp: boolean;
  dc: boolean;
  tt: boolean;
  interno: boolean;
};

export async function misPlataformasRed(): Promise<MisPlataformasRed | null> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;
  const m = await membresiasDe(user.id);
  return {
    kr: m.productor,
    cp: m.compradorReal,
    dc: m.directorio,
    tt: m.recolector,
    interno: m.admin,
  };
}
