// ── Leer el código como TEXTO con saltos LF, sea cual sea el checkout (2026-11-06) ─────────────────────────────────────────
//
// Sin el prefijo `qa-` a propósito: no es un guardián y ningún bucle de la batería debe correrlo. Lo importan los
// guardianes que buscan trozos de código con saltos de línea dentro (`"…;\n  if (…"`).
//
// POR QUÉ. El repo guarda LF, pero un checkout de Windows con `core.autocrlf=true` deja el árbol en CRLF. Un guardián
// que busca `"a\nb"` en un archivo leído tal cual falla en ese checkout y pasa en Vercel/Linux, sin que el código haya
// cambiado. Leyendo con `leeTexto`, el guardián ve el MISMO texto en los dos sitios: lo que pasa aquí pasa allí y lo que
// falla allí falla aquí. Ninguna comprobación se afloja: solo se quita el `\r` que el checkout añadió.
//
// Para comparar BYTES (una copia que debe ser idéntica a otra) no se usa esto: se lee el Buffer, como siempre.

import { readFileSync } from "node:fs";

/** El texto con cada `\r\n` convertido en `\n`. Un `\r` suelto (sin `\n` detrás) se deja: no es un salto de línea. */
export const aLf = (texto) => String(texto).replace(/\r\n/g, "\n");

/** Lee un archivo (ruta o `URL`) en UTF-8 y lo devuelve con saltos LF. */
export const leeTexto = (ruta) => aLf(readFileSync(ruta, "utf8"));
