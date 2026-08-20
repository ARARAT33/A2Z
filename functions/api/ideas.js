const API='https://api.github.com/repos/ARARAT33/AWEArchiveDB/contents/a2zdb.json';
const DAILY_LIMIT=100000;
const HOUR_LIMIT=10;
const USER_DAY_LIMIT=50;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,n)=>String(v??'').trim().slice(0,n);
function headers(env){return {'Authorization':'Bearer '+env.GITHUB_TOKEN,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'}}
function dayKey(){return new Date().toISOString().slice(0,10)}
function hourKey(){const d=new Date();return d.toISOString().slice(0,13)}
function ip(request){return request.headers.get('CF-Connecting-IP')||request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()||'unknown'}
function isToday(v){return typeof v==='string'&&v.slice(0,10)===dayKey()}
async function loadDb(env){const current=await fetch(API,{headers:headers(env)});if(!current.ok)throw new Error('db');const file=await current.json();let decoded;try{decoded=decodeURIComponent(escape(atob(String(file.content||'').replace(/\n/g,''))))}catch{throw new Error('encoding')}let data;try{data=JSON.parse(decoded||'[]')}catch{throw new Error('json')}if(!Array.isArray(data))data=Array.isArray(data.ideas)?data.ideas:(Array.isArray(data.items)?data.items:[]);return {file,data}}
export async function onRequestGet({request,env}){
 try{const {data}=await loadDb(env);const today=data.filter(x=>isToday(x.created)).length;return json({dailyLimit:DAILY_LIMIT,publishedToday:today,remaining:Math.max(0,DAILY_LIMIT-today),hourLimit:HOUR_LIMIT,userDailyLimit:USER_DAY_LIMIT,available:today<DAILY_LIMIT})}catch{return json({dailyLimit:DAILY_LIMIT,publishedToday:0,remaining:DAILY_LIMIT,available:true},200)}
}
export async function onRequestPost({request,env}){
 if(!env.GITHUB_TOKEN)return json({error:'Publishing is temporarily unavailable.'},503);
 let body;try{body=await request.json()}catch{return json({error:'Invalid request.'},400)}
 const title=clean(body.title,120),idea=clean(body.idea,50000),category=clean(body.category,80)||'Other';
 if(title.length<2||idea.length<20)return json({error:'Please provide a clear title and at least 20 characters.'},400);
 if(body.freeuse!==true)return json({error:'You must accept the public-use principle.'},400);
 if(/<script\b|javascript:|data:text\/html/i.test(title+' '+idea))return json({error:'Unsafe content rejected.'},400);
 const ipKey=ip(request),now=Date.now();
 if(env.RATE_LIMIT_KV){
   const hk=`h:${ipKey}:${hourKey()}`,dk=`d:${ipKey}:${dayKey()}`;
   const [h,d]=await Promise.all([env.RATE_LIMIT_KV.get(hk),env.RATE_LIMIT_KV.get(dk)]);
   if(Number(h||0)>=HOUR_LIMIT)return json({error:'Publishing limit reached: this IP can submit up to 10 ideas per hour. Please wait.'},429);
   if(Number(d||0)>=USER_DAY_LIMIT)return json({error:'Publishing limit reached: this IP can submit up to 50 ideas per day. Please try again tomorrow.'},429);
   await Promise.all([env.RATE_LIMIT_KV.put(hk,String(Number(h||0)+1),{expirationTtl:7200}),env.RATE_LIMIT_KV.put(dk,String(Number(d||0)+1),{expirationTtl:172800})]);
 }
 for(let attempt=0;attempt<3;attempt++){
  let file,data;try{({file,data}=await loadDb(env))}catch(e){return json({error:'Database unavailable.'},502)}
  const today=data.filter(x=>isToday(x.created)).length;
  if(today>=DAILY_LIMIT)return json({error:'Today’s A2Z publishing limit of 100,000 ideas has been reached. Please wait until the limit resets.'},429);
  const numeric=data.map(x=>Number(x.id)).filter(Number.isFinite),id=String(Math.max(0,...numeric)+1);
  data.push({id,title,idea,category,author:'Anonymous',anonymous:true,created:new Date(now).toISOString(),public_domain:true,ownership:'AWE does not claim ownership of this idea'});
  const content=btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2)+'\n')));
  const put=await fetch(API,{method:'PUT',headers:headers(env),body:JSON.stringify({message:'a2z: publish idea '+id,content,sha:file.sha})});
  if(put.ok)return json({ok:true,id,publishedToday:today+1,dailyLimit:DAILY_LIMIT,remaining:DAILY_LIMIT-(today+1)});
  if(put.status!==409)break;
 }
 return json({error:'The archive changed while publishing. Please retry.'},409);
}
export async function onRequestOptions(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}})}
