// Keep the cadence phase instead of rounding down to a display refresh divisor.
export class FrameLimiter {
  constructor(){this.next=null;this.cap=null;}
  ready(now,cap){
    if(this.cap!==cap){this.cap=cap;this.next=null;}
    const interval=1000/cap;
    if(this.next!==null&&now+.25<this.next)return false;
    this.next=this.next===null||now-this.next>interval*2?now+interval:this.next+interval;
    return true;
  }
}
export class PistolCadence {
  constructor(){this.reset();}
  reset(){this.lastShot=-Infinity;}
  fire(now,intervalMs=250){
    if(now-this.lastShot<intervalMs)return false;
    this.lastShot=now;
    return true;
  }
}
