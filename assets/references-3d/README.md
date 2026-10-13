# Referencias 3D — La Isla de los Acuerdos

Paquete visual de referencia generado para orientar la producción 3D del videojuego web móvil. Estas imágenes fijan composición, escala, cámara, materiales, paleta y lenguaje de interacción; no son modelos 3D ni sustituyen la revisión de arte.

## Catálogo

| Archivo | Uso |
| --- | --- |
| `01-gameplay-hero-3d.png` | Vista maestra de gameplay en tercera persona, landscape. |
| `02-archipelago-map-3d.png` | Mapa de islas y progresión del mundo. |
| `03-mascot-turnaround-3d.png` | Turnaround y poses de la mascota capibara. |
| `04-npc-lineup-expressions-3d.png` | NPCs, diversidad, escala y expresiones. |
| `05-environment-modular-sheet-3d.png` | Piezas modulares de isla, casas, puentes y vegetación. |
| `06-interactive-props-sheet-3d.png` | Objetos interactivos, tokens y controles. |
| `07-dialogue-choice-ui-3d.png` | Composición de diálogo y decisiones sobre el mundo 3D. |
| `08-minigames-social-3d.png` | `Saludo que puedo elegir` y `Mi círculo de 3`. |
| `09-minigames-safety-3d.png` | `Secreto vs sorpresa` y `A quién le cuento`. |
| `10-minigames-environment-3d.png` | Agua, accesibilidad y cuidado del entorno. |
| `11-minigames-life-skills-3d.png` | Trabajo en equipo, planificación y resolución de problemas. |
| `12-progression-accessibility-ui-3d.png` | Progreso, pausa calmada, audio, subtítulos y reflexión. |

## Hojas técnicas multivista

La carpeta [technical](technical/) contiene las referencias necesarias para modelar correctamente: vistas ortográficas, escalas, materiales, arquitectura modular, poses, interacción y layout móvil.

| Archivo | Uso |
| --- | --- |
| `technical/01-mascot-orthographic-turnaround.png` | Mascota: frente, perfiles, espalda, superior, inferior y poses. |
| `technical/02-primary-child-npcs-turnaround.png` | Dos NPCs infantiles principales en vistas ortográficas. |
| `technical/03-trusted-adults-turnaround.png` | Docente/facilitadora y adulto comunitario en vistas ortográficas. |
| `technical/04-modular-island-kit-orthographic.png` | Terreno, agua, puentes, vegetación y piezas de encaje. |
| `technical/05-landmarks-architecture-exploded.png` | Faro, casa y puente con vistas y módulos separados. |
| `technical/06-interactive-props-orthographic.png` | Props y tokens con vistas frontales, laterales y traseras. |
| `technical/07-mascot-animation-poses.png` | Ciclos y poses de animación de la mascota. |
| `technical/08-mobile-layout-controls.png` | Zonas táctiles y composición landscape. |
| `technical/09-materials-lighting-style-bible.png` | Materiales, paleta e iluminación. |
| `technical/10-npc-interaction-poses.png` | Interacciones y poses de NPCs. |

## Regla de uso

La referencia aprobada debe consultarse antes de generar cada familia de modelos con Blender headless. Si un modelo generado se separa de estas referencias, se corrige el script o se registra una nueva decisión visual; no se compensa improvisando assets aislados.

## Siguiente producción

1. Revisar y aprobar las hojas técnicas multivista.
2. Generar la mascota low-poly con rig y animaciones básicas.
3. Generar el kit modular de isla y exportarlo a GLB.
4. Montar el vertical slice en PlayCanvas y validar en teléfono.
