# Mapa de animaciones — Episodio 1 «Saludo que puedo elegir»

Fecha: 2026-09-17.

Este documento es la versión legible para dirección de arte de
`app/src/shared/animation-intents.ts` (T-001-06, PLAN-001, sección
«Contratos»). Es un mapa **temporal**: el guion de
`content/episodes/ep01-saludo.json` pide **61 intenciones de animación
distintas** y cada personaje solo tiene **cinco clips** grabados (`Idle`,
`Walk` o `Roll`, `Wave`, `Listen`, `TalkGesture`; ver
`assets/production/animated/v001/manifest.json`). No hay más rig todavía. El
código nunca inventa un clip por parecido de nombre: cada intención tiene
aquí una entrada explícita y, en el código, una marca honesta de fidelidad
(Constitución IX — «Honestidad sobre el estado»).

**Varias escenas se van a ver aproximadas hasta que exista más rig.** Este
documento no promete cuadros por segundo ni calidad visual: eso no se ha
medido todavía (T-001-06 mide rendimiento aparte). Lo único que garantiza es
que ningún personaje reproduce un clip que no tiene, y que nunca se finge
una animación que no existe.

## Cómo leer la tabla

- **Clip asignado**: uno de `Idle`, `Wave`, `Listen`, `TalkGesture`, o
  **Locomoción** (se resuelve a `Walk` para Capi/Tomi/Clara/Beto y a `Roll`
  para Luna; Luna no tiene `Walk`).
- **Fidelidad**:
  - `aproximado` — el clip disponible representa razonablemente la
    intención original del guion.
  - `fallback` — no existe nada parecido entre los cinco clips; se usa el
    clip disponible más neutral como relleno honesto, no como actuación
    real del gesto pedido.
- **Dónde aparece** — escena(s) y personaje(s) del guion que usan esa
  intención, para ubicarla sin repetir ninguna línea de diálogo.
- **Qué haría falta para hacerlo bien** — qué tipo de clip nuevo resolvería
  la aproximación, para priorizar encargos de animación futuros.

## Resumen honesto

De las 61 intenciones del guion, **59 son fijas** y **2 son dinámicas**
(dependen de qué saludo eligió quien juega, no de un nombre fijo):

| Categoría | Cantidad |
| --- | ---: |
| Intenciones fijas — `aproximado` | 19 |
| Intenciones fijas — `fallback` | 40 |
| Intenciones dinámicas (`greet_from_session:*`) | 2 |

Las 2 dinámicas resuelven a `Wave` cuando la persona jugadora eligió saludar
con la mano o a distancia (`aproximado`, igual que `greet_wave`/
`greet_distance`), a `Wave` también si eligió choque de puños, choque de
manos o abrazo (`fallback`, porque no hay clip de contacto), o a `Idle` si no
hay un valor de sesión reconocido. Por eso no se suman a las dos columnas de
arriba como un número fijo: su fidelidad depende de la elección real de cada
sesión de juego, y esa elección nunca se persiste (Constitución I,
`persistChoices: false`).

**En corto: menos de un tercio de las intenciones fijas (19 de 59) tienen un
clip que de verdad las representa.** El resto son rellenos honestos, no
actuación real del gesto pedido por el guion.

## Escenas más afectadas

- **`s02_brujula`** (la brújula del cuerpo) y **`s06_adultos`** (Don Beto y
  la profe Clara) son las más aproximadas: casi todos sus gestos son toques
  a una parte del cuerpo o de un objeto (`touch_belly_cheeks`,
  `hold_compass`, `give_compass`, `place_compass_hud`, `cap_on_smile`,
  `step_back_hand_chest`, `crouch_eye_level`), y ninguno de esos gestos
  existe en los cinco clips grabados.
- **`s04_tomi`** tiene la mayor variedad de gestos físicos concretos
  (`run_open_arms`, `raise_hand_soft`, `scratch_head_smile`,
  `raise_both_hands`, `lower_hands_smile`, `shrug_happy`): todos caen a
  `TalkGesture` o `Wave` como relleno.
- **`s03_saludo_capi`**, **`s04_tomi`** y **`s06_adultos`** comparten el
  mismo límite de fondo: la «rueda de saludos» ofrece abrazo, choque de
  puños y choque de manos, pero solo existe un clip de saludo (`Wave`) para
  las tres opciones de contacto.
- **`s07_reconstruccion`** (el cierre del episodio) depende mucho del HUD y
  los efectos de props (`compass_pulse`, `star_glow`) en vez del cuerpo, así
  que se ve más «aproximada» de lo que parece por texto: el prop hace el
  trabajo visual, no el personaje.

## Tabla completa (61 intenciones)

| Intención | Dónde aparece | Clip asignado | Fidelidad | Qué haría falta para hacerlo bien |
| --- | --- | --- | --- | --- |
| `apologize_from_distance` | s06 · Beto | TalkGesture | aproximado | — |
| `arms_half_open_no_approach` | s06 · Beto | Wave | fallback | Clip de invitar con los brazos entreabiertos, sin dar un paso. |
| `arrive_kind_firm` | s06 · Clara | TalkGesture | fallback | Clip de entrada en escena con postura firme y amable. |
| `arrive_wave_distance` | s06 · Clara | Wave | aproximado | — |
| `ask` | s03 · Capi | TalkGesture | aproximado | — |
| `calm_firm` | s05 · Luna | TalkGesture | aproximado | — |
| `cap_on_smile` | s06 · Beto | TalkGesture | fallback | Clip de tocar/ajustar la gorra. |
| `celebrate` | s07 · Capi | TalkGesture | fallback | Clip de celebración con brazos arriba. |
| `come_close` | s06 · Capi | TalkGesture | fallback | Clip de acercarse a consolar (mano en el hombro, agacharse). |
| `compass_pulse` | s07 · Capi | Idle | aproximado | — (el efecto lo lleva el HUD) |
| `cross_bridge_celebrate` | s07 · todo el elenco (recompensa) | Locomoción | fallback | Clip de caminata/rodada festiva en grupo, brazos en alto. |
| `crouch_eye_level` | s06 · Clara | Idle | fallback | Clip de agacharse a la altura de los ojos de un niño. |
| `explain` | s04 · Capi, s05 · Capi/Luna | TalkGesture | aproximado | — |
| `give_compass` | s02 · Capi | TalkGesture | fallback | Clip de extender un objeto pequeño con las dos manos. |
| `greet_distance` | s03 · Capi, s04 · Tomi | Wave | aproximado | — |
| `greet_fist_bump` | s03 · Capi, s05 · Luna | Wave | fallback | Clip de choque de puños. |
| `greet_from_session:greetBeto` | s06 · Beto (dinámica) | Wave o Idle, según sesión | ver «Resumen honesto» | Clips de contacto (abrazo, choque de puños/manos) para cada opción real. |
| `greet_from_session:greetTomi` | s04 · Tomi (dinámica) | Wave o Idle, según sesión | ver «Resumen honesto» | Igual que arriba. |
| `greet_high_five` | s03 · Capi | Wave | fallback | Clip de choque de manos en alto. |
| `greet_hug_short` | s03 · Capi | Wave | fallback | Clip de abrazo breve. |
| `greet_hug_side_short` | s06 · Beto | Wave | fallback | Clip de abrazo lateral breve. |
| `greet_wave` | s03 · Capi | Wave | aproximado | — |
| `head_tilt` | s01 · Capi | Listen | aproximado | — |
| `hold_compass` | s02 · Capi | TalkGesture | fallback | Clip de sostener y mostrar un objeto pequeño. |
| `idle` | s02 · Capi | Idle | aproximado | — (coincide literalmente) |
| `invite` | s02 · Capi, s05 · Capi | TalkGesture | aproximado | — |
| `jump` | s01 · Capi, s04 · Tomi, s05 · Capi | TalkGesture | fallback | Clip de salto de alegría. |
| `look_around` | s01 · Capi | Idle | fallback | Clip de mirar alrededor con la cabeza y el torso. |
| `look_path` | s07 · Capi | Idle | fallback | Clip de mirar hacia un punto lejano del camino. |
| `lower_hands_smile` | s04 · Tomi | TalkGesture | fallback | Clip de bajar las manos con calma tras un juego de contacto. |
| `nod` | s02, s04, s05 · Capi | Listen | aproximado | — |
| `nod_apologetic` | s06 · Beto | Listen | aproximado | Matiz de disculpa en el rostro o la postura. |
| `nod_smile` | s03 · Capi | Listen | aproximado | Sonrisa más marcada. |
| `open_arms` | s03 · Capi | Wave | fallback | Clip de brazos abiertos sin agitar la mano. |
| `open_palm_soft` | s05 · Luna | Wave | fallback | Clip de palma abierta hacia adelante (límite amable). |
| `place_compass_hud` | s02 · Capi | TalkGesture | fallback | Clip de señalar/llevar un ícono hacia el pecho o la muñeca. |
| `playful_one_step` | s06 · Beto | Locomoción | fallback | Clip de un paso juguetón puntual, no un ciclo de caminata. |
| `point_bridge` | s07 · Capi | TalkGesture | fallback | Clip de señalar con el brazo extendido. |
| `point_star` | s01 · Capi | TalkGesture | fallback | Clip de señalar hacia arriba/afuera. |
| `raise_both_hands` | s04 · Tomi | Wave | fallback | Clip de levantar ambas manos a la vez. |
| `raise_hand_soft` | s04 · Capi | Wave | fallback | Clip de mano levantada pidiendo espera (más suave que un saludo). |
| `run_open_arms` | s04 · Tomi | Locomoción | fallback | Clip de correr con los brazos abiertos; `Walk` es caminata, no carrera. |
| `scratch_head` | s02 · Capi | TalkGesture | fallback | Clip de rascarse la cabeza dudando. |
| `scratch_head_smile` | s04 · Tomi | TalkGesture | fallback | Mismo gesto anterior, con sonrisa. |
| `shrug_happy` | s04 · Tomi | TalkGesture | fallback | Clip de encogerse de hombros. |
| `sit_bench` | s01 · Capi | Idle | fallback | Clip de sentarse en el banco. |
| `small_bubble` | s04 · Capi | TalkGesture | aproximado | — |
| `smile` | s02, s04 · Capi; s06 · Clara | TalkGesture | aproximado | — (la sonrisa la lleva la emoción, no el cuerpo) |
| `smile_roll_forward` | s05 · Luna | Locomoción | fallback | Impulso corto y seguro hacia delante, no un ciclo de rodada continuo. |
| `star_glow` | s03 · Capi | Idle | aproximado | — (el brillo lo lleva el prop) |
| `step_back_hand_chest` | s06 · Beto | TalkGesture | fallback | Clip de retroceder un paso con la mano en el pecho. |
| `stop_notice` | s06 · Beto | TalkGesture | fallback | Clip de detenerse al notar la duda de otra persona. |
| `thumbs_up` | s04 · Capi, s05 · Luna | TalkGesture | fallback | Clip de pulgar arriba. |
| `tip_cap` | s06 · Beto | TalkGesture | fallback | Clip de tocar el ala del sombrero a modo de saludo. |
| `touch_backpack` | s01 · Capi | TalkGesture | fallback | Clip de tocar la propia mochila. |
| `touch_belly_cheeks` | s02 · Capi | TalkGesture | fallback | Clip de señalar panza/mejillas al describir sensaciones corporales. |
| `touch_wheel` | s05 · Luna | TalkGesture | fallback | Clip de tocar la rueda de la silla. |
| `uh_face_soft` | s02 · Capi | TalkGesture | fallback | Expresión facial de duda; el cuerpo no tiene un gesto dedicado. |
| `walk_with_player` | s06 · Capi | Locomoción | aproximado | — (es literalmente caminar) |
| `wave` | s01, s07 · Capi | Wave | aproximado | — |
| `wave_turn_chair` | s05 · Luna | Wave | fallback | Clip de girar la silla mientras saluda. |

## Qué no cambia con este mapa

- No se retocan los modelos ni los `.glb` fuente: este mapa solo decide qué
  clip existente reproduce cada intención.
- No hay animación de "respuesta incorrecta": todas las asignaciones aquí
  son de gesto o de tono, nunca de puntaje ni de acierto/error.
- El mapa se versiona junto con el código. Si se graban más clips en una
  versión futura (`v002` de `assets/production/animated/`), este documento y
  `app/src/shared/animation-intents.ts` deben actualizarse juntos.
