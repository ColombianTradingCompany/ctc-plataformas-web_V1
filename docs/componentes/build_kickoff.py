# -*- coding: utf-8 -*-
# Paso 3.8: docs/KICKOFF.md se COMPILA desde la sección «## Kick-off» de cada charter.
# Volver a correrlo tras editar un charter; el compendio nunca se edita a mano.
import io, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # docs/
ORDEN = [
 ('consolas', 'CTC Consolas internas', 'CTC Consolas internas',
  'Cerrar el pendiente más barato con dueño: la línea de `WorkersBadge.tsx` que manda al operador a una carpeta que ya no existe (sube versión); y preparar al owner las cinco decisiones del PVC (`docs/PVC_BCP_PLAN.md` §8) en una sola pantalla.'),
 ('herramientas-internas', 'Herramientas Internas', 'Herramientas Internas',
  'Elegir la herramienta de la sesión. Stripe: los cuatro pasos abiertos (país de la entidad · claves sandbox · OAuth del MCP · la tanda de pagos a productores). PVC: nada hasta §8. Transcriptor: la credencial estrecha.'),
 ('biblia', 'La Biblia del Café', 'Biblia del Café',
  'Leer `docs/HANDOFF_V1.md` de la app, añadir el lanzador `biblia-taller` (puerto 3019) a `C:\\dev\\ctc-platforms\\.claude\\launch.json`, y componer la siguiente sección del spine contra los dos contratos de estilo.'),
 ('kaffetal-regal', 'Kaffetal Regal', 'Kaffetal Regal',
  'Recorrer el bloque B del artefacto de revisión sobre el panel nuevo (B3/B4 primero) y convertir cada «Fix» en una tanda; después, estrenar el escáner visual con un soporte real.'),
 ('cherry-picked', 'Cherry Picked', 'Cherry Picked',
  'Preparar la primera subasta real (recorrer `/cherry-picked-green` con una cuenta Pintón contra una subasta abierta por el OCP en pruebas) y revisar la ficha pública y la cinta con el primer lote publicado.'),
 ('herramientas-cafe', 'Herramientas del Café', 'Herramientas del Café',
  'Elegir la herramienta de la sesión. Candidatas: Defectos del Café (línea del puente → `soporta_memoria`, fotogramas de tostado, conmutador de fondo); migrar el comodín `tools_plus_grants` a permisos por persona.'),
 ('coffeed', 'Coffeed', 'Coffeed',
  'La primera generación REAL de Redacción con las claves de producción (`docs/CLAVES_IA_Y_COSTE.md`), y dejar el evento `coffeed.redaccion.post_creado` listo para el escenario de Make del owner.'),
 ('directorio', 'Directorio del Café', 'Directorio del Café',
  'Comprobar con `curl -I` que `directoriodelcafe.ctcexport.com` sirve con TLS, y escribir el guardián propio `qa-directorio-check.mjs` (ciclo de verificación de certificados + insignia pública + búsqueda sin tildes).'),
 ('ctc-tech', 'CTC Tech', 'CTC Tech',
  'El guardián ligero de leads compartido (`qa-leads-check.mjs`: listas blancas por pilar + aprovisionamiento), y el contenido real de la landing con el owner.'),
 ('varietales', 'Varietales Registrados', 'Varietales Registrados',
  'Lo mismo que CTC Tech para el pilar `varietales`, y definir con el owner el catálogo real de plántulas (hoy la landing recoge interés, no vende).'),
]

def kickoff_de(clave):
    s = io.open(os.path.join(R, 'componentes', clave + '.md'), encoding='utf-8').read()
    m = re.search(r'## Kick-off\s*```\n(.*?)```', s, flags=re.S)
    assert m, 'sin bloque Kick-off: ' + clave
    return m.group(1).rstrip('\n')

out = ['# KICKOFF · los prompts de arranque, uno por componente', '',
 '**Generado desde la sección «Kick-off» de cada charter** (`docs/componentes/<clave>.md`) por',
 '`python docs/componentes/build_kickoff.py`; si un charter cambia su kick-off, se vuelve a compilar — este archivo no se edita a mano.',
 'Escrito el 2026-09-11 como entregable del paso 3.8 de `REFURBISH_PLAN.md`.', '',
 '## Cómo se arranca una sesión', '',
 '1. **Abrir Claude Code en `C:\\dev\\ctc-platforms\\ctc-platform`** (para CommaaS, en `C:\\dev\\commaas-hub\\commaas`).',
 '   Nunca en la carpeta vieja de OneDrive: la memoria de Claude va atada a la carpeta.',
 '2. **Filar la conversación en el grupo de la barra lateral** que lleva el nombre del componente (ya existen los diez).',
 '3. **Pegar el prompt** del componente y sustituir `<la tarea>` (y `<nombre>`/`<id>` en las herramientas).',
 '4. Al cerrar la tanda, la sesión deja el charter con sus «Pendientes» al día y, si el cambio alcanza a otro',
 '   componente, una línea en `docs/ALINEACION.md` §3. La siguiente sesión de ese componente empieza leyendo eso.',
 '', 'Regla de oro: **una conversación = un componente**. Si la tarea cruza dos, se arranca en el que la ORIGINA',
 '(la consola, casi siempre) y el otro recibe un pendiente con dueño.', '',
 '## Índice', '', '| Componente | Grupo de la barra lateral | Charter |', '|---|---|---|']
for clave, nombre, grupo, _ in ORDEN:
    out.append(f'| {nombre} | {grupo} | `docs/componentes/{clave}.md` |')
out += ['| Plataforma (lo transversal: CTC Home, proxy, SEO, auth, socios, Terratalento) | CTC Consolas internas | `docs/HANDOFF.md` + `docs/ALINEACION.md` |',
        '| CommaaS (hub + tenants) | CommaaS | `C:\\dev\\commaas-hub\\commaas\\docs\\HANDOFF.md` |', '']

for clave, nombre, grupo, primera in ORDEN:
    out += [f'## {nombre}  ·  `{clave}`', '', f'**Grupo:** {grupo} · **Charter:** `docs/componentes/{clave}.md`', '',
            '```', kickoff_de(clave), '```', '', f'**Sugerencia de primera tarea:** {primera}', '']

out += ['## Plataforma (lo transversal)  ·  `plataforma`', '',
 '**Grupo:** CTC Consolas internas (no tiene grupo propio: es el backstage del backstage) · **Charter:** `docs/HANDOFF.md` + `docs/ALINEACION.md`', '',
 '```', 'Trabajas en lo TRANSVERSAL de la plataforma CTC (clave: plataforma) — lo que no es de ningún componente:',
 'CTC Home (/), src/proxy.ts y la red de subdominios, SEO/Open Graph/JSON-LD/sitemap, la auth compartida y',
 '«Recuperar acceso», los cinco nodos socio, Terratalento, version.ts, los guardianes transversales',
 '(repo C:\\dev\\ctc-platforms\\ctc-platform, rama main). Antes de tocar nada lee, en este orden:',
 '1. docs/ALINEACION.md   ← ERES el dueño de sus contratos (§1): cambiar uno exige avisar a todos los componentes que lo leen',
 '2. docs/HANDOFF.md      ← la arquitectura transversal y los gotchas',
 '3. AGENTS.md            ← la compuerta y las reglas de la casa',
 'Todo cambio aquí PERMEA: cada tanda deja su línea en el §3 con los componentes afectados, y verifica en',
 'las superficies que tocan el contrato (una superficie nueva = una línea en subdominios.ts + DNS a mano).',
 'Al terminar: compuerta completa (incl. qa-rutas-consolas, qa-nav, qa-grados, qa-encoding, qa-guard),',
 'APP_VERSION + CHANGELOG, sello del sha, push, verificación en vivo en www y en el subdominio afectado,',
 'log de arquitectura.', 'Hoy: <la tarea>.', '```', '',
 '**Sugerencia de primera tarea:** la política de privacidad de la red (GDPR / Ley 1581, declarando a Resend como subprocesador) — la deuda transversal más vieja; y el toggle de leaked-password protection en Supabase.', '',
 '## CommaaS (hub y tenants)  ·  `commaas`', '',
 '**Grupo:** CommaaS · **Repo:** `C:\\dev\\commaas-hub\\commaas` (memoria propia `C--dev-commaas-hub`) · **Tenants pendientes:** `C:\\dev\\commaas-hub\\tenants-pendientes\\` (ver su README)', '',
 '```', 'Trabajas en el CommaaS Hub (repo C:\\dev\\commaas-hub\\commaas, rama main) — el hub personal de despliegue',
 'del owner: un proyecto de Supabase (togwpmprggfvhwwxfzlh), un esquema de Postgres por app, un proyecto de',
 'Vercel y un subdominio por app, el contrato en packages/hub-kit. Hoy la sesión es sobre <el hub | el tenant X>.',
 'Antes de tocar nada lee, en este orden:',
 '1. docs/HANDOFF.md      ← el estado real: la sección fechada 2026-08-20 es el hub; el resto, CommaaS-OG',
 '2. CLAUDE.md            ← la regla que gobierna todas: el motor es la única autoridad de cálculo, y los invariantes',
 '3. docs/HUB-PIVOT-PLAN.md y docs/CHECKLIST-DESPLIEGUE.md',
 'Los prototipos que serán tenants están en C:\\dev\\commaas-hub\\tenants-pendientes\\<app> (README allí): un porte',
 'entra como esquema propio + app en apps/ + grant en hub.grants; la carpeta original pasa a C:\\dev\\_archive',
 'solo cuando el porte esté verificado en el hub. NUNCA apuntes nada al proyecto de Supabase de CTC',
 '(sjznkzvefqfcysczllli). El único punto de contacto con CTC es la identidad (una cuenta) y el CV App',
 'Manager extraído del BCP; si tocas eso, avisa en docs/ALINEACION.md del repo de CTC.',
 'Al terminar: tsc · eslint · build · las suites del motor y de RLS · commit con rutas explícitas · push · y el',
 'HANDOFF del hub al día.', 'Hoy: <la tarea>.', '```', '',
 '**Sugerencia de primera tarea:** el paso 3.7 del plan de CTC — escribir `commaas/docs/ALINEACION.md` (el gemelo: contratos entre hub y tenants + índice de tenants) y actualizar el HANDOFF del hub con la carpeta `tenants-pendientes`.', '']

io.open(os.path.join(R, 'KICKOFF.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out).rstrip() + '\n')
print('KICKOFF.md:', len(out), 'líneas ·', len(ORDEN) + 2, 'prompts')
