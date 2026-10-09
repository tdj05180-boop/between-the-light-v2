import * as T from '../vendor/three.module.min.js';
import {createPelvisRefinedAvatar} from './pelvis-refined-avatar.js';

// Preserve the accepted pelvis, skeleton and animation. Only seat the existing mouth patch.
export function createCandidateAvatar(){
 const adapter=createPelvisRefinedAvatar(),g=adapter.geometry,p=g.attributes.position,index=g.index;
 const mouth=new Set(),skin=[];
 for(const group of g.groups){
  if(group.materialIndex===9)for(let i=group.start;i<group.start+group.count;i++)mouth.add(index.getX(i));
  if(group.materialIndex===3)for(let i=group.start;i<group.start+group.count;i+=3)skin.push([0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index.getX(i+k))));
 }
 const hit=new T.Vector3(),ray=new T.Ray(new T.Vector3(),new T.Vector3(0,0,-1));let adjusted=0,maxShift=0;
 for(const id of mouth){
  const x=p.getX(id),y=p.getY(id),z=p.getZ(id);ray.origin.set(x,y,1);let surface=-Infinity;
  for(const [a,b,c] of skin)if(ray.intersectTriangle(a,b,c,false,hit))surface=Math.max(surface,hit.z);
  // Fail closed if the expected face is not immediately beneath the patch.
  if(Number.isFinite(surface)&&z-surface>=0&&z-surface<.03){const target=surface+.0008;maxShift=Math.max(maxShift,Math.abs(z-target));p.setZ(id,target);adjusted++;}
 }
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
 return {...adapter,snapshot(){return {...adapter.snapshot(),name:'Pastel Human — in-game candidate',mouthAdjustment:{vertices:adjusted,maxShift}}}};
}
