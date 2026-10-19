import { horizontalFov, verticalFov, zoomFov, usaMultiplier, referenceFraction, radians } from './math.js';
import { createRenderer } from './renderer.js';

const $ = id => document.getElementById(id);
const initial = { vertical: 70, zoom: 2, coefficient: 133, sensitivity: 10, usa: true, relative: true, ads: false, motion: false, resolution: 'screen', width:1920, height:1080 };
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
  const hfov=horizontalFov(state.vertical,aspect);
  $('hfov').min=horizontalFov(20,aspect).toFixed(2);$('hfov').max=horizontalFov(120,aspect).toFixed(2);
  $('hfov').value=hfov;$('vfov').value=state.vertical;
  setText('hfov-value',`${hfov.toFixed(1)}°`);setText('vfov-value',`${state.vertical.toFixed(1)}°`);
  setText('zoom-value',`${state.zoom.toFixed(2)}×`);setText('coefficient-value',`${state.coefficient.toFixed(1).replace('.0','')}%`);
  setText('sensitivity-value',`${state.sensitivity.toFixed(1)}° / 100 px`);
  const activeVertical=state.ads?adsVertical():state.vertical;
  setText('actual-fov',`${horizontalFov(activeVertical,aspect).toFixed(1)}° / ${activeVertical.toFixed(1)}°`);
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
  document.querySelectorAll('[data-coefficient]').forEach(button=>button.classList.toggle('active',Math.abs(state.coefficient-(button.dataset.coefficient==='edge'?edge:Number(button.dataset.coefficient)))<.15));
  setText('view-state',state.ads?'APUNTANDO / ADS':'DESDE LA CADERA');
  dirty=true;
}
for(const [id,key] of [['vfov','vertical'],['zoom','zoom'],['coefficient','coefficient'],['sensitivity','sensitivity']]) $(id).addEventListener('input',e=>{state[key]=Number(e.target.value);update();});
$('hfov').addEventListener('input',e=>{state.vertical=verticalFov(Number(e.target.value),aspect);update();});
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
$('reset-view').addEventListener('click',()=>{state.yaw=0;state.pitch=0;dirty=true;});
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
$('capture').addEventListener('click',async()=>{
  try{
    if(document.pointerLockElement===canvas){document.exitPointerLock();return;}
    if(!canvas.requestPointerLock)throw new Error('Pointer lock unavailable');
    await canvas.requestPointerLock();
  }catch{setText('interaction-hint','No se pudo iniciar el control del ratón. Inténtalo de nuevo.');}
});
document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===canvas;
  setText('interaction-hint',locked?'Mueve el ratón · Mantén clic derecho para apuntar':'Pulsa Iniciar para mover la cámara · Mantén clic derecho para apuntar');
  $('capture').textContent=locked?'Detener · Esc':'Iniciar';
  $('capture').setAttribute('aria-pressed',String(locked));
  if(!locked)releaseRightAim();
});
document.addEventListener('pointerlockerror',()=>setText('interaction-hint','No se pudo iniciar el control del ratón. Inténtalo de nuevo.'));
let rightAimHeld=false;
function releaseRightAim(){if(!rightAimHeld)return;rightAimHeld=false;state.ads=false;update();}
function move(dx,dy){const sensitivity=radians(state.sensitivity/100)*(state.ads?multiplier():1);state.yaw+=dx*sensitivity;state.pitch=Math.max(-1.45,Math.min(1.45,state.pitch-dy*sensitivity));dirty=true;}
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
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();state.ads=!state.ads;update();}});
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
window.sensitivityLab={snapshot:()=>({...state,aspect,adsVertical:adsVertical(),multiplier:multiplier(),referenceFraction:referenceFraction(state.coefficient,aspect),webgl:Boolean(renderer)})};
