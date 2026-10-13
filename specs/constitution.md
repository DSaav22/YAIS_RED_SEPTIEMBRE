# Constitución del proyecto

Principios que ninguna spec, sprint ni urgencia de demo puede sobrescribir. Si algo aquí entra en conflicto con una tarea, gana esto y la tarea se replantea.

Origen en el vault externo: `C:\Users\qwert\Documents\YAIS-RED\wiki\project\no-hacer.md`, `C:\Users\qwert\Documents\YAIS-RED\wiki\research\evidencia-psicologica-proteccion.md` y `C:\Users\qwert\Documents\YAIS-RED\wiki\decisions\002-eje-salud-mental-asi.md`.

## I. El niño no es un usuario del que se recolecta nada

No hay cuenta, login, nombre, foto, voz ni identificador de un niño. El progreso se guarda por aula. Si una función necesita saber *qué niño* hizo algo, la función no se construye.

## II. La app no recibe revelaciones

No hay chat, diario, formulario de "cuéntanos", ni campo de texto libre donde un niño o un adulto escriba lo que un niño contó. Ante una revelación real, el producto **deriva** al protocolo humano de la institución. Nunca lo reemplaza ni lo registra.

## III. No se diagnostica ni se marca riesgo

Ni un niño, ni un aula. El panel mide si el **adulto** está preparado y si el aula avanzó. Un contador agregado no puede convertirse en un proxy de "aquí pasa algo".

## IV. El contenido sensible no se publica sin revisión profesional

Toda línea que un niño va a leer o escuchar, y todo el protocolo de derivación, requieren aprobación de Arianna (psicóloga del equipo) antes de salir de un flag de desarrollo. El equipo puede escribir el código; no puede aprobar el contenido.

## V. Sin castigo, sin humillación, sin miedo

No hay puntaje, ranking, racha, cuenta regresiva, sonido de error ni "respuesta incorrecta". Reintentar siempre es posible y nunca cuesta nada. Las recompensas son cosméticas y se dan por completar, no por acertar.

## VI. Funciona en el aula real

Un solo dispositivo proyectado, sin instalar nada, con poco ancho de banda y con el hardware que la escuela ya tiene. Si una decisión técnica exige que la escuela compre algo, se descarta.

## VII. Accesibilidad desde el primer commit

Texto legible, contraste suficiente, audio opcional, objetivos táctiles grandes, y una ruta de uso que no dependa de precisión motora fina. No es una fase final: es criterio de aceptación de cada módulo.

## VIII. Las reglas se hacen cumplir con mecanismos

Cada regla de arriba que pueda verificarse con un script, se verifica con un script (`npm run check:safety`). Lo que dependa de juicio humano se revisa con el agente `content-guardian` y, cuando toca contenido infantil, con Arianna.

## IX. Honestidad sobre el estado

Un prototipo no se presenta como producto terminado. Una hipótesis no se presenta como dato validado. Si algo no está probado con niños, se dice.
