import { horizontalFov, verticalFov, zoomFov, usaMultiplier, referenceFraction, radians, sensitivityDegreesPerCount, sensitivityCm360 } from './math.js';
import { createRenderer } from './renderer.js';
import { CAMERA, traceShot, shotPercentages } from './targets.js';
import { FrameLimiter, PistolCadence } from './timing.js';
import { TargetRespawns } from './respawn.js';
import { advancePosition } from './movement.js';
import { loadSettings, saveSettings } from './settings.js';
import { createHitAudio } from './audio.js';
import { TrainingSession, calculateScore, formatTime } from './session.js';

const $ = id => document.getElementById(id);
const referenceAspect=16/9;
const initial = { vertical: verticalFov(107, 1920 / 1080), zoom: 2, coefficient: 1600/9, sensitivity: 7, usa: true, relative: true, ads: false, motion: true, targetCount:9, targetSpeed:2.5, respawnDelay:5, despawnOnHit:true, shotInterval:250, targetScale:1.5, fpsCap:120, movementSpeed:4, sessionDuration:60, outlinesOnly:true, resolution: '1920x1080', width:1920, height:1080 };
const state = { ...initial, ...loadSettings(initial), yaw:0, pitch:0, position:[...CAMERA] };
const movementKeys=new Set();
const hitAudio=createHitAudio();
const canvas = $('scene');
let renderer;
try { renderer = createRenderer(canvas); } catch(error) { console.error('WebGL:',error); }
if (!renderer) { $('webgl-error').hidden=false; $('capture').disabled=true; }
let aspect=16/9, dirty=true, lastSize='';
const shots={hits:0,misses:0,headshots:0};
const training=new TrainingSession();
const respawns=new TargetRespawns();
const limiter=new FrameLimiter(),pistol=new PistolCadence();
let fpsWindow=0,renderedFrames=0,actualFps=0;
let pendingTrainingStart=false,captureRequestActive=false;
let hitmarkerTimer;
function showHitmarker(result){
  clearTimeout(hitmarkerTimer);
  const marker=$('hitmarker');
  marker.hidden=!result.hit;
  marker.classList.toggle('headshot',result.headshot);
  if(result.hit)hitmarkerTimer=setTimeout(()=>{marker.hidden=true;},180);
}
let lastRenderedPose=null,animationTime=0,previousFrameTime=null;
const setText = (id, text) => { $(id).textContent=text; };
function updateShootingStats(){
  const {accuracy,headshotRate}=shotPercentages(shots);
  setText('shot-hits',shots.hits);setText('shot-misses',shots.misses);
  setText('shot-accuracy',`${accuracy.toFixed(1)}%`);
  setText('shot-headshots',`${headshotRate.toFixed(1)}%`);
  renderTraining();
}
function renderTraining(){
  const run=training.snapshot(performance.now());
  const running=run.status==='running',finished=run.status==='finished';
  const seconds=running?(run.remainingSeconds===null?Math.floor(run.elapsedSeconds):Math.ceil(run.remainingSeconds)):finished?Math.floor(run.elapsedSeconds):state.sessionDuration;
  setText('session-clock',!running&&!finished&&seconds===0?'∞':formatTime(seconds));
  setText('session-status',running?(run.remainingSeconds===null?'UNLIMITED · ELAPSED':'TIME LEFT'):finished?'TRIAL COMPLETE':'TRIAL READY');
  setText('session-score',run.status==='idle'?'—':calculateScore(shots).toLocaleString('en-US'));
  setText('session-start',pendingTrainingStart?'Starting…':running?'Finish trial':finished?'New trial':'Start trial');
  $('session-start').disabled=!renderer||pendingTrainingStart;
  $('session-free').hidden=!finished;
  $('reset-stats').disabled=running||pendingTrainingStart;
  $('session-duration').disabled=running||pendingTrainingStart;
  $('session-duration-value').disabled=running||pendingTrainingStart;
  $('shooting-stats').classList.toggle('session-finished',finished);
}
function releaseTrainingCapture(){
  movementKeys.clear();releaseRightAim();
  if(document.pointerLockElement===canvas)document.exitPointerLock();
}
function checkTrainingDeadline(now=performance.now()){
  if(training.refresh(now)){releaseTrainingCapture();renderTraining();}
  return training.status==='finished';
}
function finishTraining(){
  training.finish(performance.now());releaseTrainingCapture();renderTraining();
}
function beginTraining(){
  pendingTrainingStart=false;
  respawns.reset();pistol.reset();dirty=true;
  Object.assign(shots,{hits:0,misses:0,headshots:0});
  training.start(state.sessionDuration,performance.now());updateShootingStats();
}
function returnToPractice(){
  pendingTrainingStart=false;training.reset();respawns.reset();pistol.reset();dirty=true;
  Object.assign(shots,{hits:0,misses:0,headshots:0});updateShootingStats();
}
$('session-start').addEventListener('click',async()=>{
  if(training.status==='running'){finishTraining();return;}
  if(!renderer||pendingTrainingStart)return;
  pendingTrainingStart=true;renderTraining();
  if(document.pointerLockElement===canvas)beginTraining();else await toggleCapture();
});
$('session-free').addEventListener('click',returnToPractice);
setInterval(()=>{if(training.status==='running'){checkTrainingDeadline();renderTraining();}},100);
function shoot(){
  if(document.pointerLockElement!==canvas||!renderer)return;
  if(checkTrainingDeadline())return;
  // Match the pose and moving targets in the frame the player actually sees.
  const now=performance.now();
  if(!pistol.fire(now,state.shotInterval))return;
  const pose=lastRenderedPose??{...state,time:animationTime};
  // A just-eliminated target cannot be hit twice before the next rendered frame.
  const activeTargets=respawns.active(now).map((active,index)=>active&&(pose.activeTargets?.[index]??true));
  const result=traceShot({...pose,activeTargets});
  if(result.hit&&state.despawnOnHit){respawns.eliminate(result.target,state.respawnDelay,now);dirty=true;}
  if(result.hit){shots.hits++;if(result.headshot)shots.headshots++;}else shots.misses++;
  updateShootingStats();
  showHitmarker(result);
  if(result.hit)hitAudio.playHit(result.headshot);
}
$('reset-stats').addEventListener('click',()=>{
  if(training.status!=='running')returnToPractice();
});
function adsVertical() { return zoomFov(state.relative ? state.vertical : 55, state.zoom); }
function multiplier() { return state.usa ? usaMultiplier(state.vertical,adsVertical(),state.coefficient) : 1; }

function layout() {
  const viewport=$('viewport');
  const availableWidth=viewport.clientWidth;
  const availableHeight=viewport.clientHeight;
  if(state.resolution==='screen') {
    aspect=availableWidth/availableHeight;
    state.width=Math.round(availableWidth);state.height=Math.round(availableHeight);
  }else aspect=state.width/state.height;
  const width=Math.min(availableWidth,availableHeight*aspect);
  const height=width/aspect;
  const frame=$('render-frame');frame.style.width=`${width}px`;frame.style.height=`${height}px`;
  // Resolution defines the camera aspect. Raster size follows the displayed canvas for a responsive GPU budget.
  const dpr=Math.min(window.devicePixelRatio||1,1.5);
  const renderWidth=Math.max(1,Math.round(width*dpr)),renderHeight=Math.max(1,Math.round(height*dpr));
  const size=`${renderWidth}:${renderHeight}`;
  if(size!==lastSize){canvas.width=renderWidth;canvas.height=renderHeight;lastSize=size;}
  update();
}
function update() {
  $('viewport').classList.toggle('outlines-only',state.outlinesOnly);
  const hfov=horizontalFov(state.vertical,referenceAspect);
  $('hfov').min=30;$('hfov').max=160;
  $('vfov').min=verticalFov(30,referenceAspect);$('vfov').max=verticalFov(160,referenceAspect);
  $('hfov').value=hfov;$('vfov').value=state.vertical;
  for(const [id,value] of Object.entries({hfov,vfov:state.vertical,zoom:state.zoom,coefficient:state.coefficient,sensitivity:state.sensitivity,'target-count':state.targetCount,'target-speed':state.targetSpeed,'respawn-delay':state.respawnDelay,'shot-interval':state.shotInterval,'target-scale':state.targetScale,'fps-cap':state.fpsCap,'movement-speed':state.movementSpeed,'session-duration':state.sessionDuration})){
    const field=$(id+'-value');
    field.min=$(id).min;field.max=$(id).max;
    if(document.activeElement!==field)field.value=Number(value.toFixed(6));
  }
  for(const dpi of [800,1600,3200]){
    const cm=sensitivityCm360(state.sensitivity,dpi);
    setText('distance-'+dpi,Number.isFinite(cm)?`${cm.toFixed(1)} cm`:'∞ · no rotation');
  }
  const fraction=referenceFraction(state.coefficient,aspect);
  setText('resolution-label',`${state.width} × ${state.height} / ${(aspect).toFixed(2)}:1`);
  setText('aspect-label',`Aspect ratio ${aspect.toFixed(3)}:1 · Scaled to fit`);
  const clipped=fraction>1;
  setText('usa-description',!state.usa?'No compensation: identical angular sensitivity in hip fire and ADS.':state.coefficient===0?'Center reference: matches the response for very small corrections.':clipped?'The reference is outside the image. The green area is clipped to the visible field.':`Matches the distance from the center to ${(fraction*100).toFixed(1)}% of half-width. Other distances do not match exactly.`);
  $('usa-area').hidden=!state.usa;$('reference-points').hidden=!state.usa||clipped||state.coefficient===0;
  $('usa-area').style.width=`${Math.min(fraction,1)*100}%`;
  $('reference-points').style.width=`${fraction*100}%`;
  $('usa-area').classList.toggle('zero',state.coefficient===0);
  setText('area-label',state.coefficient===0?'USA · CENTER':clipped?'USA · REFERENCE OUTSIDE VIEW':`USA · ${state.coefficient.toFixed(1).replace('.0','')}%`);
  $('respawn-delay').disabled=!state.despawnOnHit;
  $('respawn-delay-value').disabled=!state.despawnOnHit;
  $('coefficient').disabled=!state.usa;
  $('coefficient-value').disabled=!state.usa;
  document.querySelectorAll('[data-coefficient]').forEach(button=>{
    const active=Math.abs(state.coefficient-Number(button.dataset.coefficient))<.005;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  setText('view-state',state.ads?'AIMING / ADS':'HIP FIRE');
  setText('storage-status',saveSettings(state)?'Settings saved in this browser':'Settings cannot be saved in this browser');
  renderTraining();
  dirty=true;
}
for(const [id,key] of [['vfov','vertical'],['zoom','zoom'],['coefficient','coefficient'],['sensitivity','sensitivity'],['target-count','targetCount'],['target-speed','targetSpeed'],['respawn-delay','respawnDelay'],['shot-interval','shotInterval'],['target-scale','targetScale'],['fps-cap','fpsCap'],['movement-speed','movementSpeed'],['session-duration','sessionDuration']]) $(id).addEventListener('input',e=>{state[key]=Number(e.target.value);update();});
$('hfov').addEventListener('input',e=>{state.vertical=verticalFov(Number(e.target.value),referenceAspect);update();});
for(const [id,key] of [['hfov','vertical'],['vfov','vertical'],['zoom','zoom'],['coefficient','coefficient'],['sensitivity','sensitivity'],['target-count','targetCount'],['target-speed','targetSpeed'],['respawn-delay','respawnDelay'],['shot-interval','shotInterval'],['target-scale','targetScale'],['fps-cap','fpsCap'],['movement-speed','movementSpeed'],['session-duration','sessionDuration']]){
  const field=$(id+'-value');
  const apply=(commit)=>{
    const value=field.valueAsNumber;
    if(!Number.isFinite(value)){if(commit)field.value=id==='hfov'?horizontalFov(state.vertical,referenceAspect):state[key];return;}
    if(['sensitivity','target-count','session-duration','fps-cap','shot-interval'].includes(id)&&!Number.isInteger(value)){field.value=state[key];return;}
    if(id==='target-speed'&&!Number.isInteger(value*2)){field.value=state[key];return;}
    const min=Number(field.min),max=Number(field.max);
    if(!commit&&(value<min||value>max))return;
    const bounded=Math.max(min,Math.min(max,value));
    state[key]=id==='hfov'?verticalFov(bounded,referenceAspect):bounded;
    if(commit)field.value=bounded;
    update();
  };
  field.addEventListener('input',()=>apply(false));
  field.addEventListener('change',()=>apply(true));
  field.addEventListener('blur',update);
}
for(const [id,key] of [['usa','usa'],['ads-fov','relative'],['motion','motion'],['outlines-only','outlinesOnly'],['despawn-on-hit','despawnOnHit']]) $(id).addEventListener('change',e=>{state[key]=e.target.checked;if(id==='despawn-on-hit'&&!state.despawnOnHit)respawns.reset();update();});
document.querySelectorAll('[data-coefficient]').forEach(button=>button.addEventListener('click',()=>{state.coefficient=Number(button.dataset.coefficient);$('coefficient').value=state.coefficient;update();}));
$('resolution').addEventListener('change',e=>{
  const value=e.target.value;$('custom-resolution').hidden=value!=='custom';
  state.resolution=value;
  if(value!=='screen'&&value!=='custom') [state.width,state.height]=value.split('x').map(Number);
  layout();
});
$('apply-resolution').addEventListener('click',()=>{
  if(!$('width').reportValidity()||!$('height').reportValidity())return;
  state.width=Number($('width').value);state.height=Number($('height').value);state.resolution='custom';layout();
});
function syncSettingsControls(){
  for(const [id,key] of [['usa','usa'],['ads-fov','relative'],['motion','motion'],['outlines-only','outlinesOnly'],['despawn-on-hit','despawnOnHit']])$(id).checked=state[key];
  for(const [id,key] of [['zoom','zoom'],['coefficient','coefficient'],['sensitivity','sensitivity'],['resolution','resolution'],['width','width'],['height','height'],['target-count','targetCount'],['target-speed','targetSpeed'],['respawn-delay','respawnDelay'],['shot-interval','shotInterval'],['target-scale','targetScale'],['fps-cap','fpsCap'],['movement-speed','movementSpeed'],['session-duration','sessionDuration']])$(id).value=state[key];
  $('custom-resolution').hidden=state.resolution!=='custom';
}
document.querySelectorAll('[data-reset-settings]').forEach(button=>button.addEventListener('click',()=>{
  returnToPractice();
  Object.assign(state,initial,{yaw:0,pitch:0,position:[...CAMERA]});animationTime=0;movementKeys.clear();
  syncSettingsControls();layout();
}));
function setPanelOpen(buttonId,bodyId,open,label){
  $(bodyId).hidden=!open;
  $(buttonId).setAttribute('aria-expanded',String(open));
  $(buttonId).setAttribute('aria-label',`${open?'Collapse':'Expand'} ${label}`);
  $(buttonId).textContent=open?'−':'+';
}
for(const [button,body,label] of [['collapse','panel-body','controls'],['movement-collapse','movement-panel-body','movement controls'],['general-collapse','general-panel-body','general controls']]){
  $(button).addEventListener('click',()=>setPanelOpen(button,body,$(body).hidden,label));
}
$('help-toggle').addEventListener('click',()=>{const open=$('help').hidden;$('help').hidden=!open;$('help-toggle').setAttribute('aria-expanded',String(open));if(open)$('help').scrollIntoView({block:'nearest',behavior:'smooth'});});
$('fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{setText('interaction-hint','Fullscreen is unavailable in this browser.');}
});
document.addEventListener('fullscreenchange',()=>{document.body.classList.toggle('immersive',Boolean(document.fullscreenElement));layout();});
async function toggleCapture(){
  if(!renderer)return;
  try{
    if(document.pointerLockElement===canvas){document.exitPointerLock();return;}
    if(!canvas.requestPointerLock)throw new Error('Pointer lock unavailable');
    captureRequestActive=true;
    hitAudio.unlock();
    try{await canvas.requestPointerLock({unadjustedMovement:true});}
    catch(error){if(error.name!=='NotSupportedError')throw error;await canvas.requestPointerLock();}
    if(pendingTrainingStart&&document.pointerLockElement===canvas)beginTraining();
  }catch{pendingTrainingStart=false;renderTraining();setText('interaction-hint','Could not capture the mouse. Please try again.');}
  finally{captureRequestActive=false;}
}
$('capture').addEventListener('click',toggleCapture);
document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===canvas;
  setText('interaction-hint',locked?'WASD: move · Left-click: shoot · Right-click: aim':'Start or Space · WASD to move · Right-click to aim');
  $('capture').textContent=locked?'Stop · Space':'Start · Space';
  $('capture').setAttribute('aria-pressed',String(locked));
  if(locked&&pendingTrainingStart)beginTraining();
  if(!locked){movementKeys.clear();releaseRightAim();}
});
document.addEventListener('pointerlockerror',()=>{if(captureRequestActive)return;pendingTrainingStart=false;renderTraining();setText('interaction-hint','Could not capture the mouse. Please try again.');});
let rightAimHeld=false;
function releaseRightAim(){if(!rightAimHeld)return;rightAimHeld=false;state.ads=false;update();}
function move(dx,dy){const sensitivity=radians(sensitivityDegreesPerCount(state.sensitivity))*(state.ads?multiplier():1);state.yaw+=dx*sensitivity;state.pitch=Math.max(-1.45,Math.min(1.45,state.pitch-dy*sensitivity));dirty=true;}
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)move(e.movementX,e.movementY);});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{
  if(e.ctrlKey||e.deltaY===0)return;
  e.preventDefault();
  const zoomControl=$('zoom');
  state.zoom=Math.max(Number(zoomControl.min),Math.min(Number(zoomControl.max),Math.round((state.zoom-Math.sign(e.deltaY)*.25)*100)/100));
  zoomControl.value=state.zoom;
  update();
},{passive:false});
document.addEventListener('mousedown',e=>{
  if(e.button===0&&document.pointerLockElement===canvas){e.preventDefault();shoot();return;}
  if(e.button!==2||(e.target!==canvas&&document.pointerLockElement!==canvas))return;
  e.preventDefault();
  rightAimHeld=true;
  state.ads=true;
  update();
});
document.addEventListener('mouseup',e=>{if(e.button===2)releaseRightAim();});
document.addEventListener('pointercancel',releaseRightAim);
document.addEventListener('visibilitychange',()=>{if(document.hidden){movementKeys.clear();releaseRightAim();}});
document.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){
    if(document.pointerLockElement===canvas&&!e.target.isContentEditable&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){
      e.preventDefault();movementKeys.add(e.code);
    }
    return;
  }
  if(e.code!=='Space'||e.repeat||e.target.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  e.preventDefault();toggleCapture();
});
document.addEventListener('keyup',e=>movementKeys.delete(e.code));
window.addEventListener('blur',()=>{movementKeys.clear();releaseRightAim();});
window.addEventListener('resize',layout);
syncSettingsControls();
if(window.innerWidth<=760){setPanelOpen('collapse','panel-body',false,'controls');setPanelOpen('movement-collapse','movement-panel-body',false,'movement controls');setPanelOpen('general-collapse','general-panel-body',false,'general controls');}
layout();
function frame(now){
  checkTrainingDeadline(now);
  if(respawns.refresh(now))dirty=true;
  const elapsed=previousFrameTime===null?0:Math.min((now-previousFrameTime)/1000,.1);previousFrameTime=now;
  if(state.motion)animationTime+=elapsed*state.targetSpeed;
  if(document.pointerLockElement===canvas&&movementKeys.size){
    const next=advancePosition(state.position,state.yaw,Number(movementKeys.has('KeyW'))-Number(movementKeys.has('KeyS')),Number(movementKeys.has('KeyD'))-Number(movementKeys.has('KeyA')),state.movementSpeed,elapsed);
    if(next.some((n,i)=>n!==state.position[i])){state.position=next;dirty=true;}
  }
  if(renderer&&(dirty||(state.motion&&state.targetSpeed>0)||document.pointerLockElement===canvas)&&limiter.ready(now,state.fpsCap)){
    // Keep the path phase when pausing or changing speed, without teleporting targets.
    lastRenderedPose={yaw:state.yaw,pitch:state.pitch,position:[...state.position],time:animationTime,motion:true,targetCount:state.targetCount,targetScale:state.targetScale,activeTargets:respawns.active(now)};
    renderer.render({aspect,vertical:state.ads?adsVertical():state.vertical,outlinesOnly:state.outlinesOnly,...lastRenderedPose});dirty=false;renderedFrames++;
  }
  if(now-fpsWindow>=1000){
    actualFps=Math.round(renderedFrames*1000/(now-fpsWindow));
    setText('actual-fps',renderedFrames?`${actualFps} FPS`:'Idle');
    renderedFrames=0;fpsWindow=now;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Read-only diagnostic snapshot for integration checks and reproducible experiments.
window.sensitivityLab={snapshot:()=>({...state,actualFps,activeTargets:respawns.active(performance.now()),aspect,referenceAspect,actualHorizontal:horizontalFov(state.ads?adsVertical():state.vertical,aspect),adsVertical:adsVertical(),multiplier:multiplier(),referenceFraction:referenceFraction(state.coefficient,aspect),shots:{...shots,...shotPercentages(shots)},training:{...training.snapshot(performance.now()),score:calculateScore(shots)},renderedPose:lastRenderedPose?{...lastRenderedPose}:null,webgl:Boolean(renderer)})};
