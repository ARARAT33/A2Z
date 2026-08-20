const API='https://api.github.com/repos/ARARAT33/AWEArchiveDB/contents/a2zdb.json';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,n)=>String(v??'').trim().slice(0,n);
function headers(env){return {'Authorization':'Bearer '+env.GITHUB_TOKEN,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'}}
export async function onRequestPost({request,env}){
 if(!env.GITHUB_TOKEN)return json({error:'Server is not configured.'},503);
 let body;try{body=await request.json()}catch{return json({error:'Invalid JSON.'},400)}
 const title=clean(body.title,120),idea=clean(body.idea,50000),category=clean(body.category,80)||'Other';
 if(title.length<2||idea.length<20)return json({error:'Please provide a clear title and at least 20 characters.'},400);
 if(body.freeuse!==true)return json({error:'Public-use confirmation is required.'},400);
 if(/<script\b|javascript:|data:text\/html/i.test(title+' '+idea))return json({error:'Unsafe content rejected.'},400);
 for(let attempt=0;attempt<3;attempt++){
  const current=await fetch(API,{headers:headers(env)});if(!current.ok)return json({error:'Database unavailable.'},502);const file=await current.json();
  let decoded;try{decoded=decodeURIComponent(escape(atob(String(file.content||'').replace(/\n/g,''))))}catch{return json({error:'Database encoding is invalid.'},500)}
  let data;try{data=JSON.parse(decoded||'[]')}catch{return json({error:'Database JSON is invalid.'},500)}
  if(!Array.isArray(data))data=Array.isArray(data.ideas)?data.ideas:(Array.isArray(data.items)?data.items:[]);
  const numeric=data.map(x=>Number(x.id)).filter(Number.isFinite),id=String(Math.max(0,...numeric)+1);
  data.push({id,title,idea,category,author:'Anonymous',anonymous:true,created:new Date().toISOString(),public_domain:true,ownership:'AWE claims no ownership of this idea'});
  const content=btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2)+'\n')));
  const put=await fetch(API,{method:'PUT',headers:headers(env),body:JSON.stringify({message:'a2z: publish idea '+id,content,sha:file.sha})});
  if(put.ok)return json({ok:true,id});if(put.status!==409)break;
 }
 return json({error:'Database changed while publishing. Please retry.'},409);
}
export async function onRequestOptions(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}})}
