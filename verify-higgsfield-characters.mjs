import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import * as B from '@babylonjs/core';
import {createHuman,characters} from './src/human-mpfb.js';
const expectedHashes={peterPan:'0b32b94bcf6d9d8fb9ffcb381e6c86a9f663d8d4698b07366e2138bbe07453f7',boy:'5a7abb6e0626a4e74968829e2466fe2c663f3e2d16e1938fd345a8fe71294b41'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const engine=new B.NullEngine(),scene=new B.Scene(engine),shadows={addShadowCaster(){}};
const summaries=[];
for(const key of ['peterPan','boy']){
 const bytes=fs.readFileSync('public/models/'+characters[key].file+'.glb');
 assert.equal(sha(bytes),expectedHashes[key],'Model matches the verified original asset checksum');
 const pivot=new B.TransformNode(key,scene),h=await createHuman(scene,pivot,key,shadows,{source:new Uint8Array(bytes)});
 for(const name of ['Head','Spine','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot'])assert(h.nodes[name],name);
 assert.equal(h.height,characters[key].height);
 let poses=0,minFoot=Infinity,maxKnee=0;
 for(const heading of [0,Math.PI/2,Math.PI])for(const type of ['punch','kick','spin','side','back']){
  pivot.rotation.y=heading;
  for(let i=0;i<=30;i++){
   const end=h.pose(i/30,false,{type,progress:i/30,target:new B.Vector3(.24*h.bodyScale,1.3*h.bodyScale,.8)});
   assert(end.asArray().every(Number.isFinite));
   for(const d of Object.values(h.debug)){
    assert([...d.hip,...d.knee,...d.foot].every(Number.isFinite));
    const hip=B.Vector3.FromArray(d.hip),knee=B.Vector3.FromArray(d.knee),foot=B.Vector3.FromArray(d.foot);
    assert(Math.abs(B.Vector3.Distance(hip,knee)-d.lengths[0])<.00001,'Thigh stays rigid');
    assert(Math.abs(B.Vector3.Distance(knee,foot)-d.lengths[1])<.00001,'Shin stays rigid');
    minFoot=Math.min(minFoot,foot.y);maxKnee=Math.max(maxKnee,d.angles?.[1]??0);
   }
   for(const mesh of scene.meshes.filter(m=>m.skeleton&&m.isDescendantOf(h.root))){mesh.skeleton.prepare(true);assert(Array.from(mesh.skeleton.getTransformMatrices(mesh)).every(Number.isFinite));}
   poses++;
  }
 }
 summaries.push({key,bytes:bytes.length,height:h.height,poses,minFoot,maxKnee,sha256:sha(bytes)});
 h.dispose();pivot.dispose();
}
assert.equal(scene.meshes.length,0);assert.equal(scene.skeletons.length,0);scene.dispose();engine.dispose();
// Execute the actual controller, not a rewrite, with actual imported bodies in NullEngine.
class Element{constructor(id=''){this.id=id;this.dataset={};this.disabled=false;this.value='';this.textContent='';this.attributes={};this.children=[];}setAttribute(k,v){this.attributes[k]=v;}append(e){this.children.push(e);}setPointerCapture(){}}
class Select extends Element{}
const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new(['playerCharacter','enemyCharacter','reviewMove','background'].includes(id)?Select:Element)(id));return els.get(id);};
const keyButtons=['w','a','s','d'].map(key=>Object.assign(new Element(),{dataset:{key}}));
const attacks=['punch','kick','spin','side','back'].map(attack=>Object.assign(new Element(),{dataset:{attack}}));
const phases=['.25','.52','.85'].map(phase=>Object.assign(new Element(),{dataset:{phase},textContent:'pose'}));get('reviewMove').value='back';
const document={body:{dataset:{}},getElementById:get,createElement:()=>new Element(),querySelectorAll(s){return s==='[data-key]'?keyButtons:s==='[data-attack]'?attacks:s==='[data-key], [data-attack]'?[...keyButtons,...attacks]:s==='[data-phase]'?phases:s==='select'?['playerCharacter','enemyCharacter','reviewMove','background'].map(get):[];}};
const listeners=new Map(),window={addEventListener:(name,fn)=>listeners.set(name,fn)};
const gameEngine=new B.NullEngine(),gameScene=new B.Scene(gameEngine);let frame,holdNext=false,releaseLoad,rejectLoad;
gameEngine.runRenderLoop=fn=>{frame=fn;};gameEngine.getDeltaTime=()=>1000/60;gameScene.render=()=>{};
const modelBytes=new Map();
const loadHuman=async (_scene,pivot,selected,shadow)=>{
 if(holdNext){holdNext=false;await new Promise((resolve,reject)=>{releaseLoad=resolve;rejectLoad=reject;});}
 if(!characters[selected])throw new Error('Test invalid model');
 if(!modelBytes.has(selected))modelBytes.set(selected,new Uint8Array(fs.readFileSync('public/models/'+characters[selected].file+'.glb')));
 return createHuman(_scene,pivot,selected,shadow,{source:modelBytes.get(selected)});
};
let seed=17;const rng=Object.create(Math);rng.random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
const source=fs.readFileSync('src/main.js','utf8'),code=source.slice(source.indexOf('const moves='));
const context={...B,engine:gameEngine,scene:gameScene,shadows,mat:name=>new B.StandardMaterial(name,gameScene),createHuman:loadHuman,characters,document,window,$:get,HTMLSelectElement:Select,HTMLInputElement:class{},HTMLTextAreaElement:class{},sound(){},voice(){},camera:{target:new B.Vector3(0,1,0),position:new B.Vector3(0,2,-4)},console:{log:console.log,warn:console.warn,error(){}},Math:rng};
const game=await vm.runInNewContext(`(async()=>{${code}\nreturn {get player(){return player;},get enemy(){return enemy;},get paused(){return paused;},get loading(){return loadingModels;},get auto(){return autoSparring;},get round(){return roundNumber;},get over(){return over;},change};})()`,context);
const frames=n=>{for(let i=0;i<n;i++)frame();},click=id=>get(id).onclick();
const press=key=>listeners.get('keydown')({key,target:new Element(),preventDefault(){},repeat:false});

assert.equal(get('playerCharacter').children.length,Object.keys(characters).length);
assert(get('playerCharacter').children.some(o=>o.value==='peterPan'));
assert(get('enemyCharacter').children.some(o=>o.value==='boy'));
const letters={punch:'j',kick:'k',spin:'l',side:'u',back:'i'},contacts=[];
click('ai');
for(const [a,b] of [['peterPan','boy'],['boy','peterPan'],['boy','boy'],['peterPan','me'],['me','boy']]){
 await game.change(game.player,a);await game.change(game.enemy,b);
 for(const [move,key] of Object.entries(letters)){
  click('reset');press(key);frames(85);listeners.get('keyup')({key});
  contacts.push({attacker:a,defender:b,move,hp:game.enemy.hp});
  assert(game.enemy.hp<100,`${a} ${move} must hit ${b}`);
 }
}
await game.change(game.player,'peterPan');await game.change(game.enemy,'boy');
click('reset');click('pause');const pausedPosition=game.player.pivot.position.asArray();frames(30);assert.deepEqual(game.player.pivot.position.asArray(),pausedPosition);
phases[1].onclick();assert(game.paused&&!game.auto);
click('auto');frames(2100);assert(game.round>1,'Auto sparring completes and restarts a round');const completedAutoRound=game.round;
const resources=()=>({meshes:gameScene.meshes.length,nodes:gameScene.transformNodes.length,skeletons:gameScene.skeletons.length});
const before=resources();
for(let i=0;i<3;i++){await game.change(game.player,'boy');await game.change(game.player,'peterPan');}
assert.deepEqual(resources(),before,'Switching characters does not leak model resources');
const previousKey=game.player.key;await game.change(game.player,'invalid');assert.equal(game.player.key,previousKey);assert(!game.loading);
console.log(JSON.stringify({result:'PASS',models:summaries,contacts,autoRound:completedAutoRound,resourceStability:resources()},null,2));
for(const f of [game.player,game.enemy]){f.visual.dispose();f.pivot.dispose();}gameScene.dispose();gameEngine.dispose();
