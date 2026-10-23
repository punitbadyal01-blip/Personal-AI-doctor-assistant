import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('./dist/',import.meta.url)).replace(/[\\/]$/,'');
export function createPreviewServer({port=5173,accessToken='',backend='http://127.0.0.1:8080',gateway=false,fetchImpl=fetch}={}){
 const session=randomBytes(32).toString('hex');
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  const origin='http://127.0.0.1:'+(port||req.socket.localPort),expectedHost=new URL(origin).host;
  if(req.headers.host!==expectedHost){json(res,403,{error:'Use the local preview address.'});req.resume();return;}
  if(req.url.startsWith('/api/')){
   if(!gateway||accessToken.length<32){json(res,503,{error:'Local service is not configured.'});req.resume();return;}
   if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&req.headers.origin!==origin)){json(res,403,{error:'Local access only.'});req.resume();return;}
   if(req.url==='/api/bootstrap'&&req.method==='GET'){json(res,200,{session});return;}
   const supplied=Buffer.from(req.headers['x-healthclear-session']||''),expected=Buffer.from(session);
   if(req.method!=='POST'||req.headers.origin!==origin||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){json(res,403,{error:'Reload HealthClear to reconnect.'});req.resume();return;}
   const route=req.url.slice(5);
   if(!['status','ocr','explain','chat','cloud'].includes(route)){json(res,404,{error:'Not found.'});req.resume();return;}
   if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'JSON required.'});req.resume();return;}
   try{
    let size=0,chunks=[];const limit=route==='ocr'?14*1024*1024:128*1024;
    for await(const chunk of req){size+=chunk.length;if(size>limit){json(res,413,{error:'Request is too large.'});req.resume();return;}chunks.push(chunk);}
    const response=await fetchImpl(backend+'/v1/'+route,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:Buffer.concat(chunks),signal:AbortSignal.timeout(105000)});chunks=[];
    json(res,response.status,await response.json());
   }catch{json(res,502,{error:'The local report service could not be reached.',code:'service_error'});}return;
  }
  if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'Method not allowed.'});req.resume();return;}
  try{const name=decodeURIComponent(new URL(req.url,origin).pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error();const body=await readFile(file);res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8'})[file.split('.').pop()]||'application/octet-stream');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; object-src 'self' blob:; connect-src 'self' https: http://127.0.0.1:8080; base-uri 'none'; frame-ancestors 'none'");res.end(req.method==='HEAD'?undefined:body);}catch{json(res,404,{error:'Not found.'});}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const port=Number(process.env.PREVIEW_PORT||5173);let local={};
 if(port===5173&&process.env.HEALTHCLEAR_LOCAL_GATEWAY!=='false'){try{local=parseEnv(await readFile(new URL('./backend/.env',import.meta.url),'utf8'));}catch{}}
 const server=createPreviewServer({port,gateway:port===5173,accessToken:process.env.HEALTHCLEAR_ACCESS_TOKEN||local.HEALTHCLEAR_ACCESS_TOKEN||''});server.requestTimeout=110000;server.headersTimeout=15000;
 server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
}
