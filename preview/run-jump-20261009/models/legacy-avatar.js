import * as THREE from '../vendor/three.module.min.js';
import {disposeObject} from './resources.js';
import {ModelSlot} from '../systems/model-slot.js';
export function createLegacyAvatar({world,add,mat,box,sphere,contact}){
const avatar=new THREE.Group();avatar.position.set(.25,.11,3.05);world.add(avatar);
const body=new THREE.Group();avatar.add(body);
const shirt=add(new THREE.CapsuleGeometry(.245,.36,4,10),mat(0x557969),0,.93,0,body);shirt.scale.z=.8;
box(.14,.09,.31,0xe9d7ad,0,1.21,.013,body);
box(.12,.14,.025,0xb4b994,.12,1.03,.202,body);
const head=new THREE.Group();head.position.y=1.52;body.add(head);
sphere(.255,0xe0b88d,0,0,0,head,1,.99,.93);
const hair=sphere(.261,0x50483c,0,.078,-.035,head,1,.78,.93);
box(.39,.085,.17,0x50483c,-.015,.155,.14,head);
sphere(.032,0xdec1a0,-.257,-.006,0,head,.8,1,1);sphere(.032,0xdec1a0,.257,-.006,0,head,.8,1,1);
for(const x of[-.09,.09])sphere(.017,0x373d32,x,-.015,.217,head,.8,1,1);
sphere(.037,0xc8a27d,0,-.065,.226,head,.7,.7,1);
const limbs=[];
for(const side of[-1,1]){
 const arm=new THREE.Group();arm.position.set(side*.285,1.13,0);body.add(arm);
 add(new THREE.CapsuleGeometry(.075,.27,3,8),mat(0x557969),0,-.14,0,arm);sphere(.08,0xe0b88d,0,-.34,0,arm);limbs.push(arm);
 const leg=new THREE.Group();leg.position.set(side*.125,.55,0);body.add(leg);add(new THREE.CapsuleGeometry(.093,.31,3,8),mat(0x9a9574),0,-.18,0,leg);sphere(.105,0x514e40,0,-.48,.05,leg,1,.7,1.65);limbs.push(leg);
}
const avatarShadow=contact(.25,3.05,.48,.32,.25);
const carryAnchor=new THREE.Group();carryAnchor.position.set(0,.89,.44);avatar.add(carryAnchor);
// World material cache is shared: own clones so replacement can dispose safely.
const owned=new Map();body.traverse(n=>{if(n.material){if(!owned.has(n.material))owned.set(n.material,n.material.clone());n.material=owned.get(n.material);}});
const playerView=new ModelSlot(avatar,{object:body,dispose(){disposeObject(body);},update({moving,gait,elapsed,carrying}){
 body.position.y=moving?Math.abs(gait)*.035:Math.sin(elapsed*2)*.009;
 limbs[1].rotation.x=gait*.53;limbs[3].rotation.x=-gait*.53;
 limbs[0].rotation.x=carrying?-1.15:-gait*.45;limbs[2].rotation.x=carrying?-1.15:gait*.45;
 limbs[0].rotation.z=carrying?-.2:0;limbs[2].rotation.z=carrying?.2:0;
}});
return {avatar,avatarShadow,carryAnchor,playerView};

}
