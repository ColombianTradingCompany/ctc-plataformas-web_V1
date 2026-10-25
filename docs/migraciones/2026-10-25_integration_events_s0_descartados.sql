-- 2026-10-25 · Integraciones (S0, P1 del plan de unificación): los 3 eventos salientes de la clave retirada, DESCARTADOS
-- (owner, 2026-10-25: «ship P1 as the next V6.x, run the 3-row UPDATE first»).
-- Por qué: son las 3 filas del acta 2026-10-23_integration_events_clave_retirada.sql (2× coffeed.redaccion.post_creado,
-- 1× herramienta.cromatografia-suelo.analisis.generado), `fallido` tras 5 intentos contra un webhook que no era una URL. Con la V6.8
-- `ultimo_error` solo admite códigos (`src/lib/integraciones/errores.ts`) y el botón «Reintentar fallidos» las habría devuelto a la cola
-- en cuanto existiera el webhook: se descartan ANTES de que nadie ponga `MAKE_WEBHOOK_URL`, para que nunca salgan.
-- Es DATOS, no esquema: corrido a mano contra producción el 2026-10-25, por id (los ids y la instantánea previa —estado · intentos ·
-- longitud del error— quedan fuera del repo, en la carpeta local de la unificación). Antes: fallido · 5 · 101 caracteres.
-- Después: descartado · 5 · NULL; ninguna fila de la tabla conserva texto libre en `ultimo_error`.
update public.integration_events
   set ultimo_error = null,
       estado = 'descartado'
 where destino is null
   and estado = 'fallido'
   and ultimo_error like 'Failed to parse URL from [valor retirado%';
