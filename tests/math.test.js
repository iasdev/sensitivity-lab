import test from 'node:test';
import assert from 'node:assert/strict';
import { horizontalFov, verticalFov, zoomFov, usaMultiplier, referenceFraction, sensitivityDegreesPerCount, sensitivityCm360 } from '../dist/math.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('sensitivity 7 reproduces the supplied physical distances',()=>{
  close(sensitivityCm360(7,800),79);
  close(sensitivityCm360(7,1600),39.5);
  close(sensitivityCm360(7,3200),19.75);
  close(sensitivityDegreesPerCount(7)*(79/2.54*800),360);
});
test('sensitivity zero stops rotation and the scale remains proportional through 200',()=>{
  close(sensitivityDegreesPerCount(0),0);
  assert.equal(sensitivityCm360(0,800),Infinity);
  close(sensitivityCm360(14,800),39.5);
  close(sensitivityCm360(200,800),79*7/200);
  close(sensitivityDegreesPerCount(7.25)/sensitivityDegreesPerCount(7),7.25/7);
});
test('horizontal and vertical FOV describe the same camera across aspect ratios',()=>{
  for(const aspect of [4/3,16/9,3440/1440,.7])for(const vertical of [20,55,70,110])close(verticalFov(horizontalFov(vertical,aspect),aspect),vertical);
});
test('optical magnification scales projection instead of dividing FOV degrees',()=>{
  close(zoomFov(90,2),53.13010235415598);
  close(zoomFov(70,1),70);
});
test('zero coefficient equals central differential screen sensitivity',()=>{
  for(const zoom of [1,2,4,8])close(usaMultiplier(70,zoomFov(70,zoom),0),1/zoom);
});
test('edge coefficient matches the horizontal FOV ratio',()=>{
  const aspect=16/9;
  close(usaMultiplier(70,30,aspect*100),horizontalFov(30,aspect)/horizontalFov(70,aspect));
  close(referenceFraction(aspect*100,aspect),1);
  close(referenceFraction(133,aspect),.748125);
});
test('equal FOV is unchanged and increasing coefficient raises zoom sensitivity',()=>{
  for(const c of [0,100,133,178,300])close(usaMultiplier(70,70,c),1);
  const values=[0,100,133,178,300].map(c=>usaMultiplier(70,25,c));
  values.slice(1).forEach((v,i)=>assert.ok(v>values[i]));
});
