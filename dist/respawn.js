import { TARGETS } from './targets.js';

export class TargetRespawns {
  constructor(){this.reset();}
  reset(){this.deadlines=Array(TARGETS.maxCount).fill(0);}
  active(now){return this.deadlines.map(deadline=>deadline===0||now>=deadline);}
  eliminate(index,delaySeconds,now){
    if(!Number.isInteger(index)||index<0||index>=this.deadlines.length||!this.active(now)[index])return false;
    this.deadlines[index]=now+delaySeconds*1000;
    return true;
  }
  refresh(now){
    let changed=false;
    this.deadlines.forEach((deadline,index)=>{
      if(deadline>0&&now>=deadline){this.deadlines[index]=0;changed=true;}
    });
    return changed;
  }
}
