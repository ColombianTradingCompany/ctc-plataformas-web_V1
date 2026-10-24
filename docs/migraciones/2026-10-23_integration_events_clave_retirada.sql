-- 2026-10-23 · Integraciones: la clave que `MAKE_WEBHOOK_URL` guardaba por error, RETIRADA de `integration_events`
-- (owner, 2026-10-23, unificación D-014 6.5 / D-015: «blank the 3 stored copies and log it»).
-- Por qué: `MAKE_WEBHOOK_URL` (Vercel) tenía una cadena hexadecimal de 64 caracteres en vez de la URL del webhook. El despachador
-- (`src/lib/integraciones/dispatch.ts`) hace `fetch(url)` y guarda el mensaje del error en `ultimo_error`, que el tablero
-- ECP · Automatizaciones (`AutomatizacionesBoard.tsx`) enseña entero: «Failed to parse URL from <la clave>». Tres eventos salientes
-- (2× coffeed.redaccion.post_creado, 1× herramienta.cromatografia-suelo.analisis.generado) quedaron `fallido` con la clave completa.
-- Antes de esto, el owner borró `MAKE_WEBHOOK_URL` en Vercel y redesplegó (2026-10-23); sin la variable el despachador devuelve
-- «MAKE_WEBHOOK_URL sin configurar» y no escribe ninguna copia nueva.
-- Es DATOS, no esquema: corrido a mano contra producción el 2026-10-23 (excepción a la Fase 0, D-015). Instantánea previa: solo
-- longitudes (3 filas · 89 caracteres · prefijo «Failed to parse URL from »); el valor NO se copió a ningún sitio.
-- Después: 3 filas · 101 caracteres; ninguna fila de la tabla conserva una cadena hex de 40+ caracteres (ni en `ultimo_error` ni en `payload`).
-- El arreglo de código (guardar códigos de error, nunca el texto libre de una excepción) va en la primera parte de la Fase 1.
update public.integration_events
   set ultimo_error = 'Failed to parse URL from [valor retirado 2026-10-23: MAKE_WEBHOOK_URL guardaba una clave, no una URL]'
 where ultimo_error like 'Failed to parse URL from %';
