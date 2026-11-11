/** Babylon secondary motion. Call update(seconds) after animation/pose and before render.
 * Pass the application's Babylon namespace as B. No imports, observers, or scene ownership.
 */
export function createPonytailDynamics(loaded, B, options = {}) {
 const {Vector3:V,Quaternion:Q}=B;
 const nodes=loaded.transformNodes||loaded;
 const names=options.names||Array.from({length:5},(_,i)=>`Ponytail_${String(i+1).padStart(2,'0')}`);
 const bones=names.map(name=>nodes.find(n=>n.name===name));
 if(bones.some(n=>!n))throw new Error('Missing ponytail bones: '+names.filter((_,i)=>!bones[i]).join(', '));
 for(let i=1;i<bones.length;i++)if(bones[i].parent!==bones[i-1])throw new Error('Ponytail must be a sequential chain');
 const head=bones[0].parent,rest=bones.map(n=>(n.rotationQuaternion||Q.FromEulerVector(n.rotation)).clone());
 // glTF's Blender bone longitudinal axis is local +Y. Use actual child offsets,
 // with final rest length from the Blender rig (0.051779m before root scaling).
 const axes=bones.map((n,i)=>i+1<bones.length?bones[i+1].position.clone():new V(0,options.tipLength??.051778,0));
 const particles=bones.map(()=>({p:V.Zero(),v:V.Zero()}));
 const maxAngle=options.maxAngle??.45;
 let previousRoot,previousHead,previousLocalQ,previousLocalP,enabled=true,resets=0,steps=0,maxObservedAngle=0;
 const scale=V.One(),position=V.Zero(),tmp=Q.Identity();
 const rotation=n=>{n.computeWorldMatrix(true).decompose(scale,tmp,position);return tmp.clone();};
 const restBone=i=>{bones[i].rotationQuaternion=rest[i].clone();bones[i].computeWorldMatrix(true);};
 const endpoint=i=>V.TransformCoordinates(axes[i],bones[i].getWorldMatrix());
 function reset(){
  for(let i=0;i<bones.length;i++){restBone(i);particles[i].p.copyFrom(endpoint(i));particles[i].v.setAll(0);}
  previousRoot=bones[0].getAbsolutePosition().clone();previousHead=rotation(head);previousLocalQ=(head.rotationQuaternion||Q.FromEulerVector(head.rotation)).clone();previousLocalP=head.position.clone();resets++;
 }
 function align(i,anchor,target){
  const n=bones[i],from=axes[i].normalizeToNew();
  const to=V.TransformNormal(target.subtract(anchor),n.getWorldMatrix().clone().invert()).normalize();
  const angle=Math.acos(Math.max(-1,Math.min(1,V.Dot(from,to)))),cross=V.Cross(from,to),used=Math.min(angle,maxAngle);
  maxObservedAngle=Math.max(maxObservedAngle,used);
  if(cross.lengthSquared()>1e-12)n.rotationQuaternion=rest[i].multiply(Q.RotationAxis(cross.normalize(),used)).normalize();
  n.computeWorldMatrix(true);return endpoint(i);
 }
 function update(dt){
  if(!Number.isFinite(dt)||dt<0)throw new Error('dt must be finite seconds >= 0');
  if(dt===0)return;
  if(!enabled){reset();return;}
  bones[0].computeWorldMatrix(true);
  const root=bones[0].getAbsolutePosition().clone(),headQ=rotation(head);
  const size=Math.max(.001,axes.reduce((sum,a)=>sum+a.length(),0)*Math.abs(scale.x));
  if(!previousRoot||dt>.2||V.Distance(root,previousRoot)>size*2||Math.abs(Q.Dot(headQ,previousHead))<.5){reset();return;}
  const currentLocalQ=(head.rotationQuaternion||Q.FromEulerVector(head.rotation)).clone(),currentLocalP=head.position.clone();
  const count=Math.ceil(dt/(1/240)),h=dt/count;
  for(let s=0;s<count;s++){
   head.rotationQuaternion=Q.Slerp(previousLocalQ,currentLocalQ,(s+1)/count);head.position.copyFrom(V.Lerp(previousLocalP,currentLocalP,(s+1)/count));head.computeWorldMatrix(true);
   for(let i=0;i<bones.length;i++){
    restBone(i);
    const anchor=bones[i].getAbsolutePosition().clone(),target=endpoint(i),p=particles[i],old=p.p.clone();
    const omega=2*Math.PI*(options.frequency??3.5)/(1+i*.15);
    p.v.addInPlace(target.subtract(p.p).scale(omega*omega*h));
    p.v.scaleInPlace(Math.exp(-2*(options.dampingRatio??.38)*omega*h));
    p.p.copyFrom(align(i,anchor,p.p.add(p.v.scale(h))));
    p.v.copyFrom(p.p.subtract(old).scale(1/h));
    const radial=p.p.subtract(anchor).normalize();
    p.v.subtractInPlace(radial.scale(V.Dot(p.v,radial)));
   }
   steps++;
  }
  head.rotationQuaternion=currentLocalQ;head.position.copyFrom(currentLocalP);
  previousRoot=root;previousHead=headQ;previousLocalQ=currentLocalQ.clone();previousLocalP=currentLocalP.clone();
 }
 reset();
 return {update,reset,bones,head,particles,
  set enabled(value){enabled=!!value;reset();},get enabled(){return enabled;},
  get diagnostics(){return {resets,steps,maxObservedAngle,finite:particles.every(p=>[...p.p.asArray(),...p.v.asArray()].every(Number.isFinite))};},
  dispose(){for(let i=0;i<bones.length;i++)restBone(i);enabled=false;}
 };
}

