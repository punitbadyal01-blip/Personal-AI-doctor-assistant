let endpoint='';
try{endpoint=localStorage.getItem('healthclear-backend-url')||'';}catch{}
let token='';
let sequence=0;
const pending=new Map();
export const connection={get url(){return endpoint;},get ready(){return !!(endpoint&&token);},configure(url,accessToken){const u=new URL(url);const local=globalThis.HealthClearAndroid?.localDevelopment?.()&&u.origin==='http://127.0.0.1:8080';if((u.protocol!=='https:'&&!local)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Use an HTTPS backend origin, for example https://your-backend.example.com');if(accessToken.trim().length<32)throw Error('Enter the backend access token (at least 32 characters), not your AI provider key.');endpoint=u.origin;token=accessToken.trim();try{localStorage.setItem('healthclear-backend-url',endpoint);}catch{}},disconnect(){token='';endpoint='';try{localStorage.removeItem('healthclear-backend-url');}catch{}}};
if(typeof window!=='undefined')window.healthclearApiResponse=(id,status,body)=>{const task=pending.get(id);if(!task)return;pending.delete(id);clearTimeout(task.timer);try{const data=JSON.parse(body);if(status<200||status>=300)throw Error(data.error||'Backend request failed.');task.resolve(data);}catch(e){task.reject(e);}};
export async function api(route,payload={}){
 if(!connection.ready)throw Error('Connect your backend in Settings before analyzing personal reports.');
 if(!['status','ocr','explain','chat','cloud'].includes(route))throw Error('Unsupported operation.');
 const body=JSON.stringify(payload);
 if(globalThis.HealthClearAndroid){return new Promise((resolve,reject)=>{const id=String(++sequence);const timer=setTimeout(()=>{pending.delete(id);reject(Error('Request timed out. Please retry.'));},110000);pending.set(id,{resolve,reject,timer});HealthClearAndroid.request(id,endpoint,token,route,body);});}
 let response;try{response=await fetch(endpoint+'/v1/'+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body,signal:AbortSignal.timeout(100000)});}catch{throw Error('Could not connect securely to your backend. Check its URL and network connection.');}
 let result;try{result=await response.json();}catch{throw Error('The backend returned an invalid response.');}if(!response.ok)throw Error(result.error||'Request failed.');return result;
}
export async function extract(file){const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('File could not be read.'));reader.readAsDataURL(file);});return api('ocr',{mime:file.type,base64,consent:true});}
export function normalizeExplanation(data,text,lang,labels){
 const none={en:'No follow-up recommendation was identified in the reviewed text.',hi:'जाँचे गए पाठ में आगे की जाँच की सलाह नहीं मिली।',te:'సమీక్షించిన వచనంలో తదుపరి పరీక్ష సూచన కనిపించలేదు.'};
 return {summary:data.findings.slice(0,2).map(f=>f.text).join(' '),findings:data.findings.map(f=>({...f,value:'',outside:false,rangeText:printedRange(text.split(/\r?\n/)[f.ref]||'',lang)})),follow:data.followups.map(f=>f.text).join('\n')||none[lang],followRefs:data.followups.map(f=>f.ref),followRef:data.followups[0]?.ref??null,terms:data.terms.map(t=>`${t.term}: ${t.definition}`).join('\n'),questions:data.questions.join('\n'),labels:labels[lang],live:true};
}
export function printedRange(line,language='en'){
 const m=line.match(/^[^:]+:\s*([-+]?\d+(?:\.\d+)?)\s*(.*?)\s*\|\s*Reference range:\s*([-+]?\d+(?:\.\d+)?)\s*[–-]\s*([-+]?\d+(?:\.\d+)?)\s*(.*?)\s*$/i);
 if(!m||m[2].trim()!==m[5].trim())return '';
 const value=Number(m[1]),low=Number(m[3]),high=Number(m[4]);if(![value,low,high].every(Number.isFinite)||low>high)return '';
 const index=value<low?0:value>high?1:2;
 return ({en:['Below the printed reference range','Above the printed reference range','Within the printed reference range'],hi:['दी गई संदर्भ सीमा से कम','दी गई संदर्भ सीमा से अधिक','दी गई संदर्भ सीमा में'],te:['ఇచ్చిన సూచన పరిధి కంటే తక్కువ','ఇచ్చిన సూచన పరిధి కంటే ఎక్కువ','ఇచ్చిన సూచన పరిధిలో ఉంది']}[language]||[])[index]||'';
}
