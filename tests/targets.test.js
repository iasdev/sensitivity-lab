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
test('visible head is a headshot, but the board is only a normal hit',()=>{
  const center=targetCenter(1);
  const head=traceShot(aimAt(center.map((n,i)=>n+TARGETS.headOffset[i])));
  assert.equal(head.hit,true);assert.equal(head.headshot,true);assert.equal(head.target,1);
  const board=traceShot(aimAt([.5,2.3,-10]));
  assert.equal(board.hit,true);assert.equal(board.headshot,false);
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
test('statistics use all shots for accuracy and hits for headshot percentage',()=>{
  assert.deepEqual(shotPercentages({hits:0,misses:0,headshots:0}),{accuracy:0,headshotRate:0});
  assert.deepEqual(shotPercentages({hits:0,misses:3,headshots:0}),{accuracy:0,headshotRate:0});
  const stats=shotPercentages({hits:2,misses:1,headshots:1});
  assert.ok(Math.abs(stats.accuracy-200/3)<1e-9);assert.equal(stats.headshotRate,50);
});
