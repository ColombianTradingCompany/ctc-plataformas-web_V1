# Buzón de entrada · arquitectura del correo entrante

Estado: **OPERATIVO (2026-07-16), vía IMAP.** La ruta activa es la opción A+pull:
catch-all de Hostinger → buzón real `info@` → sincronización IMAP → `inbound_emails`
→ BCP · Buzón. El webhook de Resend Inbound (abajo) queda construido pero dormante —
es la mejora futura si algún día se quiere push en tiempo real (Resend Pro, US$20/mes).

## La ruta activa (costo: $0)

```
alguien escribe a CUALQUIER dirección @ctcexport.com (gvg@, socios@, la que sea)
  → catch-all de Hostinger (configurado 2026-07-16) → buzón info@ctcexport.com
  → "Sincronizar buzón" en /bcp/buzon → src/lib/buzon/syncBuzon.ts (IMAP)
  → inbound_emails (+ adjuntos a Storage) → BCP · Buzón de entrada
```

Configuración ya hecha:
- **Hostinger**: catch-all `*@ctcexport.com → info@ctcexport.com` (activo).
- **Env vars** (Vercel Production+Preview y `.env.local`): `BUZON_IMAP_HOST`
  (`imap.hostinger.com`), `BUZON_IMAP_USER` (`info@ctcexport.com`),
  `BUZON_IMAP_PASSWORD` (Sensitive). Si la contraseña del buzón se cambia en
  Hostinger, hay que actualizarla en ambos lados.

## Políticas del sync (src/lib/buzon/syncBuzon.ts)

1. **Nunca se pierde correo**: un mensaje solo se borra de Hostinger si su fila
   archivada está confirmada en Postgres Y tiene más de 30 días (RETENTION_DAYS).
   El historial previo al sistema (no archivado) jamás se toca.
2. **Lectura no destructiva**: el sync no marca como leído — el uso humano de
   info@ por webmail sigue intacto.
3. **Idempotente**: dedupe por message-id (índice único parcial); re-sincronizar
   no duplica.
4. **Acotado**: cada corrida escanea TODOS los sobres (barato) pero importa máx.
   25 mensajes completos y devuelve `remaining`; el botón "Sincronizar" repite en
   bucle hasta importar el buzón entero (histórico incluido) — cada corrida cabe
   en una invocación serverless. Los **adjuntos** se suben a Storage (`kaffetal-media/buzon/...`),
   así sobreviven a la limpieza del buzón remoto; el visor sigue mostrando solo
   texto plano (el HTML se archiva pero nunca se renderiza).

Con esto, el buzón gratuito de 1 GB nunca se llena: es un búfer, no un archivo.
El archivo permanente es Supabase.

## Mejora futura · Resend Inbound (dormante)

`POST /api/inbound-email` (firma Svix, `RESEND_INBOUND_WEBHOOK_SECRET`) sigue
desplegado. Para activar push en tiempo real algún día: Resend Pro → dominio
`inbox.ctcexport.com` + su MX en Hostinger → webhook → cambiar el catch-all hacia
`todo@inbox.ctcexport.com`. Nada de código nuevo — ambas rutas alimentan la misma
tabla y el mismo Buzón.
