import { TARGETS, CAMERA } from './targets.js';
const scalar=value=>Number(value).toFixed(8);
const vector=value=>`vec3(${value.map(scalar).join(',')})`;
const vertex = `attribute vec2 aPosition;
varying vec2 uv;
void main(){uv=aPosition;gl_Position=vec4(aPosition,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 uv;
uniform float uAspect,uTanFov,uYaw,uPitch,uTime,uMotion,uTargetCount;
float sphere(vec3 ro,vec3 rd,vec3 p,float r){vec3 oc=ro-p;float b=dot(oc,rd);float h=b*b-dot(oc,oc)+r*r;if(h<0.)return 1000.;float t=-b-sqrt(h);return t>0.?t:1000.;}
float box(vec3 ro,vec3 rd,vec3 p,vec3 size){vec3 inv=1./(rd+vec3(.000001));vec3 a=(p-size-ro)*inv;vec3 b=(p+size-ro)*inv;vec3 lo=min(a,b),hi=max(a,b);float near=max(max(lo.x,lo.y),lo.z);float far=min(min(hi.x,hi.y),hi.z);return far>max(near,0.)?max(near,0.):1000.;}
void main(){
 vec3 ro=${vector(CAMERA)};
 vec3 rd=normalize(vec3(uv.x*uAspect*uTanFov,uv.y*uTanFov,-1.));
 float cp=cos(uPitch),sp=sin(uPitch);rd=vec3(rd.x,rd.y*cp-rd.z*sp,rd.y*sp+rd.z*cp);
 float cy=cos(uYaw),sy=sin(uYaw);rd=vec3(rd.x*cy-rd.z*sy,rd.y,rd.x*sy+rd.z*cy);
 vec3 fog=vec3(.26,.105,.10);vec3 color=mix(fog,vec3(.115,.065,.068),smoothstep(-.1,.9,rd.y));float best=250.;
 if(rd.y<-.001){float t=-ro.y/rd.y;if(t<best){best=t;vec3 p=ro+rd*t;vec2 grid=abs(fract(p.xz*.25-.5)-.5)/max(vec2(.006),vec2(t*.00045));float line=1.-min(min(grid.x,grid.y),1.);float lanes=1.-smoothstep(.025,.06,abs(abs(p.x)-8.));color=vec3(.32,.14,.125)+line*vec3(.08,.035,.025)+lanes*vec3(.18,.085,.035);float start=1.-smoothstep(.02,.06,abs(p.z-1.));color+=start*vec3(.18,.09,.04);}}
 float wall=box(ro,rd,vec3(0.,3.,-55.),vec3(24.,3.,.3));if(wall<best){best=wall;vec3 p=ro+rd*wall;float stripe=step(.95,fract(p.x*.25));color=vec3(.36,.15,.13)+stripe*.06;}
 for(int i=0;i<${TARGETS.maxCount};i++){
  if(float(i)>=uTargetCount)break;
  float fi=float(i);float x=mod(fi,${scalar(TARGETS.columns)})*${scalar(TARGETS.spacing)}-5.;float z=${scalar(TARGETS.firstZ)}-floor(fi/${scalar(TARGETS.columns)})*${scalar(TARGETS.depthSpacing)};
  x+=sin(uTime*${scalar(TARGETS.motionSpeed)}+fi*${scalar(TARGETS.motionPhase)})*${scalar(TARGETS.motionAmplitude)}*uMotion;
  z+=cos(uTime*${scalar(TARGETS.motionSpeed)}+fi*${scalar(TARGETS.motionPhase)})*${scalar(TARGETS.depthAmplitude)}*uMotion;
  vec3 center=vec3(x,${scalar(TARGETS.height)},z);
  float board=box(ro,rd,center,${vector(TARGETS.board)});
  if(board<best){best=board;vec3 p=ro+rd*board-center;float ring=length(vec2(p.x,p.y*.8));color=vec3(.69,.50,.36);color=mix(color,vec3(.27,.22,.19),step(.38,ring)*step(ring,.43));color=mix(color,vec3(.84,.73,.51),step(ring,.24));color=mix(color,vec3(.88,.27,.16),step(ring,.095));}
  float head=sphere(ro,rd,center+${vector(TARGETS.headOffset)},${scalar(TARGETS.headRadius)});
  float body=box(ro,rd,center+${vector(TARGETS.bodyOffset)},${vector(TARGETS.body)});
  float target=min(head,body);if(target<best){best=target;vec3 p=ro+rd*target-center;color=vec3(.24,.28,.23)+max(0.,p.y)*.09;float dotmark=length(vec2(p.x,p.y+.08));color=mix(color,vec3(.96,.72,.36),step(dotmark,.065));}
  float post=box(ro,rd,vec3(x,.4,z),vec3(.055,.4,.055));if(post<best){best=post;color=vec3(.28,.23,.19);}
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
  const uniforms = Object.fromEntries(['uAspect','uTanFov','uYaw','uPitch','uTime','uMotion','uTargetCount'].map(name => [name, gl.getUniformLocation(program,name)]));
  let lost = false;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost=true; document.getElementById('webgl-error').hidden=false; });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  return { render({ aspect, vertical, yaw, pitch, time, motion, targetCount=TARGETS.count }) {
    if (lost) return;
    gl.viewport(0,0,canvas.width,canvas.height);
    for (const [name,value] of Object.entries({uAspect:aspect,uTanFov:Math.tan(vertical*Math.PI/360),uYaw:yaw,uPitch:pitch,uTime:time,uMotion:motion?1:0,uTargetCount:targetCount})) gl.uniform1f(uniforms[name],value);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }};
}
