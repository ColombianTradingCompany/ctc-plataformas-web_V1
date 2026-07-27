// Client-side trim of a saved .mhtml before it is uploaded.
//
// WHY: a LinkedIn "Save as → Webpage, Single File" export is mostly embedded
// assets — every image, stylesheet and font of the page, base64'd into the MIME
// container. Measured on real exports: 14.77 MB and 6.05 MB, of which the main
// text/html part is 0.68 MB and 0.25 MB (4.6% and 4.1%). Nothing downstream
// reads the assets: the parser takes the first text/html part and throws the
// rest away. Uploading them was pure waiting.
//
// This keeps the MIME preamble and the first text/html part and drops every
// other part, so the result is still a VALID multipart/related document that
// mailparser parses exactly as before (verified: byte-identical extracted text
// on both files above). It works on raw bytes and never decodes the body — a
// text round-trip would risk mangling any 8-bit part.
//
// Anything unexpected (no boundary, no html part, no size win) returns null and
// the caller uploads the original untouched. Shrinking the file is an
// optimisation; never let it become a way to lose the posting.

const ASCII = new TextDecoder("ascii");

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, from: number): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

export type TrimResult = { blob: Blob; originalBytes: number; trimmedBytes: number } | null;

export async function trimMhtml(file: File): Promise<TrimResult> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());

    // The boundary is declared in the container headers at the top of the file.
    const head = ASCII.decode(buf.subarray(0, 4096));
    const m = head.match(/boundary="?([^"\r\n;]+)"?/i);
    if (!m) return null;

    const marker = new TextEncoder().encode(`--${m[1]}`);
    const starts: number[] = [];
    for (let i = indexOfBytes(buf, marker, 0); i !== -1; i = indexOfBytes(buf, marker, i + marker.length)) starts.push(i);
    if (starts.length < 2) return null;

    for (let k = 0; k < starts.length - 1; k++) {
      const partStart = starts[k];
      const partEnd = starts[k + 1];
      // Headers of this part end at the first blank line; 400 bytes is plenty.
      const header = ASCII.decode(buf.subarray(partStart, Math.min(partStart + 400, partEnd))).toLowerCase();
      if (!header.includes("text/html")) continue;

      const tail = new TextEncoder().encode(`--${m[1]}--\r\n`);
      const blob = new Blob([buf.subarray(0, starts[0]), buf.subarray(partStart, partEnd), tail], {
        type: file.type || "multipart/related",
      });
      // A "trim" that saves nothing is not worth the risk of shipping something
      // subtly different from what the browser saved.
      if (blob.size >= file.size * 0.95) return null;
      return { blob, originalBytes: file.size, trimmedBytes: blob.size };
    }
    return null;
  } catch {
    return null;
  }
}
