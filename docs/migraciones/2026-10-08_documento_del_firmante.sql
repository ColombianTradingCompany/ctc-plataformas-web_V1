-- V5.188 · El documento de quien firma el contrato (feedback de revisión de «Contratos y Compras»: «el contrato debe tener el
-- espacio para escribir la CC —cédula de ciudadanía— además del nombre de quien firma»). El tipo y el número se escriben al
-- firmar, entran al texto firmado («identificado(a) con CC 1.098.765.432») y con él a su huella SHA-256, y se guardan aquí
-- normalizados (sin puntos ni espacios; el NIT con su dígito de verificación tras un guion). Reglas: src/lib/trato/documento.ts.
-- Al escribir esto no hay contratos firmados: los anteriores quedan con las dos columnas nulas.

alter table public.purchase_contracts
  add column if not exists producer_signer_doc_tipo text,
  add column if not exists producer_signer_doc_numero text;

alter table public.purchase_contracts
  drop constraint if exists purchase_contracts_signer_doc_tipo_check,
  drop constraint if exists purchase_contracts_signer_doc_numero_check,
  drop constraint if exists purchase_contracts_signer_doc_pareja_check;

alter table public.purchase_contracts
  add constraint purchase_contracts_signer_doc_tipo_check
    check (producer_signer_doc_tipo is null or producer_signer_doc_tipo in ('CC', 'CE', 'PPT', 'PA', 'NIT')),
  add constraint purchase_contracts_signer_doc_numero_check
    check (producer_signer_doc_numero is null or producer_signer_doc_numero ~ '^[0-9A-Z]{4,12}(-[0-9])?$'),
  add constraint purchase_contracts_signer_doc_pareja_check
    check ((producer_signer_doc_tipo is null) = (producer_signer_doc_numero is null));

comment on column public.purchase_contracts.producer_signer_doc_tipo is
  'V5.188 · tipo de documento de quien firma: CC · CE · PPT · PA · NIT (src/lib/trato/documento.ts).';
comment on column public.purchase_contracts.producer_signer_doc_numero is
  'V5.188 · número normalizado (sin puntos ni espacios; el NIT con su dígito tras un guion). Entra al texto firmado y a su huella.';
