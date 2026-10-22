import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloud} from './cloud.mjs';
import {createServer} from './server.mjs';
const session='user-session-token-12345678901234567890';
function cloud(handler){const calls=[];return {calls,service:createCloud({url:'https://example.supabase.co',key:'publishable',adminKey:'server-secret',fetchImpl:async(url,options)=>{calls.push({url,...options});const value=handler(url,options);return new Response(value===null?null:JSON.stringify(value),{status:value===null?204:200});}})};}
test('unconfigured cloud fails explicitly',async()=>{await assert.rejects(createCloud({}).run({action:'list'}),e=>e.status===503);});
test('credentials are validated before sending to Supabase',async()=>{const c=cloud(()=>({}));await assert.rejects(c.service.run({action:'login',email:'bad',password:'short'}),e=>e.status===400);assert.equal(c.calls.length,0);});
test('email confirmation signup does not fabricate a session',async()=>{const c=cloud(()=>({user:{email:'test@example.com'}}));const r=await c.service.run({action:'signup',email:'test@example.com',password:'long-test-password'});assert.equal(r.session,null);assert.match(r.message,/confirm/);assert.equal(c.calls[0].headers.apikey,'publishable');});
test('report operations require verified user session',async()=>{const c=cloud(()=>({}));await assert.rejects(c.service.run({action:'list'}),e=>e.status===401);assert.equal(c.calls.length,0);await assert.rejects(c.service.run({action:'list',session}),e=>e.status===401);assert.equal(c.calls.length,1);});
test('save needs explicit consent and assigns ownership from verified user',async()=>{const c=cloud(url=>url.includes('/auth/')?{id:'owner-a'}:[{id:'saved'}]);await assert.rejects(c.service.run({action:'save',session,report:{}}),e=>e.status===400);assert.equal(c.calls.length,1);const result=await c.service.run({action:'save',session,saveConsent:true,owner_id:'attacker',report:{name:'Test',text:'Possible change.',language:'en',owner_id:'attacker'}});assert.equal(result.id,'saved');const request=c.calls.at(-1);assert.equal(JSON.parse(request.body).owner_id,'owner-a');assert.equal(request.headers.Authorization,'Bearer '+session);assert.equal(request.headers.apikey,'publishable');assert.ok(!request.body.includes('attacker'));});
test('list uses user JWT not admin key so RLS applies',async()=>{const c=cloud(url=>url.includes('/auth/')?{id:'owner-a'}:[]);assert.deepEqual(await c.service.run({action:'list',session}),{reports:[]});assert.equal(c.calls.at(-1).headers.Authorization,'Bearer '+session);assert.ok(c.calls.every(c=>!JSON.stringify(c.headers).includes('server-secret')));});
test('inaccessible report produces not found rather than data',async()=>{const c=cloud(url=>url.includes('/auth/')?{id:'owner-a'}:[]);await assert.rejects(c.service.run({action:'open',session,id:'11111111-1111-1111-1111-111111111111'}),e=>e.status===404);});
test('account deletion requires confirmation and deletes only authenticated user',async()=>{const c=cloud(url=>url.endsWith('/user')?{id:'owner-a'}:null);await assert.rejects(c.service.run({action:'delete-account',session,confirm:'no'}),e=>e.status===400);await c.service.run({action:'delete-account',session,confirm:'DELETE',userId:'victim'});const req=c.calls.at(-1);assert.ok(req.url.endsWith('/admin/users/owner-a'));assert.equal(req.method,'DELETE');assert.equal(req.headers.apikey,'server-secret');});
test('provider errors never echo credentials or medical text',async()=>{const c=createCloud({url:'https://example.supabase.co',key:'k',adminKey:'secret',fetchImpl:async()=>new Response('patient confidential secret',{status:500})});await assert.rejects(c.run({action:'list',session}),e=>!e.message.includes('confidential')&&!e.message.includes('secret'));});
test('cloud route works without AI credentials and still requires backend authentication',async t=>{const s=createServer({accessToken:session,configured:false,cloud:{ready:true,run:async()=>({reports:[]})}});await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>s.close(r)));const url='http://127.0.0.1:'+s.address().port+'/v1/cloud';const post=token=>fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'list'})});assert.equal((await post('wrong')).status,401);assert.deepEqual(await (await post(session)).json(),{reports:[]});});

test('wrong key types and duplicate keys never report cloud ready or make requests',async()=>{
 for(const [key,adminKey] of [['sb_publishable_example','sb_publishable_example'],['sb_publishable_a','sb_publishable_b'],['sb_secret_example','sb_secret_admin']]){
  let called=false;const c=createCloud({url:'https://example.supabase.co',key,adminKey,fetchImpl:async()=>{called=true;}});
  assert.equal(c.ready,false);await assert.rejects(c.run({action:'list',session}),e=>e.status===503&&/separate secret key/.test(e.message));assert.equal(called,false);
 }
});
import {createHash} from 'node:crypto';

test('Google start refuses a disabled provider without creating a fake sign-in',async()=>{
 const c=cloud(()=>({external:{google:false}}));await assert.rejects(c.service.run({action:'google-start'}),e=>e.status===503&&/not enabled/.test(e.message));assert.equal(c.calls.length,1);
});
test('Google sign-in uses a new S256 PKCE verifier and exact Android redirect',async()=>{
 const c=cloud(()=>({external:{google:true}}));const a=await c.service.run({action:'google-start'}),b=await c.service.run({action:'google-start'});
 assert.notEqual(a.verifier,b.verifier);assert.match(a.verifier,/^[A-Za-z0-9_-]{43}$/);const u=new URL(a.url);
 assert.equal(u.origin,'https://example.supabase.co');assert.equal(u.pathname,'/auth/v1/authorize');assert.equal(u.searchParams.get('provider'),'google');assert.equal(u.searchParams.get('redirect_to'),'com.healthclear.app://auth/callback');assert.equal(u.searchParams.get('code_challenge_method'),'s256');assert.equal(u.searchParams.get('code_challenge'),createHash('sha256').update(a.verifier).digest('base64url'));assert.ok(!a.url.includes(a.verifier));assert.ok(!JSON.stringify(a).includes('server-secret'));
});
test('Google exchange sends the code and verifier to Supabase, never to Google directly',async()=>{
 const c=cloud(()=>({access_token:session,refresh_token:'not-returned',user:{id:'test',email:'test@example.com'}}));const code='auth-code-1234567890',verifier='a'.repeat(43);const data=await c.service.run({action:'google-exchange',code,verifier});
 assert.equal(data.session,session);assert.equal(data.email,'test@example.com');assert.ok(!('refresh_token' in data));assert.equal(c.calls[0].url,'https://example.supabase.co/auth/v1/token?grant_type=pkce');assert.deepEqual(JSON.parse(c.calls[0].body),{auth_code:code,code_verifier:verifier});assert.equal(c.calls[0].headers.apikey,'publishable');
});
test('invalid Google callback is rejected before any remote call',async()=>{
 const c=cloud(()=>({}));for(const body of [{code:'bad',verifier:'a'.repeat(43)},{code:'valid-code-12345',verifier:'short'},{code:'https://attacker.example',verifier:'a'.repeat(43)}])await assert.rejects(c.service.run({action:'google-exchange',...body}),e=>e.status===400);assert.equal(c.calls.length,0);
});
test('incomplete Google exchange response never creates a session',async()=>{
 const c=cloud(()=>({access_token:session}));await assert.rejects(c.service.run({action:'google-exchange',code:'valid-code-12345',verifier:'a'.repeat(43)}),e=>e.status===502);
});
test('modern Supabase secret keys use the apikey header without posing as a user JWT',async()=>{
 let headers;const c=createCloud({url:'https://example.supabase.co',key:'sb_publishable_example',adminKey:'sb_secret_example',fetchImpl:async(url,options)=>{headers=options.headers;return new Response(JSON.stringify(url.endsWith('/user')?{id:'owner-a'}:{}),{status:200});}});
 await c.run({action:'delete-account',session,confirm:'DELETE'});assert.equal(headers.apikey,'sb_secret_example');assert.ok(!('Authorization' in headers));
});
