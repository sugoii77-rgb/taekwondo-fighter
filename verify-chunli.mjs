import fs from 'node:fs';
import assert from 'node:assert/strict';
import {NullEngine,Scene,TransformNode,Vector3,VertexBuffer} from '@babylonjs/core';
import {createHuman,characters} from './src/human-mpfb.js';
assert.equal(characters.chunli.file,'ChunLi','Chun-Li must use her own mesh, not tinted HVGirl');
const bytes=new Uint8Array(fs.readFileSync('public/models/ChunLi.glb'));
const json=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+new DataView(bytes.buffer).getUint32(12,true))));
assert(json.skins?.length,'export includes a skin');
assert(json.images?.length,'export includes textures');
assert(json.meshes.length,'export includes a mesh');
const engine=new NullEngine(),scene=new Scene(engine),pivot=new TransformNode('test-chunli',scene);
const human=await createHuman(scene,pivot,'chunli',{addShadowCaster(){}},{source:bytes});
for(const name of ['Hips','Spine','Spine1','Spine2','Head','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot','LeftToeBase','RightToeBase'])assert(human.nodes[name],name);
const skinned=scene.meshes.filter(m=>m.skeleton&&m.getTotalVertices());
assert(skinned.length,'visible mesh must be skinned');
for(const mesh of skinned){
 const weights=mesh.getVerticesData(VertexBuffer.MatricesWeightsKind),joints=mesh.getVerticesData(VertexBuffer.MatricesIndicesKind);
 assert(weights?.length&&joints?.length,'skin influences exist');
 for(let i=0;i<weights.length;i+=4){assert(Math.abs(weights[i]+weights[i+1]+weights[i+2]+weights[i+3]-1)<.005,'skin weights normalize');for(let j=0;j<4;j++)assert(joints[i+j]>=0&&joints[i+j]<mesh.skeleton.bones.length,'joint index');}
}
let count=0;
for(const yaw of [0,Math.PI/2,Math.PI]){pivot.rotation.y=yaw;
 for(const type of ['punch','kick','spin','side','back'])for(let i=0;i<=20;i++){
  const endpoint=human.pose(i/20,false,{type,progress:i/20,target:new Vector3(.24,1.3,.65)});
  assert(endpoint&&endpoint.asArray().every(Number.isFinite),'finite combat contact');
  for(const mesh of skinned){mesh.skeleton.prepare(true);assert(Array.from(mesh.skeleton.getTransformMatrices(mesh)).every(Number.isFinite),'finite deformation matrices');}
  count++;
 }
}
for(let t=0;t<1;t+=.1)human.pose(t,true,null);
human.pose(0,false,null,1);
human.dispose();pivot.dispose();assert.equal(scene.meshes.filter(m=>m.getTotalVertices()).length,0,'switching character cleans up visible mesh');
scene.dispose();engine.dispose();
console.log(`PASS: Chun-Li's own textured GLB, required bones, normalized skin weights, ${count} combat poses, walk/recoil and disposal.`);