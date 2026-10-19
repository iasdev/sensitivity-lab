import { CAMERA, SHOOTING_LINE } from './targets.js';

export function advancePosition(position,yaw,forward,strafe,speed,elapsed){
  const length=Math.hypot(forward,strafe);
  if(!length)return [...position];
  const distance=speed*elapsed/Math.max(1,length);
  return [
    Math.max(-9,Math.min(9,position[0]+(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*distance)),
    CAMERA[1],
    Math.max(SHOOTING_LINE.z+SHOOTING_LINE.width/2,Math.min(10,position[2]+(-Math.cos(yaw)*forward+Math.sin(yaw)*strafe)*distance)),
  ];
}
