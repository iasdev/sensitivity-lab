import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOOTING_LINE } from '../dist/targets.js';
import { advancePosition } from '../dist/movement.js';
const start=[0,1.65,4];
test('WASD follows yaw while keeping camera height',()=>{
  assert.deepEqual(advancePosition(start,0,1,0,4,.5),[0,1.65,2]);
  assert.deepEqual(advancePosition(start,0,0,1,4,.5),[2,1.65,4]);
  const rightFacing=advancePosition(start,Math.PI/2,1,0,4,.5);
  assert.ok(Math.abs(rightFacing[0]-2)<1e-9);assert.ok(Math.abs(rightFacing[2]-4)<1e-9);
});
test('diagonal movement has the same speed and zero speed stops movement',()=>{
  const diagonal=advancePosition(start,0,1,1,4,.5);
  assert.ok(Math.abs(Math.hypot(diagonal[0],diagonal[2]-4)-2)<1e-9);
  assert.deepEqual(advancePosition(start,0,1,1,0,1),start);
  assert.deepEqual(advancePosition(start,0,0,0,4,1),start);
});
test('movement stays inside the range',()=>{
  assert.deepEqual(advancePosition([8.9,1.65,2],0,1,1,12,10),[9,1.65,SHOOTING_LINE.z+SHOOTING_LINE.width/2]);
});

test('the thick red firing line blocks forward, diagonal and reversed movement',()=>{
  const edge=SHOOTING_LINE.z+SHOOTING_LINE.width/2;
  for(const [yaw,forward,strafe] of [[0,1,0],[0,1,1],[Math.PI,-1,0],[Math.PI/2,0,-1]]){
    const position=advancePosition(start,yaw,forward,strafe,12,10);
    assert.equal(position[2],edge);
    assert.equal(advancePosition(position,yaw,forward,strafe,12,10)[2],edge);
  }
  assert.ok(advancePosition([0,1.65,edge],0,-1,0,4,.5)[2]>edge);
  assert.deepEqual(advancePosition([0,1.65,edge],0,0,1,4,.5),[2,1.65,edge]);
});
