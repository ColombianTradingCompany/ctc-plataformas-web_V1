-- ACTA · 2026-10-11 · V6.2 · migración `interfaz_de_leads` (APLICADA el 2026-10-11 desde la sesión de `consolas`)
--
-- El owner (2026-10-10, de noche): «construye una "Interfaz de Leads" como un módulo de LCP · General, el cual contenga una serie
-- de "Forms" que podrán ser activadas o desactivadas para aparecer (una a la vez) en la página principal de ctcexport.com [...]
-- desarrolla la primera Form para "SCAJ2026"». La especificación del formulario está en
-- `reference/Web_Lead_Form/prompt-formulario-leads-scaj2026.md` (fuera del repo): feria SCAJ 2026, Tokio, 14-17 de octubre.
--
-- (1) `lead_forms` — el REGISTRO de formularios de captación de la casa (uno por feria o campaña). `activo` enciende el formulario:
--     su página pública responde y la cabecera de CTC Home enseña su etiqueta (`etiqueta_cabecera`, p. ej. «SCAJ2026»). Como mucho
--     UNO activo a la vez (índice único parcial sobre una constante). `config` guarda lo que el owner decide sin desplegar: enlace de
--     agenda, aviso de privacidad, firma, remitente de respuesta, si salen el correo inmediato y el seguimiento, y a cuántos días.
-- (2) `event_leads` — una fila por envío del formulario, con TODOS los campos de la especificación (en inglés, como los pide) y las
--     preguntas adicionales de la casa en `extra` (jsonb, claves conocidas). `idempotency_key` la pone el navegador: un doble toque
--     en «Enviar» no crea dos leads. Queda registrado cuándo salió cada correo y cuándo vence el seguimiento (`followup_due_at`).
--     `values_beans` es el objeto {clave: granos 0-5} de «Qué valoras» (el nombre `values` es palabra reservada en SQL).
-- (3) RLS encendido SIN políticas en las dos tablas: solo el service role lee y escribe (el patrón de la casa, ALINEACION §1). El
--     formulario público inserta a través de una Server Action; nunca lee ni modifica. Son datos personales.
-- (4) El bucket PRIVADO `event-leads` para la foto de la tarjeta: el navegador sube con una URL firmada que emite el servidor (nombre
--     aleatorio, carpeta por formulario); nadie lo lista ni lo lee sin el service role (la consola la enseña con URL firmada corta).
--
-- Reversible: `drop table event_leads; drop table lead_forms; delete from storage.buckets where id = 'event-leads'`.

begin;

create table if not exists public.lead_forms (
  key text primary key check (key ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  nombre text not null,
  descripcion text,
  ruta text not null unique check (ruta ~ '^/[a-z0-9][a-z0-9/-]*$'),
  etiqueta_cabecera text not null check (length(etiqueta_cabecera) between 1 and 24),
  activo boolean not null default false,
  vigente_desde timestamptz,
  vigente_hasta timestamptz,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.lead_forms is 'V6.2 · Interfaz de Leads (LCP · General): el registro de formularios de captación; como mucho uno activo, que la cabecera de CTC Home enseña.';
create unique index if not exists lead_forms_una_activa on public.lead_forms ((true)) where activo;
alter table public.lead_forms enable row level security;

create table if not exists public.event_leads (
  id uuid primary key default gen_random_uuid(),
  form_key text not null references public.lead_forms(key),
  idempotency_key uuid not null unique,
  status text not null default 'nuevo' check (status in ('nuevo', 'en_conversacion', 'convertido', 'cerrado')),
  participant_type text not null check (participant_type in ('roaster', 'importer', 'cafe_horeca', 'distributor', 'producer', 'barista', 'press', 'other')),
  participant_other text check (participant_other is null or length(participant_other) <= 120),
  full_name text not null check (length(full_name) between 1 and 160),
  company text not null check (length(company) between 1 and 160),
  email text not null check (length(email) between 5 and 254),
  country_city text check (country_city is null or length(country_city) <= 160),
  card_photo_path text,
  green_volume text check (green_volume is null or green_volume in ('lt_1t', '1_5t', '5_20t', '20_100t', 'gt_100t', 'none')),
  buys_colombian text check (buys_colombian is null or buys_colombian in ('regular', 'sometimes', 'not_yet')),
  profiles text[] not null default '{}',
  about text check (about is null or length(about) <= 2000),
  values_beans jsonb not null default '{}'::jsonb,
  looking_for text check (looking_for is null or length(looking_for) <= 2000),
  timing text check (timing is null or timing in ('lt_3m', '3_6m', 'exploring')),
  wants text[] not null default '{}',
  master_roaster_interest boolean not null default false,
  extra jsonb not null default '{}'::jsonb,
  consent boolean not null default true check (consent),
  consent_at timestamptz not null default now(),
  lang text not null check (lang in ('es', 'en', 'ja')),
  source text check (source is null or length(source) <= 60),
  submitted_ip text,
  user_agent text,
  email_immediate_sent_at timestamptz,
  email_immediate_error text,
  followup_due_at timestamptz not null,
  followup_sent_at timestamptz,
  followup_error text,
  replied_at timestamptz,
  unsubscribed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.event_leads is 'V6.2 · un envío del formulario de leads de una feria o campaña (lead_forms.key); solo service role.';
create index if not exists event_leads_form_created on public.event_leads (form_key, created_at desc);
create index if not exists event_leads_seguimiento on public.event_leads (followup_due_at) where followup_sent_at is null and unsubscribed_at is null;
create index if not exists event_leads_email on public.event_leads (lower(email));
alter table public.event_leads enable row level security;

-- El bucket privado de las fotos de tarjeta (5 MB; los tipos que producen las cámaras de los teléfonos).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-leads', 'event-leads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- El primer formulario: SCAJ 2026 (Tokio, 14-17 de octubre de 2026). Nace APAGADO: el owner lo enciende desde la LCP.
-- (La sesión que lo construyó lo ENCENDIÓ la madrugada del 2026-10-11 para probarlo de punta a punta y lo dejó encendido: la insignia
-- sale en la portada; los correos siguen apagados hasta que el owner apruebe los textos.)
insert into public.lead_forms (key, nombre, descripcion, ruta, etiqueta_cabecera, activo, vigente_desde, vigente_hasta, config)
values (
  'scaj2026',
  'SCAJ 2026 · Tokio',
  'Formulario de leads para el stand de SCAJ 2026 (Tokyo Big Sight, 14-17 de octubre de 2026, con la Embajada de Colombia y ProColombia). QR en el stand; el visitante lo llena en su celular en ES · EN · 日本語.',
  '/scaj2026',
  'SCAJ2026',
  false,
  null, -- sin «vigente desde»: el owner lo enciende cuando quiera (encenderlo antes de la feria sirve para probarlo); «hasta» el 31 de octubre
  '2026-10-31 23:59:59+00',
  '{"correo_inmediato": false, "seguimiento": false, "seguimiento_dias": 7, "ja_correo_en": true, "agenda_url": "", "privacy_url": "/scaj2026/privacidad", "reply_to": "info@ctcexport.com", "firma": ""}'::jsonb
)
on conflict (key) do nothing;

commit;
