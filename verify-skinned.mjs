import fs from 'node:fs';
import assert from 'node:assert/strict';
import {NullEngine,Scene,TransformNode,Vector3} from '@babylonjs/core';
import {createHuman} from './src/human.js';
const engine=new NullEngine(),scene=new Scene(engine),shadows={addShadowCaster(){}};
for(const [key,file] of [['chunli','HVGirl'],['boxer','Soldier']]){
 const pivot=new TransformNode('test',scene);
 const human=await createHuman(scene,pivot,key,shadows,{source:new Uint8Array(fs.readFileSync('public/models/'+file+'.glb'))});
 for(const type of ['punch','kick','spin']){
  const target=new Vector3(0,type==='punch'?1.3:1.04,type==='punch'?.49:.83);
  const end=human.pose(.4,false,{type,target});assert(end&&Number.isFinite(end.y));assert(Math.hypot(end.x,end.z-(type==='punch'?.68:1.02))<=.34, file+' '+type+' actual contact');
  console.log(file,type,'endpoint',end.asArray().map(v=>v.toFixed(3)),'error',Vector3.Distance(end,target).toFixed(3));
 }
 assert(human.nodes.RightHand&&human.nodes.RightFoot);human.dispose();pivot.dispose();
}
console.log('PASS: both skinned humans load, animate and return actual hand/foot positions.');scene.dispose();engine.dispose();

