// Loopback-only gallery server. Exposes production art/reference art, never raw/.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const types={'.html':'text/html; charset=utf-8','.png':'image/png','.glb':'model/gltf-binary',
 '.blend':'application/octet-stream','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}
  catch{res.writeHead(400).end();return;}
  // The catalog is exposed at / for convenience; translate its relative
  // links to the real assets/production tree.
  let virtual=pathname;
  if(pathname==='/')virtual='/assets/production/index.html';
  else if(pathname==='/index.html'||pathname==='/viewer.html'||pathname.startsWith('/mascot/')||pathname.startsWith('/world/')||pathname.startsWith('/props/')||pathname.startsWith('/npc/')||pathname.startsWith('/animated/'))virtual='/assets/production'+pathname;
  else if(pathname.startsWith('/references-3d/'))virtual='/assets/references-3d'+pathname.slice('/references-3d'.length);
  else if(pathname==='/PRODUCCION-3D.md')virtual=pathname;
  const allowed=virtual.startsWith('/assets/production/')||virtual.startsWith('/assets/references-3d/')||virtual==='/PRODUCCION-3D.md';
  const file=path.resolve(root,'.'+virtual);
  if(!allowed||!file.startsWith(root+path.sep)||!types[path.extname(file)]){res.writeHead(403).end();return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end('No encontrado');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Content-Length':stat.size,
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(file).pipe(res);
  });
});
const port=Number(process.argv[2]||process.env.YAIS_PREVIEW_PORT||0);
server.listen(port,'127.0.0.1',()=>console.log('YAIS_PREVIEW_URL=http://127.0.0.1:'+server.address().port+'/'));
