import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameLimiter, PistolCadence } from '../dist/timing.js';
test('120 FPS cap uses every refresh on a 120 Hz display despite timestamp jitter',()=>{
  const limiter=new FrameLimiter();let frames=0;
  for(let i=0;i<120;i++)if(limiter.ready(i*1000/120+(i%2?.08:0),120))frames++;
  assert.equal(frames,120);
});
test('frame cap follows cadence across refresh rates and cap changes',()=>{
  for(const [refresh,cap,expected] of [[240,120,120],[144,120,120],[60,120,60],[120,30,30]]){
    const limiter=new FrameLimiter();let frames=0;
    for(let i=0;i<refresh;i++)if(limiter.ready(i*1000/refresh,cap))frames++;
    assert.ok(Math.abs(frames-expected)<=1,`${refresh} Hz at ${cap} cap: ${frames}`);
  }
  const limiter=new FrameLimiter();assert.equal(limiter.ready(0,30),true);
  assert.equal(limiter.ready(8.33,30),false);assert.equal(limiter.ready(8.33,120),true);
  assert.equal(limiter.ready(10000,120),true);assert.equal(limiter.ready(10001,120),false);
});
test('pistol ignores fast clicks without queuing or extending the cooldown',()=>{
  const pistol=new PistolCadence();
  assert.equal(pistol.fire(0),true);
  for(const now of [1,50,100,249])assert.equal(pistol.fire(now),false);
  assert.equal(pistol.fire(250),true);assert.equal(pistol.fire(499),false);
  assert.equal(pistol.fire(500),true);pistol.reset();assert.equal(pistol.fire(501),true);
});
