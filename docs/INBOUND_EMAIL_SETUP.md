# Buzón de entrada · arquitectura del correo entrante

Estado: **CONGELADO — historial de solo lectura** (D-013 5.4 · unificación P18, 2026-10-26).
El Buzón de la LCP guarda el correo del dominio del 2025-03 al **2026-07-16** (306 correos,
con sus adjuntos en Storage). No sincroniza, no responde, no reenvía y no archiva ni borra
nada en Hostinger. **El correo nuevo del dominio se lee y se contesta en Gmail** (la cuenta
principal, con su «Enviar como» para la dirección del dominio).

## Cómo llega hoy el correo del dominio

```
alguien escribe a CUALQUIER dirección @ctcexport.com
  → catch-all de Hostinger → buzón info@ctcexport.com («guardar copias» activo)
  → reenvío → Gmail principal (donde se lee, se etiqueta y se contesta)
```

## El historial (lo que conserva el Buzón)

- `inbound_emails`: 306 filas (2025-03 → 2026-07-16); adjuntos en `kaffetal-media/buzon/…`
  (295 archivos). `buzon_outbound`: 0 filas; la tabla se conserva vacía.
- `/lcp/buzon` lista, abre, etiqueta, marca leído / no leído y sirve los adjuntos. Nada más:
  «Sincronizar», Responder, Reenviar, Archivar y Eliminar se retiraron en P18.
- Una copia de respaldo cifrada vive fuera del repo (unificación P17).

## Por qué el código de sincronización sigue en el repo

`src/lib/buzon/syncBuzon.ts` abre el buzón en **solo lectura** (EXAMINE: el servidor rechaza
cualquier escritura) y ya no tiene la «limpieza de retención», que borraba de Hostinger el
correo archivado con más de 30 días (retirada en P18). Solo lo llama `syncBuzonNow`, que se
niega mientras `BUZON_CONGELADO = true` (`src/app/lcp/(app)/buzonActions.ts`).

Existe por un único caso: si P19 necesitara su importación de respaldo («fallback 1»), una
micro-release aprobada por el owner apaga el interruptor, restaura un disparador y la
contraseña, corre una sola vez y lo deshace todo.

Variables: `BUZON_IMAP_HOST` y `BUZON_IMAP_USER` siguen en Vercel y no hacen nada sin la
contraseña. `BUZON_IMAP_PASSWORD` se quitó de Vercel y de `.env.local` el 2026-10-23 y **no
se vuelve a poner** (solo P19 fallback 1, con su propia aprobación).

El guardián `scripts/qa-buzon-solo-lectura-check.mjs` falla si vuelve cualquier llamada que
escriba en el buzón remoto o cualquier envío desde el Buzón.

## El webhook dormido (Resend Inbound)

`POST /api/inbound-email` (firma Svix) sigue desplegado y explica en su propio archivo por qué
está dormido. Sin `RESEND_INBOUND_WEBHOOK_SECRET` —no está en ningún entorno de Vercel—
producción responde **503 «Webhook not configured.»** y no escribe nada. Poner el secreto
reabriría las escrituras en `inbound_emails`: necesita antes una decisión del owner.
