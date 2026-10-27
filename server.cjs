const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 4173);
const clients=new Set();
let reloadTimer;
fs.watch(root,{recursive:true},(_,file)=>{
  if(!file||!(/\.(js|html)$/.test(file)))return;
  clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>{for(const res of clients)res.write('data: reload\n\n');},200);
});
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/__reload'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(': connected\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;
  }
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
  const file = path.resolve(root, '.' + (pathname==='/'?'/index.html':pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end('Not found');return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');if(file.endsWith('index.html'))data=data.toString().replace('</body>',`<script>new EventSource('/__reload').onmessage=()=>location.reload();</script></body>`);res.end(data);});
}).listen(port,'127.0.0.1',()=>console.log(`MOONBLADE: http://localhost:${port}`));
