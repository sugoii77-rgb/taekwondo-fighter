import assert from 'node:assert/strict';
import {NullEngine,Scene,TransformNode,Vector3} from '@babylonjs/core';
import {createHuman,characters} from './src/human.js';
const engine=new NullEngine(),scene=new Scene(engine),shadows={addShadowCaster(){}};
for(const key of Object.keys(characters)){
 const parent=new TransformNode(key,scene),human=createHuman(scene,parent,key,shadows);
 for(const heading of [0,Math.PI/2,Math.PI]){
  parent.rotation.y=heading;parent.computeWorldMatrix(true);
  for(const [type,distance,height]of [['punch',.79,1.3],['kick',1.02,1.04],['spin',1.02,1.04]]){
   const endpoint=human.pose(0,false,{type,target:new Vector3(0,height,distance-.19)});
   const target=Vector3.TransformCoordinates(new Vector3(0,height,distance),parent.getWorldMatrix());
   assert(Math.hypot(endpoint.x-target.x,endpoint.z-target.z)<=.34,`${key} ${type} contact ${heading}`);
   assert(endpoint.y>=.68&&endpoint.y<=1.57,`${key} ${type} body height`);
  }
 }
 parent.rotation.y=0;parent.computeWorldMatrix(true);
 const miss=human.pose(0,false,{type:'punch',target:new Vector3(0,1.3,3)});
 assert(Math.hypot(miss.x,miss.z-3)>.34,'distant punch must miss');
 human.dispose();parent.dispose();
}
console.log('PASS: four characters, all three strikes contact at 3 headings; distant strikes miss.');scene.dispose();engine.dispose();
