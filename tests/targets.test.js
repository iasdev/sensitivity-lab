import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGETS, CAMERA, targetCenter, traceShot, shotPercentages } from '../dist/targets.js';
function aimAt(point){
  const [x,y,z]=point.map((value,index)=>value-CAMERA[index]);
  return {yaw:Math.atan2(x,-z),pitch:Math.atan2(y,Math.hypot(x,z))};
}
test('center reticle hits the nearest body, not targets behind it',()=>{
  const result=traceShot({yaw:0,pitch:0});
  assert.equal(result.hit,true);assert.equal(result.headshot,false);assert.equal(result.target,1);
});
test('only the head and body count as hits, with no backing board',()=>{
  const center=targetCenter(1);
  const head=traceShot(aimAt(center.map((n,i)=>n+TARGETS.headOffset[i])));
  assert.equal(head.hit,true);assert.equal(head.headshot,true);assert.equal(head.target,1);
  const empty=traceShot({...aimAt([.5,2.3,-10]),targetCount:2});
  assert.equal(empty.hit,false);
  const body=traceShot(aimAt(center.map((n,i)=>n+TARGETS.bodyOffset[i])));
  assert.equal(body.hit,true);assert.equal(body.headshot,false);
});
test('foreground target blocks a head behind it',()=>{
  const center=targetCenter(7);
  const result=traceShot(aimAt(center.map((n,i)=>n+TARGETS.headOffset[i])));
  assert.equal(result.target,1);assert.equal(result.headshot,false);
});
test('sky and ground count as misses',()=>{
  for(const pitch of [.6,-.5])assert.equal(traceShot({yaw:0,pitch}).hit,false);
});
test('moving hit geometry follows the displayed target time',()=>{
  const time=5,center=targetCenter(0,time,true);
  const pose=aimAt(center.map((n,i)=>n+TARGETS.headOffset[i]));
  const result=traceShot({...pose,time,motion:true});
  assert.equal(result.target,0);assert.equal(result.headshot,true);
});
test('count changes which targets can be hit',()=>{
  assert.equal(traceShot({yaw:0,pitch:0,targetCount:1}).hit,false);
  assert.equal(traceShot({yaw:0,pitch:0,targetCount:2}).target,1);
});
test('shots originate at the player position after moving',()=>{
  const shot=traceShot({yaw:0,pitch:0,position:[-5,1.65,4]});
  assert.equal(shot.hit,true);assert.equal(shot.target,0);
  const position=[-5,1.65,-5],head=[-5,2.09,-9.77];
  const [x,y,z]=head.map((n,i)=>n-position[i]);
  const result=traceShot({position,yaw:Math.atan2(x,-z),pitch:Math.atan2(y,Math.hypot(x,z))});
  assert.equal(result.headshot,true);assert.equal(result.target,0);
});
test('all 24 paths remain separated and inside the shooting range',()=>{
  // Whole-path bounds prove separation even when neighboring paths are at opposite extremes.
  assert.ok(TARGETS.spacing-2*TARGETS.motionAmplitude>2*Math.max(TARGETS.body[0],TARGETS.headRadius));
  assert.ok(TARGETS.depthSpacing-2*TARGETS.depthAmplitude>TARGETS.headOffset[2]+TARGETS.headRadius+Math.max(TARGETS.body[2],TARGETS.headRadius));
  for(let time=0;time<=40;time+=.2){
    const centers=Array.from({length:TARGETS.maxCount},(_,i)=>targetCenter(i,time,true));
    for(let i=0;i<centers.length;i++){
      assert.ok(centers[i][2]-Math.max(TARGETS.body[2],TARGETS.headRadius)>-54.7,'target remains in front of back wall');
      assert.ok(Math.abs(centers[i][0])+Math.max(TARGETS.body[0],TARGETS.headRadius)<10,'target stays inside side rails');
      for(let j=i+1;j<centers.length;j++){
        const separatedX=Math.abs(centers[i][0]-centers[j][0])>2*Math.max(TARGETS.body[0],TARGETS.headRadius);
        const separatedZ=Math.abs(centers[i][2]-centers[j][2])>.51;
        assert.ok(separatedX||separatedZ,`targets ${i} and ${j} overlap at ${time}`);
      }
    }
  }
});
test('statistics use all shots for accuracy and hits for headshot percentage',()=>{
  assert.deepEqual(shotPercentages({hits:0,misses:0,headshots:0}),{accuracy:0,headshotRate:0});
  assert.deepEqual(shotPercentages({hits:0,misses:3,headshots:0}),{accuracy:0,headshotRate:0});
  const stats=shotPercentages({hits:2,misses:1,headshots:1});
  assert.ok(Math.abs(stats.accuracy-200/3)<1e-9);assert.equal(stats.headshotRate,50);
});

test('target size scales body hitboxes and head offsets/radii together',()=>{
  const center=targetCenter(1);
  const largeBody=aimAt([.35,1.49,-9.6]);
  assert.equal(traceShot({...largeBody,targetCount:2,targetScale:1}).hit,false);
  assert.equal(traceShot({...largeBody,targetCount:2,targetScale:2}).hit,true);
  for(const scale of [.25,1,2]){
    const head=center.map((value,index)=>value+TARGETS.headOffset[index]*scale);
    assert.equal(traceShot({...aimAt(head),targetCount:2,targetScale:scale}).headshot,true);
  }
  const outerBody=aimAt([.15,1.57,-9.8]);
  assert.equal(traceShot({...outerBody,targetCount:2,targetScale:1}).hit,true);
  assert.equal(traceShot({...outerBody,targetCount:2,targetScale:.25}).hit,false);
});
