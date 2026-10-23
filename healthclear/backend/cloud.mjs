import {normalizeLanguage} from '../dist/languages.js';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
export class CloudError extends Error {constructor(status,message){super(message);this.status=status;}}
export function createCloud({url,key,adminKey,fetchImpl=fetch}){
 const invalidKeys=!!(key&&adminKey&&(key===adminKey||adminKey.startsWith('sb_publishable_')||key.startsWith('sb_secret_')));
 const ready=!!(url&&key&&adminKey)&&!invalidKeys;
 if(url&&!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw Error('SUPABASE_URL must be the HTTPS project origin.');
 async function request(path,{token=key,method='GET',body,admin=false}={}){
  let response;try{response=await fetchImpl(url+path,{method,headers:{apikey:admin?adminKey:key,...((admin?adminKey:token)?.startsWith('sb_')?{}:{Authorization:'Bearer '+(admin?adminKey:token)}),'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});}catch{throw new CloudError(503,'Cloud service unavailable. Please retry.');}
  if(!response.ok)throw new CloudError(response.status===401||response.status===403?401:response.status===429?429:response.status===409?409:400,'Cloud request failed. Check your sign-in, email confirmation and database setup.');
  if(response.status===204)return null;
  const text=await response.text();try{return text?JSON.parse(text):null;}catch{throw new CloudError(502,'Invalid cloud response.');}
 }
 return {ready,async run(body){
  if(invalidKeys)throw new CloudError(503,'Supabase key configuration is invalid. The backend needs a publishable key and a separate secret key.');
  if(!ready)throw new CloudError(503,'Supabase is not configured on this backend.');
  const {action,session}=body;
  if(action==='google-start'){
   const settings=await request('/auth/v1/settings');
   if(settings.external?.google!==true)throw new CloudError(503,'Google sign-in is not enabled yet. You can sign in with email.');
   const verifier=randomBytes(32).toString('base64url');
   const authorize=new URL(url+'/auth/v1/authorize');
   authorize.search=new URLSearchParams({provider:'google',redirect_to:'com.healthclear.app://auth/callback',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'s256'}).toString();
   return {url:authorize.href,verifier};
  }
  if(action==='recovery-start'){
   if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email))throw new CloudError(400,'Enter a valid email.');
   const verifier=randomBytes(32).toString('base64url');
   await request('/auth/v1/recover?redirect_to='+encodeURIComponent('com.healthclear.app://auth/callback'),{method:'POST',body:{email:body.email,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'s256'}});
   return {verifier,message:'If an account exists, a recovery email has been requested.'};
  }
  if(['google-exchange','recovery-exchange'].includes(action)){
   if(typeof body.code!=='string'||!/^[A-Za-z0-9_-]{10,2048}$/.test(body.code)||typeof body.verifier!=='string'||!/^[A-Za-z0-9_-]{43,128}$/.test(body.verifier))throw new CloudError(400,'Invalid sign-in callback. Please start Google sign-in again.');
   const data=await request('/auth/v1/token?grant_type=pkce',{method:'POST',body:{auth_code:body.code,code_verifier:body.verifier}});
   if(typeof data.access_token!=='string'||!data.user?.id)throw new CloudError(502,'Google sign-in could not be verified. Please retry.');
   return {session:data.access_token,email:data.user.email||'',message:'Signed in with Google.'};
  }
  if(['signup','login'].includes(action)){
   if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email)||typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw new CloudError(400,'Enter an email and password of 12–128 characters.');
   const data=await request(action==='signup'?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{method:'POST',body:{email:body.email,password:body.password}});
   return {session:data.access_token||null,email:data.user?.email||null,message:data.access_token?'Signed in.':'Check your email to confirm your account, then sign in.'};
  }
  if(typeof session!=='string'||session.length<32||session.length>4096)throw new CloudError(401,'Sign in to your cloud account.');
  const user=await request('/auth/v1/user',{token:session});
  if(!user?.id)throw new CloudError(401,'Your session expired. Sign in again.');
  if(action==='password-update'){
   if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw new CloudError(400,'Enter a password of 12–128 characters.');
   await request('/auth/v1/user',{token:session,method:'PUT',body:{password:body.password}});return {ok:true};
  }
  if(action==='logout'){await request('/auth/v1/logout',{token:session,method:'POST'});return {ok:true};}
  if(action==='delete-account'){
   if(body.confirm!=='DELETE')throw new CloudError(400,'Type DELETE to confirm account deletion.');
   await request('/auth/v1/logout?scope=global',{token:session,method:'POST'});
   await request('/auth/v1/admin/users/'+encodeURIComponent(user.id),{admin:true,method:'DELETE'});return {ok:true};
  }
  const base='/rest/v1/reports';
  if(action==='list'){
   if(![50,100].includes(body.limit??100)||!Number.isInteger(body.offset??0)||(body.offset??0)<0||(body.offset??0)>1000000||typeof (body.search??'')!=='string'||(body.search??'').length>100||!['newest','oldest','name'].includes(body.sort??'newest'))throw new CloudError(400,'Invalid report search.');
   const order={newest:'created_at.desc,id.desc',oldest:'created_at.asc,id.asc',name:'name.asc,id.asc'}[body.sort??'newest'];
   const query=new URLSearchParams({select:'id,name,language,created_at',order,limit:String(body.limit??100),offset:String(body.offset??0)});
   const search=(body.search??'').trim().replace(/[*%]/g,'');if(search)query.set('name','ilike.*'+search+'*');
   return {reports:await request(base+'?'+query,{token:session})};
  }
  if(action==='save'){
   if(body.saveConsent!==true)throw new CloudError(400,'Explicit cloud saving consent is required.');
   const r=body.report;
   if(!r||typeof r.name!=='string'||!r.name.trim()||r.name.length>200||typeof r.text!=='string'||!r.text.trim()||r.text.length>30000||!normalizeLanguage(r.language))throw new CloudError(400,'Invalid report.');
   if(body.requestId!==undefined&&(typeof body.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)))throw new CloudError(400,'Invalid save request.');
   const id=body.requestId||randomUUID();
   try{const rows=await request(base,{token:session,method:'POST',body:{id,owner_id:user.id,name:r.name,text:r.text,language:r.language}});return {id:rows[0].id};}
   catch(error){if(error.status!==409||!body.requestId)throw error;const rows=await request(base+'?id=eq.'+id+'&select=*',{token:session});const saved=rows?.[0];if(saved&&saved.name===r.name&&saved.text===r.text&&saved.language===r.language)return {id};throw new CloudError(409,'This save request has already been used. Start a new save.');}
  }
  if(!['open','delete'].includes(action)||typeof body.id!=='string'||! /^[0-9a-f-]{36}$/i.test(body.id))throw new CloudError(400,'Invalid cloud operation.');
  const rows=await request(base+'?id=eq.'+body.id+'&select=*',{token:session,method:action==='delete'?'DELETE':'GET'});
  if(!rows?.length)throw new CloudError(404,'Report not found or not accessible.');
  return action==='delete'?{ok:true}:{report:rows[0]};
 }};
}
