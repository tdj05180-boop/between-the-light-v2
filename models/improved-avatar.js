import * as T from '../vendor/three.module.min.js';
import {disposeObject} from './resources.js';
import {bevelBox,material,mesh,modelMetrics} from './pastel-shapes.js';
import {batchStatic} from './static-batch.js';
export function createImprovedAvatar(){
 const object=new T.Group(),body=new T.Group();object.add(body);object.name='PastelHuman';body.position.y=-.048;
 const palette={coat:material(0x52776b),edge:material(0x395f53),shirt:material(0xe9dcc2),skin:material(0xd9ae88),hair:material(0x493c32,{flatShading:true}),pants:material(0x777565),shoe:material(0x4f584b),sole:material(0xc4bea7),face:material(0x423e35),lip:material(0xa97760)};
 const box=(p,w,h,d,m,x,y,z,r=.015)=>mesh(p,bevelBox(w,h,d,r),m,x,y,z);
 const ellipsoid=(p,r,m,x,y,z,sx=1,sy=1,sz=1,segments=12)=>{const a=mesh(p,new T.SphereGeometry(r,segments,8),m,x,y,z);a.scale.set(sx,sy,sz);return a};
 const cylinder=(p,top,bottom,h,m,x,y,z)=>mesh(p,new T.CylinderGeometry(top,bottom,h,10),m,x,y,z);
 const torso=cylinder(body,.223,.185,.47,palette.coat,0,1.115,0);torso.scale.z=.67;
 box(body,.29,.14,.22,palette.pants,0,.84,0);box(body,.32,.045,.24,palette.edge,0,.905,0);
 box(body,.168,.37,.023,palette.shirt,0,1.135,.145);
 for(const side of [-1,1]){const collar=box(body,.10,.13,.035,palette.edge,side*.093,1.302,.16);collar.rotation.z=side*.32;box(body,.077,.09,.022,palette.edge,side*.15,1.13,.154);box(body,.085,.016,.029,palette.coat,side*.15,1.176,.16)}
 for(let y=.99;y<1.27;y+=.083)ellipsoid(body,.012,palette.sole,.024,y,.17,1,1,.5,6);
 cylinder(body,.068,.07,.095,palette.skin,0,1.4,0);
 const head=new T.Group();head.position.set(0,1.60,0);body.add(head);
 ellipsoid(head,.175,palette.skin,0,0,0,1,1.19,.94);
 const hair=mesh(head,new T.SphereGeometry(.182,12,6,0,Math.PI*2,0,Math.PI*.5),palette.hair,0,.065,-.015);hair.scale.set(1,1.05,1);
 for(let i=0;i<4;i++){const lock=box(head,.09,.062,.105,palette.hair,-.106+i*.068,.12+Math.sin(i*.7)*.017,.118);lock.rotation.z=-.12+i*.055}
 for(const side of [-1,1]){ellipsoid(head,.036,palette.skin,side*.17,-.007,-.015,.62,1,.77,8);ellipsoid(head,.013,palette.face,side*.062,.009,.159,.85,1,.40,8);const brow=box(head,.040,.011,.010,palette.hair,side*.062,.048,.16,.003);brow.rotation.z=-side*.08}
 box(head,.039,.052,.041,palette.skin,0,-.032,.163,.009);box(head,.043,.008,.009,palette.lip,0,-.092,.153,.002);
 const arms=[],legs=[],hands=[];
 for(const side of [-1,1]){
  const shoulder=new T.Group();shoulder.position.set(side*.247,1.265,0);body.add(shoulder);
  cylinder(shoulder,.078,.070,.265,palette.coat,0,-.127,0);
  const elbow=new T.Group();elbow.position.y=-.265;shoulder.add(elbow);
  cylinder(elbow,.068,.050,.26,palette.skin,0,-.125,0);cylinder(elbow,.072,.072,.055,palette.edge,0,-.012,0);
  const hand=box(elbow,.095,.12,.061,palette.skin,0,-.291,.008,.019);hands.push(hand);arms.push({shoulder,elbow,side});
  const hip=new T.Group();hip.position.set(side*.102,.825,0);body.add(hip);cylinder(hip,.099,.080,.363,palette.pants,0,-.179,0);
  const knee=new T.Group();knee.position.y=-.365;hip.add(knee);cylinder(knee,.079,.061,.36,palette.pants,0,-.174,0);cylinder(knee,.065,.066,.045,palette.edge,0,-.343,0);
  const foot=new T.Group();foot.position.set(0,-.355,.036);knee.add(foot);box(foot,.163,.046,.279,palette.sole,0,-.034,.035);box(foot,.157,.079,.258,palette.shoe,0,.009,.032);for(const z of [0,.035,.07])box(foot,.08,.008,.012,palette.sole,0,.053,z,.002);
  legs.push({hip,knee,foot,side});
 }
 batchStatic(body,new Set([head,...arms.map(a=>a.shoulder),...legs.map(l=>l.hip)]));
 batchStatic(head,new Set());
 for(const {elbow} of arms)batchStatic(elbow,new Set(hands));
 for(const {foot} of legs)batchStatic(foot,new Set());
 let time=0,phase=0,amplitude=0,carry=0,speed=0,runBlend=0,disposed=false;
 const metrics=modelMetrics(object);
 function update({dt=0,speed:nextSpeed=0,carrying=false}){
  if(disposed||dt<=0)return;time+=dt;speed=Math.max(0,nextSpeed);
  const a=1-Math.exp(-dt*12);amplitude+=(Math.min(1,speed/2.55)-amplitude)*a;carry+=((carrying?1:0)-carry)*a;
  runBlend+=(T.MathUtils.clamp((speed-2.65)/1.5,0,1)-runBlend)*a;
  phase+=speed*dt*T.MathUtils.lerp(3.6,3.1,runBlend);
  body.position.y=-.048+Math.sin(time*1.8)*.004*(1-amplitude)+Math.abs(Math.sin(phase))*T.MathUtils.lerp(.019,.042,runBlend)*amplitude;body.rotation.z=Math.sin(phase)*.012*amplitude;body.rotation.x=.10*runBlend*(1-carry);
  head.rotation.y=Math.sin(time*.6)*.018*(1-amplitude);head.rotation.x=-.025*amplitude;
  legs.forEach(({hip,knee,foot,side})=>{const gait=Math.sin(phase)*(side<0?1:-1)*amplitude;hip.rotation.x=-gait*T.MathUtils.lerp(.52,.85,runBlend);knee.rotation.x=Math.max(0,-gait)*T.MathUtils.lerp(.72,1.18,runBlend);foot.rotation.x=gait*.15});
  arms.forEach(({shoulder,elbow,side})=>{const gait=Math.sin(phase)*(side<0?1:-1)*amplitude;shoulder.rotation.x=T.MathUtils.lerp(gait*T.MathUtils.lerp(.36,.62,runBlend),-.34,carry);shoulder.rotation.z=side*T.MathUtils.lerp(.055,.075,carry);elbow.rotation.x=T.MathUtils.lerp(-.12-Math.max(0,gait)*.22-.60*runBlend,-.99,carry)});
 }
 return {object,metrics,update,snapshot(){object.updateMatrixWorld(true);return {name:'Pastel Human v1',state:speed>.04?(runBlend>.15?'run':'walk'):'idle',mixerTime:time,speed,carryBlend:carry,carryPose:true,weights:{idle:1-amplitude,move:amplitude,walk:amplitude*(1-runBlend),run:amplitude*runBlend},handPositions:hands.map(h=>object.worldToLocal(h.getWorldPosition(new T.Vector3())).toArray()),...metrics}},dispose(){if(disposed)return;disposed=true;disposeObject(object);object.clear()}};
}


