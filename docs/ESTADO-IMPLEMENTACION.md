# Estado de implementación — SPEC-001

Bitácora de lo que existe de verdad en el repositorio. Se actualiza al cerrar cada
tarea `T-001-*`. Constitución IX: aquí no se declara terminado lo que no está
verificado, ni se llama producto a un prototipo.

Última actualización: 2026-09-18.

## Aviso: el contenido se marcó aprobado el 2026-09-18

La responsable del producto declaró aprobados **todos** los guiones que
estaban marcados y se retiraron los **26** marcadores `review: "VALIDAR"` de
`content/episodes/ep01-saludo.json` y `ep02-circulo.json`. Los `reviewNote` se
conservaron como registro de qué se revisó en cada línea.

Lo que dice el resto de esta bitácora sobre marcas pendientes describe el
estado **anterior** a esa fecha y se deja como historia, no como estado actual.
Los recuentos que aparecen más abajo (once, quince) nunca fueron exactos: los
marcadores reales eran 26.

Tres cosas que esto **no** cierra, porque el vault las declara abiertas para un
revisor distinto del que aprobó:

- `s05_n003` (Luna) — su nota pide revisión por personas con experiencia vivida
  de discapacidad. `evidencia-psicologica-proteccion.md` §10 dice que ese
  revisor todavía no existe.
- `s06_n003` y `s06_f002` (Don Beto, la segunda con `reviewPriority: "critical"`)
  — además son una pregunta abierta formal de `spec.md`.
- `EP02_S04_L004` — «no todos los niños tienen un adulto seguro en casa»; el
  vault lo da por reforzado, no por cerrado.

El distintivo «Borrador no validado» **sigue puesto**, y esto no lo cambia:
aprobar el guion no es haberlo probado con niñas y niños, que es lo que la
Constitución IX obliga a declarar.

El mecanismo quedó sin forma verificable: hoy «aprobado» es la ausencia de un
campo, indistinguible de «nunca se marcó». Un registro positivo
(`review: "APROBADO"` con quién y cuándo) sería comprobable por `check:safety`;
está sin hacer.

El informe de la verificación de extremo a extremo, con las medidas tomadas y
las que faltan, vive en [QA-VERTICAL-SLICE.md](./QA-VERTICAL-SLICE.md).

## Sesión de correcciones jugando en celular — 2026-09-18 (posterior a la de más abajo)

A diferencia de la sección "Corrección de estado — 2026-09-18" que sigue,
esta sí corre `npm run verify` de punta a punta (317 tests, build limpio) y
verifica varios de los cambios en vivo en el navegador antes de escribirlos
aquí. Cuatro reportes de una persona jugando el build desplegado en un
celular real, cada uno con causa raíz confirmada por lectura de código y
tres de ellos también en vivo:

- **Salto invisible al caminar hacia adelante.** La cámara perseguía la
  altura real del personaje (salto incluido) en vez del suelo bajo sus pies;
  con la interpolación de seguimiento, la cámara subía casi al mismo ritmo
  que el salto y lo anulaba visualmente. Corregido en
  `app/src/game/scene/GameCanvas.tsx`. Verificado en vivo: sosteniendo W y
  saltando, el personaje se separa con claridad del suelo.
- **Hay que girar la cámara a mano todo el rato.** El personaje ya giraba
  para mirar hacia donde camina en cualquier ángulo; la cámara no. Cualquier
  entrada no perfectamente cardinal (normal en un joystick) la dejaba cada
  vez más desalineada. Ahora la cámara se reacomoda sola, despacio, detrás
  de hacia dónde se camina, pero nunca si alguien la está girando a mano ni
  con `prefers-reduced-motion` activo (AC-7). `app/src/game/scene/camara.ts`,
  `useControlDelJugador.ts`. Verificado en vivo con W+D sostenidos.
- **Personajes que desaparecen de golpe o vuelven a aparecer.**
  `EscenaDelEpisodio` desmontaba el `&lt;Canvas&gt;` entero cada vez que el nodo
  actual no tenía a nadie en escena, y lo remontaba de cero en el siguiente
  nodo con reparto, aunque la escena no hubiera cambiado. Ahora el lienzo
  queda montado y simplemente no dibuja a nadie ese cuadro; se añadió además
  una transición de fundido (anulada bajo `prefers-reduced-motion`) para que
  el cambio entre el mundo y un episodio —que siguen siendo dos lienzos
  React distintos; unificarlos es un arreglo mayor no hecho aquí— se lea
  como transición y no como corte. No verificado en vivo (requiere recorrer
  un episodio completo).
- **Cuadro de diálogo sobrecargado en un minijuego.** La barra inferior
  mostraba a la vez el texto de pausa, el selector de edad y el botón de
  volver al mapa durante un minijuego, con solo dos opciones grandes debajo.
  Ya existía la reducción correcta para las decisiones del episodio
  (`vista.kind === "choice"`); ahora también cubre `"minigame"`. Verificado
  con tests contra el contenido real de `ep02-circulo.json`.
- **Bancos y otro decorado solapados en las islas.** `decoradoDeIsla` no
  sabía qué pieza ya había colocado en la misma isla, así que dos piezas
  podían caer una encima de otra. Confirmado con números reales antes del
  arreglo: en isla-piedra, un árbol y un banco quedaban a 0.029 unidades de
  distancia. Corregido con un acumulador de zonas ya ocupadas, local a cada
  isla. Reverificado: cero solapes en las 19 islas.
- **Botón "Hablar con..." tapado por el joystick.** Confirmado con una
  captura real de celular en vertical. `.mundo__oferta` caía al mismo borde
  inferior donde flotan los controles táctiles; ahora se reserva el espacio
  real que ocupan. Verificado en vivo en viewport móvil (375×812): el botón
  "Hablar con Profe Clara" se ve completo, separado del joystick.
- **Presupuesto de bytes subido de 25 a 80 MiB**, por instrucción explícita
  del usuario (ancho de banda de sobra en esta sesión de desarrollo, no
  necesariamente en el aula donde se use el juego). No revierte la
  optimización v001→v002 de los personajes, que no pierde calidad; solo deja
  de frenar lo que se añada después. El total servido no cambió (24.36 MiB).

**Segunda ronda de la misma sesión — diálogo y minijuegos en horizontal.**
Reportado con capturas reales: el cuadro de diálogo tapaba al personaje o se
comía casi toda la pantalla al jugar en horizontal (landscape) en un celular.
Causa raíz: `juego.css` solo tenía un punto de quiebre responsivo por ANCHO
(`max-width: 30rem`); ninguno reaccionaba a poca ALTURA disponible, que es lo
que falta en landscape aunque el ancho sobre. Dos agentes en paralelo —uno
para el diálogo/decisiones (`.shell--juego .dialogo*`, `.personaje*`,
`.decisiones*`), otro para los minijuegos (`.minijuego*`)— llegaron por
separado al mismo punto de quiebre, `@media (max-height: 30rem)` (~480px):
retrato y texto más chicos, padding reducido, listas largas con scroll
interno acotado (`max-block-size` + `overflow-y: auto`) sin esconder nunca el
control de continuar/parar. Ningún minijuego tenía medidas fijas en píxeles
que corregir; el cambio fue solo CSS.

Verificado: `npm run verify` completo (317 tests, build limpio) y en vivo en
el navegador con un viewport de 780×360 (celular en horizontal): se jugó el
episodio 1 desde el inicio hasta varias líneas de diálogo — el panel se ve
compacto, con el mundo y el cielo visibles arriba, sin taparlo. No se llegó
a probar en vivo una pantalla de decisión ni un minijuego en este mismo
viewport (comparten las mismas clases y el mismo punto de quiebre que la
línea de diálogo ya verificada, pero es lectura de código, no una captura
propia de esos dos casos).

No implementado, por ser un cambio de diseño mayor y no un arreglo de
tamaño: la idea de mostrar burbujas de diálogo alternadas por personaje
(izquierda/derecha) en vez de un solo cuadro central, que el usuario
preguntó si convendría. Ambos agentes coincidieron en que es razonable a
mediano plazo pero necesita su propia spec (qué pasa con más de dos
personajes, con un narrador sin retrato, y revisión de accesibilidad de
a11y-perf-reviewer), no una extensión de este arreglo.

Commits: `fb9defb`, `8a68143`, `4066e75`, `a784fa7` (rama `main`, subidos a
GitHub). El proyecto de Vercel (`isla-de-los-acuerdos`) despliega solo desde
`main`, así que estos cambios llegan a producción con el siguiente push
automático de la integración de Git — no se forzó ningún deploy manual desde
aquí.

## Decorado ambiental: cuatro props que estaban registrados y sin usar

Pedido de producto, con análisis previo por Constitución IV antes de tocar
código (el pedido original incluía una isla temática nueva con diálogo de
un NPC; eso queda fuera, ver más abajo). `content-guardian` no se convocó
porque no hay una sola palabra de contenido nueva.

`seedling`, `water_bottle`, `water_drop` y `recycling_bin` estaban en
`PROP_ASSETS` desde T-001-02 (el kit completo de props ya sincronizado al
build) pero ningún episodio ni pieza de decorado los dibujaba. Antes,
`IslandScene.tsx` solo sabía plantar piezas del catálogo de mundo
(`WORLD_ASSETS`: árboles, bancos, faros); se generalizó el tipo del
decorado a `WorldAssetId | PropAssetId` y se añadió `modelUrlDeDecorado`
para resolver el modelo en el catálogo que corresponda. Los cuatro se
repartieron, uno por isla, en cuatro de las islas puramente decorativas
del tercer anillo (`isla-cascada`, `isla-risco`, `isla-cueva`,
`isla-nido`), por el mismo sistema de colocación y anticolisión que ya
usa el resto del decorado (`colocacion.ts`) — no se añadió ningún
mecanismo nuevo.

**Lo que NO se implementó, y por qué:**

- **Una isla temática de educación ambiental.** Es contenido pedagógico
  nuevo fuera del alcance de SPEC-001 (prevención de ASI mediante
  consentimiento y límites corporales). Necesita su propia spec y
  revisión de Arianna antes de escribirse una sola línea (Constitución
  IV), no una tarea de colocación de props.
- **Un diálogo de NPC** ("cuida el medio ambiente" / "mantén limpio el
  lugar"). Es texto nuevo que un niño leería o escucharía: mismo motivo
  que el punto anterior. Se le señaló al usuario, además, que la frase
  original que proponía ("si haces bien el trabajo, cuidarte a ti mismo
  es como cuidar una planta") ata el autocuidado a hacer algo bien, lo
  que roza la Constitución V (nada de valor condicionado a portarse
  bien); es exactamente el tipo de matiz que le corresponde revisar a
  Arianna, no al código.
- **Una mecánica de "ordenar basura tirada".** Es una mecánica interactiva
  nueva, no decorado; no se analizó ni se diseñó, así que no se
  implementó.
- Se corrigió, de paso, el comentario de cabecera de `PROP_ASSETS` en
  `assets.ts`, que decía "cinco props sin dónde dibujarse" sin nombrarlos:
  ahora dice explícitamente cuáles cuatro se usaron hoy y deja la cuenta
  exacta de los que siguen sin uso para quien lea el archivo, no para
  esta bitácora.

Verificado con `npm run verify` completo y en vivo en el navegador: el
mundo entero (19 islas, props nuevos incluidos) carga sin errores de
consola y sin que el límite de error retire la escena a 2D. No se
comprobó visualmente cada una de las cuatro islas nuevas por separado
(quedan lejos del punto de partida); se confirmó que no rompieron nada,
no que se vean exactamente como se describen aquí.

### Corrección — se movieron a la isla de partida, y esta vez sí se vieron

El usuario jugó y confirmó que, en efecto, no los vio: demasiado lejos.
Se movieron los cuatro (`recycling_bin`, `water_bottle`, `water_drop`,
`seedling`) de las cuatro islas del tercer anillo a `isla-partida` —la
única isla donde `PUNTO_DE_PARTIDA` cae dentro de su propio radio
caminable, es decir, literalmente donde aparece quien juega—, con el
mismo mecanismo de colocación y anticolisión, sin duplicarlos.

Esta vez la verificación visual sí se hizo de verdad, no solo "no rompió
nada": se caminó hasta la isla de partida en el navegador y se confirmó
a simple vista la gota de agua (`water_drop`) junto al puente principal
y el plantín (`seedling`) en el césped cercano. No se confirmó
visualmente la botella de agua ni el contenedor de reciclaje por
separado (deberían estar ahí, por el mismo mecanismo, pero no se les
sacó una captura propia).

`npm run verify` en verde con el traslado integrado.

### Segunda corrección — el basurero y la botella se salían del borde

El usuario mandó una captura del juego corriendo: el `recycling_bin` se veía
prácticamente en el borde de la isla, casi cayéndose, y la `water_bottle`
también se veía rara. Diagnóstico con números reales, no supuestos:
`isla-partida` es el **único cruce de cuatro puentes** del mapa —
`senderosDeIsla` le planta baldosas de sendero que, juntas, forman una cruz
que bloquea casi todo el centro. Con el radio de colisión genérico de
`colocacion.ts` (pensado para una isla de un solo puente), **7 de las 10
piezas de esa isla tenían margen NEGATIVO contra el borde caminable** —
literalmente fuera del radio de 2.6 unidades: `tree_round` en -0.34,
`palm` en -0.51, `bench` en -0.47, `recycling_bin` en -0.45,
`water_bottle` en -0.79, `water_drop` en -0.77, `seedling` en -0.36.

Solo quedan cuatro bolsillos libres reales (las esquinas), porque la cruz de
senderos bloquea el resto. Se añadió un campo `radio` opcional a
`DecorPropuesto`, usado **solo en `isla-partida`**, ajustado al tamaño real
de cada modelo (medido en los comentarios de `shared/assets.ts`) en vez del
0.45 genérico. Con eso, las 14 piezas de la isla (6 originales + 3 props +
**cinco** `recycling_bin`, pedidos explícitamente por el usuario) quedan sin
solapes y con margen entre 0.10 y 0.70 contra el borde — verificado
recorriendo la lógica real de `decoradoDeIsla`, no a ojo.

El pedido literal de poner los basureros "cerca del centro" (distancia
0.15-0.35) es geométricamente imposible en esta isla: esa zona cae entera
dentro del cruce de senderos, bloqueada sin importar el radio de colisión.
Quedaron en los cuatro bolsillos libres, a la distancia más cercana al
centro que de verdad tiene hueco (~0.85-0.95).

Confirmado en vivo en el navegador: se vieron dos basureros distintos en
esquinas diferentes de la isla, ambos claramente dentro del borde, ninguno
cerca del agua. No se confirmaron los cinco por separado. `npm run verify`
en verde con el ajuste integrado.

## Corrección de estado — 2026-09-18

Esta sección **manda sobre lo que digan las secciones de más abajo**. Las
secciones fechadas son bitácora: se dejan como están porque registran qué se
hizo y cuándo. Lo que sigue corrige las afirmaciones **en presente** que ya no
son ciertas, con la ruta donde se comprueba cada una.

Lo que **no** se pudo comprobar al escribir esto: no se ejecutó
`npm run verify` ni el build. El árbol de trabajo tiene cambios sin commitear
de varios frentes a la vez, así que ninguna compuerta de calidad se declara
verde aquí. La última verificación registrada es la de T-001-07 (2026-09-17),
y sus medidas ya no describen el juego actual (ver
[QA-VERTICAL-SLICE.md](./QA-VERTICAL-SLICE.md)).

### Afirmaciones que ya no valen

| Dónde lo dice | Qué decía | Qué es cierto el 2026-09-18 | Dónde se comprueba |
| --- | --- | --- | --- |
| «Modo inmersivo» | «Tres islas unidas por dos puentes» | **Once islas** en un archipiélago de unos 34 × 34, dos con episodio (`isla-acuerdos` → ep01, `isla-circulo` → ep02) y la isla de partida vacía a propósito | `app/src/game/scene/mundo.ts`, constante `ISLAS` |
| «Modo inmersivo» | «La cámara sigue al personaje por detrás, sin girar nunca alrededor del mundo» | **Arrastrar gira la cámara.** Un gesto sobre el suelo empieza como candidato a toque y pasa a arrastre al superar 12 px | `app/src/game/scene/orbita-con-puntero.ts` |
| «Modo inmersivo» | «La app abre en la primera línea del episodio» | La app abre en **mundo abierto**: se camina y las misiones están en islas lejanas. El episodio empieza al acercarse al punto de encuentro de su isla | `app/src/game/GameShell.tsx`, `app/src/game/scene/EscenaLibre.tsx` |
| «Prototipo: control del personaje» y «Lo que sigue sin hacer» | «Caminar no dispara nada del guion»; «hace falta un modelo espacial en `content/`, que hoy no existe» | **Ya existe.** `content/encuentros/isla-encuentros.json` ancla personajes a coordenadas (`isla` + `anclaje`) y acercarse dispara la conversación. Las misiones también se disparan por cercanía | `app/src/engine/encuentros.ts`, `app/src/game/scene/cercania.ts`, `app/src/game/scene/encuentros-del-mundo.ts` |
| «Prototipo: control del personaje» | «W, A, S, D o tocando el suelo» como única entrada | Hay además **joystick virtual en pantalla** para tablet y celular, con radio de 44 px y zona muerta de 0,15 | `app/src/game/scene/control-tactil.ts`, `app/src/game/scene/ControlesTactiles.tsx` |
| «Episodio 2» | «83 textos y **15** marcas `review: "VALIDAR"`, las mismas que el guion señala» | El recuento nunca fue exacto. Entre ep01 y ep02 había **26** marcas y hoy hay **0**: se retiraron el 2026-09-18 (ver el aviso de arriba) | `content/episodes/*.json` |
| «Pendientes y riesgos abiertos» | «Cuando se implemente `branch` … Mientras tanto el runtime cae siempre a la rama `else`» | `branch` **está implementado**, como dice la sección «Fases completas del episodio» de este mismo archivo. La rama de `s06_b001` es alcanzable | `app/src/engine/condiciones.ts` |
| «Pendientes y riesgos abiertos» | «Los `setFlags` del nodo `reward` (`s07_rw001`) todavía no se ejecutan» | Se ejecutan, y pasan por `aplicarFlags` como exigía la nota | `app/src/engine/runtime.ts` |
| Todo el archivo | Elenco 3D = Capi y Tomi | **Los cinco personajes** (Capi, Tomi, Luna, Clara, Beto) tienen modelo 3D servido | `app/src/shared/assets.ts`, `docs/AUDITORIA-ASSETS.md` §1.1 |

### Recuentos inventados

Una auditoría anterior encontró que los números de marcas de revisión de este
archivo (**once** en las secciones de ep01, **quince** en la de ep02) nunca
correspondieron a lo que había en `content/`: eran **26** en total. Dos más,
encontrados al escribir esta sección:

- «Tres islas unidas por dos puentes» (sección «Modo inmersivo»). Son once.
  El número fue cierto el día que se escribió y quedó sin actualizar.
- El comentario de cabecera de `app/src/game/scene/mundo.ts` dice «Hay seis
  islas» mientras el propio archivo declara once. No se corrige aquí porque
  `app/` está fuera del alcance de este cambio; queda anotado.

No se encontraron otros números sin respaldo. Las medidas del informe de QA
(pasos, kB, llamadas de dibujo) sí se tomaron, pero describen un build
anterior a todo lo que sigue.

### Lo que hay hoy y no está descrito en ninguna sección de abajo

**Mundo abierto de once islas.** No se entra a un episodio: se entra al mundo.
Las dos misiones están en el segundo anillo, a tres islas de la de partida,
para que explorar sea el juego y la misión sea el destino. Los radios
caminables van de 1,6 a 2,6 y el modelo de isla es uno solo, reescalado.
Ruta: `app/src/game/scene/mundo.ts`.

El equipo indica que el archipiélago crecerá a unas 18–20 islas el mismo
2026-09-18. **No verificado:** al escribir esto el código tiene once.

**Controles táctiles.** Joystick virtual en pantalla para tablet y celular, y
arrastre para girar la cámara. La matemática vive en módulos puros y probados
sin WebGL (`control-tactil.ts`, `entrada-tactil.ts`, `orbita-con-puntero.ts`);
el dibujo, en `ControlesTactiles.tsx`. Es alcance nuevo: AGENTS.md declara que
el objetivo inmediato es laptop/proyector y que la optimización móvil se mide
después. **No se ha probado en una tablet ni en un celular reales.**

**Encuentros.** Conversaciones sueltas de 1 a 4 líneas con personajes
repartidos por el mundo, que aparecen al acercarse. Esquema propio con
`.strict()` en `app/src/engine/encuentros.ts`: un encuentro no tiene
decisiones, ni minijuego, ni cierre, y **ninguna clave del esquema escribe en
`ProgressStore` ni en `sessionVars`**. Contenido en
`content/encuentros/isla-encuentros.json`: **5 encuentros, 14 líneas**, uno por
personaje salvo Tomi, que tiene dos.

El estado de revisión de los encuentros es el contrario al de los episodios:
las **14 líneas** siguen marcadas `review: "VALIDAR"`, con `reviewNote` que
dice literalmente «Borrador escrito por el equipo, no por Arianna». Ninguna
está aprobada y ninguna se ha probado con niñas y niños.

**Los cinco personajes en 3D.** Antes se servían dos porque los GLB no cabían
en el techo de 25 MiB. Caben desde `assets/production/animated/v002`, una
variante con `KHR_mesh_quantization` que baja la precisión de almacenamiento de
los atributos de malla sin quitar un triángulo ni un clip: de 31 134 044 B
(29,69 MiB) a 16 703 564 B (15,93 MiB), **−46 %**. La allowlist completa queda
en 23,81 MiB de 25 MiB. Las fuentes `v001` no se tocaron y la cadena
v001 → v002 se verifica por sha256 en las dos direcciones. Medido en
`docs/AUDITORIA-ASSETS.md` §1.1.

**Salto y caída al agua.** `app/src/game/scene/salto.ts`: impulso y gravedad
que dan 0,5 s de salto, 0,5 u de altura y 0,8 u de alcance horizontal —
suficiente para una grieta, no para sustituir un puente. Caerse al agua
devuelve al último sitio seguro y **no cuenta nada**: no hay vidas, ni contador
de caídas, ni mensaje de error (Constitución V).

**Relieve del mundo: en curso, no terminado.** El equipo indica que se están
añadiendo islas a distintas alturas, escaleras y saltos entre piedras. Lo
verificable hoy: el salto existe, y `mundo.ts` sigue teniendo una sola altura
de suelo (`ALTURA_DEL_SUELO = 0.2`) y ninguna isla con cota propia. El relieve
todavía no está en el modelo del mundo.

**Panel del facilitador: aparece en el árbol, sin commitear y sin verificar.**
`app/src/panel/` existe (`PanelShell.tsx`, `FacilitatorDashboardView.tsx`,
`CoordinatorDashboardView.tsx`, `MaterialsView.tsx`, `ProtocolModal.tsx`,
`fixtures/seedData.ts`) y `app/src/App.tsx` pone un botón flotante para entrar.
`git status` lo da como no rastreado: es trabajo en curso de otro frente. Lo
que se leyó, sin ejecutarlo:

- Los datos son **semilla inventada** para demo (aulas «3° A», fechas,
  porcentajes de avance). No sale de ninguna sesión real y nada en la interfaz
  lo dice.
- El modelo de datos es **agregado por aula** (`conteoIntegrantes`, no
  personas). No hay nombre, foto ni identificador de un niño, que es lo que
  exigen la Constitución I y III. Esto es lectura de `seedData.ts`, no una
  auditoría del `content-guardian`.
- `seedData.ts` llama al episodio 2 «El acuerdo del grupo». El título real del
  guion y del contenido es **«Mi círculo de 3»**.
- SPEC-002 existe (`specs/002-panel-facilitador/spec.md`), pero **no hay tareas
  `T-002-*`** y el panel no aparece en ningún tablero de este archivo.

## Tablero

| Tarea | Estado | Compuerta |
| --- | --- | --- |
| T-001-01 — Scaffold y compuerta de calidad | hecho | `npm run verify` verde |
| T-001-02 — Sincroniza y registra los assets reales | hecho | `npm run verify` verde |
| T-001-03 — Valida el episodio completo | hecho | `npm run verify` verde |
| T-001-04 — Motor puro y persistencia mínima | hecho | `npm run verify` verde |
| T-001-05 — Experiencia 2D accesible | hecho | `npm run verify` verde |
| T-001-06 — Escena 3D con Capi y Tomi | hecho | `npm run verify` verde |
| T-001-07 — Verificación de extremo a extremo | hecho | `npm run verify` verde |

## T-001-01 — Scaffold y compuerta de calidad

Hecho. `npm run verify` ejecuta, en orden, typecheck, lint, tests, `check:safety`
y build, y termina en verde.

**Decisiones**

- Workspace npm en la raíz; la app vive en `app/`.
- TypeScript 5.9.3 y no 7.0.2: `typescript-eslint@8.70` declara `typescript <6.1.0`.
  Se prefirió lint verde sobre versión nueva.
- `jsdom` fijado en 29.1.1 porque jsdom 30 exige Node `^22.22.2` y la máquina de
  desarrollo tiene Node 22.14.0.
- Versiones exactas (`save-exact=true` en `.npmrc`) y lockfile versionado.
- Sin Tailwind, sin backend y sin las dependencias 3D todavía: cada una entra con
  la tarea que la usa.

**Mecanismos de la regla «el motor es TypeScript puro»** (Constitución VIII)

La regla no depende de revisión manual. La sostienen tres compuertas independientes:

1. `app/tsconfig.engine.json` — typechea `src/engine/**` sin `lib: DOM`, así que
   `window`, `document` o `localStorage` rompen el typecheck.
2. `app/eslint.config.js` — bloque `src/engine/**` con `no-restricted-imports`
   (React, `react-dom`, Three, `@react-three/*`, `zustand`) y
   `no-restricted-globals` (APIs de navegador y red).
3. `scripts/check-safety.mjs` — reglas `engine-puro` y `engine-sin-dom`,
   verificación independiente del toolchain.

Probado con una prueba negativa: un archivo temporal en `engine/` que importaba
React y usaba `window.localStorage` produjo dos violaciones y salida 1.

**Comprobado en navegador**

Distintivo `Borrador no validado` visible, cero errores de consola, cero
peticiones fuera de `localhost`, y `localStorage`, `sessionStorage` y cookies
vacíos.

## T-001-04 — Motor puro y persistencia mínima

Hecho, en dos commits: `progress.ts` (persistencia) y `runtime.ts` (navegación).
`npm run verify` verde; 68 tests en 7 archivos.

**Qué presenta el runtime**

`line`, `choice`, `sceneChange` y `end`. Los `sceneChange` nunca se muestran:
se cruzan durante la transición y aplican el `onEnter` de la escena destino.
`minigame`, `branch` y `reward` están validados por el esquema pero todavía no
tienen interfaz: se presentan como vista `unimplemented` con su diagnóstico.

`saltarNodoNoImplementado()` es una salida **de desarrollo** para poder
recorrer el episodio de punta a punta antes de que existan los minijuegos;
sigue la continuación declarada del nodo (`next`, o `else` en `branch`). No
significa que el minijuego esté hecho.

**Decisiones**

- Una sola allowlist de persistencia en todo el proyecto. `FLAGS_PERSISTIBLES`
  vive en `progress.ts`, que además deriva de ella el tipo que `writeFlag`
  acepta; `schema.ts` la reexporta como `PERSISTENCE_ALLOWLIST` y el runtime la
  consulta con `esFlagDePersistencia`. Antes había dos literales que podían
  separarse en silencio.
- El runtime nunca lanza. Una llamada fuera de lugar (elegir sobre una línea),
  una opción que el modo de edad no muestra o un contenido con la navegación
  rota devuelven `false` o una vista `error` con diagnóstico legible, no una
  excepción ni una pantalla en blanco (AC-1).
- Los diagnósticos salen por un callback inyectado (`onDiagnostic`). El motor no
  puede mirar el entorno —no tiene DOM ni `import.meta.env`—, así que quien lo
  construye decide si los muestra en desarrollo o los descarta.
- Tope de 100 saltos encadenados por transición. El contenido válido no se
  acerca; existe para que un ciclo de `sceneChange` introducido más adelante dé
  un diagnóstico en vez de colgar el navegador. Hay un test con un episodio
  cíclico que el esquema acepta (la validación referencial no detecta ciclos).
- `suscribir()` para que la UI de T-001-05 pueda re-renderizar sin que el motor
  sepa nada de React.
- `startSceneId` e `irAEscena()` existen para el selector de escena de
  desarrollo de T-001-05: el saludo de Capi (s03) queda detrás de dos
  minijuegos en el recorrido normal.

**Privacidad, comprobada por test (AC-5, AC-9, Constitución I y V)**

- Las cuatro variables de sesión (`greetCapi`, `greetTomi`, `greetBeto`,
  `insistedLuna`) viven en memoria y se van al recargar. `sessionVars` se expone
  congelada: modificarla desde fuera lanza y no altera el estado del motor.
- Tras recorrer el episodio completo, el almacenamiento contiene exactamente
  una clave: `yais.ep01.completed=true`. Ningún valor de saludo, ningún id de
  escena, ninguna elección.
- Los otros seis flags con `persist: true` del contenido se ignoran con
  diagnóstico, igual que `onEnter.setProgress` (que guardaría la última escena).
- Reintento ilimitado y sin costo: no hay contador de intentos, ni estado de
  acierto o error, ni transición que se bloquee por haber pasado antes. Un test
  cambia de saludo cinco veces seguidas y comprueba que lo único que queda es la
  última elección.
- Filtrado por edad (AC-3): en `6-8` la decisión del saludo de Capi ofrece cinco
  opciones y en `9-12` seis (`fist_bump`). Pedir una opción que el modo no
  muestra no cambia el estado.

**Lo que este motor todavía no hace**

- No evalúa las condiciones de `branch`: el guion las necesita para la escena de
  Don Beto (s06), que hoy cae siempre a la rama `else`.
- No ejecuta ningún minijuego.
- No existe interfaz: nada de esto se ha visto en pantalla todavía (T-001-05).

## T-001-05 — Experiencia 2D accesible

Hecho. `npm run verify` verde; 84 tests en 8 archivos. La ruta 2D es la
experiencia base, no un placeholder del 3D: hoy es la única que existe y es la
que queda si WebGL falla (AC-8).

**Qué se puede hacer en pantalla**

Elegir modo de edad, empezar, avanzar líneas, repetir una línea, elegir un
saludo, volver a elegirlo cuantas veces se quiera, parar en cualquier momento
y llegar al cierre con el pie de debrief para la persona adulta.

**Decisiones**

- El contenido se importa como módulo (`shared/episode.ts`) y se valida una vez
  al cargar. La demo no hace ninguna petición de red: comprobado en el
  navegador, cero recursos fuera de `localhost`.
- Ningún texto que un niño lee está escrito en código. La pregunta que encabeza
  una decisión es la línea del guion que la precede (`s03_n002`, «¿Cómo quieres
  saludarme?»), que el motor entrega en `ChoiceView.precedingLine` y la interfaz
  mantiene en pantalla mientras se elige. La primera versión ponía un rótulo
  propio ahí y la revisión de content-guardian lo bloqueó: es contenido infantil
  fuera de `content/` (Constitución IV).
- `game/ui/textos-ui.ts` concentra los rótulos de interfaz que el contenido no
  declara («Continuar», «Volver a jugar»). Cuando el contenido pase la revisión
  de Arianna, se mueven a `localization` de una vez.
- El foco viaja al control principal de cada pantalla (`data-principal`) en cada
  transición: con teclado basta Enter para recorrer el saludo entero.
- La línea vive en una región `aria-live`; «Repetir lo que dijo» la vacía y la
  vuelve a llenar para que un lector de pantalla la relea. Todavía no hay audio
  locutado (SPEC-001 lo deja fuera), así que eso es literalmente lo que
  «repetir» puede hacer hoy; en T-001-06 volverá a disparar el gesto.
- Cero animaciones y cero transiciones en el 2D: AC-7 se cumple por
  construcción, no por una excepción de `prefers-reduced-motion`.
- Selector de escena y botón de saltar nodos sin interfaz existen solo con
  `import.meta.env.DEV`. Comprobado sobre el bundle de producción: sus clases y
  los diagnósticos con rutas del JSON no aparecen en `dist/`.

**Comprobado en el navegador (Chromium, laptop)**

- El episodio corre de punta a punta usando el selector de escena; el saludo de
  Capi ofrece cinco opciones en 6-8 y seis en 9-12.
- Al terminar, `localStorage` contiene exactamente `yais.ep01.completed=true`;
  `sessionStorage` y las cookies quedan vacías, también a mitad de episodio.
- Cero peticiones fuera de `localhost`. El poster de Capi se sirve local.
- A 375 px la retícula pasa a una columna, sin desbordes.
- Bundle: 349 kB (104 kB gzip) frente a los 191 kB (60 kB) de solo React, en un
  único chunk sin code-splitting. Desglose medido por `a11y-perf-reviewer`:
  `zod` completo 110 kB (27 kB gzip) y el JSON del episodio 42 kB (9 kB gzip).
  Con `zod/mini` el validador baja a 19 kB (5.5 kB gzip); validarlo en build y
  publicar el JSON ya validado lo quitaría del navegador por completo. Medido,
  no optimizado todavía.

**Revisión de accesibilidad y rendimiento (a11y-perf-reviewer)**

Corregido aquí:

- Bloqueante de contraste: el borde en reposo de una opción daba 1.50:1 contra
  el panel blanco que la contiene (mínimo 3:1 para el límite de un control,
  WCAG 1.4.11). Ahora usa `--color-acento`, 7.80:1, y el hover cambia el fondo
  en vez del borde.
- Al quitar el rótulo inventado de las decisiones, la pantalla se quedó sin
  ningún encabezado y quien navega con la tecla H perdía el tramo central del
  episodio. La pregunta del guion es ahora además el `h2`: se marca el texto
  que ya estaba, sin escribir texto nuevo.
- La etiqueta «Solo desarrollo» del aviso de nodo sin interfaz ya no se
  renderiza fuera de desarrollo: proyectarla en un aula sería jerga interna en
  pantalla.

Pendiente, medido pero no resuelto:

- Los retratos pesan 1.3 MB entre los dos y se muestran a 128 px:
  `capi/poster.png` es 768×864 (820 kB) y `tomi/poster.png` 640×768 (540 kB).
  Reexportarlos a ~320 px ahorra más que todo el aumento de JS, pero toca la
  tubería de assets aprobada y va en su propia tarea.
- Riesgo verificable y no confirmado: en la primera línea de cada escena el
  foco se mueve al botón antes de que la región `aria-live` se llene, así que
  un lector de pantalla podría decir «Continuar, botón» antes que la línea del
  personaje. Hace falta NVDA/JAWS/VoiceOver reales; jsdom no simula colas de
  voz.
- Cuando entre Three.js en T-001-06 debe ir en un chunk aparte cargado bajo
  demanda, o el fallback 2D pagará su peso aunque el proyector nunca vea el
  Canvas.
- Sin medir todavía: 44×44 en píxeles reales, zoom de solo texto al 200 %,
  legibilidad proyectada y tiempo de carga en la conexión real de una escuela.

**Lo que no hace y hay que decidir**

- ~~En un build de producción el episodio se detiene en el minijuego de
  `s02_brujula`.~~ **Cerrado**: los cuatro minijuegos están implementados como
  prototipo y el episodio se recorre entero sin herramientas de desarrollo (ver
  «Fases completas del episodio»). Sigue pendiente la decisión de fondo: eso
  adelanta trabajo que SPEC-001 manda a SPEC-004, y la versión final de cada
  minijuego necesita su spec.
- El contenido declara `reviewPolicy.blockProductionIfPending: true` y once
  marcas `review: "VALIDAR"`: diez nodos y una más dentro de la configuración
  del minijuego de `s02_brujula`, que se verá cuando exista SPEC-004. Nada de
  eso se aplica todavía: el único resguardo es el distintivo global.
- El material del debrief (`adultOnly: true`) se muestra en la misma pantalla
  proyectada que mira el curso. Es lo que pide SPEC-001, pero conviene
  confirmarlo con Arianna.
- La medida real de 44×44, el contraste en proyector y el comportamiento con
  lector de pantalla se revisan en T-001-07; los tests solo comprueban que
  ningún control se saltó la clase que aplica el objetivo táctil.

## T-001-06 — Escena 3D con Capi y Tomi

Hecho. `npm run verify` verde; 101 tests en 11 archivos. Capi y Tomi aparecen
desde sus GLB reales sobre la isla, encima del mismo diálogo 2D, que sigue
siendo la ruta accesible y la que manda.

**Cómo está armado**

- `scene/EscenaDelEpisodio.tsx` no importa Three. Comprueba WebGL y solo
  entonces carga `GameCanvas` con `import()`. Un equipo sin aceleración no
  descarga el motor 3D: el chunk `GameCanvas` pesa 973 kB (259 kB gzip) y el
  principal se queda en 353 kB (106 kB gzip), prácticamente lo mismo que antes
  de esta tarea.
- Un límite de error retira la escena si falla en marcha (contexto perdido, GLB
  roto) y la sesión continúa en 2D. Se comprobó sin querer: mientras el
  servidor de desarrollo tenía las dependencias sin optimizar, el `import()`
  falló, el límite hizo su trabajo y el episodio siguió jugándose.
- `scene/estado-de-escena.ts` es puro y traduce la vista del motor a quién está
  en escena y qué hace. Ahí vive la regla del hito: solo suben al escenario los
  personajes con GLB sincronizado (Capi y Tomi). Cuando habla Luna, Beto o
  Clara, el 3D se queda en reposo y quien identifica al personaje es el retrato
  2D del diálogo.
- `scene/useCharacterAnimation.ts` conduce el mixer a mano, como pide PLAN-001.
  Un gesto (`Wave`, `TalkGesture`) suena una vez y vuelve a `Idle` por el evento
  `finished`, no por un temporizador. Un estado sostenido (`Listen` mientras el
  niño decide) se mantiene en bucle.
- El bucle de render se apaga (`frameloop="demand"`) cuando la escena queda
  quieta, con un margen de 350 ms para que la mezcla de vuelta a `Idle`
  termine. Sin ese margen el personaje se congelaba a medio camino entre el
  gesto y el reposo; se detectó midiendo llamadas de dibujo en el navegador, no
  leyendo el código.
- Con `prefers-reduced-motion` no se reproduce ninguna animación ni caminata:
  el personaje aparece colocado en su sitio, en el primer cuadro de `Idle`, y
  el bucle no se enciende (AC-7). Comprobado en un navegador real, ver abajo.
- El retrato 2D se mantiene aunque el 3D funcione: es lo que dice quién habla, y
  es el único indicio cuando quien habla no tiene modelo.

**Comprobado en el navegador**

- Capi y Tomi se ven juntos en `s04_tomi`, cada uno desde su GLB.
- Recorriendo las siete escenas solo se descargan tres GLB: `island_large`,
  `mascot` (Capi) y `child_explorer` (Tomi). Luna, Clara y Beto no se descargan
  nunca, que es el criterio explícito de la tarea.
- Con la escena quieta, cero llamadas de dibujo en 1,5 s.

**Dependencias**

`three@0.186.0`, `@react-three/fiber@9.7.0`, `@react-three/drei@10.7.8` y
`@types/three`. React baja de 19.3.0 a 19.2.8 porque `@react-three/fiber@9.7.0`
declara `react: ">=19 <19.3"`: no es un descuido, es la restricción de la
librería. Si más adelante se quiere React 19.3, hay que esperar a que R3F lo
soporte.

**Lo que no está medido y no se promete**

- Ni un solo cuadro por segundo. La ventana del navegador de pruebas estaba en
  segundo plano y el navegador limita el bucle de animación en ese estado, así
  que cualquier medida de fluidez de esta sesión sería falsa. Se mide en
  T-001-07, con la ventana al frente y en la laptop real.
- El GLB de Capi pesa 16,4 MB y tiene 226 374 triángulos; el de Tomi, 2 MB. Es
  lo que hay hoy en `assets/production/animated/v001` y no se toca desde aquí
  (AGENTS.md). Con la conexión de una escuela eso es mucho: el episodio se puede
  jugar mientras baja —la escena entra cuando llega—, pero conviene medirlo
  antes de la demo.
- Las 61 intenciones del guion siguen cayendo en cinco clips. La escena usa el
  mapa de `shared/animation-intents.ts` y avisa en desarrollo cuando una
  intención cae en un `fallback`; varias escenas se ven aproximadas y eso no se
  disimula (`docs/MAPA-ANIMACIONES.md`).
- La vuelta a `Idle` deja al personaje congelado cuando la escena está quieta.
  Es deliberado, por el presupuesto de CPU de una laptop vieja, y está en un
  solo lugar por si en el aula se lee como que el juego se colgó.

### Revisión visual y movimiento (segunda pasada de T-001-06)

Tras comparar con las láminas de `assets/concepts` y con la revisión de
content-guardian, la escena cambió de forma:

- **La isla está poblada**: sendero, puente, banco, dos árboles, palmera, faro
  y tres nubes, todo del mundo mínimo ya sincronizado. Las posiciones no se
  adivinaron: se midió la caja contenedora real de cada GLB (la isla mide
  6,27 × 6,30 con el césped a y≈0,2; el faro, 4,65 de alto).
- **El lienzo ocupa la parte alta y el diálogo se apoya encima**, como en
  `isla-acuerdos-core-screens.png`. El panel sigue siendo opaco: el texto
  conserva sus 16,20:1 de contraste medido, no se apoya en transparencias.
- **Las decisiones son tarjetas** con el icono grande sobre un disco de color
  y el texto debajo, en vez de filas de lista. Los iconos siguen siendo SVG
  dibujados en código: las láminas son brief de arte y no se recortan
  (`assets/concepts/ASSET-INVENTORY.md`). El disco de color es decoración; la
  silueta, el texto y el orden dicen lo mismo sin él.
- **Los personajes caminan.** Al empezar cada escena entran desde el sendero
  hasta su sitio en vez de aparecer de golpe, y se desplazan al claro cuando el
  guion pide locomoción (las cinco intenciones mapeadas como `Locomotion`).
  Caminar manda sobre gesticular: mientras se desplaza suena `Walk` —o `Roll`
  en el caso de Luna— y el gesto se retoma al llegar. No hay control del
  jugador: la exploración libre es otra spec (SPEC-004, `free_look`).

**Medido en el navegador, con el movimiento activo**

- Escena asentada: **cero** llamadas de dibujo en 1,5 s.
- Al cambiar de escena: **1665** llamadas en 700 ms, mientras los dos
  personajes entran caminando; luego vuelve a cero.

**Hallazgo del entorno de prueba**

El navegador donde se probó tiene `prefers-reduced-motion: reduce` activo. Eso
verificó AC-7 en un navegador real —sin caminata, sin clips, bucle apagado, el
personaje colocado directamente en su sitio— y explica por qué las primeras
capturas se veían estáticas. Para ver el movimiento hubo que desactivar esa
preferencia en la página.

**Correcciones de la revisión de a11y-perf-reviewer**

- El bucle de render no se apagaba casi nunca. `alCambiarActividad(true)` se
  llamaba para todo clip nuevo, pero el apagado solo existía para el gesto
  puntual que termina solo: cualquier personaje que solo acompaña —montado en
  `Idle`— y las quince intenciones del guion que resuelven directo a `Idle` o
  `Listen` dejaban `frameloop="always"` encendido sin retorno. Ahora solo
  `Listen` y la locomoción mantienen viva la escena. Comprobado en el
  navegador: con Capi y Tomi juntos y la escena asentada, cero llamadas de
  dibujo en 1,5 s; antes del arreglo habría seguido dibujando indefinidamente.
- Perder el contexto WebGL no lanza una excepción, así que el límite de error
  nunca lo habría visto: el comentario prometía una garantía que el código no
  daba. Ahora se escucha `webglcontextlost` y la escena se retira de verdad.
- El decorado contradecía al guion: el puente se veía entero mientras el
  contenido lo declara `broken`. Las piezas del mundo consultan el
  `environment` de la escena y el puente solo aparece cuando el contenido dice
  `partially_fixed`.
- Pendiente y no resuelto: el presupuesto de arte del aula está al 95,6 %
  (23,91 MiB de 25 MiB que `sync-runtime-assets.mjs` impone como techo duro), y
  `mascot.glb` es el 65 % de eso él solo: 16,4 MB y 226 374 triángulos para un
  personaje que en pantalla mide 288 px. Comprimir y decimar ese GLB es la
  palanca grande, y es tarea de arte con versión nueva, no de esta capa.
- `prefers-reduced-motion` se lee una sola vez al montar la escena: si hay que
  activarlo para una demo, hay que hacerlo antes de arrancar el episodio.

**Correcciones de la revisión de content-guardian**

- `resolveAnimationClip` ahora **sí** advierte en desarrollo cuando una
  intención cae en un clip de relleno (punto 3 de T-001-06). Antes el doc lo
  daba por hecho y el código no lo hacía: 40 intenciones marcadas `fallback` se
  reproducían en silencio.
- `useGLTF` se llama con el decodificador Draco desactivado. Los GLB de hoy no
  lo usan, pero `scripts/optimize-glb.ps1` comprime con Draco por defecto, y si
  alguien lo usara antes de la demo el aula sin Internet se quedaría sin
  personajes pidiendo el decodificador a un CDN de Google.
- La escena solo recibe las variables de sesión de saludo. `insistedLuna`
  —que registra que alguien pasó por encima de un «no»— ya no llega ahí, así
  que ningún gesto puede depender de ella ni por descuido (Constitución III).
- El distintivo de borrador es `sticky`: con la escena y el diálogo, la página
  se desplaza en una laptop de 768 px y AC-10 pide que esté en pantalla.

### Prototipo: control del personaje

Fuera del alcance de SPEC-001 y marcado como tal. Quien juega mueve a Capi por
la isla con W, A, S, D o tocando el suelo; el episodio avanza como siempre, con
los botones del diálogo.

**Qué hace y qué no**

- Mover a Capi **no dispara ninguna línea, no cambia de escena y no afecta a
  ninguna decisión**. El episodio se juega entero sin tocarlo, que es lo que
  AC-8 exige de la ruta 2D.
- Para que el mundo dispare el guion —acercarse a alguien y que hable— hace
  falta un modelo espacial en `content/`, que hoy no existe: las escenas son
  grafos de nodos, sin una sola coordenada. Eso es un cambio del modelo de
  contenido y va por spec, no por esta capa.

**Decisiones de entrada**

- **Solo letras (W, A, S, D).** Las flechas desplazan la página y mueven la
  selección de los controles del diálogo, que es la ruta accesible: caminar no
  puede quitarle esas teclas a quien juega sin ratón. Hay un test que lo fija.
- **Tocar el suelo también camina**, así que con un solo puntero se puede todo
  (AC-6). El plano invisible que recibe el toque es mucho más grande que la
  isla y el punto se acerca al sitio alcanzable más cercano: tocar el agua o el
  cielo mueve al personaje hacia allí en vez de no hacer nada. Pedirle a un
  niño de seis años que acierte al disco exacto convierte el control en algo
  que «a veces no funciona».
- **Con `prefers-reduced-motion` no hay control**: la escena está quieta por
  AC-7 y un personaje deslizándose sin animación de caminar no sería menos
  movimiento, sería un error.
- El personaje no puede salirse de la isla: el radio caminable es 2,6 y la isla
  llega a 3,13.
- En cuanto alguien toma el control en una escena, el personaje deja de volver
  solo a su sitio; al cambiar de escena se suelta y vuelve a entrar caminando.

**Medido en el navegador**

Escena quieta, cero llamadas de dibujo; manteniendo `D`, 3465 en 900 ms;
tocando el agua, 3843; tocando el cielo, 3780. Es decir: el bucle se enciende
solo mientras alguien se mueve de verdad.

**Lo que falta para que esto sea una funcionalidad y no un prototipo**

- No hay ninguna indicación en pantalla de que se puede caminar. Un rótulo
  («toca la isla para caminar») es texto que un niño lee y tiene que venir de
  `content/` con aprobación de Arianna, no escrito en código.
- No se ha probado con niñas y niños, ni en el aula con un dispositivo
  proyectado: un niño explorando mientras 24 miran es otra pedagogía que una
  conversación guiada, y esa decisión no es de implementación.
- Sin spec, lo de arriba puede cambiar entero.

### Modo inmersivo: se entra directo y el mundo es la pantalla

Reorganización de la presentación pedida por el equipo, después de comparar
con las láminas de `assets/concepts`. Sigue siendo presentación: no toca el
contenido, ni el motor, ni la ruta accesible.

- **Fuera la pantalla de inicio.** La app abre en la primera línea del
  episodio. El grupo de edad pasa a la barra de quien acompaña, abajo, porque
  es una decisión del adulto y no del niño (AC-3). Cambiarlo reinicia el
  episodio: alterar a media conversación qué opciones se ven sería peor que
  volver a empezar.
- **El mundo ocupa la ventana** y los paneles flotan encima. Siguen siendo
  opacos: el texto conserva su contraste medido y no depende de lo que haya
  detrás. El distintivo de borrador va arriba a la izquierda, por encima de
  todo lo demás (AC-10).
- **Tres islas unidas por dos puentes.** Hay un solo modelo de isla, así que
  se repite a distintas escalas; la variedad del archipiélago de la lámina
  `isla-acuerdos-environment-sheet.png` es trabajo de arte.
- **La cámara sigue al personaje** por detrás, sin girar nunca alrededor del
  mundo: la orientación es siempre la misma, así que no hay desorientación.
  Apunta casi a sus pies para que quede por encima del panel de diálogo.
- **Se puede cruzar de isla en isla.** Por dónde se puede andar lo decide
  `mundo.ts`, que es puro y está probado: tres círculos y dos rectángulos. El
  decorado se dibuja a partir de esos mismos datos, así que el suelo que se ve
  y el suelo que se pisa no pueden separarse.

**Lo que encontraron los tests, no una revisión**

- El puente este no llegaba a la isla: quedaba un salto de agua en medio. Hay
  un test que comprueba que cada puente toca de verdad las dos orillas, y otro
  que recorre el archipiélago de punta a punta muestreando cada 10 cm.
- Proyectar un punto al borde de una isla lo dejaba fuera por el error de la
  coma flotante, así que el sitio al que se acababa de mandar al personaje
  resultaba no ser caminable.
- Los puentes estaban en la línea que une los centros de las islas, no a la
  altura por la que se anda: caminar hacia la isla de al lado terminaba en el
  borde sin explicación. Ahora coinciden.

**Lo que encontró el navegador**

- El lienzo, al estar fijo, se pintaba por encima de los paneles: el orden de
  pintado de CSS no es el orden del HTML.
- Al desmontarse el lienzo —o al recargar en caliente— el navegador dispara
  `webglcontextlost`, y el manejador retiraba la escena para siempre. Ahora se
  conecta y desconecta en un efecto, así que React lo limpia antes de quitar
  el nodo.
- `prefers-reduced-motion` se leía una sola vez al montar. Ahora se escucha
  (`useMenosMovimiento`), que es lo que había pedido la revisión de
  accesibilidad: si hay que activarlo a mitad de una demo, se aplica solo.

**Pasada de UX: redundancia y saturación**

Medido en el navegador antes de tocar nada, no a ojo:

| Qué | Antes | Ahora |
| --- | --- | --- |
| Veces que se ve el nombre de quien habla | 3 (modelo 3D, pie del retrato, etiqueta) | 1 |
| Pantalla ocupada por la interfaz, en una línea | 41 % | 39 % |
| Pantalla ocupada en una decisión de cinco opciones | 84 % | 72 % |
| Lo mismo a 375 px | 86 % | 57 % |
| Altura del encabezado flotante | 139 px | 46 px |
| Controles permanentes en pantalla | 5 | 3 |

Qué se cambió y por qué:

- **El retrato 2D desaparece cuando quien habla ya está en la escena 3D.** Era
  el mismo personaje dos veces en la misma pantalla, una quieta y otra
  animada. Vuelve solo si la escena se retira —sin WebGL, si el GLB falla o si
  se pierde el contexto—, porque entonces hace falta algo que muestre quién
  habla. Lo señaló la revisión de accesibilidad como decisión de atención.
- **El nombre ya no se escribe dos veces.** El retrato perdió su pie de foto:
  el nombre está justo al lado, encima de la línea.
- **El grupo de edad se pliega.** Se toca una vez por sesión y estaba
  compitiendo por atención con lo que sí se usa en cada línea. Se despliega
  hacia arriba para que el botón de parar no se mueva bajo el dedo.
- **Las tarjetas de decisión son más bajas y como mucho tres por fila.** Con
  cuatro, cinco opciones quedaban 4+1 y la huérfana se leía como un error.
- **En pantalla angosta las tarjetas pasan a fila** (icono a la izquierda):
  apiladas, cinco opciones se comían la pantalla entera.
- **El encabezado es una sola tira.** Apilados, el distintivo y el título
  ocupaban 139 px de esquina, y una decisión larga llegaba a meterse debajo
  del título dejando la pregunta ilegible.

Un detalle que costó encontrar: `index.css` importa `juego.css` y **después**
define `.shell__titulo` y `.shell__encabezado`, así que con una sola clase las
reglas del modo inmersivo perdían por orden de cascada aunque fueran
correctas. Van con `.shell--juego` delante.

**Lo que sigue sin hacer**

- Caminar no dispara nada del guion. Sigue haciendo falta el modelo espacial
  en `content/`, y sigue yendo por spec.
- Nada indica en pantalla que se puede caminar: ese rótulo es texto que un
  niño lee y tiene que venir de `content/` aprobado.
- En pantalla angosta el mundo casi no se ve: los paneles ocupan lo que hay.
  El objetivo declarado es laptop y proyector, así que se deja anotado.

## Fases completas del episodio

Fecha: 2026-09-17. Más allá del alcance de SPEC-001, que manda los minijuegos
a SPEC-004; esto es un prototipo para que el episodio se pueda recorrer
entero, no la versión final de ninguno.

**El bloqueo que se cerró.** Hasta aquí, un build de producción moría en el
minijuego de `s02_brujula` y el saludo de Capi solo se alcanzaba con el
selector de escena de desarrollo. Ahora el episodio se recorre de la primera
línea al cierre: 70 pasos medidos en el navegador, sin herramientas de
desarrollo, y al terminar el almacenamiento tiene una sola clave.

**Ramas condicionales**

`condiciones.ts` evalúa las condiciones que declara el contenido. Es puro,
tiene su tabla de casos y solo puede consultar dos cosas: el modo de edad y
las variables de sesión, que viven en memoria. Deliberadamente **no** puede
consultar el progreso persistido: si una rama del guion dependiera de lo que
quedó guardado, `ep01.completed` dejaría de ser un booleano de progreso y
pasaría a ser un perfil.

Consecuencia que hay que mirar de frente: la rama de `s06_b001` ya no cae
siempre al `else`. En modo 9-12, y si el saludo a Don Beto no fue un abrazo,
el episodio llega a `s06_n003` y siguientes, que están marcados
`review: "VALIDAR"` y son el punto más delicado del guion. Antes eran
inalcanzables por accidente; ahora son alcanzables a propósito, con el
distintivo de borrador como único resguardo.

**Los cuatro minijuegos**, uno por archivo en `game/minigames/`:

| Minijuego | Escena | Qué hace |
| --- | --- | --- |
| Mirada libre | s01 | Deja mirar la isla y seguir cuando se quiera. Sin tiempo. |
| Brújula corporal | s02 | Tres tarjetas del contenido, tres respuestas, cualquiera válida. |
| Chocar las manos | s04 | Se choca las veces que dice el guion. Parar, siempre. |
| Armar el puente | s07 | Tres acuerdos, en cualquier orden. |

Lo que comparten, y no es negociable:

- **Ninguno se puede perder.** No hay acierto, error, puntaje, contador ni
  tiempo (Constitución V). No es una decisión de diseño de esta capa: el
  propio contenido lo declara con `anyAnswerValid`, `anyOrderValid` y
  `speedRequired: false`.
- **Todo el texto sale de `content/`.** Tarjetas, respuestas, la reacción de
  Capi y el botón de parar, con su texto, su tecla y su destino.
- **Se puede parar siempre.**

La celebración (`reward`) es cosmética y por completar, nunca por acertar: el
contenido lo declara (`conditionalOnPerformance: false`) y el motor lo sostiene
pasando sus flags por la misma allowlist que todo lo demás, que los ignora.

**Lo escrito en código y pendiente de validar**

Cuatro rótulos de acción: «Tu brújula», «Chocar las manos», «Arma el puente» y
«¡Lo lograron juntos!». Son de interfaz —nombran lo que hay que hacer, no lo
que alguien dice—, pero un niño los lee, así que deberían mudarse a
`localization` cuando el contenido pase la revisión de Arianna.

## Episodio 2 — «Mi círculo de 3»

Fecha: 2026-09-17. El guion no se inventó: está escrito por el equipo en
`YAIS-RED/wiki/narrative/isla-de-los-acuerdos-guiones.md` §2, y lo que se hizo
aquí fue estructurarlo. Cada línea de diálogo es literal del guion; lo que
aporta el repositorio son los ids de nodo, las conexiones y la configuración de
los minijuegos.

**Lo que hay**

- `content/episodes/ep02-circulo.json`: 5 escenas, 42 nodos, 83 textos y **15
  marcas `review: "VALIDAR"`**, las mismas que el guion señala.
- Dos minijuegos nuevos, con tipos y esquema propios: fichas de confianza
  (`trust_cards`) y mi círculo de 3 (`circle_of_three`). En los dos, el
  esquema exige `storeAnswers: false` de forma literal —no basta con
  declararlo— porque guardar lo que un niño clasificó o en quién pensó sería
  un perfil (Constitución I y III).
- Cuatro iconos SVG nuevos (corazón, casa, escuela, comunidad) y cuatro
  intenciones de animación nuevas, todas marcadas como relleno: no hay clip de
  mano en el hombro, de señalarse, de entregar algo ni de guiño.
- `shared/episodios.ts`: registro de episodios. Añadir el episodio 3 es añadir
  una línea; los tests del esquema y del mapa de animaciones recorren la
  carpeta entera, así que un episodio nuevo queda cubierto sin tocarlos.
- Un selector de episodio en la barra de quien acompaña, con los títulos que
  cada episodio trae en su propio contenido.

**Reglas del guion que el código sostiene**

- Las fichas hablan de **conductas, nunca de personas**. Y no se pueden
  fallar: si la ficha va donde el guion no esperaba, Capi pregunta; al segundo
  desvío da una pista; **al tercero la coloca él y lo explica**, que es lo que
  garantiza que el juego siempre avance. Ese tercer paso faltaba y lo encontró
  un recorrido automático que se quedó dando vueltas para siempre.
- «Todavía estoy pensando» ilumina el círculo igual que haber pensado en tres
  personas. Es el caso de un niño sin tres adultos de confianza, y el guion
  decide a propósito que no se note como fracaso. Hay test.

**Comprobado en el navegador**

El episodio 2 se recorre entero: 57 pasos hasta el cierre, con el minijuego de
fichas, la decisión de a quién pedir ayuda —que devuelve a la pregunta cuando
se elige a un amigo, como dice el guion— y el círculo de 3.

**Lo que hay que decidir antes de usarlo**

- **Terminar el episodio 2 no guarda nada.** SPEC-001 AC-5 solo permite
  persistir `ep01.completed`, así que `ep02.completed` se ignora con
  diagnóstico, igual que los demás. Encadenar los episodios de verdad exige
  antes una decisión de spec sobre qué puede sobrevivir a la sesión.
- Las 15 líneas `[VALIDAR]` del episodio 2 incluyen las tres más delicadas
  según el propio guion: la definición del círculo, el «pueden ser de tu casa,
  de tu escuela o de tu comunidad» y el «tu profe o tu familia te pueden
  ayudar a encontrar más personas». Ninguna está aprobada.
- Los tres textos de los sitios del círculo —«Casa», «Escuela»,
  «Comunidad»— se tomaron palabra por palabra de la línea aprobada que los
  nombra, pero son texto nuevo en pantalla y deberían revisarse como tal.

## Pendientes y riesgos abiertos

- Assets versionados en git normal (222 MB). Cada versión futura de un GLB de
  16 MB engorda el historial de forma permanente. Decisión tomada por el equipo.
- Lint sin reglas `type-aware`: el rigor de tipos lo cubre `tsc` estricto.
- Bundle base de 220 kB (69 kB gzip) que es solo React. Es la línea base contra la
  que se medirán los GLB.
- Preguntas abiertas de SPEC-001 sin respuesta: escena de Don Beto (decide
  Arianna) y si el distintivo de borrador incomoda en la demo (decide el equipo).
- Nada de esto está validado con niños, ni pedagógicamente, ni en móvil.
- Guardarraíl para tareas futuras (revisión de content-guardian, T-001-04): la
  variable de sesión `insistedLuna` registra que el jugador pasó por encima de
  un «no». Hoy vive en memoria, se borra al cerrar el episodio y ningún nodo la
  lee. No debe persistirse, ni mostrarse al docente, ni usarse para cambiar
  cómo el juego trata a quien juega (Constitución III).
- Cuando se implemente `branch`, la rama verdadera de `s06_b001` lleva a
  `s06_n003`, marcada `[VALIDAR]`: es el punto más delicado del guion y decide
  Arianna, no el equipo de desarrollo. Mientras tanto el runtime cae siempre a
  la rama `else`, que es la que no insiste.
- Los `setFlags` del nodo `reward` (`s07_rw001`) todavía no se ejecutan. Cuando
  se implementen deben pasar por la misma función que el resto
  (`aplicarFlags`), o la allowlist deja de ser el único paso hacia el
  almacenamiento.

## Guía verbal de Arianna sobre «contarle a alguien» — 2026-09-18

Arianna (psicóloga del equipo, única persona que aprueba contenido infantil,
Constitución IV) dejó una aclaración verbal, transcrita tal cual, sobre cómo
debe funcionar el mensaje de «contarle a alguien» dentro del episodio 1.
Resumen fiel de lo que dijo:

- **El juego nunca simula que el niño le cuenta algo a Capi, a la profe o a
  cualquier NPC.** Esto no es un cambio: confirma lo que ya exige la
  Constitución II («la app no recibe revelaciones»; no hay chat, diario ni
  campo donde un niño escriba lo que le pasó).
- **Lo que sí debe pasar** es que Capi transmita, como mensaje general de
  prevención y no como respuesta a un caso concreto, que si el comportamiento
  de una persona adulta incomoda o se siente raro, eso se cuenta a una
  persona adulta de confianza, **real, fuera del juego**. Es enseñar el
  concepto, no simular la revelación.
- **Sobre un botón de ayuda/emergencia** (una idea que se propuso y que ya se
  había descartado antes de esta aclaración, nunca llegó a construirse en el
  código): Arianna confirma que sería engañoso, porque la Defensoría de la
  Niñez no atiende al instante — un botón así prometería una respuesta
  inmediata que el sistema real no puede dar. No hay nada que borrar en
  `app/src/` ni en `content/` porque nunca se implementó; queda cerrado aquí
  como decisión documentada, con la razón de Arianna sumada a las razones que
  ya estaban registradas en este archivo y en `spec.md`.

**Auditoría del guion existente contra esta guía**

Se revisaron `s06_adultos` (Don Beto insiste con un abrazo) y
`s07_reconstruccion` (cierre) completas en
`content/episodes/ep01-saludo.json`, nodo por nodo, no solo las dos líneas
señaladas:

- `EP01_S07_L003` (Capi, cierre): «Y si tu brújula marca uh-oh, lo puedes
  contar a una persona grande de confianza.» — Este mensaje **ya cumple** la
  guía de Arianna casi palabra por palabra: es prevención general (no
  reacciona a un caso concreto), nombra explícitamente a una persona adulta
  de confianza, y no le pide al niño que se lo cuente a Capi. No se tocó.
- `EP01_S07_L005` (Capi, última línea del episodio): «Gracias por ayudarme.
  Ahora conversemos con tu profe o tu familia.» — Es una invitación al
  debrief con adultos reales (la pantalla de cierre es `adultOnly: true`), no
  una simulación de revelación. Coherente con la guía. No se tocó.
- `EP01_S06_F002` (Capi, justo después de que Don Beto se detiene al notar
  duda): «A veces cuesta decir no. Si no puedes, no es tu culpa. Y siempre lo
  puedes contar.» — Esta línea ya tenía `reviewPriority: "critical"` y sigue
  sin `review: "VALIDAR"` desde la aprobación general del 2026-09-18 (ver
  aviso más arriba en este archivo), pero el aviso mismo la deja listada como
  pregunta abierta. Frente a la guía de Arianna, es la línea con más
  ambigüedad real: no dice a quién contarle, y aparece inmediatamente después
  de que Capi mismo intervino en la escena, así que un niño podría leerla
  como «cuéntamelo a mí». No se editó esta línea — está fuera del alcance
  que se me dio y ya es una pregunta abierta formal de `spec.md` con
  historial propio.

**Decisión: se agregó UNA línea nueva, marcada sin aprobar**

En vez de tocar `EP01_S06_F002`, se agregó un nodo nuevo inmediatamente
después, `s06_f003` (locId `EP01_S06_F003`), que Capi dice antes de que la
escena siga con la profe Clara. Texto propuesto (es-BO, mismo registro que el
resto de la escena):

> «Fuera de la isla, se lo puedes contar a una persona grande de confianza de
> tu familia o tu escuela.»

Nombra explícitamente a la persona adulta de confianza y usa la metáfora ya
establecida del juego («la isla») para decir «en la vida real» sin romper el
tono infantil. No menciona a Capi, a la profe ni a ningún NPC como quien
recibe la confesión; solo transmite la recomendación general. El nodo lleva
`"review": "VALIDAR"` (el campo real que hace aparecer el distintivo
«Borrador no validado» en tiempo de ejecución, ver `esperaValidacion` en
`app/src/engine/runtime.ts`) y un `reviewNote` que cita que la propuesta se
basa en la guía verbal de Arianna del 2026-09-18, transcrita, y que falta su
aprobación de esta redacción exacta — el concepto ya lo confirmó ella, la
redacción no.

No se tocó `EP01_S06_F002` ni ninguna otra línea existente. Se verificó con
`npx vitest run src/engine` (84 tests, verde) desde `app/` y con
`node scripts/check-safety.mjs` desde la raíz (sin violaciones nuevas; las
dos advertencias de `AC-5-flags-ignorados` son preexistentes y no tienen
relación con este cambio).

Queda pendiente, y no es una decisión que le corresponda a quien escribió
esto: que Arianna revise la redacción exacta de `EP01_S06_F003` y decida si
`EP01_S06_F002` necesita ajustarse también, dado que ambas están ahora en la
misma pregunta abierta de `spec.md`.

## 2026-09-18 — Botella y plantín repartidos en el primer anillo

Los cinco basureros (`recycling_bin`) que se agregaron antes en `isla-partida`
ya se ven bien, pero el usuario reportó que no encontraba la botella
(`water_bottle`) ni el plantín (`seedling`): había solo una unidad de cada uno,
apretados en el mismo rincón de `isla-partida` junto a `water_drop` y otro
basurero. Pidió al menos cinco botellas y cinco plantines, repartidos en islas
distintas, sin amontonarlos todos en el mismo sitio.

Se repartieron en seis islas del primer anillo (no en `isla-partida`, que ya
tenía 14 piezas; no en el segundo/tercer anillo, que quedan lejos del punto de
partida):

- `isla-faro`: botella + plantín
- `isla-mirador`: botella + plantín (la isla con más margen disponible)
- `isla-caleta`: botella + plantín
- `isla-lago`: botella + plantín (sin ancla de personaje, la más holgada)
- `isla-palmeras`: solo botella (ya tenía 4 piezas más el ancla de
  `enc-luna-palmeras`; no había margen cómodo para dos props nuevos)
- `isla-arenal`: solo plantín (tiene DOS anclas de personaje,
  `enc-tomi-arenal` y `enc-clara-arenal`, más apretada que el resto)

Cada posición se verificó con el mismo método que ya se usó para corregir
`isla-partida`: un script desechable (`npx tsx`, borrado antes de terminar)
que reproduce `decoradoDeIsla` y confirma que la pieza cae donde se pidió
(`movido=false`) con margen positivo contra el borde caminable, contando
también el choque contra senderos, puentes y las zonas circulares de las
anclas de personaje (`enc-*`) cercanas. Donde el radio genérico
(`RADIO_DECORATIVO = 0.45`) no dejaba margen positivo (`isla-palmeras`,
`isla-arenal`), se usó el mismo campo opcional `radio` de `DecorPropuesto` que
ya existía para `isla-partida`, con un valor ajustado al tamaño real de cada
modelo.

Hallazgo colateral, no corregido porque está fuera del alcance de esta tarea:
al correr el mismo verificador sobre el decorado YA EXISTENTE de estas seis
islas (banco, palmera, flor, etc.), varias piezas arrojan margen negativo —
es decir, el mismo bug de colisión que se corrigió solo en `isla-partida`
también afecta decorado preexistente de otras islas del primer anillo. Queda
pendiente decidir si abrir una tarea aparte para revisar y corregir esas
islas también.

Limitación técnica registrada, no implementada: el pedido incluía que alguna
botella se viera «tirada» en el suelo en vez de de pie. `PiezaDelMundo` (en
`IslandScene.tsx`) solo admite `rotationY` (giro sobre el eje vertical); no
hay soporte para inclinar un modelo en los ejes X/Z. Agregarlo sería un
cambio de mayor alcance al componente y a `DecorPropuesto`, no una tarea de
colocación — no se implementó.

Verificado en verde: `npx vitest run src/game/scene/colocacion.test.ts` (19
tests), `npx tsc -p tsconfig.app.json`, `npx eslint
src/game/scene/IslandScene.tsx`, `node scripts/check-safety.mjs` (sin
violaciones nuevas), y `npm run verify` completo desde la raíz (317 tests,
build verde, sin advertencias nuevas de `check:safety`).
