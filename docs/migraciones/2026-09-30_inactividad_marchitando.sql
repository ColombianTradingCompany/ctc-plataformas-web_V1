-- ── Acta · 2026-09-30 · V5.103 · inactividad de las cuentas «Marchitando» ────────────────────────────────────────
-- Aplicada con `apply_migration` (nombre `inactividad_marchitando`) en el proyecto sjznkzvefqfcysczllli.
--
-- El owner (2026-09-30): «los productores en estado Marchitando, que no tengan finca ni lote, reciben un correo
-- recordándoles la cuenta, cómo acceder y usarla; un mes después otro correo avisando que la inactividad borrará la
-- cuenta automáticamente en un mes (SOLO si no tiene lote ni finca); y un botón para eliminar una cuenta de este tipo».
--
-- El estado del barrido (recordatorio_at → aviso_at → borrado) y la PROTECCIÓN del owner viven en una tabla aparte,
-- service-role-only (RLS sin políticas): un productor tiene update-own sobre producer_profiles y podría protegerse
-- solo; y así no se toca `guard_producer_protected_columns`. La regla pura: `src/lib/inactividad/reglas.ts`; el
-- barrido: `src/lib/inactividad/barrido.ts` (tercer barrido del cron semanal `/api/cron/recordatorios`).

create table if not exists public.producer_inactividad (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  protegida boolean not null default false,
  protegida_motivo text,
  protegida_at timestamptz,
  protegida_por uuid references public.profiles(id) on delete set null,
  recordatorio_at timestamptz,
  aviso_at timestamptz,
  ultimo_error text,
  updated_at timestamptz not null default now()
);
alter table public.producer_inactividad enable row level security;
comment on table public.producer_inactividad is 'V5.103: estado del barrido de inactividad (recordatorio → aviso → borrado) y la protección del owner. Service-role only.';

-- Las cuentas que el owner conserva siempre (memoria del nodo final): tres de amigos y familia y CTC Redes.
insert into public.producer_inactividad (profile_id, protegida, protegida_motivo, protegida_at)
select p.id, true, 'Cuenta de amigos y familia / CTC Redes: se conserva siempre (owner, 2026-09-30)', now()
from public.profiles p
where upper(substr(replace(p.id::text,'-',''),1,8)) in ('20A85D62','57EB7B93','4AF96C32','067907FB')
on conflict (profile_id) do update set protegida = true, protegida_motivo = excluded.protegida_motivo, protegida_at = now();
