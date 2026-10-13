// Verify exported static batches without loading Blender or GPU libraries.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../assets/production');
const batches=['world/v001','props/v001'];
let total=0;
for(const batch of batches){
  const dir=path.join(root,batch);
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
  let triangles=0,bytes=0;
  for(const asset of manifest.assets){
    const b=fs.readFileSync(path.join(dir,asset.id,asset.id+'.glb'));
    assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);
    assert.equal(b.readUInt32LE(8),b.length);assert.equal(b.length,asset.glb_bytes);
    const length=b.readUInt32LE(12);
    const gltf=JSON.parse(b.toString('utf8',20,20+length));
    const bin=b.subarray(28+length);
    assert.equal(gltf.meshes.length,1,asset.id+' must be one static joined mesh');
    assert.equal((gltf.animations||[]).length,0);
    let meshTriangles=0;
    for(const prim of gltf.meshes[0].primitives){
      const p=gltf.accessors[prim.attributes.POSITION],v=gltf.bufferViews[p.bufferView];
      assert.equal(p.componentType,5126);assert.equal(p.type,'VEC3');
      const start=(v.byteOffset||0)+(p.byteOffset||0),stride=v.byteStride||12;
      for(let i=0;i<p.count;i++)for(let c=0;c<3;c++)assert.ok(Number.isFinite(bin.readFloatLE(start+i*stride+c*4)));
      const idx=gltf.accessors[prim.indices];assert.equal(idx.count%3,0);
      meshTriangles+=idx.count/3;
      assert.ok(gltf.materials[prim.material]);
    }
    assert.equal(meshTriangles,asset.triangles,asset.id+' triangle mismatch');
    assert.ok(fs.existsSync(path.join(dir,asset.id,asset.id+'.blend')));
    for(const c of asset.collider_proposals){
      assert.ok(c.center.every(Number.isFinite));
      if(c.size)assert.ok(c.size.every(n=>n>0));
    }
    triangles+=meshTriangles;bytes+=b.length;total++;
  }
  console.log(JSON.stringify({batch,status:'passed',assets:manifest.assets.length,triangles,bytes}));
}
assert.equal(total,40);console.log('40/40 exported assets passed binary and metadata checks.');
