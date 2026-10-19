import { horizontalFov, verticalFov, zoomFov, usaMultiplier, referenceFraction, radians, sensitivityDegreesPerCount, sensitivityCm360 } from './math.js';
import { createRenderer } from './renderer.js';

const $ = id => document.getElementById(id);
const referenceAspect=16/9;
const initial = { vertical: verticalFov(107, 1920 / 1080), zoom: 2, coefficient: 178, sensitivity: 7, usa: true, relative: true, ads: false, motion: false, resolution: '1920x1080', width:1920, height:1080 };
const state = { ...initial, yaw:0, pitch:0 };
const canvas = $('scene');
let renderer;
try { renderer = createRenderer(canvas); } catch(error) { console.error('WebGL:',error); }
if (!renderer) { $('webgl-error').hidden=false; $('capture').disabled=true; }
let aspect=16/9, dirty=true, lastSize='', lastTime=0;
const setText = (id, text) => { $(id).textContent=text; };
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
  const hfov=horizontalFov(state.vertical,referenceAspect);
  $('hfov').min=30;$('hfov').max=160;
  $('vfov').min=verticalFov(30,referenceAspect);$('vfov').max=verticalFov(160,referenceAspect);
  $('hfov').value=hfov;$('vfov').value=state.vertical;
  for(const [id,value] of Object.entries({hfov,vfov:state.vertical,zoom:state.zoom,coefficient:state.coefficient,sensitivity:state.sensitivity})){
    const field=$(id+'-value');
    field.min=$(id).min;field.max=$(id).max;
    if(document.activeElement!==field)field.value=Number(value.toFixed(6));
  }
  const activeVertical=state.ads?adsVertical():state.vertical;
  for(const dpi of [800,1600,3200]){
    const cm=sensitivityCm360(state.sensitivity,dpi);
    setText('distance-'+dpi,Number.isFinite(cm)?`${cm.toFixed(1).replace('.',',')} cm`:'∞ · sin giro');
  }
  setText('actual-fov',`${horizontalFov(activeVertical,referenceAspect).toFixed(1)}° / ${activeVertical.toFixed(1)}°`);
  setText('sensitivity-ratio',`${multiplier().toFixed(3)}×`);
  const fraction=referenceFraction(state.coefficient,aspect);
  setText('monitor-distance',state.usa?`${(fraction*100).toFixed(1)}% del semiancho`:'Desactivado');
  setText('resolution-label',`${state.width} × ${state.height} / ${(aspect).toFixed(2)}:1`);
  setText('aspect-label',`Relación ${aspect.toFixed(3)}:1 · Vista escalada para encajar`);
  const edge=aspect*100;
  setText('edge-preset',`${Math.round(edge)}% · Borde`);
  $('edge-preset').disabled=edge>300;
  const clipped=fraction>1;
  setText('usa-description',!state.usa?'Sin compensación: mismo giro angular con y sin mira.':state.coefficient===0?'Referencia en el centro: conserva la respuesta para correcciones muy pequeñas.':clipped?'La referencia queda fuera de la imagen. El área verde se recorta al campo visible.':`Iguala el recorrido del centro al ${(fraction*100).toFixed(1)}% del semiancho. No implica igualar todos los puntos.`);
  $('usa-area').hidden=!state.usa;$('reference-points').hidden=!state.usa||clipped||state.coefficient===0;
  $('usa-area').style.width=`${Math.min(fraction,1)*100}%`;
  $('reference-points').style.width=`${fraction*100}%`;
  $('usa-area').classList.toggle('zero',state.coefficient===0);
  setText('area-label',state.coefficient===0?'USA · CENTRO':clipped?'USA · REFERENCIA FUERA DE VISTA':`USA · ${state.coefficient.toFixed(1).replace('.0','')}%`);
  $('coefficient').disabled=!state.usa;
  $('coefficient-value').disabled=!state.usa;
  document.querySelectorAll('[data-coefficient]').forEach(button=>button.classList.toggle('active',Math.abs(state.coefficient-(button.dataset.coefficient==='edge'?edge:Number(button.dataset.coefficient)))<.15));
  setText('view-state',state.ads?'APUNTANDO / ADS':'DESDE LA CADERA');
  dirty=true;
}
for(const [id,key] of [['vfov','vertical'],['zoom','zoom'],['coefficient','coefficient'],['sensitivity','sensitivity']]) $(id).addEventListener('input',e=>{state[key]=Number(e.target.value);update();});
$('hfov').addEventListener('input',e=>{state.vertical=verticalFov(Number(e.target.value),referenceAspect);update();});
for(const [id,key] of [['hfov','vertical'],['vfov','vertical'],['zoom','zoom'],['coefficient','coefficient'],['sensitivity','sensitivity']]){
  const field=$(id+'-value');
  const apply=(commit)=>{
    const value=field.valueAsNumber;
    if(!Number.isFinite(value)){if(commit)field.value=id==='hfov'?horizontalFov(state.vertical,referenceAspect):state[key];return;}
    if(id==='sensitivity'&&!Number.isInteger(value)){field.value=state.sensitivity;return;}
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
for(const [id,key] of [['usa','usa'],['ads-fov','relative'],['motion','motion']]) $(id).addEventListener('change',e=>{state[key]=e.target.checked;update();});
document.querySelectorAll('[data-coefficient]').forEach(button=>button.addEventListener('click',()=>{state.coefficient=button.dataset.coefficient==='edge'?aspect*100:Number(button.dataset.coefficient);$('coefficient').value=state.coefficient;update();}));
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
$('reset-all').addEventListener('click',()=>{
  Object.assign(state,initial,{yaw:0,pitch:0});
  for(const [id,key] of [['usa','usa'],['ads-fov','relative'],['motion','motion']])$(id).checked=state[key];
  for(const [id,key] of [['zoom','zoom'],['coefficient','coefficient'],['sensitivity','sensitivity'],['resolution','resolution'],['width','width'],['height','height']])$(id).value=state[key];
  $('custom-resolution').hidden=true;layout();
});
$('collapse').addEventListener('click',()=>{const open=$('panel-body').hidden;$('panel-body').hidden=!open;$('collapse').setAttribute('aria-expanded',String(open));$('collapse').setAttribute('aria-label',open?'Plegar controles':'Expandir controles');$('collapse').textContent=open?'−':'+';});
$('help-toggle').addEventListener('click',()=>{const open=$('help').hidden;$('help').hidden=!open;$('help-toggle').setAttribute('aria-expanded',String(open));if(open)$('help').scrollIntoView({block:'nearest',behavior:'smooth'});});
$('fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{setText('interaction-hint','Pantalla completa no disponible en este navegador.');}
});
document.addEventListener('fullscreenchange',()=>{document.body.classList.toggle('immersive',Boolean(document.fullscreenElement));layout();});
async function toggleCapture(){
  if(!renderer)return;
  try{
    if(document.pointerLockElement===canvas){document.exitPointerLock();return;}
    if(!canvas.requestPointerLock)throw new Error('Pointer lock unavailable');
    try{await canvas.requestPointerLock({unadjustedMovement:true});}
    catch(error){if(error.name!=='NotSupportedError')throw error;await canvas.requestPointerLock();}
  }catch{setText('interaction-hint','No se pudo iniciar el control del ratón. Inténtalo de nuevo.');}
}
$('capture').addEventListener('click',toggleCapture);
document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===canvas;
  setText('interaction-hint',locked?'Mueve el ratón · Mantén clic derecho para apuntar':'Iniciar o Espacio para mover la cámara · Mantén clic derecho para apuntar');
  $('capture').textContent=locked?'Detener · Espacio':'Iniciar · Espacio';
  $('capture').setAttribute('aria-pressed',String(locked));
  if(!locked)releaseRightAim();
});
document.addEventListener('pointerlockerror',()=>setText('interaction-hint','No se pudo iniciar el control del ratón. Inténtalo de nuevo.'));
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
  if(e.button!==2||(e.target!==canvas&&document.pointerLockElement!==canvas))return;
  e.preventDefault();
  rightAimHeld=true;
  state.ads=true;
  update();
});
document.addEventListener('mouseup',e=>{if(e.button===2)releaseRightAim();});
document.addEventListener('pointercancel',releaseRightAim);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseRightAim();});
document.addEventListener('keydown',e=>{
  if(e.code!=='Space'||e.repeat||e.target.isContentEditable||['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName))return;
  e.preventDefault();toggleCapture();
});
window.addEventListener('blur',releaseRightAim);
window.addEventListener('resize',layout);
$('resolution').value=state.resolution;
if(window.innerWidth<=760){$('panel-body').hidden=true;$('collapse').setAttribute('aria-expanded','false');$('collapse').setAttribute('aria-label','Expandir controles');$('collapse').textContent='+';}
layout();
function frame(now){
  if(renderer&&(dirty||state.motion)&&now-lastTime>=30){renderer.render({aspect,vertical:state.ads?adsVertical():state.vertical,yaw:state.yaw,pitch:state.pitch,time:now/1000,motion:state.motion});dirty=false;lastTime=now;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Read-only diagnostic snapshot for integration checks and reproducible experiments.
window.sensitivityLab={snapshot:()=>({...state,aspect,referenceAspect,actualHorizontal:horizontalFov(state.ads?adsVertical():state.vertical,aspect),adsVertical:adsVertical(),multiplier:multiplier(),referenceFraction:referenceFraction(state.coefficient,aspect),webgl:Boolean(renderer)})};
