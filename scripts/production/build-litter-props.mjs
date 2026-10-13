#!/usr/bin/env node
// Genera los tres props de residuo (cáscara, vaso desechable, envoltorio)
// en el mismo formato del kit: v001 fuente + v002 cuantizado.
//
// No pasan por Blender: se autoran en glTF (Y arriba) con la paleta y el
// lenguaje low-poly del kit (`world-kit.py`). AGENTS.md pide no tocar los
// modelos fuente existentes; estos ids son nuevos.
//
// Uso, desde la raíz: node scripts/production/build-litter-props.mjs

import { Document, NodeIO, Primitive } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, join as joinPrims, prune, quantize, weld } from "@gltf-transform/functions";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const V001 = join(ROOT, "assets", "production", "props", "v001");
const V002 = join(ROOT, "assets", "production", "props", "v002");

// Paleta del kit (`scripts/production/world-kit.py`), RGB 0..1.
const PALETA = {
  yellow: [1, 0.55, 0.017],
  white: [0.9, 0.88, 0.76],
  sand: [0.84, 0.61, 0.29],
  pink: [0.9, 0.11, 0.15],
  wood: [0.42, 0.18, 0.05],
  soil: [0.31, 0.15, 0.058],
  leaf: [0.1, 0.34, 0.025],
};

function material(doc, nombre, rgb) {
  return doc
    .createMaterial(nombre)
    .setBaseColorFactor([...rgb, 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.72)
    .setDoubleSided(false);
}

function empujarCaja(caras, min, max, material) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const carasDeCaja = [
    { n: [0, 1, 0], v: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] },
    { n: [0, -1, 0], v: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
    { n: [0, 0, 1], v: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { n: [0, 0, -1], v: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] },
    { n: [1, 0, 0], v: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
    { n: [-1, 0, 0], v: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
  ];
  for (const cara of carasDeCaja) {
    caras.push({ material, verts: cara.v, normal: cara.n });
  }
}

function empujarFrustum(caras, y0, y1, r0, r1, segmentos, material) {
  for (let i = 0; i < segmentos; i += 1) {
    const a0 = (i / segmentos) * Math.PI * 2;
    const a1 = ((i + 1) / segmentos) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const p00 = [r0 * c0, y0, r0 * s0];
    const p10 = [r0 * c1, y0, r0 * s1];
    const p01 = [r1 * c0, y1, r1 * s0];
    const p11 = [r1 * c1, y1, r1 * s1];
    const nx = c0 + c1;
    const nz = s0 + s1;
    const len = Math.hypot(nx, nz) || 1;
    caras.push({
      material,
      verts: [p00, p10, p11, p01],
      normal: [nx / len, 0, nz / len],
    });
  }
  const tapaAbajo = [];
  const tapaArriba = [];
  for (let i = 0; i < segmentos; i += 1) {
    const a = (i / segmentos) * Math.PI * 2;
    tapaAbajo.push([r0 * Math.cos(a), y0, r0 * Math.sin(a)]);
    tapaArriba.push([r1 * Math.cos(a), y1, r1 * Math.sin(a)]);
  }
  for (let i = 1; i < segmentos - 1; i += 1) {
    caras.push({
      material,
      verts: [tapaAbajo[0], tapaAbajo[i], tapaAbajo[i + 1]],
      normal: [0, -1, 0],
    });
    caras.push({
      material,
      verts: [tapaArriba[0], tapaArriba[i + 1], tapaArriba[i]],
      normal: [0, 1, 0],
    });
  }
}

function mallaDeCaras(doc, buffer, grupos) {
  const porMaterial = new Map();
  for (const cara of grupos) {
    const lista = porMaterial.get(cara.material) ?? [];
    lista.push(cara);
    porMaterial.set(cara.material, lista);
  }

  const mesh = doc.createMesh();
  for (const [mat, caras] of porMaterial) {
    const positions = [];
    const normals = [];
    const indices = [];
    for (const cara of caras) {
      const base = positions.length / 3;
      if (cara.verts.length === 4) {
        for (const v of cara.verts) {
          positions.push(v[0], v[1], v[2]);
          normals.push(cara.normal[0], cara.normal[1], cara.normal[2]);
        }
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      } else if (cara.verts.length === 3) {
        for (const v of cara.verts) {
          positions.push(v[0], v[1], v[2]);
          normals.push(cara.normal[0], cara.normal[1], cara.normal[2]);
        }
        indices.push(base, base + 1, base + 2);
      }
    }
    const posAcc = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array(positions))
      .setBuffer(buffer);
    const nrmAcc = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array(normals))
      .setBuffer(buffer);
    const idxAcc = doc
      .createAccessor()
      .setType("SCALAR")
      .setArray(new Uint16Array(indices))
      .setBuffer(buffer);
    mesh.addPrimitive(
      doc
        .createPrimitive()
        .setMode(Primitive.Mode.TRIANGLES)
        .setAttribute("POSITION", posAcc)
        .setAttribute("NORMAL", nrmAcc)
        .setIndices(idxAcc)
        .setMaterial(mat),
    );
  }
  return mesh;
}

function bananaPeel() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const amarillo = material(doc, "peel_outer", PALETA.yellow);
  const crema = material(doc, "peel_inner", PALETA.white);
  const caras = [];

  // Tres tiras curvadas sobre el suelo, lenguaje de cajas del kit.
  const tiras = [
    { min: [-0.16, 0.0, -0.03], max: [0.16, 0.018, 0.03], outer: true },
    { min: [-0.14, 0.0, 0.03], max: [0.05, 0.016, 0.09], outer: true },
    { min: [-0.12, 0.0, -0.09], max: [0.08, 0.016, -0.03], outer: true },
  ];
  for (const tira of tiras) {
    empujarCaja(caras, tira.min, tira.max, amarillo);
    const interior = [
      [tira.min[0] + 0.008, tira.max[1] - 0.004, tira.min[2] + 0.006],
      [tira.max[0] - 0.008, tira.max[1] + 0.004, tira.max[2] - 0.006],
    ];
    empujarCaja(caras, interior[0], interior[1], crema);
  }
  // Cabo oscuro en un extremo, para que se lea como cáscara y no como cinta.
  empujarCaja(caras, [0.14, 0.0, -0.018], [0.19, 0.022, 0.018], material(doc, "peel_stem", PALETA.wood));

  const mesh = mallaDeCaras(doc, buffer, caras);
  doc.createScene().addChild(doc.createNode("banana_peel").setMesh(mesh));
  return doc;
}

function disposableCup() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const vaso = material(doc, "cup_body", PALETA.white);
  const borde = material(doc, "cup_rim", PALETA.sand);
  const caras = [];

  // Vaso tumbado sobre el costado: el eje largo va en X, apoyado en Y=0.
  // Se construye como frustum y luego se rota en el nodo.
  empujarFrustum(caras, 0.0, 0.11, 0.038, 0.048, 12, vaso);
  empujarCaja(caras, [-0.05, 0.1, -0.05], [0.05, 0.118, 0.05], borde);

  const mesh = mallaDeCaras(doc, buffer, caras);
  const nodo = doc
    .createNode("disposable_cup")
    .setMesh(mesh)
    .setRotation([-0.7071068, 0, 0, 0.7071068])
    .setTranslation([0, 0.048, 0]);
  doc.createScene().addChild(nodo);
  return doc;
}

function crumpledWrapper() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const papel = material(doc, "wrap_paper", PALETA.sand);
  const marca = material(doc, "wrap_mark", PALETA.pink);
  const sombra = material(doc, "wrap_fold", PALETA.wood);
  const caras = [];

  empujarCaja(caras, [-0.07, 0.0, -0.045], [0.07, 0.028, 0.05], papel);
  empujarCaja(caras, [-0.04, 0.02, -0.02], [0.055, 0.045, 0.035], papel);
  empujarCaja(caras, [0.01, 0.012, -0.055], [0.08, 0.034, 0.01], sombra);
  empujarCaja(caras, [-0.025, 0.026, 0.0], [0.02, 0.038, 0.04], marca);

  const mesh = mallaDeCaras(doc, buffer, caras);
  doc.createScene().addChild(doc.createNode("crumpled_wrapper").setMesh(mesh));
  return doc;
}

const IDENTIDAD = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

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

/** Caja en espacio del GLB (Y arriba), con las transformaciones de los nodos. */
function boundsDe(doc) {
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
  return { min: min.map(red), max: max.map(red) };
}

function contar(doc) {
  let triangles = 0;
  let vertices = 0;
  let prims = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      prims += 1;
      const idx = prim.getIndices();
      const pos = prim.getAttribute("POSITION");
      triangles += (idx ? idx.getCount() : pos.getCount()) / 3;
      vertices += pos.getCount();
    }
  }
  return { triangles, vertices, prims };
}

async function escribirFuente(id, doc) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const bytes = await io.writeBinary(doc);
  const dir = join(V001, id);
  mkdirSync(dir, { recursive: true });
  const glbPath = join(dir, `${id}.glb`);
  writeFileSync(glbPath, bytes);
  const caja = boundsDe(doc);
  const { triangles } = contar(doc);
  const asset = {
    id,
    family: "props",
    units: "meters",
    up: "Y",
    front: "+Z",
    pivot: "local origin; terrain pivot at walk-surface height",
    triangles,
    bounds: { min: caja.min, max: caja.max },
    anchors: {},
    collider_proposals: [],
    colliders_integrated: false,
    status: "visual_candidate",
    animations: [],
    limitations: [
      "Authored in glTF Y-up to match the existing props kit silhouette; not a Blender v001 rebuild.",
      "Static closed model; no interiors or gameplay",
    ],
    glb_bytes: bytes.byteLength,
  };
  writeFileSync(join(dir, "asset.json"), JSON.stringify(asset, null, 2) + "\n");
  return { bytes: bytes.byteLength, triangles, caja, sha: createHash("sha256").update(bytes).digest("hex") };
}

async function optimizarUno(id) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const src = join(V001, id, `${id}.glb`);
  const destDir = join(V002, id);
  const dest = join(destDir, `${id}.glb`);
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
  return bytes;
}

function parchearManifiestoV001(nuevos) {
  const ruta = join(V001, "manifest.json");
  const manifiesto = JSON.parse(readFileSync(ruta, "utf8"));
  const ids = new Set(nuevos.map((a) => a.id));
  manifiesto.assets = [
    ...manifiesto.assets.filter((a) => !ids.has(a.id)),
    ...nuevos,
  ];
  writeFileSync(ruta, JSON.stringify(manifiesto, null, 2) + "\n");
}

function parchearManifiestoV002(entradas) {
  const ruta = join(V002, "manifest.json");
  const manifiesto = JSON.parse(readFileSync(ruta, "utf8"));
  const ids = new Set(entradas.map((a) => a.id));
  const assets = [...manifiesto.assets.filter((a) => !ids.has(a.id)), ...entradas];
  manifiesto.assets = assets.sort((a, b) => a.id.localeCompare(b.id));
  manifiesto.total_glb_bytes = manifiesto.assets.reduce((s, a) => s + a.bytes, 0);
  manifiesto.total_glb_bytes_v001 = manifiesto.assets.reduce((s, a) => s + a.bytes_v001, 0);
  writeFileSync(ruta, JSON.stringify(manifiesto, null, 2) + "\n");
}

const FABRICAS = {
  banana_peel: bananaPeel,
  disposable_cup: disposableCup,
  crumpled_wrapper: crumpledWrapper,
};

const entradasV001 = [];
const entradasV002 = [];

for (const [id, fabrica] of Object.entries(FABRICAS)) {
  const doc = fabrica();
  const fuente = await escribirFuente(id, doc);
  const bytesV002 = await optimizarUno(id);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const docV002 = await io.read(join(V002, id, `${id}.glb`));
  const caja = boundsDe(docV002);
  const { triangles: tris, vertices, prims } = contar(docV002);
  const sha = createHash("sha256").update(bytesV002).digest("hex");

  writeFileSync(
    join(V002, id, "asset.json"),
    JSON.stringify(
      {
        id,
        family: "props",
        units: "meters",
        up: "Y",
        version: "v002",
        derived_from: `assets/production/props/v001/${id}/${id}.glb`,
        glb: `${id}.glb`,
        glb_bytes: bytesV002.byteLength,
        glb_bytes_v001: fuente.bytes,
        sha256: sha,
        source_sha256: fuente.sha,
        triangles: tris,
        vertices,
        bounds_glb: { min: caja.min, max: caja.max },
        size_glb: [0, 1, 2].map((i) => Number((caja.max[i] - caja.min[i]).toFixed(4))),
        note: "Variante optimizada de v001 con KHR_mesh_quantization. Sin Draco ni meshopt.",
      },
      null,
      2,
    ) + "\n",
  );

  entradasV001.push({
    id,
    family: "props",
    units: "meters",
    up: "Y",
    front: "+Z",
    pivot: "local origin; terrain pivot at walk-surface height",
    triangles: fuente.triangles,
    bounds: fuente.caja,
    anchors: {},
    collider_proposals: [],
    colliders_integrated: false,
    status: "visual_candidate",
    animations: [],
    limitations: [
      "Authored in glTF Y-up to match the existing props kit silhouette; not a Blender v001 rebuild.",
      "Static closed model; no interiors or gameplay",
    ],
    glb_bytes: fuente.bytes,
  });

  entradasV002.push({
    id,
    glb: `${id}/${id}.glb`,
    sha256: sha,
    source_sha256: fuente.sha,
    source_glb: `assets/production/props/v001/${id}/${id}.glb`,
    bytes: bytesV002.byteLength,
    bytes_v001: fuente.bytes,
    triangles: tris,
    vertices,
    material_primitives: prims,
    bounds_glb: { min: caja.min, max: caja.max },
    size_glb: [0, 1, 2].map((i) => Number((caja.max[i] - caja.min[i]).toFixed(4))),
  });

  console.log(
    `${id.padEnd(20)} ${fuente.bytes} B -> ${bytesV002.byteLength} B  ${tris} tri  caja ${entradasV002.at(-1).size_glb.join(" x ")} m`,
  );
}

parchearManifiestoV001(entradasV001);
parchearManifiestoV002(entradasV002);
console.log("Manifiestos de props v001 y v002 actualizados.");
