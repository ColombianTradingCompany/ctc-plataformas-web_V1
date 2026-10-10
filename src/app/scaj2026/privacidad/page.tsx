import Link from "next/link";
import { CTC_EMAIL, CTC_LEGAL_LINE, CTC_RAZON } from "@/lib/legal";

// ── /scaj2026/privacidad · el aviso de privacidad del formulario (V6.2) ──────────────────────────────────────────────────────
// El consentimiento del formulario enlaza aquí mientras el owner no fije otro aviso en `lead_forms.config.privacy_url` (la LCP).
// Dice lo mínimo y verdadero: quién trata los datos, qué se guarda, para qué, cuánto tiempo, cómo darse de baja y a quién escribir.
// En los tres idiomas del formulario, uno debajo del otro (es un enlace que se abre desde cualquier idioma).

export const dynamic = "force-static";

const BLOQUES: { lang: string; titulo: string; p: string[] }[] = [
  {
    lang: "es",
    titulo: "Aviso de privacidad · formulario de SCAJ 2026",
    p: [
      `${CTC_RAZON} (CTCx) es responsable del tratamiento de los datos que dejas en este formulario: tu nombre, tu empresa, tu correo, tu país y ciudad, la foto de tu tarjeta si la adjuntas y tus respuestas sobre lo que buscas en un café.`,
      "Los usamos para una sola cosa: escribirte sobre esta conversación (un correo de respuesta y, a los días, un seguimiento) y preparar lo que pediste (muestras, catálogo, una videollamada). No los vendemos ni los compartimos con terceros fuera de los servicios que usamos para guardarlos y enviarte correo.",
      "Puedes darte de baja desde el enlace que lleva cada correo, y pedir que corrijamos o borremos tus datos escribiendo a " + CTC_EMAIL + ". Conservamos los datos mientras dure la conversación comercial y, como máximo, dos años desde la feria.",
    ],
  },
  {
    lang: "en",
    titulo: "Privacy notice · SCAJ 2026 form",
    p: [
      `${CTC_RAZON} (CTCx) is responsible for the data you leave in this form: your name, your company, your email, your country and city, the photo of your business card if you attach it, and your answers about what you look for in a coffee.`,
      "We use them for one thing only: to write to you about this conversation (a reply email and, a few days later, a follow-up) and to prepare what you asked for (samples, the catalogue, a video call). We do not sell them or share them with third parties beyond the services we use to store them and to send you email.",
      "You can unsubscribe from the link in every email, and ask us to correct or delete your data by writing to " + CTC_EMAIL + ". We keep the data while the commercial conversation lasts and, at most, two years from the fair.",
    ],
  },
  {
    lang: "ja",
    titulo: "プライバシーポリシー · SCAJ 2026 フォーム",
    p: [
      `${CTC_RAZON}(CTCx)は、本フォームにご入力いただいた情報(お名前、会社名、メールアドレス、国・都市、添付いただいた名刺の写真、コーヒーに関するご回答)の管理責任者です。`,
      "ご入力いただいた情報は、本件に関するご連絡(返信メールと数日後のフォローアップ)と、ご希望内容(サンプル、カタログ、オンライン面談)の準備のためにのみ使用します。保管およびメール送信に利用するサービス以外の第三者に販売・提供することはありません。",
      "各メールに記載のリンクから配信停止ができます。データの訂正・削除のご依頼は " + CTC_EMAIL + " までご連絡ください。データは商談の継続期間中、最長で展示会から2年間保管します。",
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <main style={{ minHeight: "100dvh", background: "var(--paper)", color: "var(--ink)", padding: "32px 20px 48px", fontFamily: "var(--font-instrument-sans), system-ui, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "grid", gap: 16 }}>
        {BLOQUES.map((b) => (
          <section key={b.lang} lang={b.lang} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "22px 20px" }}>
            <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 22, color: "var(--primary)", margin: "0 0 12px" }}>{b.titulo}</h1>
            {b.p.map((texto, i) => (
              <p key={i} style={{ lineHeight: 1.55, margin: "0 0 10px", fontSize: 15 }}>
                {texto}
              </p>
            ))}
          </section>
        ))}
        <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
          {CTC_LEGAL_LINE} ·{" "}
          <Link href="/scaj2026" style={{ color: "var(--primary)" }}>
            SCAJ 2026
          </Link>
        </p>
      </div>
    </main>
  );
}
