import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogs,preferences,setPreference,t,formatDate} from './dist/i18n.js';
import {h} from './dist/ui.js';
test('interface catalogs have complete matching keys and placeholders',()=>{const keys=Object.keys(catalogs.en);assert.ok(keys.length>=180);for(const lang of ['hi','te']){assert.deepEqual(Object.keys(catalogs[lang]),keys);for(const key of keys){assert.ok(catalogs[lang][key].trim());assert.deepEqual((catalogs[lang][key].match(/\{\w+\}/g)||[]).sort(),(catalogs.en[key].match(/\{\w+\}/g)||[]).sort());}}});
test('all literal translation keys used in application modules exist',async()=>{for(const file of ['app.js','ui.js','i18n.js']){const text=await readFile(new URL('./dist/'+file,import.meta.url),'utf8');for(const match of text.matchAll(/\bt\('([^']+)'/g))assert.ok(catalogs.en[match[1]],`${file}: missing ${match[1]}`);}});
test('preferences reject unexpected values and retain technical placeholders',()=>{assert.equal(setPreference('language','ar'),false);assert.equal(setPreference('theme','unknown'),false);for(const lang of ['en','hi','te']){assert.equal(setPreference('language',lang),true);assert.ok(t('page',{page:2,total:10}).includes('10'));assert.ok(formatDate('2026-10-23T12:00:00Z'));}setPreference('language','en');});
test('untrusted filenames and source text are escaped as text',()=>{assert.equal(h('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');assert.equal(h('10.8 g/dL'), '10.8 g/dL');});
import {parseHistory} from './dist/history.js';
import {reports} from './dist/services.js';
test('corrupt or unsupported history is preserved by rejecting the entire collection',()=>{const valid={id:'blood',lang:'en',date:'2026-10-23T00:00:00Z'};assert.deepEqual(parseHistory(JSON.stringify([valid]),reports),[valid]);for(const broken of [null,{...valid,id:'unknown'}, {...valid,lang:'unsupported'},{live:true,name:'x',text:'value',lang:'en',date:valid.date,result:{findings:[null]}}])assert.throws(()=>parseHistory(JSON.stringify([valid,broken]),reports));});
test('browser speech never sends report text to a network-backed voice',async()=>{
 const {speechService}=await import('./dist/services.js');const oldSpeech=globalThis.speechSynthesis,oldUtterance=globalThis.SpeechSynthesisUtterance;let spoken=null;
 try{globalThis.speechSynthesis={getVoices:()=>[{lang:'en-US',localService:false}],cancel(){},speak(value){spoken=value;}};assert.throws(()=>speechService.play('FICTIONAL source text','en',1));assert.equal(spoken,null);globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};globalThis.speechSynthesis.getVoices=()=>[{lang:'en-US',localService:true}];speechService.play('FICTIONAL source text','en',1);assert.equal(spoken.text,'FICTIONAL source text');}finally{if(oldSpeech===undefined)delete globalThis.speechSynthesis;else globalThis.speechSynthesis=oldSpeech;if(oldUtterance===undefined)delete globalThis.SpeechSynthesisUtterance;else globalThis.SpeechSynthesisUtterance=oldUtterance;}
});
