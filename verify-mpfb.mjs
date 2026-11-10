import fs from 'node:fs';
import assert from 'node:assert/strict';
import {NullEngine,Scene,TransformNode,Vector3} from '@babylonjs/core';
import {createHuman} from './src/human-mpfb.js';
const engine=new NullEngine(),scene=new Scene(engine),shadows={addShadowCaster(){}};
for(const [key,file] of [['mpfbFemale','Fighter'],['mpfbMale','MaleFighter'],['me','Me'],['zeus','Zeus'],['athena','Athena2'],['chunli','ChunLi']]){
 const pivot=new TransformNode('test',scene);
 const human=await createHuman(scene,pivot,key,shadows,{source:new Uint8Array(fs.readFileSync('public/models/'+file+'.glb'))});
 assert(human.nodes.RightHand&&human.nodes.RightFoot,'Mixamo skeleton');
 human.pose(.2,true,null);
 for(const type of ['punch','kick','spin','side','back']){
  const distance=Math.min(type==='punch'?.68:1.02,human.reach[type]+.19),target=new Vector3(0,type==='punch'?1.3:1.04,distance-.19);
  const end=human.pose(.4,false,{type,target});assert(end&&Number.isFinite(end.y));
  const gap=Math.hypot(end.x,end.z-distance);
  console.log(file,type,'stand',distance.toFixed(2),'body contact gap',gap.toFixed(3));assert(gap<=.25,file+' '+type+' contact with margin');
 }
 human.dispose();pivot.dispose();
}
console.log('PASS: all 6 fighters load, move and make contact for all 5 strikes.');scene.dispose();engine.dispose();
