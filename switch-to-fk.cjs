const fs=require('fs');let c=fs.readFileSync('src/human-mpfb.js','utf8');
const begin=c.indexOf(' const smooth='),end=c.indexOf(' let idleCached=',begin);
c=c.slice(0,begin)+`
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const mix=(a,b,t)=>a+(b-a)*smooth(t);
 function kickAngles(type,t){
  // Degrees: hip flexion, knee flexion, lateral hip opening.
  const chamber=type==='spin'?[95,105,25]:[100,108,0];
  const extended=type==='spin'?[94,7,14]:[94,6,0];
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
`+c.slice(end);
const start=c.indexOf("  for(const [side,sign]of [['Left',1],['Right',-1]])",c.indexOf('function pose('));
const stop=c.indexOf("  limb('Left',false",start);
c=c.slice(0,start)+`
  // Legs use authored joint angles. Contact never pulls or stretches the leg.
  if(moving){
   for(const [side,sign]of [['Left',1],['Right',-1]]){
    const swing=Math.sin(time*8)*sign;
    forwardLeg(side,swing*20,Math.max(0,swing)*32);
   }
  }
  if(kick){
   const angles=kickAngles(attack.type,progress);
   forwardLeg('Right',...angles);
  }
`+c.slice(stop);
c=c.replace('return {root,pose,debug,model:','return {root,pose,debug,model:');
fs.writeFileSync('src/human-mpfb.js',c);
