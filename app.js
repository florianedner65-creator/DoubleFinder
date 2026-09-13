const cfg=window.DF_CONFIG||{};
const app=document.getElementById("app");
const hasBackend=cfg.SUPABASE_URL.startsWith("http") && cfg.SUPABASE_ANON_KEY.length>20;
let sb=null;

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function layout(title,body){app.innerHTML=`<section><h1>${title}</h1>${body}</section>`}
function home(){
layout("Finde deinen Doppelgänger.",`
<p class="lead">Erstelle dein Profil, lade dein Foto hoch und entdecke mögliche Matches.</p>
<div class="grid">
<div class="card"><b>📸 Foto</b><p>Ein klares Foto hochladen.</p></div>
<div class="card"><b>👤 Profil</b><p>Nur freiwillige Angaben teilen.</p></div>
<div class="card"><b>🔎 Matches</b><p>Mögliche Treffer ansehen.</p></div></div>
${!hasBackend?'<div class="notice">Backend noch nicht verbunden. Öffne <code>config.js</code> und trage deine Supabase-Projektwerte ein.</div>':''}
<a class="btn" href="#/register">Kostenlos registrieren</a>`);
}
async function register(){
layout("Konto erstellen",`<form id="reg"><label>E-Mail<input id="email" type="email" required></label>
<label>Passwort<input id="pass" type="password" minlength="8" required></label>
<button class="btn">Registrieren</button><p id="msg"></p></form>`);
document.getElementById("reg").onsubmit=async e=>{
e.preventDefault(); if(!hasBackend)return msg("Bitte zuerst Supabase in config.js eintragen.");
const {data,error}=await sb.auth.signUp({email:email.value,password:pass.value});
msg(error?error.message:"Konto erstellt. Prüfe ggf. deine E-Mail und öffne danach dein Profil.");
};
}
function msg(x){document.getElementById("msg").textContent=x}
async function profile(){
if(!hasBackend){layout("Mein Profil",`<div class="notice">Backend nicht verbunden.</div>`);return}
const {data:{user}}=await sb.auth.getUser();
if(!user){location.hash="#/register";return}
const {data:p}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
layout("Mein Profil",`<form id="pf"><label>Anzeigename<input id="name" maxlength="40" required value="${esc(p?.display_name)}"></label>
<label>Alter<input id="age" type="number" min="18" max="120" value="${esc(p?.age||"")}"></label>
<label>Land<input id="country" maxlength="50" value="${esc(p?.country||"")}"></label>
<label>Profilfoto<input id="photo" type="file" accept="image/*"></label>
<label class="check"><input id="public" type="checkbox" ${p?.is_public?"checked":""}> Mein Profil darf in der Match-Suche berücksichtigt werden.</label>
<button class="btn">Speichern</button><p id="msg"></p></form>`);
document.getElementById("pf").onsubmit=async e=>{
e.preventDefault();
let avatar=p?.avatar_url||null;
const f=photo.files[0];
if(f){if(f.size>5*1024*1024)return msg("Foto maximal 5 MB.");
 const path=`${user.id}/${crypto.randomUUID()}.${(f.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"")}`;
 const up=await sb.storage.from("avatars").upload(path,f,{upsert:true,contentType:f.type});
 if(up.error)return msg(up.error.message);
 avatar=sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
const row={id:user.id,display_name:name.value.trim(),age:age.value?Number(age.value):null,country:country.value.trim(),avatar_url:avatar,is_public:public.checked};
const r=await sb.from("profiles").upsert(row); msg(r.error?r.error.message:"Profil gespeichert.");
};
}
async function matches(){
if(!hasBackend){layout("Treffer",`<div class="notice">Backend nicht verbunden.</div>`);return}
const {data:{user}}=await sb.auth.getUser(); if(!user){location.hash="#/register";return}
const {data,error}=await sb.from("profiles").select("id,display_name,age,country,avatar_url").eq("is_public",true).neq("id",user.id).limit(50);
layout("Mögliche Treffer",error?`<div class="error">${esc(error.message)}</div>`:`<p class="muted">V2 zeigt zunächst Profile. Ein echter Gesichts-Ähnlichkeitswert ist bewusst noch nicht aktiviert.</p><div class="matches">${(data||[]).map(p=>`<article class="match">${p.avatar_url?`<img src="${esc(p.avatar_url)}">`:"<div class='placeholder'>👤</div>"}<div><h3>${esc(p.display_name)}</h3><p>${p.age?esc(p.age)+" Jahre · ":""}${esc(p.country||"")}</p><button class="btn small" onclick="interest('${esc(p.id)}')">Interesse senden</button></div></article>`).join("")||"<p>Noch keine öffentlichen Profile gefunden.</p>"}</div>`);
}
async function interest(id){
const {data:{user}}=await sb.auth.getUser(); if(!user)return;
const r=await sb.from("interests").insert({from_user:user.id,to_user:id});
alert(r.error?"Konnte nicht gesendet werden.":"Interesse gesendet. Kontakt wird erst bei gegenseitigem Interesse freigegeben.");
}
async function init(){
if(hasBackend){
const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";script.onload=async()=>{sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);route()};document.head.appendChild(script);
}else route();
}
async function route(){const r=location.hash.replace("#/",""); if(r==="register")return register();if(r==="profile")return profile();if(r==="matches")return matches();home()}
document.getElementById("logout").onclick=async()=>{if(sb)await sb.auth.signOut();location.hash="#/";};
window.addEventListener("hashchange",route);init();