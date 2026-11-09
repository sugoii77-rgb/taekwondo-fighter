import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {NullEngine,Scene,TransformNode,Vector3,Color3,MeshBuilder,StandardMaterial} from '@babylonjs/core';

// Run the actual game controller with a headless scene and deterministic mock bodies.
// Real model/contact regressions remain covered by verify-mpfb and verify-dynamics.
class Element {
 constructor(id=''){this.id=id;this.dataset={};this.disabled=false;this.value='';this.textContent='';this.attributes={};this.children=[];}
 setAttribute(key,value){this.attributes[key]=value;}
 append(child){this.children.push(child);}
 setPointerCapture(){}
}
class Select extends Element {}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new (['playerCharacter','enemyCharacter','reviewMove','background'].includes(id)?Select:Element)(id));return elements.get(id);};
const keys=['w','a','s','d'].map(key=>Object.assign(new Element(),{dataset:{key}}));
const attacks=['punch','kick','spin','side','back'].map(attack=>Object.assign(new Element(),{dataset:{attack}}));
const phases=['0.25','0.52','0.85'].map(phase=>Object.assign(new Element(),{dataset:{phase},textContent:'pose'}));
get('reviewMove').value='kick';
const document={body:{dataset:{}},getElementById:get,createElement:()=>new Element(),querySelectorAll(selector){return selector==='[data-key]'?keys:selector==='[data-attack]'?attacks:selector==='[data-key], [data-attack]'?[...keys,...attacks]:selector==='[data-phase]'?phases:selector==='select'?['playerCharacter','enemyCharacter','reviewMove','background'].map(get):[];}};
const listeners=new Map(),window={addEventListener:(name,fn)=>listeners.set(name,fn)};
const engine=new NullEngine(),scene=new Scene(engine);
let frame,resolveLoad,rejectLoad,holdNextLoad=false;
engine.runRenderLoop=fn=>{frame=fn;};engine.getDeltaTime=()=>40;scene.render=()=>{};
scene.pick=()=>({hit:true,pickedPoint:new Vector3(4,0,4)});
let pointerHandler;scene.onPointerObservable.add=fn=>{pointerHandler=fn;};
const createHuman=async (_scene,pivot)=>{
 if(holdNextLoad){holdNextLoad=false;await new Promise((resolve,reject)=>{resolveLoad=resolve;rejectLoad=reject;});}
 const root=new TransformNode('mock-body',scene);root.parent=pivot;
 return {root,reach:{punch:.57,kick:.85,spin:.85,side:.85,back:.85},dispose(){root.dispose();},pose(_clock,_moving,attack){if(!attack)return null;pivot.computeWorldMatrix(true);return Vector3.TransformCoordinates(attack.target??new Vector3(0,1,.8),pivot.getWorldMatrix());}};
};
let seed=17;const rng=Object.create(Math);rng.random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
const source=fs.readFileSync(new URL('./src/main.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('const moves='));
const context={engine,scene,TransformNode,Vector3,Color3,MeshBuilder,shadows:{},mat:name=>new StandardMaterial(name,scene),createHuman,characters:{me:{name:'Me'},zeus:{name:'Zeus'},athena:{name:'Athena'}},document,window,$:get,HTMLSelectElement:Select,HTMLInputElement:class{},HTMLTextAreaElement:class{},sound(){},voice(){},PointerEventTypes:{POINTERTAP:1},camera:{target:new Vector3(0,1,0),position:new Vector3(0,2,-4)},console:{log:console.log,warn:console.warn,error(){}},Math:rng};
const game=await vm.runInNewContext(`(async()=>{${code}\nreturn {get player(){return player;},get enemy(){return enemy;},get auto(){return autoSparring;},get paused(){return paused;},get loading(){return loadingModels;},get over(){return over;},get round(){return roundNumber;},get rematch(){return rematchTimer;},get destination(){return destination;},get keyCount(){return keys.size;},get aiEnabled(){return aiEnabled;},attack,change};})()`,context);
const frames=n=>{for(let i=0;i<n;i++)frame();};
const click=id=>get(id).onclick();
const hp=()=>[game.player.hp,game.enemy.hp];
const keydown=key=>listeners.get('keydown')({key,target:new Element(),preventDefault(){},repeat:false});
const snapshot=()=>JSON.stringify({hp:hp(),p:game.player.pivot.position.asArray(),e:game.enemy.pivot.position.asArray(),a:[game.player.attack,game.enemy.attack],round:game.round,rematch:game.rematch});
assert.equal(game.paused,true);assert.equal(game.auto,false);assert.equal(get('auto').disabled,false);
frames(40);assert.deepEqual(hp(),[100,100]);
// Preserve the user's manual opponent-AI preference across automatic bouts.
click('ai');assert.equal(game.aiEnabled,false);
click('auto');assert.equal(game.auto,true);assert.equal(game.paused,false);assert.equal(get('auto').attributes['aria-pressed'],'true');assert.equal(get('ai').disabled,true);assert(keys.every(x=>x.disabled)&&attacks.every(x=>x.disabled));
keydown('w');keydown('j');assert.equal(game.keyCount,0);
pointerHandler({type:1,event:{button:0}});assert.equal(game.destination,null);
frames(250);assert(game.player.hp<100&&game.enemy.hp<100,'both AI fighters must deal damage');
click('pause');const stopped=snapshot();frames(100);assert.equal(snapshot(),stopped,'pause freezes AI, attacks and rematches');
click('pause');click('reset');assert.deepEqual(hp(),[100,100]);assert.equal(game.auto,true);assert.equal(game.round,1);
// Force a decisive exchange and verify exactly one automatic new round.
game.enemy.hp=1;game.player.hp=100;for(let i=0;i<500&&!game.over;i++)frame();assert(game.over,'auto bout reaches KO');assert.equal(game.rematch,3);assert.equal(game.enemy.attack,null);
click('pause');const countdown=game.rematch;frames(200);assert.equal(game.rematch,countdown);
click('slow');click('pause');frames(76);assert.equal(game.round,2);assert.deepEqual(hp(),[100,100]);assert.equal(game.over,false);click('slow');
// Turning auto off cancels all automated player control and preserves AI preference.
click('auto');assert.equal(game.auto,false);assert.equal(game.aiEnabled,false);assert.equal(get('ai').disabled,false);assert(keys.every(x=>!x.disabled));
click('reset');frames(150);assert.deepEqual(hp(),[100,100]);
keydown('w');assert.equal(game.keyCount,1);listeners.get('keyup')({key:'w'});
attacks[0].onclick();assert.equal(game.player.attack?.type,'punch');frames(35);assert(game.enemy.hp<100,'manual attacks still work');
// Manual KO never rematches; automatic mode can start again from the result.
game.enemy.hp=1;game.player.cooldown=0;game.attack(game.player,'punch');frames(40);assert(game.over);frames(200);assert(game.over);assert.equal(game.round,1);
click('auto');assert(game.auto&&!game.over&&!game.paused);assert.deepEqual(hp(),[100,100]);
// Rapid repeated toggles are deterministic, without accumulating input.
for(let i=0;i<12;i++)click('auto');assert.equal(game.auto,true);assert.equal(game.keyCount,0);
// Motion review explicitly returns to manual and freezes the selected pose.
phases[0].onclick();assert.equal(game.auto,false);assert.equal(game.paused,true);assert.equal(get('auto').attributes['aria-pressed'],'false');
click('auto');listeners.get('blur')();assert.equal(game.paused,true);const blurred=snapshot();frames(100);assert.equal(snapshot(),blurred);
// Slow speed changes time, not mode; reset leaves it available.
click('slow');assert.equal(get('slow').textContent,'정상 속도');click('slow');assert.equal(get('slow').textContent,'느리게 보기');
// Character loading suspends combat and prevents reset/resume races.
click('pause');holdNextLoad=true;const changing=game.change(game.player,'athena');assert(game.loading&&game.paused);assert(get('auto').disabled&&get('pause').disabled);const loadingState=snapshot();click('pause');click('auto');click('reset');frames(100);assert.equal(snapshot(),loadingState);resolveLoad();await changing;assert.equal(game.player.key,'athena');assert.equal(game.loading,false);assert.equal(game.auto,true);assert.equal(game.paused,false);assert.deepEqual(hp(),[100,100]);
holdNextLoad=true;const failing=game.change(game.player,'missing');rejectLoad(new Error('test load failure'));await failing;assert.equal(game.player.key,'athena');assert.equal(game.loading,false);assert.equal(game.paused,false);assert.match(get('status').textContent,/로딩 실패/);
holdNextLoad=true;const blurredLoad=game.change(game.player,'me');listeners.get('blur')();resolveLoad();await blurredLoad;assert.equal(game.paused,true,'blur during model load must remain paused');
click('pause');holdNextLoad=true;const blurredFailure=game.change(game.player,'missing');listeners.get('blur')();rejectLoad(new Error('test blur and failure'));await blurredFailure;assert.equal(game.paused,true,'failed model load must preserve blur pause');
scene.dispose();engine.dispose();
console.log('PASS: automatic/manual toggle, both AI fighters, input isolation, pause/blur, KO/rematch, repeated toggles, reset, motion review, speed, character-loading success/failure.');

