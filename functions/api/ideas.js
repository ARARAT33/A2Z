const OWNER = 'ARARAT33';
const REPO = 'AWEArchiveDB';
const PATH = 'a2zdb.json';
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

function headers(env) {
  return {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
}

function json(data, status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}

export async function onRequestPost({request,env}){
  if(!env.GITHUB_TOKEN)return json({error:'Server is not configured.'},503);
  let body;
  try{body=await request.json()}catch{return json({error:'Invalid JSON.'},400)}
  const title=String(body.title||'').trim();
  const idea=String(body.idea||'').trim();
  const category=String(body.category||'Other').trim().slice(0,60);
  if(title.length<2||title.length>120||idea.length<2||idea.length>5000)return json({error:'Invalid title or idea length.'},400);
  if(body.freeuse!==true)return json({error:'Public-use confirmation is required.'},400);

  for(let attempt=0;attempt<3;attempt++){
    const current=await fetch(API,{headers:headers(env)});
    if(!current.ok)return json({error:'Database unavailable.'},502);
    const file=await current.json();
    const decoded=atob(String(file.content||'').replace(/\n/g,''));
    let data;
    try{data=JSON.parse(decoded||'[]')}catch{return json({error:'Database JSON is invalid.'},500)}
    if(!Array.isArray(data))data=[];
    const item={id:crypto.randomUUID(),title,idea,category,author:body.anonymous===true?'Anonymous':'Anonymous',created:new Date().toISOString()};
    data.push(item);
    const content=btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2)+'\n')));
    const put=await fetch(API,{method:'PUT',headers:headers(env),body:JSON.stringify({message:`a2z: add idea ${item.id}`,content,sha:file.sha})});
    if(put.ok)return json({ok:true,id:item.id});
    if(put.status!==409)break;
  }
  return json({error:'Database changed while publishing. Please retry.'},409);
}

export async function onRequestOptions(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}})}
