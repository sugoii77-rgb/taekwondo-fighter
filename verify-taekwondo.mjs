import fs from 'node:fs';
import assert from 'node:assert/strict';
import {NullEngine,Scene,TransformNode,Vector3} from '@babylonjs/core';
import {createHuman} from './src/human-mpfb.js';
const engine=new NullEngine(),scene=new Scene(engine),shadows={addShadowCaster(){}};
let count=0;
for(const [key,file]of [['mpfbFemale','Fighter'],['mpfbMale','MaleFighter'],['me','Me'],['zeus','Zeus'],['athena','Athena']]){
 const pivot=new TransformNode(key,scene);
 const human=await createHuman(scene,pivot,key,shadows,{source:new Uint8Array(fs.readFileSync('public/models/'+file+'.glb'))});
 for(const yaw of [0,Math.PI/2,Math.PI]){pivot.rotation.y=yaw;pivot.computeWorldMatrix(true);
  for(const type of ['kick','spin','side','back'])for(let i=0;i<=60;i++){
   human.pose(i/60,false,{type,progress:i/60,target:new Vector3(0,1.04,.83)});
   const d=human.debug.Right,h=Vector3.FromArray(d.hip),k=Vector3.FromArray(d.knee),f=Vector3.FromArray(d.foot);
   const upper=k.subtract(h).normalize(),lower=f.subtract(k).normalize();
   const flex=Math.acos(Math.max(-1,Math.min(1,Vector3.Dot(upper,lower))))*180/Math.PI;
   assert(Math.abs(flex-d.angles[1])<.02,'actual knee angle differs from authored hinge');
   assert(flex<=115.01,'excessive knee flexion');
   assert(Math.abs(Vector3.Distance(h,k)-d.lengths[0])<.001,'thigh length');
   assert(Math.abs(Vector3.Distance(k,f)-d.lengths[1])<.001,'shin length');
   if(i/60>=.49&&i/60<=.6)assert(flex<=7.01,'extended kick must be almost straight');
   count++;
  }
 }
 human.dispose();pivot.dispose();
}
console.log('PASS',count,'FK poses: actual knee follows authored angle; extension <=7 degrees; no bone stretch.');scene.dispose();engine.dispose();
