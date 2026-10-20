import { TARGETS, CAMERA, SHOOTING_LINE } from './targets.js';
const scalar=value=>Number(value).toFixed(8);
const vector=value=>`vec3(${value.map(scalar).join(',')})`;
const vertex = `attribute vec2 aPosition;
varying vec2 uv;
void main(){uv=aPosition;gl_Position=vec4(aPosition,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 uv;
uniform float uAspect,uTanFov,uYaw,uPitch,uTime,uMotion,uTargetCount,uColorFill,uTargetScale;
uniform vec3 uCamera;
uniform vec4 uTargetActive[${Math.ceil(TARGETS.maxCount/4)}];
float sphere(vec3 ro,vec3 rd,vec3 p,float r){vec3 oc=ro-p;float b=dot(oc,rd);float h=b*b-dot(oc,oc)+r*r;if(h<0.)return 1000.;float t=-b-sqrt(h);return t>0.?t:1000.;}
float box(vec3 ro,vec3 rd,vec3 p,vec3 size){vec3 inv=1./(rd+vec3(.000001));vec3 a=(p-size-ro)*inv;vec3 b=(p+size-ro)*inv;vec3 lo=min(a,b),hi=max(a,b);float near=max(max(lo.x,lo.y),lo.z);float far=min(min(hi.x,hi.y),hi.z);return far>max(near,0.)?max(near,0.):1000.;}
void main(){
 vec3 ro=uCamera;
 vec3 rd=normalize(vec3(uv.x*uAspect*uTanFov,uv.y*uTanFov,-1.));
 float cp=cos(uPitch),sp=sin(uPitch);rd=vec3(rd.x,rd.y*cp-rd.z*sp,rd.y*sp+rd.z*cp);
 float cy=cos(uYaw),sy=sin(uYaw);rd=vec3(rd.x*cy-rd.z*sy,rd.y,rd.x*sy+rd.z*cy);
 vec3 fog=mix(vec3(.11,.15,.18),vec3(.26,.105,.10),uColorFill);vec3 sky=mix(vec3(.055,.08,.11),vec3(.115,.065,.068),uColorFill);vec3 color=mix(fog,sky,smoothstep(-.1,.9,rd.y));float best=250.;
 if(rd.y<-.001){float t=-ro.y/rd.y;if(t<best){best=t;vec3 p=ro+rd*t;vec2 grid=abs(fract(p.xz*.25-.5)-.5)/max(vec2(.006),vec2(t*.00045));float line=1.-min(min(grid.x,grid.y),1.);float lanes=1.-smoothstep(.025,.06,abs(abs(p.x)-8.));color=mix(vec3(.19,.22,.23),vec3(.32,.14,.125),uColorFill)+line*mix(vec3(.06,.07,.07),vec3(.08,.035,.025),uColorFill)+lanes*mix(vec3(.16,.16,.10),vec3(.18,.085,.035),uColorFill);float start=1.-smoothstep(${scalar(SHOOTING_LINE.width/2-.015)},${scalar(SHOOTING_LINE.width/2)},abs(p.z-${scalar(SHOOTING_LINE.z)}));color=mix(color,vec3(.95,.035,.025),start);}}
 float wall=box(ro,rd,vec3(0.,3.,-55.),vec3(24.,3.,.3));if(wall<best){best=wall;vec3 p=ro+rd*wall;float stripe=step(.95,fract(p.x*.25));color=mix(vec3(.24,.27,.28),vec3(.36,.15,.13),uColorFill)+stripe*.06;}
 for(int i=0;i<${TARGETS.maxCount};i++){
  if(float(i)>=uTargetCount)break;
  vec4 visibility=uTargetActive[i/4];
  float slot=mod(float(i),4.);
  float active=slot<.5?visibility.x:slot<1.5?visibility.y:slot<2.5?visibility.z:visibility.w;
  if(active<.5)continue;
  float fi=float(i);float x=mod(fi,${scalar(TARGETS.columns)})*${scalar(TARGETS.spacing)}-5.;float z=${scalar(TARGETS.firstZ)}-floor(fi/${scalar(TARGETS.columns)})*${scalar(TARGETS.depthSpacing)};
  x+=sin(uTime*${scalar(TARGETS.motionSpeed)}+fi*${scalar(TARGETS.motionPhase)})*${scalar(TARGETS.motionAmplitude)}*uMotion;
  z+=cos(uTime*${scalar(TARGETS.motionSpeed)}+fi*${scalar(TARGETS.motionPhase)})*${scalar(TARGETS.depthAmplitude)}*uMotion;
  vec3 center=vec3(x,${scalar(TARGETS.height)},z);
  float head=sphere(ro,rd,center+${vector(TARGETS.headOffset)}*uTargetScale,${scalar(TARGETS.headRadius)}*uTargetScale);
  float body=box(ro,rd,center+${vector(TARGETS.bodyOffset)}*uTargetScale,${vector(TARGETS.body)}*uTargetScale);
  float target=min(head,body);if(target<best){best=target;color=head<body?vec3(1.,.025,.025):vec3(1.);}

 }
 for(int j=0;j<8;j++){float z=-float(j)*8.-3.;for(int side=0;side<2;side++){float x=side==0?-10.:10.;float t=box(ro,rd,vec3(x,1.,z),vec3(.10,1.,.10));if(t<best){best=t;color=vec3(.39,.27,.20);}float rail=box(ro,rd,vec3(x,.85,z-4.),vec3(.045,.045,4.));if(rail<best){best=rail;color=vec3(.43,.28,.20);}}}
 color=mix(color,fog,1.-exp(-best*.016));
 float vignette=1.-.18*dot(uv,uv);color*=vignette;
 gl_FragColor=vec4(color,1.);
}`;

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return null;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const attr = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['uAspect','uTanFov','uYaw','uPitch','uTime','uMotion','uTargetCount','uColorFill','uTargetScale'].map(name => [name, gl.getUniformLocation(program,name)]));
  const activeUniform=gl.getUniformLocation(program,'uTargetActive[0]');
  const cameraUniform=gl.getUniformLocation(program,'uCamera');
  let lost = false;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost=true; document.getElementById('webgl-error').hidden=false; });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  return { render({ aspect, vertical, yaw, pitch, time, motion, targetCount=TARGETS.count, position=CAMERA, outlinesOnly=false, targetScale=1, activeTargets=Array(TARGETS.maxCount).fill(true) }) {
    if (lost) return;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform3fv(cameraUniform,position);
    gl.uniform4fv(activeUniform,new Float32Array(activeTargets.map(active=>active?1:0)));
    for (const [name,value] of Object.entries({uAspect:aspect,uTanFov:Math.tan(vertical*Math.PI/360),uYaw:yaw,uPitch:pitch,uTime:time,uMotion:motion?1:0,uTargetCount:targetCount,uColorFill:outlinesOnly?0:1,uTargetScale:Math.max(.25,Math.min(2,targetScale))})) gl.uniform1f(uniforms[name],value);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }};
}
