# Inventario de assets — La Isla de los Acuerdos

Estado: **dirección visual aprobada / primera pasada de producción y rigs disponible / pulido pendiente**.

Las láminas PNG aprobadas son concept art compuesto. No deben usarse directamente como una sola pantalla del juego: contienen fondos, UI, personajes y texto fusionados. El siguiente paso es reconstruir esos elementos como capas independientes, manteniendo la misma identidad visual.

## H. Referencias 3D generadas

El paquete completo está en [references-3d](../references-3d/README.md). Incluye gameplay, mapa, mascota, NPCs, entorno modular, props, UI, los cuatro minijuegos base, ambiente, habilidades para la vida y estados de progreso/accesibilidad.

- [x] Referencia maestra 3D de gameplay landscape.
- [x] Mapa 3D del archipiélago.
- [x] Mascota 3D: turnaround y poses.
- [x] NPCs 3D: escala, diversidad y expresiones.
- [x] Entorno y props modulares 3D.
- [x] UI 3D de decisiones, progreso y accesibilidad.
- [x] Referencias 3D de las áreas social, prevención, ambiente y habilidades para la vida.
- [ ] Revisión y aprobación final de la hoja de estilo medible.
- [x] Convertir la primera selección en modelos GLB con rig y cinco clips por personaje.
- [ ] Pulir deformaciones, manos/cara, LOD, compresión y validar rendimiento en dispositivo.

## A. Dirección visual

- [x] Paleta: turquesa, crema, coral, amarillo solar, verde hoja, azul marino.
- [x] Estilo: ilustración 2D cálida, redondeada y pintada a mano.
- [x] Mascota: capibara con mochila azul y estrella amarilla.
- [x] Diseño móvil: portrait-first, base 9:16.
- [ ] Hoja de estilo final con colores HEX, tipografías, sombras y reglas de escala.
- [ ] Revisión humana de textos y ortografía en cada pantalla.

## B. Mascota y personajes

- Mascota: idle, caminar, saludar, escuchar, pensar, preguntar, celebrar, tranquilizar, señalar y despedirse.
- Mascota: vista frontal, lateral, espalda y escala pequeña para botones.
- Niños: mínimo cuatro diseños variados, sin estereotipos de género.
- Adultos de confianza: familia, docente, orientador/facilitador y adulto comunitario.
- Personajes de convivencia: compañeros con distintas apariencias y capacidades.
- Personajes ambientales: estudiantes, jardinero/comunitario y facilitador.
- [ ] Separar cada personaje en PNG transparente o vector fuente.
- [ ] Crear expresiones y poses como sprites independientes.
- [ ] Definir nombres internos de archivo y pivotes de animación.

## C. Accesorios y tokens

- Mochila, estrella, brújula, mapa, barca, faro, puente y letreros.
- Tarjetas de confianza, saludo, sorpresa, conversación, equipo y entorno.
- Rompecabezas de equipo, hoja, gota, botella reutilizable y contenedores.
- Botones de audio, subtítulos, ayuda, pausa, inicio y volver.
- [ ] Extraer o redibujar cada objeto sin fondo.
- [ ] Crear estados normal, seleccionado, bloqueado y completado.

## D. Entornos

- Isla central/faro.
- Isla de los Acuerdos.
- Isla de Habilidades para la Vida.
- Isla de Convivencia.
- Isla Nuestro Entorno.
- Playa, mar, senderos, puentes, jardín, aula, plaza y ruta accesible.
- Piezas modulares: agua, arena, césped, roca, árboles, flores, nubes y señales.
- [ ] Separar fondos por capas: cielo, fondo lejano, terreno, objetos interactivos y foreground.
- [ ] Crear versión vertical del mapa para teléfono.

## E. Pantallas y UI

- Boot/carga.
- Inicio.
- Mapa vertical de islas.
- Selección de misión.
- Instrucción con mascota.
- Juego de elección.
- Juego de arrastrar y ordenar.
- Feedback positivo.
- Intento alternativo sin castigo.
- Progreso.
- Finalización.
- Reto real para aula/casa.
- Guía breve para adulto.
- Ajustes de audio, subtítulos y tamaño de texto.
- [ ] Crear componentes UI separados, no recortar botones desde una captura.

Para el primer vertical slice no se requieren nuevos raster ni recortes. Los iconos faltantes se construirán como componentes SVG accesibles; las láminas compuestas permanecen como referencia y no se servirán como UI final.

## F. Audio y accesibilidad

- Voz de la mascota para 6–7 años.
- Música breve por isla.
- Sonidos de selección, confirmación y celebración.
- Subtítulos de toda voz.
- Contraste suficiente y no depender solo del color.
- Objetivos táctiles grandes.
- Sin temporizadores agresivos, vidas, rankings ni anuncios.
- [ ] Guion de voz.
- [ ] Lista de efectos y licencia/fuente de cada audio.

## G. Contenido inicial

- Saludo que puedo elegir.
- Mi círculo de 3.
- Secreto vs sorpresa.
- A quién le cuento.
- Construyamos juntos.
- Resolver un problema.
- Reparar un error.
- Cuidar el agua.
- Reducir ruido.
- Ruta accesible.
- Reto ambiental medible de aula.

## H. Exportación para desarrollo

- Personajes y objetos: PNG transparente para prototipo; fuente vectorial cuando corresponda.
- Fondos: capas o imágenes grandes optimizadas.
- UI: componentes reproducibles en Phaser, no texto rasterizado.
- Contenido y feedback: JSON/TypeScript separado del arte.
- Nombres consistentes: `mascot_idle_01`, `ui_button_primary`, `card_saludo_wave`, etc.
- Pruebas en teléfono pequeño Android, teléfono grande y tablet.
