# PLAN-001 — Vertical slice del saludo en web 3D

Plan técnico de [SPEC-001](./spec.md). El *qué* vive en la spec; aquí va el *cómo*.

## Enfoque

Se construirá una sola app Vite + React + TypeScript estricto. `app/src/engine/` será TypeScript puro y validará el episodio completo, mientras el primer hito visual recorrerá el núcleo de saludo de Capi y Tomi. La UI funcionará primero sin WebGL; la escena R3F será una mejora progresiva que consume el mismo estado. Los GLB animados actuales se integrarán mediante un registro único de assets y un mapa temporal de intenciones narrativas a los cinco clips disponibles. El objetivo de esta fase es web en laptop/proyector; la optimización móvil y el pulido de rig quedan registrados, no bloquean.

## Archivos que se tocan

| Archivo | Acción | Para qué |
| --- | --- | --- |
| `package.json` | nuevo | Comandos raíz, incluido `verify` y seguridad. |
| `app/package.json` | nuevo | Dependencias de la aplicación. |
| `app/vite.config.ts` | nuevo | Build web y copia controlada de assets runtime. |
| `app/src/engine/schema.ts` | nuevo | Esquema Zod del JSON completo. |
| `app/src/engine/types.ts` | nuevo | Contratos independientes de React/Three. |
| `app/src/engine/runtime.ts` | nuevo | Navegación por nodos, edad y variables de sesión. |
| `app/src/engine/progress.ts` | nuevo | Interfaz `ProgressStore`; solo allowlist de flags. |
| `app/src/engine/*.test.ts` | nuevo | Recorridos, validación, edad y privacidad. |
| `app/src/shared/assets.ts` | nuevo | Única fuente de rutas GLB, fallbacks y clips. |
| `app/src/shared/animation-intents.ts` | nuevo | Mapa explícito de gestos del guion a clips existentes. |
| `app/src/game/GameShell.tsx` | nuevo | Inicio, distintivo de borrador y ruta de episodio. |
| `app/src/game/dialogue/` | nuevo | Línea, decisiones, feedback y reintento. |
| `app/src/game/scene/` | nuevo | Canvas R3F, mundo, personajes y fallback 2D. |
| `app/src/game/ui/icons.tsx` | nuevo | Iconos SVG accesibles; no recortes de concept art. |
| `app/src/shared/styles/` | nuevo | Tokens y estilos sin texto rasterizado. |
| `scripts/sync-runtime-assets.mjs` | nuevo | Copia solo assets usados al `public` del build. |
| `content/episodes/ep01-saludo.json` | existente | Fuente narrativa; no hardcodear texto en componentes. |

## Contratos

```ts
type AgeMode = "6-8" | "9-12";
type SupportedNodeType = "line" | "choice" | "sceneChange" | "end";

interface RuntimeState {
  episodeId: string;
  sceneId: string;
  nodeId: string;
  ageMode: AgeMode;
  sessionVars: Readonly<Record<string, string | boolean>>;
  completed: boolean;
}

interface ProgressStore {
  readFlag(id: "ep01.completed"): boolean;
  writeFlag(id: "ep01.completed", value: boolean): void;
  clear(): void;
}

type CharacterId = "capi" | "tomi" | "luna" | "clara" | "beto";
type RuntimeClip = "Idle" | "Walk" | "Roll" | "Wave" | "Listen" | "TalkGesture";

interface CharacterAsset {
  modelUrl: string;
  posterUrl: string;
  locomotion: "Walk" | "Roll";
  availableClips: readonly RuntimeClip[];
}
```

El esquema acepta y valida los tipos adicionales del episodio completo (`minigame`, `branch`, `reward`) aunque su UI se implemente después. Si el runtime llega a uno no implementado durante desarrollo, muestra un diagnóstico de desarrollo; nunca lo presenta como contenido jugable terminado.

El mapa de animaciones nunca adivina por nombre en tiempo de ejecución. Cada intención se asigna a `Idle`, `Wave`, `Listen` o `TalkGesture`; locomoción usa `Walk`/`Roll`. Un clip inexistente cae a `Idle` y deja una advertencia solo de desarrollo.

## Dependencias nuevas

| Paquete | Versión | Por qué se justifica |
| --- | --- | --- |
| `react`, `react-dom` | fijadas por lockfile al crear scaffold | Base común para juego y panel. |
| `typescript`, `vite`, `@vitejs/plugin-react` | fijadas por lockfile | Build web estricto y rápido. |
| `three`, `@react-three/fiber`, `@react-three/drei` | fijadas por lockfile | Carga GLB, escena y mixer de animación. |
| `zod` | fijada por lockfile | Validar el contrato editorial antes de ejecutar. |
| `zustand` | fijada por lockfile | Estado visual pequeño; no entra a `engine/`. |
| `vitest`, Testing Library y ESLint | fijadas por lockfile | Compuerta reproducible de tests, UI y lint. |

Las versiones exactas se fijan en el lockfile al instalar; no usar rangos flotantes en CI. Tailwind no es requisito del vertical slice del juego y puede entrar con el panel.

## Assets runtime del primer hito

- Capibara: `assets/production/animated/v001/mascot/mascot.glb`.
- Tomi/explorador: `assets/production/animated/v001/child_explorer/child_explorer.glb`.
- Mundo mínimo: isla grande, sendero, agua, puente recto, banco, árbol, palmera, nube y faro desde `world/v001`.
- Props mínimos: brújula, burbuja, tarjetas, pausa y sonido desde `props/v001`.
- Fallback 2D: renders `three-quarter.png` de las versiones estáticas vigentes.

Los demás NPC y assets permanecen registrados pero no se precargan. `scripts/sync-runtime-assets.mjs` crea una carpeta pública allowlisted; el código no debe referenciar rutas literales fuera de `shared/assets.ts`.

## Decisión visual

No se necesitan nuevas imágenes raster para iniciar. Las láminas aprobadas cubren composición, mapa, UI y minijuegos. Los iconos nombrados en el JSON se dibujan como SVG simples y accesibles en código, con texto equivalente; no se recortan capturas compuestas ni se rasteriza texto. Cualquier ilustración nueva posterior será una tarea de arte separada y revisable.

## Riesgos técnicos

| Riesgo | Señal temprana | Qué hacemos |
| --- | --- | --- |
| Spec y JSON tienen distinto alcance | El runtime llega a minijuegos/branch antes de tener UI | Inicio de escena solo en desarrollo; tipos validados y diagnóstico explícito. |
| El JSON pide más de 60 gestos y hay 5 clips | Advertencias de clips faltantes | Mapa de intenciones versionado y fallback `Idle`; no falsificar animaciones. |
| Los GLB son pesados | Carga lenta o memoria alta en laptop | Un modelo por necesidad, carga diferida; medir antes de optimizar geometría. |
| Política de persistencia contradictoria | Aparecen claves distintas a `ep01.completed` | Store con allowlist literal y test que inspecciona almacenamiento. |
| Contenido no validado | Se confunde prototipo con material aprobado | Distintivo visible `Borrador no validado`; no publicar sin Arianna. |
| CDN/red | La demo falla sin Internet | Empaquetar dependencias y assets localmente; fallback 2D. |
| Worktree de assets sin checkpoint | Se mezcla producción 3D con scaffold | Conservar repositorios separados y registrar hashes/manifiestos. |

## Orden de implementación

1. Crear scaffold y una compuerta `npm run verify` verde sin juego.
2. Sincronizar los assets allowlisted y construir `shared/assets.ts` con tests de existencia.
3. Definir tipos/esquema y validar el JSON completo, incluyendo referencias rotas.
4. Implementar el motor puro, edad, variables de sesión y `ProgressStore` allowlisted.
5. Implementar el runtime 2D del saludo y su fallback sin WebGL.
6. Integrar isla, Capi y Tomi con R3F y el mapa de clips.
7. Probar teclado, 375 px, reduced motion, modo sin WebGL y una sesión completa.
8. Ejecutar revisiones independientes de contenido y accesibilidad/rendimiento.

Cada paso debe dejar `npm run verify` en verde.
