import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainingSession, calculateScore, formatTime } from '../dist/session.js';
test('finite test closes exactly at the deadline even if checked late',()=>{
  const run=new TrainingSession();run.start(60,1000);
  assert.equal(run.refresh(60999),false);
  assert.ok(run.snapshot(60999).remainingSeconds>0);
  assert.equal(run.refresh(90000),true);
  assert.equal(run.snapshot(100000).status,'finished');
  assert.equal(run.snapshot(100000).elapsedSeconds,60);
  assert.equal(run.snapshot(100000).remainingSeconds,0);
  assert.equal(run.refresh(110000),false);
});
test('zero duration is infinite until manually finished',()=>{
  const run=new TrainingSession();run.start(0,1000);
  assert.equal(run.refresh(9999999),false);
  assert.equal(run.snapshot(9999999).remainingSeconds,null);
  run.finish(101000);assert.equal(run.snapshot(9999999).elapsedSeconds,100);
});
test('restart and reset do not carry the previous time into a new test',()=>{
  const run=new TrainingSession();run.start(10,0);run.finish(3000);
  assert.equal(run.snapshot(3000).elapsedSeconds,3);
  run.start(300,5000);assert.equal(run.snapshot(5000).remainingSeconds,300);
  run.reset();assert.equal(run.snapshot(999999).status,'idle');
});
test('score rewards hits and headshots and penalizes misses without going negative',()=>{
  assert.equal(calculateScore({hits:2,headshots:1,misses:1}),225);
  assert.equal(calculateScore({hits:0,headshots:0,misses:10}),0);
  assert.equal(calculateScore({hits:1,headshots:1,misses:0}),150);
});
test('time formatting supports zero and five minutes',()=>{
  assert.equal(formatTime(0),'0:00');assert.equal(formatTime(60),'1:00');assert.equal(formatTime(300),'5:00');
});
