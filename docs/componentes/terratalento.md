# Charter · `terratalento` — Terratalento (en `plataforma`, preparado para separarse)

> **Estado (owner, 2026-09-12): sin grupo ni kick-off propios durante los próximos ~6 meses.** Se
> gestiona desde la vía `plataforma`/`consolas` — hoy solo **retroalimentación y comunicación**. Este
> charter existe para que la separación, cuando llegue, sea crear el grupo «Terratalento» y añadir la
> clave a `build_kickoff.py`: todo lo demás ya está aquí.

## Qué es

La superficie del **recolector** (`terratalento.ctcexport.com`, V2.35–V2.36, 2026-08-02): un recolector
arma su perfil, se declara disponible y **se postula** a las **jornadas de recolecta** que las fincas de
Kaffetal Regal publican; CTC **confirma** desde el ECP y **conecta a las partes** — nunca es empleador.
La finca ve solo conteos y, tras la confirmación, nombre y celular de los confirmados (decisión 5.1 del
plan V2); el acuerdo queda por escrito en una **constancia** imprimible que dice explícitamente que CTC
conecta (decisión 5.2) — no puede llamarse contrato ni obligar a nada laboral.

Desde V5.16 el panel del productor **ya no tiene el módulo de Jornadas**: la tarjeta de Terratalento en el
Ecosistema está en gris («En desarrollo para el Ecosistema») y solo recoge **interés** — ése es el canal de
retroalimentación que hoy se atiende.

## Superficies y rutas

| Ruta | Qué |
|---|---|
| `/terratalento` (+ `/terratalento/auth`) | landing + app del recolector (`TerratalentoExperience`, `JornadaCard`) |
| `/ecp/terratalento` | el tablero de CTC: jornadas, postulaciones, confirmación, constancia (`ConstanciaButton`), interés |
| KR · Ecosistema | la tarjeta gris con el composer de interés (`producer_comm_log`, `context_label: "Terratalento · interés"`) |

## Mapa de código

`src/app/terratalento/`, `src/components/terratalento/{TerratalentoExperience,JornadaCard}.tsx` +
`terratalento.module.css`, `src/lib/terratalento/{actions,constanciaPrint,interesActions,terminos}.ts`
(`cargarTerratalento`, `guardarPerfilRecolector`, `setDisponibleRecolector`, `postularJornada`,
`retirarPostulacion`, `miConstancia`, `misJornadasRecolecta`, `crearJornadaRecolecta`, `cerrarJornadaRecolecta`;
`registrarInteresTerratalento`, `marcarInteresTtContactado`), `src/app/ecp/(app)/terratalento/`, el correo del
llamado (`qa-llamado-email-check`). Plan abierto: `docs/TERRATALENTO_V2_PLAN.md` (§5.1 y §5.2 resueltas; §5.3
—datos sensibles, EPS— por defecto sin pedir hasta que exista política de privacidad).

## Tablas que posee

`terratalento_recolectores` · `terratalento_jornadas` · `terratalento_postulaciones` · `terratalento_interes`.
Solo lee: `profiles`, `fincas` (nombre para la jornada), `producer_comm_log` (interés desde KR).

## Guardianes

`qa-llamado-email-check.mjs` (el correo del llamado es un builder puro) · `qa-terminos-check.mjs` (los
términos de una jornada, módulo puro).

## Reglas propias

- **CTC conecta, no emplea**: ningún texto de la superficie ni de la constancia puede afirmar relación
  laboral (prestaciones, ARL, exclusividad) ni llamarse «contrato».
- El productor ve **conteos**; nombre y celular **solo de confirmados**; postulados y descartados invisibles.
- **EPS y contacto de emergencia**: contacto de emergencia y medio de pago sí; EPS solo cuando exista la
  política de privacidad (Ley 1581), con aviso explícito.

## Lo que las consolas gobiernan de este componente

**ECP · Terratalento** lo es todo: confirmar/descartar postulaciones, cerrar jornadas, emitir la constancia,
marcar el interés como contactado. **Hoy la tarea es solo ésa**: leer el interés que llega desde KR y
responder.

## Pendientes

- Nada que construir en seis meses (owner). Mantener: responder el interés desde el ECP.
- Al separar: grupo «Terratalento» en la barra lateral, clave en `build_kickoff.py`, guardián propio, y
  retomar `TERRATALENTO_V2_PLAN.md` §4 (tableros, Google login, información contractual).
- La política de privacidad de la red (transversal) desbloquea §5.3.

## Kick-off

```
(No se usa mientras Terratalento viva dentro de «plataforma». Cuando se separe, copiar la plantilla de
REFURBISH_PLAN.md §5 con clave terratalento y añadirla a build_kickoff.py.)
```
