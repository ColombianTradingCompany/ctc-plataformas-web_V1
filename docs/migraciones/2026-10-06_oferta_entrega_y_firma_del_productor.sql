-- V5.168 (owner, 2026-10-06): la oferta confirma sus condiciones de entrega y el contrato se firma con el dedo.
--   · lot_offers.lugar_entrega — las condiciones de entrega que CTCx confirma al emitir (por defecto: Bucaramanga, en las
--     instalaciones de CTCx). El mínimo (min_kg) y el precio ya existían.
--   · purchase_contracts — la firma del PRODUCTOR al aceptar: cuándo, con qué nombre, la imagen (ruta privada en Storage),
--     los metadatos de la firma (navegador, IP) y la huella SHA-256 del texto exacto que firmó. La firma de CTCx sigue
--     siendo `signed_at` (status pending_signature → active).
-- Aditiva: columnas nuevas, todas nulas; ningún dato existente cambia.

alter table public.lot_offers add column if not exists lugar_entrega text;

alter table public.purchase_contracts add column if not exists lugar_entrega text;
alter table public.purchase_contracts add column if not exists producer_signed_at timestamptz;
alter table public.purchase_contracts add column if not exists producer_signer_name text;
alter table public.purchase_contracts add column if not exists producer_signature_path text;
alter table public.purchase_contracts add column if not exists producer_signature_meta jsonb;
alter table public.purchase_contracts add column if not exists contract_text_version text;
alter table public.purchase_contracts add column if not exists contract_text_sha256 text;

comment on column public.purchase_contracts.producer_signature_path is 'V5.168: la firma del productor (PNG) en el bucket privado kaffetal-media; se lee con URL firmada.';
comment on column public.purchase_contracts.contract_text_sha256 is 'V5.168: SHA-256 del texto del contrato que el productor firmó (textoDelContrato, src/lib/trato/contrato.ts).';
