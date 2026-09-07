const http=require("node:http");
const https=require("node:https");
const {URL}=require("node:url");

const PORT=Number(process.env.PORT||8080);
const PLAYER=String(process.env.PLAYER_APP_ORIGIN||"https://ludo-live.up.railway.app").replace(/\/$/,"");
const TOKEN=String(process.env.ADMIN_GATEWAY_TOKEN||"");

function manifest(res){
  const body=Buffer.from(JSON.stringify({
    id:"/ludo-live-admin",
    name:"Ludo Live Admin",
    short_name:"Ludo Admin",
    description:"Administrative management application for Ludo Live.",
    start_url:"/dbase/login",
    scope:"/dbase/",
    display:"standalone",
    orientation:"portrait-primary",
    background_color:"#020817",
    theme_color:"#07152d",
    icons:[{src:"/icons/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any maskable"}]
  }));
  res.writeHead(200,{"content-type":"application/manifest+json","cache-control":"no-store","content-length":body.length});
  res.end(body);
}

function sw(res){
  const body=Buffer.from('const C="ludo-live-admin";self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));self.addEventListener("fetch",e=>{if(e.request.method==="GET"){const u=new URL(e.request.url);if(u.origin===self.location.origin&&u.pathname.startsWith("/dbase/"))e.respondWith(fetch(e.request,{cache:"no-store"}));}});');
  res.writeHead(200,{"content-type":"application/javascript","cache-control":"no-store","service-worker-allowed":"/dbase/","content-length":body.length});
  res.end(body);
}

function proxy(req,res,path){
  const u=new URL(PLAYER+path);
  const client=u.protocol==="https:"?https:http;
  const headers={...req.headers,host:u.host,origin:u.origin,referer:u.origin+"/","x-ludo-admin-gateway":TOKEN};
  delete headers.host; headers.host=u.host;
  const up=client.request(u,{method:req.method,headers},r=>{
    const out={...r.headers};
    if(r.headers["set-cookie"]){
      const cs=Array.isArray(r.headers["set-cookie"])?r.headers["set-cookie"]:[r.headers["set-cookie"]];
      out["set-cookie"]=cs.map(c=>c.replace(/;\s*Domain=[^;]*/ig,"").replace(/;\s*SameSite=[^;]*/ig,"; SameSite=Lax"));
    }
    const chunks=[];
    r.on("data",c=>chunks.push(c));
    r.on("end",()=>{
      let body=Buffer.concat(chunks);
      if(String(r.headers["content-type"]||"").includes("text/html")){
        let html=body.toString("utf8");
        // The gateway has its own PWA identity. Remove any player manifest and
        // inject the dedicated admin manifest so Chrome does not treat the admin
        // as the already-installed player app.
        html=html.replaceAll(PLAYER,"");
        html=html.replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi,"");
        const manifestTag='<link rel="manifest" href="/admin-manifest.json">';
        const swScript='<script>(function(){if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js",{scope:"/dbase/",updateViaCache:"none"}).catch(function(){});});}})();</script>';
        if(/<head[^>]*>/i.test(html)){
          html=html.replace(/<head[^>]*>/i,function(m){return m+manifestTag;});
          html=html.replace(/<\/head>/i,swScript+"</head>");
        }
        body=Buffer.from(html);
        delete out["content-length"]; out["content-length"]=String(body.length);
      }
      res.writeHead(r.statusCode||502,out);res.end(body);
    });
  });
  up.on("error",()=>{res.writeHead(502,{"content-type":"text/plain;charset=utf-8","cache-control":"no-store"});res.end("Ludo Live Admin is temporarily unavailable.");});
  req.pipe(up);
}

http.createServer((req,res)=>{
  const p=req.url||"/";
  if(p==="/health"){const b='{"status":"ok","service":"ludo-live-admin"}';res.writeHead(200,{"content-type":"application/json","content-length":b.length});return res.end(b);}
  if(p==="/admin-manifest.json"||p==="/manifest.json")return manifest(res);
  if(p==="/sw.js")return sw(res);
  if(p==="/") {res.writeHead(302,{location:"/dbase/login", "cache-control":"no-store"});return res.end();}
  proxy(req,res,p);
}).listen(PORT,"0.0.0.0",()=>console.log("Ludo Live Admin listening on "+PORT));
