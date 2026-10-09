import * as T from '../vendor/three.module.min.js';
import {disposeObject} from './resources.js';
import {material,modelMetrics} from './pastel-shapes.js';
import {TailoredMesh,oval,loft,smooth,blendBones} from './tailored-mesh.js';

export function createTailoredAvatar(){
 const object=new T.Group(),body=new T.Group();object.name='PastelHumanTailoredStudy';object.add(body);body.position.y=-.048;
 const mats=[0x52776b,0x395f53,0xe9dcc2,0xd9ae88,0x493c32,0x777565,0x4f584b,0xc4bea7,0x423e35,0xa97760].map(c=>material(c));
 const bones=[],bind=[];function bone(name,parent,pos){const b=new T.Bone();b.name=name;b.position.set(...pos);(parent??body).add(b);bones.push(b);return b}
 const root=bone('body',null,[0,0,0]),head=bone('head',root,[0,1.6,0]),arms=[],legs=[];
 for(const side of [-1,1]){const shoulder=bone('shoulder'+side,root,[side*.247,1.265,0]),elbow=bone('elbow'+side,shoulder,[0,-.265,0]);arms.push({shoulder,elbow,side,upper:bones.indexOf(shoulder),lower:bones.indexOf(elbow)});
  const hip=bone('hip'+side,root,[side*.102,.825,0]),knee=bone('knee'+side,hip,[0,-.365,0]),foot=bone('foot'+side,knee,[0,-.355,.036]);legs.push({hip,knee,foot,side,upper:bones.indexOf(hip),lower:bones.indexOf(knee),ankle:bones.indexOf(foot)});
 }
 body.updateMatrixWorld(true);for(const b of bones)bind.push(b.getWorldPosition(new T.Vector3()).sub(body.position));
 const g=new TailoredMesh();
 // Coat: torso quads with two actual armholes, bridged to swept sleeve rings.
 // Shared boundary indices make the shoulder one connected surface, not overlapping cylinders.
 g.begin('continuous coat with sewn sleeves',0);
 const sections=[[.888,.180,.119],[.91,.191,.129],[.97,.181,.131],[1.06,.194,.143],[1.14,.213,.147],[1.20,.225,.143],[1.26,.221,.126],[1.32,.205,.109],[1.346,.165,.094],[1.377,.077,.070]],n=24;
 const torso=sections.map(([y,rx,rz])=>g.ring(oval(0,y,0,rx,rz,n,2.45),[[0,1]]));
 for(let r=0;r<torso.length-1;r++)for(let i=0;i<n;i++){
  const cut=r>=4&&r<7&&((i>=10&&i<14)||(i>=22||i<2));if(cut)continue;
  const j=(i+1)%n;g.tri(torso[r][i],torso[r+1][i],torso[r+1][j]);g.tri(torso[r][i],torso[r+1][j],torso[r][j]);
 }
 for(const arm of arms){const {side,upper,lower}=arm,c=side>0?0:12,idx=i=>(i+n)%n,boundary=[];
  for(let k=-2;k<=2;k++)boundary.push(torso[4][idx(c+k)]);
  for(let r=5;r<=7;r++)boundary.push(torso[r][idx(c+2)]);
  for(let k=1;k>=-2;k--)boundary.push(torso[7][idx(c+k)]);
  for(let r=6;r>=5;r--)boundary.push(torso[r][idx(c-2)]);
  const angles=boundary.map(i=>{const p=g.p[i];return Math.atan2(p[2]*side/.075,-(p[1]-1.23)/.09)});
  let previous=boundary,pc=[side*.209,1.23,0];
  const sleeve=[[.235,1.225,.080,.080,.80,-.60],[.255,1.205,.073,.076,.36,-.93],[.253,1.15,.071,.073,.06,-1],[.250,1.085,.068,.069,0,-1],[.247,1.025,.065,.063,-.05,-1],[.247,1.003,.066,.065,-.05,-1]];
  for(let row=0;row<sleeve.length;row++){const [x,y,ry,rz,dx,dy]=sleeve[row],cc=[side*x,y,0];
   const points=angles.map(a=>{const radial=-Math.cos(a)*ry;return [cc[0]+side*(-dy)*radial,y+dx*radial,Math.sin(a)*rz*side]});
   const ids=g.ring(points,p=>{const elbowMix=(1-smooth(.985,1.09,p[1]))*.55;return row===0?[[0,.28],[upper,.72]]:blendBones(upper,lower,elbowMix)});
   if(row===sleeve.length-1){g.end();g.begin('sewn cuff '+side,1)}g.bridge(previous,ids,pc,cc);if(row===sleeve.length-1){g.end();g.begin('coat continuation',0)}previous=ids;pc=cc;
  }
 }g.end();
 // Curved cloth inset, lapels and pockets follow the torso surface instead of box decorations.
 function frontAt(rows,x,y,exponent=2){let k=0;while(k<rows.length-2&&rows[k+1][0]<y)k++;const t=T.MathUtils.clamp((y-rows[k][0])/(rows[k+1][0]-rows[k][0]),0,1),rx=T.MathUtils.lerp(rows[k][1],rows[k+1][1],t),rz=T.MathUtils.lerp(rows[k][2],rows[k+1][2],t);return rz*Math.max(0,1-Math.abs(x/rx)**exponent)**(1/exponent)}
 function patch(name,mat,rows,w=[[0,1]]){
  g.begin(name,mat);const cloth=w[0][0]===0,steps=cloth?5:1;
  for(let j=0;j<rows.length-1;j++)for(let i=0;i<rows[j].length-1;i++){
   const ids=[];for(let v=0;v<=steps;v++){const line=[];for(let u=0;u<=steps;u++){
    const a=new T.Vector3(...rows[j][i]).lerp(new T.Vector3(...rows[j][i+1]),u/steps),b=new T.Vector3(...rows[j+1][i]).lerp(new T.Vector3(...rows[j+1][i+1]),u/steps);const p=a.lerp(b,v/steps);
    if(cloth)p.z=frontAt(sections,p.x,p.y,2.45)+(name.includes('lapel')?.015:.006);line.push(g.vertex(p.toArray(),w,true));
   }ids.push(line)}for(let v=0;v<steps;v++)for(let u=0;u<steps;u++){const q=[ids[v][u],ids[v][u+1],ids[v+1][u+1],ids[v+1][u]];if(name==='lace')q.reverse();else if(cloth){const a=new T.Vector3(...g.p[q[1]]).sub(new T.Vector3(...g.p[q[0]])),b=new T.Vector3(...g.p[q[2]]).sub(new T.Vector3(...g.p[q[0]]));if(a.cross(b).z<0)q.reverse()}g.tri(q[0],q[1],q[2]);g.tri(q[0],q[2],q[3])}
  }g.end();
 }
 patch('cream undershirt',2,[[[-.074,.942,.132],[0,.942,.134],[.074,.942,.132]],[[-.083,1.13,.150],[0,1.13,.152],[.083,1.13,.150]],[[-.065,1.30,.118],[0,1.30,.125],[.065,1.30,.118]],[[-.044,1.354,.08],[0,1.354,.083],[.044,1.354,.08]]]);
 for(const side of [-1,1]){
  const xs=a=>a.map(row=>row.map(([x,y,z])=>[x*side,y,z]));let rows=xs([[[.061,1.36,.086],[.097,1.335,.117]],[[.064,1.292,.132],[.125,1.31,.124]],[[.084,1.22,.151],[.127,1.265,.139]]]);if(side<0)rows=rows.map(r=>r.reverse());patch('shaped lapel '+side,1,rows);
  rows=xs([[[.102,1.072,.139],[.158,1.078,.133]],[[.098,1.14,.148],[.163,1.144,.138]],[[.097,1.156,.150],[.164,1.16,.141]]]);if(side<0)rows=rows.map(r=>r.reverse());patch('cloth pocket '+side,1,rows);
 }
 g.begin('curved coat hem',1);loft(g,[[.888,.185,.123],[.908,.195,.132]],[[0,1]],{segments:24,exponent:2.45,cap:false});g.end();
 for(const y of [1.0,1.08,1.16,1.24]){g.begin('shirt button',7);const x=.023,z=frontAt(sections,x,y,2.45)+.01,ring=g.ring(Array.from({length:10},(_,i)=>{const a=i*Math.PI/5;return [x+.009*Math.cos(a),y+.009*Math.sin(a),z]}),[[0,1]]),c=g.vertex([x,y,z+.003],[[0,1]]);for(let i=0;i<10;i++)g.tri(c,ring[i],ring[(i+1)%10]);g.end()}
 // Trousers: both legs share the same indexed crotch seam; outer half-rings join one waistband.
 g.begin('continuous pelvis and trousers',5);const count=24,waist=g.ring(oval(0,.90,0,.179,.119,count,2.25),[[0,1]],true);
 for(const leg of legs){const {side,upper,lower}=leg;
  const points=Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2,c=Math.cos(a),s=Math.sin(a),outside=c*side>=0;return [outside?.184*c:0,outside?.854:.854-.09*Math.abs(c),.117*s]});
  let prev=g.ring(points,[[0,1]],true),pc=[side*.09,.81,0];
  for(let i=0;i<count;i++){const j=(i+1)%count;if(Math.cos((i+.5)/count*Math.PI*2)*side>0){g.tri(prev[i],waist[i],waist[j]);g.tri(prev[i],waist[j],prev[j])}}
  const profiles=[[.748,.096,.11],[.697,.096,.105],[.61,.089,.098],[.525,.083,.087],[.487,.081,.083],[.46,.082,.084],[.435,.081,.082],[.40,.079,.080],[.33,.076,.076],[.23,.067,.068],[.139,.060,.061],[.122,.061,.062]];
  for(const [y,rx,rz]of profiles){const cx=side*(.102+.007*Math.sin((y-.12)*4)),cc=[cx,y,0],ring=g.ring(oval(cx,y,0,rx,rz,count,2.2),p=>{const rootMix=smooth(.68,.79,p[1]);if(rootMix>0)return blendBones(upper,0,rootMix);return blendBones(lower,upper,smooth(.395,.525,p[1]))});g.bridge(prev,ring,pc,cc);prev=ring;pc=cc}
 }g.end();
 // Forearm-wrist-palm is one shaped surface, including thumb-side volume.
 for(const arm of arms){const {side,upper,lower}=arm;g.begin('forearm and mitten hand '+side,3);
  loft(g,[[.687,.033,.026,side*.250,.012],[.697,.044,.031,side*.249,.008],[.723,.048,.034,side*.247,.008],[.756,.046,.034,side*.249,.006],[.79,.036,.029,side*.248,.001],[.811,.034,.028,side*.247,0],[.85,.041,.037,side*.247,0],[.91,.053,.049,side*.247,0],[.975,.062,.058,side*.248,0],[1.027,.058,.055,side*.247,0]],p=>blendBones(lower,upper,(1-.55*(1-smooth(.985,1.09,p[1])))*smooth(.925,1.00,p[1])),{segments:20,exponent:2.15,deform:p=>{if(p[1]>.72&&p[1]<.79&&p[0]*side<.247){p[0]-=side*.010;p[2]+=.012}return p}});g.end();
 }
 // Neck and head: jaw, cheek, brow and nose are displaced into the base surface.
 g.begin('neck',3);loft(g,[[1.32,.076,.065],[1.375,.067,.064],[1.42,.066,.061]],[[0,1]],{segments:20});g.end();
 const headRows=[[1.395,.052,.055,0,.015],[1.413,.094,.083,0,.018],[1.44,.126,.111,0,.01],[1.48,.151,.133],[1.525,.167,.150],[1.56,.174,.157],[1.59,.172,.159],[1.626,.169,.158],[1.664,.168,.154],[1.705,.162,.145],[1.745,.144,.127],[1.778,.112,.097],[1.801,.064,.056],[1.808,.008,.008]];
 g.begin('sculpted head surface',3);loft(g,headRows,[[1,1]],{segments:32,deform:([x,y,z])=>{if(z>0){const nose=.041*Math.exp(-((x/.031)**2)-(((y-1.568)/.038)**2));const muzzle=.009*Math.exp(-((x/.06)**2)-(((y-1.50)/.03)**2));z+=nose+muzzle}return [x,y,z]}});g.end();
 for(const side of [-1,1]){g.begin('ear '+side,3);loft(g,[[1.544,.011,.017,side*.164,-.008],[1.56,.021,.022,side*.173,-.008],[1.59,.024,.023,side*.173,-.012],[1.62,.018,.020,side*.172,-.013],[1.627,.008,.01,side*.163,-.013]],[[1,1]],{segments:12});g.end()}
 g.begin('single swept hair cap',4);let prev,pc;
 for(let r=0;r<9;r++){const t=r/8,points=Array.from({length:32},(_,i)=>{const a=i/32*Math.PI*2,c=Math.cos(a),s=Math.sin(a),front=Math.max(0,s);const hairline=1.595+front*.091+front*.017*Math.sin(c*3+1);const y=hairline+(1.825-hairline)*Math.sin(t*Math.PI/2);let k=0;while(k<headRows.length-2&&headRows[k+1][0]<y)k++;const f=T.MathUtils.clamp((y-headRows[k][0])/(headRows[k+1][0]-headRows[k][0]),0,1);let rx=T.MathUtils.lerp(headRows[k][1],headRows[k+1][1],f)+.012,rz=T.MathUtils.lerp(headRows[k][2],headRows[k+1][2],f)+.013;if(y>1.801){const tip=smooth(1.801,1.827,y);rx=T.MathUtils.lerp(.077,.002,tip);rz=T.MathUtils.lerp(.070,.002,tip)}return [rx*c-.004*Math.sin(t*Math.PI),y,rz*s-.002]});const ids=g.ring(points,[[1,1]]),cc=[-.017*t,1.70+t*.10,-.013];if(prev)g.bridge(prev,ids,pc,cc);prev=ids;pc=cc}
 g.cap(prev,[0,1.828,-.002],[[1,1]],true);g.end();
 // Small facial surface patches, preserving the existing calm face and colours.
 for(const side of [-1,1]){const cx=side*.062;g.begin('eye '+side,8);const rim=g.ring(Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return [cx+Math.cos(a)*.010,1.608+Math.sin(a)*.012,.150+Math.cos(a)*(-side*.002)]}),[[1,1]]);const center=g.vertex([cx,1.608,.153],[[1,1]]);for(let i=0;i<12;i++)g.tri(center,rim[i],rim[(i+1)%12]);g.end();
  patch('eyebrow '+side,4,[[[cx-.022,1.644,.145],[cx+.020,1.643,.145]],[[cx-.020,1.652,.145],[cx+.021,1.650,.145]]],[[1,1]])}
 patch('mouth',9,[[[-.021,1.504,.157],[0,1.501,.159],[.021,1.504,.157]],[[-.021,1.510,.159],[0,1.507,.161],[.021,1.510,.159]]],[[1,1]]);
 for(const leg of legs){const {side,ankle}=leg,x=side*.102;
  g.begin('rounded sole '+side,7);loft(g,[[.048,.073,.126,x,.067],[.053,.083,.137,x,.065],[.078,.083,.137,x,.065],[.087,.076,.130,x,.063]],[[ankle,1]],{segments:24,exponent:3.0});g.end();
  g.begin('sculpted shoe last '+side,6);loft(g,[[.078,.078,.130,x,.063],[.108,.077,.123,x,.06],[.128,.064,.105,x,.052],[.154,.057,.074,x,.025],[.178,.056,.059,x,.008]],[[ankle,1]],{segments:24,exponent:2.7});g.end();
  for(const z of [.033,.063,.090])patch('lace',7,[[[x-.034,.158-(z-.033)*.35,z],[x+.034,.158-(z-.033)*.35,z]],[[x-.034,.158-(z-.033)*.35,z+.008],[x+.034,.158-(z-.033)*.35,z+.008]]],[[ankle,1]]);
 }
 const geometry=g.geometry();
 // Coalesce triangle groups by palette to keep the connected character at ten material draws.
 const old=Array.from(geometry.index.array),index=[];geometry.clearGroups();for(let mat=0;mat<mats.length;mat++){const start=index.length;for(const part of g.parts)if(part.material===mat)index.push(...old.slice(part.start,part.start+part.count));if(index.length>start)geometry.addGroup(start,index.length-start,mat)}geometry.setIndex(index);
 const skin=new T.SkinnedMesh(geometry,mats);skin.name='TailoredHumanContinuousSurfaces';skin.castShadow=skin.receiveShadow=true;skin.frustumCulled=false;body.add(skin);body.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);skin.bind(skeleton);skin.normalizeSkinWeights();
 let time=0,phase=0,amplitude=0,carry=0,speed=0,runBlend=0,disposed=false;
 const metrics=modelMetrics(object);
 function update({dt=0,speed:nextSpeed=0,carrying=false}){if(disposed||dt<=0)return;time+=dt;speed=Math.max(0,nextSpeed);const a=1-Math.exp(-dt*12);amplitude+=(Math.min(1,speed/2.55)-amplitude)*a;carry+=((carrying?1:0)-carry)*a;runBlend+=(T.MathUtils.clamp((speed-2.65)/1.5,0,1)-runBlend)*a;phase+=speed*dt*T.MathUtils.lerp(3.6,3.1,runBlend);
  body.position.y=-.048+Math.sin(time*1.8)*.004*(1-amplitude)+Math.abs(Math.sin(phase))*T.MathUtils.lerp(.019,.042,runBlend)*amplitude;body.rotation.z=Math.sin(phase)*.012*amplitude;body.rotation.x=.10*runBlend*(1-carry);
  head.rotation.y=Math.sin(time*.6)*.018*(1-amplitude);head.rotation.x=-.025*amplitude;
  legs.forEach(({hip,knee,foot,side})=>{const gait=Math.sin(phase)*(side<0?1:-1)*amplitude;hip.rotation.x=-gait*T.MathUtils.lerp(.52,.85,runBlend);knee.rotation.x=Math.max(0,-gait)*T.MathUtils.lerp(.72,1.18,runBlend);foot.rotation.x=gait*.15});
  arms.forEach(({shoulder,elbow,side})=>{const gait=Math.sin(phase)*(side<0?1:-1)*amplitude;shoulder.rotation.x=T.MathUtils.lerp(gait*T.MathUtils.lerp(.36,.62,runBlend),-.34,carry);shoulder.rotation.z=side*T.MathUtils.lerp(.055,.075,carry);elbow.rotation.x=T.MathUtils.lerp(-.12-Math.max(0,gait)*.22-.60*runBlend,-.99,carry)});
 }
 function hands(){object.updateMatrixWorld(true);return arms.map(({elbow})=>object.worldToLocal(elbow.localToWorld(new T.Vector3(0,-.277,.008))).toArray())}
 return {object,metrics,geometry,skeleton,update,snapshot(){return {name:'Pastel Human — tailored mesh study',state:speed>.04?(runBlend>.15?'run':'walk'):'idle',mixerTime:time,speed,carryBlend:carry,weights:{idle:1-amplitude,walk:amplitude*(1-runBlend),run:amplitude*runBlend},handPositions:hands(),...metrics,materialDraws:geometry.groups.length,bones:bones.length}},dispose(){if(disposed)return;disposed=true;disposeObject(object);object.clear()}};
}


