// Pure-logic checks for the Coffeed wall's embed parsing, run against the REAL
// source (src/lib/coffeed/types.ts). Un enlace mal parseado no rompe nada
// ruidosamente: deja un hueco en el muro público, así que conviene un guardián.
// Node 24 strips TS types natively.
// Run: node --experimental-strip-types scripts/qa-coffeed-embed-check.mjs
import * as t from "../src/lib/coffeed/types.ts";

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) pass++; else { fail++; console.error("FAIL:", name); } };

// ── YouTube: las cuatro formas que salen del navegador ──────────────────────
const YT = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
check("youtu.be", t.youtubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ") === YT);
check("watch?v=", t.youtubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ") === YT);
check("watch con extras", t.youtubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=x") === YT);
check("shorts", t.youtubeEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ") === YT);
check("embed ya hecho", t.youtubeEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ") === YT);
check("sin www", t.youtubeEmbedUrl("https://youtube.com/watch?v=dQw4w9WgXcQ") === YT);
check("móvil", t.youtubeEmbedUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ") === YT);
// El canal NO es un video: no debe colarse como incrustable.
check("canal rechazado", t.youtubeEmbedUrl("https://www.youtube.com/@algúncanal") === null);
check("home rechazado", t.youtubeEmbedUrl("https://www.youtube.com/") === null);
check("no-url rechazada", t.youtubeEmbedUrl("pégame un enlace") === null);

// ── Instagram: post, reel y tv ──────────────────────────────────────────────
check("post", t.instagramEmbedUrl("https://www.instagram.com/p/CxYzAbCdEfG/") === "https://www.instagram.com/p/CxYzAbCdEfG/embed");
check("reel", t.instagramEmbedUrl("https://www.instagram.com/reel/CxYzAbCdEfG/") === "https://www.instagram.com/reel/CxYzAbCdEfG/embed");
check("reel con query", t.instagramEmbedUrl("https://www.instagram.com/reel/CxYzAbCdEfG/?igsh=abc") === "https://www.instagram.com/reel/CxYzAbCdEfG/embed");
check("tv", t.instagramEmbedUrl("https://www.instagram.com/tv/CxYzAbCdEfG/") === "https://www.instagram.com/tv/CxYzAbCdEfG/embed");
// El PERFIL no es una publicación — es el error fácil de cometer al pegar.
check("perfil rechazado", t.instagramEmbedUrl("https://www.instagram.com/ctcexport/") === null);
check("otro dominio rechazado", t.instagramEmbedUrl("https://instagr.am/p/CxYzAbCdEfG/") === null);

// ── resolveEmbed: detecta proveedor, o dice que no ──────────────────────────
check("resuelve youtube", t.resolveEmbed("https://youtu.be/dQw4w9WgXcQ")?.provider === "youtube");
check("resuelve instagram", t.resolveEmbed("https://www.instagram.com/p/CxYzAbCdEfG/")?.provider === "instagram");
check("resuelve espacios", t.resolveEmbed("  https://youtu.be/dQw4w9WgXcQ  ")?.provider === "youtube");
check("ajeno = null", t.resolveEmbed("https://vimeo.com/12345") === null);
check("vacío = null", t.resolveEmbed("") === null);

// ── Las reglas del carrusel siguen intactas tras el reparto ─────────────────
const panels = (n, itemId = "x") => Array.from({ length: n }, () => ({ itemId }));
check("4 paneles no pasa", !t.validateCoffeedDraft(panels(4)).countOk);
check("11 paneles no pasa", !t.validateCoffeedDraft(panels(11)).countOk);
check("tope 3 por fuente", !t.validateCoffeedDraft(panels(6)).capOk);
check("sin trazar no pasa", !t.validateCoffeedDraft([{ itemId: null }, ...panels(4, "a")]).tracedOk);
const ok = [...panels(3, "a"), ...panels(3, "b")];
check("6 paneles, 2 fuentes, trazados", t.validateCoffeedDraft(ok).canAccept);

console.log(`${pass} pasan, ${fail} fallan`);
process.exit(fail ? 1 : 0);
