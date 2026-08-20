const DB_REPO='https://api.github.com/repos/ARARAT33/AWEArchiveDB/contents';
const INDEX_PATH='a2z-index.json';
const INDEX_RAW='https://raw.githubusercontent.com/ARARAT33/AWEArchiveDB/refs/heads/main/a2z-index.json';
const LEGACY_RAW='https://raw.githubusercontent.com/ARARAT33/AWEArchiveDB/refs/heads/main/a2zdb.json';
const SHARD_SIZE=10000,DAILY_LIMIT=100000,HOUR_LIMIT=10,USER_DAY_LIMIT=50;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,n)=>String(v??'').trim().slice(0,n);
const dayKey=()=>new Date().toISOString().slice(0,10),hourKey=()=>new Date().toISOString().slice(0,13),ip=request=>request.headers.get('CF-Connecting-IP')||'unknown';
const isToday=v=>typeof v==='string'&&v.slice(0,10)===dayKey();
function ghHeaders(env){return {'Authorization':`Bearer ${String(env.GITHUB_TOKEN).trim()}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'AWE-A2Z-Publisher'}}
function parseDb(raw){const d=typeof raw==='string'?JSON.parse(raw||'[]'):raw;return Array.isArray(d)?d:Array.isArray(d?.ideas)?d.ideas:Array.isArray(d?.items)?d.items:[]}
function encodeUtf8(text){const bytes=new TextEncoder().encode(text);let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)}
async function rawJson(url){const r=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});if(!r.ok)throw new Error(`RAW_${r.status}`);return r.json()}
async function getIndex(){try{const x=await rawJson(INDEX_RAW);if(Array.isArray(x.files)&&x.files.length)return x}catch{}return {version:1,archive:'AWE A2Z',shardSize:SHARD_SIZE,files:[{name:'a2zdb.json',raw:LEGACY_RAW,status:'active',count:0}]}}
async function getGitFile(env,path){const r=await fetch(`${DB_REPO}/${encodeURIComponent(path)}`,{headers:ghHeaders(env)});if(!r.ok){const t=await r.text();throw new Error(`GITHUB_${r.status}:${t.slice(0,500)}`)}return r.json()}
async function putGitFile(env,path,text,sha,message){const body={message,content:encodeUtf8(text)};if(sha)body.sha=sha;const r=await fetch(`${DB_REPO}/${encodeURIComponent(path)}`,{method:'PUT',headers:ghHeaders(env),body:JSON.stringify(body)});if(!r.ok){const t=await r.text();throw new Error(`GITHUB_WRITE_${r.status}:${t.slice(0,500)}`)}return r.json()}
async function countToday(index){const files=index.files||[],recent=files.slice(-11),chunks=await Promise.all(recent.map(f=>rawJson(f.raw||`https://raw.githubusercontent.com/ARARAT33/AWEArchiveDB/refs/heads/main/${f.name}`).catch(()=>[])));return chunks.reduce((n,raw)=>n+parseDb(raw).reduce((m,x)=>m+(isToday(x.created)?1:0),0),0)}
function totalFromIndex(index){return (index.files||[]).reduce((n,f)=>n+Number(f.count||0),0)}
export async function onRequestGet(){try{const index=await getIndex(),today=await countToday(index);return json({dailyLimit:DAILY_LIMIT,publishedToday:today,remaining:Math.max(0,DAILY_LIMIT-today),shardSize:SHARD_SIZE,files:index.files||[],available:today<DAILY_LIMIT})}catch{return json({dailyLimit:DAILY_LIMIT,publishedToday:0,remaining:DAILY_LIMIT,shardSize:SHARD_SIZE,available:true},200)}}
export async function onRequestPost({request,env}){
 if(!env.GITHUB_TOKEN)return json({error:'Publishing is temporarily unavailable: GITHUB_TOKEN is not configured.'},503);
 let body;try{body=await request.json()}catch{return json({error:'Invalid request.'},400)}
 const title=clean(body.title,120),idea=clean(body.idea,50000),url=clean(body.url,2000),category=clean(body.category,80)||'Other';
 if(title.length<2||idea.length<20)return json({error:'Please provide a clear title and at least 20 characters.'},400);
 if(!/^https?:\/\//i.test(url))return json({error:'A public web page URL is required.'},400);
 if(body.freeuse!==true)return json({error:'You must accept the public-use principle.'},400);
 const ipKey=ip(request);if(env.RATE_LIMIT_KV){const hk=`h:${ipKey}:${hourKey()}`,dk=`d:${ipKey}:${dayKey()}`;const [h,d]=await Promise.all([env.RATE_LIMIT_KV.get(hk),env.RATE_LIMIT_KV.get(dk)]);if(Number(h||0)>=HOUR_LIMIT)return json({error:'Publishing limit reached: this IP can submit up to 10 ideas per hour. Please wait.'},429);if(Number(d||0)>=USER_DAY_LIMIT)return json({error:'Publishing limit reached: this IP can submit up to 50 ideas per day. Please try again tomorrow.'},429)}
 for(let attempt=0;attempt<3;attempt++){
  const index=await getIndex(),files=index.files||[];let active=files.find(f=>f.status==='active')||files[files.length-1];if(!active)active={name:'a2zdb.json',raw:LEGACY_RAW,status:'active',count:0};
  let activeData;try{activeData=parseDb(await rawJson(active.raw||`https://raw.githubusercontent.com/ARARAT33/AWEArchiveDB/refs/heads/main/${active.name}`))}catch{return json({error:`Could not read active archive file ${active.name} from GitHub Raw.`},502)}
  const today=await countToday(index);if(today>=DAILY_LIMIT)return json({error:'Today’s A2Z publishing limit of 100,000 ideas has been reached. Please wait until the limit resets.'},429);
  const total=Math.max(totalFromIndex(index),activeData.length),id=String(total+1),record={id,title,idea,url,category,author:'Anonymous',anonymous:true,created:new Date().toISOString(),public_domain:true,ownership:'AWE does not claim ownership of this idea'};
  if(activeData.length<SHARD_SIZE){
   activeData.push(record);try{const file=await getGitFile(env,active.name);await putGitFile(env,active.name,JSON.stringify(activeData,null,2)+'\n',file.sha,`a2z: publish idea ${id}`)}catch(e){console.error(e.message);if(String(e.message).includes('GITHUB_WRITE_409'))continue;return json({error:`GitHub rejected the publish. ${e.message}`},502)}
   active.count=activeData.length;return await afterWrite(env,ipKey,id,today+1,active,false);
  }
  const nextNumber=files.length+1,nextName=`a2zdb-${String(nextNumber).padStart(4,'0')}.json`,nextRaw=`https://raw.githubusercontent.com/ARARAT33/AWEArchiveDB/refs/heads/main/${nextName}`;
  const nextFile={name:nextName,raw:nextRaw,status:'active',count:1};active.status='closed';const newIndex={...index,version:1,shardSize:SHARD_SIZE,files:[...files.map(f=>f.name===active.name?active:f),nextFile]};
  try{await putGitFile(env,nextName,JSON.stringify([record],null,2)+'\n',null,`a2z: open archive shard ${nextName}`);const idxFile=await getGitFile(env,INDEX_PATH);await putGitFile(env,INDEX_PATH,JSON.stringify(newIndex,null,2)+'\n',idxFile.sha,`a2z: rotate archive to ${nextName}`)}catch(e){console.error(e.message);return json({error:`Archive rotation failed. ${e.message}`},502)}
  return await afterWrite(env,ipKey,id,today+1,nextFile,true);
 }
 return json({error:'The archive changed while publishing. Please retry.'},409);
}
async function afterWrite(env,ipKey,id,publishedToday,active,rotated){if(env.RATE_LIMIT_KV){const hk=`h:${ipKey}:${hourKey()}`,dk=`d:${ipKey}:${dayKey()}`;const [h,d]=await Promise.all([env.RATE_LIMIT_KV.get(hk),env.RATE_LIMIT_KV.get(dk)]);await Promise.all([env.RATE_LIMIT_KV.put(hk,String(Number(h||0)+1),{expirationTtl:7200}),env.RATE_LIMIT_KV.put(dk,String(Number(d||0)+1),{expirationTtl:172800})])}return json({ok:true,id,publishedToday,dailyLimit:DAILY_LIMIT,remaining:DAILY_LIMIT-publishedToday,shardSize:SHARD_SIZE,activeFile:active.name,rotated})}
export async function onRequestOptions(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}})}
