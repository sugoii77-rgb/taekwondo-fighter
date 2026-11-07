const fs=require('fs');let c=fs.readFileSync('src/human-mpfb.js','utf8');
c=c.replace('const length=Math.max(Math.abs(l1-l2)+.015,Math.min(delta.length(),(l1+l2)*.997));',`const maxFlex=leg?135:145,minFlex=leg?4:3;
  const reachAt=degrees=>Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(degrees*Math.PI/180));
  const length=Math.max(reachAt(maxFlex),Math.min(delta.length(),reachAt(minFlex)));`);
c=c.replace('const pole=new Vector3(feetRest[side].x,.7,1.8);','const pole=new Vector3(feetRest[side].x,2.2,1.8);');
c=c.replace("pole.set(.95,.85,1.2)","pole.set(.95,2.2,1.2)");
fs.writeFileSync('src/human-mpfb.js',c);
