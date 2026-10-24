// Optional live check using fixed fictional text only. No upload or filename input.
import {createProvider,providerConfig} from './server.mjs';

try{
 const config=providerConfig({...process.env,AI_PROVIDER:'gemini'});
 if(!config.apiKey||!config.model)throw new Error('Set GEMINI_API_KEY and GEMINI_MODEL privately in backend/.env first.');
 const provider=createProvider(config);
 const result=await provider('explain',{
  text:'FICTIONAL TEST REPORT — NOT A REAL PATIENT\nHemoglobin: 13.0 g/dL | Reference range: 12.0–15.5 g/dL\nPossible mild change.\nNo pleural effusion.',
  language:'en'
 });
 console.log(JSON.stringify({status:'passed',provider:'gemini',fictional:true,sourceLinkedFindings:result.findings.length,note:'This verifies one fictional text explanation, not OCR, clinical accuracy, billing or permission to process personal reports.'}));
}catch(error){
 console.error(error.status?error.message:error.message?.startsWith('Set GEMINI_')?error.message:'Gemini test setup failed. Check the model ID and private configuration.');
 process.exitCode=1;
}
