import {Vector3,Quaternion,TransformNode,ImportMeshAsync,Color3} from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
export const characters={
 mpfbFemale:{name:'여성 파이터 · 스포츠웨어',file:'Fighter',tint:'#ffffff',plainBones:true},
 mpfbMale:{name:'MPFB 남성 · 캐주얼',file:'MPFB_male',tint:'#ffffff'},
 // higgsfield image-to-3D (Meshy rig): Mixamo bone names without the 'mixamorig:' prefix
 me:{name:'나 · 작업복 (도움말 영상 인물)',file:'Me',tint:'#ffffff',plainBones:true},
 zeus:{name:'제우스',file:'Zeus',tint:'#ffffff',plainBones:true},
 athena:{name:'아테나 · 여전사',file:'Athena',tint:'#ffffff',plainBones:true},
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
 const nodes={};for(const n of loaded.transformNodes)if(n.name.startsWith('mixamorig:'))nodes[n.name.split(':')[1]]=n;else if(config.plainBones&&n.name!=='Armature')nodes[n.name]=n;
 const idle=loaded.animationGroups.find(g=>/^idle$/i.test(g.name)),walk=loaded.animationGroups.find(g=>/^walk(ing)?$/i.test(g.name));
 const base=new Map();for(const n of Object.values(nodes))base.set(n,{q:n.rotationQuaternion?.clone()||Quaternion.FromEulerVector(n.rotation),p:n.position.clone()});
 for(const group of [idle,walk])if(group){group.start(true);group.pause();}
 function refresh(){root.computeWorldMatrix(true);}
 function world(node){node.computeWorldMatrix(true);return node.getAbsolutePosition().clone();}

 function align(joint,endPoint,target){
  joint.computeWorldMatrix(true);
  const inverse=joint.getWorldMatrix().clone().invert();
  const from=Vector3.TransformCoordinates(endPoint,inverse).normalize();
  const to=Vector3.TransformCoordinates(target,inverse).normalize();
  const dot=Math.max(-1,Math.min(1,Vector3.Dot(from,to))),axis=Vector3.Cross(from,to);
  if(axis.lengthSquared()>1e-10)joint.rotationQuaternion=(joint.rotationQuaternion||Quaternion.Identity()).multiply(Quaternion.RotationAxis(axis.normalize(),Math.acos(dot))).normalize();
 }
 const toWorld=p=>{parent.computeWorldMatrix(true);return Vector3.TransformCoordinates(p,parent.getWorldMatrix());};
 const toLocal=p=>{parent.computeWorldMatrix(true);return Vector3.TransformCoordinates(p,parent.getWorldMatrix().clone().invert());};
 const feetRest={},toeDirections={};
 for(const side of ['Left','Right']){
  if(nodes[side+'Foot'])feetRest[side]=toLocal(world(nodes[side+'Foot']));
  if(nodes[side+'ToeBase'])toeDirections[side]=toLocal(world(nodes[side+'ToeBase'])).subtract(feetRest[side]);
 }
 const debug={};
 // Closed-form two-bone IK with an explicit anatomical bending plane.
 // Unlike CCD, the knee cannot choose the opposite branch during a kick.
 function limb(side,leg,targetLocal,poleLocal,ankleYaw=0){
  const a=nodes[side+(leg?'UpLeg':'Arm')],b=nodes[side+(leg?'Leg':'ForeArm')],e=nodes[side+(leg?'Foot':'Hand')];
  if(!a||!b||!e)return null;
  const origin=world(a),mid=world(b),end=world(e),target=toWorld(targetLocal);
  const l1=Vector3.Distance(origin,mid),l2=Vector3.Distance(mid,end),delta=target.subtract(origin);
  const maxFlex=leg?135:145,minFlex=leg?4:3;
  const reachAt=degrees=>Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(degrees*Math.PI/180));
  const length=Math.max(reachAt(maxFlex),Math.min(delta.length(),reachAt(minFlex)));
  const axis=delta.lengthSquared()>1e-10?delta.normalize():new Vector3(0,-1,0);
  const pole=toWorld(poleLocal).subtract(origin);
  let bend=pole.subtract(axis.scale(Vector3.Dot(pole,axis)));
  if(bend.lengthSquared()<1e-8){const fallback=Vector3.TransformNormal(new Vector3(1,0,0),parent.getWorldMatrix());bend=fallback.subtract(axis.scale(Vector3.Dot(fallback,axis)));}
  bend.normalize();
  const along=(l1*l1-l2*l2+length*length)/(2*length),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const desiredMid=origin.add(axis.scale(along)).add(bend.scale(height));
  const desiredEnd=origin.add(axis.scale(length));
  align(a,world(b),desiredMid);align(b,world(e),desiredEnd);
  const actual=world(e);
  if(leg){
   const toe=nodes[side+'ToeBase'];
   if(toe&&toeDirections[side]){
    const d=toeDirections[side],cs=Math.cos(ankleYaw),sn=Math.sin(ankleYaw);
    const forward=Vector3.TransformNormal(new Vector3(d.x*cs+d.z*sn,d.y,-d.x*sn+d.z*cs),parent.getWorldMatrix());
    align(e,world(toe),actual.add(forward));
   }
   debug[side]={hip:toLocal(world(a)).asArray(),knee:toLocal(world(b)).asArray(),foot:toLocal(actual).asArray(),pole:poleLocal.asArray(),lengths:[l1,l2]};
  }
  return actual;
 }

 // ---- whole-body motion (2026-11-07). Taekwondo power comes from the hips and the support leg, not the
 // limbs alone (Kukkiwon kicking descriptions; dollyo chagi pivots on the ball of the support foot):
 // side-on fighting stance with a bounce, hips/torso turn before the arm or leg, the torso leans away from
 // a kick, the other arm counter-swings, the defender recoils. Fighting-game timing: startup, active, recovery.
 const spine=[nodes.Spine,nodes.Spine1||nodes.Spine01,nodes.Spine2||nodes.Spine02].filter(Boolean);
 const deg=d=>d*Math.PI/180;
 // rotate a joint about an axis given in the fighter's (parent) frame, in the joint's own frame like align()
 function turn(node,axis,angle){
  if(!node||!angle)return;
  parent.computeWorldMatrix(true);node.computeWorldMatrix(true);
  const w=Vector3.TransformNormal(axis,parent.getWorldMatrix());
  const local=Vector3.TransformNormal(w,node.getWorldMatrix().clone().invert()).normalize();
  node.rotationQuaternion=(node.rotationQuaternion||Quaternion.FromEulerVector(node.rotation)).multiply(Quaternion.RotationAxis(local,angle)).normalize();
 }
 const restBones=()=>{for(const [n,b]of base){n.rotationQuaternion=b.q.clone();n.position.copyFrom(b.p);}};
 const UP=new Vector3(0,1,0),BACK=new Vector3(1,0,0);
 // calibrate signs once on this skeleton (handedness and bone axes differ between rigs)
 restBones();root.position.setAll(0);root.rotation.set(0,0,0);refresh();
 const stanceSign=toLocal(world(nodes.LeftArm||nodes.LeftUpLeg)).x<0?1:-1; // root yaw sign bringing the LEFT side forward (+z)
 const head=nodes.Head||spine[spine.length-1];
 const z0=toLocal(world(head)).z;turn(spine[0],BACK,deg(10));refresh();
 const leanSign=toLocal(world(head)).z<z0?1:-1; // sign about +x that tips the head back, away from +z
 restBones();refresh();
 const r0=toLocal(world(nodes.RightArm)).z;turn(spine[0],UP,deg(10));refresh();
 const twistSign=toLocal(world(nodes.RightArm)).z>r0?1:-1; // torso twist sign bringing the right shoulder forward
 restBones();refresh();
 const footY=Math.min(feetRest.Left?.y??0,feetRest.Right?.y??0);

 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const mix=(a,b,t)=>a+(b-a)*smooth(t);
 // 0 -> 1 over [a,b], hold, back to 0 over [c,d]
 const envelope=(t,a,b,c,d)=>t<b?smooth((t-a)/(b-a)):t<c?1:1-smooth((t-c)/(d-c));
 function kickAngles(type,t){
  // Degrees: hip flexion, knee flexion, lateral hip opening.
  // side kick (yeop chagi): knee drawn up to the chest, then a straight thrust; back hook (dwi huryeo chagi): high
  const chamber={spin:[95,105,25],side:[95,112,0],back:[60,95,0]}[type]||[100,108,0];
  const extended={spin:[94,7,0],side:[88,4,0],back:[110,5,0]}[type]||[94,6,0];
  let from,to,u;
  if(t<.28){from=[0,2,0];to=chamber;u=t/.28;}
  else if(t<.49){from=chamber;to=extended;u=(t-.28)/.21;}
  else if(t<.60){from=extended;to=extended;u=1;}
  else if(t<.80){from=extended;to=chamber;u=(t-.60)/.20;}
  else{from=chamber;to=[0,2,0];u=(t-.80)/.20;}
  return from.map((v,i)=>mix(v,to[i],u));
 }
 function forwardLeg(side,hipDegrees,kneeDegrees,lateral=0){
  const a=nodes[side+'UpLeg'],b=nodes[side+'Leg'],foot=nodes[side+'Foot'];
  if(!a||!b||!foot)return;
  const hip=hipDegrees*Math.PI/180,knee=Math.max(0,Math.min(115,kneeDegrees))*Math.PI/180,abduction=lateral*Math.PI/180;
  const axis=angle=>new Vector3(Math.sin(abduction)*Math.sin(angle),-Math.cos(angle),Math.cos(abduction)*Math.sin(angle));
  const origin=world(a),l1=Vector3.Distance(origin,world(b)),l2=Vector3.Distance(world(b),world(foot));
  parent.computeWorldMatrix(true);
  const direction=angle=>Vector3.TransformNormal(axis(angle),parent.getWorldMatrix()).normalize();
  align(a,world(b),origin.add(direction(hip).scale(l1)));
  const kneePosition=world(b);
  align(b,world(foot),kneePosition.add(direction(hip-knee).scale(l2)));
  const end=world(foot),toe=nodes[side+'ToeBase'];
  if(toe&&toeDirections[side]){
   const d=toeDirections[side];
   const desired=Vector3.TransformNormal(new Vector3(d.x,d.y,d.z),parent.getWorldMatrix());
   align(foot,world(toe),end.add(desired));
  }
  debug[side]={hip:toLocal(origin).asArray(),knee:toLocal(world(b)).asArray(),foot:toLocal(end).asArray(),angles:[hipDegrees,kneeDegrees,lateral],lengths:[l1,l2]};
  return end;
 }
 // place the root: yaw about the planted left foot (the pivot), plus a forward shift
 function placeRoot(yaw,forward){
  const p=feetRest.Left||Vector3.Zero(),c=Math.cos(yaw),s=Math.sin(yaw);
  root.rotation.set(0,yaw,root.rotation.z);
  root.position.set(p.x-(p.x*c+p.z*s),0,p.z-(-p.x*s+p.z*c)+forward);
  refresh();
 }
 // guard / counter-swing targets are authored in the body's own frame; they turn with the root
 const bodyTarget=v=>{const c=Math.cos(root.rotation.y),s=Math.sin(root.rotation.y);return new Vector3(root.position.x+v.x*c+v.z*s,root.position.y+v.y,root.position.z-v.x*s+v.z*c);};

 function pose(time,moving,attack,hurt=0){
  restBones();
  const group=moving?walk:idle;
  if(group){const frames=group.to-group.from;group.goToFrame(group.from+(frames>0?(time*30)%frames:0));}
  const type=attack?.type,t=attack?.progress??.52;
  const kick=!!type&&type!=='punch';
  const stance=deg(28)*stanceSign; // side-on: left shoulder and left foot lead
  let yaw=stance,forward=0,lean=0,twist=0,heel=0,bounce=0;
  let leftGuard=new Vector3(-.2,1.3,.3),rightGuard=new Vector3(.22,1.24,.22);
  if(!attack){
   bounce=moving?.015*Math.abs(Math.sin(time*8)):.028*(.5+.5*Math.sin(time*Math.PI*2*1.7)); // light on the toes
   twist=moving?deg(7)*Math.sin(time*8):deg(3)*Math.sin(time*2.1);
  }else if(type==='punch'){
   const hip=envelope(t,0,.32,.6,1),arm=envelope(t,.08,.42,.6,1); // the hip turns first, the fist follows
   yaw=mix(stance,-stance*.25,hip);twist=deg(24)*arm;forward=.11*hip;lean=-deg(6)*arm;
   leftGuard=Vector3.Lerp(leftGuard,new Vector3(-.16,1.2,.12),arm); // the other hand pulls back
  }else if(type==='kick'){
   const e=envelope(t,0,.45,.62,1);
   yaw=mix(stance,stance*.3,envelope(t,0,.3,.7,1)); // hips square up toward the target
   lean=deg(16)*e;heel=.035*e;
   rightGuard=Vector3.Lerp(rightGuard,new Vector3(.26,1.02,.04),e); // kicking-side arm swings down
  }else if(type==='spin'){
   const pivot=envelope(t,0,.42,.64,1),e=envelope(t,.1,.47,.62,1);
   yaw=mix(stance,-stanceSign*deg(75),pivot); // pivot on the support foot: the hip turns over
   lean=deg(24)*e;heel=.04*e;
   leftGuard=Vector3.Lerp(leftGuard,new Vector3(-.3,1.05,.18),e);rightGuard=Vector3.Lerp(rightGuard,new Vector3(.34,.98,-.12),e); // arms counter-swing
  }else if(type==='side'){
   const turnIn=envelope(t,0,.3,.7,1),e=envelope(t,.1,.47,.62,1);
   yaw=mix(stance,-stanceSign*deg(95),turnIn); // yeop chagi: the kicking hip and heel line up with the target, side-on
   lean=deg(30)*e;heel=.03*e;
   rightGuard=Vector3.Lerp(rightGuard,new Vector3(.3,1.0,-.05),e); // the arm follows the leg line down
  }else if(type==='back'){
   // dwi huryeo chagi: a full turn backwards on the support foot; the back faces the target as the heel hooks through
   yaw=stance+stanceSign*deg(360)*smooth(t/.95);
   const e=envelope(t,.25,.47,.62,.95);lean=deg(30)*e;heel=.04*e;
   leftGuard=new Vector3(-.14,1.33,.18);rightGuard=new Vector3(.14,1.33,.18); // hands tucked in for the spin
  }
  if(hurt>0){lean+=deg(18)*hurt;forward-=.07*hurt;twist-=deg(10)*hurt;} // recoil from a hit
  placeRoot(yaw,forward);
  // torso: lean away from the target (+z) and twist (positive = right shoulder forward), spread over the spine
  for(const n of spine){turn(n,BACK,leanSign*lean/spine.length);turn(n,UP,twistSign*twist/spine.length);}
  refresh();

  // Legs use authored joint angles. Contact never pulls or stretches the leg.
  if(moving){
   for(const [side,sign]of [['Left',1],['Right',-1]]){
    const swing=Math.sin(time*8)*sign;
    forwardLeg(side,swing*20,Math.max(0,swing)*32);
   }
  }else if(kick){
   const a=kickAngles(type,t);
   if(type==='back')a[2]=35-70*smooth((t-.4)/.26); // the heel sweeps across the target: the hook
   forwardLeg('Right',...a);
   forwardLeg('Left',0,10+8*(1-heel/.04)); // support leg: soft knee, rising onto the ball of the foot
  }else{
   forwardLeg('Left',9,16);forwardLeg('Right',-9,14); // split fighting stance, knees soft
  }
  // keep the support foot on the floor (bent knees lower the body), then lift: bounce or heel rise
  const feet=kick?['Left']:['Left','Right'];
  const low=Math.min(...feet.map(s=>nodes[s+'Foot']?toLocal(world(nodes[s+'Foot'])).y:footY));
  root.position.y+=footY-low+bounce+heel;
  if(kick&&anchor){const f=toLocal(world(nodes.LeftFoot));root.position.x+=anchor.x-f.x;root.position.z+=anchor.z-f.z;} // the support foot pivots in place, it never slides
  refresh();

  limb('Left',false,bodyTarget(leftGuard),bodyTarget(new Vector3(-.8,.95,-.1)));
  const handTarget=type==='punch'?attack.target:bodyTarget(rightGuard);
  const hand=limb('Right',false,handTarget,bodyTarget(new Vector3(.8,.95,-.1)));
  if(!attack)return null;
  return type==='punch'?hand:world(nodes.RightFoot);
 }
 let anchor=null;pose(0,false,null);anchor=toLocal(world(nodes.LeftFoot)); // the lead foot's place in the stance
 // how far forward this body's strikes reach (legs and pivot differ per model); the attacker stands this far off
 const reach={punch:toLocal(pose(0,false,{type:'punch',target:new Vector3(.24,1.3,3),progress:.5})).z};
 for(const type of ['kick','spin','side','back'])reach[type]=toLocal(pose(0,false,{type,progress:.52})).z;
 pose(0,false,null);
 return {root,pose,debug,reach,model:config.file,nodes,dispose(){loaded.animationGroups.forEach(g=>g.dispose());loaded.skeletons.forEach(s=>s.dispose());root.dispose(false);materials.forEach(m=>m.dispose(true,true));}};
}







