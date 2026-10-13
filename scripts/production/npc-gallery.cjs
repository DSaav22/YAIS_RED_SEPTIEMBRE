// Generate four self-contained static galleries from the actual completed assets.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../assets/production/npc/v001');
const data=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const views=[['front','Frente'],['three-quarter','Tres cuartos'],['side','Perfil'],['back','Espalda']];
for(const a of data.characters){
  const assetDir=path.resolve(root,'..',a.version,a.id);
  const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>YAIS · ${a.label}</title><style>
:root{color-scheme:dark}body{margin:0;background:#102b32;color:#eef5ed;font:17px/1.6 system-ui}main{max-width:1280px;margin:auto;padding:28px}a{color:#ffd277}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}figure{margin:0;background:#24434a;border-radius:16px;overflow:hidden}img{display:block;width:100%}figcaption{padding:12px}nav{display:flex;gap:18px;flex-wrap:wrap}.notice{border-left:3px solid #ffd277;padding:15px 20px;background:#24434a}small{color:#bbd0c9}@media(max-width:800px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}main{padding:18px}}
</style><main><a href="../../../index.html#npc">← Catálogo de personajes</a><h1>${a.label}</h1>
<nav><a href="../../../viewer.html?model=npc/${a.version}/${a.id}/${a.id}.glb&amp;name=${encodeURIComponent(a.label)}">Girar el modelo en 3D</a><a href="${a.id}.glb" download>Descargar GLB</a><a href="${a.id}.blend" download>Descargar Blender</a><a href="asset.json">Ficha técnica</a></nav>
<p class="notice">NPC ${a.version} · modelo estático nuevo para revisión. Estas cuatro imágenes son renders del mismo GLB, no ilustraciones. Todavía no tiene rig ni animaciones.</p>
<div class="grid">${views.map(([id,label])=>`<figure><a href="${id}.png"><img src="${id}.png" alt="${a.label}: ${label}"></a><figcaption>${label}</figcaption></figure>`).join('')}</div>
<p><small>${a.triangles.toLocaleString('es')} triángulos · ${(a.glb_bytes/1e6).toFixed(2)} MB · ${a.meshes} piezas de malla · altura de montaje ${a.height_m.toFixed(2)} m. Las piezas están nombradas para continuar la preparación; aún falta topología de deformación, simplificación, rig y colisiones en el motor.</small></p>
<p><a href="../../../../references-3d/technical/${a.reference}">Hoja artística de referencia</a> · <a href="verification.json">Verificación de reimportación</a></p>
</main></html>`;
  fs.writeFileSync(path.join(assetDir,'preview.html'),html);
}
console.log('Four NPC galleries generated.');
