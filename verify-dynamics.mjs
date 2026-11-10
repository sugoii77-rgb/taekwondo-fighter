import fs from 'node:fs';
import assert from 'node:assert/strict';
import {NullEngine,Scene,TransformNode,Vector3} from '@babylonjs/core';
import {createHuman} from './src/human-mpfb.js';
// Whole-body motion (2026-11-07): the body must really move (hip pivot, torso twist, lean, bounce), while the
// support foot stays planted on the floor and nothing goes through the floor or turns NaN.
const engine=new NullEngine(),scene=new Scene(engine),shadows={addShadowCaster(){}};
const local=(pivot,node)=>{const c=[];for(let p=node;p;p=p.parent)c.push(p);for(let i=c.length-1;i>=0;i--)c[i].computeWorldMatrix(true);return Vector3.TransformCoordinates(node.getAbsolutePosition(),pivot.getWorldMatrix().clone().invert());};
for(const [key,file]of [['mpfbFemale','Fighter'],['mpfbMale','MaleFighter'],['me','Me'],['zeus','Zeus'],['athena','Athena2'],['chunli','ChunLi']]){
 const pivot=new TransformNode(key,scene);
 const human=await createHuman(scene,pivot,key,shadows,{source:new Uint8Array(fs.readFileSync('public/models/'+file+'.glb'))});
 const n=human.nodes,feet=()=>['Left','Right'].map(s=>local(pivot,n[s+'Foot']));
 const torso=()=>local(pivot,n.Head||n.Spine).z-local(pivot,n.Hips).z; // head ahead of the hips: lean
 human.pose(0,false,{type:'punch',progress:0,target:new Vector3(.24,1.3,.6)});const floor=Math.min(...feet().map(f=>f.y));
 human.pose(0,false,null);
 const restFoot=local(pivot,n.LeftFoot),restShoulder=local(pivot,n.RightArm),restTorso=torso();
 // idle bounces
 const ys=[0,.1,.2,.3,.4].map(t=>{human.pose(t,false,null);return local(pivot,n.Hips).y;});
 assert(Math.max(...ys)-Math.min(...ys)>.015,key+' idle bounce');
 for(const type of ['punch','kick','spin','side','back']){
  let maxDrift=0,maxShoulder=-1,maxLeanBack=0,yaws=[];
  for(let i=0;i<=20;i++){
   const t=i/20,end=human.pose(0,false,{type,progress:t,target:new Vector3(.24,1.3,.6)});
   assert(end&&Number.isFinite(end.x+end.y+end.z),`${key} ${type} finite`);
   const [l,r]=feet();
   assert(Math.min(l.y,type==='punch'?r.y:9)>floor-.03,`${key} ${type} t=${t} foot below the floor`);
   if(type!=='punch'){maxDrift=Math.max(maxDrift,Math.hypot(l.x-restFoot.x,l.z-restFoot.z));}
   maxShoulder=Math.max(maxShoulder,local(pivot,n.RightArm).z-restShoulder.z);
   maxLeanBack=Math.max(maxLeanBack,restTorso-torso());
   yaws.push(human.root.rotation.y);
  }
  const turned=(Math.max(...yaws)-Math.min(...yaws))*180/Math.PI;
  if(type==='punch')assert(maxShoulder>.08,`${key} punch: shoulder drives forward (${maxShoulder.toFixed(3)})`);
  else{assert(maxDrift<.06,`${key} ${type}: support foot stays planted (${maxDrift.toFixed(3)})`);assert(maxLeanBack>.04,`${key} ${type}: torso leans back (${maxLeanBack.toFixed(3)})`);}
  if(type==='back')assert(turned>300,`${key} back hook spins a full turn (${turned.toFixed(0)} deg)`);
  if(type==='side')assert(turned>90,`${key} side kick turns side-on (${turned.toFixed(0)} deg)`);
  if(type==='spin')assert(turned>60,`${key} roundhouse pivots the hips (${turned.toFixed(0)} deg)`);
  console.log(key,type,'turn',turned.toFixed(0)+'°','shoulder',maxShoulder.toFixed(2),'lean',maxLeanBack.toFixed(2),'foot drift',maxDrift.toFixed(3));
 }
 // a hit makes the body recoil backwards
 human.pose(0,false,null,0);const before=torso();human.pose(0,false,null,1);
 assert(torso()<before-.05,key+' recoil');
 human.dispose();pivot.dispose();
}
console.log('PASS: bounce, hip pivot, torso twist/lean and recoil on all 6 fighters; support foot planted, nothing below the floor.');scene.dispose();engine.dispose();
