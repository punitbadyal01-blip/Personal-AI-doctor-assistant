let endpoint='';
try{endpoint=localStorage.getItem('healthclear-backend-url')||'';}catch{}
let localSession='',token='',epoch=0,sequence=0;
const pending=new Map(),controllers=new Set();
function failure(status,data){const error=new Error(data?.error||'Backend request failed.');error.status=status;error.code=data?.code;return error;}
function cancelPending(){epoch++;for(const task of pending.values()){clearTimeout(task.timer);task.reject(failure(0,{error:'Connection changed.'}));}pending.clear();for(const controller of controllers)controller.abort();controllers.clear();}
export const connection={get managed(){return !!localSession;},get url(){return endpoint;},get ready(){return !!(localSession||endpoint&&token);},configure(url,accessToken){const u=new URL(url);const local=u.origin==='http://127.0.0.1:8080'&&(globalThis.HealthClearAndroid?globalThis.HealthClearAndroid.localDevelopment?.():globalThis.location?.origin==='http://127.0.0.1:5173');if((u.protocol!=='https:'&&!local)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Use an HTTPS backend origin.');if(typeof accessToken!=='string'||accessToken.trim().length<32||/[\r\n]/.test(accessToken))throw Error('Enter the backend access token (at least 32 characters).');cancelPending();localSession='';endpoint=u.origin;token=accessToken.trim();try{localStorage.setItem('healthclear-backend-url',endpoint);}catch{}},disconnect(){cancelPending();localSession='';token='';endpoint='';try{localStorage.removeItem('healthclear-backend-url');}catch{}}};
export async function connectLocal(){if(globalThis.HealthClearAndroid||globalThis.location?.origin!=='http://127.0.0.1:5173')return false;try{const r=await fetch('/api/bootstrap',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4000)});const data=await r.json();if(!r.ok||!/^([a-f0-9]{64})$/.test(data.session))return false;cancelPending();localSession=data.session;endpoint='';token='';return true;}catch{return false;}}
if(typeof window!=='undefined')window.healthclearApiResponse=(id,status,body)=>{const task=pending.get(id);if(!task)return;pending.delete(id);clearTimeout(task.timer);try{const data=JSON.parse(body);if(status<200||status>=300)throw failure(status,data);task.resolve(data);}catch(e){task.reject(e);}};
export async function api(route,payload={}){
 if(!connection.ready)throw Error('Connect your backend in Settings.');
 if(!['status','ocr','explain','chat','cloud'].includes(route))throw Error('Unsupported operation.');
 const body=JSON.stringify(payload),version=epoch;
 try{
  if(globalThis.HealthClearAndroid){return await new Promise((resolve,reject)=>{const id=String(++sequence);const timer=setTimeout(()=>{pending.delete(id);reject(failure(504,{error:'Request timed out.'}));},110000);pending.set(id,{resolve,reject,timer});HealthClearAndroid.request(id,endpoint,token,route,body);});}
  const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),100000);
  try{let response;try{response=await fetch(localSession?'/api/'+route:endpoint+'/v1/'+route,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(localSession?{'X-HealthClear-Session':localSession}:{Authorization:'Bearer '+token})},body,signal:controller.signal});}catch{throw Error('Could not connect securely to your backend.');}
   const data=await response.json().catch(()=>{throw Error('Invalid backend response.');});if(epoch!==version)throw Error('Connection changed.');if(!response.ok)throw failure(response.status,data);return data;
  }finally{clearTimeout(timer);controllers.delete(controller);}
 }catch(error){if(route==='cloud'&&payload.session&&error.status===401&&error.code!=='backend_auth'&&typeof window!=='undefined')window.dispatchEvent(new Event('healthclear-session-expired'));throw error;}
}
export async function extract(file){const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('File could not be read.'));reader.readAsDataURL(file);});return api('ocr',{mime:file.type,base64,consent:true});}
export function normalizeExplanation(data,text,lang,labels){
 const none={en:'No follow-up recommendation was identified in the reviewed text.',hi:'जाँचे गए पाठ में आगे की जाँच की सलाह नहीं मिली।',te:'సమీక్షించిన వచనంలో తదుపరి పరీక్ష సూచన కనిపించలేదు.'};
 return {summary:data.findings.slice(0,2).map(f=>f.text).join(' '),findings:data.findings.map(f=>({...f,value:'',outside:false,rangeText:printedRange(text.split(/\r?\n/)[f.ref]||'',lang)})),follow:data.followups.map(f=>f.text).join('\n')||data.ui?.noFollowup||none[lang]||none.en,followRefs:data.followups.map(f=>f.ref),followRef:data.followups[0]?.ref??null,terms:data.terms.map(t=>`${t.term}: ${t.definition}`).join('\n'),questions:data.questions.join('\n'),labels:data.ui||labels[lang]||labels.en,live:true};
}
export function printedRange(line,language='en'){
 const m=line.match(/^[^:]+:\s*([-+]?\d+(?:\.\d+)?)\s*(.*?)\s*\|\s*Reference range:\s*([-+]?\d+(?:\.\d+)?)\s*[–-]\s*([-+]?\d+(?:\.\d+)?)\s*(.*?)\s*$/i);
 if(!m||m[2].trim()!==m[5].trim())return '';
 const value=Number(m[1]),low=Number(m[3]),high=Number(m[4]);if(![value,low,high].every(Number.isFinite)||low>high)return '';
 const index=value<low?0:value>high?1:2;
 return ({en:['Below the printed reference range','Above the printed reference range','Within the printed reference range'],hi:['दी गई संदर्भ सीमा से कम','दी गई संदर्भ सीमा से अधिक','दी गई संदर्भ सीमा में'],te:['ఇచ్చిన సూచన పరిధి కంటే తక్కువ','ఇచ్చిన సూచన పరిధి కంటే ఎక్కువ','ఇచ్చిన సూచన పరిధిలో ఉంది']}[language]||['Below the printed reference range','Above the printed reference range','Within the printed reference range'])[index]||'';
}
