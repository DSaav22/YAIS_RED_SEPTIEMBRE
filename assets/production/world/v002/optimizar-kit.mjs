// Optimizador compartido de los kits estáticos (`world` y `props`).
//
// Genera los GLB de `v002` a partir de los fuentes intactos de `v001`
// (AGENTS.md: «No sobrescribas ni "mejores" los modelos fuente. Las variantes
// nuevas llevan nueva versión»). `v001` no se toca nunca y sigue siendo la
// referencia de arte.
//
// Se ejecuta con los dos envoltorios:
//   node assets/production/world/v002/optimize.mjs
//   node assets/production/props/v002/optimize.mjs
//
// POR QUÉ ESTE PIPELINE Y NO OTRO
//
// Medido con @gltf-transform sobre los 40 GLB de v001: ninguno tiene NI UNA
// textura (el color sale de materiales planos, hasta 11 por modelo), y todos
// salvo `heart_token` y `water_drop` traen TEXCOORD_0 que ningún material usa.
// Todo el peso es geometría en float32. Es exactamente el mismo cuadro que
// tenían los cinco personajes, así que se aplica el mismo pipeline que
// `assets/production/animated/v002/optimize.mjs`, que bajó un 46 % sin quitar
// un triángulo:
//
//   dedup    — funde materiales y accesores idénticos.
//   weld     — suelda vértices exactamente coincidentes (tolerancia 0, sin
//              pérdida).
//   prune    — quita lo que nadie usa; sobre todo los UV huérfanos.
//   join     — junta primitivas que comparten material (menos draw calls).
//   quantize — el ahorro grande, y NO toca ni un triángulo: solo baja la
//              precisión de almacenamiento de los atributos, que venían todos
//              en float32. Posiciones a 14 bits y normales a 10.
//
// PRECISIÓN: 14 bits de posición se reparten sobre la caja de cada modelo. La
// pieza más grande del kit mide ~6,3 m, así que el paso de cuantización es
// ~0,4 mm; sobre una pieza de 20 cm es ~0,012 mm. Esto se proyecta en un aula:
// a esa escala el error queda órdenes de magnitud por debajo de un píxel del
// proyector. No se decima ni se simplifica geometría justamente para que la
// calidad no se note peor.
//
// SIN Draco ni meshopt: `quantize` emite KHR_mesh_quantization, que el
// GLTFLoader de three 0.186 entiende de serie. Draco y meshopt exigirían un
// decodificador en tiempo de ejecución que este proyecto no empaqueta, porque
// no puede pedir nada a un CDN (`useGLTF(url, false)` desactiva a propósito el
// decodificador de drei).
//
// CAJAS CONTENEDORAS: además de optimizar, este script mide la caja real de
// cada modelo YA EN EL ESPACIO DEL GLB (Y arriba), que es lo que ve three.js,
// aplicando las transformaciones de los nodos. El `asset.json` de v001 publica
// la caja en espacio Blender (Z arriba) y por eso no sirve para colocar cosas
// en la escena. La medida va al `asset.json` y al `manifest.json` de v002 como
// `bounds_glb` y `size_glb` = [ancho X, alto Y, largo Z] en metros.

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, join as joinPrims, prune, quantize, weld } from "@gltf-transform/functions";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join as joinPath } from "node:path";

const mib = (b) => (b / 1048576).toFixed(2);
const kib = (b) => (b / 1024).toFixed(0);

const IDENTIDAD = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Producto de dos matrices 4x4 en orden por columnas (el de glTF). */
function multiplicar(a, b) {
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c += 1) {
    for (let f = 0; f < 4; f += 1) {
      r[c * 4 + f] =
        a[f] * b[c * 4] +
        a[4 + f] * b[c * 4 + 1] +
        a[8 + f] * b[c * 4 + 2] +
        a[12 + f] * b[c * 4 + 3];
    }
  }
  return r;
}

/**
 * Caja contenedora en el espacio del GLB (Y arriba), con las transformaciones
 * de los nodos aplicadas: la misma caja que three.js calcula al cargar la
 * escena.
 */
function medirCajaGlb(doc) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  const recorrer = (nodo, m) => {
    const mundo = multiplicar(m, nodo.getMatrix());
    const malla = nodo.getMesh();
    if (malla) {
      for (const prim of malla.listPrimitives()) {
        const pos = prim.getAttribute("POSITION");
        if (!pos) continue;
        const v = [0, 0, 0];
        for (let i = 0; i < pos.getCount(); i += 1) {
          pos.getElement(i, v);
          const x = mundo[0] * v[0] + mundo[4] * v[1] + mundo[8] * v[2] + mundo[12];
          const y = mundo[1] * v[0] + mundo[5] * v[1] + mundo[9] * v[2] + mundo[13];
          const z = mundo[2] * v[0] + mundo[6] * v[1] + mundo[10] * v[2] + mundo[14];
          if (x < min[0]) min[0] = x;
          if (y < min[1]) min[1] = y;
          if (z < min[2]) min[2] = z;
          if (x > max[0]) max[0] = x;
          if (y > max[1]) max[1] = y;
          if (z > max[2]) max[2] = z;
        }
      }
    }
    for (const hijo of nodo.listChildren()) recorrer(hijo, mundo);
  };

  for (const escena of doc.getRoot().listScenes()) {
    for (const nodo of escena.listChildren()) recorrer(nodo, IDENTIDAD);
  }

  const red = (n) => Number(n.toFixed(4));
  return {
    min: min.map(red),
    max: max.map(red),
    size: [0, 1, 2].map((i) => red(max[i] - min[i])),
  };
}

function contar(doc) {
  let tris = 0;
  let prims = 0;
  let vertices = 0;
  for (const malla of doc.getRoot().listMeshes()) {
    for (const p of malla.listPrimitives()) {
      prims += 1;
      const idx = p.getIndices();
      const pos = p.getAttribute("POSITION");
      tris += (idx ? idx.getCount() : pos.getCount()) / 3;
      vertices += pos.getCount();
    }
  }
  return { tris, prims, vertices };
}

/**
 * @param {"world"|"props"} kit
 * @param {string} raiz raíz del repositorio.
 */
export async function optimizarKit(kit, raiz) {
  const origen = joinPath(raiz, "assets", "production", kit, "v001");
  const destinoRaiz = joinPath(raiz, "assets", "production", kit, "v002");

  const ids = readdirSync(origen, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const manifiestoV001 = JSON.parse(readFileSync(joinPath(origen, "manifest.json"), "utf8"));
  const resumen = [];

  for (const id of ids) {
    const src = joinPath(origen, id, id + ".glb");
    const destDir = joinPath(destinoRaiz, id);
    const dest = joinPath(destDir, id + ".glb");

    const doc = await io.read(src);
    await doc.transform(
      dedup(),
      weld({ tolerance: 0 }),
      prune({ keepAttributes: false, keepIndices: false, keepLeaves: false }),
      joinPrims(),
      quantize({
        quantizePosition: 14,
        quantizeNormal: 10,
        quantizeColor: 8,
        quantizeTexcoord: 12,
      }),
    );

    const bytes = await io.writeBinary(doc);
    mkdirSync(destDir, { recursive: true });
    writeFileSync(dest, bytes);

    // La caja se mide releyendo el archivo escrito, que es el que se sirve:
    // así la medida publicada describe exactamente lo que se dibuja.
    const caja = medirCajaGlb(await io.read(dest));
    const { tris, prims, vertices } = contar(doc);

    const antes = statSync(src).size;
    const despues = bytes.byteLength;
    const shaV001 = createHash("sha256").update(readFileSync(src)).digest("hex");
    const sha256 = createHash("sha256").update(readFileSync(dest)).digest("hex");
    const entradaV001 = (manifiestoV001.assets ?? []).find((a) => a.id === id) ?? {};

    resumen.push({ id, antes, despues, tris, prims, vertices, caja, sha256, shaV001 });

    console.log(
      id.padEnd(18) +
        " " +
        kib(antes).padStart(5) +
        " KiB -> " +
        kib(despues).padStart(5) +
        " KiB (-" +
        (100 - (despues / antes) * 100).toFixed(1) +
        " %)  " +
        tris +
        " tri, " +
        prims +
        " prim  caja " +
        caja.size.join(" x ") +
        " m",
    );

    writeFileSync(
      joinPath(destDir, "asset.json"),
      JSON.stringify(
        {
          ...entradaV001,
          version: "v002",
          derived_from: "assets/production/" + kit + "/v001/" + id + "/" + id + ".glb",
          glb: id + ".glb",
          glb_bytes: despues,
          glb_bytes_v001: antes,
          sha256,
          source_sha256: shaV001,
          triangles: tris,
          vertices,
          // Caja medida en el espacio del GLB (Y arriba), no en el de Blender
          // (Z arriba) que publica `bounds` de v001. `size_glb` es
          // [ancho X, alto Y, largo Z] en metros.
          bounds_glb: { min: caja.min, max: caja.max },
          size_glb: caja.size,
          note:
            "Variante optimizada de v001: mismo recuento de triángulos, solo " +
            "cambia la precisión de almacenamiento de los atributos " +
            "(KHR_mesh_quantization). Sin Draco ni meshopt.",
        },
        null,
        2,
      ) + "\n",
    );
  }

  const totalAntes = resumen.reduce((a, r) => a + r.antes, 0);
  const totalDespues = resumen.reduce((a, r) => a + r.despues, 0);
  console.log(
    "\n" +
      kit +
      ": " +
      resumen.length +
      " modelos, " +
      mib(totalAntes) +
      " MiB -> " +
      mib(totalDespues) +
      " MiB (-" +
      (100 - (totalDespues / totalAntes) * 100).toFixed(1) +
      " %)",
  );

  writeFileSync(
    joinPath(destinoRaiz, "manifest.json"),
    JSON.stringify(
      {
        version: "v002",
        derived_from: "assets/production/" + kit + "/v001/manifest.json",
        stage: "quantized_for_runtime",
        lossless: false,
        compression: "none",
        requires_extensions: ["KHR_mesh_quantization"],
        pipeline: [
          "dedup",
          "weld(tolerance=0)",
          "prune(keepAttributes=false)",
          "join",
          "quantize(pos=14,normal=10,color=8,texcoord=12)",
        ],
        note:
          "Variante optimizada de v001, generada por optimize.mjs. Mismo " +
          "recuento de triángulos que v001: solo cambia la precisión de " +
          "almacenamiento de los atributos (KHR_mesh_quantization, soportado " +
          "de serie por three.js). Sin Draco ni meshopt: el runtime no " +
          "empaqueta decodificador. v001 queda intacto como fuente y es la " +
          "referencia de arte. `size_glb` es la caja real medida en el espacio " +
          "del GLB (Y arriba): [ancho X, alto Y, largo Z] en metros.",
        assets: resumen.map((r) => ({
          id: r.id,
          glb: r.id + "/" + r.id + ".glb",
          sha256: r.sha256,
          // sha256 del GLB de v001 del que sale este archivo. Cierra la cadena:
          // `scripts/sync-runtime-assets.mjs` comprueba que coincide con el
          // que registra el manifiesto de v001.
          source_sha256: r.shaV001,
          source_glb: "assets/production/" + kit + "/v001/" + r.id + "/" + r.id + ".glb",
          bytes: r.despues,
          bytes_v001: r.antes,
          triangles: r.tris,
          vertices: r.vertices,
          material_primitives: r.prims,
          bounds_glb: { min: r.caja.min, max: r.caja.max },
          size_glb: r.caja.size,
        })),
        total_glb_bytes: totalDespues,
        total_glb_bytes_v001: totalAntes,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("assets/production/" + kit + "/v002/manifest.json escrito.");
  return resumen;
}
