# TASKS-001 — Vertical slice del saludo en web 3D

Tareas derivadas de [PLAN-001](./plan.md). Cada tarea es autocontenida y debe dejar el repositorio verificable.

---

## T-001-01 — Crea el scaffold y la compuerta de calidad

**Contexto:** El repositorio de código está vacío. Antes del juego debe existir una app Vite + React + TypeScript estricto con verificación reproducible.

**Archivos:** `package.json`, `app/package.json`, `app/vite.config.ts`, `app/tsconfig*.json`, `app/eslint.config.*`, `app/src/main.tsx`, `app/src/App.tsx`, `scripts/check-safety.mjs`

**Qué hacer:**
1. Crear el scaffold sin contenido narrativo hardcodeado.
2. Definir `npm run verify`: typecheck, lint, tests, `check:safety` y build.
3. Configurar Vitest y un smoke test.
4. Mantener `app/src/engine` sin React, DOM ni Three.

**Criterio de aceptación:** base de AC-1 y definición de terminado.

**Listo cuando:**
- [ ] `npm run verify` pasa.
- [ ] `npm run dev` muestra un shell vacío con distintivo de borrador.

**No hagas:** no copies texto del guion a `App.tsx`, no agregues backend ni Tailwind por inercia.

---

## T-001-02 — Sincroniza y registra los assets reales

**Contexto:** Todos los assets viven en `assets/`; el build solo debe servir el subconjunto del primer hito.

**Archivos:** `scripts/sync-runtime-assets.mjs`, `app/src/shared/assets.ts`, `app/src/shared/assets.test.ts`, `app/public/assets/` (generado)

**Qué hacer:**
1. Copiar mediante allowlist Capi, Tomi, mundo mínimo, props mínimos y posters.
2. Registrar rutas y clips en `shared/assets.ts`.
3. Fallar con mensaje legible si falta un archivo o cambia un hash previsto.
4. No precargar Luna, Clara, Beto ni los lotes históricos.

**Criterio de aceptación:** prepara G3 sin cambiar el arte.

**Listo cuando:**
- [ ] `npm run verify` pasa.
- [ ] El build contiene solo el subconjunto documentado.

**No hagas:** no referencies GLB con strings literales desde componentes.

---

## T-001-03 — Valida el episodio completo

**Contexto:** El JSON tiene siete escenas y más tipos que el primer runtime. Debe validarse antes de ejecutar aunque solo se muestre el núcleo de saludo.

**Archivos:** `app/src/engine/types.ts`, `app/src/engine/schema.ts`, `app/src/engine/schema.test.ts`, `content/episodes/ep01-saludo.json`

**Qué hacer:**
1. Modelar todos los tipos presentes sin `any`.
2. Comprobar IDs únicos, destinos existentes, escenas existentes, locIds y opciones filtrables por edad.
3. Detectar la contradicción de flags persistentes y reportarla como diagnóstico de desarrollo; la app solo allowlistea `ep01.completed`.
4. Mostrar un error de desarrollo legible si la validación falla.

**Criterio de aceptación:** AC-1, AC-3 y parte de AC-5.

**Listo cuando:**
- [ ] `npm run verify` pasa.
- [ ] Tests con JSON corrupto y referencias rotas fallan de forma controlada.

**No hagas:** no borres escenas ni reescribas líneas sensibles para acomodar el código.

**Requiere content-guardian:** sí, por modelo de contenido y persistencia.

---

## T-001-04 — Implementa el motor puro y la persistencia mínima

**Contexto:** La navegación, edad y reintento deben existir sin React ni Three.

**Archivos:** `app/src/engine/runtime.ts`, `app/src/engine/progress.ts`, `app/src/engine/runtime.test.ts`, `app/src/engine/progress.test.ts`

**Qué hacer:**
1. Implementar líneas, opciones, cambios de escena y finalización.
2. Mantener elecciones solo en memoria.
3. Filtrar nodos/opciones por modo de edad.
4. Permitir reintento ilimitado.
5. Persistir únicamente `ep01.completed` por la interfaz `ProgressStore`.

**Criterio de aceptación:** AC-2, AC-3, AC-4, AC-5 y AC-9.

**Listo cuando:**
- [ ] `npm run verify` pasa.
- [ ] Un test recorre el saludo de Capi en ambos modos de edad.
- [ ] Un test afirma que almacenamiento no contiene elecciones ni otras claves.

**No hagas:** no uses `localStorage` directamente dentro del motor ni agregues estado de respuesta incorrecta.

**Requiere content-guardian:** sí.

---

## T-001-05 — Construye la experiencia 2D accesible

**Contexto:** El mismo episodio debe funcionar si WebGL falla y antes de integrar el 3D.

**Archivos:** `app/src/game/GameShell.tsx`, `app/src/game/dialogue/*`, `app/src/game/ui/icons.tsx`, `app/src/shared/styles/*`, tests de componentes

**Qué hacer:**
1. Renderizar personaje, línea, decisiones, repetir línea y reintento.
2. Mostrar siempre el distintivo `Borrador no validado`.
3. Crear iconos SVG con nombres accesibles y equivalente textual.
4. Garantizar controles de 44×44, foco visible, teclado y reduced motion.
5. Añadir un selector de escena solo en modo desarrollo.

**Criterio de aceptación:** AC-2, AC-4, AC-6, AC-7, AC-8 y AC-10.

**Listo cuando:**
- [ ] `npm run verify` pasa.
- [ ] El saludo de Capi puede completarse con teclado y con WebGL deshabilitado.

**No hagas:** no uses color como único significado, no rasterices texto y no reproduzcas audio automáticamente.

**Requiere content-guardian:** sí.

---

## T-001-06 — Integra la escena 3D con Capi y Tomi

**Contexto:** Ya existen GLB con rig; deben consumir el mismo estado del runtime 2D.

**Archivos:** `app/src/game/scene/GameCanvas.tsx`, `Character.tsx`, `IslandScene.tsx`, `useCharacterAnimation.ts`, `app/src/shared/animation-intents.ts`, tests

**Qué hacer:**
1. Cargar isla, Capi y Tomi bajo demanda.
2. Usar `useAnimations` y transiciones controladas; volver a `Idle` tras un gesto.
3. Mapear intenciones a clips existentes y advertir solo en desarrollo cuando haya fallback.
4. Pausar el loop cuando la escena está quieta y respetar reduced motion.
5. Caer al runtime 2D si Canvas/WebGL falla.

**Criterio de aceptación:** G3, AC-7 y AC-8.

**Listo cuando:**
- [ ] `npm run verify` pasa.
- [ ] Capi y Tomi aparecen desde sus GLB reales y reproducen `Wave`, `Listen` y `TalkGesture`.
- [ ] Ningún otro personaje se descarga durante este flujo.

**No hagas:** no copies el modelo por escena, no mutaciones Three mediante estado React por frame y no prometas FPS no medidos.

---

## T-001-07 — Verifica el vertical slice de extremo a extremo

**Contexto:** El prototipo solo se considera listo para revisión cuando cumple la spec y las reglas de seguridad.

**Archivos:** tests e2e/configuración necesaria, reporte `docs/QA-VERTICAL-SLICE.md`

**Qué hacer:**
1. Probar ambos modos de edad, teclado, 375 px, reduced motion y WebGL deshabilitado.
2. Revisar red: ninguna petición con datos del jugador.
3. Verificar que solo persiste `ep01.completed`.
4. Ejecutar revisión independiente `content-guardian` y `a11y-perf-reviewer`.
5. Documentar medidas observadas y pendientes, sin llamar producto terminado al prototipo.

**Criterio de aceptación:** AC-1 a AC-10.

**Listo cuando:**
- [ ] `npm run verify` pasa.
- [ ] Ambos revisores independientes emiten veredicto sin bloqueantes.

**No hagas:** no ocultes el distintivo de borrador ni conviertas una prueba de laptop en validación móvil.

**Requiere content-guardian:** sí.

---

## Orden y paralelismo

Orden principal: T-001-01 → T-001-02/T-001-03 → T-001-04 → T-001-05 → T-001-06 → T-001-07.

T-001-02 y T-001-03 pueden ejecutarse en paralelo después del scaffold porque sus archivos no se pisan. El resto depende del contrato anterior.
