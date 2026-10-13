# Producción 3D por etapas

Actualizado: 2026-09-17. Punto de entrada para reanudar sin releer la conversación.

**Entrada actual: `assets/production/index.html#npc`.** Catálogo local con la mascota v005, 40 piezas de escenario/arquitectura/objetos y cuatro NPC nuevos. Diego aprobó la fidelidad artística de la entrega anterior el 2026-09-17 y pidió continuar con los NPC; los nuevos personajes quedan para revisión. Sigue pendiente la preparación para móvil. Mascota v001 fue rechazada y v002–v004 se conservan como antecedentes.

## Forma de trabajo

Una entrega revisable por sesión. Cada entrega incluye script reproducible, versión nueva, BLEND, GLB, métricas y previsualización del modelo real. Guardar primero los modelos y después renderizar: un fallo de render no pierde el modelado. No iniciar Blender gráfico. Render CPU con dos hilos, una vista por proceso y resolución moderada. Esto limita carga; no diagnostica ni garantiza evitar los reinicios del equipo.

No hay presupuesto numérico de tokens fijado. Controlamos alcance con etapas pequeñas, no con estimaciones de consumo. Si se interrumpe la conversación, revisar archivos y estado antes de repetir trabajo.

## Secuencia

| Etapa | Entrega | Criterio para avanzar | Estado |
| --- | --- | --- | --- |
| 01 | Mascota estática v001, materiales y cuatro vistas | Revisar silueta, cara, mochila y similitud | Descartada visualmente por Diego: no se parece a la referencia |
| 02 | Correcciones de mascota y geometría preparada para deformación | Sin intersecciones visibles; forma aceptada | Fidelidad artística v005 aprobada; topología de deformación pendiente |
| 03 | Rig, pesos y pruebas de articulaciones | Hombros, caderas y cara deforman bien | Primera pasada en 5 personajes; pulido de articulaciones y cara pendiente |
| 04 | Idle y caminar; luego correr y gestos en entregas separadas | Clips exportados y reproducibles | 25 clips en animated/v001; correr y transiciones pendientes |
| 05 | Terreno, senderos, rocas y vegetación | Escala, encaje y colisiones verificadas | Modelos estáticos world/v001 generados; integración de colisiones pendiente |
| 06 | Puente; casa; faro, un objeto por entrega | Vistas y módulos coherentes | Puentes, casa y faro generados en world/v001; sin interiores ni animaciones |
| 07 | Props por familias: mochila/tokens, decisiones, ambiente | Pivotes y estados interactivos | 20 modelos estáticos props/v001 generados; estados y lógica pendientes |
| 08 | Cuatro NPCs, procesados individualmente; después rig y clips | Consistencia y deformaciones | Estáticos conservados; primera pasada de rig y cinco clips por NPC; pulido pendiente |
| 09 | Escena web, cámara y controles móviles | Probar en teléfono objetivo | Pendiente; stack de app actualizado a React/R3F por decisión 005 |
| 10 | Episodios narrativos, uno por entrega | Decisiones, feedback, accesibilidad | Pendiente |

## Etapa 01

Fuente: `assets/references-3d/technical/01-mascot-orthographic-turnaround.png`.
Script: `scripts/production/mascot.py`.
Comando: `powershell -NoProfile -File scripts/production/run-mascot.ps1 -Action build`.
Previews: repetir con `-Action front`, `three-quarter`, `side`, `back`.
Salida: `assets/production/mascot/v001/`.

La v001 es una maqueta de forma con piezas separadas, sin rig, animaciones ni collider de juego. No llamarla modelo final. La reconstrucción procedural no convierte automáticamente la imagen en una malla idéntica; las vistas generadas se usan como guía, no como medidas exactas. El pelo se representará por color y pequeños volúmenes, evitando hebras individuales.

## Reanudación

### Punto vigente — rigs y animaciones, 2026-09-17

Diego autorizó avanzar con rig y clips. Primera pasada en `assets/production/animated/v001/`, independiente de los originales estáticos: capibara v005 y cuatro NPC vigentes conservados. No sustituye la aprobación artística ni representa retopología final.

- **5 esqueletos de deformación / 25 clips**: `Idle`, `Walk` (o `Roll` para la silla), `Wave`, `Listen`, `TalkGesture`.
- 17 huesos por personaje; 22 para la niña, con silla, ruedas principales y delanteras articuladas. Una malla de autoría por personaje; siguen existiendo 12–20 primitivas de material, NO un único draw call.
- Pesos normalizados, máximo 3 influencias por vértice. Se conservan materiales, colores por vértice y triángulos de las versiones estáticas.
- Exportación GLB con skin y clips; `.blend` editable con acciones y pistas NLA. En Blender las pistas se guardan silenciadas para mostrar reposo: activar UNA pista para revisar, no todas a la vez.
- **31.134.044 bytes** de GLB en el conjunto: capibara 16.412.600; explorador 2.049.840; silla 5.737.816; educadora 2.607.540; guía 4.326.248. Sin compresión, LOD ni rendimiento móvil/aula validado. Cargar solo el personaje necesario.
- `verification.json` por personaje: reimportación real de GLB, movimiento, continuidad inicio/final, coordenadas finitas y altura de suelo en cinco muestras por clip. NO comprueba todas las intersecciones ni todos los fotogramas.
- `manifest.json`: comprobación binaria independiente de skins, índices, pesos, posiciones y clips; SHA-256 de fuentes y entregables; duración real de exportación. El exportador conserva el primer key en 1/30 s, de modo que el runtime tiene ~0,033 s adicionales respecto de la duración de autoría: usar el manifiesto, no asumir duración redonda.

Revisar en `assets/production/animated/v001/index.html`, con dos renders por personaje y enlace al visor. Este permite seleccionar clip, reproducir/pausar, velocidad y búsqueda temporal; empieza pausado y se pausa al ocultar la pestaña. La carga del componente visor depende de Google CDN; hay imagen estática alternativa. Los GLB permanecen locales.

Reanudación segura, secuencial, sin interfaz Blender y con dos hilos:

```powershell
& ./scripts/production/run-rigs.ps1 -Render
& ./.tools/node-v22.23.2-win-x64/node.exe scripts/production/verify-rigs.cjs
& ./.tools/node-v22.23.2-win-x64/node.exe scripts/production/rig-gallery.cjs
& ./scripts/production/start-preview.ps1
```

Para un personaje: `-Character mascot` (o identificador NPC). El runner omite los builds completos y renders existentes, vuelve a verificar, y se detiene si hay salida parcial. Para cambiar geometría/animación crear versión nueva, nunca sobrescribir v001. El script de receta es `scripts/production/rig-characters.py`.

**Integración:** el stack de aplicación vigente está en la decisión 005 del vault (`C:\Users\qwert\Documents\YAIS-RED\wiki\decisions\005-stack-visual-react-r3f.md`): React + R3F/drei. Las menciones PlayCanvas en secciones inferiores son históricas. GLB es independiente del motor. El futuro registro `app/src/shared/assets.ts` debe apuntar a las versiones animadas; no se ha creado aquí la app ni modificado la narrativa. Usar `Idle` por defecto; reproducir un gesto y volver a reposo mediante el mixer del motor. Los clips exportados permiten bucle, pero un saludo no debe repetirse indefinidamente en el juego. Posicionar la entidad desde código; todos los clips son **in-place**, sin root motion. `manifest.json` incluye distancia y duración de locomoción para sincronizar desplazamiento; las velocidades son de revisión lenta, no velocidad final de juego. No reutilizar animaciones de un personaje en otro sin retargeting: los esqueletos comparten nombres, no proporciones ni matrices de reposo.

**Pendientes concretos:** retopología y pulido de pliegues/uniones en hombros/caderas; apertura de manos y dedos (las manos conservan el agarre estático); rig facial, parpadeos y lipsync; correr; transiciones; contactos de manos/aro de silla; bake del pelo, materiales/LOD/compresión; colisiones y navegación; pruebas en dispositivo real. Los límites de suelo numéricos no sustituyen revisión artística de postura.

**Compuerta de aplicación pendiente:** todavía no existen `package.json` ni `app/package.json`; por tanto no puede ejecutarse `npm run verify`. Las pruebas de producción de assets no sustituyen typecheck/lint/test/build/check:safety de la futura app ni su revisión independiente de accesibilidad/rendimiento.

### Histórico — punto tras «continúa generando los demás»

Histórico de reanudación: el usuario pidió terminar las afinaciones y después seguir con los demás assets. En ese momento se había completado la pasada de mascota v005 y todavía no se daba aprobación artística. **Actualización posterior (2026-09-17):** Diego aprobó la fidelidad artística de la entrega anterior y se generó el lote de NPC; no se creó un rig provisional sobre la malla densa.

- **Mascota v005**: `scripts/production/mascot-v005.py`, basada en el BLEND v004. Nuevo abdomen, dedos volumétricos, cabeza y hocico unidos, ojos/nariz/boca proyectados sobre la superficie y correas planas. 48 mallas, 226.374 triángulos, 9.659.300 bytes GLB. Reimportación Blender y comprobación binaria correctas. Cuatro PNG y galería en `assets/production/mascot/v005/`. Comando: `& ./scripts/production/run-mascot.ps1 -Version v005 -Action build`, o acciones `front`, `three-quarter`, `side`, `back`, `verify`. No repetir build sobre la versión existente.
- **Mundo v001**: `scripts/production/world-kit.py`, 18 piezas de entorno y 2 de arquitectura. Islas grande/pequeña, césped, caminos recto/curvo, agua, puentes recto/curvo, dos vallas, escalera, árbol, palmera, dos rocas, arbusto, banco, nube, faro y casa. 274.108 triángulos y 7.959.320 bytes en la suma de los 20 GLB. Cada pieza tiene BLEND, GLB y `asset.json`. Las cajas/cápsulas de colisión están propuestas en JSON Z-up, NO implementadas en PlayCanvas. No confundir lámina normalizada con escala real.
- **Objetos v001**: `scripts/production/props-kit.py`, 20 piezas: mochila, brújula, mapa, diálogo, círculo de tres, regalo, sobre, corazón, tres tarjetas, gota, botella, reciclaje, brote, tres fichas de puzzle y símbolos pausa/sonido. 50.284 triángulos y 1.574.672 bytes en la suma de los GLB. Modelos estáticos: regalo/sobre no se abren; las fichas de puzzle son decorativas y no tienen encajes funcionales. La mochila procede de v005. No sustituir los controles accesibles del juego por estos símbolos decorativos.

Para mundo/objetos, ejecutar Blender en background con `--threads 2 --python-exit-code 1 --python scripts/production/world-kit.py -- build` o `props-kit.py -- build`. Las acciones de render son `environment`, `architecture` para mundo, y `props` para objetos. Guardan láminas PNG en sus carpetas v001. La generación guarda cada pieza por separado y puede reanudarse antes de terminar el manifiesto. Si ya existe `manifest.json`, no sobreescribir: revisar primero y crear una versión nueva para cambios de geometría.

Validación de lotes: `& ./.tools/node-v22.23.2-win-x64/node.exe scripts/production/verify-production.cjs`; pasaron 40/40 GLB (binarios, posiciones finitas, materiales, triángulos, archivos BLEND y propuestas de colisión). No equivale a QA de física, rendimiento o aprobación artística. Los renders se generan reimportando esos mismos GLB.

Catálogo local: `assets/production/index.html`. Para abrirlo por HTTP sin Blender, ejecutar `& ./scripts/production/start-preview.ps1`; imprime la URL `YAIS_PREVIEW_URL` actual en `assets/production/preview-server.out.log`. El puerto puede cambiar tras reiniciar. Alternativa directa: `& ./.tools/node-v22.23.2-win-x64/node.exe scripts/production/preview-server.cjs`. Solo sirve arte de producción, referencias y este plan; no expone `raw/`. Verificación: `verify-preview.cjs` comprueba enlaces/rutas, el servidor y que `raw/` no se sirva. El archivo HTML conserva acceso sin conexión aunque el servidor se cierre.

Los enlaces **Ver 3D** abren `assets/production/viewer.html`, un visor WebGL local para GLB con rotación, zoom y botones frente/tres cuartos/perfil/espalda. El visor usa el componente `model-viewer` cargado desde Google CDN; se requiere Internet la primera vez para cargar el visor, pero los GLB permanecen locales. Los archivos `.blend` no tienen visor web estándar: se descargan y se abren con Blender.

QA de lote: revisar las láminas `world/v001/environment.png`, `architecture.png` y `props/v001/props.png`. Las piezas se muestran normalizadas para comparación, NO a escala relativa de juego. Las láminas se pueden regenerar sin modificar los modelos. Se separaron más las filas de objetos para evitar que sus símbolos se tapen y se muestra la mochila desde el lado de la estrella.

**Lote actual (2026-09-17):** personajes de `technical/02-primary-child-npcs-turnaround.png` y `03-trusted-adults-turnaround.png`, uno por uno con sus cuatro vistas. Script `scripts/production/npc-kit.py`, salidas `assets/production/npc/v001/` y `v002/`. La aprobación del usuario corresponde a los assets anteriores, no se extiende automáticamente a los NPC nuevos. Después: revisión de NPC, topología para deformación, rig, animaciones, optimización y escena jugable móvil. No afirmar que todos los assets del juego están terminados.

### NPC — punto de control

Los cuatro NPC se generan con ropa, peinados y accesorios basados en las hojas. El niño tiene camiseta de ola, shorts cargo y mochila azul; la niña, moños, camiseta de flor, mochila morada y silla manual con ruedas florales; la educadora, sobrecamisa azul, libro y credencial; el guía, gorra, chaleco, barba y bolso. Son interpretaciones geométricas, no una reconstrucción exacta de las ilustraciones. No se han inventado nombres personales ni relatos de menores.

Versión vigente: `child_explorer` en **v001**; `child_wheelchair`, `educator` y `community_guide` en **v002**. Las primeras versiones se conservan. QA de perfiles detectó separación de correas y forma inadecuada de flequillo/espalda de prendas; v002 ajusta esas superficies. No tratar las versiones iniciales como la entrega vigente de esos tres personajes.

| NPC | Versión | Triángulos | GLB (bytes) |
| --- | --- | ---: | ---: |
| Niño explorador | v001 | 57.600 | 1.165.484 |
| Niña en silla de ruedas | v002 | 149.252 | 3.451.292 |
| Educadora | v002 | 74.636 | 1.395.200 |
| Guía comunitario | v002 | 117.860 | 2.537.604 |

Total vigente: **399.348 triángulos / 8.549.580 bytes GLB**. Reimportación Blender de los cuatro modelos y comprobación independiente de binarios, índices, materiales y 16 PNG superadas. No representa FPS ni presupuesto móvil validado. Las galerías se generaron desde las fichas y el catálogo enlaza las versiones vigentes.

Reanudar: `& ./scripts/production/run-npcs.ps1`. Procesa secuencialmente, omite modelos y PNG ya guardados, verifica la reimportación y genera el manifiesto con versiones mixtas en `npc/v001/manifest.json`. Para un personaje, usar `-Character educator` u otro identificador. No sobrescribe geometría guardada. Si hay un BLEND guardado sin ficha tras un fallo, revisar ese estado antes de repetir el build.

Acciones individuales: Blender `-b -t 2 --python-exit-code 1 --python scripts/production/npc-kit.py -- build ID`, `verify ID` o `render ID three-quarter` (también `front`, `side`, `back`). **Añadir `--refine` para trabajar con v002**; sin el flag se usa v001. Los renders reimportan los GLB. La acción `lineup` utiliza las versiones vigentes y conserva las alturas relativas.

Galerías: ejecutar Node portable con `scripts/production/npc-gallery.cjs` después de completar el manifiesto. Verificación binaria/índices/materiales/16 PNG: `scripts/production/verify-npcs.cjs`. Enlaces y rutas HTTP: `scripts/production/verify-preview.cjs http://127.0.0.1:64494` (usar puerto actual si cambia).

Falta en este lote: retopología para deformación, UV/bake, rig, pesos, expresiones, clips, LOD/optimización de draw calls y colisiones implementadas. La silla tiene piezas separadas por nombre, todavía sin jerarquía de rotación/rig. Las propuestas de collider solo contienen forma y límites, no física funcional. Las fichas expresan límites y orientación en coordenadas de autoría Blender (Z arriba, frente −Y); la exportación GLB usa la conversión estándar glTF (Y arriba). No afirmar rendimiento móvil ni finalización de todos los assets del juego.

### Historial de iteraciones de mascota

Pedido vigente: Diego exige respetar la mascota aprobada en imágenes; no rediseñar el personaje ni aceptar la maqueta de oso de v001. Fuentes visuales: hoja técnica 01 y `assets/references-3d/03-mascot-turnaround-3d.png`.

Se generan revisiones estáticas v002/v003 con cabeza ensanchada abajo, hocico vertical con fosas nasales, menos blanco en ojos, manos marrones sujetando correas, mochila con estrella y pelaje corto geométrico. v002 es una iteración interna: el pelaje se veía granulado y las orejas grandes. v003 reduce las orejas, integra el hocico y usa hebras más finas, tonos más cálidos y transición de cuello. No tratar ninguna como aprobada por el usuario.

Script de ambas revisiones: `scripts/production/mascot-v002.py`; el flag `--refine` selecciona la receta v003. Desde PowerShell: `& ./scripts/production/run-mascot.ps1 -Version v003 -Action build`. Para las vistas, cambiar `build` por `three-quarter`, `front`, `side` o `back`; para comprobar el GLB, `verify`. No ejecutar `build` si ya existe el BLEND: los modelos se conservan. v001 mantiene su script y sus archivos.

v003 prioriza revisión artística: 183.010 triángulos y GLB de 5.914.988 bytes sin compresión. NO es la malla móvil final. Falta pasar el detalle de pelo a texturas/normal maps, retopología, rig y pruebas en el motor. No asumir que más detalle implica igualdad con la referencia. Comprobar todas las vistas y recoger la revisión de Diego antes de seguir con animaciones.

La revisión entregable v004 añade normales exteriores consistentes en las hebras, pelaje separado de la superficie para hacerlo visible y color por vértice con rubor difuso (sin parches flotantes). Script compartido `mascot-v002.py`, flag `--surface-final` (final de esta pasada de superficie, NO aprobación final del personaje). Comandos: `& ./scripts/production/run-mascot.ps1 -Version v004 -Action build`, y `three-quarter`, `front`, `side`, `back`, `verify` como acciones separadas. Métricas: 183.182 triángulos, 12 materiales usados, GLB de 8.297.300 bytes. Conservar las revisiones anteriores; no reconstruir sobre un BLEND ya guardado.

Validación independiente: `& ./.tools/node-v22.23.2-win-x64/node.exe scripts/production/verify-mascot-glb.cjs v004`. Comprueba cabecera/binarios, posiciones finitas, número de triángulos y conservación del color por vértice. Pasó con 55 mallas y 8 primitivas coloreadas. No es una prueba de rendimiento ni de similitud visual.

QA artística de frente/tres cuartos v004: mejora visible del hocico vertical, tamaño de orejas, pelaje y pose respecto de v001. Aún no es idéntica a la referencia: abdomen menos abultado, manos simplificadas, correas con sección redonda, diferencias de perfil y acabado. La referencia tiene un pelaje más suave y orgánico. No afirmar que se alcanzó el objetivo de igualdad ni pasar a rig sin resolver la revisión visual.

Entrega v004 finalizada para revisión: cuatro PNG (frente, tres cuartos, perfil, espalda), galería comparativa local, BLEND, GLB y `verification.json` con reimportación correcta de las 55 mallas. Todos los renders se completaron secuencialmente, CPU y dos hilos. En perfil todavía se aprecia demasiado relieve de los ojos y de las piezas del hocico respecto de la referencia: revisar integración facial en la siguiente pasada si se mantiene esta base.

Observación de calidad v001: el modelo tiene apariencia de muñeco/oso; necesita hocico más característico de capibara, orejas menores y mejor transición cabeza-cuerpo. Superficie y colores más planos que la referencia. Antes de rigging, priorizar estos cambios en v002. Etapa 01 entrega una maqueta revisable, no alcanza aún la calidad artística objetivo.

El GLB v001 tiene 22.816 triángulos y 552.476 bytes sin compresión. La galería `assets/production/mascot/v001/preview.html` funciona sin conexión y muestra cuatro renders estáticos. No se ha probado todavía en PlayCanvas ni en teléfono.

Leer este archivo y el catálogo `assets/production/index.html`. Para la mascota, consultar v005; para lotes, sus `manifest.json`; para NPC, consultar `assets/production/npc/v001/manifest.json` y el control de versiones descrito arriba. Conservar todas las versiones anteriores. El siguiente lote técnico es preparar topología, rig, animaciones, LOD y colisiones, sin reconstruir lo ya guardado.
