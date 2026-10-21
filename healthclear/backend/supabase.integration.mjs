import {randomUUID} from 'node:crypto';
const {SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:key,SUPABASE_SECRET_KEY:secret}=process.env;
if(!url||!key||!secret)throw Error('Configure Supabase in backend/.env first. Use a development project.');
const users=[];
async function request(path,{method='GET',body,token,admin=false}={}){
 const apiKey=admin?secret:key;const bearer=token||(admin?secret:key);
 const r=await fetch(url+path,{method,headers:{apikey:apiKey,...(bearer.startsWith('sb_')?{}:{Authorization:'Bearer '+bearer}),'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 const text=await r.text();return {status:r.status,data:text?JSON.parse(text):null};
}
function check(ok,message){if(!ok)throw Error(message);}
try{
 for(let i=0;i<2;i++){
  const email=`healthclear-test-${randomUUID()}@example.com`,password=randomUUID()+randomUUID();
  const r=await request('/auth/v1/admin/users',{admin:true,method:'POST',body:{email,password,email_confirm:true}});check(r.status<300&&r.data.id,'Could not create test user.');users.push({id:r.data.id});
  const login=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});check(login.data.access_token,'Test login failed.');users.at(-1).token=login.data.access_token;
 }
 const [a,b]=users,id=randomUUID();
 const save=await request('/rest/v1/reports',{method:'POST',token:a.token,body:{id,owner_id:a.id,name:'FICTIONAL isolation test',text:'Possible change. No actual patient.',language:'en'}});check(save.status<300,'Owner insert failed. Apply migration.');
 const own=await request('/rest/v1/reports?id=eq.'+id,{token:a.token});check(own.data?.length===1,'Owner cannot read report.');
 const other=await request('/rest/v1/reports?id=eq.'+id,{token:b.token});check(other.status===200&&other.data.length===0,'RLS leak: other user can read report.');
 const anon=await request('/rest/v1/reports?id=eq.'+id);check(anon.status===401||anon.status===403,'Anonymous access was not denied.');
 const forged=await request('/rest/v1/reports',{method:'POST',token:b.token,body:{owner_id:a.id,name:'forged',text:'fictional',language:'en'}});check(forged.status===403,'RLS allows forged ownership.');
 const deletion=await request('/rest/v1/reports?id=eq.'+id,{method:'DELETE',token:b.token});check(deletion.status===200&&deletion.data.length===0,'RLS allows another user to delete.');
 const removed=await request('/rest/v1/reports?id=eq.'+id,{method:'DELETE',token:a.token});check(removed.status<300&&removed.data.length===1,'Owner deletion failed.');
 console.log('PASS: live owner read/write/delete, cross-user isolation and anonymous denial.');
}finally{
 for(const user of users){const r=await request('/auth/v1/admin/users/'+user.id,{method:'DELETE',admin:true});if(r.status>=300)console.error('Clean up temporary test account in Auth dashboard:',user.id);}
}
