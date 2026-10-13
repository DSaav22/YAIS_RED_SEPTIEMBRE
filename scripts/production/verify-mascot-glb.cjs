// Dependency-free GLB checks, including exported geometry and vertex colors.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const version = process.argv[2] || 'v004';
assert.match(version, /^v\d{3}$/);
const file = path.resolve(__dirname, '../../assets/production/mascot', version, 'mascot.glb');
const bytes = fs.readFileSync(file);
assert.equal(bytes.toString('ascii',0,4), 'glTF');
assert.equal(bytes.readUInt32LE(4),2);
assert.equal(bytes.readUInt32LE(8),bytes.length);
const jsonLength=bytes.readUInt32LE(12);
assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
const gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
const binHeader=20+jsonLength;
assert.equal(bytes.readUInt32LE(binHeader+4),0x004e4942);
const bin=bytes.subarray(binHeader+8);
assert.ok(gltf.meshes.length>0);
assert.equal((gltf.animations||[]).length,0);
assert.equal((gltf.skins||[]).length,0);
let triangles=0, vertices=0, coloredPrimitives=0;
const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
for (const mesh of gltf.meshes) {
  for (const primitive of mesh.primitives) {
    assert.equal(primitive.mode ?? 4,4);
    const acc=gltf.accessors[primitive.attributes.POSITION];
    assert.equal(acc.type,'VEC3');
    assert.equal(acc.componentType,5126);
    const view=gltf.bufferViews[acc.bufferView];
    const offset=(view.byteOffset||0)+(acc.byteOffset||0);
    const stride=view.byteStride||12;
    assert.ok(offset+(acc.count-1)*stride+12<=bin.length);
    for (let i=0;i<acc.count;i++) {
      for(let axis=0;axis<3;axis++) {
        const value=bin.readFloatLE(offset+i*stride+axis*4);
        assert.ok(Number.isFinite(value));
        min[axis]=Math.min(min[axis],value);
        max[axis]=Math.max(max[axis],value);
      }
    }
    vertices+=acc.count;
    const idx=gltf.accessors[primitive.indices];
    assert.equal(idx.count%3,0);
    triangles+=idx.count/3;
    if (primitive.attributes.COLOR_0 !== undefined) {
      const color=gltf.accessors[primitive.attributes.COLOR_0];
      assert.equal(color.count,acc.count);
      coloredPrimitives++;
    }
  }
}
if (['v004','v005'].includes(version)) assert.ok(coloredPrimitives>=8,'Coat color was lost');
const report=JSON.parse(fs.readFileSync(path.join(path.dirname(file),'report.json'),'utf8'));
assert.equal(triangles,report.triangles);
assert.equal(bytes.length,report.glb_bytes);
console.log(JSON.stringify({version,status:'passed',bytes:bytes.length,
  meshes:gltf.meshes.length,triangles,vertices,coloredPrimitives,
  finitePositions:true,animations:0,skins:0},null,2));
