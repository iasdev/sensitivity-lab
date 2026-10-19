export function calculateScore({hits,misses,headshots}){
  return Math.max(0,hits*100+headshots*50-misses*25);
}
export function formatTime(seconds){
  const total=Math.max(0,Math.floor(seconds));
  return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;
}
export class TrainingSession{
  constructor(){this.reset();}
  reset(){this.status='idle';this.startedAt=0;this.endedAt=null;this.duration=0;}
  start(seconds,now){this.status='running';this.startedAt=now;this.endedAt=null;this.duration=Math.max(0,Math.min(300,seconds))*1000;}
  refresh(now){
    if(this.status==='running'&&this.duration>0&&now>=this.startedAt+this.duration){
      this.finish(this.startedAt+this.duration);return true;
    }
    return false;
  }
  finish(now){
    if(this.status!=='running')return;
    this.endedAt=Math.max(this.startedAt,this.duration?Math.min(now,this.startedAt+this.duration):now);
    this.status='finished';
  }
  snapshot(now){
    const elapsedMs=this.status==='idle'?0:Math.max(0,(this.endedAt??now)-this.startedAt);
    return {status:this.status,durationSeconds:this.duration/1000,elapsedSeconds:elapsedMs/1000,remainingSeconds:this.duration?Math.max(0,(this.duration-elapsedMs)/1000):null};
  }
}
