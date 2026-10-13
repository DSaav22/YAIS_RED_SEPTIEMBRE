const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
let checked=0;
const npcIds=['child_explorer','child_wheelchair','educator','community_guide'];
const npcVersion=id=>id==='child_explorer'?'v001':'v002';
const pages=['assets/production/index.html','assets/production/viewer.html','assets/production/animated/v001/index.html','assets/production/mascot/v005/preview.html',...npcIds.map(id=>`assets/production/npc/${npcVersion(id)}/${id}/preview.html`)];
for(const rel of pages){
  const file=path.join(root,rel),html=fs.readFileSync(file,'utf8');
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const target=match[1];if(target.startsWith('#')||/^https?:/.test(target))continue;
    const localTarget=target.split('?')[0].split('#')[0].replaceAll('&amp;','&');
    assert.ok(fs.existsSync(path.resolve(path.dirname(file),localTarget)),`${rel}: ${target}`);
    if(target.includes('viewer.html?')){
      const query=new URL(target.replaceAll('&amp;','&'),'http://localhost/').searchParams;
      assert.ok(fs.existsSync(path.join(root,'assets/production',query.get('model'))),`${rel}: model missing`);
    }
    checked++;
  }
}
const viewer=fs.readFileSync(path.join(root,'assets/production/viewer.html'),'utf8');
assert.match(viewer,/model-viewer/);assert.match(viewer,/camera-controls/);
console.log(`${checked} local links and media paths exist.`);
async function main(){
  const url=process.argv[2];if(!url)return;
  const npcRoutes=npcIds.flatMap(id=>[`/npc/${npcVersion(id)}/${id}/preview.html`,`/npc/${npcVersion(id)}/${id}/three-quarter.png`,`/assets/production/npc/${npcVersion(id)}/${id}/${id}.glb`]);
  const rigRoutes=['/animated/v001/index.html','/assets/production/animated/v001/manifest.json',...['mascot',...npcIds].map(id=>`/assets/production/animated/v001/${id}/${id}.glb`)];
  for(const route of ['/','/assets/production/mascot/v005/side.png','/assets/production/world/v001/manifest.json',...npcRoutes,...rigRoutes]){
    const res=await fetch(url+route);assert.equal(res.status,200,route);await res.arrayBuffer();
  }
  const denied=await fetch(url+'/raw/inbox/private.txt');assert.equal(denied.status,403);
  console.log('Gallery HTTP checks passed; raw/ is not served.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
