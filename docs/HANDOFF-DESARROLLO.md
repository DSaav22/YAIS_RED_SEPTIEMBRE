# Handoff de desarrollo

Fecha: 2026-09-17.

## Objetivo

Construir una primera experiencia web comprobable del episodio **«Saludo que puedo elegir»**. Debe funcionar primero como UI 2D accesible y luego incorporar Capi, Tomi y el mundo mínimo mediante React Three Fiber.

## Rutas

- Código: `C:\Users\qwert\Documents\yais-game-hackbiz`.
- Wiki/Obsidian: `C:\Users\qwert\Documents\YAIS-RED`.

El código, dependencias y build pertenecen a este repositorio. Investigación, decisiones, negocio e historia pertenecen al vault. No se copió `raw/`.

## Estado recibido

- No hay scaffold ni `package.json` todavía.
- `content/episodes/ep01-saludo.json` contiene el episodio completo en borrador.
- `assets/production/animated/v001/` contiene cinco personajes con cinco clips por personaje.
- El primer hito solo carga Capi y Tomi; los demás se conservan, pero no se precargan.
- El arte requiere pulido futuro y no está optimizado para móvil, pero es apto para el prototipo en laptop.
- No hacen falta nuevas imágenes raster. Iconos faltantes: SVG accesible en código.

## Contradicciones ya resueltas

- Runtime: React + React Three Fiber; PlayCanvas queda como antecedente histórico.
- Persistencia: aunque el JSON menciona más flags, SPEC-001 permite únicamente `ep01.completed`.
- Animación: el guion usa muchas intenciones, pero hay cinco clips; se usa un mapa explícito y fallback a `Idle`.
- Alcance: se valida el JSON completo, pero el primer flujo visible es el saludo de Capi y Tomi.

## Orden

`T-001-01` → `T-001-02`/`T-001-03` → `T-001-04` → `T-001-05` → `T-001-06` → `T-001-07`.

Comenzar por una tarea, dejar `npm run verify` verde y detenerse para revisión. No agregar backend, panel, monetización, telemetría ni optimización móvil por anticipación.

## Criterio del vertical slice

- funciona con teclado y sin WebGL;
- muestra siempre `Borrador no validado`;
- carga los GLB reales de Capi y Tomi, no los otros NPC;
- reproduce `Wave`, `Listen`, `TalkGesture` y vuelve a `Idle`;
- no envía datos del jugador;
- solo guarda `ep01.completed`;
- conserva elecciones únicamente en memoria;
- pasa typecheck, lint, tests, seguridad y build.

Una demo en laptop no equivale a validación móvil, pedagógica ni con niños.

