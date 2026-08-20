const API='https://api.github.com/repos/ARARAT33/AWEArchiveDB/contents/a2zdb.json';
const RAW_DB='https://raw.githubusercontent.com/ARARAT33/AWEArchiveDB/refs/heads/main/a2zdb.json';
const DAILY_LIMIT=100000,HOUR_LIMIT=10,USER_DAY_LIMIT=50;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,n)=>String(v??'').trim().slice(0,n);
function ghHeaders(env){return {'Authorization':`Bearer ${String(env.GITHUB_TOKEN).trim()}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'AWE-A2Z-Publisher'}}
function dayKey(){return new Date().toISOString().slice(0,10)} function hourKey(){return new Date().toISOString().slice(0,13)} function ip(request){return request.headers.get('CF-Connecting-IP')||'unknown'} function isToday(v){return typeof v==='string'&&v.slice(0,10)===dayKey()}
function parseDb(raw){const d=typeof raw==='string'?JSON.parse(raw||'[]'):raw;return Array.isArray(d)?d:Array.isArray(d?.ideas)?d.ideas:Array.isArray(d?.items)?d.items:[]}
async function loadRawDb(){const r=await fetch(RAW_DB,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`RAW_${r.status}`);return parseDb(await r.text())}
async function getWriteFile(env){const r=await fetch(API,{headers:ghHeaders(env)});if(!r.ok){const t=await r.text();throw new Error(`GITHUB_${r.status}:${t.slice(0,500)}`)}return r.json()}
export async function onRequestGet(){try{const data=await loadRawDb(),today=data.reduce((n,x)=>n+(isToday(x.created)?1:0),0);return json({dailyLimit:DAILY_LIMIT,publishedToday:today,remaining:Math.max(0,DAILY_LIMIT-today),hourLimit:HOUR_LIMIT,userDailyLimit:USER_DAY_LIMIT,available:today<DAILY_LIMIT})}catch{return json({dailyLimit:DAILY_LIMIT,publishedToday:0,remaining:DAILY_LIMIT,available:true},200)}}
export async function onRequestPost({request,env}){
 if(!env.GITHUB_TOKEN)return json({error:'Publishing is temporarily unavailable: GITHUB_TOKEN is not configured.'},503);
 let body;try{body=await request.json()}catch{return json({error:'Invalid request.'},400)}
 const title=clean(body.title,120),idea=clean(body.idea,50000),url=clean(body.url,2000),category=clean(body.category,80)||'Other';
 if(title.length<2||idea.length<20)return json({error:'Please provide a clear title and at least 20 characters.'},400);
 if(!/^https?:\/\//i.test(url))return json({error:'A public web page URL is required.'},400);
 if(body.freeuse!==true)return json({error:'You must accept the public-use principle.'},400);
 const ipKey=ip(request);if(env.RATE_LIMIT_KV){const hk=`h:${ipKey}:${hourKey()}`,dk=`d:${ipKey}:${dayKey()}`;const [h,d]=await Promise.all([env.RATE_LIMIT_KV.get(hk),env.RATE_LIMIT_KV.get(dk)]);if(Number(h||0)>=HOUR_LIMIT)return json({error:'Publishing limit reached: this IP can submit up to 10 ideas per hour. Please wait.'},429);if(Number(d||0)>=USER_DAY_LIMIT)return json({error:'Publishing limit reached: this IP can submit up to 50 ideas per day. Please try again tomorrow.'},429)}
 for(let attempt=0;attempt<3;attempt++){
  let data;try{data=await loadRawDb()}catch{return json({error:'Database read failed from AWEArchiveDB Raw.'},502)}
  const today=data.reduce((n,x)=>n+(isToday(x.created)?1:0),0);if(today>=DAILY_LIMIT)return json({error:'Today’s A2Z publishing limit of 100,000 ideas has been reached. Please wait until the limit resets.'},429);
  const numeric=data.map(x=>Number(x.id)).filter(Number.isFinite),id=String(Math.max(0,...numeric)+1);
  data.push({id,title,idea,url,category,author:'Anonymous',anonymous:true,created:new Date().toISOString(),public_domain:true,ownership:'AWE does not claim ownership of this idea'});
  let file;try{file=await getWriteFile(env)}catch(e){console.error('A2Z GitHub read:',e.message);return json({error:`GitHub API could not read AWEArchiveDB (check GITHUB_TOKEN, repository access, and secret value). ${e.message}`},502)}
  const bytes=new TextEncoder().encode(JSON.stringify(data,null,2)+'\n');let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  const put=await fetch(API,{method:'PUT',headers:ghHeaders(env),body:JSON.stringify({message:`a2z: publish idea ${id}`,content:btoa(binary),sha:file.sha})});
  if(put.ok){if(env.RATE_LIMIT_KV){const hk=`h:${ipKey}:${hourKey()}`,dk=`d:${ipKey}:${dayKey()}`;const [h,d]=await Promise.all([env.RATE_LIMIT_KV.get(hk),env.RATE_LIMIT_KV.get(dk)]);await Promise.all([env.RATE_LIMIT_KV.put(hk,String(Number(h||0)+1),{expirationTtl:7200}),env.RATE_LIMIT_KV.put(dk,String(Number(d||0)+1),{expirationTtl:172800})])}return json({ok:true,id,publishedToday:today+1,dailyLimit:DAILY_LIMIT,remaining:DAILY_LIMIT-today-1})}
  const detail=await put.text();console.error('A2Z GitHub write:',put.status,detail);if(put.status!==409)return json({error:`GitHub rejected the publish (HTTP ${put.status}). ${detail.slice(0,300)}`},502);
 }
 return json({error:'The archive changed while publishing. Please retry.'},409);
}
export async function onRequestOptions(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}})}
