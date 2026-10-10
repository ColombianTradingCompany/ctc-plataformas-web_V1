import Link from "next/link";
import { darseDeBaja } from "@/lib/leadForms/publicActions";

// ── /scaj2026/baja · la baja desde el enlace del correo (V6.2) ───────────────────────────────────────────────────────────────
// `?id=<lead>&t=<testigo>`: sin el testigo (HMAC del servidor) no hay baja. Idempotente. Se responde en los tres idiomas del
// formulario porque el enlace puede abrirse desde cualquier correo.

export const dynamic = "force-dynamic";

export default async function BajaPage({ searchParams }: { searchParams: Promise<{ id?: string; t?: string }> }) {
  const { id, t } = await searchParams;
  const r = id && t ? await darseDeBaja(id, t) : { ok: false };
  return (
    <main style={{ minHeight: "100dvh", background: "var(--paper)", color: "var(--ink)", padding: "40px 20px", fontFamily: "var(--font-instrument-sans), system-ui, sans-serif" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "26px 22px" }}>
        {r.ok ? (
          <>
            <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 24, color: "var(--primary)", margin: "0 0 14px" }}>Listo · Done · 完了</h1>
            <p style={{ lineHeight: 1.5, margin: "0 0 10px" }}>No volverás a recibir correos nuestros sobre esta conversación. Gracias por habernos visitado.</p>
            <p style={{ lineHeight: 1.5, margin: "0 0 10px" }}>You will not receive further emails from us about this conversation. Thank you for visiting us.</p>
            <p style={{ lineHeight: 1.5, margin: 0 }}>本件に関するメールの配信を停止しました。ご来場ありがとうございました。</p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 24, color: "var(--primary)", margin: "0 0 14px" }}>Enlace no válido · Invalid link · 無効なリンクです</h1>
            <p style={{ lineHeight: 1.5, margin: "0 0 10px" }}>Este enlace de baja no es válido o está incompleto. Escríbenos a info@ctcexport.com y lo resolvemos.</p>
            <p style={{ lineHeight: 1.5, margin: "0 0 10px" }}>This unsubscribe link is not valid or is incomplete. Write to us at info@ctcexport.com and we will sort it out.</p>
            <p style={{ lineHeight: 1.5, margin: 0 }}>このリンクは無効または不完全です。info@ctcexport.com までご連絡ください。</p>
          </>
        )}
        <p style={{ marginTop: 22, fontSize: 14 }}>
          <Link href="/" style={{ color: "var(--primary)" }}>
            ctcexport.com
          </Link>
        </p>
      </div>
    </main>
  );
}
