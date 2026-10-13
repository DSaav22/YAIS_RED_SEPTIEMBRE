# Snapshot de recursos copiados

Fecha: 2026-09-17.

Origen: `C:\Users\qwert\Documents\YAIS-RED`.

Destino: `C:\Users\qwert\Documents\yais-game-hackbiz`.

La operación fue una copia. No se movió ni eliminó ningún original del vault.

## Comparación por conjunto

| Conjunto | Archivos origen | Archivos destino | Bytes | Coincide |
| --- | ---: | ---: | ---: | --- |
| `assets/` | 343 | 343 | 229.595.756 | sí |
| `content/` | 1 | 1 | 40.472 | sí |
| `specs/` | 8 | 8 | 29.916 | sí |
| `.claude/` | 11 | 11 | 15.674 | sí |
| `scripts/` | 30 | 30 | 346.799 | sí |

La comparación inicial verifica cantidad y suma de bytes. Además se verificaron SHA-256 de los archivos críticos:

| Archivo | SHA-256 |
| --- | --- |
| `assets/production/animated/v001/manifest.json` | `C4D26E856FA1B4A4CC9CBBEB53452FB15F2451A8DA5AAFD580E6969FB8160B6E` |
| `assets/production/animated/v001/mascot/mascot.glb` | `B12DFDE793F53481B1A30689A9474209AF60E90148CDD5077A74C0DE2FCBCCED` |
| `assets/production/animated/v001/child_explorer/child_explorer.glb` | `92AF921F1C3671130EC168FBB080AF5E662EAE451A41D5BD5613F28FD4C4A530` |
| `content/episodes/ep01-saludo.json` | `F3E976481326F7421CF67B2CA8874FC4D90E7126C0B2550C186A094D6C99D0CD` |
| `specs/001-juego-episodio-1/spec.md` | `5BAA8DF83DC7ABD80CC32747B10E3CC8157529151E322B30CC34AE01484089A9` |
| `specs/001-juego-episodio-1/plan.md` | `F53A1093E7070EF829F5F3A61DA8C627828748912D3E13B1B9E353E1EDB53B27` |
| `specs/001-juego-episodio-1/tasks.md` | `204AE32AD4B647CD3EE6E10AF644ECB65E0CBAE36575B1327BF84394911FF09E` |

`raw/` y `wiki/` no fueron copiados. `node scripts/check-safety.mjs` pasó en el destino con Node v22.14.0.

Este snapshot acredita la transferencia inicial. Después de verificar los hashes se adaptaron únicamente enlaces documentales para que apunten al vault externo; por ello las copias de Markdown pueden divergir del hash inicial sin que hayan cambiado los GLB ni el JSON. El snapshot no debe usarse para impedir cambios posteriores versionados en el repositorio de código.
