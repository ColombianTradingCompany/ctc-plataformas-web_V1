-- 2026-10-23 · Interfaz de Leads: el SEGUIMIENTO del formulario SCAJ 2026, PAUSADO (owner, 2026-10-23: «pause the SCAJ follow-ups now
-- (turn off seguimiento on the scaj2026 form) and log it as a Phase-0 exception»).
-- Por qué: `yaRespondio` (src/lib/leadForms/envios.ts) decide «ya nos respondió» buscando SOLO en `inbound_emails` (el Buzón), que no se
-- sincroniza desde el 2026-07-16; desde el 2026-10-22 info@ reenvía a ctcexportmain@gmail.com, así que una respuesta del comprador ya no
-- llega nunca al Buzón y el seguimiento le saldría igual. Se vuelve a encender cuando la comprobación lea las respuestas de nuevo
-- (Ronda 5 del plan de unificación, docs/UNIFICACION_ALINEACION.md, pregunta 5.5).
-- Es DATOS, no esquema: corrido a mano contra producción el 2026-10-23 05:45 UTC (excepción a la Fase 0 de solo lectura, D-008).
-- Antes: seguimiento = true, correo_inmediato = true, seguimiento_dias = 7, copia_seguimiento = ctcexportmain@gmail.com.
-- Después: solo `seguimiento` cambia a false; el correo inmediato de confirmación (con el PDF) sigue encendido.
-- Efecto verificado: un seguimiento ya había salido a las 05:05 UTC (vencía 04:57, antes de la pausa); los 2 pendientes quedan retenidos.
update public.lead_forms
   set config = config || '{"seguimiento": false}'::jsonb,
       updated_at = now()
 where key = 'scaj2026';

-- Para reanudar (solo cuando la comprobación de respuestas lea Gmail o el Buzón vuelva a recibir):
-- update public.lead_forms set config = config || '{"seguimiento": true}'::jsonb, updated_at = now() where key = 'scaj2026';
