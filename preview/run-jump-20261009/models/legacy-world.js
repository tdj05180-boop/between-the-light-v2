import * as THREE from '../vendor/three.module.min.js';
import {BOXES} from '../flow.js';
import {createLegacyAvatar} from './legacy-avatar.js';
import {ModelSlot} from '../systems/model-slot.js';
export function createLegacyWorld(canvas){
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xe5e8de);
scene.fog=new THREE.Fog(0xe5e8de,40,85);
const camera=new THREE.PerspectiveCamera(38,1,.1,130);
const world=new THREE.Group();scene.add(world);
const hemi=new THREE.HemisphereLight(0xf4f5e5,0x8d9f85,2.3);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe3aa,3.1);sun.position.set(-6,15,8);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.camera.near=.5;sun.shadow.camera.far=45;sun.shadow.normalBias=.035;sun.shadow.bias=-.0003;sun.shadow.radius=4;scene.add(sun);
const fill=new THREE.DirectionalLight(0xd9edf0,.6);fill.position.set(10,8,-5);scene.add(fill);
const mats=new Map();
function mat(c,opts={}){const key=c+JSON.stringify(opts);if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color:c,roughness:.82,...opts}));return mats.get(key)}
function add(geometry,material,x,y,z,parent=world){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function box(w,h,d,c,x,y,z,p=world,opts={}){return add(new THREE.BoxGeometry(w,h,d),mat(c,opts),x,y,z,p)}
function cyl(rt,rb,h,c,x,y,z,p=world,segments=16){return add(new THREE.CylinderGeometry(rt,rb,h,segments),mat(c),x,y,z,p)}
function sphere(r,c,x,y,z,p=world,sx=1,sy=1,sz=1){const m=add(new THREE.SphereGeometry(r,16,12),mat(c),x,y,z,p);m.scale.set(sx,sy,sz);return m}
function ico(r,c,x,y,z,p=world){return add(new THREE.IcosahedronGeometry(r,1),mat(c),x,y,z,p)}
function leaf(x,y,z,s,c,p=world){const m=ico(s,c,x,y,z,p);m.scale.set(1,.6,1);return m}
function torus(r,t,c,x,y,z,p=world){return add(new THREE.TorusGeometry(r,t,8,32),mat(c),x,y,z,p)}
function plane(w,h,c,x,y,z,p=world,opts={}){const m=add(new THREE.PlaneGeometry(w,h),mat(c,{side:THREE.DoubleSide,...opts}),x,y,z,p);return m}
function labelTexture(text,{bg='#eee4c9',fg='#4d6c56',w=512,h=192,size=70}={}){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.font=`600 ${size}px system-ui, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2+2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function sign(text,w,h,x,y,z,opts={},p=world){const tex=labelTexture(text,opts);const m=add(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,roughness:1}),x,y,z,p);return m}
function contact(x,z,rx=.4,rz=.25,opacity=.16,p=world,y=.018){const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');const grd=g.createRadialGradient(32,32,0,32,32,31);grd.addColorStop(0,`rgba(40,48,30,${opacity})`);grd.addColorStop(1,'rgba(40,48,30,0)');g.fillStyle=grd;g.fillRect(0,0,64,64);const m=new THREE.Mesh(new THREE.PlaneGeometry(rx*2,rz*2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);p.add(m);return m}
let seed=713;function rnd(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646}

// A hand-built miniature. Its location and props are deliberately symbolic.
const ground=plane(200,200,0xe3e7dc,0,-.83,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
box(14.1,.42,14.5,0x9bac91,0,-.59,1.05);
box(13.7,.27,14.1,0xc0c9a7,0,-.26,1.05);
box(11.35,.19,8.55,0x9c805d,0,-.045,-.35);
// Individual planks and their warm seams.
for(let row=0;row<17;row++)for(let col=0;col<5;col++){
 const x=-4.48+col*2.24;const z=-4.33+row*.48;
 box(2.215,.05,.458,[0xccb38b,0xd6bd96,0xd1b78e,0xcbb087][(row*3+col)%4],x,.075,z);
}
// Low walls at the front leave the room visible from the camera.
box(11.4,3.35,.23,0xe7e2c8,0,1.7,-4.5);
box(.23,3.35,8.5,0xe4dfc7,-5.65,1.7,-.36);
box(11.45,.94,.12,0x8ca99b,0,.61,-4.33);
box(.12,.94,8.45,0x8ba79a,-5.48,.61,-.36);
box(11.48,.075,.19,0x618275,0,1.12,-4.3);
box(.19,.075,8.48,0x618275,-5.44,1.12,-.36);
box(11.62,.14,.35,0x6c8673,0,3.42,-4.5);
box(.35,.14,8.8,0x6c8673,-5.65,3.42,-.35);
box(.2,.34,8.55,0xb8c4a6,5.65,.28,-.36);
for(let i=0;i<13;i++)box(.028,.78,.08,0x729382,-5.1+i*.85,.6,-4.22);
for(let i=0;i<10;i++)box(.08,.78,.028,0x759585,-5.35,.6,-4+i*.8);
// Back window, glowing afternoon sky, frame, and curtains.
box(2.75,1.72,.12,0x6e8878,-3.52,2.33,-4.28);
box(2.48,1.47,.045,0xc8dfd8,-3.52,2.33,-4.2,world,{emissive:0xa8cabd,emissiveIntensity:.16});
box(.09,1.55,.1,0xf8ecd0,-3.52,2.33,-4.14);
box(2.6,.075,.1,0xf8ecd0,-3.52,2.29,-4.14);
box(2.91,.12,.45,0x718d7b,-3.52,1.47,-4.16);
for(const x of[-4.78,-2.26]){box(.27,1.71,.11,0xddc59c,x,2.34,-4.05);for(let i=0;i<3;i++)box(.035,1.66,.06,0xf1dfbb,x-.09+i*.085,2.34,-3.98)}
// A clock with no claimed historical time.
const clock=cyl(.33,.33,.11,0xb3a281,3.96,2.71,-4.25);clock.rotation.x=Math.PI/2;
const clockFace=cyl(.284,.284,.12,0xeee6ca,3.96,2.71,-4.17);clockFace.rotation.x=Math.PI/2;
box(.022,.17,.02,0x607265,3.96,2.77,-4.09);const hand=box(.12,.022,.02,0x607265,4.01,2.7,-4.09);hand.rotation.z=-.5;
box(2.8,.57,.16,0x496d5b,.4,2.83,-4.25);
sign('2003  /  첫 번째 걸음',2.62,.4,.4,2.84,-4.155,{bg:'#496d5b',fg:'#f1e8c9',size:32,w:768});
// Work desk and the small memory book.
box(2.6,.13,1.35,0x92754f,-3.8,1.08,-2.65);
box(2.47,.1,1.25,0xb5976e,-3.8,1.165,-2.65);
for(const x of[-4.8,-2.8])for(const z of[-3.1,-2.2])box(.13,1.01,.13,0x617b63,x,.55,z);
box(.86,.38,.74,0x799281,-4.56,.78,-2.75);box(.12,.04,.04,0xd2c194,-4.56,.8,-2.36);
const book=new THREE.Group();book.position.set(-3.42,1.26,-2.5);book.rotation.y=-.16;world.add(book);
box(.68,.07,.52,0x506c59,0,0,0,book);box(.64,.025,.48,0xefe2c3,0,.046,0,book);const bookText=sign('2003',.46,.22,0,.063,0,{size:57},book);bookText.rotation.x=-Math.PI/2;
const ringA=torus(.075,.015,0xd7b666,-.14,.072,.13,book);ringA.rotation.x=-Math.PI/2;
const ringB=torus(.075,.015,0xd7b666,-.035,.074,.13,book);ringB.rotation.x=-Math.PI/2;
cyl(.095,.075,.22,0xece0c4,-4.4,1.34,-2.25);const handle=torus(.067,.018,0xece0c4,-4.28,1.34,-2.25);handle.rotation.y=Math.PI/2;
box(.23,.23,.23,0x849c86,-2.9,1.34,-3);for(let i=0;i<3;i++){const pen=cyl(.011,.011,.36,0x667d60,-2.98+i*.075,1.64,-3);pen.rotation.z=.15*(i-1)}
// Shelves for three different shapes.
for(const x of[-1.75,2.95])box(.11,2.1,.67,0x627b66,x,1.13,-3.55);
for(const y of[.4,1.22,2.1])box(4.83,.1,.83,0xb09a71,.6,y,-3.55);
for(const b of BOXES){box(1.23,.03,.64,0xe2d6b3,b.slotX,1.285,-3.51);sign(b.mark,.37,.29,b.slotX,1.56,-3.99,{fg:'#6f7d68',bg:'#dddac2',size:100,w:256,h:192});}
for(let i=0;i<4;i++){const group=new THREE.Group();group.position.set(-1.1+i*.9,2.15,-3.5);world.add(group);box(.36,.38,.38,[0xb3b795,0xb6a985,0xaca78d,0x93aa96][i],0,.2,0,group);box(.37,.04,.39,0xc7bf99,0,.41,0,group)}
// A little stool, notices, and plants make the space feel lived in.
const stool=new THREE.Group();stool.position.set(-4.7,0,-.8);world.add(stool);cyl(.3,.33,.12,0xbba077,0,.56,0,stool);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;box(.07,.53,.07,0x69816c,Math.sin(a)*.2,.27,Math.cos(a)*.2,stool)}
box(.075,.92,1.3,0xba9b6e,-5.46,2.37,.1);for(let i=0;i<3;i++){const p=plane(.36,.45,0xe9dfbe,-5.405,2.36+(i===1?.14:0),-.33+i*.4);p.rotation.y=Math.PI/2}
function plant(x,z,scale=1,c=0x769475){const g=new THREE.Group();g.position.set(x,.12,z);g.scale.setScalar(scale);world.add(g);cyl(.27,.2,.42,0xc69370,0,.21,0,g);cyl(.255,.255,.05,0x766249,0,.44,0,g);for(let i=0;i<8;i++){const a=i*2.4;const l=leaf(Math.sin(a)*.23,.62+i*.045,Math.cos(a)*.21,.25,c,g);l.rotation.z=Math.sin(a)*.7}contact(x,z,.5*scale,.35*scale);return g}
plant(-4.85,.5,1.1);plant(4.85,3.35,1.2,0x859967);plant(-4.8,3.35,.9,0x92a96b);
// A lantern whose warm light is the chapter's visual turning point.
const lantern=new THREE.Group();lantern.position.set(4.6,1.05,-2.9);world.add(lantern);
box(.66,.91,.65,0x98aa8c,4.6,.56,-2.9);box(.76,.07,.75,0xc4b08c,4.6,1.04,-2.9);
cyl(.22,.25,.08,0x5b7563,0,.05,0,lantern);
const glass=add(new THREE.CylinderGeometry(.165,.18,.39,12),mat(0xcbb681,{transparent:true,opacity:.55}),0,.29,0,lantern);
cyl(.28,.12,.2,0x657c5d,0,.58,0,lantern);cyl(.075,.075,.1,0x657c5d,0,.7,0,lantern);
const lanternHandle=torus(.13,.02,0x657c5d,0,.83,0,lantern);
for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;box(.025,.45,.025,0x657c5d,Math.cos(a)*.16,.3,Math.sin(a)*.16,lantern)}
const bulb=add(new THREE.SphereGeometry(.095,12,10),new THREE.MeshBasicMaterial({color:0xd6c385}),0,.27,0,lantern);
const lampLight=new THREE.PointLight(0xffc566,0,9,1.65);lampLight.position.set(4.6,1.57,-2.65);scene.add(lampLight);
// Cutaway porch and a small sun-washed path.
for(const x of[-5.52,5.52]){box(.2,2.93,.2,0x748e77,x,1.55,3.72);box(.4,.13,.4,0xadc1a3,x,.19,3.72)}
box(11.5,.22,.28,0x708971,0,3.07,3.72);
for(let i=0;i<16;i++)box(.7,.1,.9,i%2?0x9caf94:0xe3d9ba,-5.25+i*.7,3.21,3.91);
for(let i=0;i<7;i++){
 const z=4.12+i*.47;
 for(let j=0;j<3;j++){const p=box(.82,.065,.42,[0xdad9bc,0xd5d1b0,0xe0d9bc][(i+j)%3],-.88+j*.88,.02,z);p.rotation.y=(rnd()-.5)*.05}
}
// Paved apron surrounding the path.
for(let i=0;i<11;i++)for(let j=0;j<3;j++){const x=-5.0+i;const z=4.38+j*.58;if(Math.abs(x)<1.35)continue;box(.965,.065,.55,0xc6cbb0,x,-.005,z)}
// Bench outside.
for(let i=0;i<3;i++)box(2,.07,.18,0xa5926c,-3.8,.65,5.02+i*.2);
for(const x of[-4.55,-3.05]){box(.09,.6,.58,0x6b8166,x,.31,5.22);box(.09,.54,.08,0x6b8166,x,.88,4.98)}
box(2,.16,.07,0xa5926c,-3.8,.95,4.98);box(2,.16,.07,0xa5926c,-3.8,1.16,4.98);
function tree(x,z,scale=1){const g=new THREE.Group();g.position.set(x,-.05,z);g.scale.setScalar(scale);world.add(g);cyl(.42,.35,.38,0xc5bc95,0,.2,0,g);cyl(.1,.15,1.55,0x8c8261,0,1,0,g);for(let i=0;i<7;i++){const a=i*2.4;const m=ico(.64,[0x879e72,0x91a976,0x779769][i%3],Math.sin(a)*.35,1.95+rnd()*.6,Math.cos(a)*.33,g);m.scale.y=1.12}return g}
const trees=[tree(4.8,5.4,1.05),tree(-6.25,-3.2,.9),tree(6.25,-3.2,.9)];
for(let i=0;i<50;i++){const x=(rnd()-.5)*13;const z=6.8+rnd()*.9;if(Math.abs(x)<1.7)continue;const g=new THREE.Group();g.position.set(x,-.05,z);world.add(g);for(let k=0;k<3;k++){const b=add(new THREE.ConeGeometry(.04,.19,3),mat(0x7f9870),k*.08,.13,0,g);b.rotation.z=(k-1)*.3}if(i%4===0)sphere(.04,0xf1dcaa,x,.22,z)}
for(const x of[-1.7,1.7]){const post=cyl(.06,.06,.8,0x819176,x,.43,6.8);sphere(.11,0xccb985,x,.91,6.8)}
// Little stones and flowers along the island edges.
for(let i=0;i<22;i++){const x=(i%2?-1:1)*(5.92+rnd()*.35),z=-4+rnd()*10;const s=ico(.09+rnd()*.09,0xb7c1a7,x,-.015,z);s.scale.y=.5}

function makeCrate(b){const g=new THREE.Group();g.position.set(b.x,.39,b.z);world.add(g);box(.65,.58,.59,0xc29d6f,0,0,0,g);box(.665,.045,.6,0xdbc196,0,.3,0,g);box(.11,.025,.605,0xeee0b8,0,.332,0,g);box(.11,.55,.012,0xe0c99a,0,0,.302,g);for(const x of[-.28,.28])box(.055,.58,.017,0xaa865d,x,0,.312,g);sign(b.mark,.23,.23,.135,.055,.325,{fg:'#f5edcd',bg:'#'+b.color.toString(16).padStart(6,'0'),size:100,w:256,h:256},g);return g}
const crates=BOXES.map(makeCrate);
const crateShadows=BOXES.map(b=>contact(b.x,b.z,.6,.45,.25));

// Soft, low-poly, fully articulated character.
const {avatar,avatarShadow,carryAnchor,playerView}=createLegacyAvatar({world,add,mat,box,sphere,contact});
const waypointMaterial=new THREE.MeshBasicMaterial({color:0xeed38b,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false});
const waypoint=new THREE.Mesh(new THREE.RingGeometry(.48,.56,40),waypointMaterial);waypoint.rotation.x=-Math.PI/2;waypoint.position.set(0,.09,6.7);world.add(waypoint);waypoint.visible=false;
const goalBeam=new THREE.Mesh(new THREE.CylinderGeometry(.22,.52,2.4,32,1,true),new THREE.MeshBasicMaterial({color:0xffd782,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false}));goalBeam.position.set(0,1.24,6.7);goalBeam.visible=false;world.add(goalBeam);
// Small dust motes, not textures or downloaded assets.
const count=75,positions=new Float32Array(count*3);for(let i=0;i<count;i++){positions[i*3]=(rnd()-.5)*11;positions[i*3+1]=rnd()*3.7;positions[i*3+2]=(rnd()-.5)*8}
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({size:.025,color:0xffffd6,transparent:true,opacity:.42,depthWrite:false}));world.add(dust);


// Clone wall materials so fading does not affect other props of the same color.
const cutawayBack=[],cutawayLeft=[];
for(const m of [...world.children]){if(!m.isMesh||m.position.y<.2)continue;const back=m.position.z< -4.07;const left=m.position.x< -5.32&&m.position.z<3.7;if(back||left){m.material=m.material.clone();if(back)cutawayBack.push(m);else cutawayLeft.push(m)}}

const props=new Map();
for(const [id,root] of [['memory',book],['light',lantern],...crates.map((g,i)=>['crate'+i,g])]){
 const visual=new THREE.Group();for(const child of [...root.children])visual.add(child);
 props.set(id,new ModelSlot(root,{object:visual}));
}
let lampIntensity=0;
function updateAmbient({dt,elapsed,warmth,currentYaw}){
 lampIntensity=THREE.MathUtils.lerp(lampIntensity,warmth,dt*1.8);lampLight.intensity=lampIntensity*(12+Math.sin(elapsed*8)*.22);bulb.material.color.setHex(lampIntensity>.1?0xffe09a:0xd6c385);glass.material.emissive.setHex(0xffb43e);glass.material.emissiveIntensity=lampIntensity*.65;
 sun.intensity=3.1+lampIntensity*.35;waypoint.rotation.z=elapsed*.35;waypointMaterial.opacity=.42+Math.sin(elapsed*2)*.18;goalBeam.material.opacity=.07+Math.sin(elapsed*2)*.025;
 trees.forEach((tr,i)=>tr.rotation.z=Math.sin(elapsed*.9+i)*.008);dust.rotation.y=Math.sin(elapsed*.04)*.05;dust.position.y=Math.sin(elapsed*.15)*.09;
 const backOpacity=Math.cos(currentYaw)<.05?.19:1,sideOpacity=Math.sin(currentYaw)<-.05?.16:1;
 for(const [walls,opacity] of [[cutawayBack,backOpacity],[cutawayLeft,sideOpacity]])for(const wall of walls){wall.material.opacity=opacity;wall.material.transparent=opacity<1;wall.material.depthWrite=opacity===1;wall.castShadow=opacity===1;}

 props.get('light')?.update({elapsed,warmth:lampIntensity});
}
function updatePlayerHeight(dt){avatar.position.y=THREE.MathUtils.lerp(avatar.position.y,avatar.position.z>3.8?.04:.11,dt*10);avatarShadow.position.set(avatar.position.x,avatar.position.z>3.8?.049:.112,avatar.position.z);}
return {updateAmbient,updatePlayerHeight,renderer,scene,camera,world,avatar,avatarShadow,carryAnchor,playerView,props,crates,crateShadows,waypoint,goalBeam,waypointMaterial,dust,trees,sun,bulb,glass,lampLight,cutawayBack,cutawayLeft,add,rnd};
}
