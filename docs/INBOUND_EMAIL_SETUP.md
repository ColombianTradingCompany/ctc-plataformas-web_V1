# Buzón de entrada · configuración del correo entrante

Estado del código: **CONSTRUIDO (2026-07-15).** Webhook en `POST /api/inbound-email`
(firma Svix verificada), tabla `inbound_emails` (service-role-only) y visor en
BCP → **Buzón de entrada**. Lo que falta es la **ruta de entrega externa**, que solo
puede configurarse desde las cuentas de Hostinger y Resend del dueño — estos pasos.

## La arquitectura (por qué así)

- El correo del dominio raíz (`info@ctcexport.com`, etc.) vive en **Hostinger**
  (MX → `mx1/mx2.hostinger.com`). **Eso no se toca** — cambiar el MX raíz rompería
  los buzones existentes.
- Para capturar correo en la plataforma se usa un **subdominio dedicado**
  (p. ej. `inbox.ctcexport.com`) cuyo MX apunta a Resend Inbound. Cada dirección
  que quiera capturarse (`gabriel@ctcexport.com`) se **reenvía** desde Hostinger
  hacia su gemela en el subdominio (`gabriel@inbox.ctcexport.com`).

```
alguien escribe a gabriel@ctcexport.com
  → Hostinger (MX raíz, intacto) → REENVÍO → gabriel@inbox.ctcexport.com
  → MX del subdominio → Resend Inbound → webhook /api/inbound-email
  → tabla inbound_emails → BCP · Buzón
```

Ventajas: el MX raíz queda intacto; se decide dirección por dirección qué se
captura; y las direcciones-etiqueta de login (sin buzón) pueden volverse
receptoras con solo crear el reenvío.

## Pasos (una sola vez)

1. **Resend → Inbound**: crear el dominio de entrada (`inbox.ctcexport.com`).
   Resend mostrará el/los registros **MX** (y TXT si aplica) a crear.
2. **Hostinger → hPanel → Dominios → ctcexport.com → DNS**: crear esos registros
   sobre el nombre `inbox` (solo el subdominio — no tocar los MX de `@`).
3. **Resend → Webhooks**: crear un webhook para el evento de correo recibido
   apuntando a `https://ctcexport.com/api/inbound-email`. Copiar el **signing
   secret** (`whsec_…`).
4. **Vercel → Environment Variables**: añadir `RESEND_INBOUND_WEBHOOK_SECRET`
   (Sensitive) con ese valor y redeploy. Sin esta variable, el endpoint rechaza
   todo en producción (503) — es deliberado.
5. **Hostinger → Emails → ctcexport.com**: dos opciones —
   **(a) Recomendada · catch-all**: configurar la cuenta *catch-all* del dominio para
   reenviar TODO correo a direcciones no existentes hacia `todo@inbox.ctcexport.com`.
   Con eso, **cualquier etiqueta** (`gvg@`, `socios@`, lo que sea) se vuelve receptora
   al instante, sin mantenimiento por dirección; los buzones reales (`info@`) no se
   afectan porque el catch-all solo aplica a direcciones sin buzón. Trade-off: entra
   más spam al Buzón (aceptable para triaje interno). Si el panel de Hostinger no
   permite catch-all hacia un destino externo, usar la opción (b).
   **(b) Por dirección**: un reenviador `usuario@ctcexport.com → usuario@inbox.ctcexport.com`
   por cada dirección a capturar. (Para etiquetas sin buzón, el reenviador ES su
   existencia entera — sin él, Hostinger rebota con "550 User doesn't exist", que es
   exactamente el bounce observado el 2026-07-16 con gvg@.)
6. **Prueba**: enviar un correo a la dirección reenviada y confirmar que aparece
   en BCP → Buzón de entrada. En local (sin secret) el webhook acepta payloads
   sin firma SOLO en desarrollo, para pruebas con `curl`.

## Notas de seguridad

- El visor renderiza **solo `text_body`** (texto plano). El `html_body` se
  almacena pero jamás se renderiza — HTML externo no confiable.
- Los adjuntos se guardan **solo como metadatos** (nombre/tipo/tamaño), nunca los
  bytes.
- El payload crudo completo queda en `raw` (jsonb) — si el formato del proveedor
  cambia, no se pierde nada; solo habría que ajustar la extracción.
- La tabla es service-role-only (RLS activado, cero policies), como leads/arena.
