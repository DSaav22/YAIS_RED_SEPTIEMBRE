# Auditoría de recursos 3D/2D — qué tenemos, qué se ve y qué no

Fecha: 2026-09-18. Rama `main`, árbol de trabajo con cambios sin commitear.

Método: inventario de `assets/` por tamaño real en disco, lectura de
`scripts/sync-runtime-assets.mjs`, y cruce con los usos reales de
`WORLD_ASSETS`, `PROP_ASSETS` y `CHARACTERS` en todo `app/src`.

**Alcance de lo verificado.** Todo lo que sigue sale de leer archivos y medir
bytes. **No se ejecutó `npm run verify`, ni el build, ni se midió una carga
real en navegador** (Constitución IX: no declaro verde lo que no corrí). Los
pesos son de los archivos fuente que la allowlist copia sin transformar, así
que coinciden con lo servido byte a byte, pero **no son el peso transferido**:
no se midió si el servidor aplica compresión.

---

## 0. Respuesta corta

| Pregunta | Respuesta medida |
| --- | --- |
| Recursos sincronizados al runtime | 27 archivos, 24 968 354 B = **23,81 MiB** de 25 MiB |
| Recursos sincronizados que **ningún componente dibuja** | **8** (7 props + `water_tile`) |
| Peso de esos 8 | 818 356 B = **0,78 MiB** (3,28 % del techo de 25 MiB) |
| ¿Se descargan en el navegador? | **No.** Ver §3.1: matiz importante. |
| Islas del mundo sin una sola pieza de decorado | **3 de 11** — y las tres tienen encuentro de contenido |

---

## 1. Inventario real de `assets/`

### 1.1 Personajes — cuál es la versión vigente

Hay tres linajes de personajes y es fácil confundirlos.

| Carpeta | Qué es | Estado |
| --- | --- | --- |
| `assets/production/mascot/v001…v005` | Turnarounds de Capi, un GLB por iteración de diseño | **Histórico**, salvo el poster de v005 |
| `assets/production/npc/v001`, `npc/v002` | Turnarounds de los cuatro NPC | **Histórico**, salvo cuatro posters |
| `assets/production/animated/v001` | GLB con los 5 clips. Fuente de arte aprobada | **Fuente canónica. No se sirve** |
| `assets/production/animated/v002` | Variante optimizada de v001 (KHR_mesh_quantization) | **Vigente: es lo que se sirve** |

GLB animados, v001 (fuente) frente a v002 (servida):

| Personaje | Modelo | v001 | v002 | Ahorro |
| --- | --- | --- | --- | --- |
| Capi | `mascot.glb` | 16 412 600 B (15,65 MiB) | 8 523 400 B (8,13 MiB) | −48 % |
| Luna | `child_wheelchair.glb` | 5 737 816 B | 3 159 812 B | −45 % |
| Beto | `community_guide.glb` | 4 326 248 B | 2 400 224 B | −45 % |
| Clara | `educator.glb` | 2 607 540 B | 1 465 556 B | −44 % |
| Tomi | `child_explorer.glb` | 2 049 840 B | 1 154 572 B | −44 % |
| **Total** | | **31 134 044 B (29,69 MiB)** | **16 703 564 B (15,93 MiB)** | **−46 %** |

La cadena v001 → v002 la verifica el propio script por sha256 en las dos
direcciones (`sha256` del archivo servido y `source_sha256` contra el
manifiesto de v001). Eso sí está implementado y es una buena garantía: el arte
no puede cambiar sin que la sincronización falle.

Posters servidos (PNG, uno por personaje): Capi desde `mascot/v005`, Tomi desde
`npc/v001`, Luna/Clara/Beto desde `npc/v002`. **Tomi es el único que sigue
tomando el poster de `v001`** porque `npc/v002/` no trae `child_explorer/`.
No es un error, pero es una asimetría no documentada.

### 1.2 Mundo — `assets/production/world/v001/` (23 GLB)

| GLB | Bytes | ¿En la allowlist? | ¿Se dibuja? |
| --- | --- | --- | --- |
| `island_large` | 1 448 024 | Sí | **Sí** (11 islas + 5 piedras de paso) |
| `palm` | 857 144 | Sí | **Sí** (6) |
| `lighthouse` | 845 640 | Sí | **Sí** (3) |
| `tree_round` | 658 944 | Sí | **Sí** (9) |
| `water_tile` | 302 948 | Sí | **No** |
| `path_straight` | 302 432 | Sí | **Sí** (4) |
| `bridge_straight` | 178 496 | Sí | **Sí** (20 tableros, 2 por puente) |
| `bench` | 55 044 | Sí | **Sí** (5) |
| `cloud` | 53 788 | Sí | **Sí** (10) |
| `island_small` | 1 264 660 | No | — |
| `house` | 758 208 | No | — |
| `bridge_curved` | 317 136 | No | — |
| `path_corner` | 299 472 | No | — |
| `grass_tile` | 296 688 | No | — |
| `flower_bush` | 144 700 | No | — |
| `fence_wood` | 69 248 | No | — |
| `fence_rope` | 68 568 | No | — |
| `stairs_three` | 15 652 | No | — |
| `rock_large` | 11 260 | No | — |
| `rock_small` | 11 268 | No | — |

Además `architecture.png` (1,01 MiB) y `environment.png` (1,77 MiB), que son
láminas de referencia, no recursos de runtime.

### 1.3 Props — `assets/production/props/v001/` (19 GLB)

Sincronizados (7): `compass` 104 620, `speech_bubble` 81 268, `card_sun` 52 252,
`card_leaf` 21 172, `card_cloud` 34 732, `pause_button` 31 400,
`sound_button` 189 964. **Total 515 408 B = 0,49 MiB.**

No sincronizados (12): `backpack` 335 000, `recycling_bin` 116 864,
`sealed_envelope` 105 224, `folded_map` 91 868, `water_bottle` 71 128,
`gift_box` 67 924, `circle_of_three` 67 740, `seedling` 56 928,
`heart_token` 56 856, `water_drop` 34 864, `puzzle_blue/red/yellow` ~18 290 c/u.

### 1.4 Referencia y concepto — no son runtime

`assets/references-3d/` (22 PNG, ~48 MiB) y `assets/concepts/` (10 archivos,
~15,7 MiB) son láminas de dirección de arte. **Ninguna entra en la allowlist y
ninguna debería.** `assets/generated/isla-acuerdos-blockout*.glb` tampoco se
sirve. Correcto.

---

## 2. Qué llega de verdad a `app/public/assets/`

27 archivos. Medido, no estimado:

| Grupo | Archivos | Bytes | MiB | % del techo |
| --- | --- | --- | --- | --- |
| GLB de personajes (v002) | 5 | 16 703 564 | 15,93 | 63,7 % |
| Posters PNG | 5 | 3 046 922 | 2,91 | 11,6 % |
| Mundo | 9 | 4 702 460 | 4,49 | 17,9 % |
| Props | 7 | 515 408 | 0,49 | 2,0 % |
| **Total** | **27** | **24 968 354** | **23,81** | **95,2 %** |

Queda **1,19 MiB de margen** (1 240 246 B). Capi solo es el 34 % de todo el
paquete de aula.

Confirmado que `app/public/assets/` en disco coincide exactamente con la
allowlist: 5 carpetas de personaje, 9 de mundo, 7 de props.

---

## 3. Qué se dibuja de verdad

Única fuente de rutas: `app/src/shared/assets.ts`. **Se verificó que no hay ni
una ruta literal de `.glb` o `.png` dispersa por el código.** Las dos únicas
apariciones de nombres de archivo en `app/src` son comentarios que citan
láminas de concepto (`Decisiones.tsx:12`, `mundo.ts:11`). Esa regla de
AGENTS.md se está cumpliendo.

| Registro | Dónde se consume de verdad |
| --- | --- |
| `CHARACTERS` | `Character.tsx` (`useGLTF` del modelo), `ui/Personaje.tsx` (poster 2D) |
| `WORLD_ASSETS` | **Solo** `IslandScene.tsx` |
| `PROP_ASSETS` | **Ningún componente.** Solo `shared/assets.test.ts` |
| `PRELOADED_CHARACTER_IDS` | `EpisodioEnCurso`, `estado-de-escena`, `encuentros-del-mundo`, `ui/Personaje` |

### 3.1 Matiz importante sobre los 7 props

El dato de partida decía que los props «se descargan pero no se renderizan».
La mitad es exacta y la otra conviene precisarla, porque cambia la urgencia:

- **No los renderiza nadie**: confirmado. `PROP_ASSETS` no aparece en ningún
  `.tsx`. Solo lo importa `shared/assets.test.ts`.
- **No se descargan en el navegador**: no hay ninguna llamada a
  `useGLTF.preload` ni a `<Preload>` en todo `app/src` (las únicas cuatro
  llamadas a `useGLTF` están en `Character.tsx` y `IslandScene.tsx`). Un
  archivo bajo `public/` solo viaja por la red si alguien lo pide. Nadie lo
  pide.

Conclusión honesta: los 7 props **no cuestan ancho de banda al aula hoy**.
Cuestan 0,49 MiB de artefacto de despliegue y **el 2 % del presupuesto
declarado**, que es el número que el script vigila. El coste real es de
inventario y de credibilidad del presupuesto, no de carga en clase.

`water_tile` (0,29 MiB) está en el mismo caso.

### 3.2 El mar no existe como geometría

El agua es un color de fondo CSS: `.escena { background-color: var(--color-cielo) }`
en `app/src/shared/styles/juego.css:325`, con el `<Canvas>` transparente
encima. `GameCanvas.tsx` no declara ni `scene.background`, ni niebla, ni plano
de agua; solo dos luces (`hemisphereLight`, `directionalLight`). Cielo y mar
son literalmente el mismo color, lo que borra la línea de horizonte. Esa es una
causa directa de la sensación de «veo muy pocos objetos»: no hay suelo visual
bajo las islas.

### 3.3 Cuánto hay realmente en pantalla

`IslandScene.tsx` monta: 11 islas + 5 piedras de paso + 20 tableros de puente
+ 37 piezas de `PIEZAS` = **73 instancias de 8 modelos distintos**.

Reparto de las 37 piezas por isla (`mundo.ts` declara 11 islas y 10 puentes):

| Isla | Piezas | ¿Tiene contenido? |
| --- | --- | --- |
| isla-partida | 7 | — |
| isla-faro | 3 | encuentro `enc-tomi-faro` |
| isla-palmeras | 3 | encuentro `enc-luna-palmeras` |
| isla-acuerdos | 4 | episodio 1 |
| isla-circulo | 4 | episodio 2 |
| isla-piedra | 2 | — |
| isla-nube | 2 | — |
| isla-jardin | 2 | — |
| **isla-mirador** | **0** | **tiene encuentro** |
| **isla-caleta** | **0** | **tiene encuentro** |
| **isla-arenal** | **0** | **tiene encuentro** |
| (cielo) | 10 nubes | — |

Las tres islas completamente peladas son exactamente tres de las cinco que
`content/encuentros/isla-encuentros.json` usa como escenario de conversación.
Quien camine hasta allí a hablar con alguien llega a un disco de césped vacío.

### 3.4 `environment` no cambia nada en pantalla

`IslandScene.tsx` define un mecanismo `dependeDe` para ocultar piezas según el
estado de `environment`, con función `seMuestra()` incluida. **Ninguna de las
37 piezas lo declara** (0 ocurrencias de `dependeDe:`). Es decir: el episodio 1
dice `bridge_main: "broken"` en 5 escenas, `lighthouse: "off"` en la escena de
llegada y `fence: "fallen"` en otra, y el mundo se ve idéntico en todos los
casos. El puente roto que el guion pide arreglar aparece entero desde el primer
segundo.

---

## 4. Recurso por recurso: ¿ya, más adelante, o fuera?

### 4.1 Sincronizados y sin usar

| Recurso | Bytes | Veredicto | Dónde/cuándo |
| --- | --- | --- | --- |
| `water_tile` | 302 948 | **Ya** | `IslandScene.tsx`, como plano bajo las islas. Es lo único que separa cielo de mar. Instanciarlo en malla es caro; alternativa más barata en §6. |
| `speech_bubble` | 81 268 | **Ya, si se quiere** | Marcador de «aquí hay alguien con quien hablar» sobre los NPC de encuentro. Hoy ese papel lo hace `SenalDeMision.tsx` en 2D. Si la señal 2D basta, **el GLB sobra**. |
| `compass` | 104 620 | **Más adelante** | El contenido lo pide como HUD: `globalUi.bodyCompassHud` con `unlockedBy: "s02_brujula"` y estados `calm/unsure/uhoh`. Es un HUD, y un HUD se dibuja en 2D. **No hay tarea `T-001-*` que lo implemente.** |
| `card_sun`, `card_leaf`, `card_cloud` | 108 156 | **Más adelante** | Son las tres tarjetas de `s02`. El contenido las expone como `icon: icon_sun / icon_cloud / icon_drop_alert`, y esos iconos **ya existen en 2D** (`ui/icons.tsx`). Los GLB solo harían falta si las tarjetas pasan a ser objetos del mundo. Ninguna tarea lo pide. |
| `pause_button`, `sound_button` | 221 364 | **No debería sincronizarse** | La pausa ya está implementada en HTML (`EpisodioEnCurso.tsx:212`, desde `globalUi.pause`). Un botón de UI en GLB contradice la ruta 2D accesible. `sound_button` es además el prop más pesado de los siete y no hay audio en el producto. |

**Total sincronizado y sin dibujar: 818 356 B = 0,78 MiB.**

Recomendación mínima y defendible: sacar de la allowlist `pause_button` y
`sound_button` (221 364 B). Son los dos únicos cuyo destino natural es
claramente 2D, no 3D. Eso deja el paquete en 23,60 MiB y el margen en 1,40 MiB.

### 4.2 Existen, no se sincronizan, y el contenido los pide

| Recurso disponible | Pedido por | Bytes | Veredicto |
| --- | --- | --- | --- |
| `fence_wood` / `fence_rope` | ep01 `fence: "fallen"`, ep02 `fence: "ok"` | 69 248 / 68 568 | **Ya.** Es el recurso más barato que cierra una brecha real de guion. |
| `house` | ep02 `environment: ["house"]`, escena `house: "far"` | 758 208 | Más adelante (SPEC-001 no lleva el ep02 a 3D) |
| `rock_small` / `rock_large` | `mundo.ts` dibuja las piedras de paso con `island_large` escalado porque «el kit no trae una roca suelta» | 11 268 / 11 260 | **El comentario del código es incorrecto: las rocas existen.** Cambiarlas cuesta 22 KiB y mejora 5 piedras de paso. |
| `path_corner`, `bridge_curved`, `stairs_three`, `flower_bush`, `grass_tile`, `island_small` | Nadie los pide explícitamente | — | Más adelante / no sincronizar |
| `backpack`, `folded_map`, `circle_of_three` | `props` de ep01/ep02 (`backpack`, `map`, `three_cards`) | 335 000 / 91 868 / 67 740 | Más adelante: el `props` del contenido es una lista declarativa y no hay lógica que la consuma |

### 4.3 Recursos de otras specs

`specs/` solo contiene `001-juego-episodio-1` y `002-panel-facilitador`. **No
existen SPEC-003 ni SPEC-004.** SPEC-002 es el panel del facilitador y no
consume arte 3D. Por tanto **no hay ninguna tarea planificada, en ninguna
spec, que use los 7 props.** Su justificación es una sola línea de
`plan.md:85` («Props mínimos: brújula, burbuja, tarjetas, pausa y sonido desde
`props/v001`») y una línea de `tasks.md:36`. Ninguna tarea posterior los
retoma, y ningún criterio de aceptación los menciona.

---

## 5. Contenido que referencia recursos inexistentes

| Referencia | Ocurrencias | ¿Hay recurso? | Efecto |
| --- | --- | --- | --- |
| `vo/es-BO/*.ogg` | **76 en ep01**, 0 en ep02 | **No existe un solo `.ogg` en el repo** | Ninguno: el campo `audio` está en el esquema (`engine/schema.ts:175`) pero nada lo reproduce. Es contenido muerto, declarado y honesto (`LineaDeDialogo.tsx:12` lo dice). |
| `icon_*` (23 distintos) | ~50 | **Sí, los 23** | **Ninguna brecha.** `ui/icons.tsx` define exactamente los 23 iconos que el contenido usa, ni uno de más ni uno de menos. Verificado por comparación de conjuntos. |
| `bridge_main` | 5 escenas ep01 | Geometría sí, **estado no** | El puente se ve entero aunque el guion lo declare roto |
| `lighthouse: "off"` | 1 escena ep01 | Geometría sí, **estado no** | El faro se ve igual encendido que apagado |
| `fence` | ep01 + ep02 | **GLB existe, sin sincronizar** | Elemento del guion invisible |
| `bridge_small` | 1 escena ep01 | Se dibuja con `bridge_straight` | Sin distinción visual |
| `path_stones`, `garden`, `circle_plaza`, `small_bridge`, `house` | ep02 | **Ninguno tiene recurso asignado** | El ep02 se juega sin su escenario |
| `props: ["backpack","map","three_cards","pause_sound"]` | ep01/ep02 | Parcial | Lista declarativa que ningún código lee |

Resumen de §5: de los **11 elementos de `environment` que declara ep01**, la
mayoría tiene geometría en pantalla (`island_large`, `path`, `bridge_main`,
`bench`, `palm`, `tree`, `cloud`, `lighthouse`), **`water` y `fence` no**, y
**ningún estado de ninguno se representa**. De los **6 de ep02, cero** tienen
representación.

---

## 6. Recomendación priorizada

Ordenada por mejora visible ÷ coste. Los pesos son los reales medidos.

| # | Acción | Coste en MiB | Coste en trabajo | Qué se gana |
| --- | --- | --- | --- | --- |
| 1 | **Dar color propio al mar.** Hoy `.escena` usa `--color-cielo` para todo. Un degradado CSS o un `scene.background` distinto bajo el horizonte separa cielo de agua. | **0** | Una línea de CSS | Es el cambio de mayor relación mejora/coste del informe. Sin horizonte, 11 islas parecen flotar en la nada. |
| 2 | **Poblar isla-mirador, isla-caleta e isla-arenal.** Las tres están a cero piezas y las tres alojan un encuentro. Reusan modelos ya sincronizados: es añadir filas a `PIEZAS`. | **0** | ~12 filas de datos | Tres destinos dejan de ser un disco de césped vacío, justo donde el jugador va a hablar con alguien. |
| 3 | **Sustituir las piedras de paso por `rock_small`/`rock_large`.** El comentario de `mundo.ts` dice que el kit no trae rocas; sí las trae. | **+0,02** | Bajo | 5 elementos dejan de ser islas en miniatura y pasan a ser rocas. |
| 4 | **Sincronizar y colocar `fence_wood`/`fence_rope`.** Es el único elemento de `environment` de ep01 con GLB listo y sin sincronizar. | **+0,13** | Bajo | Cierra una brecha guion↔pantalla concreta: `fence: "fallen"` deja de ser invisible. |
| 5 | **Usar `dependeDe`, que ya está implementado y sin estrenar.** Declararlo al menos en el puente principal y en el faro. | **0** | Bajo | El puente roto se ve roto. Hoy el decorado contradice al guion en 6 escenas de ep01. |
| 6 | **Sacar `pause_button` y `sound_button` de la allowlist.** | **−0,21** | Trivial | Recupera 0,21 MiB y elimina dos recursos cuyo destino correcto es 2D. |
| 7 | **Decidir `water_tile`: usarlo o sacarlo.** Si el punto 1 resuelve el mar, el GLB no aporta y libera 0,29 MiB. Si se quiere agua con volumen, es el modelo indicado. | 0 o −0,29 | Media si se usa | Deja de ser un recurso en limbo. |
| 8 | **Decidir los 5 props restantes con fecha, no con intención.** `compass` tiene destino claro (HUD 2D de `bodyCompassHud`); las 3 tarjetas ya tienen icono 2D; `speech_bubble` compite con `SenalDeMision`. | hasta −0,29 | Decisión, no código | Si no hay tarea que los use, sacarlos y volver a meterlos cuando la haya es más honesto que dejarlos ocupando presupuesto. |

Nota sobre el orden: los tres primeros puntos **no cuestan un solo byte de
presupuesto** y son los que más cambian lo que se ve. La sensación de mundo
vacío no viene de que falten modelos: viene de que 3 de 11 islas están sin
poblar, de que no hay horizonte, y de que el mundo no reacciona al guion.

---

## 7. Lo que esta auditoría NO verificó

- No se ejecutó `npm run verify`, `npm run build` ni `npm run dev`.
- No se midió el tiempo de carga real ni los FPS en hardware de aula.
- No se abrió ningún GLB para comprobar triángulos, materiales o clips: los
  clips se dan por buenos según lo que declara `shared/assets.ts`.
- No se comprobó si el servidor de despliegue comprime los `.glb`.
- `app/src/game/scene/` tiene cambios sin commitear de varios agentes en
  paralelo; el análisis refleja el árbol de trabajo del 2026-09-18, no `HEAD`.
