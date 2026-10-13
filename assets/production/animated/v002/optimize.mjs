#!/usr/bin/env node
// Genera los GLB optimizados de `assets/production/animated/v002/` a partir
// de los fuentes intactos de `v001` (AGENTS.md: «No sobrescribas ni "mejores"
// los modelos fuente. Las variantes nuevas llevan nueva versión»).
//
// Uso:  node assets/production/animated/v002/optimize.mjs
//
// Por qué: medido con @gltf-transform, los cinco GLB de v001 no tienen NI UNA
// textura. Todo su peso es geometría, y la geometría viene sin soldar: en
// mascot.glb, POSITION ocupa exactamente 226374 * 3 * 12 bytes, es decir un
// vértice propio por esquina de triángulo, sin compartir ninguno. Además
// todos traen TEXCOORD_0 que ningún material usa (no hay texturas).
//
// El pipeline es, por tanto, geométricamente conservador y SIN compresión:
//
//   dedup    — funde materiales y accesores idénticos.
//   weld     — suelda vértices exactamente coincidentes (tolerancia 0). En
//              estos modelos no encuentra nada: ya venían indexados. Se deja
//              porque es gratis y sin pérdida.
//   prune    — quita lo que nadie usa. Aquí sí muerde: los cinco GLB traen
//              TEXCOORD_0 y ningún material tiene textura, así que los UV se
//              van enteros (~12 % del archivo).
//   join     — junta primitivas que comparten material (menos draw calls).
//   resample — quita claves de animación redundantes.
//   quantize — el ahorro grande. No toca NI UN triángulo: solo baja la
//              precisión de almacenamiento de los atributos, que venían todos
//              en float32. Posiciones a 14 bits (sub-milímetro en un
//              personaje de metro y medio), normales a 10, colores de vértice
//              y pesos de skinning a 8. Los pesos eran el atributo más caro
//              del mascot (3,34 MiB en float32) para guardar cuatro números
//              que suman 1.
//
// Por qué quantize y NO Draco ni meshopt: `quantize` emite
// KHR_mesh_quantization, que el GLTFLoader de three.js (0.186) entiende de
// serie, sin decodificador externo ni WASM. Draco y meshopt sí exigirían un
// decodificador en tiempo de ejecución que este proyecto no empaqueta: no
// carga nada desde un CDN y `useGLTF(url, false)` desactiva a propósito el
// decodificador Draco de drei (ver el comentario de
// `app/src/game/scene/Character.tsx`). Por eso aquí no se comprime.
//
// Tampoco se quita ningún clip: los cinco de cada personaje (Idle,
// Walk/Roll, Wave, Listen, TalkGesture) están todos en uso por
// `app/src/shared/animation-intents.ts`, y juntos pesan menos de 60 KiB.

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  join,
  prune,
  quantize,
  resample,
  weld,
} from "@gltf-transform/functions";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join as joinPath } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ROOT = joinPath(AQUI, "..", "..", "..", "..");
const ORIGEN = joinPath(ROOT, "assets", "production", "animated", "v001");

const PERSONAJES = [
  "mascot",
  "child_explorer",
  "child_wheelchair",
  "educator",
  "community_guide",
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const mib = (b) => (b / 1048576).toFixed(2);
const resumen = [];

for (const id of PERSONAJES) {
  const src = joinPath(ORIGEN, id, `${id}.glb`);
  const destDir = joinPath(AQUI, id);
  const dest = joinPath(destDir, `${id}.glb`);

  const doc = await io.read(src);
  await doc.transform(
    dedup(),
    weld({ tolerance: 0 }),
    prune({ keepAttributes: false, keepIndices: false, keepLeaves: false }),
    join(),
    resample(),
    quantize({
      quantizePosition: 14,
      quantizeNormal: 10,
      quantizeColor: 8,
      quantizeWeight: 8,
      quantizeTexcoord: 12,
    }),
  );

  const bytes = await io.writeBinary(doc);
  mkdirSync(destDir, { recursive: true });
  writeFileSync(dest, bytes);

  const root = doc.getRoot();
  let tris = 0;
  let prims = 0;
  for (const mesh of root.listMeshes()) {
    for (const p of mesh.listPrimitives()) {
      prims += 1;
      const idx = p.getIndices();
      tris += (idx ? idx.getCount() : p.getAttribute("POSITION").getCount()) / 3;
    }
  }
  let vertices = 0;
  for (const mesh of root.listMeshes()) {
    for (const p of mesh.listPrimitives()) vertices += p.getAttribute("POSITION").getCount();
  }

  // `asset.json` por personaje, espejo del de v001 con los bytes y el sha de
  // esta variante. `app/src/shared/animation-intents.test.ts` lee los clips
  // reales de este archivo, no de `assets.ts`, así que v002 debe traerlo.
  const assetV001 = JSON.parse(readFileSync(joinPath(ORIGEN, id, "asset.json"), "utf8"));

  const antes = statSync(src).size;
  const shaV001 = createHash("sha256").update(readFileSync(src)).digest("hex");
  const despues = bytes.byteLength;
  resumen.push({
    id,
    antes,
    despues,
    tris,
    prims,
    vertices,
    materiales: root.listMaterials().length,
    clips: root.listAnimations().map((a) => a.getName()),
    sha256: createHash("sha256").update(readFileSync(dest)).digest("hex"),
    shaV001,
  });

  console.log(
    `${id.padEnd(17)} ${mib(antes)} MiB -> ${mib(despues)} MiB ` +
      `(-${(100 - (despues / antes) * 100).toFixed(1)} %)  ${tris} tri, ${prims} prim`,
  );

  writeFileSync(
    joinPath(destDir, "asset.json"),
    `${JSON.stringify(
      {
        ...assetV001,
        version: "v002",
        derived_from: `assets/production/animated/v001/${id}/asset.json`,
        glb: `${id}.glb`,
        bytes: despues,
        sha256: resumen[resumen.length - 1].sha256,
        source_sha256: shaV001,
        triangles: tris,
        vertices,
        note:
          "Clips idénticos a v001: quantize no toca la animación, solo la " +
          "precisión de almacenamiento de los atributos de malla.",
      },
      null,
      2,
    )}
`,
  );
}

const totalAntes = resumen.reduce((a, r) => a + r.antes, 0);
const totalDespues = resumen.reduce((a, r) => a + r.despues, 0);
console.log(`\ntotal ${mib(totalAntes)} MiB -> ${mib(totalDespues)} MiB`);

const manifiesto = {
  version: "v002",
  derived_from: "assets/production/animated/v001/manifest.json",
  stage: "quantized_for_runtime",
  lossless: false,
  compression: "none",
  requires_extensions: ["KHR_mesh_quantization"],
  pipeline: [
    "dedup",
    "weld(tolerance=0)",
    "prune(keepAttributes=false)",
    "join",
    "resample",
    "quantize(pos=14,normal=10,color=8,weight=8)",
  ],
  note:
    "Variante optimizada de v001, generada por optimize.mjs. Mismo recuento de " +
    "triángulos que v001: solo cambia la precisión de almacenamiento de los " +
    "atributos (KHR_mesh_quantization, soportado de serie por three.js). Sin " +
    "Draco ni meshopt: el runtime no empaqueta decodificador. v001 queda " +
    "intacto como fuente y es la referencia de arte.",
  characters: resumen.map((r) => ({
    id: r.id,
    glb: `${r.id}/${r.id}.glb`,
    sha256: r.sha256,
    // sha256 del GLB de v001 del que sale este archivo. Cierra la cadena:
    // `scripts/sync-runtime-assets.mjs` comprueba que coincide con el que
    // registra el manifiesto de v001, así que el arte no puede cambiar por
    // debajo sin que la sincronización lo note.
    source_sha256: r.shaV001,
    source_glb: `assets/production/animated/v001/${r.id}/${r.id}.glb`,
    bytes: r.despues,
    bytes_v001: r.antes,
    triangles: r.tris,
    vertices: r.vertices,
    material_primitives: r.prims,
    materials: r.materiales,
    clips: r.clips,
  })),
  total_glb_bytes: totalDespues,
};
writeFileSync(joinPath(AQUI, "manifest.json"), `${JSON.stringify(manifiesto, null, 2)}\n`);
console.log("manifest.json escrito.");
