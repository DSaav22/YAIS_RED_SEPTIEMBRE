# QA — primera pasada de rig y clips

Fecha: 2026-09-17. Alcance: assets y visor de producción, NO app final.

## Resultado verificable

- 5 BLEND, 5 GLB, 25 clips y 10 renders exportados. Se conservan los originales estáticos.
- Reimportación Blender de los cinco GLB: pasó. Coordenadas finitas, variación real de vértices, extremos de ciclo coincidentes y límite de suelo comprobados en cinco muestras por clip. Los JSON por personaje contienen las medidas.
- Verificador Node independiente: pasó. Cabeceras/buffers, índices, skin, influencias normalizadas, posiciones finitas, canales y tiempos de animación, materiales y color de pelaje.
- 268 enlaces/medios locales comprobados y rutas HTTP del catálogo/modelos correctas. El servidor solo escucha en loopback; `raw/` no se sirve.
- `check:safety`: pasó para las rutas que inspecciona (`app/src`, `content`). No se añadieron narrativa, identidad infantil ni datos personales.
- `git diff --check`: pasó. Comprobación de sintaxis Node de scripts nuevos: pasó.

## Revisión visual y navegador

- Inspeccionados los diez renders de GLB: saludo y locomoción para los cinco personajes. La silueta/materiales originales se mantienen en esta pasada; esto no convierte la revisión del agente en aprobación artística de Diego.
- Explorador: selección de Wave y Walk, reproducir, pausar, búsqueda a 1,20 s y velocidad 0,5× verificadas en navegador.
- Niña en silla: carga de cinco clips, selección de Roll y postura a 0,85 s (fase de recuperación de brazos) comprobadas en navegador.
- Capibara: carga de cinco clips y postura de Wave a 1,20 s verificadas en navegador. El codo/pelaje del brazo elevado muestra pliegues y una pequeña abertura que necesita limpieza de deformación; no declarar esta pose final.
- Visor a 390 px de ancho: documento sin desbordamiento horizontal (375 px de scrollWidth); botones, selectores y deslizador visibles medidos con altura mínima de 44 px. No equivale a rendimiento ni interacción en teléfono físico.
- El visor inicia pausado; la imagen alternativa ofrece revisión estática. No se simularon desconexión total de CDN ni pérdida de WebGL.

## Revisión independiente

Revisor aparte según `a11y-perf-reviewer`: dos P2 de código de accesibilidad detectados y corregidos: contador temporal con `aria-live="off"`; botón de acción Reproducir/Pausar sin estado toggle ambiguo. El revisor confirmó ambas correcciones. No certifica lector de pantalla, zoom 200 %, teclado completo ni proyector real.

**Rendimiento para distribución aula/móvil: no pasa.** 31.134.044 bytes / 625.722 triángulos / 82 primitivas de material en el conjunto. La capibara supone 16,41 MB. No confundir 30 fps de horneado con FPS medidos. El visor descarga un personaje a la vez; no existe todavía un presupuesto medido por episodio. Dependencia del componente Google CDN pendiente de empaquetado local/offline.

## Límites y siguiente iteración

1. Crear `animated/v002` para cambios; no reconstruir encima de v001. Mantener comparaciones con estáticos aprobados.
2. Pulir hombros/mangas (especialmente recuperación de brazos de silla), caderas, contactos mano-aro y brazos de mascota; revisar desde frente/perfil/espalda en todos los fotogramas. Cinco muestras no detectan todas las intersecciones ni irregularidades entre claves.
3. Las manos mantienen forma de agarre: Wave es un gesto provisional, no una palma articulada. Añadir rig de dedos y cara por separado.
4. Normalizar tiempos de exportación a cero en la siguiente versión o consumir duración efectiva del manifiesto. No sincronizar locomoción con los 1,6/6 s nominales de autoría ignorando el offset de 1/30 s.
5. Bake/retopología del pelaje, materiales, LOD y compresión; después pruebas en hardware objetivo. No afirmar que el aspecto o el rendimiento ya estén aprobados.
6. Integrar clips y transiciones mediante registro de assets en React/R3F; colisiones y navegación pendientes.

## Compuerta no disponible

No existen `package.json` ni `app/package.json` en el estado inspeccionado. Por ello `npm run verify` aún no puede ejecutarse. Estas pruebas de producción no sustituyen la compuerta completa de la app (typecheck, lint, test, seguridad y build). No declarar terminado el módulo de aplicación ni el asset móvil final.

Referencias: [manifiesto](manifest.json), [guía y reanudación](../../../../PRODUCCION-3D.md), [API del componente visor](https://modelviewer.dev/docs/).
