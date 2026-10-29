-- Alta de la herramienta `incoterms` (Navegador de Incoterms® 2020, mar y aire) · V6.14, 2026-10-29.
--
-- CORRER DESPUÉS DEL DEPLOY del archivo public/tools/incoterms/incoterms-navigator.html, nunca antes:
-- la base no debe señalar un archivo que todavía no existe (misma regla que gulliver V5.149 y
-- calculadora-logistica V6.11). Sustituir <sha> por el commit desplegado. Idempotente: si la fila ya
-- existe, no hace nada.
--
-- `meta_description` es el ESPEJO de la meta description del archivo (qa-tools-seo-espejo la compara);
-- no cambiarla aquí sin cambiar el archivo. `lang` = `en` porque el <html lang> servido es `en` (la
-- herramienta conmuta a es · ja · de en el navegador). Nivel y superficies por omisión: el owner los
-- ajusta en BCP · Herramientas.

begin;

insert into public.tools (id, nombre, descripcion, lang, clase, familia, kr, cp, web, dc, tier, orden, meta_description, soporta_memoria, guia)
select
  'incoterms',
  'Navegador de Incoterms® 2020 (mar y aire)',
  'Los once Incoterms® 2020 con la regla marítima y su equivalente aéreo lado a lado: quién paga cada costo, dónde pasa el riesgo, documentos, trampas y notas por destino (EE. UU., UE, Japón, Reino Unido). En inglés, español, japonés y alemán, con hoja de dos páginas imprimible.',
  'en',
  'compartible',
  null,
  true, true, true, false,
  'default',
  25,
  'Incoterms® 2020 guide: sea and air side by side, who pays each cost, where risk passes, and a printable brief. Colombian Trading Company SAS · ctcexport.com',
  false,
  'Mueve el deslizador a un punto de entrega: la regla marítima y su equivalente aéreo aparecen juntas y las pestañas (quién hace qué, quién paga, riesgo y seguro, documentos, trampas, destino, las 11 reglas) siguen al deslizador. Elige el mercado de destino y el idioma arriba. «Imprimir hoja de dos páginas» arma un resumen de la selección para el comprador o el agente de carga.'
where not exists (select 1 from public.tools where id = 'incoterms');

with v as (
  insert into public.tool_versions (tool_id, numero, origen, src_publico, notas)
  select 'incoterms', 1, 'repo', '/tools/incoterms/incoterms-navigator.html',
         'Versión inicial V1 (V6.14, 2026-10-29) — archivo estático en public/tools/incoterms/; alta con el archivo ya desplegado (<sha>). Fuente: repo ctc-campana-scaj2026, entregables/incoterms-navigator/.'
  where not exists (select 1 from public.tool_versions where tool_id = 'incoterms' and numero = 1)
  returning id
)
update public.tools t set version_publicada = v.id from v where t.id = 'incoterms' and t.version_publicada is null;

commit;
