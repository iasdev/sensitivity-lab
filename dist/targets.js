// Geometry used by both the WebGL scene and CPU hit detection.
export const TARGETS = {
  count:9, maxCount:24, columns:3, spacing:5, firstZ:-10, depthSpacing:6,
  height:1.65, motionSpeed:.65, motionPhase:1.7, motionAmplitude:1.1, depthAmplitude:2,
  headOffset:[0,.44,.23], headRadius:.18,
  bodyOffset:[0,-.08,.2], body:[.22,.34,.12],
};
export const SHOOTING_LINE = { z:1, width:.5 };
export const CAMERA = [0,1.65,4];
export function targetCenter(index,time=0,motion=false,motionPattern='combined'){
  return [
    (index%TARGETS.columns)*TARGETS.spacing-5+(motion?Math.sin(time*TARGETS.motionSpeed+index*TARGETS.motionPhase)*TARGETS.motionAmplitude:0),
    TARGETS.height,TARGETS.firstZ-Math.floor(index/TARGETS.columns)*TARGETS.depthSpacing+(motion&&motionPattern!=='horizontal'?Math.cos(time*TARGETS.motionSpeed+index*TARGETS.motionPhase)*TARGETS.depthAmplitude:0),
  ];
}
const add=(a,b)=>a.map((n,i)=>n+b[i]);
export function intersectBox(origin,direction,center,halfSize){
  let near=0,far=Infinity;
  for(let i=0;i<3;i++){
    const low=center[i]-halfSize[i],high=center[i]+halfSize[i];
    if(Math.abs(direction[i])<1e-12){if(origin[i]<low||origin[i]>high)return Infinity;continue;}
    const a=(low-origin[i])/direction[i],b=(high-origin[i])/direction[i];
    near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    if(far<near)return Infinity;
  }
  return far>0?near:Infinity;
}
export function intersectSphere(origin,direction,center,radius){
  const offset=origin.map((n,i)=>n-center[i]);
  const b=offset.reduce((sum,n,i)=>sum+n*direction[i],0);
  const h=b*b-offset.reduce((sum,n)=>sum+n*n,0)+radius*radius;
  if(h<0)return Infinity;
  const t=-b-Math.sqrt(h);return t>0?t:Infinity;
}
export function traceShot({yaw,pitch,time=0,motion=false,targetCount=TARGETS.count,position=CAMERA,activeTargets=null,targetScale=1,motionPattern='combined'}){
  const scale=Math.max(.25,Math.min(2,targetScale));
  const scaled=vector=>vector.map(value=>value*scale);
  const direction=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
  let distance=250,result={hit:false,headshot:false,target:null};
  const consider=(t,target=null,headshot=false)=>{
    if(t<distance){distance=t;result={hit:target!==null,headshot,target};}
  };
  if(direction[1]<-.001)consider(-position[1]/direction[1]);
  consider(intersectBox(position,direction,[0,3,-55],[24,3,.3]));
  const count=Math.max(1,Math.min(TARGETS.maxCount,Math.round(targetCount)));
  for(let index=0;index<count;index++){
    if(activeTargets&&activeTargets[index]===false)continue;
    const center=targetCenter(index,time,motion,motionPattern);
    consider(intersectSphere(position,direction,add(center,scaled(TARGETS.headOffset)),TARGETS.headRadius*scale),index,true);
    consider(intersectBox(position,direction,add(center,scaled(TARGETS.bodyOffset)),scaled(TARGETS.body)),index);
  }
  // Rails can hide a target; the nearest visible surface determines the shot.
  for(let j=0;j<8;j++)for(const x of [-10,10]){
    const z=-j*8-3;
    consider(intersectBox(position,direction,[x,1,z],[.10,1,.10]));
    consider(intersectBox(position,direction,[x,.85,z-4],[.045,.045,4]));
  }
  return {...result,distance};
}
export function shotPercentages({hits,misses,headshots}){
  return {accuracy:hits+misses?100*hits/(hits+misses):0,headshotRate:hits?100*headshots/hits:0};
}
