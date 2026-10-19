export function createHitAudio(){
  let context=null;
  function unlock(){
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      context??=new Audio();
      if(context.state==='suspended')context.resume().catch(()=>{});
    }catch{/* Audio is optional when the browser does not provide it. */}
  }
  function tone(frequency,start,duration){
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);
    gain.gain.setValueAtTime(0,start);
    gain.gain.linearRampToValueAtTime(.10,start+.004);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(start);oscillator.stop(start+duration+.01);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  return {unlock,playHit(headshot){
    if(!context||context.state!=='running')return;
    try{
      const now=context.currentTime;
      if(headshot){tone(1397,now,.09);tone(2093,now+.055,.13);}
      else tone(880,now,.085);
    }catch{/* A lost audio device must not interrupt shooting. */}
  }};
}
