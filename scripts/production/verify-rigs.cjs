// Independent GLB binary checks. Does not launch Blender or mutate source art.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'assets/production/animated/v001');
const ids=['mascot','child_explorer','child_wheelchair','educator','community_guide'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const results=[];
for(const id of ids){
 const dir=path.join(out,id),meta=JSON.parse(fs.readFileSync(path.join(dir,'asset.json'),'utf8')),bytes=fs.readFileSync(path.join(dir,id+'.glb'));
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const size=bytes.readUInt32LE(12);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);const g=JSON.parse(bytes.toString('utf8',20,20+size));
 const h=20+size;assert.equal(bytes.readUInt32LE(h+4),0x004e4942);const bin=bytes.subarray(h+8);assert.equal(bytes.readUInt32LE(h),bin.length);
 const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},types={5121:[1,'readUInt8',255],5123:[2,'readUInt16LE',65535],5125:[4,'readUInt32LE',4294967295],5126:[4,'readFloatLE',1]};
 function accessor(index){
   const a=g.accessors[index];assert.ok(a&&!a.sparse);const v=g.bufferViews[a.bufferView];assert.equal(v.buffer,0);
   const [size,method,max]=types[a.componentType],n=widths[a.type],stride=v.byteStride||n*size,offset=(v.byteOffset||0)+(a.byteOffset||0);
   assert.ok(offset+(a.count-1)*stride+n*size<=(v.byteOffset||0)+v.byteLength);assert.ok(offset+(a.count-1)*stride+n*size<=bin.length);
   return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,j)=>{const value=bin[method](offset+i*stride+j*size)/(a.normalized?max:1);assert.ok(Number.isFinite(value));return value}));
 }
 assert.equal(g.skins.length,1);const skin=g.skins[0];assert.equal(skin.joints.length,meta.bones);assert.equal(accessor(skin.inverseBindMatrices).length,meta.bones);
 assert.equal(g.meshes.length,1);assert.ok(g.nodes.some(n=>n.mesh===0&&n.skin===0));
 for(const i of skin.joints)assert.ok(g.nodes[i]);
 let tris=0,vertices=0,colored=0;
 for(const p of g.meshes[0].primitives){
   assert.equal(p.mode??4,4);assert.ok(g.materials[p.material]);
   const positions=accessor(p.attributes.POSITION),joints=accessor(p.attributes.JOINTS_0),weights=accessor(p.attributes.WEIGHTS_0);
   assert.equal(joints.length,positions.length);assert.equal(weights.length,positions.length);
   weights.forEach((w,i)=>{assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<.0001);w.forEach((x,j)=>{assert.ok(x>=0&&x<=1);assert.ok(joints[i][j]>=0&&joints[i][j]<skin.joints.length)})});
   const indices=accessor(p.indices);assert.equal(indices.length%3,0);for(const [i] of indices)assert.ok(i<positions.length);
   tris+=indices.length/3;vertices+=positions.length;if(p.attributes.COLOR_0!==undefined){assert.equal(accessor(p.attributes.COLOR_0).length,positions.length);colored++}
 }
 assert.equal(tris,meta.triangles);assert.equal(bytes.length,meta.glb_bytes);if(id==='mascot')assert.ok(colored>=1,'Fur vertex color missing');
 assert.equal(g.animations.length,5);const clips=[];
 for(const a of g.animations){
   const expected=meta.clips.find(c=>c.name===a.name);assert.ok(expected);let duration=0,first=Infinity;
   assert.ok(a.channels.length>0);for(const channel of a.channels)assert.ok(skin.joints.includes(channel.target.node));
   for(const s of a.samplers){const t=accessor(s.input).flat(),values=accessor(s.output);assert.equal(values.length,t.length);assert.ok(t.length>0);for(let i=1;i<t.length;i++)assert.ok(t[i]>t[i-1]);first=Math.min(first,t[0]);duration=Math.max(duration,t.at(-1));}
   assert.ok(Math.abs(duration-expected.seconds)<=1/30+.001);clips.push({name:a.name,duration_seconds:duration,first_key_seconds:first,loop:true,in_place:true});
 }
 const qa=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));assert.equal(qa.glb_reimport,'passed');assert.equal(qa.clips.length,5);
 assert.ok(fs.statSync(path.join(dir,id+'.blend')).size>1000);
 const source=path.join(root,'assets/production',meta.source);
 results.push({id,label:meta.label,glb:`${id}/${id}.glb`,blend:`${id}/${id}.blend`,source:meta.source,source_sha256:hash(fs.readFileSync(source)),sha256:hash(bytes),bytes:bytes.length,bones:meta.bones,triangles:tris,vertices,material_primitives:g.meshes[0].primitives.length,colored_primitives:colored,clips,locomotion:{...meta.locomotion,runtime_duration_seconds:clips.find(c=>c.name===meta.locomotion.clip).duration_seconds},checks:'binary, skin indices, normalized weights, finite geometry, clip channels, Blender reimport'});
}
const manifest={version:'v001',stage:'first_deformation_rig',date:'2026-09-17',engine_neutral:true,root_motion:false,mobile_optimized:false,characters:results,total_clips:results.reduce((n,r)=>n+r.clips.length,0),total_glb_bytes:results.reduce((n,r)=>n+r.bytes,0)};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:'passed',characters:results.length,clips:manifest.total_clips,bytes:manifest.total_glb_bytes,details:results.map(({id,bones,triangles,bytes,material_primitives})=>({id,bones,triangles,bytes,material_primitives}))},null,2));
