const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'../../assets/production/npc/v001');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
assert.equal(manifest.count,4);assert.equal(manifest.characters.length,4);
let totalTris=0,totalBytes=0;
for(const asset of manifest.characters){
  const dest=path.resolve(dir,'..',asset.version,asset.id),b=fs.readFileSync(path.join(dest,asset.id+'.glb'));
  assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);
  assert.equal(b.readUInt32LE(8),b.length);assert.equal(b.length,asset.glb_bytes);
  const len=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+len));
  assert.equal(b.readUInt32LE(16),0x4E4F534A);assert.equal(b.readUInt32LE(24+len),0x004E4942);
  const bin=b.subarray(28+len);let tris=0;
  assert.ok(g.meshes.length>30);assert.equal((g.animations||[]).length,0);assert.equal((g.skins||[]).length,0);
  for(const mesh of g.meshes)for(const prim of mesh.primitives){
    assert.ok(prim.mode===undefined||prim.mode===4);
    const pos=g.accessors[prim.attributes.POSITION],view=g.bufferViews[pos.bufferView];
    assert.equal(pos.componentType,5126);assert.equal(pos.type,'VEC3');
    const start=(view.byteOffset||0)+(pos.byteOffset||0),stride=view.byteStride||12;
    for(let i=0;i<pos.count;i++)for(let j=0;j<3;j++)assert.ok(Number.isFinite(bin.readFloatLE(start+i*stride+j*4)));
    const indices=g.accessors[prim.indices];assert.equal(indices.count%3,0);tris+=indices.count/3;
    const iv=g.bufferViews[indices.bufferView],off=(iv.byteOffset||0)+(indices.byteOffset||0);
    const size={5121:1,5123:2,5125:4}[indices.componentType];assert.ok(size);
    for(let i=0;i<indices.count;i++)assert.ok(bin.readUIntLE(off+i*size,size)<pos.count,'Index outside vertex range');
    assert.ok(g.materials[prim.material]);
  }
  assert.equal(tris,asset.triangles);assert.ok(fs.statSync(path.join(dest,asset.id+'.blend')).size>10000);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dest,'verification.json'),'utf8')).glb_reimport,'passed');
  for(const view of ['front','three-quarter','side','back']){
    const png=fs.readFileSync(path.join(dest,view+'.png'));
    assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),640);assert.equal(png.readUInt32BE(20),768);
  }
  assert.ok(fs.existsSync(path.join(dest,'preview.html')));
  totalTris+=tris;totalBytes+=b.length;
  console.log(JSON.stringify({id:asset.id,checks:'passed',triangles:tris,bytes:b.length}));
}
console.log(JSON.stringify({count:4,triangles:totalTris,glb_bytes:totalBytes,rig:false,animations:0}));
