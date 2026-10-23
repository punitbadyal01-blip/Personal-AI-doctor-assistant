import {normalizeLanguage} from './languages.js';
// Reject corrupt history as a whole so a later save never silently overwrites entries.
export function parseHistory(raw,knownReports){
 if(typeof raw!=='string'||raw.length>1500000)throw Error('Invalid saved history.');
 const items=JSON.parse(raw);if(!Array.isArray(items)||items.length>100)throw Error('Invalid saved history.');
 for(const item of items){
  if(!item||!normalizeLanguage(item.lang)||typeof item.date!=='string'||!Number.isFinite(+new Date(item.date)))throw Error('Invalid saved entry.');
  if(!item.live){if(!Object.hasOwn(knownReports,item.id)||!knownReports[item.id].copy[item.lang])throw Error('Unknown sample.');continue;}
  const result=item.result;
  if(typeof item.name!=='string'||item.name.length>1024||typeof item.text!=='string'||!item.text.trim()||item.text.length>30000||!result||!Array.isArray(result.findings)||!result.findings.length||result.findings.length>100)throw Error('Invalid personal report.');
  const lines=item.text.split(/\r?\n/),validRef=value=>Number.isInteger(value)&&value>=0&&value<lines.length;
  for(const field of ['summary','follow','terms','questions'])if(typeof result[field]!=='string')throw Error('Invalid explanation.');
  for(const finding of result.findings){if(!finding||!validRef(finding.ref)||typeof finding.text!=='string'||['quote','value','rangeText'].some(key=>finding[key]!==undefined&&typeof finding[key]!=='string'))throw Error('Invalid finding.');if(finding.quote!==undefined&&finding.quote!==lines[finding.ref])throw Error('Source mismatch.');}
  if(result.followRefs!==undefined&&(!Array.isArray(result.followRefs)||result.followRefs.some(ref=>!validRef(ref))))throw Error('Invalid follow-up references.');
  if(result.followRef!==undefined&&result.followRef!==null&&!validRef(result.followRef))throw Error('Invalid follow-up reference.');
 }
 return items;
}
