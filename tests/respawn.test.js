import test from 'node:test';
import assert from 'node:assert/strict';
import { TargetRespawns } from '../dist/respawn.js';
import { traceShot } from '../dist/targets.js';

test('hits remove targets until their exact real-time respawn deadline',()=>{
  const targets=new TargetRespawns();
  assert.equal(targets.eliminate(1,5,1000),true);
  assert.equal(targets.active(5999)[1],false);
  assert.equal(targets.refresh(5999),false);
  assert.equal(targets.active(6000)[1],true);
  assert.equal(targets.refresh(6000),true);
  assert.equal(targets.refresh(6001),false);
});
test('hidden targets cannot be hit and do not block targets behind them',()=>{
  const targets=new TargetRespawns();
  targets.eliminate(1,5,1000);
  const shot=traceShot({yaw:0,pitch:0,activeTargets:targets.active(1001)});
  assert.equal(shot.target,4);
  assert.equal(traceShot({yaw:0,pitch:0,targetCount:2,activeTargets:targets.active(1001)}).hit,false);
  assert.equal(traceShot({yaw:0,pitch:0,activeTargets:targets.active(6000)}).target,1);
});
test('repeat shots cannot extend a hidden target deadline and targets respawn independently',()=>{
  const targets=new TargetRespawns();
  targets.eliminate(0,5,1000);targets.eliminate(1,1.5,2000);
  assert.equal(targets.eliminate(0,30,3000),false);
  assert.equal(targets.active(3500)[0],false);
  assert.equal(targets.active(3500)[1],true);
  assert.equal(targets.active(6000)[0],true);
  targets.eliminate(1,.1,6000);
  assert.equal(targets.active(6099)[1],false);
  assert.equal(targets.active(6100)[1],true);
});
test('new runs restore all targets without persisting eliminations',()=>{
  const targets=new TargetRespawns();
  targets.eliminate(0,30,1000);targets.eliminate(23,30,1000);
  targets.reset();
  assert.ok(targets.active(1001).every(Boolean));
});
