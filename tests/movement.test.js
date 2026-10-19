import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePosition } from '../dist/movement.js';
const start=[0,1.65,4];
test('WASD follows yaw while keeping camera height',()=>{
  assert.deepEqual(advancePosition(start,0,1,0,4,.5),[0,1.65,2]);
  assert.deepEqual(advancePosition(start,0,0,1,4,.5),[2,1.65,4]);
  const rightFacing=advancePosition(start,Math.PI/2,1,0,4,.5);
  assert.ok(Math.abs(rightFacing[0]-2)<1e-9);assert.ok(Math.abs(rightFacing[2]-4)<1e-9);
});
test('diagonal movement has the same speed and zero speed stops movement',()=>{
  const diagonal=advancePosition(start,0,1,1,4,1);
  assert.ok(Math.abs(Math.hypot(diagonal[0],diagonal[2]-4)-4)<1e-9);
  assert.deepEqual(advancePosition(start,0,1,1,0,1),start);
  assert.deepEqual(advancePosition(start,0,0,0,4,1),start);
});
test('movement stays inside the range',()=>{
  assert.deepEqual(advancePosition([8.9,1.65,-52.9],0,1,1,12,10),[9,1.65,-53]);
});
