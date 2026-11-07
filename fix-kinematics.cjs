const fs=require('fs');
let c=fs.readFileSync('src/human-mpfb.js','utf8');
const start=c.indexOf(' function solve('),end=c.indexOf(' pose(0,false,null);',start);
c=c.slice(0,start)+`
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
 function limb(side,leg,targetLocal,poleLocal){
  const a=nodes[side+(leg?'UpLeg':'Arm')],b=nodes[side+(leg?'Leg':'ForeArm')],e=nodes[side+(leg?'Foot':'Hand')];
  if(!a||!b||!e)return null;
  const origin=world(a),mid=world(b),end=world(e),target=toWorld(targetLocal);
  const l1=Vector3.Distance(origin,mid),l2=Vector3.Distance(mid,end),delta=target.subtract(origin);
  const length=Math.max(Math.abs(l1-l2)+.015,Math.min(delta.length(),(l1+l2)*.997));
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
    const forward=Vector3.TransformNormal(toeDirections[side],parent.getWorldMatrix());
    align(e,world(toe),actual.add(forward));
   }
   debug[side]={hip:toLocal(world(a)).asArray(),knee:toLocal(world(b)).asArray(),foot:toLocal(actual).asArray(),pole:poleLocal.asArray(),lengths:[l1,l2]};
  }
  return actual;
 }
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 function kickPath(type,t,target){
  const rest=feetRest.Right.clone(),chamber=new Vector3(rest.x,.77,.19);
  if(type==='spin')chamber.set(.30,.76,.17);
  if(t<.28)return Vector3.Lerp(rest,chamber,smooth(t/.28));
  if(t<.50){const p=Vector3.Lerp(chamber,target,smooth((t-.28)/.22));if(type==='spin')p.x+=.25*Math.sin((t-.28)/.22*Math.PI);return p;}
  if(t<.59)return target.clone();
  if(t<.80)return Vector3.Lerp(target,chamber,smooth((t-.59)/.21));
  return Vector3.Lerp(chamber,rest,smooth((t-.80)/.20));
 }
 let idleCached=false;
 function pose(time,moving,attack){
  if(!idle&&!moving&&!attack&&idleCached)return null;
  idleCached=!moving&&!attack;
  for(const [n,b]of base){n.rotationQuaternion=b.q.clone();n.position.copyFrom(b.p);}
  const group=moving?walk:idle;
  if(group){const frames=group.to-group.from;group.goToFrame(group.from+(frames>0?(time*30)%frames:0));}
  refresh();
  const progress=attack?.progress??.52;
  for(const [side,sign]of [['Left',1],['Right',-1]]){
   if(!feetRest[side])continue;
   let foot=feetRest[side].clone();
   if(moving){const stride=Math.sin(time*8)*sign;foot.z+=stride*.16;foot.y+=Math.max(0,stride)*.075;}
   if(attack&&attack.type!=='punch'&&side==='Right')foot=kickPath(attack.type,progress,attack.target);
   const pole=new Vector3(feetRest[side].x,.7,1.8);
   if(attack?.type==='spin'&&side==='Right')pole.set(.95,.85,1.2);
   limb(side,true,foot,pole);
  }
  limb('Left',false,new Vector3(-.24,1.31,.31),new Vector3(-.8,.95,-.1));
  const handTarget=attack?.type==='punch'?attack.target:new Vector3(.24,1.29,.31);
  const hand=limb('Right',false,handTarget,new Vector3(.8,.95,-.1));
  if(!attack)return null;
  return attack.type==='punch'?hand:world(nodes.RightFoot);
 }
`+c.slice(end);
c=c.replace('return {root,pose,model:','return {root,pose,debug,model:');
fs.writeFileSync('src/human-mpfb.js',c);
let main=fs.readFileSync('src/main.js','utf8');
main=main.replace(" if(a.type==='spin')f.pivot.rotation.y=heading+Math.PI*2*Math.min(t/.48,1);",' // Roundhouse uses a chambered leg arc; do not spin the whole body through its target.');
main=main.replace("const endpoint=f.visual.pose(clock,false,{type:a.type,target:local});","const endpoint=f.visual.pose(clock,false,{type:a.type,target:a.type==='punch'?local:target,progress:t});");
main=main.replace("t>=.30&&t<=.78", "t>=.43&&t<=.64");
main=main.replace("reach:.85,damage:19,label:'돌려차기'","reach:.85,damage:19,label:'돌려차기'");
// Reset both fighters to a clean stance after a round, not a held final attack pose.
main=main.replace('face(player,enemy);face(enemy,player);destination=null;', 'face(player,enemy);face(enemy,player);player.visual.pose(0,false,{type:"punch",target:new Vector3(.24,1.29,.31),progress:0});enemy.visual.pose(0,false,{type:"punch",target:new Vector3(.24,1.29,.31),progress:0});destination=null;');
fs.writeFileSync('src/main.js',main);
