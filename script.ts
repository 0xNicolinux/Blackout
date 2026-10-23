// @ts-nocheck
// Fonte TypeScript do jogo. Gere BLACKOUT.js com `npm run build`.
const $=id=>document.getElementById(id);
const SEQ=["P","V","I","A"];
const BR={P:{n:"PRINCIPAL",c:0xcfd4da,x:.25},V:{n:"VENTILAÇÃO",c:0xcfd4da,x:-.75},I:{n:"ILUMINAÇÃO",c:0xcfd4da,x:.75},A:{n:"AUXILIAR",c:0xcfd4da,x:-.25}};
const TOOLS=[["chave","Chave de fenda"],["multi","Multímetro"],["alicate","Alicate"],["lanterna","Lanterna"],["extintor","Extintor"]];
let scene,cam,ren,S,inter=[],lamps=[],lampM=[],amb,spot,fire,fl,spk,rc=new THREE.Raycaster(),clock=new THREE.Clock();
let running=false,paused=false,yaw=0,pitch=0,P={x:0,z:2.5},keys={},lockOK=true,lockSeen=0,drag=null,target=null,acc=0,msgT,ac,safetyBoardDraw=()=>{};
let waterOutletY=2.54;
/* ---------- audio ---------- */
function A(){if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume();return ac}
function beep(f,d,ty,v){try{const a=A(),o=a.createOscillator(),g=a.createGain();o.type=ty||"sine";o.frequency.value=f;g.gain.value=v||.08;g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+d);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+d)}catch(e){}}
function noise(d,v,hp){try{const a=A(),n=a.sampleRate*d,b=a.createBuffer(1,n,a.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=(Math.random()*2-1)*(1-i/n);const s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();f.type="highpass";f.frequency.value=hp||800;g.gain.value=v||.15;s.buffer=b;s.connect(f);f.connect(g);g.connect(a.destination);s.start()}catch(e){}}
function buzz(){beep(90,.5,"sawtooth",.12);beep(140,.5,"square",.05);noise(.3,.2,2000)}
/* ---------- music ---------- */
let mus,mg,st=0,nT=0,nbuf,radioScreenDraw=()=>{},radioPowerButton,radioPrevButton,radioNextButton,internTracks=[],internTrackUrls=[],internTrackIndex=0,internAudio,internHasPlayed=false,defaultMusicStatus="loading";const fq=m=>440*Math.pow(2,(m-69)/12);
function mv(f,t,d,ty,v){const o=ac.createOscillator(),g=ac.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(mg);o.start(t);o.stop(t+d+.02);return o}
function radioVolume(){if(!mg)return;const v=S&&S.radioOn&&!S.tape ? .3 : 0;try{mg.gain.setTargetAtTime(v,ac.currentTime,.06)}catch(e){mg.gain.value=v}}
function syncInternAudio(restart=false){if(!internAudio||!internTracks.length)return;if(restart||!internAudio.src){internAudio.src=internTracks[internTrackIndex].url;internAudio.currentTime=0}if(!S||!S.radioOn||!S.tape||!running||paused){internAudio.pause();return}if(internAudio.paused)internAudio.play().catch(()=>msg("O navegador bloqueou o áudio. Ligue o rádio novamente para tentar."))}
function ensureInternAudio(){if(internAudio)return;internAudio=new Audio();internAudio.volume=.72;internAudio.preload="auto";internAudio.addEventListener("ended",()=>{if(!internTracks.length)return;internTrackIndex=(internTrackIndex+1)%internTracks.length;internHasPlayed=true;syncInternAudio(true);radioScreenDraw()})}
function setInternTracks(list,ownedUrls=[]){if(internAudio)internAudio.pause();internTrackUrls.forEach(u=>URL.revokeObjectURL(u));internTrackUrls=ownedUrls;internTracks=list;internTrackIndex=0;internHasPlayed=false;if(!internTracks.length)return;ensureInternAudio();internAudio.src=internTracks[0].url;radioScreenDraw();syncInternAudio(true)}
function loadDefaultMusic(){const pageUrl=new URL(window.location.href);if(pageUrl.protocol!=="https:"&&pageUrl.protocol!=="http:"){defaultMusicStatus="unavailable";return}const appBase=new URL(".",pageUrl);fetch(new URL("musica/playlist.json",appBase),{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("playlist indisponível");return r.json()}).then(data=>{const tracks=(Array.isArray(data.tracks)?data.tracks:[]).filter(p=>typeof p==="string"&&!p.startsWith("/")&&!p.includes(":")&&!p.split("/").includes("..")&&/\.(mp3|ogg|wav|m4a|aac|webm)$/i.test(p)).map(p=>({name:p.split("/").pop(),url:new URL("musica/"+p.split("/").map(encodeURIComponent).join("/"),appBase).href}));if(!tracks.length){defaultMusicStatus="empty";return}setInternTracks(tracks);defaultMusicStatus="ready"}).catch(()=>{defaultMusicStatus="unavailable"})}
function changeInternTrack(delta){if(!internTracks.length){if(defaultMusicStatus==="loading")return msg("Carregando a lista de músicas...");return msg("Nenhuma faixa foi carregada. Confira a pasta musica/ e o arquivo playlist.json.")}if(!S||!S.tape)return msg("Insira a fita do estagiário antes de trocar a faixa.");internTrackIndex=(internTrackIndex+delta+internTracks.length)%internTracks.length;internHasPlayed=true;syncInternAudio(true);radioScreenDraw();msg("Faixa "+(internTrackIndex+1)+" de "+internTracks.length+": "+internTracks[internTrackIndex].name)}
function toggleRadio(){if(!S)return;S.radioOn=!S.radioOn;radioVolume();syncInternAudio();radioScreenDraw();if(radioPowerButton)radioPowerButton.material.emissive.setHex(S.radioOn?0x2bd17d:0x000000);beep(S.radioOn?660:330,.08,"square",.035);msg(S.radioOn?(S.tape?(internTracks.length?"Rádio ligado: MIX DO ESTAGIÁRIO.":"A lista de músicas não carregou. Confira playlist.json."): "Rádio ligado: programação da oficina."):"Rádio desligado. Silêncio na oficina.")}
function swapTape(){if(!S)return;if(!S.tape&&!internTracks.length&&defaultMusicStatus==="loading")return msg("Carregando a lista de músicas...");S.tape=!S.tape;radioVolume();if(S.tape){if(!internTracks.length){msg("A lista de músicas não carregou. Confira playlist.json na pasta musica/.")}else{if(internHasPlayed)internTrackIndex=(internTrackIndex+1)%internTracks.length;internHasPlayed=true;syncInternAudio(true);msg("Fita inserida: "+internTracks[internTrackIndex].name)}}else{syncInternAudio();msg("Fita do estagiário ejetada.")}radioScreenDraw();beep(S.tape?880:440,.09,"triangle",.04)}
function music(){if(mus)return;try{const a=A();mg=a.createGain();mg.gain.value=0;const lp=a.createBiquadFilter();lp.frequency.value=2200;mg.connect(lp);lp.connect(a.destination);nbuf=a.createBuffer(1,a.sampleRate*.1,a.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;nT=a.currentTime+.1;
 mus=setInterval(()=>{const sd=60/104/4,roots=[45,41,43,40];while(nT<a.currentTime+.3){const bar=Math.floor(st/16)%4,s=st%16,r=roots[bar],g=running&&!paused;
  if(s%2===0)mv(fq(r+[0,12,7,12,0,15,12,7][s/2]),nT,.18,"sawtooth",.13);
  if(s===0)mv(fq(r+24),nT,sd*14,"triangle",.05);
  if(s===0&&bar%2===0)mv(fq(r+31),nT,sd*12,"sine",.04);
  if(g&&s%4===0){const k=mv(120,nT,.2,"sine",.5);k.frequency.exponentialRampToValueAtTime(40,nT+.15)}
  if(s%2===1&&(g||st%32>16)){const n=a.createBufferSource(),gg=a.createGain();n.buffer=nbuf;gg.gain.setValueAtTime(.06,nT);gg.gain.exponentialRampToValueAtTime(.001,nT+.05);n.connect(gg);gg.connect(mg);n.start(nT)}
  if(!g&&s===8)mv(fq(r+36+(bar%2)*3),nT,.6,"square",.03);
  nT+=sd;st++}},80)}catch(e){}}
addEventListener("pointerdown",music,{once:true});
/* ---------- helpers ---------- */
const M=(g,c,o)=>{const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.7,metalness:.2},o||{})));m.castShadow=m.receiveShadow=true;return m};
const B=(w,h,d,c,o)=>M(new THREE.BoxGeometry(w,h,d),c,o);
const C=(r,h,c,o)=>M(new THREE.CylinderGeometry(r,r,h,12),c,o);
function txt(lines,w,h,bg,fg,sz){const c=document.createElement("canvas");c.width=256;c.height=Math.round(256*h/w);const x=c.getContext("2d");x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);x.fillStyle=fg;x.font="bold "+sz+"px sans-serif";x.textAlign="center";x.textBaseline="middle";const a=lines.split("|");a.forEach((l,i)=>x.fillText(l,c.width/2,c.height/2+(i-(a.length-1)/2)*(sz+5)));return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c),roughness:1}))}
const addI=o=>{if(!inter.includes(o))inter.push(o)},delI=o=>{const i=inter.indexOf(o);if(i>=0)inter.splice(i,1)};
function msg(t){const m=$("msg");m.textContent=t;m.classList.add("on");clearTimeout(msgT);msgT=setTimeout(()=>m.classList.remove("on"),3800)}
function card(t,x){S.card=1;const c=$("card");c.innerHTML="<b>"+t+"</b><p>"+x+"</p><i>E — fechar</i>";c.classList.remove("hide")}
function closeCard(){S.card=0;$("card").classList.add("hide")}
const fmt=t=>String(Math.floor(t/60)).padStart(2,"0")+":"+String(Math.floor(t%60)).padStart(2,"0");
/* ---------- build ---------- */
function build(){
 const D=(m,x,y,z)=>{m.position.set(x,y,z);scene.add(m);return m};
 const wallText=(label,w,h,bg,fg,size,x,y,z)=>{const m=txt(label,w,h,bg,fg,size);m.position.set(x,y,z);m.rotation.y=-Math.PI/2;scene.add(m);return m};
 scene=new THREE.Scene();scene.background=new THREE.Color(0x05070d);scene.fog=new THREE.Fog(0x05070d,6,16);
 inter=[];lamps=[];lampM=[];
 S={exam:0,prog:0,on:{},err:null,fire:0,dark:0,tools:{},sel:null,epi:0,t:0,inc:0,done:0,card:0,rt:20,ri:0,fireT:0,spr:0,wet:0,shk:0,radioOn:0,tape:0,safetyBroken:0};radioVolume();syncInternAudio();
 yaw=0;pitch=0;P={x:0,z:2.5};
 amb=new THREE.AmbientLight(0x6677aa,.5);scene.add(amb);
 [[-2,0],[2,0],[0,-2.4]].forEach((p,i)=>{const l=new THREE.PointLight(0xfff2d0,.9,10);l.position.set(p[0],3.2,p[1]);if(i===2){l.castShadow=true;l.shadow.mapSize.set(512,512)}scene.add(l);lamps.push(l);const f=B(.9,.08,.25,0xdddddd,{emissive:0xfff2d0,emissiveIntensity:1});f.position.set(p[0],3.45,p[1]);scene.add(f);lampM.push(f)});
 const fl0=B(8,.1,8,0x2a2d33);fl0.position.y=-.05;scene.add(fl0);floorM=fl0;const ce=B(8,.1,8,0x20242a);ce.position.y=3.5;scene.add(ce);
 [[0,-4.1,8.4,.2],[0,4.1,8.4,.2],[-4.1,0,.2,8.4],[4.1,0,.2,8.4]].forEach(w=>{const m=B(w[2],3.5,w[3],0x3a4350);m.position.set(w[0],1.75,w[1]);scene.add(m)});
 cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,50);cam.position.set(0,1.65,2.5);scene.add(cam);
 spot=new THREE.SpotLight(0xffffff,0,14,.5,.5,1);spot.position.set(0,0,0);spot.target.position.set(0,0,-1);cam.add(spot);cam.add(spot.target);
 /* panel */
 const pn=B(2.5,2.3,.3,0x4b5560,{metalness:.6});pn.position.set(0,1.55,-3.85);scene.add(pn);
 pn.userData={hint:"E — Examinar quadro elétrico",e:()=>{S.exam=1;msg("Quatro disjuntores sem etiqueta. Descubra a função e deduza a ordem!")}};addI(pn);

 Object.keys(BR).forEach(k=>{const b=BR[k],g=new THREE.Group();g.position.set(b.x,1.5,-3.62);g.add(B(.34,.6,.08,0x1a1d22));
  const lv=B(.1,.26,.1,b.c,{emissive:b.c,emissiveIntensity:.2});lv.position.z=.07;lv.rotation.x=.5;g.add(lv);b.lv=lv;
  const lb=txt("DISJ-"+(Math.round((b.x+.75)/.5)+1)+" ???",.46,.16,"#111","#888",34);lb.position.set(0,-.42,.045);g.add(lb);b.lb=lb;
  b.led=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),new THREE.MeshStandardMaterial({color:0x333333,emissive:0x000000}));b.led.position.set(b.x,2.45,-3.68);scene.add(b.led);
  g.userData={hint:()=>"Clique — "+(b.known?"Disjuntor "+b.n:"Disjuntor sem etiqueta (use o multímetro)"),click:t=>press2(k,t)};scene.add(g);addI(g)});
 const V=(x,y,z)=>new THREE.Vector3(x,y,z),wireColors={V:0x32c878,A:0xe34a42,P:0x3284e8,I:0xf1cc32},wireEnds={V:-3.12,A:-2.92,P:-2.72,I:-2.52};
 // Separate, color-coded leads run from each breaker terminal to a matching generator socket.
 const wirePaths=Object.keys(wireEnds).map(k=>{const x=BR[k].x,e=wireEnds[k];return [V(x,1.22,-3.54),V(x,1.02,-3.50),V(x,.84,-3.43),V(e,.70,-3.34)]});
 wirePaths.forEach((pts,i)=>scene.add(M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.022,8),wireColors[Object.keys(wireEnds)[i]])));
 const sw=txt("CUIDADO!|Alta tensão|(e alto estresse)",.8,.5,"#ffd800","#111",22);sw.position.set(-2.8,2.6,-3.97);scene.add(sw);
 /* table */
 const tb=B(3,.08,1,0x76543a);tb.position.set(0,.9,-2.3);scene.add(tb);[[-1.4,-1.9],[1.4,-1.9],[-1.4,-2.7],[1.4,-2.7]].forEach(l=>{const g=B(.08,.9,.08,0x39434a);g.position.set(l[0],.45,l[1]);scene.add(g)});
 D(B(2.72,.16,.07,0x46515a),0,.79,-1.78);[-.82,.82].forEach(x=>{D(B(.62,.09,.025,0x59656b),x,.79,-1.738);D(B(.16,.025,.035,0xc9a45a),x,.79,-1.713)});D(txt("BANCADA DE TESTES",.72,.09,"#46515a","#f2c45b",15),0,.79,-1.733);
 // A practical flat clipboard replaces the button panel on the clear part of the bench.
 const clipX=.85,clipZ=-2.3;
 D(B(.48,.025,.66,0x383d40),clipX,.96,clipZ);
 D(B(.405,.008,.53,0xf1ead8),clipX,.977,clipZ+.035);
 const clipText=txt("ORDEM DE LIGAMENTO|QG-01|1. Revele os nomes|2. Leia as pistas|3. Deduza a ordem|4. Confira no medidor",.38,.5,"#f1ead8","#26323a",19);
 clipText.rotation.x=-Math.PI/2;clipText.position.set(clipX,.984,clipZ+.035);scene.add(clipText);
 // Thin metal clamp and two rivets hold the sheet at the top edge.
 D(B(.19,.018,.065,0x87939a),clipX,.99,clipZ-.255);
 D(B(.12,.012,.018,0xb9c2c5),clipX,.999,clipZ-.27);
 [-.065,.065].forEach(x=>{const rivet=C(.012,.008,0xdce1df);rivet.rotation.x=Math.PI/2;rivet.position.set(clipX+x,.999,clipZ-.255);scene.add(rivet)});
 clipText.userData={hint:"E — Ler a prancheta de testes",e:()=>card("Desafio de lógica — QG-01","Há quatro disjuntores e, portanto, <b>24 ordens de ligamento possíveis</b>. Não tente todas na sorte: use as pistas para eliminar as sequências que desrespeitam as dependências. O multímetro revela o nome de cada circuito e confirma se ele já pode ser ligado: <b>12V</b> indica pronto; <b>0V</b> indica que falta uma etapa anterior. Anote sua dedução antes de agir.")};addI(clipText);
 /* tools */
 const tool=(key,mesh,x,y,z)=>{mesh.position.set(x,y,z);scene.add(mesh);const nm=TOOLS.find(t=>t[0]===key)[1];mesh.userData={hint:"E — Pegar "+nm.toLowerCase(),e:()=>{S.tools[key]=1;scene.remove(mesh);delI(mesh);S.sel=key;beep(660,.1);msg("Pegou: "+nm+" (teclas 1–5 trocam de ferramenta)")}};addI(mesh)};
 // Tools lie flat in a spaced row, with recognizable handles and working ends.
 let g=new THREE.Group();
 const screwdriverGrip=new THREE.LatheGeometry([
  new THREE.Vector2(0,-.015),new THREE.Vector2(.025,-.015),new THREE.Vector2(.039,0),new THREE.Vector2(.052,.025),
  new THREE.Vector2(.057,.055),new THREE.Vector2(.052,.085),new THREE.Vector2(.047,.12),new THREE.Vector2(.052,.16),
  new THREE.Vector2(.054,.19),new THREE.Vector2(.045,.21),new THREE.Vector2(.025,.22),new THREE.Vector2(0,.22)
 ],12);
 g.add(M(screwdriverGrip,0xf07827,{roughness:.78}));
 g.add(C(.058,.032,0xf2cf35)).position.y=.018;
 g.add(C(.027,.025,0xd94132)).position.y=-.022;
 g.add(C(.012,.2,0xc8d0d3,{metalness:.82,roughness:.3})).position.y=-.12;
 g.add(B(.026,.012,.045,0xaab4b8)).position.y=-.24;
 g.rotation.x=Math.PI/2;tool("chave",g,-1.25,1.002,-2.32);
 g=new THREE.Group();g.add(B(.19,.045,.27,0xe8b829));
 g.add(B(.145,.012,.095,0x252c31)).position.set(0,.03,-.07);g.add(B(.112,.006,.06,0x83c9a5,{emissive:0x1d513d})).position.set(0,.039,-.07);
 const meterRead=txt("12.0 V",.095,.035,"#83c9a5","#10251e",22);meterRead.rotation.x=-Math.PI/2;meterRead.position.set(0,.043,-.07);g.add(meterRead);
 const dial=C(.035,.018,0x303941);dial.position.set(0,.034,.035);g.add(dial);
 const dialMark=B(.008,.004,.035,0xe7edf0);dialMark.position.set(0,.045,.035);dialMark.rotation.y=-.45;g.add(dialMark);
 [-1,1].forEach((s,i)=>{const port=C(.014,.012,i?0xd3473d:0x252a30);port.position.set(s*.05,.03,.115);g.add(port)});tool("multi",g,-.68,.963,-2.32);
 g=new THREE.Group();
 [-1,1].forEach(s=>{const handle=B(.045,.035,.22,0xc93332);handle.position.set(s*.065,0,.09);handle.rotation.y=s*.17;g.add(handle);
  const ins=B(.032,.008,.12,0xe5bd45);ins.position.set(s*.065,.02,.1);ins.rotation.y=s*.17;g.add(ins);
  const jaw=B(.032,.024,.14,0x9ba4a8);jaw.position.set(s*.018,0,-.105);jaw.rotation.y=-s*.12;g.add(jaw)});
 const joint=C(.043,.03,0x626c72);joint.position.set(0,.019,-.025);g.add(joint);tool("alicate",g,-.08,.963,-2.32);
 g=new THREE.Group();
 const flashlightShell=new THREE.LatheGeometry([
  new THREE.Vector2(0,-.19),new THREE.Vector2(.047,-.19),new THREE.Vector2(.063,-.18),new THREE.Vector2(.071,-.16),
  new THREE.Vector2(.07,-.135),new THREE.Vector2(.064,-.115),new THREE.Vector2(.05,-.09),new THREE.Vector2(.046,-.06),
  new THREE.Vector2(.044,.075),new THREE.Vector2(.049,.11),new THREE.Vector2(.05,.14),new THREE.Vector2(.044,.16),
  new THREE.Vector2(.025,.17),new THREE.Vector2(0,.17)
 ],12);
 g.add(M(flashlightShell,0xf1c925,{roughness:.65}));
 // Recessed black grip rings wrap around the yellow barrel.
 [.005,.035,.065].forEach(y=>{const band=new THREE.Mesh(new THREE.TorusGeometry(.044,.004,6,12),new THREE.MeshStandardMaterial({color:0x343a3d,roughness:.9}));band.rotation.x=Math.PI/2;band.position.y=y;g.add(band)});
 const bezel=new THREE.Mesh(new THREE.TorusGeometry(.064,.007,8,12),new THREE.MeshStandardMaterial({color:0xf6d33c,roughness:.55}));bezel.rotation.x=Math.PI/2;bezel.position.y=-.163;g.add(bezel);
 const lens=C(.052,.012,0xd6eff4,{emissive:0x506c73,emissiveIntensity:.3});lens.position.y=-.19;g.add(lens);
 g.add(B(.026,.018,.042,0x30373b)).position.set(.02,.04,-.043);
 g.rotation.x=Math.PI/2;tool("lanterna",g,.4,1.015,-2.32);
 g=new THREE.Group();g.add(C(.11,.5,0xcc1111));const nz=C(.03,.1,0x111111);nz.position.y=.3;g.add(nz);const pin=C(.018,.07,0xffd800);pin.position.set(.045,.36,.02);g.add(pin);tool("extintor",g,2.3,.42,-3.84);
 /* clues */
 const q=Math.PI/2;
 const CX=(l,w,h,bg,fg,sz,pos,rot,hint,title,body)=>{const root=new THREE.Group();root.position.set(pos[0],pos[1],pos[2]);root.rotation.set(rot[0],rot[1],.025);const edge=B(w+.05,h+.05,.018,0x303943);edge.position.z=-.012;root.add(edge);const m=txt(l,w,h,bg,fg,sz);m.position.z=.002;root.add(m);const tape=B(w*.25,.045,.008,0xe1d7a3);tape.position.set(-w*.23,h*.48,.01);root.add(tape);m.userData={hint:"E — "+hint,e:()=>card(title,body)};scene.add(root);addI(m);return m};

 /* decor */

 // A compact break-room radio and side table fill the open back wall without blocking the aisle.
 D(B(1.45,.08,.64,0x76543a),1.32,.78,3.66);
 [[.72,3.4],[1.92,3.4],[.72,3.92],[1.92,3.92]].forEach(([x,z])=>D(B(.065,.78,.065,0x39434a),x,.39,z));
 const radio=new THREE.Group();radio.position.set(1.30,1.00,3.54);radio.rotation.y=Math.PI;scene.add(radio);
 radio.add(B(.62,.30,.20,0x26323a,{metalness:.5,roughness:.55}));
 // Top-loading cassette bay, inspired by compact vintage radio-cassette decks.
 const tapeBay=B(.34,.018,.22,0x171c20,{metalness:.35});tapeBay.position.set(0,.158,0);radio.add(tapeBay);
 const tapeWell=B(.29,.006,.178,0x30383c);tapeWell.position.set(0,.170,0);radio.add(tapeWell);
 [-1,1].forEach(s=>{const guide=B(.012,.008,.18,0x768087);guide.position.set(s*.151,.174,0);radio.add(guide)});
 const face=B(.57,.25,.025,0x37434a,{metalness:.35});face.position.set(0,0,.112);radio.add(face);
 const speaker=C(.092,.012,0x151a1d,{metalness:.35});speaker.rotation.x=Math.PI/2;speaker.position.set(-.16,.012,.132);radio.add(speaker);
 const speakerRing=new THREE.Mesh(new THREE.TorusGeometry(.079,.006,6,18),new THREE.MeshStandardMaterial({color:0x849097,metalness:.7,roughness:.45}));speakerRing.position.set(-.16,.012,.14);radio.add(speakerRing);
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){const hole=C(.009,.004,0x718087);hole.rotation.x=Math.PI/2;hole.position.set(-.195+col*.035,-.026+row*.035,.142);radio.add(hole)}
 const screenCanvas=document.createElement("canvas");screenCanvas.width=320;screenCanvas.height=128;
 const screenCtx=screenCanvas.getContext("2d")!;const screenTexture=new THREE.CanvasTexture(screenCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;
 const radioScreen=new THREE.Mesh(new THREE.PlaneGeometry(.25,.10),new THREE.MeshStandardMaterial({map:screenTexture,roughness:1}));radioScreen.position.set(.145,.062,.132);radio.add(radioScreen);
 radioScreenDraw=()=>{screenCtx.fillStyle="#101a18";screenCtx.fillRect(0,0,320,128);screenCtx.fillStyle=S&&S.radioOn?"#73f2a3":"#81918a";screenCtx.textAlign="center";screenCtx.font="bold 22px Arial";screenCtx.fillText(S&&S.radioOn?"● RÁDIO LIGADO":"RÁDIO DESLIGADO",160,43);screenCtx.font="bold 17px Arial";const track=S&&S.tape&&internTracks.length?internTracks[internTrackIndex].name:"FM • OFICINA";screenCtx.fillText(track.length>30?track.slice(0,27)+"…":track,160,86);screenTexture.needsUpdate=true};radioScreenDraw();
 const slot=B(.30,.045,.012,0x101416);slot.position.set(.12,-.086,.132);radio.add(slot);
 const tune=C(.027,.018,0xc2a45f);tune.rotation.x=Math.PI/2;tune.position.set(-.075,-.087,.14);radio.add(tune);
 radioPrevButton=B(.042,.038,.028,0x31454a,{emissive:0x000000});radioPrevButton.position.set(.045,-.045,.145);radio.add(radioPrevButton);
 radioPrevButton.userData={hint:"E — Faixa anterior",e:()=>changeInternTrack(-1),click:()=>changeInternTrack(-1)};addI(radioPrevButton);
 const prevGlyph=txt("◀",.032,.025,"#31454a","#e5edf0",28);prevGlyph.position.set(.045,-.045,.161);radio.add(prevGlyph);
 prevGlyph.userData={hint:"E — Faixa anterior",e:()=>changeInternTrack(-1),click:()=>changeInternTrack(-1)};addI(prevGlyph);
 radioNextButton=B(.042,.038,.028,0x31454a,{emissive:0x000000});radioNextButton.position.set(.125,-.045,.145);radio.add(radioNextButton);
 radioNextButton.userData={hint:"E — Próxima faixa",e:()=>changeInternTrack(1),click:()=>changeInternTrack(1)};addI(radioNextButton);
 const nextGlyph=txt("▶",.032,.025,"#31454a","#e5edf0",28);nextGlyph.position.set(.125,-.045,.161);radio.add(nextGlyph);
 nextGlyph.userData={hint:"E — Próxima faixa",e:()=>changeInternTrack(1),click:()=>changeInternTrack(1)};addI(nextGlyph);
 radioPowerButton=B(.045,.038,.028,0x202a2d,{emissive:0x000000});radioPowerButton.position.set(.235,-.045,.145);radio.add(radioPowerButton);
 radioPowerButton.userData={hint:"E — Ligar/desligar rádio",e:toggleRadio,click:toggleRadio};addI(radioPowerButton);
 const powerGlyph=txt("●",.028,.025,"#202a2d","#73f2a3",25);powerGlyph.position.set(.235,-.045,.161);radio.add(powerGlyph);
 powerGlyph.userData={hint:"E — Ligar/desligar rádio",e:toggleRadio,click:toggleRadio};addI(powerGlyph);
 // The removable cassette is a little prop on the table; E slides it into or out of the front slot.
 const cassette=new THREE.Group();scene.add(cassette);
 const cassetteShell=B(.25,.035,.17,0x252a2d,{metalness:.45,roughness:.55});cassette.add(cassetteShell);
 const cassetteLabel=txt("MIX DO|ESTAGIÁRIO",.18,.10,"#e4bd46","#202326",16);cassetteLabel.rotation.x=-Math.PI/2;cassetteLabel.position.y=.019;cassette.add(cassetteLabel);
 [-.064,.064].forEach(x=>{const reel=C(.026,.008,0xc6cbd0);reel.position.set(x,.022,0);cassette.add(reel);const hub=C(.009,.01,0x293137);hub.position.set(x,.028,0);cassette.add(hub)});
 cassette.userData={hint:()=>S&&S.tape?"E — Ejetar a fita do estagiário":"E — Inserir a fita do estagiário",e:swapTape,click:swapTape};addI(cassette);
 const updateCassette=()=>{const loaded=!!(S&&S.tape);cassette.rotation.set(0,0,0);cassette.position.set(loaded?1.30:1.78,loaded?1.19:.862,loaded?3.54:3.63)};
 cassette.userData.e=()=>{swapTape();updateCassette()};cassette.userData.click=()=>{swapTape();updateCassette()};updateCassette();
 CX("SÓ ESCUTE SE A|GERÊNCIA NÃO ESTIVER|OLHANDO",1.5,.48,"#f4e9a8","#9b3028",19,[1.32,1.72,3.985],[0,Math.PI],"Ler aviso do rádio","Aviso da equipe","A seleção musical foi aprovada pela equipe. Só escute se a gerência não estiver olhando. Se alguém perguntar, o rádio estava desligado.");

 // A family-art corkboard brings a personal touch to the break area and fills the blank wall.
 const familyBoard=B(1.94,1.18,.075,0x354148);familyBoard.position.set(-1.25,1.84,3.94);scene.add(familyBoard);
 const cork=B(1.84,1.08,.018,0x8c704c);cork.position.set(-1.25,1.84,3.887);scene.add(cork);
 const titleCanvas=document.createElement("canvas");titleCanvas.width=1024;titleCanvas.height=128;const titleCtx=titleCanvas.getContext("2d")!;
 titleCtx.fillStyle="#40564a";titleCtx.fillRect(0,0,1024,128);titleCtx.fillStyle="#f5e7c4";titleCtx.textAlign="center";titleCtx.textBaseline="middle";titleCtx.font="bold 54px Arial";titleCtx.fillText("MURAL DOS PEQUENOS ARTISTAS",512,65);
 const titleTexture=new THREE.CanvasTexture(titleCanvas);titleTexture.colorSpace=THREE.SRGBColorSpace;
 const boardTitle=new THREE.Mesh(new THREE.PlaneGeometry(1.76,.15),new THREE.MeshStandardMaterial({map:titleTexture,roughness:1,side:THREE.DoubleSide}));boardTitle.position.set(-1.25,2.27,3.868);boardTitle.rotation.y=Math.PI;scene.add(boardTitle);
 const makeChildDrawing=(file)=>{
  const material=new THREE.MeshBasicMaterial({color:0xf3ecd9,side:THREE.DoubleSide,toneMapped:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.scale.set(.50,.38,1);
  const url=new URL("desenhos/"+encodeURIComponent(file),new URL(".",window.location.href)).href;
  new THREE.TextureLoader().load(url,texture=>{
   texture.colorSpace=THREE.SRGBColorSpace;
   const aspect=texture.image.width/texture.image.height,h=Math.min(.38,.50/aspect),w=h*aspect;
   mesh.scale.set(w,h,1);material.map=texture;material.color.setHex(0xffffff);material.needsUpdate=true;
  },undefined,()=>{console.warn("Não foi possível carregar desenho do mural:",url);material.color.setHex(0xf3ecd9)});
  return mesh;
 };
 const childDrawings=["julia.webp","pedro.png","sofia.jpg"];
 [-1.82,-1.25,-.68].forEach((x,i)=>{
  const paper=B(.52,.42,.014,0xf3ecd9);paper.position.set(x,1.80,3.864);scene.add(paper);
  const drawing=makeChildDrawing(childDrawings[i]);drawing.position.set(x,1.80,3.852);drawing.rotation.y=Math.PI;scene.add(drawing);
  const tape=B(.13,.035,.012,[0xe7c960,0x8dc8b4,0xe59c83][i]);tape.position.set(x,1.995,3.842);scene.add(tape);
 });
 
 
 // Shelving sits clear of the wall; each carton rests on a shelf with a visible gap to its neighbors.
 [.5,1.2,1.85].forEach(y=>D(B(.58,.055,2.4,0x555b63),3.68,y,-1.8));
 [
  [3.53,.7,-2.55,.26,.28,.52,0xb8884a],[3.83,.7,-2.55,.26,.28,.52,0x4a6a8a],
  [3.53,.7,-1.8,.26,.28,.52,0x8a6b3c],[3.83,.7,-1.8,.26,.28,.52,0xb8884a],
  [3.53,.7,-1.05,.26,.28,.52,0x4a6a8a],[3.83,.7,-1.05,.26,.28,.52,0x8a6b3c],
  [3.53,1.4,-2.55,.26,.28,.52,0xb8884a],[3.83,1.4,-2.55,.26,.28,.52,0x4a6a8a],
  [3.53,1.4,-1.8,.26,.28,.52,0x8a6b3c],[3.83,1.4,-1.8,.26,.28,.52,0xb8884a],
  [3.53,1.4,-1.05,.26,.28,.52,0x4a6a8a],[3.83,1.4,-1.05,.26,.28,.52,0x8a6b3c],
  [3.53,2.05,-2.2,.26,.24,.48,0xb8884a],[3.83,2.05,-2.2,.26,.24,.48,0x4a6a8a]
 ].forEach(([x,y,z,w,h,d,c])=>D(B(w,h,d,c),x,y,z));
 D(B(.07,2,.08,0x303943),3.36,1,-3);D(B(.07,2,.08,0x303943),3.36,1,-.6);D(B(.07,2,.08,0x303943),3.99,1,-3);D(B(.07,2,.08,0x303943),3.99,1,-.6);const rackTag=wallText("ESTOQUE DE PEÇAS",1.25,.16,"#27343d","#e2b653",18,3.81,2.45,-1.8);
 // Armário de ferramentas interativo: portas articuladas e luvas isolantes em uma prateleira interna.
  D(B(.06,1.96,1.54,0x253a32),-3.97,1,-.3);
  D(B(.42,.035,1.43,0x657668),-3.72,.48,-.3);D(B(.42,.035,1.43,0x657668),-3.72,1.28,-.3);
  const lockerDoors=[];let lockerOpen=false;
  [[-.7,-1.075,1],[.1,.475,-1]].forEach(([z,hingeZ,dir])=>{
   const door=new THREE.Group();door.position.set(-3.95,1,hingeZ);
   const panel=B(.5,1.96,.75,0x315044);panel.position.set(.25,0,dir*.375);door.add(panel);
   const handle=B(.035,.32,.05,0xd6d8d4);handle.position.set(.52,.2,dir*.25);door.add(handle);
   scene.add(door);lockerDoors.push({door,dir});addI(door);
   door.userData={hint:()=>lockerOpen?"E — Fechar armário":"E — Abrir armário",e:()=>toggleLocker(),click:()=>toggleLocker()};
  });
  const gloves=new THREE.Group();gloves.visible=false;
  const gloveHand=(z)=>{
   const hand=new THREE.Group();
   const palm=B(.05,.11,.13,0xf2c94c);palm.position.y=.11;hand.add(palm);
   const cuff=B(.055,.045,.14,0x398ca4);cuff.position.set(0,.035,0);hand.add(cuff);
   [-.048,-.016,.016,.048].forEach(dz=>{const finger=C(.018,.075,0xf2c94c);finger.position.set(0,.205,dz);hand.add(finger)});
   const thumb=B(.045,.085,.04,0xf2c94c);thumb.position.set(0,.12,.083);thumb.rotation.x=-.42;hand.add(thumb);
   hand.position.set(-3.52,.48,z);gloves.add(hand);
  };
  gloveHand(-.48);gloveHand(-.12);scene.add(gloves);
  gloves.userData={hint:"E — Pegar luvas isolantes",e:()=>pickGloves(),click:()=>pickGloves()};
  const pickGloves=()=>{if(S.epi)return;S.epi=1;gloves.visible=false;delI(gloves);scene.remove(gloves);hud();beep(660,.1);msg("EPI equipado: luvas isolantes. O quadro ainda precisa secar.")};
  addI(gloves);
  const toggleLocker=()=>{
   lockerOpen=!lockerOpen;lockerDoors.forEach(({door,dir})=>{door.rotation.y=lockerOpen?dir*1.12:0});
   gloves.visible=lockerOpen&&!S.epi;
   if(lockerOpen)card("Charada do EPI","Cubrem as mãos e ajudam a reduzir o risco elétrico, mas não desligam a energia. O que são?<br><br><b>Resposta: luvas isolantes.</b> EPI é uma barreira de proteção; não substitui os procedimentos seguros. No jogo, o quadro molhado continua bloqueado até secar.");
   else msg("Armário fechado.");
  };
  const lockerTag=D(txt("FERRAMENTAS",.62,.16,"#263b32","#dce8dd",16),-3.97,2.28,-.3);lockerTag.rotation.y=Math.PI/2;
 // One workshop chair centered at the bench, with its back toward the open floor.
 const chairX=0,chairZ=-1.38;
 D(B(.5,.06,.5,0x303943),chairX,.52,chairZ);D(B(.5,.5,.06,0x303943),chairX,.8,chairZ+.22);D(C(.045,.5,0x666d75),chairX,.25,chairZ);D(B(.5,.045,.06,0x222),chairX,.03,chairZ);D(B(.06,.045,.5,0x222),chairX,.03,chairZ);
 // Open mesh office wastebasket with a tapered wire frame and reinforced rim.
 const makeOfficeBin=(x,z)=>{const h=.72,r0=.23,r1=.29;
  D(M(new THREE.CylinderGeometry(r0*.92,r0*.92,.035,16),0x252b30),x,.025,z);
  D(M(new THREE.CylinderGeometry(r0*.72,r0*.72,.012,16),0x171b20),x,.048,z);
  for(let i=0;i<16;i++){const a=i*Math.PI*2/16,t=.52,r=r0+(r1-r0)*t,bar=C(.008,.67,0x535c61,{metalness:.62,roughness:.48});bar.position.set(x+Math.cos(a)*r,.37,z+Math.sin(a)*r);scene.add(bar)}
  [.14,.29,.44,.59,.69].forEach(y=>{const r=r0+(r1-r0)*(y/h),hoop=new THREE.Mesh(new THREE.TorusGeometry(r,.007,5,20),new THREE.MeshStandardMaterial({color:0x454e53,metalness:.62,roughness:.5}));hoop.rotation.x=Math.PI/2;hoop.position.set(x,y,z);hoop.castShadow=true;scene.add(hoop)});
  const rim=new THREE.Mesh(new THREE.TorusGeometry(r1-.006,.016,6,20),new THREE.MeshStandardMaterial({color:0x242b30,metalness:.6,roughness:.4}));rim.rotation.x=Math.PI/2;rim.position.set(x,h-.005,z);scene.add(rim);
  D(B(.27,.12,.018,0x26323a),x,.36,z-r1-.008);
  const label=txt("LIXO COMUM",.245,.09,"#26323a","#e9edf0",16);label.position.set(x,.36,z-r1-.019);label.rotation.y=Math.PI;scene.add(label);
 };
 // Blue office recycling bin: lidded slot, clear label, and a shared corner position.
 const makeRecyclingBin=(x,z)=>{const h=.68,w=.44,d=.42;
  D(B(w,h,d,0x246b77),x,h/2,z);
  D(B(w+.035,.055,d+.035,0x1f5962),x,h+.027,z);
  D(B(.25,.008,.06,0x172d33),x,h+.058,z);
  [-1,1].forEach(s=>D(B(.018,.11,.1,0x183e45),x+s*(w/2+.01),.36,z));
  D(B(.32,.24,.018,0x194b54),x,.39,z-d/2-.011);
  const label=txt("♻|RECICLÁVEIS|PAPEL • PLÁSTICO",.29,.21,"#194b54","#e4fff4",15);label.position.set(x,.39,z-d/2-.022);label.rotation.y=Math.PI;scene.add(label);
  [-1,1].forEach(s=>[-1,1].forEach(t=>D(B(.055,.025,.055,0x263238),x+s*(w*.38),.012,z+t*(d*.38))));
 };
 makeOfficeBin(-3.62,3.65);
 makeRecyclingBin(-2.95,3.65);
 // Ramal fechado dos sprinklers e duas alimentações que entram pela parede do fundo.
 const waterPipeColor=0x278fca;
 for(const z of [-1.65,1.65])D(C(.055,5.4,waterPipeColor,{metalness:.38,roughness:.46}),0,3.24,z).rotation.z=Math.PI/2;
 for(const x of [-2.7,2.7])D(C(.055,3.3,waterPipeColor,{metalness:.38,roughness:.46}),x,3.24,0).rotation.x=Math.PI/2;
 for(const x of [-2.7,0,2.7])for(const z of [-1.65,1.65])D(B(.035,.2,.035,0x68747b),x,3.38,z);
 for(const x of [-2.7,2.7])for(const z of [-1.65,1.65])D(B(.13,.13,.13,0x1c6e9f,{metalness:.42,roughness:.42}),x,3.24,z);
 // Cada ramal sobe pela parede, faz a curva no teto e entra no circuito por um tê.
 [-2.7,2.7].forEach(x=>{
  D(C(.075,2.08,waterPipeColor,{metalness:.42,roughness:.42}),x,2.20,-3.94);
  D(C(.075,2.30,waterPipeColor,{metalness:.42,roughness:.42}),x,3.24,-2.795).rotation.x=Math.PI/2;
  D(C(.105,.09,0x1c6e9f,{metalness:.48,roughness:.4}),x,3.24,-1.65).rotation.x=Math.PI/2;
  D(C(.12,.045,0x1c6e9f,{metalness:.48,roughness:.4}),x,1.16,-3.99).rotation.x=Math.PI/2;
  D(C(.035,.16,waterPipeColor,{metalness:.4}),x,1.16,-3.84).rotation.x=Math.PI/2;
  const valve=new THREE.Mesh(new THREE.TorusGeometry(.105,.018,6,12),new THREE.MeshStandardMaterial({color:0x258ec0,metalness:.55,roughness:.38}));
  valve.position.set(x,1.16,-3.75);scene.add(valve);
  D(B(.17,.014,.018,0x9ab5c2),x,1.16,-3.75);D(B(.014,.17,.018,0x9ab5c2),x,1.16,-3.75);
  const hub=C(.028,.04,0x9ab5c2);hub.rotation.x=Math.PI/2;D(hub,x,1.16,-3.73);
  const inlet=txt("REDE DE ÁGUA",.62,.11,"#174465","#e6f4fc",14);inlet.position.set(x,.88,-3.99);scene.add(inlet);
 });
 D(B(3.25,.09,.16,0x59636c),0,3.31,-3.94);[-1.5,0,1.5].forEach(x=>D(B(.035,.16,.035,0x747e84),x,3.39,-3.94));
 // Guarded wall fan, mechanically linked to the ventilation circuit.
 const fr=D(M(new THREE.TorusGeometry(.35,.04,8,20),0x555b63),2.8,2.7,-3.93);fanB=new THREE.Group();fanB.position.set(2.8,2.7,-3.9);
 for(let i=0;i<3;i++){const b=B(.3,.065,.025,0x99a),pv=new THREE.Group();b.position.x=.17;pv.rotation.z=i*2.09;pv.add(b);fanB.add(pv)}
 const hub=C(.105,.12,0x68727c);hub.rotation.x=Math.PI/2;fanB.add(hub);scene.add(fanB);
 const ck=D(C(.22,.04,0xeeeeee),0,3.0,-3.97);ck.rotation.x=Math.PI/2;D(B(.02,.17,.01,0x111),0,3.05,-3.94);D(B(.12,.02,.01,0x111),.05,3.0,-3.94);
 D(txt("QUADRO GERAL QG-01",.9,.14,"#222","#ffd800",20),0,2.6,-3.69);
 // Central safety target and a practical pre-task self-check replace the shift timer and spare fuse panel.
 const safetyZ=1.33,safetyY=1.68;
 D(B(.10,.86,1.18,0x48545e),3.91,safetyY,safetyZ);
 const safetyCanvas=document.createElement("canvas");safetyCanvas.width=720;safetyCanvas.height=520;
 const safetyCtx=safetyCanvas.getContext("2d")!;
 const safetyTexture=new THREE.CanvasTexture(safetyCanvas);safetyTexture.colorSpace=THREE.SRGBColorSpace;
 safetyBoardDraw=()=>{
  const broken=!!(S&&S.safetyBroken);safetyCtx.fillStyle="#202a32";safetyCtx.fillRect(0,0,720,520);
  safetyCtx.fillStyle=broken?"#e44738":"#ffd800";safetyCtx.fillRect(0,0,720,14);safetyCtx.fillRect(32,88,656,3);
  safetyCtx.fillStyle="#e5edf1";safetyCtx.textAlign="left";safetyCtx.font="bold 25px Arial";safetyCtx.fillText("SEGURANÇA • OFICINA ELÉTRICA",38,58);
  safetyCtx.fillStyle="#aeb9bd";safetyCtx.font="bold 25px Arial";safetyCtx.fillText("ESTÁVAMOS HÁ",42,143);
  safetyCtx.fillStyle="#ffd800";safetyCtx.font="bold 166px Arial";safetyCtx.fillText("10",38,317);
  safetyCtx.fillStyle="#f4f5f2";safetyCtx.font="bold 49px Arial";safetyCtx.fillText("ANOS",280,247);
  safetyCtx.font="bold 36px Arial";safetyCtx.fillText("SEM ACIDENTES",280,300);
  safetyCtx.fillStyle="#ffd800";safetyCtx.fillRect(32,360,656,104);
  safetyCtx.fillStyle="#202a32";safetyCtx.textAlign="center";safetyCtx.font="bold 35px Arial";
  safetyCtx.fillText("...ATÉ O ESTAGIÁRIO CHEGAR.",360,424);
  safetyCtx.fillStyle=broken?"#ffb3a2":"#aeb9bd";safetyCtx.font="bold 17px Arial";
  safetyCtx.fillText(broken?"10 ANOS SEM ACIDENTES. QUEBRADOS NO 1º TURNO.":"RECORDE HISTÓRICO DA OFICINA",360,493);
  safetyTexture.needsUpdate=true;
 };safetyBoardDraw();
 const safetyBoard=new THREE.Mesh(new THREE.PlaneGeometry(1.14,.82),new THREE.MeshStandardMaterial({map:safetyTexture,roughness:1,side:THREE.DoubleSide}));
 safetyBoard.position.set(3.84,safetyY,safetyZ);safetyBoard.rotation.y=-Math.PI/2;scene.add(safetyBoard);
 const checkZ=2.72,checkY=1.68;
 D(B(.12,.96,1.42,0x48545e),3.91,checkY,checkZ);
 const checklistCanvas=document.createElement("canvas");checklistCanvas.width=720;checklistCanvas.height=480;
 const checklistCtx=checklistCanvas.getContext("2d")!;
 checklistCtx.fillStyle="#f4efdf";checklistCtx.fillRect(0,0,720,480);
 checklistCtx.fillStyle="#263640";checklistCtx.fillRect(0,0,720,104);
 checklistCtx.fillStyle="#ffd84a";checklistCtx.font="bold 34px Arial";checklistCtx.textAlign="left";checklistCtx.fillText("PAUSA DE SEGURANÇA",38,48);
 checklistCtx.fillStyle="#e8eef0";checklistCtx.font="bold 22px Arial";checklistCtx.fillText("ANTES DE COMEÇAR O SERVIÇO",38,82);
 checklistCtx.fillStyle="#607078";checklistCtx.font="bold 17px Arial";checklistCtx.textAlign="center";checklistCtx.fillText("SIM",548,123);checklistCtx.fillText("NÃO",642,123);
 const selfCheck=["Eu sei fazer isso?","Eu posso fazer isso?","Eu consigo sem improvisar?"];
 selfCheck.forEach((question,i)=>{const y=164+i*68;checklistCtx.fillStyle=i%2===0?"#fffdf6":"#ebe5d7";checklistCtx.fillRect(24,y-27,672,56);checklistCtx.fillStyle="#263640";checklistCtx.font="bold 24px Arial";checklistCtx.textAlign="left";checklistCtx.fillText(question,42,y+8);[548,642].forEach((x,j)=>{checklistCtx.strokeStyle=j===0?"#278b70":"#c45043";checklistCtx.lineWidth=4;checklistCtx.strokeRect(x-15,y-14,28,28)})});
 checklistCtx.fillStyle="#9c453c";checklistCtx.font="bold 16px Arial";checklistCtx.textAlign="left";checklistCtx.fillText("SE NÃO: PARE E PEÇA AJUDA.",30,454);
 const checklistTexture=new THREE.CanvasTexture(checklistCanvas);checklistTexture.colorSpace=THREE.SRGBColorSpace;
 const checkTitle=new THREE.Mesh(new THREE.PlaneGeometry(1.38,.92),new THREE.MeshStandardMaterial({map:checklistTexture,roughness:1,side:THREE.DoubleSide}));
 checkTitle.position.set(3.84,checkY,checkZ);checkTitle.rotation.y=-Math.PI/2;scene.add(checkTitle);
 checkTitle.userData={hint:"E — Consultar checklist de segurança",e:()=>card("Checklist antes do serviço","<b>Eu sei fazer isso?</b><br><b>Eu posso fazer isso?</b><br><b>Eu consigo sem improvisar?</b><br><br>Se alguma resposta for não, pare e peça orientação antes de tocar no quadro.")};addI(checkTitle);
 // The intern's satirical post-it is pinned to the checklist's lower-right corner.
 const noteZ=3.20,noteY=1.36;
 D(B(.025,.34,.34,0xd8cfb4),3.82,noteY,noteZ);
 const noteCanvas=document.createElement("canvas");noteCanvas.width=360;noteCanvas.height=360;
 const noteCtx=noteCanvas.getContext("2d")!;noteCtx.fillStyle="#fff0a8";noteCtx.fillRect(0,0,360,360);
 noteCtx.fillStyle="#34312b";noteCtx.textAlign="center";noteCtx.font="italic bold 34px 'Comic Sans MS', 'Segoe Print', cursive";
 noteCtx.fillText("Eu quero,",180,145);noteCtx.fillText("eu posso.",180,198);
 noteCtx.font="italic 26px 'Comic Sans MS', 'Segoe Print', cursive";noteCtx.fillText("R.c",180,252);
 const noteTexture=new THREE.CanvasTexture(noteCanvas);noteTexture.colorSpace=THREE.SRGBColorSpace;
 const notePaper=new THREE.Mesh(new THREE.PlaneGeometry(.32,.32),new THREE.MeshStandardMaterial({map:noteTexture,roughness:1,side:THREE.DoubleSide}));
 notePaper.position.set(3.795,noteY,noteZ);notePaper.rotation.y=-Math.PI/2;scene.add(notePaper);
 D(B(.012,.025,.10,0xd8c990),3.78,1.535,noteZ);
 D(C(.09,.12,0xff2200,{emissive:0xff2200,emissiveIntensity:.8}),0,3.4,-3);beac=new THREE.PointLight(0xff2200,0,8);beac.position.set(0,3.1,-3);scene.add(beac);
 /* clues */
 CX("CHARADA|DO BARRAMENTO",.8,.6,"#f4e9a8","#222",22,[-2.8,1.7,-3.97],[0,0],"Ler charada técnica","O enigma da alimentação","Sou a fonte do barramento de comando. Os outros três circuitos dependem de mim: sem minha energia, todos medem <b>0V</b>. Descubra meu nome com o multímetro. Qual disjuntor precisa ser ligado antes dos ramais?");
 CX("INTERTRAVA|VENT. / LUZ",.9,.6,"#fff","#123",22,[2.8,1.7,-3.97],[0,0],"Ler pista de intertravamento","Dependência entre ventilação e iluminação","O relé da <b>ILUMINAÇÃO</b> só fecha quando o sensor confirma que a <b>VENTILAÇÃO</b> está funcionando. Qual desses dois circuitos precisa ser ligado primeiro para liberar o outro?");
 CX("CHARADA|DO TESTE FINAL",.9,.7,"#fff3b0","#222",22,[3.97,1.6,.2],[0,-q],"Ler charada de comissionamento","O último passo","Sou a carga de ensaio. Não sou a fonte nem um dos dois circuitos de serviço. Só posso ser ligado depois que <b>VENTILAÇÃO</b> e <b>ILUMINAÇÃO</b> forem testadas. Qual circuito sou? Que pista isso dá sobre a ordem?");
 CX("EXTINTOR|Puxe o pino|— Faustão",.46,.34,"#c0392b","#fff",20,[2.0,1.3,-3.97],[0,0],"Ler placa do extintor","Extintor de incêndio","Puxe o pino e aponte para a base do fogo. Uma carga; use apenas se houver curto no quadro. Sprinklers entram após 15 segundos.");
 CX("IDENTIFIQUE|OS RAMAIS",.5,.35,"#ddd","#222",18,[-1.9,1.2,-3.97],[0,0],"Ler etiqueta técnica","Identificação dos disjuntores","As etiquetas se soltaram. Use o multímetro em cada disjuntor para descobrir seu nome e anote-o ao lado de uma das quatro posições. Depois, volte às placas e cruze as informações.");
 waterOutletY=2.54;SPH=[[-2.7,-1.65],[2.7,-1.65],[-2.7,1.65],[2.7,1.65]];rvx=new Float32Array(260);rvz=new Float32Array(260);const rp=new Float32Array(260*6);for(let i=0;i<260;i++){const h=SPH[i%4],y=Math.random()*(waterOutletY-.25),a=Math.random()*6.28,s=.08+Math.random()*.38;rvx[i]=Math.cos(a)*s;rvz[i]=Math.sin(a)*s;const x=h[0]+rvx[i]*.35,z=h[1]+rvz[i]*.35;rp.set([x,y,z,x,y+.25,z],i*6)}
 rain=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x9fd8ff,transparent:true,opacity:.7}));rain.geometry.setAttribute("position",new THREE.BufferAttribute(rp,3));rain.visible=false;rain.frustumCulled=false;scene.add(rain);
 pud=new THREE.Mesh(new THREE.PlaneGeometry(7.4,7.4),new THREE.MeshBasicMaterial({color:0x3aa0ff,transparent:true,opacity:0}));pud.rotation.x=-Math.PI/2;pud.position.y=.02;scene.add(pud);
 SPH.forEach(([x,z])=>{D(C(.032,.55,waterPipeColor,{metalness:.4,roughness:.45}),x,2.91,z);D(C(.072,.09,0x1c6e9f,{metalness:.42,roughness:.42}),x,2.63,z);D(C(.09,.045,0x3a9cac,{metalness:.35}),x,2.59,z);D(C(.055,.025,0xe4b94f),x,2.54,z)});
 arcL=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:10},()=>new THREE.Vector3())),new THREE.LineBasicMaterial({color:0xcff8ff}));arcL.visible=false;arcL.frustumCulled=false;scene.add(arcL);arcP=new THREE.PointLight(0x88ccff,0,6);scene.add(arcP);
 D(B(.9,.7,.5,0x3d6a8a),-2.8,.35,-3.6);D(txt("GERADOR|AUXILIAR",.7,.25,"#222","#ffd800",26),-2.8,.4,-3.34);Object.entries(wireEnds).forEach(([k,x])=>{const socket=D(C(.045,.025,wireColors[k]),x,.65,-3.32);socket.rotation.x=Math.PI/2});
 D(B(.62,1.0,.05,0xc0392b),2.3,.53,-3.94);
 for(const z of [-3.75,-2.95])D(B(.72,.009,.035,0xffd800),2.3,.015,z);
 for(const x of [1.94,2.66])D(B(.035,.009,.8,0xffd800),x,.015,-3.35);
 const floorExt=txt("EXTINTOR",.46,.13,"#252a30","#ffd800",19);floorExt.rotation.x=-Math.PI/2;floorExt.position.set(2.3,.022,-3.35);scene.add(floorExt);
 CX("NÃO ABRA|MOLHADO!|(água + choque)",.5,.4,"#ffd800","#111",20,[1.8,1.9,-3.97],[0,0],"Ler aviso","Aviso do painel","Se os sprinklers dispararem, o quadro fica molhado por alguns segundos. Encostar nele nesse tempo dá <b>choque (+15 s)</b>. Espere secar.");
 CX("SPRINKLERS|disparam após|15 s de fogo",.55,.4,"#2a7fff","#fff",19,[-1.9,2.0,-3.97],[0,0],"Ler aviso","Sistema anti-incêndio","Fogo por mais de <b>15 segundos</b> aciona os sprinklers. A água <b>derruba TUDO</b> no quadro (os disjuntores desarmam) e molha o painel. O extintor tem <b>uma única carga</b>: use bem.");
 /* fire & sparks */
 fire=new THREE.Group();fire.position.set(.15,.42,-3.46);
 const flameSeeds=[[0,0,.72,.21,0,0xff5a16],[.14,.04,.56,.18,0,0xffc02e],[-.16,-.03,.62,.19,0,0xff8a19],[-.34,.03,.52,.17,.16,0xff5a16],[.34,-.02,.59,.19,.16,0xffc02e],[-.56,.05,.68,.2,.38,0xff6b16],[.56,.02,.55,.18,.38,0xffa51b],[-.72,-.04,.58,.17,.62,0xff5a16],[.72,.04,.7,.2,.62,0xffc02e]];
 flameSeeds.forEach(([x,z,h,r,startsAt,color])=>{const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));m.position.set(x,h/2,z);m.userData.startsAt=startsAt;m.visible=startsAt===0;fire.add(m)});
 fl=new THREE.PointLight(0xff6a00,.5,6);fl.position.y=.6;fire.add(fl);fire.visible=false;
 fire.userData={hint:()=>S.sel==="extintor"?"Clique — Apagar o fogo":"Fogo! (precisa de extintor)",click:t=>{if(t==="extintor"){if(S.empty)return msg("Extintor vazio! Alguém esqueceu de recarregar (suspeito: Carlos).");S.empty=1;S.fire=0;S.fireT=0;S.smk=0;fire.scale.setScalar(1);fire.visible=false;delI(fire);noise(1,.25,500);msg("Fogo apagado! Espuma por todo lado, mas apagou.");rad("Mauro: Errou feio, errou rude... mas apagou.")}else msg("Fogo não se apaga com as mãos. Onde está o extintor?")}};scene.add(fire);
 spk=new THREE.Mesh(new THREE.SphereGeometry(.04,6,6),new THREE.MeshBasicMaterial({color:0xfff27a}));spk.visible=false;scene.add(spk);
 Object.keys(BR).forEach(setLv);lights();
}
function setLv(k){const b=BR[k];b.lv.rotation.x=S.on[k]?-.5:.5;const col=S.on[k]?(S.err===k?0xff2222:0x22ff66):0x333333;b.led.material.color.setHex(col);b.led.material.emissive.setHex(S.on[k]?col:0)}
function lights(){const d=S.dark;lamps.forEach(l=>l.intensity=d?0:.9);lampM.forEach(m=>m.material.emissiveIntensity=d?0:1);amb.intensity=d?.04:.5;if(scene)scene.background.setHex(d?0:0x05070d)}
/* ---------- logic ---------- */
function press(k,t){
 const b=BR[k];
 if(t==="multi"){return msg(S.on[k]&&S.err!==k?"Ligado. Tensão estável.":S.err===k?"Tensão caótica! Desfaça com o alicate.":SEQ[S.prog]===k?"12V estáveis. PRONTO para ser ligado!":"0V. Falta ligar algo antes deste.")}
 if(t==="alicate"){if(S.err===k){if(S.fire)return msg("Apague o fogo primeiro!");S.err=null;S.on[k]=0;S.dark=0;lights();setLv(k);beep(300,.15,"square");return msg("Conexão desfeita. Respire fundo.")}return msg("Nada para consertar aqui.")}
 if(S.err)return msg("Desfaça a conexão errada com o alicate!");
 if(S.on[k])return msg("Já está ligado.");
 if(SEQ[S.prog]===k){S.on[k]=1;S.prog++;setLv(k);beep(500+S.prog*130,.18);if(S.prog===4)return win();return msg(["","Primeiro passo feito!","Ótimo, está funcionando!","Quase lá!"][S.prog])}
 S.on[k]=1;S.err=k;S.inc++;setLv(k);buzz();
 if(k==="A"){S.fire=1;S.safetyBroken=1;safetyBoardDraw();S.fireT=0;fire.scale.set(.28,.35,.28);fire.children.forEach(c=>{if(c.isMesh)c.visible=c.userData.startsAt===0});fl.intensity=.5;fl.distance=6;fire.visible=true;addI(fire);msg("CURTO-CIRCUITO! Onde está o extintor?")}
 else if(k==="I"){S.dark=1;lights();msg("Energia de emergência indisponível. Pegue a lanterna!")}
 else{S.t+=15;msg("AVISO NO PAINEL: ordem errada! +15 segundos.")}
}
let radT;function rad(t){const r=$("rad");r.textContent="📻 "+t;r.classList.add("on");clearTimeout(radT);radT=setTimeout(()=>r.classList.remove("on"),6500)}
const RAD=["Seu Zé: Essa pessoa nova aí só fica no celular, dificilmente vai conseguir aprender a mexer nisso aqui.","Mauro: É, pois é... essa geração TikTok e six seven tá perdida.","Seu Zé: No meu tempo a gente aprendia olhando, não em vídeo de 15 segundos.","Marta: Gente, deixa o menino. Ele deve estar tentando.","Carlos: Se der ruim, a culpa é do estagiário. Sempre foi.","Mauro: Calma, calma, calma... eu tenho a explicação! (não tenho)"];
function sprink(){S.fire=0;S.fireT=0;S.smk=0;fire.visible=false;fire.scale.setScalar(1);delI(fire);S.spr=9;S.wet=0;S.err=null;S.loose=null;S.on={};S.prog=0;Object.keys(BR).forEach(setLv);S.dark=0;lights();S.inc++;S.t+=10;buzz();noise(2,.2,1500);msg("SPRINKLERS ATIVADOS! A água desarmou tudo no quadro (+10 s).");rad("Seu Zé: ÁGUA?! Eletricidade e água, meu filho... Vai dar choque!")}
function emerg(dt){
 if(S.fire){S.fireT+=dt;const growth=Math.min(S.fireT/15,1);fire.scale.set(.28+growth*1.28,.35+growth*1.6,.28+growth*.55);fire.children.forEach(c=>{if(c.isMesh&&growth>=c.userData.startsAt)c.visible=true});if(S.fireT>8&&!S.smk){S.smk=1;rad("Marta: Fumaça! Apaguem isso antes que os sprinklers disparem!")}if(S.fireT>15)sprink()}
 if(S.spr>0){S.spr-=dt;if(Math.random()<dt*4)noise(.4,.07,2000);if(S.spr<=0){S.wet=10;msg("Sprinklers desligados. O quadro continua molhado...")}}else if(S.wet>0)S.wet-=dt;
 rain.visible=S.spr>0;const w=S.spr>0?1:Math.max(0,S.wet/10);pud.material.opacity=w*.45;floorM.material.color.setRGB(.165-.07*w,.176+.2*w,.2+.45*w);floorM.material.roughness=.7-.5*w;
 if(rain.visible){const p=rain.geometry.attributes.position;for(let i=0;i<p.count;i+=2){const j=i>>1;let y=p.getY(i)-7*dt,x=p.getX(i)+rvx[j]*dt,z=p.getZ(i)+rvz[j]*dt;if(y<0){const h=SPH[j%4],a=Math.random()*6.28,s=.6+Math.random()*1.4;x=h[0];z=h[1];y=waterOutletY-.25;rvx[j]=Math.cos(a)*s;rvz[j]=Math.sin(a)*s}p.setXYZ(i,x,y,z);p.setXYZ(i+1,x,y+.25,z)}p.needsUpdate=true}
 if(S.shk>0){S.shk-=dt;$("fx").style.opacity=Math.max(0,S.shk*1.4)}else $("fx").style.opacity=0}
function shock(){if(S.shk>0)return;if(S.epi){beep(660,.12,"sine",.05);msg("As luvas isolantes evitaram o choque. O quadro continua molhado: espere secar.");rad("Marta: EPI ajuda, mas não é passe livre para mexer no quadro!");return}S.t+=15;S.shk=.7;zapArc(0,1.5,-3.5,P.x,1.3,P.z-.8,220);setTimeout(()=>zapArc(-.4,1.9,-3.5,P.x+.2,1.1,P.z-.7,150),130);S.inc++;buzz();noise(.5,.3,300);msg("ZZZAP! Painel molhado! +15 segundos.");rad("Mauro: Eu avisei! (não avisei, mas devia)")}
function press2(k,t){const b=BR[k];if(S.spr>0||S.wet>0)return shock();
 if(t==="multi"){if(!b.known){b.known=1;const m=txt(b.n,.46,.16,"#111","#ffd800",24);b.lb.material.map=m.material.map;b.lb.material.needsUpdate=true;beep(880,.1)}
  return msg("Multímetro: este é o "+b.n+". "+(S.on[k]&&S.err!==k?"Ligado, tensão estável.":S.err===k?"Tensão caótica! Corte com o alicate.":S.loose===k?"Borne solto! Reaperte com a chave de fenda.":SEQ[S.prog]===k?"12V estáveis: PRONTO para ligar.":"0V: ainda falta ligar algo antes."))}
 if(t==="alicate"){if(S.err===k){if(S.fire)return msg("Apague o fogo primeiro!");S.err=null;S.on[k]=0;S.dark=0;S.loose=k;lights();setLv(k);beep(300,.15,"square");rad("Seu Zé: Que isso, meu filho, calma!");return msg("Ligação cortada. Agora reaperte o borne com a chave de fenda.")}return msg("Nada para cortar aqui. Pense antes de cortar.")}
 if(t==="chave"){if(S.loose===k){S.loose=null;noise(.25,.1,3000);return msg("Borne reapertado. Pode tentar de novo.")}return msg("Parafuso firme. Não mexa no que está funcionando.")}
 if(t)return msg("Disjuntor se liga com as mãos (tecla 0).");
 if(S.loose===k)return msg("Borne solto! Reaperte com a chave de fenda.");
 const e=S.err,pg=S.prog;press(k,null);if(S.prog>pg)zapArc(b.x,1.5,-3.5,b.x,2.45,-3.6,160);if(S.err&&S.err!==e)zapArc(b.x,1.5,-3.5,b.x+.5,2.2,-3.5,200),rad(k==="A"?"Seu Zé: TÁ PEGANDO FOGO, BICHO! (Faustão aprova)":k==="I"?"Mauro: Apagão geral! Alguém avisa a Enel.":"Mauro: Pode isso, Arnaldo?")}
function win(){S.done=1;S.look=1;S.dark=0;lights();beep(523,.3);setTimeout(()=>beep(659,.3),180);setTimeout(()=>beep(784,.3),360);setTimeout(()=>beep(1046,.6),540);msg("ENERGIA RESTAURADA!");
 const pl=new THREE.PointLight(0x22ff66,1.5,6);pl.position.set(0,2,-3);scene.add(pl);
 setTimeout(()=>{if(document.pointerLockElement)document.exitPointerLock();$("wt").innerHTML="“Você resolveu o problema. O RH ainda está tentando descobrir quem deixou o extintor vazio.”<br><br>Tempo: "+fmt(S.t)+" · Incidentes: "+S.inc;show("win")},2200)}
function show(id){document.querySelectorAll(".scr").forEach(e=>e.classList.add("hide"));if(id)$(id).classList.remove("hide")}
function getH(){return "<div class='sl own "+(S.sel?"":"sel")+"'><u>0</u>Mãos</div>"+TOOLS.map((t,i)=>"<div class='sl "+(S.tools[t[0]]?"own ":"")+(S.sel===t[0]?"sel":"")+"'><u>"+(i+1)+"</u>"+t[1]+"</div>").join("")+"<div class='sl "+(S.epi?"own":"")+"'> <u>"+(S.epi?"✓":"")+"</u>Luvas EPI</div>"}
function hud(){
 const o=S.spr>0?"Sprinklers ligados! Água + eletricidade = choque. Espere ("+Math.ceil(S.spr)+"s)":S.wet>0?"Painel molhado. Espere secar ("+Math.ceil(S.wet)+"s)":S.prog>=4?"Missão concluída":S.err?(S.fire?"Fogo! Sprinklers em "+Math.ceil(15-S.fireT)+"s. Apague e desfaça a conexão":S.dark?"Pegue a lanterna e desfaça a conexão errada":"Desfaça a conexão errada (alicate)"):"Use as pistas para deduzir a ordem ("+S.prog+"/4)";
 $("ob").textContent="Objetivo: "+o;$("tm").textContent=fmt(S.t);$("tools").innerHTML=getH();
}
/* ---------- flow ---------- */
function start(){show(null);build();running=true;paused=false;$("hud").classList.remove("hide");closeCard();A();music();syncInternAudio();lockReq();hud();msg("Examine o quadro e a sala. (E interage)")}
function toMenu(){running=false;paused=false;syncInternAudio();if(document.pointerLockElement)document.exitPointerLock();$("hud").classList.add("hide");show("menu");menuFx()}
function pause(v){if(!running||S.done)return;paused=v;syncInternAudio();if(v){if(document.pointerLockElement)document.exitPointerLock();show("pause")}else show(null)}
function resume(){pause(false);syncInternAudio();lockReq()}
function lockReq(){try{const p=ren.domElement.requestPointerLock();if(p&&p.catch)p.catch(()=>{lockOK=false})}catch(e){lockOK=false}}
document.addEventListener("pointerlockerror",()=>lockOK=false);
document.addEventListener("pointerlockchange",()=>{if(document.pointerLockElement)lockSeen=1;else if(lockSeen&&running&&!paused&&!S.done)pause(true)});
$("bplay").onclick=start;$("brules").onclick=()=>show("rules");$("bcred").onclick=()=>show("creds");document.querySelectorAll(".back").forEach(b=>b.onclick=()=>show("menu"));
$("pres").onclick=resume;$("prst").onclick=()=>{start()};$("pmen").onclick=toMenu;$("wag").onclick=start;$("wmen").onclick=toMenu;
/* ---------- input ---------- */
function look(dx,dy){yaw-=dx*.0022;pitch=Math.max(-1.3,Math.min(1.3,pitch-dy*.0022))}
const live=()=>running&&!paused&&!(S&&S.done);
addEventListener("mousemove",e=>{if(!live())return;if(document.pointerLockElement)look(e.movementX,e.movementY);else if(drag){drag.m+=Math.abs(e.movementX)+Math.abs(e.movementY);look(e.movementX,e.movementY)}});
addEventListener("mousedown",e=>{if(live()&&!e.target.closest(".scr"))drag={m:0}});
addEventListener("mouseup",()=>{if(!drag||!live()){drag=null;return}const m=drag.m;drag=null;
 if(document.pointerLockElement)use();else if(!lockOK){if(m<5)use()}else lockReq()});
addEventListener("keydown",e=>{keys[e.code]=1;
 if(e.code==="Escape"){if(running&&!(S&&S.done)){paused?resume():pause(true)}return}
 if(!live())return;
 if(e.code==="KeyE"){if(S.card)closeCard();else if(target&&target.userData.e)target.userData.e()}
 else if(e.code==="KeyQ"||e.code==="Digit0")S.sel=null;
 else if(/^Digit[1-5]$/.test(e.code)){const t=TOOLS[+e.code[5]-1][0];if(S.tools[t])S.sel=t;else msg("Você ainda não pegou isso.")}
});
addEventListener("keyup",e=>keys[e.code]=0);
function use(){if(S.card){closeCard();return}if(target&&target.userData.click)target.userData.click(S.sel)}
addEventListener("resize",()=>{if(ren){ren.setSize(innerWidth,innerHeight);if(cam){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}}fit()});
/* ---------- loop ---------- */
const okp=(x,z)=>Math.abs(x)<3.2&&z>-3.3&&z<3.6&&!(Math.abs(x)<1.8&&z>-3.1&&z<-1.5)&&!(Math.abs(x)<.43&&Math.abs(z+1.38)<.43);
function update(dt){
 if(!S.done)S.t+=dt;
 if(S.look){yaw+=(0-yaw)*dt*3;pitch+=(.12-pitch)*dt*3}
 else{let fx=0,fz=0;if(keys.KeyW)fz--;if(keys.KeyS)fz++;if(keys.KeyA)fx--;if(keys.KeyD)fx++;const l=Math.hypot(fx,fz)||1;fx/=l;fz/=l;const c=Math.cos(yaw),s=Math.sin(yaw),dx=(fx*c+fz*s)*3*dt,dz=(-fx*s+fz*c)*3*dt;if(okp(P.x+dx,P.z))P.x+=dx;if(okp(P.x,P.z+dz))P.z+=dz}
 cam.position.set(P.x,1.65,P.z);cam.rotation.set(pitch,yaw,S.shk>0?(Math.random()-.5)*.1:0,"YXZ");
 rc.setFromCamera({x:0,y:0},cam);rc.far=4;const hits=rc.intersectObjects(inter,true);target=null;
 if(hits.length){let o=hits[0].object;while(o&&!(o.userData&&o.userData.hint))o=o.parent;target=o||null;if(target&&target.userData.need&&S.sel!==target.userData.need)target=null}
 const h=target?(typeof target.userData.hint==="function"?target.userData.hint():target.userData.hint):"";$("hint").textContent=S.card?"":h;
 spot.intensity=S.sel==="lanterna"?2.6:0;
 const tt=clock.elapsedTime;
 if(fire.visible){const growth=Math.min(S.fireT/15,1);fire.children.forEach((c,i)=>{if(c.isMesh&&c.visible)c.scale.set(1,.78+.45*Math.sin(tt*11+i*1.7)+Math.random()*.25,1)});fl.intensity=.7+growth*3.4+Math.random()*(.3+growth*.7);fl.distance=6+growth*5}
 Object.keys(BR).forEach(k=>{if(S.err===k&&k!=="A"||S.err===k){const on=Math.sin(tt*14)>0;BR[k].led.material.emissive.setHex(on?0xff2222:0x220000)}});
 if(!S.dark&&!S.done)lamps.forEach(l=>l.intensity=Math.random()<.02?.3:.9);
 if(!S.done&&Math.random()<dt*1.6){spk.visible=true;spk.position.set(Math.random()*2-1,.7+Math.random()*1.8,-3.55);setTimeout(()=>spk.visible=false,90);if(!S.dark&&Math.random()<.12)noise(.12,.03,3500);zapArc(spk.position.x,spk.position.y,-3.55,spk.position.x+(Math.random()-.5)*.8,spk.position.y+(Math.random()-.5)*.6,-3.5,110)}
 emerg(dt);if(S.on.V)fanB.rotation.z+=dt*3;beac.intensity=S.err?1.2+Math.sin(tt*9)*1.2:0;S.rt+=dt;if(S.rt>32&&!S.err&&!S.card&&!S.done){S.rt=0;rad(RAD[S.ri++%RAD.length])}
 acc+=dt;if(acc>.2){acc=0;hud()}
}
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);if(running&&!paused&&S)update(dt);if(scene&&cam)ren.render(scene,cam)}
/* ---------- menu fx ---------- */
const bc=$("bg"),bx=bc.getContext("2d");function fit(){bc.width=innerWidth;bc.height=innerHeight}fit();
function bolt(){let x=Math.random()*bc.width,y=0;bx.strokeStyle="#9ff7ff";bx.shadowColor="#31e6ff";bx.shadowBlur=14;bx.lineWidth=1.5;bx.beginPath();bx.moveTo(x,y);const m=bc.height*(.3+Math.random()*.5);while(y<m){x+=Math.random()*60-30;y+=Math.random()*40+10;bx.lineTo(x,y)}bx.stroke()}
function menuFx(){if(running)return;bx.fillStyle="rgba(5,7,13,.2)";bx.fillRect(0,0,bc.width,bc.height);if(Math.random()<.035)bolt();requestAnimationFrame(menuFx)}
try{ren=new THREE.WebGLRenderer({antialias:true});ren.setPixelRatio(Math.min(devicePixelRatio,2));ren.setSize(innerWidth,innerHeight);ren.shadowMap.enabled=true;ren.domElement.id="g";document.body.prepend(ren.domElement)}catch(e){document.querySelector(".sub").textContent="Seu navegador não suporta WebGL."}
let mx=.5,pts=[],fl2=0;addEventListener("pointermove",e=>mx=e.clientX/innerWidth);
function arc(x1,y1,x2,y2,w){bx.beginPath();bx.moveTo(x1,y1);for(let i=1;i<14;i++){const t=i/14;bx.lineTo(x1+(x2-x1)*t+(Math.random()-.5)*w,y1+(y2-y1)*t+(Math.random()-.5)*w)}bx.lineTo(x2,y2);bx.stroke()}
function menuFx(){if(running)return;const W=bc.width,H=bc.height,t=performance.now()/1000,hz=H*.58,vx=W*(.5+(mx-.5)*.08);
 if(Math.random()<.008)fl2=1;fl2*=.9;
 const g=bx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#05070d");g.addColorStop(.58,"#0c1a33");g.addColorStop(1,"#05070d");bx.shadowBlur=0;bx.fillStyle=g;bx.fillRect(0,0,W,H);
 if(fl2>.05){bx.fillStyle="rgba(150,230,255,"+fl2*.35+")";bx.fillRect(0,0,W,H)}
 bx.lineWidth=1;bx.strokeStyle="rgba(49,230,255,.45)";
 for(let i=-20;i<=20;i++){bx.beginPath();bx.moveTo(vx,hz);bx.lineTo(vx+i*W*.22,H);bx.stroke()}
 for(let i=0;i<14;i++){const p=((i+t*.6)%14)/14,y=hz+(H-hz)*p*p;bx.globalAlpha=.15+p*.5;bx.beginPath();bx.moveTo(0,y);bx.lineTo(W,y);bx.stroke()}bx.globalAlpha=1;
 bx.strokeStyle="#6b7f99";bx.lineWidth=2;const px=[W*.14,W*.86],ty=hz-H*.26;
 px.forEach(x=>{bx.beginPath();bx.moveTo(x-30,hz);bx.lineTo(x,ty);bx.lineTo(x+30,hz);bx.moveTo(x-18,hz-H*.09);bx.lineTo(x+18,hz-H*.09);bx.stroke()});
 bx.shadowColor="#31e6ff";bx.shadowBlur=18;bx.strokeStyle="#bff8ff";bx.lineWidth=1.6;
 arc(px[0],ty,px[1],ty,40+fl2*40);if(Math.random()<.6)arc(px[0],ty,px[1],ty,70);
 if(Math.random()<.05){bx.strokeStyle="#fff";bx.lineWidth=2.5;arc(Math.random()*W,0,Math.random()*W,hz,60)}
 if(Math.random()<.5)pts.push({x:Math.random()*W,y:hz+Math.random()*H*.4,vx:Math.random()*2-1,vy:-1-Math.random()*3,l:1});
 bx.shadowColor="#ffd800";pts=pts.filter(p=>p.l>0);pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.03;p.l-=.012;bx.fillStyle="rgba(255,216,0,"+p.l+")";bx.fillRect(p.x,p.y,2,2)});
 bx.shadowBlur=0;requestAnimationFrame(menuFx)}
let tr=[],t0=0,pw=1,pwT=4,pwAge=0;
function mkTr(){tr=[];const W=bc.width,H=bc.height;for(let i=0;i<46;i++){let x=Math.round(Math.random()*W/40)*40,y=Math.round(Math.random()*H/40)*40,pt=[[x,y]],hz=Math.random()<.5;for(let k=0;k<6;k++){const d=(Math.random()<.5?-1:1)*40*(1+Math.floor(Math.random()*4));if(hz)x+=d;else y+=d;hz=!hz;pt.push([x,y])}let L=0;const sg=[];for(let k=1;k<pt.length;k++){const l=Math.hypot(pt[k][0]-pt[k-1][0],pt[k][1]-pt[k-1][1])||1;sg.push(l);L+=l}tr.push({pts:pt,sg,L,o:Math.random()*L,v:40+Math.random()*80})}}
addEventListener("resize",mkTr);
function onTr(r,d){d=((d%r.L)+r.L)%r.L;for(let k=0;k<r.sg.length;k++){if(d<=r.sg[k]){const a=r.pts[k],b=r.pts[k+1],f=d/r.sg[k];return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]}d-=r.sg[k]}return r.pts[0]}
function menuFx(){if(running)return;const W=bc.width,H=bc.height,t=performance.now()/1000;if(!tr.length)mkTr();
 const dt=Math.min(.05,t-t0||.016);t0=t;
 pwT-=dt;if(pwT<=0){pw=pw?0:1;pwT=pw?5+Math.random()*3:2.2+Math.random()*1.5;if(pw)fl2=1}
 pwAge=pw?pwAge+dt:0;fl2*=.9;
 const lv=pw?(Math.random()<.04?.35:1):0;
 bx.shadowBlur=0;bx.fillStyle="#04060b";bx.fillRect(0,0,W,H);
 const gr=bx.createRadialGradient(W/2,H*.2,10,W/2,H*.5,H*.9);gr.addColorStop(0,"rgba(255,200,90,"+.28*lv+")");gr.addColorStop(1,"rgba(5,10,25,0)");bx.fillStyle=gr;bx.fillRect(0,0,W,H);
 bx.lineWidth=1.5;bx.strokeStyle="rgba(49,230,255,"+(.1+.12*lv)+")";tr.forEach(r=>{bx.beginPath();r.pts.forEach((p,i)=>i?bx.lineTo(p[0],p[1]):bx.moveTo(p[0],p[1]));bx.stroke()});
 bx.shadowColor="#31e6ff";bx.shadowBlur=12;tr.forEach(r=>{r.o+=r.v*dt*(pw?1:.25);const p=onTr(r,r.o);bx.fillStyle=pw?"#bff8ff":"#2a6a80";bx.beginPath();bx.arc(p[0],p[1],2.5,0,7);bx.fill()});
 const ang=Math.sin(t*1.3)*.16,L=H*.16,lx=W/2+Math.sin(ang)*L,ly=Math.cos(ang)*L;
 bx.shadowBlur=0;bx.strokeStyle="#778";bx.lineWidth=2;bx.beginPath();bx.moveTo(W/2,0);bx.lineTo(lx,ly);bx.stroke();
 bx.save();bx.translate(lx,ly);bx.rotate(ang);
 if(lv>0){const cg=bx.createLinearGradient(0,0,0,H*.8);cg.addColorStop(0,"rgba(255,225,150,"+.35*lv+")");cg.addColorStop(1,"rgba(255,225,150,0)");bx.fillStyle=cg;bx.beginPath();bx.moveTo(-24,14);bx.lineTo(24,14);bx.lineTo(W*.32,H*.8);bx.lineTo(-W*.32,H*.8);bx.fill()}
 bx.fillStyle="#2b3038";bx.beginPath();bx.moveTo(-26,16);bx.lineTo(26,16);bx.lineTo(12,-6);bx.lineTo(-12,-6);bx.fill();
 bx.fillStyle=lv?"rgba(255,235,170,"+lv+")":"#222";bx.shadowColor="#ffd070";bx.shadowBlur=lv?30:0;bx.beginPath();bx.arc(0,17,9,0,7);bx.fill();bx.restore();
 bx.shadowBlur=0;const cx=[.08,.2,.8,.92,.3].map(v=>v*W),tips=[];
 cx.forEach((x,i)=>{const len=H*(.22+i%3*.08),sw=Math.sin(t*1.1+i*1.7)*18,tx=x+sw;tips.push([tx,len]);bx.strokeStyle=["#e53935","#2a7fff","#ffd800","#2ecc71","#ddd"][i];bx.lineWidth=4;bx.beginPath();bx.moveTo(x,0);bx.quadraticCurveTo(x+sw*.2,len*.6,tx,len);bx.stroke();if(Math.random()<.12)for(let k=0;k<4;k++)pts.push({x:tx,y:len,vx:Math.random()*4-2,vy:-Math.random()*3,l:1})});
 if(Math.random()<.1){const a=tips[0|Math.random()*4],b=tips[1+(0|Math.random()*4)];bx.shadowColor="#31e6ff";bx.shadowBlur=18;bx.strokeStyle="#fff";bx.lineWidth=1.8;arc(a[0],a[1],b[0],b[1],30)}
 for(let i=0;i<4;i++){const x=W/2+(i-1.5)*54,y=H-70,on=pw&&pwAge>.4+i*.5;bx.shadowBlur=0;bx.fillStyle="#12161d";bx.fillRect(x-20,y-30,40,60);bx.strokeStyle="#445";bx.lineWidth=2;bx.strokeRect(x-20,y-30,40,60);bx.fillStyle=on?"#ffd800":"#aab";bx.fillRect(x-6,on?y-24:y-2,12,26);bx.shadowColor=on?"#22ff66":"#ff2222";bx.shadowBlur=10;bx.fillStyle=on?"#22ff66":"#ff2222";bx.beginPath();bx.arc(x,y-38,4,0,7);bx.fill()}
 bx.shadowColor="#ffd800";bx.shadowBlur=8;pts=pts.filter(p=>p.l>0);pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.l-=.02;bx.fillStyle="rgba(255,216,0,"+p.l+")";bx.fillRect(p.x,p.y,2,2)});
 bx.shadowBlur=0;if(fl2>.05){bx.fillStyle="rgba(150,230,255,"+fl2*.4+")";bx.fillRect(0,0,W,H)}
 document.querySelector("#menu h1").style.filter="brightness("+(.35+.65*lv)+")";
 requestAnimationFrame(menuFx)}
function rad(){}
function zapArc(ax,ay,az,bx,by,bz,ms){if(!arcL)return;const p=arcL.geometry.attributes.position;for(let i=0;i<10;i++){const f=i/9,j=(i&&i<9)?.25:0;p.setXYZ(i,ax+(bx-ax)*f+(Math.random()-.5)*j,ay+(by-ay)*f+(Math.random()-.5)*j,az+(bz-az)*f+(Math.random()-.5)*j)}p.needsUpdate=true;arcL.visible=true;arcP.position.set((ax+bx)/2,(ay+by)/2,(az+bz)/2+.4);arcP.intensity=3;setTimeout(()=>{arcL.visible=false;arcP.intensity=0},ms||90)}
loadDefaultMusic();menuFx();loop();
