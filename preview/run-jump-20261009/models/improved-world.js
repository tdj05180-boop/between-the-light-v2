import * as T from '../vendor/three.module.min.js';
import {createLegacyWorld} from './legacy-world.js';
import {createCandidateAvatar} from './candidate-avatar.js';
import {bevelBox,material,mesh,modelMetrics} from './pastel-shapes.js';
import {batchStatic} from './static-batch.js';

export function applyPastelLighting(view){
 view.renderer.toneMappingExposure=1.02;
 view.scene.traverse(n=>{if(n.isHemisphereLight){n.intensity=1.6;n.color.setHex(0xf4f1e5);n.groundColor.setHex(0x8d9c88)}else if(n.isDirectionalLight&&n!==view.sun)n.intensity=.35});
 view.renderer.shadowMap.type=T.PCFShadowMap;view.sun.shadow.radius=2.5;view.sun.color.setHex(0xffedcf);view.sun.intensity=2.25;view.sun.shadow.normalBias=.018;view.sun.shadow.bias=-.0002;
}
export function createImprovedWorld(canvas){
 const v=createLegacyWorld(canvas),{world}=v;
 v.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));applyPastelLighting(v);
 const p={wood:material(0xb49b75),edge:material(0x8e795c),cream:material(0xe4d8bb),green:material(0x6a897b),dark:material(0x3f6057),pot:material(0xbb8c6d),soil:material(0x63584a),leaf:material(0x718f70,{flatShading:true})};
 const box=(w,h,d,m,x,y,z,parent=world,r=.018)=>mesh(parent,bevelBox(w,h,d,r),m,x,y,z);
 const cylinder=(top,bottom,h,m,x,y,z,parent=world,segments=12)=>mesh(parent,new T.CylinderGeometry(top,bottom,h,segments),m,x,y,z);
 function line(a,b,r,mat,parent=world){const d=new T.Vector3().subVectors(b,a),m=cylinder(r,r,d.length(),mat,0,0,0,parent,8);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m}
 function texture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t}
 // Tiny, deterministic colour grain; no normal maps or per-pixel procedural noise shader.
 const grain=texture(256,64,(g,w,h)=>{g.fillStyle='#fffdf5';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=2){g.strokeStyle=y%6?'#f4eedf':'#ebe3d1';g.globalAlpha=.16;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(70,y+2,140,y-2,w,y);g.stroke()}});grain.wrapS=grain.wrapT=T.RepeatWrapping;
 const woodColours=new Set([0xccb38b,0xd6bd96,0xd1b78e,0xcbb087,0xb5976e,0xb09a71,0xbba077,0xa5926c]);
 const materialCopies=new Map();world.traverse(n=>{
  if(!n.isMesh||Array.isArray(n.material))return;
  if(woodColours.has(n.material.color.getHex())){if(!materialCopies.has(n.material)){const m=n.material.clone();m.map=grain;m.roughness=.78;materialCopies.set(n.material,m)}n.material=materialCopies.get(n.material)}
  const g=n.geometry;if(g.type==='BoxGeometry'){const {width:w,height:h,depth:d}=g.parameters;if(w<5&&h<2.2&&d<2){n.geometry=bevelBox(w,h,d,.018);g.dispose()}}
 });
 // Layered baseboard and window reveal remain in the original cutaway wall groups.
 for(const m of [box(11.25,.10,.16,p.dark.clone(),0,.18,-4.15),box(11.25,.032,.19,p.cream.clone(),0,.247,-4.14)])v.cutawayBack.push(m);
 for(const m of [box(.16,.10,8.15,p.dark.clone(),-5.30,.18,-.28),box(.19,.032,8.15,p.cream.clone(),-5.29,.247,-.28)])v.cutawayLeft.push(m);
 for(const x of [-4.82,-2.22])v.cutawayBack.push(box(.058,1.56,.16,p.cream.clone(),x,2.33,-4.065));
 v.cutawayBack.push(box(2.63,.055,.16,p.cream.clone(),-3.52,3.13,-4.065));
 // Desk drawer seams, rail, feet and an understated workstation behind the existing memory book.
 box(.83,.015,.027,p.edge,-4.56,.69,-2.365);box(.83,.015,.027,p.edge,-4.56,.88,-2.365);
 box(2.06,.09,.07,p.green,-3.8,.30,-3.1);for(const x of [-4.8,-2.8])for(const z of [-3.1,-2.2])box(.15,.055,.15,p.dark,x,.09,z);
 box(.35,.038,.24,p.dark,-4.12,1.235,-3.00);box(.065,.18,.06,p.dark,-4.12,1.34,-3.01);
 box(.65,.45,.072,p.dark,-4.12,1.615,-3.01,world,.026);
 const screen=texture(256,160,(g,w,h)=>{g.fillStyle='#a8bcac';g.fillRect(0,0,w,h);g.fillStyle='#819e93';g.fillRect(0,0,w,20);g.fillStyle='#d4d5ba';g.fillRect(17,36,62,92);g.fillRect(94,36,143,12);g.fillStyle='#9cae98';for(let i=0;i<4;i++)g.fillRect(94,60+i*17,115-i*13,5)});
 mesh(world,new T.PlaneGeometry(.56,.35),material(0xffffff,{map:screen,roughness:1,emissive:0x7f9d8c,emissiveIntensity:.07}),-4.12,1.615,-2.970);
 box(.47,.028,.19,p.cream,-4.16,1.23,-2.55);
 const keys=texture(256,96,g=>{g.fillStyle='#c3c5ae';g.fillRect(0,0,256,96);g.fillStyle='#717e70';for(let y=8;y<73;y+=18)for(let x=8;x<240;x+=21)g.fillRect(x,y,16,12);g.fillRect(67,81,104,9)}),keyboard=mesh(world,new T.PlaneGeometry(.44,.175),material(0xffffff,{map:keys}),-4.16,1.247,-2.55);keyboard.rotation.x=-Math.PI/2;
 // Recessed bookcase back and dividers between existing quest slots.
 box(4.67,1.74,.055,p.green,.6,1.24,-4.02);for(const x of [-.14,1.37])for(const y of [.81,1.67])box(.045,.71,.67,p.wood,x,y,-3.57);
 for(const x of [-1.75,2.95])box(.17,.08,.74,p.dark,x,.12,-3.55);
 // Braces on the existing stool. No new obstruction or walkable-space change.
 const stool=world.children.find(n=>n.isGroup&&Math.abs(n.position.x+4.7)<.01&&Math.abs(n.position.z+.8)<.01);
 if(stool)for(let i=0;i<3;i++){const a=i*Math.PI*2/3,b=(i+1)*Math.PI*2/3;line(new T.Vector3(Math.sin(a)*.2,.23,Math.cos(a)*.2),new T.Vector3(Math.sin(b)*.2,.23,Math.cos(b)*.2),.025,p.green,stool)}
 // Replace the three old shrub blobs within their existing footprint with faceted broad leaves.
 for(const [x,z] of [[-4.85,.5],[4.85,3.35],[-4.8,3.35]]){
  const plant=world.children.find(n=>n.isGroup&&Math.abs(n.position.x-x)<.01&&Math.abs(n.position.z-z)<.01);if(!plant)continue;
  for(const child of [...plant.children]){child.traverse(n=>n.geometry?.dispose());plant.remove(child)}
  cylinder(.26,.19,.39,p.pot,0,.195,0,plant);cylinder(.282,.279,.075,p.cream,0,.387,0,plant);cylinder(.243,.243,.025,p.soil,0,.407,0,plant);
  for(let i=0;i<6;i++){const a=i*2.4,y=.64+i*.055,tip=new T.Vector3(Math.sin(a)*.22,y,Math.cos(a)*.22);line(new T.Vector3(0,.41,0),tip,.012,p.green,plant);const leaf=mesh(plant,new T.SphereGeometry(.21,6,4),p.leaf,tip.x,tip.y,tip.z);leaf.scale.set(.67,.21,1.35);leaf.rotation.set(.45*Math.sin(a),a,.3*Math.cos(a))}
 }
 // Reinforce the existing crates without changing logical roots, mark labels or carry anchors.
 const paper=texture(128,64,g=>{g.fillStyle='#dfd8ba';g.fillRect(0,0,128,64);g.fillStyle='#626f5d';for(let x=10;x<111;x+=5)g.fillRect(x,10,x%3?2:3,26);g.fillRect(12,47,70,3)});
 for(const [id,slot] of v.props){if(!id.startsWith('crate'))continue;const parent=slot.adapter.object;
  for(const x of [-.331,.331]){box(.012,.08,.21,p.edge,x,.09,0,parent,.003);box(.015,.018,.24,p.cream,x,.14,0,parent,.003)}
  mesh(parent,new T.PlaneGeometry(.19,.10),material(0xffffff,{map:paper}),-.125,-.125,.323);
  for(const x of [-.275,.275])for(const y of [-.23,.23])mesh(parent,new T.SphereGeometry(.012,6,4),p.edge,x,y,.328);
 }
 v.playerView.replace(createCandidateAvatar());v.carryAnchor.position.set(0,.89,.44);
 // The foreground awning is visual-only: fade it in close shots rather than hiding the protagonist.
 const canopy=world.children.filter(n=>n.isMesh&&n.position.z>3.6&&n.position.z<4.1&&n.position.y>3);
 for(const n of canopy)n.material=n.material.clone();
 const excluded=new Set([v.avatar,v.avatarShadow,v.waypoint,v.goalBeam,v.dust,...v.trees,...v.crates,...v.crateShadows,...v.cutawayBack,...v.cutawayLeft,...canopy]);
 for(const slot of v.props.values())excluded.add(slot.root);
 v.graphics={variant:'improved',batch:batchStatic(world,excluded,{cellSize:4})};
 const update=v.updateAmbient;v.updateAmbient=state=>{update(state);v.sun.intensity=2.25+Math.min(1,state.warmth)*.25;
  const fade=v.camera.position.z>3.6&&v.avatar.position.z<3.8&&v.camera.position.distanceTo(v.avatar.position)<13;
  for(const m of canopy){m.material.transparent=fade;m.material.opacity=fade?.12:1;m.material.depthWrite=!fade;m.castShadow=!fade}
 };
 v.graphics.modelMetrics=modelMetrics(world);return v;
}


