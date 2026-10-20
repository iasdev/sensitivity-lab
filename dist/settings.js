import { verticalFov } from './math.js';

export const SETTINGS_KEY='sensitivity-lab.settings.v1';
const ranges={vertical:[verticalFov(30,16/9),verticalFov(160,16/9)],zoom:[1,8],coefficient:[0,300],sensitivity:[0,200],targetCount:[1,24],targetSpeed:[0,4],respawnDelay:[.1,30],shotInterval:[50,5000],targetScale:[.25,2],fpsCap:[30,360],movementSpeed:[0,12],sessionDuration:[0,300],width:[320,7680],height:[240,4320]};
const integers=new Set(['shotInterval','fpsCap','sensitivity','targetCount','sessionDuration','width','height']);
const booleans=['usa','relative','motion','outlinesOnly','despawnOnHit'];
const resolutions=['1920x1080','2560x1440','1920x1200','1440x1080','3440x1440','screen','custom'];

export function sanitizeSettings(input,defaults){
  const data=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  const result={};
  for(const [key,[min,max]] of Object.entries(ranges)){
    const value=typeof data[key]==='number'&&Number.isFinite(data[key])?data[key]:defaults[key];
    result[key]=Math.max(min,Math.min(max,integers.has(key)?Math.round(value):value));
  }
  for(const key of booleans)result[key]=typeof data[key]==='boolean'?data[key]:defaults[key];
  result.resolution=resolutions.includes(data.resolution)?data.resolution:defaults.resolution;
  if(!['screen','custom'].includes(result.resolution))[result.width,result.height]=result.resolution.split('x').map(Number);
  return result;
}
export function loadSettings(defaults){
  try{
    const stored=JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return sanitizeSettings(stored?.version===1?stored.settings:null,defaults);
  }catch{return sanitizeSettings(null,defaults);}
}
let previousSaved=null;
export function saveSettings(state){
  const keys=[...Object.keys(ranges),...booleans,'resolution'];
  const payload=JSON.stringify({version:1,settings:Object.fromEntries(keys.map(key=>[key,state[key]]))});
  if(payload===previousSaved)return true;
  try{localStorage.setItem(SETTINGS_KEY,payload);previousSaved=payload;return true;}catch{return false;}
}
