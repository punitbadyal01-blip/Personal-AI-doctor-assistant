import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from './server.mjs';
import {createCloud} from './cloud.mjs';
const e=process.env;
if(!e.SUPABASE_URL||!e.SUPABASE_SECRET_KEY||!e.SUPABASE_PUBLISHABLE_KEY||!e.HEALTHCLEAR_ACCESS_TOKEN)throw Error('Configure backend/.env. Use a development project.');
const users=[];let server;
async function admin(path,method='GET',body){const key=e.SUPABASE_SECRET_KEY,r=await fetch(e.SUPABASE_URL+path,{method,headers:{apikey:key,...(key.startsWith('sb_')?{}:{Authorization:'Bearer '+key}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});return {status:r.status,data:await r.json().catch(()=>null)};}
try{
 server=createServer({accessToken:e.HEALTHCLEAR_ACCESS_TOKEN,configured:false,cloud:createCloud({url:e.SUPABASE_URL,key:e.SUPABASE_PUBLISHABLE_KEY,adminKey:e.SUPABASE_SECRET_KEY})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const post=async body=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/v1/cloud',{method:'POST',headers:{Authorization:'Bearer '+e.HEALTHCLEAR_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});return {status:r.status,data:await r.json()};};
 for(let i=0;i<2;i++){const email=`healthclear-test-${randomUUID()}@example.com`,password=randomUUID()+randomUUID(),r=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});assert.ok(r.status<300&&r.data.id,'Test account creation failed.');const user={id:r.data.id,email,password};users.push(user);const login=await post({action:'login',email,password});assert.equal(login.status,200);user.session=login.data.session;}
 const [a,b]=users,requestId=randomUUID(),report={name:'FICTIONAL backend verification',text:'Possible mild change.\nNo pleural effusion.',language:'ar'};
 const save=body=>post({action:'save',session:a.session,requestId,report,saveConsent:true,...body});
 assert.equal((await save({saveConsent:false})).status,400);assert.equal((await save({})).status,200);assert.equal((await save({})).data.id,requestId);assert.equal((await save({report:{...report,text:'Different text.'}})).status,409);
 assert.equal((await admin('/rest/v1/reports?owner_id=eq.'+a.id+'&select=id')).data.length,1);
 assert.equal((await post({action:'open',session:a.session,id:requestId})).data.report.language,'ar');
 const list=await post({action:'list',session:a.session,search:'backend verification',sort:'name',offset:0});assert.equal(list.status,200);assert.equal(list.data.reports.length,1);assert.equal((await post({action:'list',session:a.session,search:'NO_MATCH_1234'})).data.reports.length,0);
 for(const action of ['open','delete'])assert.equal((await post({action,session:b.session,id:requestId})).status,404);
 assert.equal((await post({action:'open',session:a.session,id:requestId})).data.report.text,report.text);
 console.log('PASS: live login, consent, idempotent saves, conflict rejection, search/sort and cross-user isolation.');
 const password=randomUUID()+randomUUID();assert.equal((await post({action:'password-update',session:a.session,password})).status,200);assert.equal((await post({action:'login',email:a.email,password:a.password})).status,400);const login=await post({action:'login',email:a.email,password});assert.equal(login.status,200);a.session=login.data.session;
 assert.equal((await post({action:'delete',session:a.session,id:requestId})).status,200);assert.equal((await post({action:'open',session:a.session,id:requestId})).status,404);
 const next=await save({session:a.session,requestId:randomUUID()});assert.equal(next.status,200);
 assert.equal((await post({action:'delete-account',session:a.session,confirm:'DELETE'})).status,200);a.removed=true;assert.equal((await admin('/rest/v1/reports?id=eq.'+next.data.id+'&select=id')).data.length,0);assert.equal((await post({action:'list',session:a.session})).status,401);
 console.log('PASS: password change/login, report deletion, account cascade and deleted-session rejection.');
}finally{if(server)await new Promise(r=>server.close(r));for(const user of users)if(!user.removed){const r=await admin('/auth/v1/admin/users/'+user.id,'DELETE');if(r.status>=300)console.error('Remove temporary test account in Supabase Auth:',user.id);}console.log('Temporary verification accounts cleaned up. No real patient data used.');}
