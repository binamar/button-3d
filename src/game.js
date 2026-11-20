import*as T from'three';
import{EffectComposer,RenderPass,EffectPass,BloomEffect,ToneMappingEffect,ToneMappingMode}from'postprocessing';
import{RoomEnvironment}from'three/examples/jsm/environments/RoomEnvironment.js';
const M=['###############','#.....#.......#','#..........B..#','#.....#.......#','##.############','#.....#.......#','#.....#.......#','#.............#','#.....#.......#','#.....#.......#','#######.#######'];
const C=3,H=3.2,R=M.length,K=M[0].length,W=K*C,D=R*C;
const $=i=>document.getElementById(i),P=(c,r)=>[(c+.5)*C,(r+.5)*C];
const S=o=>new T.MeshStandardMaterial(o);
const TL=new T.TextureLoader();
const pbr=(n,mat,rx,ry)=>{for(const s of'dnr')TL.load('tex/'+n+'-'+s+'.jpg',t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=8;
 if(s=='d'){t.colorSpace=T.SRGBColorSpace;mat.map=t;mat.color.set(0xffffff)}else if(s=='n'){mat.normalMap=t;mat.bumpMap=null}else{mat.roughnessMap=t;mat.roughness=1}mat.needsUpdate=true},undefined,()=>{})};

// ---- procedural textures
const cv=(n,f)=>{const c=document.createElement('canvas');c.width=c.height=n;f(c.getContext('2d'),n);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t};
const grain=(g,n,a)=>{const d=g.getImageData(0,0,n,n),p=d.data;for(let i=0;i<p.length;i+=4){const v=(Math.random()-.5)*a;p[i]+=v;p[i+1]+=v;p[i+2]+=v}g.putImageData(d,0,0)};
const blot=(g,n,k,col)=>{for(let i=0;i<k;i++){g.fillStyle=col;g.globalAlpha=.05+Math.random()*.08;g.beginPath();g.arc(Math.random()*n,Math.random()*n,8+Math.random()*40,0,7);g.fill()}g.globalAlpha=1};
const conc=cv(256,(g,n)=>{g.fillStyle='#8c8e91';g.fillRect(0,0,n,n);blot(g,n,40,'#000');blot(g,n,25,'#fff');g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=3;g.strokeRect(0,0,n,n);grain(g,n,38)});
const tile=cv(256,(g,n)=>{g.fillStyle='#6b6f75';g.fillRect(0,0,n,n);blot(g,n,30,'#000');g.strokeStyle='#2c2e32';g.lineWidth=4;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*n/4,0);g.lineTo(i*n/4,n);g.moveTo(0,i*n/4);g.lineTo(n,i*n/4);g.stroke()}grain(g,n,30)});
tile.repeat.set(W/6,D/6);
const asph=cv(256,(g,n)=>{g.fillStyle='#6a6a6e';g.fillRect(0,0,n,n);blot(g,n,30,'#000');blot(g,n,12,'#fff');grain(g,n,45)});
asph.repeat.set(60,60);

// ---- renderer / scene
const cvs=$('c'),ren=new T.WebGLRenderer({canvas:cvs,antialias:true,powerPreference:'high-performance'});
ren.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=1.15;
ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene(),cam=new T.PerspectiveCamera(70,1,.1,300);
scene.fog=new T.Fog(new T.Color().setRGB(.30,.16,.14),30,120);
scene.environment=new T.PMREMGenerator(ren).fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.25;
let comp=null;const rs=()=>{ren.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();if(comp)comp.setSize(innerWidth,innerHeight)};
addEventListener('resize',rs);rs();

// sky shader
const sky=new T.Mesh(new T.SphereGeometry(150,16,10),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
vertexShader:`varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
fragmentShader:`varying vec3 p;void main(){float h=clamp(p.y,0.,1.);vec3 c=mix(vec3(.30,.16,.14),vec3(.015,.025,.07),pow(h,.5));c+=vec3(.9,.35,.12)*pow(max(dot(p,normalize(vec3(.5,.12,-.8))),0.),24.)*.7;gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`}));
sky.frustumCulled=false;scene.add(sky);

// sun + ambient
const sun=new T.DirectionalLight(0xffb27a,8);
sun.position.set(W/2+45,26,D/2-70);sun.target.position.set(W/2,0,D/2);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:20,far:170});
sun.shadow.bias=-.0004;sun.shadow.normalBias=.05;
scene.add(sun,sun.target,new T.HemisphereLight(0x8aa0d0,0x40302a,.9));

// ---- geometry
const gm=S({map:asph,roughness:.95});pbr('ground',gm,50,50);const ground=new T.Mesh(new T.PlaneGeometry(300,300),gm);
ground.rotation.x=-Math.PI/2;ground.position.set(W/2,-.02,D/2);ground.receiveShadow=true;scene.add(ground);
const fm=S({map:tile,roughness:.55,metalness:.1});pbr('floor',fm,W/3,D/3);const floor=new T.Mesh(new T.PlaneGeometry(W,D),fm);
floor.rotation.x=-Math.PI/2;floor.position.set(W/2,0,D/2);floor.receiveShadow=true;scene.add(floor);
const pt=tile.clone();pt.repeat.set(1,4);pt.needsUpdate=true;
const path=new T.Mesh(new T.PlaneGeometry(C*2,24),S({map:pt,roughness:.6}));
path.rotation.x=-Math.PI/2;path.position.set(P(7,0)[0],.01,D+12);path.receiveShadow=true;scene.add(path);

const wm=S({map:conc,bumpMap:conc,bumpScale:.6,roughness:.92,color:0xc8cacd});
pbr('wall',wm,2,2);
const wc=[];M.forEach((row,r)=>[...row].forEach((ch,c)=>{if(ch=='#')wc.push([c,r])}));
const walls=new T.InstancedMesh(new T.BoxGeometry(C,H,C),wm,wc.length),m4=new T.Matrix4();
wc.forEach(([c,r],i)=>{m4.setPosition((c+.5)*C,H/2,(r+.5)*C);walls.setMatrixAt(i,m4)});
walls.castShadow=walls.receiveShadow=true;scene.add(walls);
const lint=new T.Mesh(new T.BoxGeometry(C,H-2.4,C),wm);lint.position.set(P(7,10)[0],2.4+(H-2.4)/2,P(7,10)[1]);lint.castShadow=true;scene.add(lint);
const rf=conc.clone();rf.repeat.set(K,R);rf.needsUpdate=true;
const rfm=S({map:rf,roughness:1,color:0x999999});pbr('wall',rfm,K*1.5,R*1.5);const roof=new T.Mesh(new T.BoxGeometry(W,.3,D),rfm);
roof.position.set(W/2,H+.15,D/2);roof.castShadow=roof.receiveShadow=true;scene.add(roof);

// colliders [x,z,halfX,halfZ]
const boxes=[];
const crateM=S({map:conc,bumpMap:conc,bumpScale:.5,color:0x9a7a4a,roughness:.85});
[[11.5,8.5,1.4],[12.8,8.7,1],[2.5,8.4,1.5],[3.7,8.8,1.1],[2,1.6,1.3],[9.2,1.5,1.2],[4.5,5.6,1.2]].forEach(([c,r,s])=>{
 const m=new T.Mesh(new T.BoxGeometry(s,s*.9,s),crateM);m.position.set(c*C,s*.45,r*C);m.castShadow=m.receiveShadow=true;scene.add(m);boxes.push([c*C,r*C,s/2,s/2])});

// lights
const lights=[[3,2,0xffd9a8],[10,1.5,0xffd9a8],[3,7,0xbfe0ff],[10,7,0xffd9a8]].map(([c,r,col])=>{
 const[x,z]=P(c,r),l=new T.PointLight(col,38,11,2);l.position.set(x,H-.3,z);scene.add(l);
 const pn=new T.Mesh(new T.BoxGeometry(1.4,.06,.7),new T.MeshBasicMaterial({color:col}));pn.position.set(x,H-.05,z);scene.add(pn);return l});
{const x=P(7,0)[0]+3.5,z=D+2.5,pole=new T.Mesh(new T.CylinderGeometry(.06,.06,3.2,8),S({color:0x222428,metalness:.6,roughness:.5}));
 pole.position.set(x,1.6,z);pole.castShadow=true;scene.add(pole);
 const b=new T.Mesh(new T.SphereGeometry(.18,10,8),new T.MeshBasicMaterial({color:0xfff0c0}));b.position.set(x,3.3,z);scene.add(b);
 const l=new T.PointLight(0xffd9a0,30,14,2);l.position.set(x,3.2,z);scene.add(l)}

// button + pedestal
const[bx,bz]=P(11,2);
const ped=new T.Mesh(new T.CylinderGeometry(.5,.6,1,20),S({color:0x3a3d44,roughness:.45,metalness:.6}));ped.position.set(bx,.5,bz);ped.castShadow=true;scene.add(ped);
boxes.push([bx,bz,.6,.6]);
const ring=new T.Mesh(new T.TorusGeometry(.36,.04,8,24),S({color:0x999ea8,metalness:.9,roughness:.3}));ring.rotation.x=Math.PI/2;ring.position.set(bx,1.02,bz);scene.add(ring);
const bm=new T.ShaderMaterial({uniforms:{t:{value:0},k:{value:0}},
vertexShader:`varying vec3 n,v;void main(){n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);v=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
fragmentShader:`uniform float t,k;varying vec3 n,v;void main(){float f=pow(1.-max(dot(normalize(n),normalize(v)),0.),2.5);vec3 c=mix(vec3(.9,.05,.04),vec3(.1,.9,.3),k);float p=.75+.25*sin(t*4.);gl_FragColor=vec4(c*(.55+f*1.2)*p+f*c*.6,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
const btn=new T.Mesh(new T.CylinderGeometry(.3,.3,.2,24),bm);btn.position.set(bx,1.1,bz);scene.add(btn);
const rl=new T.PointLight(0xff2a20,10,7,2);rl.position.set(bx,1.7,bz);scene.add(rl);

// dust
const dp=new Float32Array(420);for(let i=0;i<140;i++){dp[i*3]=Math.random()*W;dp[i*3+1]=.3+Math.random()*2.6;dp[i*3+2]=Math.random()*D}
const dg=new T.BufferGeometry();dg.setAttribute('position',new T.BufferAttribute(dp,3));
const dust=new T.Points(dg,new T.PointsMaterial({size:.05,color:0xffe3b8,transparent:true,opacity:.45,depthWrite:false}));scene.add(dust);

// ---- audio
let ac;
const aud=()=>{try{ac=new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.type='sawtooth';o.frequency.value=55;g.gain.value=.012;o.connect(g);g.connect(ac.destination);o.start()}catch(e){}};
const beep=(f,t,d)=>{if(!ac)return;const o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime+t;o.frequency.value=f;g.gain.setValueAtTime(.25,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);g.connect(ac.destination);o.start(n);o.stop(n+d)};

// ---- player / input
const pl={x:P(7,0)[0],z:D+9,yaw:0,pitch:0};
let started=0,done=0,pk=0,near=0,hint='';
const hit=(x,z)=>{const q=.32;for(const[dx,dz]of[[-q,-q],[q,-q],[-q,q],[q,q]]){const c=Math.floor((x+dx)/C),r=Math.floor((z+dz)/C);if(r>=0&&r<R&&c>=0&&c<K&&M[r][c]=='#')return 1}
 for(const b of boxes)if(Math.abs(x-b[0])<b[2]+q&&Math.abs(z-b[1])<b[3]+q)return 1;return 0};
const key={};
addEventListener('keydown',e=>{key[e.code]=1;if(e.code=='KeyE')press()});
addEventListener('keyup',e=>key[e.code]=0);
let jid=-1,lid=-1,jx=0,jy=0,lx=0,ly=0;const jb=$('joy'),st=$('stick');
const joy=e=>{const r=jb.getBoundingClientRect(),m=45;let dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;const l=Math.hypot(dx,dy);if(l>m){dx*=m/l;dy*=m/l}jx=dx/m;jy=-dy/m;st.style.transform=`translate(${dx}px,${dy}px)`};
addEventListener('pointerdown',e=>{if(!started||done||e.target.closest('#act'))return;
 if(jb.contains(e.target)||(e.clientX<innerWidth*.4&&e.clientY>innerHeight*.45)){if(jid<0){jid=e.pointerId;joy(e)}}
 else if(lid<0){lid=e.pointerId;lx=e.clientX;ly=e.clientY}});
addEventListener('pointermove',e=>{if(e.pointerId==jid)joy(e);else if(e.pointerId==lid){pl.yaw-=(e.clientX-lx)*.0055;pl.pitch=Math.max(-1.2,Math.min(1.2,pl.pitch-(e.clientY-ly)*.0055));lx=e.clientX;ly=e.clientY}});
const up=e=>{if(e.pointerId==jid){jid=-1;jx=jy=0;st.style.transform=''}if(e.pointerId==lid)lid=-1};
addEventListener('pointerup',up);addEventListener('pointercancel',up);
$('act').addEventListener('pointerdown',e=>{e.preventDefault();press()});
$('go').onclick=()=>{$('start').style.display='none';document.body.classList.add('on');aud();started=1};

function press(){if(!started||done||Math.hypot(pl.x-bx,pl.z-bz)>2.6)return;done=1;rl.color.set(0x30ff70);beep(660,0,.25);beep(990,.18,.45);$('act').style.display='none';setTimeout(finish,1600)}
function finish(){ren.setAnimationLoop(null);$('end').classList.add('show');if(ac)ac.close()}

// ---- loop
const clk=new T.Clock();let gt=0,gn=0,gs=0,warm=2,bob=0;
function frame(){
 const dt=Math.min(clk.getDelta(),.05),t=clk.elapsedTime;
 let ml=0;
 if(started&&!done){
  let mx=jx+(key.KeyD||key.ArrowRight?1:0)-(key.KeyA||key.ArrowLeft?1:0),my=jy+(key.KeyW||key.ArrowUp?1:0)-(key.KeyS||key.ArrowDown?1:0);
  ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml;ml=1}
  const s=Math.sin(pl.yaw),c=Math.cos(pl.yaw),v=3.6*dt,vx=(-s*my+c*mx)*v,vz=(-c*my-s*mx)*v;
  if(!hit(pl.x+vx,pl.z))pl.x+=vx;if(!hit(pl.x,pl.z+vz))pl.z+=vz;
  pl.x=Math.max(-40,Math.min(W+40,pl.x));pl.z=Math.max(-40,Math.min(D+45,pl.z));
  bob+=dt*9*ml;
  const n=Math.hypot(pl.x-bx,pl.z-bz)<2.4?1:0;if(n!=near){near=n;$('act').style.display=n?'block':'none'}
  const h=pl.z>D-.5?'ادخل المبنى':n?'اضغط الزر!':'ابحث عن الزر الأحمر';if(h!=hint){hint=h;$('hud').textContent=h}
 }
 if(done){pk=Math.min(1,pk+dt*3);btn.position.y=1.1-.1*Math.sin(pk*Math.PI/2);bm.uniforms.k.value=pk}
 else rl.intensity=8+4*Math.sin(t*4);
 bm.uniforms.t.value=t;
 lights[2].intensity=38*(.9+.1*Math.sin(t*31)*Math.sin(t*3.7));
 dust.position.set(Math.sin(t*.2)*.4,Math.sin(t*.35)*.15,Math.cos(t*.17)*.4);
 cam.position.set(pl.x,1.6+Math.sin(bob)*.035,pl.z);cam.rotation.set(pl.pitch,pl.yaw,0,'YXZ');
 sky.position.copy(cam.position);
 comp.render(dt);
 // simple perf governor
 if(started&&(warm-=dt)<0){gt+=dt;gn++;if(gt>2){const f=gn/gt;gt=gn=0;if(f<38&&gs<2){
  if(gs==0){sun.shadow.map&&sun.shadow.map.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(1024,1024)}else{ren.setPixelRatio(1);rs()}
  gs++}}}
}
comp=new EffectComposer(ren,{multisampling:4});comp.addPass(new RenderPass(scene,cam));comp.addPass(new EffectPass(cam,new BloomEffect({intensity:.5,luminanceThreshold:.6,luminanceSmoothing:.3,mipmapBlur:true}),new ToneMappingEffect({mode:ToneMappingMode.ACES_FILMIC})));rs();ren.setAnimationLoop(frame);
