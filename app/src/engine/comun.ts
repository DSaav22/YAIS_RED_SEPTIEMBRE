// Escalares del contenido, compartidos por los dos archivos de esquema
// (T-001-03).
//
// Son las piezas que aparecen en todas partes: modos de edad, integrantes del
// elenco y la marca de revisión pendiente. Están aparte para que el esquema de
// los nodos pendientes no tenga que importar el esquema principal y se enrede
// en un ciclo.

import { z } from "zod";

export const ageModeSchema = z.enum(["6-8", "9-12"]);

export const castIdSchema = z.enum(["capi", "tomi", "luna", "clara", "beto", "all"]);

export const reviewMarkerSchema = z.literal("VALIDAR");
