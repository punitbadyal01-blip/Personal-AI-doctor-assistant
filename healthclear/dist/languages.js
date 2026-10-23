// Report language registry shared with the backend. Interface catalogs are separate.
export const languageCodes = 'aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu'.split(' ');
const known = new Set(languageCodes);
export function normalizeLanguage(value) {
 if(typeof value !== 'string' || value.length > 35 || !/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,3}$/.test(value)) return null;
 try { const tag=Intl.getCanonicalLocales(value)[0]; return known.has(tag.split('-')[0]) ? tag : null; } catch { return null; }
}
export function languageName(code,locale='en') {
 try { return new Intl.DisplayNames([locale],{type:'language'}).of(code) || code; } catch { return code; }
}
export function languageDirection(code) {
 try { const l=new Intl.Locale(code); const info=l.getTextInfo?.()||l.textInfo; if(info)return info.direction; }catch{}
 return /^(ar|fa|he|ur|ps|sd|ug|yi|dv)(-|$)/.test(code)||/-(Arab|Hebr)(-|$)/.test(code)?'rtl':'ltr';
}
export function reportLanguages(locale='en') {
 return Object.fromEntries([...languageCodes,'zh-Hans','zh-Hant','pt-BR','es-MX','en-GB'].map(code=>[code,languageName(code,locale)]).sort((a,b)=>a[1].localeCompare(b[1],locale)));
}
