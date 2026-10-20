import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSettings } from '../dist/settings.js';
const defaults={vertical:70,zoom:2,coefficient:178,sensitivity:7,targetCount:9,targetSpeed:1,respawnDelay:5,targetScale:1,fpsCap:120,movementSpeed:4,sessionDuration:60,width:1920,height:1080,usa:true,relative:true,motion:true,outlinesOnly:false,resolution:'1920x1080'};
test('only settings are restored, excluding statistics and runtime state',()=>{
  const data=sanitizeSettings({...defaults,sensitivity:55,movementSpeed:6,shots:{hits:100},position:[1,2,3],ads:true,yaw:2},defaults);
  assert.equal(data.sensitivity,55);assert.equal(data.movementSpeed,6);
  for(const key of ['shots','position','ads','yaw'])assert.equal(key in data,false);
});
test('malformed and out-of-range saved values are normalized safely',()=>{
  const data=sanitizeSettings({sensitivity:400.4,targetCount:2.6,targetSpeed:-1,movementSpeed:Infinity,zoom:'5',usa:'false',resolution:'unknown'},defaults);
  assert.equal(data.sensitivity,200);assert.equal(data.targetCount,3);assert.equal(data.targetSpeed,0);
  assert.equal(data.movementSpeed,4);assert.equal(data.zoom,2);assert.equal(data.usa,true);assert.equal(data.resolution,'1920x1080');
});
test('fixed resolutions restore matching dimensions and custom dimensions stay bounded',()=>{
  const wide=sanitizeSettings({resolution:'3440x1440',width:1,height:1},defaults);
  assert.equal(wide.width,3440);assert.equal(wide.height,1440);
  const custom=sanitizeSettings({resolution:'custom',width:99999,height:-1},defaults);
  assert.equal(custom.width,7680);assert.equal(custom.height,240);
});

test('respawn delay restores older settings and validates saved values',()=>{
  assert.equal(sanitizeSettings({},defaults).respawnDelay,5);
  assert.equal(sanitizeSettings({respawnDelay:1.5},defaults).respawnDelay,1.5);
  assert.equal(sanitizeSettings({respawnDelay:0},defaults).respawnDelay,.1);
  assert.equal(sanitizeSettings({respawnDelay:Infinity},defaults).respawnDelay,5);
  assert.equal(sanitizeSettings({respawnDelay:100},defaults).respawnDelay,30);
});

test('frame cap and target size persist and validate older preferences',()=>{
  assert.equal(sanitizeSettings({},defaults).fpsCap,120);
  assert.equal(sanitizeSettings({},defaults).targetScale,1);
  const saved=sanitizeSettings({fpsCap:144.3,targetScale:1.5},defaults);
  assert.equal(saved.fpsCap,144);assert.equal(saved.targetScale,1.5);
  assert.equal(sanitizeSettings({fpsCap:0,targetScale:0},defaults).fpsCap,30);
  assert.equal(sanitizeSettings({fpsCap:1000,targetScale:10},defaults).targetScale,2);
});
