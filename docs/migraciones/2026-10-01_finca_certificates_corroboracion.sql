-- ── Acta · 2026-10-01 · V5.119 · el archivo de corroboración de una certificación de finca ───────────────────────
-- Aplicada con `apply_migration` (nombre `finca_certificates_corroboracion`) en el proyecto sjznkzvefqfcysczllli.
--
-- Owner (2026-10-01): «En Certificaciones, permite también subir 1 archivo por cada una para corroborarla». Al
-- corroborar (OCP · Productores, Fincas y Lotes · finca · Certificaciones), CTCx adjunta UN archivo —la captura del
-- registro público, el certificado contrastado— que queda en `corroboracion_asset_id` / `corroboracion_filename`.
-- Solo CTC lo escribe: `guard_finca_cert_protected` lo fuerza a null al INSERT y lo congela al UPDATE de no-CTC,
-- igual que el estado. El productor sigue sin verlo (su panel lee `status`/`verified_by_ctc`).

alter table public.finca_certificates
  add column if not exists corroboracion_asset_id uuid references public.media_assets(id) on delete set null,
  add column if not exists corroboracion_filename text;
comment on column public.finca_certificates.corroboracion_asset_id is 'V5.119: el archivo con el que CTC corroboró la certificación (uno por certificación). Solo CTC (guard).';

-- guard_finca_cert_protected: se reescribió entera con dos líneas más (INSERT → null; UPDATE de no-CTC → excepción si
-- cambian corroboracion_asset_id / corroboracion_filename). El resto de la función es la de la V5.78.

create or replace function public.guard_finca_cert_protected()
returns trigger
language plpgsql security definer set search_path to 'public'
as $$
declare
  actor text := coalesce(auth.role(), 'postgres');
begin
  if actor in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verified_by_ctc := false;
    new.verified_at := null;
    new.status := 'declarada';
    new.nota_ctc := null;
    new.evidencia_pedida_at := null;
    new.recordatorios := 0;
    new.ultimo_recordatorio_at := null;
    new.retirada_at := null;
    new.corroboracion_asset_id := null;
    new.corroboracion_filename := null;
    return new;
  end if;
  -- UPDATE de no-CTC: nunca puede ENCENDER la verificación ni mover el estado...
  if new.verified_by_ctc is distinct from old.verified_by_ctc and new.verified_by_ctc then
    raise exception 'La verificación del certificado solo puede otorgarla CTC.';
  end if;
  if new.status is distinct from old.status
     or new.nota_ctc is distinct from old.nota_ctc
     or new.evidencia_pedida_at is distinct from old.evidencia_pedida_at
     or new.recordatorios is distinct from old.recordatorios
     or new.ultimo_recordatorio_at is distinct from old.ultimo_recordatorio_at
     or new.retirada_at is distinct from old.retirada_at
     or new.corroboracion_asset_id is distinct from old.corroboracion_asset_id
     or new.corroboracion_filename is distinct from old.corroboracion_filename then
    raise exception 'El estado de la certificación solo puede moverlo CTC.';
  end if;
  -- ...y editar el contenido de un cert verificado/corroborado lo devuelve a «declarada».
  if (old.verified_by_ctc or old.status = 'corroborada') and (
       new.scheme is distinct from old.scheme
    or new.cert_number is distinct from old.cert_number
    or new.valid_from is distinct from old.valid_from
    or new.valid_to is distinct from old.valid_to
  ) then
    new.verified_by_ctc := false;
    new.verified_at := null;
    new.status := 'declarada';
  end if;
  return new;
end;
$$;
