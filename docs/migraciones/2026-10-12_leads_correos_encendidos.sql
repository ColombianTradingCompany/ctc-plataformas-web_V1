-- 2026-10-12 · V6.5 · Interfaz de Leads: los correos ENCENDIDOS y la copia del seguimiento (owner, 2026-10-12)
-- «Asegúrate que cuando se haga el submission haya una respuesta automática con la información y el PDF. Queda pendiente el de
-- follow up la semana después como recordatorio: envíalo con copia CC a ctcexportmain@gmail.com.»
-- Es DATOS, no esquema: se corre a mano contra producción DESPUÉS de desplegar la V6.5 (el código anterior mandaba el inmediato sin el
-- PDF adjunto y el barrido no recogía los pendientes). Desde la V6.5 `configDe` enciende los dos interruptores cuando la clave no está;
-- aquí se escriben explícitos para que la LCP los enseñe tal cual. Los leads que llegaron con los interruptores apagados reciben su
-- correo inmediato (con el PDF) en el siguiente barrido horario (`/api/cron/seguimientos-leads`, minuto 5) o con «Enviar los
-- pendientes» en la LCP.
update public.lead_forms
   set config = config || '{"correo_inmediato": true, "seguimiento": true, "copia_seguimiento": "ctcexportmain@gmail.com"}'::jsonb,
       updated_at = now()
 where key = 'scaj2026';
