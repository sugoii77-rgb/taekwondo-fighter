import {Vector3,Quaternion,TransformNode,ImportMeshAsync,Color3} from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
export const characters={
 chunli:{name:'여성 · 블루 (스타일형)',file:'HVGirl',tint:'#b8d4ff'},
 boxer:{name:'남성 파이터 · 택티컬',file:'Soldier',tint:'#ffffff'},
 ninja:{name:'남성 파이터 · 나이트',file:'Soldier',tint:'#8394bd'},
 karate:{name:'여성 · 레드 (스타일형)',file:'HVGirl',tint:'#ffc2bd'}
};
export async function createHuman(scene,parent,key,shadows,options={}){
 const config=characters[key],root=new TransformNode('human-'+key,scene);
 // Imported glTF humans face -Z; the game's facing direction is +Z.
 const orient=new TransformNode('model-facing',scene);orient.parent=root;orient.rotation.y=config.file==="Soldier"?Math.PI:0;
 let loaded;
 try{loaded=await ImportMeshAsync(options.source||'/models/'+config.file+'.glb',scene,options.source?{pluginExtension:'.glb',pluginOptions:{gltf:{skipMaterials:true}}}:{});}catch(error){root.dispose();throw error;}
 const model=loaded.meshes[0];
 loaded.animationGroups.forEach(g=>g.stop());
 const bounds=model.getHierarchyBoundingVectors(true),height=bounds.max.y-bounds.min.y;
 model.scaling.scaleInPlace(1.78/height);model.position.y=-bounds.min.y*1.78/height;
 model.parent=orient;root.parent=parent;
 const materials=new Set();
 for(const mesh of loaded.meshes){mesh.isPickable=false;if(mesh.getTotalVertices()){shadows.addShadowCaster(mesh);mesh.receiveShadows=true;}if(mesh.material){materials.add(mesh.material);if(mesh.material.albedoColor)mesh.material.albedoColor.multiplyInPlace(Color3.FromHexString(config.tint));}}
 const nodes={};for(const n of loaded.transformNodes)if(n.name.startsWith('mixamorig:'))nodes[n.name.split(':')[1]]=n;
 const idle=loaded.animationGroups.find(g=>/^idle$/i.test(g.name)),walk=loaded.animationGroups.find(g=>/^walk(ing)?$/i.test(g.name));
 const base=new Map();for(const n of Object.values(nodes))base.set(n,{q:n.rotationQuaternion?.clone()||Quaternion.FromEulerVector(n.rotation),p:n.position.clone()});
 for(const group of [idle,walk])if(group){group.start(true);group.pause();}
 function refresh(){root.computeWorldMatrix(true);}
 function world(node){node.computeWorldMatrix(true);return node.getAbsolutePosition().clone();}
 function solve(endName,chain,target,iterations=8){
  const end=nodes[endName];if(!end)return null;
  for(let i=0;i<iterations;i++){
   for(const name of chain){const joint=nodes[name];if(!joint)continue;joint.computeWorldMatrix(true);const inverse=joint.getWorldMatrix().clone().invert();
    const from=Vector3.TransformCoordinates(world(end),inverse).normalize(),to=Vector3.TransformCoordinates(target,inverse).normalize();
    const dot=Math.max(-1,Math.min(1,Vector3.Dot(from,to))),axis=Vector3.Cross(from,to);
    if(axis.lengthSquared()>.000001){const turn=Quaternion.RotationAxis(axis.normalize(),Math.min(Math.acos(dot),.55));joint.rotationQuaternion=(joint.rotationQuaternion||Quaternion.Identity()).multiply(turn).normalize();}
   }
   if(Vector3.DistanceSquared(world(end),target)<.0001)break;
  }
  return world(end);
 }
 function pose(time,moving,attack){
  for(const [n,b]of base){n.rotationQuaternion=b.q.clone();n.position.copyFrom(b.p);}
  const group=moving?walk:idle;
  if(group){const frames=group.to-group.from;group.goToFrame(group.from+(frames>0?(time*30)%frames:0));}
  refresh();
  // A relaxed fighting guard, driven on the actual imported skeleton.
  const toWorld=p=>{parent.computeWorldMatrix(true);return Vector3.TransformCoordinates(p,parent.getWorldMatrix());};
  solve('LeftHand',['LeftForeArm','LeftArm'],toWorld(new Vector3(-.22,1.34,.3)),3);
  solve('RightHand',['RightForeArm','RightArm'],toWorld(new Vector3(.22,1.32,.3)),3);
  if(!attack)return null;
  const isPunch=attack.type==='punch';
  return solve(isPunch?'RightHand':'RightFoot',isPunch?['RightForeArm','RightArm']:['RightLeg','RightUpLeg'],toWorld(attack.target));
 }
 pose(0,false,null);
 return {root,pose,model:config.file,nodes,dispose(){loaded.animationGroups.forEach(g=>g.dispose());loaded.skeletons.forEach(s=>s.dispose());root.dispose(false);materials.forEach(m=>m.dispose(true,true));}};
}


