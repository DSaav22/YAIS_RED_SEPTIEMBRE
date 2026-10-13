# QA del vertical slice — SPEC-001 (T-001-07)

Fecha: 2026-09-17.

Qué es este documento: el registro de qué se probó, cómo, y qué salió. Qué no
es: un certificado de que el prototipo está listo para un aula. No hay ni una
sola sesión con niños detrás de estas líneas, ni una medida tomada en la laptop
o el proyector reales. Constitución IX: lo que no se midió se dice que no se
midió.

## Cómo se probó

- Navegador Chromium del panel de desarrollo, sobre `npm run dev`.
- Suite automática: `npm run verify` (typecheck, lint, 109 tests, `check:safety`
  y build).
- Dos recorridos completos del episodio, uno por modo de edad, hasta la
  pantalla de cierre.
- Inspección directa de almacenamiento, cookies y peticiones de red desde la
  propia página.

Hallazgo del entorno que conviene saber al leer el resto: **el navegador de
pruebas tiene `prefers-reduced-motion: reduce` activo**. Eso verificó AC-7 en un
navegador real sin proponérselo, y obligó a desactivar esa preferencia dentro de
la página para poder observar el movimiento.

## Criterios de aceptación

| Criterio | Resultado | Cómo se comprobó |
| --- | --- | --- |
| AC-1 — error de desarrollo legible si el JSON no valida | cumple | Tests del esquema con JSON corrupto y referencias rotas; el runtime devuelve diagnóstico en vez de lanzar, y un episodio con ciclo de escenas termina en un aviso, no en un cuelgue. |
| AC-2 — avanzar sin sonido de error, sin puntaje, sin bloquear | cumple | Recorridos completos: no existe estado de acierto ni de error en el motor ni en la interfaz; `check:safety` lo vigila por nombre. |
| AC-3 — ocultar lo que no es del modo de edad | cumple | El saludo de Capi ofrece cinco opciones en 6-8 y seis en 9-12; las preguntas del debrief se filtran igual. Elegir una opción que el modo no muestra no cambia el estado. |
| AC-4 — reintentar sin penalización | cumple | Cambiar de saludo cinco veces seguidas deja exactamente la última elección y ninguna marca de intento. Desde el cierre se vuelve a jugar. |
| AC-5 — cierre con acuerdo del día y solo `ep01.completed` | cumple | Al terminar, `localStorage` contiene una sola clave, `yais.ep01.completed=true`; `sessionStorage` y cookies vacíos, también a mitad de partida. |
| AC-6 — un puntero y objetivos de 44×44 | parcial | Todo control lleva la clase que aplica el mínimo y un test comprueba que ninguno se la saltó. **La medida en píxeles reales no se tomó**: jsdom no calcula diseño. |
| AC-7 — sin animaciones con `prefers-reduced-motion` | cumple | Comprobado en navegador real: sin caminata, sin clips, el personaje colocado en su sitio y el bucle de render apagado. En 2D no hay ninguna animación que apagar. |
| AC-8 — caer a 2D sin WebGL | cumple | Sin WebGL no se descarga ni el motor 3D ni un GLB. Además ocurrió de verdad: con el servidor de desarrollo en mal estado, el `import()` de la escena falló y el episodio siguió jugándose en 2D. |
| AC-9 — ninguna petición con datos del jugador | cumple | Cero peticiones fuera de `localhost` en los dos recorridos. El contenido viaja en el paquete y los diagnósticos se quedan en consola, solo en desarrollo. |
| AC-10 — distintivo de borrador visible | cumple | Está en las cuatro pantallas, sin prop que lo apague, y es `sticky` para que no se escape con el scroll. |

## Medidas tomadas

| Qué | Valor |
| --- | --- |
| Recorrido 9-12, escritorio | 67 pasos hasta el cierre |
| Recorrido 6-8, 375 px de ancho | 66 pasos hasta el cierre, **cero** desbordes horizontales |
| Almacenamiento al terminar | `yais.ep01.completed=true`, y nada más |
| Peticiones fuera de `localhost` | 0 |
| GLB descargados en todo el episodio | 3: isla, Capi y Tomi. Luna, Clara y Beto nunca |
| Paquete principal | 353 kB (106 kB gzip) |
| Chunk de la escena 3D | 974 kB (260 kB gzip), solo si hay WebGL |
| Bucle de render, escena asentada | 0 llamadas de dibujo en 1,5 s, también con dos personajes |
| Bucle de render, cambio de escena | 1665 llamadas en 700 ms mientras entran caminando |
| Presupuesto de arte del aula | 23,91 MiB de 25 MiB (95,6 %), con `mascot.glb` como el 65 % |

## Revisiones independientes

**content-guardian** — tres pasadas. Aprobó el motor sin bloqueantes. Rechazó
la primera versión de la interfaz por dos textos infantiles escritos en código
(corregidos: la pregunta de cada decisión es ahora la línea del guion). Rechazó
el slice completo porque la bitácora daba por hecho un aviso de animación que el
código no emitía; se implementó el aviso en vez de rebajar el texto. Sin
bloqueantes abiertos.

**a11y-perf-reviewer** — dos pasadas. Accesibilidad: **pasa**, tras corregir el
contraste del borde de las tarjetas (1,50:1, por debajo del mínimo de 3:1) y
devolverle un encabezado a la pantalla de decisión. Rendimiento: **no pasa**, y
lo que queda no es de código:

- El presupuesto de arte está al 95,6 % y `mascot.glb` son 16,4 MB y 226 374
  triángulos para un personaje que en pantalla mide 288 px de alto. Comprimir y
  decimar ese modelo es la palanca grande, y es trabajo de arte con versión
  nueva: no se sobrescribe la fuente (AGENTS.md).
- Los retratos 2D pesan 1,3 MB entre los dos y se muestran a 128 px.

## Lo que falta medir, y necesita personas o el equipo real

- Cuadros por segundo en la laptop y el proyector del aula, con la ventana al
  frente. Ninguna medida de esta sesión sirve: el navegador limita el bucle de
  animación cuando su ventana está detrás.
- Lector de pantalla real (NVDA, JAWS, VoiceOver). Hay un riesgo concreto
  identificado y sin confirmar: en la primera línea de cada escena el foco se
  mueve al botón antes de que se llene la región que anuncia la línea, así que
  podría oírse «Continuar, botón» antes que lo que dice el personaje.
- Objetivos táctiles medidos en píxeles sobre el dispositivo real.
- Zoom de solo texto al 200 %, con la escena 3D ocupando su franja.
- Descarga con la conexión real de una escuela: cuánto tarda en aparecer el
  primer personaje y si el «pop-in» se percibe como fallo.
- Memoria de vídeo tras una jornada completa y pérdida de contexto WebGL por
  sobrecalentamiento.
- Legibilidad proyectada a varios metros.
- **Nada de esto se ha probado con niñas y niños, ni pedagógicamente.**

## Añadido después de esta verificación

Después de esta verificación, el equipo pidió entrar directo al juego y poder
caminar entre islas. Eso cambió la presentación —sin pantalla de inicio, el
mundo ocupa la ventana, tres islas unidas por puentes, cámara que sigue al
personaje— y añadió un **prototipo de control** (W, A, S, D o tocando el
suelo). Nada de eso forma parte de SPEC-001 ni está cubierto por las medidas de
arriba, y el recorrido, el almacenamiento y la red no cambiaron: caminar no
dispara líneas, no cambia de escena y no afecta a ninguna decisión, así que el
episodio se juega igual sin usarlo. Queda descrito en
[ESTADO-IMPLEMENTACION.md](./ESTADO-IMPLEMENTACION.md); si se queda, necesita
spec propia, un rótulo aprobado que diga que se puede caminar, y probarse en el
aula.

## Decisiones abiertas que no son técnicas

1. ~~**En un build de producción el episodio se detiene en el minijuego de
   `s02_brujula`.**~~ Cerrado después de esta verificación: los cuatro
   minijuegos están implementados como prototipo y el episodio se recorre
   entero. Lo que queda por decidir es de fondo: eso adelanta trabajo que
   SPEC-001 manda a SPEC-004, y la versión final de cada minijuego necesita su
   propia spec.
2. ~~**`reviewPolicy.blockProductionIfPending: true` no está implementado**~~
   Resuelto: el runtime lo cumple desde T-001-06 y no entra por una rama a
   contenido pendiente. Desde el 2026-09-18 no queda ningún nodo marcado (ver
   el aviso al principio de ESTADO-IMPLEMENTACION.md), así que la puerta está
   inerte y solo protege el contenido que se escriba después.
   **Corrección 2026-09-18:** la puerta no está inerte. `content/encuentros/isla-encuentros.json`
   declara `blockProductionIfPending: true` y sus 14 líneas siguen marcadas
   `review: "VALIDAR"`.
3. **El material del debrief (`adultOnly`) se proyecta** en la misma pantalla
   que mira el curso. Es lo que pide SPEC-001; conviene confirmarlo.
4. **Cuando un niño elige «hoy no»**, el personaje se queda en reposo, mientras
   que cualquier otro saludo recibe un gesto. Ejercer el límite es la única
   opción sin respuesta corporal. Es juicio clínico, no de implementación.
5. **La escena de Don Beto** sigue sin decidirse (pregunta abierta de la spec).
   **Corrección 2026-09-18:** ya no es inalcanzable. Las ramas condicionales se
   evalúan (`app/src/engine/condiciones.ts`), así que en modo 9-12 y sin abrazo
   el episodio llega a `s06_n003`.

## Veredicto

El vertical slice cumple los diez criterios de aceptación en lo que puede
comprobarse sin hardware de aula ni personas, y las dos revisiones
independientes quedan sin bloqueantes de código. **No está listo para llevarlo a
un aula**: el guion se declaró aprobado el 2026-09-18, pero falta probarlo con
niñas y niños, falta medir en el equipo real y faltan por decidir los puntos de
arriba que siguen abiertos. Es lo que se lleva a revisión
humana, que es exactamente lo que T-001-07 pide.

## Qué de este informe ha caducado — 2026-09-18

Lo de arriba es el registro de la verificación del 2026-09-17 y **no se
reescribe**: describe lo que se probó ese día, con el build de ese día. Lo que
sigue dice qué partes ya no describen el juego actual. No sustituye la
verificación: **no se volvió a verificar nada.** No se ejecutó `npm run verify`,
ni el build, ni se repitieron los recorridos, y el árbol de trabajo tiene
cambios sin commitear de varios frentes a la vez.

### Medidas que ya no corresponden

| Medida del informe | Por qué caducó |
| --- | --- |
| «GLB descargados en todo el episodio: 3: isla, Capi y Tomi. Luna, Clara y Beto nunca» | Los **cinco** personajes se sirven desde `assets/production/animated/v002`. Cuántos se descargan en un recorrido no se ha vuelto a medir |
| «Presupuesto de arte del aula: 23,91 MiB de 25 MiB, con `mascot.glb` como el 65 %» | La allowlist vigente son 27 archivos y **23,81 MiB**. `mascot.glb` servido pasó de 16 412 600 B a 8 523 400 B (−48 %). Medido en `docs/AUDITORIA-ASSETS.md` §1.1, no en navegador |
| «Paquete principal 353 kB» y «chunk de la escena 3D 974 kB» | Son de un build anterior al mundo abierto, los encuentros, los controles táctiles y el salto. No se ha vuelto a construir |
| «67 pasos» / «66 pasos» hasta el cierre | Ya no se entra al episodio: se entra al mundo y hay que caminar hasta la isla de la misión. El recorrido no se ha vuelto a contar |
| Llamadas de dibujo del bucle de render | Medidas con tres islas, dos personajes y cámara fija. Hoy hay once islas, cinco personajes y cámara que gira |

### La recomendación de rendimiento que sí se atendió

El `a11y-perf-reviewer` marcó **no pasa** por el peso del arte y señaló que la
palanca era comprimir y decimar `mascot.glb` creando una variante nueva, sin
tocar la fuente. Eso se hizo, y de la forma que pedía AGENTS.md: los cinco GLB
bajaron de 31 134 044 B (29,69 MiB) a 16 703 564 B (15,93 MiB), **−46 %**, con
`KHR_mesh_quantization`, sin quitar un triángulo ni un clip, en
`assets/production/animated/v002`, y con las fuentes `v001` intactas y
verificadas por sha256 en las dos direcciones.

Eso **no convierte el veredicto en «pasa»**: el peso bajó, pero el resto de lo
que el revisor dejó abierto sigue sin medirse, y el mundo abierto añadió carga
que nadie ha medido todavía. Los retratos 2D de 1,3 MB no se tocaron.

### Lo que falta medir, ampliado

Todo lo que este informe listó en «Lo que falta medir» sigue sin medir. Se
añade:

- Cuadros por segundo con **once islas y cinco personajes** a la vez, que es
  bastante más de lo que se midió en 2026-09-17.
- Los **controles táctiles** en una tablet y en un celular reales. Hay tests
  de la matemática del joystick y del arrastre, pero **ningún dispositivo
  táctil real** los ha ejercitado. El objetivo declarado del proyecto sigue
  siendo laptop/proyector.
- Si girar la cámara desorienta a una niña o un niño de 6–8 años. El informe
  anterior justificaba la cámara fija precisamente por eso, y esa justificación
  se retiró sin prueba.
- Si un mundo abierto donde hay que caminar tres islas hasta la misión funciona
  en un aula con un solo dispositivo proyectado y 24 personas mirando. Es una
  pregunta pedagógica, no técnica.
- El lector de pantalla, con el añadido de que ahora hay una escena explorable
  que no estaba cuando se identificó el riesgo del foco.

### Criterios de aceptación: qué habría que volver a comprobar

Ninguno se ha vuelto a comprobar. Los que el cambio toca de frente:

- **AC-5** (solo `ep01.completed`). El esquema de encuentros prohíbe por
  construcción escribir en `ProgressStore` y en `sessionVars`, con `.strict()`.
  Está razonado en el código; **no se ha vuelto a inspeccionar el
  almacenamiento en el navegador**.
- **AC-6** (un puntero, 44 × 44). Los controles táctiles añaden objetivos
  nuevos. El joystick declara radio 44 px en `control-tactil.ts`; sigue sin
  medirse en píxeles reales sobre un dispositivo, que es exactamente lo que ya
  estaba marcado «parcial».
- **AC-7** (sin animaciones con `prefers-reduced-motion`). Hay más cosas que
  se mueven: cámara que gira y salto. No se ha vuelto a comprobar.
- **AC-8** (caer a 2D sin WebGL). Si se entra al mundo abierto y el mundo es
  3D, hay que volver a comprobar que sin WebGL se llega igual al episodio.
- **AC-10** (distintivo de borrador). Hay pantallas nuevas.

### Una decisión abierta nueva, que no es técnica

Los **encuentros** (`content/encuentros/isla-encuentros.json`) son texto que un
niño lee, escrito por el equipo y no por Arianna. Sus 14 líneas conservan
`review: "VALIDAR"` y su `reviewNote` lo dice literalmente. Son alcanzables
caminando por el mundo, con el distintivo de borrador como único resguardo,
igual que pasó con `s06_n003` cuando se implementaron las ramas.
