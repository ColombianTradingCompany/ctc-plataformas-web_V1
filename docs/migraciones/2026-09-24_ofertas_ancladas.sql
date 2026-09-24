-- V5.82 · Fase 5 del PLAN_CIRCUITO_DEL_LOTE (owner, 2026-09-24): confirmar y ofertar.
-- Migración `ofertas_ancladas`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- (1) La oferta ANCLADA al PVC (folio 8, paso 14; paso 19 para la directa): `pvc_edition_id` (la edición vigente el día de
--     emitir), `pvc_cop_kg` (el COP/kg de la banda, sin modificar), `modificador_pct` (−8 % directa, −10 % past crop, aditivos),
--     `terms_version` (los términos con los que nace), `min_kg` (el mínimo del grado, respuesta 1), `max_kg` y `ventana_dias` +
--     `expira_at` (la directa: 30 días), `compra_inicial_kg` (la carga que CTCx compra de inmediato). `reference_price_source`/
--     `_snapshot`, que existían y nadie escribía, llevan desde ahora el código de la edición y el COP/kg base. `kind` gana
--     `directa` (CTCx Selection) y `excepcion` (precio a mano, con motivo obligatorio: para no bloquear la operación).
-- (2) En la solicitud (`arena_inscriptions`): la DECISIÓN COMERCIAL del paso 13 (`decision_comercial = 'sin_oferta'`, con fecha y
--     motivo; se reabre al emitir) y la RE-EVALUACIÓN del paso 12 (`reevaluaciones`, `grado_previo`, `reevaluacion_previa` jsonb con
--     el resultado anterior, `reevaluacion_acuerdo` = por qué CTCx acordó que la mejora aseguraría la oferta). El reembolso del 80 %
--     si sube de grado reutiliza `cashback_cop` / `cashback_status` (el cashback al rechazado desapareció: el rechazo es gratis).

alter table public.lot_offers drop constraint if exists lot_offers_kind_check;
alter table public.lot_offers
  add constraint lot_offers_kind_check check (kind in ('temporada', 'directa', 'excepcion', 'black', 'subasta'));
alter table public.lot_offers
  add column if not exists pvc_edition_id uuid references public.pvc_editions(id) on delete set null,
  add column if not exists pvc_cop_kg numeric,
  add column if not exists modificador_pct numeric not null default 0,
  add column if not exists terms_version text,
  add column if not exists min_kg numeric,
  add column if not exists max_kg numeric,
  add column if not exists ventana_dias smallint,
  add column if not exists expira_at timestamptz,
  add column if not exists compra_inicial_kg numeric;

alter table public.arena_inscriptions
  add column if not exists decision_comercial text,
  add column if not exists decision_comercial_at timestamptz,
  add column if not exists decision_comercial_motivo text,
  add column if not exists reevaluaciones smallint not null default 0,
  add column if not exists grado_previo text,
  add column if not exists reevaluacion_previa jsonb,
  add column if not exists reevaluacion_acuerdo text;
alter table public.arena_inscriptions drop constraint if exists arena_inscriptions_decision_comercial_check;
alter table public.arena_inscriptions
  add constraint arena_inscriptions_decision_comercial_check check (decision_comercial is null or decision_comercial in ('sin_oferta'));
