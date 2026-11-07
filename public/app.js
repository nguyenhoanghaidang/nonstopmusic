
const $=s=>document.querySelector(s);
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
let ctx,master,decks=[],tracks=[],idx=-1,cur=0,fading=false,fadeId=0,shuffle=false,repeat=false;
let cf=+(store.get('cf')??6);
const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
const isAudio=f=>f.type.startsWith('audio/')||/\.(mp3|m4a|aac|flac|wav|ogg|opus|wma)$/i.test(f.name);

function init(){
  if(ctx)return;
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  master=ctx.createGain();master.gain.value=+$('#vol').value;master.connect(ctx.destination);
  decks=[0,1].map(i=>{
    const el=new Audio(),g=ctx.createGain();
    el.preload='auto';
    ctx.createMediaElementSource(el).connect(g);g.connect(master);
    el.addEventListener('timeupdate',()=>onTime(i));
    el.addEventListener('ended',()=>onEnd(i));
    el.addEventListener('play',syncBtn);el.addEventListener('pause',syncBtn);
    return{el,g,cover:$('#c'+i),loc:{el,g},i,cur:null};
  });
  if(tracks.some(t=>t.yt))loadYT();
}
function cls(el,c,instant){
  if(instant)el.style.transition='none';
  el.className='cover '+c;
  if(instant){el.offsetWidth;el.style.transition='';}
}
function setCover(d,i){
  const t=tracks[i];
  d.cover.style.backgroundImage=t.art?`url("${t.art}")`:`linear-gradient(135deg,hsl(${t.hue} 55% 42%),hsl(${(t.hue+55)%360} 60% 24%))`;
  d.cover.textContent=t.art?'':(t.title.trim()[0]||'♪').toUpperCase();
}
function nextIdx(){
  if(!tracks.length)return -1;
  if(shuffle&&tracks.length>1){let n;do n=Math.floor(Math.random()*tracks.length);while(n===idx);return n;}
  const n=idx+1;
  return n>=tracks.length?(repeat?0:-1):n;
}
function playIndex(i){
  init();ctx.resume();
  fading=false;fadeId++;
  decks.forEach(d=>{d.el.pause();d.g.gain.cancelScheduledValues(0)});
  idx=i;
  const d=decks[cur];bind(d,tracks[i]);
  d.g.gain.value=1;d.el.src=tracks[i].url;setCover(d,i);
  cls(d.cover,'main',true);cls(decks[1-cur].cover,'gone-r',true);
  d.el.play().catch(()=>{});
  info();
}
function startFade(n,secs){
  const o=decks[cur],k=1-cur,d=decks[k],id=++fadeId;
  fading=true;cur=k;idx=n;
  bind(d,tracks[n]);d.el.src=tracks[n].url;setCover(d,n);
  const t=ctx.currentTime+0.05,N=48,up=new Float32Array(N),dn=new Float32Array(N);
  for(let j=0;j<N;j++){const x=j/(N-1);up[j]=Math.sin(x*Math.PI/2);dn[j]=Math.cos(x*Math.PI/2);}
  o.g.gain.cancelScheduledValues(0);d.g.gain.cancelScheduledValues(0);
  o.g.gain.value=1;d.g.gain.value=0;
  o.g.gain.setValueCurveAtTime(dn,t,secs);
  d.g.gain.setValueCurveAtTime(up,t,secs);
  d.el.play().catch(()=>{});
  document.documentElement.style.setProperty('--t',Math.min(secs,1.2)+'s');
  cls(o.cover,'side-l');cls(d.cover,'gone-r',true);cls(d.cover,'side-r');
  info();
  setTimeout(()=>{
    if(id!==fadeId)return;
    o.el.pause();fading=false;
    cls(d.cover,'main');cls(o.cover,'gone-l');
    setTimeout(()=>{if(id===fadeId)cls(o.cover,'gone-r',true)},1300);
  },(secs+0.2)*1000);
}
function onTime(i){
  if(i!==cur)return;
  const el=decks[i].el,dur=el.duration;
  if(isFinite(dur)){
    if(!$('#seek').matches(':active')){$('#seek').max=dur;$('#seek').value=el.currentTime;}
    $('#tc').textContent=fmt(el.currentTime);$('#td').textContent=fmt(dur);
    const eff=Math.min(cf,dur/2),rem=dur-el.currentTime;
    if(!fading&&eff>0&&!el.paused&&rem<=eff&&rem>0.3){
      const n=nextIdx();
      if(n>=0)startFade(n,rem);
    }
  }
}
function onEnd(i){
  if(i!==cur||fading)return;
  const n=nextIdx();
  if(n>=0)playIndex(n);else syncBtn();
}
function next(){
  const n=nextIdx();
  if(n<0||fading||!decks.length)return n>=0?playIndex(n):0;
  const el=decks[cur].el;
  if(cf>0&&!el.paused&&el.currentTime>0)startFade(n,Math.min(cf,3));else playIndex(n);
}
function prev(){
  if(!tracks.length)return;
  if(decks.length&&decks[cur].el.currentTime>3){decks[cur].el.currentTime=0;return;}
  playIndex(idx>0?idx-1:(repeat?tracks.length-1:0));
}
function toggle(){
  if(!tracks.length)return;
  if(idx<0)return playIndex(0);
  const el=decks[cur].el;
  if(el.paused){ctx.resume();el.play().catch(()=>{});}else el.pause();
}
function syncBtn(){$('#play').textContent=decks.length&&idx>=0&&!decks[cur].el.paused?'Tạm dừng':'Phát';}
function info(){
  const t=tracks[idx];
  $('#title').textContent=t?t.title:'Chưa có bài hát';
  $('#artist').textContent=t?(t.artist||'Không rõ nghệ sĩ'):'Thêm nhạc từ máy để bắt đầu';
  document.title=t?t.title+' – Nhạc Liền':'Nhạc Liền';
  const bg=$('#bg');bg.style.backgroundImage=t&&t.art?`url("${t.art}")`:'none';bg.classList.remove('in');bg.offsetWidth;bg.classList.add('in');
  render();syncBtn();
  if('mediaSession' in navigator&&t){
    navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,artwork:t.art?[{src:t.art}]:[]});
  }
}
function render(){
  const ul=$('#list');ul.textContent='';
  if(!tracks.length){const d=document.createElement('div');d.className='empty';d.textContent='Chưa có bài nào. Bấm “Thêm file” hoặc kéo thả nhạc vào cửa sổ.';ul.append(d);return;}
  tracks.forEach((t,i)=>{
    const li=document.createElement('li');
    if(i===idx)li.className='cur';
    const n=document.createElement('span');n.textContent=i+1;
    const b=document.createElement('span');b.textContent=t.title;
    const s=document.createElement('small');s.textContent=t.artist;
    b.append(s);li.append(n,b);
    li.onclick=()=>playIndex(i);
    ul.append(li);
  });
}
function txt(b){
  const e=b[0],d=b.subarray(1),l=e===0?'windows-1252':e===3?'utf-8':e===1?'utf-16le':'utf-16be';
  return new TextDecoder(l).decode(d).replace(/\0+$/,'').replace(/^\uFEFF/,'');
}
async function parseTags(f,t){
  if(!/\.mp3$/i.test(f.name))return;
  try{
    const h=new Uint8Array(await f.slice(0,10).arrayBuffer());
    if(String.fromCharCode(h[0],h[1],h[2])!=='ID3'||h[3]<3)return;
    const size=(h[6]<<21)|(h[7]<<14)|(h[8]<<7)|h[9];
    const b=new Uint8Array(await f.slice(10,10+Math.min(size,8e6)).arrayBuffer());
    const dv=new DataView(b.buffer);let p=0;
    while(p+10<=b.length&&b[p]){
      const id=String.fromCharCode(b[p],b[p+1],b[p+2],b[p+3]);
      const sz=h[3]===4?((b[p+4]<<21)|(b[p+5]<<14)|(b[p+6]<<7)|b[p+7]):dv.getUint32(p+4);
      const body=b.subarray(p+10,p+10+sz);p+=10+sz;
      if(id==='TIT2'){t.title=txt(body)||t.title;}
      else if(id==='TPE1'){t.artist=txt(body);}
      else if(id==='APIC'&&!t.art){
        const e=body[0];let q=1;
        while(q<body.length&&body[q])q++;
        const mime=String.fromCharCode(...body.subarray(1,q));q+=2;
        if(e===0||e===3){while(q<body.length&&body[q])q++;q++;}
        else{while(q+1<body.length&&!(body[q]===0&&body[q+1]===0))q+=2;q+=2;}
        t.art=URL.createObjectURL(new Blob([body.subarray(q)],{type:mime.includes('/')?mime:'image/jpeg'}));
      }
    }
  }catch(e){}
}
function addFiles(list){
  [...list].filter(isAudio).forEach(f=>{
    let hue=0;for(const c of f.name)hue=(hue*31+c.charCodeAt(0))%360;
    const t={url:URL.createObjectURL(f),title:f.name.replace(/\.[^.]+$/,''),artist:'',art:null,hue};
    tracks.push(t);
    parseTags(f,t).then(()=>{
      render();
      if(tracks[idx]===t){info();setCover(decks[cur],idx);}
    });
  });
  render();
}
$('#add').onclick=()=>$('#files').click();
$('#addDir').onclick=()=>$('#dir').click();
$('#files').onchange=e=>{addFiles(e.target.files);e.target.value='';};
$('#dir').onchange=e=>{addFiles([...e.target.files].sort((a,b)=>a.webkitRelativePath.localeCompare(b.webkitRelativePath,undefined,{numeric:true})));e.target.value='';};
$('#clear').onclick=()=>{
  fadeId++;fading=false;
  decks.forEach(d=>{d.el.pause();d.el.removeAttribute('src');});
  tracks=[];idx=-1;saveLib();$('#seek').value=0;$('#tc').textContent=$('#td').textContent='0:00';
  decks.forEach((d,i)=>{d.cover.style.backgroundImage='';d.cover.textContent='';});
  info();
};
$('#play').onclick=toggle;$('#next').onclick=next;$('#prev').onclick=prev;
$('#shuf').onclick=e=>{shuffle=!shuffle;e.currentTarget.classList.toggle('on',shuffle);};
$('#rep').onclick=e=>{repeat=!repeat;e.currentTarget.classList.toggle('on',repeat);};
$('#seek').oninput=e=>{if(decks.length)decks[cur].el.currentTime=+e.target.value;};
$('#vol').oninput=e=>{if(master)master.gain.value=+e.target.value;decks.forEach(d=>d.ytA&&d.ytA.apply());};
function setCf(v){cf=+v;$('#cf').value=cf;$('#cfl').textContent=cf?cf+' giây':'Tắt';store.set('cf',cf);}
$('#cf').oninput=e=>setCf(e.target.value);
setCf(cf);
addEventListener('keydown',e=>{
  if(e.target.matches('input[type=range]'))return;
  if(e.code==='Space'){e.preventDefault();toggle();}
  if(e.ctrlKey&&e.code==='ArrowRight')next();
  if(e.ctrlKey&&e.code==='ArrowLeft')prev();
});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();addFiles(e.dataTransfer.files);});
if('mediaSession' in navigator){
  const h=(a,f)=>{try{navigator.mediaSession.setActionHandler(a,f)}catch(e){}};
  h('play',toggle);h('pause',toggle);h('nexttrack',next);h('previoustrack',prev);
}
/* ===== YouTube: trình phát nhúng chính thức (IFrame API) ===== */
const msg=t=>{$('#msg').textContent=t};
let ytReady;
function loadYT(){
  if(ytReady||location.protocol==='file:')return ytReady;
  document.body.classList.add('hasyt');
  ytReady=new Promise(r=>{window.onYouTubeIframeAPIReady=r;const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.append(s);});
  ytReady.then(()=>decks.forEach(d=>ytOf(d).mount()));
  return ytReady;
}
const ytOf=d=>d.ytA||(d.ytA=mkYT(d));
// Bọc trình phát YouTube thành giao diện giống <audio> + GainNode để dùng chung logic crossfade
function mkYT(d){
  const a={p:null,pend:null,vol:1,paused:true,raf:0};
  const apply=()=>{if(a.p&&a.p.setVolume)a.p.setVolume(100*a.vol*(+$('#vol').value))};
  const el={
    get currentTime(){return a.p&&a.p.getCurrentTime?a.p.getCurrentTime():0},
    set currentTime(v){if(a.p&&a.p.seekTo)a.p.seekTo(v,true)},
    get duration(){const x=a.p&&a.p.getDuration?a.p.getDuration():0;return x>0?x:NaN},
    get paused(){return a.paused},
    set src(id){a.pend=id;a.paused=false;if(a.p&&a.p.loadVideoById)a.p.loadVideoById(id)},
    play(){a.paused=false;if(a.p&&a.p.playVideo)a.p.playVideo();return Promise.resolve()},
    pause(){a.paused=true;if(a.p&&a.p.pauseVideo)a.p.pauseVideo()},
    removeAttribute(){el.pause()}
  };
  const gain={
    get value(){return a.vol},
    set value(v){cancelAnimationFrame(a.raf);a.vol=v;apply()},
    cancelScheduledValues(){cancelAnimationFrame(a.raf)},
    setValueCurveAtTime(c,t,dur){
      const t0=performance.now()+(t-ctx.currentTime)*1000;
      const step=()=>{const k=Math.max(0,Math.min(1,(performance.now()-t0)/(dur*1000)));a.vol=c[Math.round(k*(c.length-1))];apply();if(k<1)a.raf=requestAnimationFrame(step)};
      a.raf=requestAnimationFrame(step);
    }
  };
  const h={el,g:{gain},apply,mount(){
    if(a.p||!window.YT||!YT.Player)return;
    a.p=new YT.Player('y'+d.i,{width:200,height:200,playerVars:{playsinline:1,rel:0},events:{
      onReady(){apply();if(a.pend)a.p.loadVideoById(a.pend)},
      onStateChange(e){if(e.data===0)onEnd(d.i);else if(e.data===1)a.paused=false;else if(e.data===2)a.paused=true;syncBtn();}
    }});
  }};
  setInterval(()=>{if(d.cur===h)onTime(d.i)},250);
  return h;
}
function bind(d,t){
  const w=t.yt?ytOf(d):d.loc;
  if(d.cur&&d.cur!==w){d.cur.el.pause();d.cur.g.gain.cancelScheduledValues(0);}
  d.cur=w;d.el=w.el;d.g=w.g;
}
function addYT({id,title,artist,art},save=true){
  let hue=0;for(const c of id)hue=(hue*31+c.charCodeAt(0))%360;
  tracks.push({yt:id,url:id,title:title||'Video '+id,artist:artist||'YouTube',art:art||`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,hue});
  render();
  if(save){init();saveLib();}
  if(decks.length)loadYT();
}
async function addLink(raw){
  if(location.protocol==='file:')return msg('Cần chạy bằng server: mở start.bat (hoặc node server.js) rồi vào http://localhost:3000');
  let u;try{u=new URL(raw.trim())}catch(e){}
  if(!u||!/(^|\.)(youtube\.com|youtu\.be)$/.test(u.hostname))return msg('Link không hợp lệ. Hãy dán link YouTube.');
  const list=u.searchParams.get('list');let v=u.searchParams.get('v');
  if(u.hostname==='youtu.be')v=u.pathname.slice(1,12);
  const m=u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/);if(m)v=m[2];
  if(list){
    try{
      const r=await fetch('/api/playlist?list='+encodeURIComponent(list)),j=await r.json();
      if(!r.ok)throw new Error(j.error);
      j.items.forEach(t=>addYT(t,false));init();saveLib();
      return msg(`Đã thêm ${j.items.length} bài từ danh sách phát.`);
    }catch(e){msg((e.message||'Không đọc được danh sách phát.')+(v?' Đã thêm riêng bài đang chọn.':''));if(!v)return;}
  }
  if(!v)return msg('Không tìm thấy mã video trong link.');
  let info={};
  try{const r=await fetch('/api/oembed?url='+encodeURIComponent('https://www.youtube.com/watch?v='+v));if(r.ok)info=await r.json();}catch(e){}
  addYT({id:v,title:info.title,artist:info.author_name});
  if(!list)msg('Đã thêm 1 bài.');
}
function saveLib(){
  fetch('/api/library',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(tracks.filter(t=>t.yt).map(({yt,title,artist,art})=>({yt,title,artist,art})))}).catch(()=>{});
}
async function loadLib(){
  try{const r=await fetch('/api/library');if(r.ok)(await r.json()).forEach(t=>addYT({id:t.yt,title:t.title,artist:t.artist,art:t.art},false));}catch(e){}
}
$('#linkForm').onsubmit=e=>{e.preventDefault();const v=$('#link').value;if(v.trim())addLink(v).then(()=>{$('#link').value=''});};
fetch('/api/health').then(r=>r.json()).then(j=>{$('#srv').textContent=j.hasKey?'Backend sẵn sàng: đọc được cả danh sách phát YouTube':'Backend đang chạy, chưa có YT_API_KEY nên chỉ thêm được từng video';}).catch(()=>{$('#srv').textContent='Không có backend: chỉ phát nhạc trong máy';});
render();loadLib();
