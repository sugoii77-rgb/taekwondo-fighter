const fs=require('fs');let c=fs.readFileSync('verify-taekwondo.mjs','utf8');c=c.replace("assert(Vector3.Dot(bend,desired)>=-1e-5,",`if(foot.y>hip.y-.15&&side==='Right')assert(bend.y>=-1e-5,file+' raised leg must bend knee UP, not backward');
     const thigh=hip.subtract(knee).normalize(),shin=foot.subtract(knee).normalize();
     const flex=180-Math.acos(Math.max(-1,Math.min(1,Vector3.Dot(thigh,shin))))*180/Math.PI;
     assert(flex<=135.1,'knee exceeds 135 degree flexion');
     assert(Vector3.Dot(bend,desired)>=-1e-5,`);fs.writeFileSync('verify-taekwondo.mjs',c);
