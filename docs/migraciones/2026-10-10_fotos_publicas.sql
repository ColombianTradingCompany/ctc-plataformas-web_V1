-- V5.202 (owner, 2026-10-10) · Ninguna foto de la cámara del productor sale en público sin que CTCx la APRUEBE.
-- El owner: el Dossier público y la vitrina deben «omitir info que haga fácil circumventar a CTCx para llegar al Productor». La
-- revisión de privacidad del 2026-10-10 encontró que las fotos del lote (B4) salían tal cual las subió el productor: en un lote, la
-- segunda foto es el primer plano de una cara (la imagen de una persona es un dato personal, Ley 1581/2012, y una búsqueda inversa
-- lleva a ella); en otro, la portada enseña a una persona cosechando junto a la casa; la foto de perfil de otra finca lleva el
-- logo de una asociación. Decisión del nodo final: una aprobación POR FOTO, que da CTCx desde la vista del lote en
-- `/ocp/kr?lote=…` («Pública en la vitrina: sí/no», `kr/fotosPublicasActions.ts`, clase `emite`, con su fila en `audit_log`).
--
-- La EXIGEN los tres que enseñan una foto del lote sin sesión:
--   · `public_lot_vitrina.tiene_foto` (`2026-10-10_vitrina_sin_finca.sql`): sin una foto aprobada, la tarjeta pinta el sello del grado.
--   · `fotoDeLaVitrina` (`src/lib/catalogo/vitrina.ts`, la sirve `/api/catalogo/foto/[referencia]`): la primera aprobada, en el orden de B4.
--   · `cargarDossier` en modo público (`src/lib/kaffetal/dossierDatos.ts`): como mucho UNA, la de la portada.
-- Mientras esta tabla no exista, el código lee «ninguna aprobada» (falla cerrada): sin fotos en público, nunca una sin revisar.
--
-- La aprobación es de un ARCHIVO (`asset_id`, el `assetId` de `datasheet.b4_files_foto`): si el productor sube otra foto, esa nace
-- sin aprobar; si se borra el archivo (`media_assets`) o el lote, la aprobación se va con él (cascade).
-- Solo service role: RLS activa SIN políticas (el patrón de la casa para lo que escribe una consola); anon y authenticated no la
-- tocan. La vista pública la lee con los permisos de su dueño, como lee `lots`.
--
-- ORDEN: va ANTES de `2026-10-10_vitrina_sin_finca.sql` (que la lee y se niega si no existe). Se puede aplicar antes o después del
-- despliegue del código.

begin;

create table if not exists public.lot_fotos_publicas (
  lot_id uuid not null references public.lots(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  aprobada_por uuid references public.profiles(id) on delete set null,
  aprobada_at timestamptz not null default now(),
  primary key (lot_id, asset_id)
);

alter table public.lot_fotos_publicas enable row level security;

revoke all on public.lot_fotos_publicas from public, anon, authenticated;
grant select, insert, update, delete on public.lot_fotos_publicas to service_role;

comment on table public.lot_fotos_publicas is
  'V5.202 · Las fotos del lote (B4) que CTCx aprobó para lo público (vitrina, cinta, Dossier público). Sin fila, la foto no sale. Escribe solo el OCP (service role).';

commit;
