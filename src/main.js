import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, Color3, Color4, StandardMaterial, MeshBuilder, ShadowGenerator, TransformNode, PointerEventTypes, ImportMeshAsync, Quaternion, CubeTexture, Layer, DynamicTexture } from '@babylonjs/core';
import {createHuman,characters} from './human-mpfb.js';
const $ = id => document.getElementById(id);
const canvas = $('renderCanvas'), engine = new Engine(canvas, true), scene = new Scene(engine);
scene.clearColor = new Color4(.035,.05,.08,1);
const backdrop=new Layer('backdrop','/backgrounds/colosseum.png',scene,true); // Roman arena backdrop, fixed behind the 3D scene
$('background').onchange=e=>{backdrop.texture.updateURL('/backgrounds/'+e.target.value+'.png');floorFor(e.target.value);};
scene.environmentTexture=CubeTexture.CreateFromPrefilteredData("/models/studio.env",scene);scene.environmentIntensity=.65;scene.imageProcessingConfiguration.exposure=1.15;scene.imageProcessingConfiguration.contrast=1.15;
const camera = new ArcRotateCamera('camera', -2.3, 1.25, 4.8, new Vector3(0,1,0), scene);
camera.attachControl(canvas,true); camera.keysUp=[]; camera.keysDown=[]; camera.keysLeft=[]; camera.keysRight=[];
camera.lowerRadiusLimit=3; camera.upperRadiusLimit=16; camera.upperBetaLimit=1.5; camera.wheelDeltaPercentage=.015; camera.panningSensibility=0;
new HemisphericLight('fill',new Vector3(0,1,0),scene).intensity=.9;
const sun=new DirectionalLight('sun',new Vector3(-.5,-1,.4),scene); sun.position.set(5,10,-5); sun.intensity=1.8;
const shadows=new ShadowGenerator(1024,sun); shadows.useBlurExponentialShadowMap=true; shadows.blurKernel=20;
function mat(name,hex){const m=new StandardMaterial(name,scene); m.diffuseColor=Color3.FromHexString(hex); m.specularColor=new Color3(.1,.1,.1);return m;}
const floor=MeshBuilder.CreateGround('arena',{width:16,height:16},scene);floor.material=mat('floor','#ffffff');const sandTex=(()=>{const t=new DynamicTexture('sand',512,scene,true),c=t.getContext();c.fillStyle='#c9a46c';c.fillRect(0,0,512,512);for(let i=0;i<14000;i++){const v=150+Math.random()*70|0;c.fillStyle=`rgba(${v+40},${v+10},${v-40},${.25+Math.random()*.4})`;c.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*2,1+Math.random()*2);}for(let i=0;i<40;i++){c.fillStyle='rgba(120,85,45,.08)';c.beginPath();c.ellipse(Math.random()*512,Math.random()*512,20+Math.random()*50,8+Math.random()*20,Math.random()*3,0,7);c.fill();}t.update();t.wrapU=t.wrapV=1;t.uScale=t.vScale=4;return t;})(); /* raked arena sand */
const marbleTex=(()=>{const t=new DynamicTexture('marble',1024,scene,true),c=t.getContext(),n=4,w=1024/n; /* Pantheon-style floor: squares with inset discs in coloured marble */
 for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=i*w,y=j*w,odd=(i+j)%2;c.fillStyle=odd?'#7a3328':'#b3a993';c.fillRect(x,y,w,w);
  c.fillStyle=odd?'#b3a993':'#4c5747';if(odd){c.fillRect(x+w*.18,y+w*.18,w*.64,w*.64);}else{c.beginPath();c.arc(x+w/2,y+w/2,w*.34,0,7);c.fill();}
  c.strokeStyle='#d6cdb8';c.lineWidth=8;c.strokeRect(x+3,y+3,w-6,w-6);}
 for(let i=0;i<70;i++){c.strokeStyle=`rgba(255,255,255,${.06+Math.random()*.1})`;c.lineWidth=1+Math.random()*2;c.beginPath();let x=Math.random()*1024,y=Math.random()*1024;c.moveTo(x,y);for(let k=0;k<6;k++){x+=(Math.random()-.5)*90;y+=(Math.random()-.5)*90;c.lineTo(x,y);}c.stroke();} /* veins */
 t.update();t.wrapU=t.wrapV=1;t.uScale=t.vScale=4;return t;})();
const stoneTex=(()=>{const t=new DynamicTexture('paving',1024,scene,true),c=t.getContext(); /* Forum paving: big worn flagstones in running rows */
 c.fillStyle='#5b544a';c.fillRect(0,0,1024,1024);const rows=6,h=1024/rows;
 for(let r=0;r<rows;r++){let x=-Math.random()*150;while(x<1024){const w=110+Math.random()*130,v=Math.random()*30|0;
  for(const dx of [0,1024])if(x+dx<1024){c.fillStyle=`rgb(${168+v},${158+v},${140+v})`;c.beginPath();c.roundRect(x+dx+4,r*h+4,w-8,h-8,10);c.fill();
   for(let k=0;k<120;k++){const g=Math.random()*40-20;c.fillStyle=`rgba(${120+g},${112+g},${98+g},.25)`;c.fillRect(x+dx+8+Math.random()*(w-16),r*h+8+Math.random()*(h-16),2+Math.random()*4,2+Math.random()*4);}}
  x+=w;}}
 for(let i=0;i<25;i++){c.strokeStyle='rgba(60,55,48,.5)';c.lineWidth=1.5;c.beginPath();let x=Math.random()*1024,y=Math.random()*1024;c.moveTo(x,y);for(let k=0;k<4;k++){x+=(Math.random()-.5)*50;y+=(Math.random()-.5)*50;c.lineTo(x,y);}c.stroke();} /* cracks */
 t.update();t.wrapU=t.wrapV=1;t.uScale=t.vScale=3;return t;})();
function floorFor(bg){const m=floor.material;const marble=bg==='pantheon';m.diffuseTexture=marble?marbleTex:bg==='forum'?stoneTex:sandTex;m.specularColor=marble?new Color3(.3,.3,.3):new Color3(.1,.1,.1);m.specularPower=marble?64:16;for(const b of scene.meshes)if(b.name==='boundary')b.material.diffuseColor=Color3.FromHexString(marble?'#efe9dc':bg==='forum'?'#8f877a':'#b8ab92');}
floorFor('colosseum');floor.receiveShadows=true;
const lines=[];for(let i=-8;i<=8;i++){lines.push([new Vector3(i,.006,-8),new Vector3(i,.006,8)],[new Vector3(-8,.006,i),new Vector3(8,.006,i)]);}
const grid=MeshBuilder.CreateLineSystem('grid',{lines},scene);grid.isVisible=false;grid.isPickable=false;
for(const z of [-8,8]){const b=MeshBuilder.CreateBox('boundary',{width:16,height:.12,depth:.12},scene);b.position.set(0,.06,z);b.material=mat('edge','#b8ab92');}
for(const x of [-8,8]){const b=MeshBuilder.CreateBox('boundary',{width:.12,height:.12,depth:16},scene);b.position.set(x,.06,0);b.material=mat('edge','#b8ab92');}
let audio, muted=false;
function sound(hit=false,heavy=false){
 if(muted)return;
 try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const t=audio.currentTime;
 const osc=audio.createOscillator(),gain=audio.createGain();osc.type=hit?'triangle':'sine';osc.frequency.setValueAtTime(hit?(heavy?100:180):420,t);osc.frequency.exponentialRampToValueAtTime(35,t+.16);gain.gain.setValueAtTime(hit?.22:.06,t);gain.gain.exponentialRampToValueAtTime(.001,t+.2);osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.21);
 const buffer=audio.createBuffer(1,audio.sampleRate*.12,audio.sampleRate);const d=buffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
 const noise=audio.createBufferSource(),ng=audio.createGain();noise.buffer=buffer;ng.gain.value=hit?.16:.035;noise.connect(ng).connect(audio.destination);noise.start();
 }catch(e){console.warn('Audio',e);}
}

const moves={punch:{duration:.5,reach:.57,damage:9,label:'주먹',height:1.3},kick:{duration:.8,reach:.85,damage:14,label:'앞차기',height:1.04},spin:{duration:1.05,reach:.85,damage:19,label:'돌려차기',height:1.04},side:{duration:.85,reach:.85,damage:17,label:'옆차기',height:1.0},back:{duration:1.25,reach:.85,damage:24,label:'뒤후려차기',height:1.2}};
let player,enemy,destination=null,over=false,paused=false,aiTimer=1.8,clock=0,aiEnabled=true,motionSpeed=1;
async function fighter(name,color,x,z,key){const pivot=new TransformNode(name,scene);pivot.position.set(x,0,z);const ring=MeshBuilder.CreateTorus(name+'-ring',{diameter:.85,thickness:.04,tessellation:40},scene);ring.parent=pivot;ring.position.y=.025;ring.material=mat(name+'-color',color);ring.isPickable=false;return {pivot,visual:await createHuman(scene,pivot,key,shadows),key,hp:100,attack:null,cooldown:0,flash:0,ring,moving:false};}
async function change(f,key){paused=true;keys.clear();$("status").textContent="인체 모델을 불러오는 중…";document.querySelectorAll("select").forEach(s=>s.disabled=true);try{const replacement=await createHuman(scene,f.pivot,key,shadows);f.visual.dispose();f.visual=replacement;f.key=key;reset();}catch(e){$("status").textContent="모델 로딩 실패 · 다시 선택해 주세요";console.error(e);}finally{document.querySelectorAll("select").forEach(s=>s.disabled=false);}}
function face(f,other){const d=other.pivot.position.subtract(f.pivot.position);f.pivot.rotation.y=Math.atan2(d.x,d.z);}
function attack(f,type){if(over||paused||!f||f.attack||f.cooldown>0)return;const other=f===player?enemy:player;face(f,other);f.attack={type,time:0,hit:false,heading:f.pivot.rotation.y};f.cooldown=moves[type].duration+.16;sound();if(f===player)destination=null;}
function clamp(f){f.pivot.position.x=Math.max(-7.2,Math.min(7.2,f.pivot.position.x));f.pivot.position.z=Math.max(-7.2,Math.min(7.2,f.pivot.position.z));}
const effects=[];
function burst(pos){const mesh=MeshBuilder.CreateSphere('hit',{diameter:.16,segments:8},scene);mesh.position.copyFrom(pos);const m=mat('spark','#ffd271');m.emissiveColor=Color3.FromHexString('#ffad42');mesh.material=m;mesh.isPickable=false;effects.push({mesh,time:.18});}
function stepAttack(f,other,dt){
 const a=f.attack;if(!a){f.visual.pose(clock,f.moving,null,f.flash/.35);return;}
 const m=moves[a.type];a.time+=dt;const t=Math.min(a.time/m.duration,1);
 // Approach only a short distance, then extend the actual arm/leg toward the torso.
 let delta=other.pivot.position.subtract(f.pivot.position);let distance=delta.length();
 // stop where this body's own fist / foot lands on the opponent's near surface (.19 in front of its centre)
 const stand=Math.min(a.type==='punch'?.68:1.02,f.visual.reach[a.type]+.19);
 if(t<.42&&distance>stand&&distance<2.6){f.pivot.position.addInPlace(delta.normalize().scale(Math.min(2.8*dt,distance-stand)));clamp(f);}
 face(f,other);const heading=f.pivot.rotation.y;
 // Roundhouse uses a chambered leg arc; do not spin the whole body through its target.
 f.pivot.computeWorldMatrix(true);
 const targetWorld=other.pivot.position.add(new Vector3(0,m.height,0));
 // Aim at the near surface of the opponent, not at its centre.
 delta=targetWorld.subtract(f.pivot.position);const horizontal=new Vector3(delta.x,0,delta.z).normalize();targetWorld.subtractInPlace(horizontal.scale(.19));
 const target=Vector3.TransformCoordinates(targetWorld,f.pivot.getWorldMatrix().clone().invert());
 const rest=a.type==='punch'?new Vector3(.27,1.32,.3):new Vector3(.17,.13,0);
 const extension=t<.46?Math.sin(Math.min(1,t/.46)*Math.PI/2):Math.max(0,1-(t-.60)/.4);
 const local=Vector3.Lerp(rest,target,extension);
 const endpoint=f.visual.pose(clock,false,{type:a.type,target:a.type==='punch'?local:target,progress:t});
 if(endpoint&&t>=.43&&t<=.64&&!a.hit){
  const centre=other.pivot.position;const dx=endpoint.x-centre.x,dz=endpoint.z-centre.z;
  // Actual fist/foot must intersect the opponent's body capsule.
  if(Math.hypot(dx,dz)<=.34&&endpoint.y>=.68&&endpoint.y<=1.57){a.hit=true;other.hp=Math.max(0,other.hp-m.damage);other.flash=.35;burst(endpoint);sound(true,a.type!=='punch');$('status').textContent=(f===player?'플레이어':'컴퓨터')+' '+m.label+' 적중!';if(other.hp===0){over=true;f.attack=null;other.attack=null;f.visual.pose(clock,false,null);other.visual.pose(clock,false,null);$('status').textContent=f===player?'승리! 다시 대련으로 재시작하세요.':'컴퓨터 승리 · 다시 도전하세요.';}}
 }
 if(t>=1){f.pivot.rotation.y=heading;f.attack=null;}
}
const keys=new Set(),relevant=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','j','k','l','u','i'];
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLSelectElement)return;const key=e.key.toLowerCase();if(relevant.includes(key)){e.preventDefault();keys.add(key);}if(!e.repeat){if(key==='j')attack(player,'punch');if(key==='k')attack(player,'kick');if(key==='l')attack(player,'spin');if(key==='u')attack(player,'side');if(key==='i')attack(player,'back');}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();paused=true;$('pause').textContent='대련 계속';});
for(const button of document.querySelectorAll('[data-key]')){const key=button.dataset.key;button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(key);};button.onpointerup=button.onpointercancel=()=>keys.delete(key);}
for(const button of document.querySelectorAll('[data-attack]'))button.onclick=()=>attack(player,button.dataset.attack);
scene.onPointerObservable.add(info=>{if(info.type===PointerEventTypes.POINTERTAP&&info.event.button===0&&player&&!over&&!paused){const hit=scene.pick(scene.pointerX,scene.pointerY,m=>m===floor);if(hit?.hit){destination=hit.pickedPoint.clone();destination.y=0;}}});
$('mute').onclick=()=>{muted=!muted;$('mute').textContent=muted?'소리 켜기':'소리 끄기';};
$('pause').onclick=()=>{paused=!paused;keys.clear();$('pause').textContent=paused?'대련 계속':'일시정지';};
function reset(){if(!player||!enemy)return;for(const [f,z]of [[player,-.65],[enemy,.65]]){f.attack=null;f.cooldown=0;f.hp=100;f.pivot.position.set(0,0,z);f.visual.root.rotation.z=0;}face(player,enemy);face(enemy,player);player.visual.pose(0,false,{type:"punch",target:new Vector3(.24,1.29,.31),progress:0});enemy.visual.pose(0,false,{type:"punch",target:new Vector3(.24,1.29,.31),progress:0});destination=null;over=false;paused=false;aiTimer=2;keys.clear();$('pause').textContent='일시정지';$('status').textContent='공격하면 짧게 전진합니다 · 손과 발이 몸에 닿을 때 적중';}
$('reset').onclick=reset;
$('ai').onclick=()=>{aiEnabled=!aiEnabled;$('ai').textContent=aiEnabled?'컴퓨터 공격 켬':'컴퓨터 공격 끔';};
for(const button of document.querySelectorAll('[data-phase]'))button.onclick=()=>{
 reset();paused=true;keys.clear();enemy.pivot.position.z=.37;
 const type=$('reviewMove').value,progress=Number(button.dataset.phase);
 player.visual.pose(clock,false,{type,target:new Vector3(0,1.04,.83),progress});
 $('pause').textContent='대련 계속';$('status').textContent='동작 확인 · '+moves[type].label+' / '+button.textContent;
};
$('slow').onclick=()=>{motionSpeed=motionSpeed===1?.35:1;$('slow').textContent=motionSpeed===1?'느리게 보기':'정상 속도';};
for(const id of ['playerCharacter','enemyCharacter']){const select=$(id);for(const [key,value]of Object.entries(characters)){const option=document.createElement('option');option.value=key;option.textContent=value.name;select.append(option);}}
$('playerCharacter').value='me';$('enemyCharacter').value='zeus';
player=await fighter('player','#53edda',0,-.65,'me');enemy=await fighter('computer','#ff685c',0,.65,'zeus');reset();paused=true;document.getElementById("pause").textContent='대련 시작';
$('playerCharacter').onchange=e=>change(player,e.target.value);$('enemyCharacter').onchange=e=>change(enemy,e.target.value);
engine.runRenderLoop(()=>{
 const dt=Math.min(engine.getDeltaTime()/1000,.04)*motionSpeed;
 if(!paused){clock+=dt;for(const f of [player,enemy]){f.cooldown=Math.max(0,f.cooldown-dt);f.flash=Math.max(0,f.flash-dt);f.ring.scaling.setAll(f.flash>0?1.35:1);f.moving=false;}
 if(!over){
  let direction=Vector3.Zero();const forward=camera.target.subtract(camera.position);forward.y=0;forward.normalize();const right=new Vector3(forward.z,0,-forward.x);
  const v=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),h=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
  if(v||h){destination=null;direction=forward.scale(v).add(right.scale(h)).normalize();}else if(destination){const d=destination.subtract(player.pivot.position);if(d.length()<.08)destination=null;else direction=d.normalize();}
  if(!player.attack){if(direction.lengthSquared()>0){player.pivot.rotation.y=Math.atan2(direction.x,direction.z);player.pivot.position.addInPlace(direction.scale(2.3*dt));player.moving=true;}else face(player,enemy);}
  const toward=player.pivot.position.subtract(enemy.pivot.position),distance=toward.length();
  if(!enemy.attack){face(enemy,player);if(distance>.94){enemy.pivot.position.addInPlace(toward.normalize().scale(1.25*dt));enemy.moving=true;}}
  aiTimer-=dt;if(aiEnabled&&aiTimer<=0&&distance<1.7&&!enemy.attack){attack(enemy,['punch','kick','spin','side','back'][Math.floor(Math.random()*5)]);aiTimer=1.4+Math.random()*.8;}
  const separation=enemy.pivot.position.subtract(player.pivot.position),dist=separation.length();if(dist<.62){separation.normalize().scaleInPlace((.62-dist)*.5);enemy.pivot.position.addInPlace(separation);player.pivot.position.subtractInPlace(separation);}
  clamp(player);clamp(enemy);stepAttack(player,enemy,dt);stepAttack(enemy,player,dt);
 }else{for(const f of [player,enemy])if(f.hp===0)f.visual.root.rotation.z=Math.min(1.2,f.visual.root.rotation.z+dt*2);}
 }
 $('playerHP').value=player.hp;$('enemyHP').value=enemy.hp;$('playerValue').textContent=player.hp;$('enemyValue').textContent=enemy.hp;
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.time-=dt;e.mesh.scaling.scaleInPlace(1+dt*5);if(e.time<=0){e.mesh.material.dispose();e.mesh.dispose();effects.splice(i,1);}}
 camera.target.copyFrom(player.pivot.position.add(new Vector3(0,1,0)));scene.render();
});
window.addEventListener('resize',()=>engine.resize());








