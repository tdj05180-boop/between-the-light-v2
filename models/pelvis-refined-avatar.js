import * as T from '../vendor/three.module.min.js';
import {createTailoredAvatar} from './tailored-avatar.js';
import {modelMetrics} from './pastel-shapes.js';

// Local edit of the existing study mesh. All non-trouser attributes are copied verbatim.
// Bind skeleton, gait, palette, coat, face, hair, hands and shoes stay with the original adapter.
export function createPelvisRefinedAvatar(){
 const base=createTailoredAvatar(),mesh=base.object.getObjectByName('TailoredHumanContinuousSurfaces'),source=mesh.geometry;
 const positions=[],normals=[],skinIndices=[],skinWeights=[];
 for(let i=0;i<source.attributes.position.count;i++){
  positions.push(new T.Vector3().fromBufferAttribute(source.attributes.position,i));
  normals.push(Array.from(source.attributes.normal.array.slice(i*3,i*3+3)));
  skinIndices.push(Array.from(source.attributes.skinIndex.array.slice(i*4,i*4+4)));
  skinWeights.push(Array.from(source.attributes.skinWeight.array.slice(i*4,i*4+4)));
 }
 const triangles=[],groups=[],midpoints=new Map(),pants=new Set();
 function midpoint(a,b){const key=[Math.min(a,b),Math.max(a,b)].join(':');if(midpoints.has(key))return midpoints.get(key);
  const i=positions.length;positions.push(positions[a].clone().lerp(positions[b],.5));normals.push(new T.Vector3(...normals[a]).lerp(new T.Vector3(...normals[b]),.5).toArray());
  const weights=new Map();for(const old of [a,b])for(let j=0;j<4;j++){const bone=skinIndices[old][j],w=skinWeights[old][j]*.5;weights.set(bone,(weights.get(bone)??0)+w)}
  const entries=[...weights].filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=entries.reduce((s,x)=>s+x[1],0);skinIndices.push(Array.from({length:4},(_,j)=>entries[j]?.[0]??0));skinWeights.push(Array.from({length:4},(_,j)=>(entries[j]?.[1]??0)/sum));midpoints.set(key,i);return i;
 }
 // Refine only upper-trouser faces. Adjacent faces split matching edges to avoid T junctions.
 const edgeKey=(a,b)=>[Math.min(a,b),Math.max(a,b)].join(':');
 for(const group of source.groups.filter(g=>g.materialIndex===5))for(let k=group.start;k<group.start+group.count;k+=3){const [a,b,c]=Array.from(source.index.array.slice(k,k+3));if(Math.max(positions[a].y,positions[b].y,positions[c].y)>.64){midpoint(a,b);midpoint(b,c);midpoint(c,a)}}
 for(const group of source.groups){const start=triangles.length;
  for(let k=group.start;k<group.start+group.count;k+=3){let [a,b,c]=Array.from(source.index.array.slice(k,k+3));
   if(group.materialIndex!==5){triangles.push(a,b,c);continue}
   let ab=midpoints.get(edgeKey(a,b)),bc=midpoints.get(edgeKey(b,c)),ca=midpoints.get(edgeKey(c,a));const split=[ab,bc,ca].filter(x=>x!==undefined).length;
   for(const id of [a,b,c,ab,bc,ca])if(id!==undefined)pants.add(id);
   if(split===0)triangles.push(a,b,c);
   else if(split===3)triangles.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
   else {while(split===1?ab===undefined:ca!==undefined){[a,b,c]=[b,c,a];[ab,bc,ca]=[bc,ca,ab]}
    if(split===1)triangles.push(a,ab,c,ab,b,c);else triangles.push(a,ab,c,ab,b,bc,ab,bc,c);
   }
  }groups.push({start,count:triangles.length-start,materialIndex:group.materialIndex});
 }
 const original=positions.map(p=>p.clone()),adj=new Map();for(const group of groups.filter(g=>g.materialIndex===5))for(let k=group.start;k<group.start+group.count;k+=3){const ids=triangles.slice(k,k+3);for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3];if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());adj.get(a).add(b);adj.get(b).add(a)}}
 const smooth=T.MathUtils.smoothstep,region=y=>smooth(y,.64,.74)*(1-smooth(y,.872,.90));
 // Soften the existing V junction without rounding off the preserved waistband or lower leg.
 for(let iteration=0;iteration<4;iteration++){const before=positions.map(p=>p.clone());for(const id of pants){const p=before[id],amount=.32*region(original[id].y);if(!amount)continue;const mean=new T.Vector3();for(const neighbor of adj.get(id))mean.add(before[neighbor]);mean.multiplyScalar(1/adj.get(id).size);positions[id].lerpVectors(p,mean,amount)}}
 for(const id of pants){const p=positions[id],o=original[id],r=region(o.y);if(r<=0)continue;
  // A shallow abdomen/seat volume bridges the coat hem to the thigh instead of two straight pillars.
  p.x+=Math.sign(p.x)*.005*Math.exp(-(((o.y-.817)/.061)**2))*smooth(Math.abs(p.x),.07,.18)*r;
  p.z+=Math.sign(p.z)*(p.z<0?.016:.008)*Math.exp(-(((o.y-.82)/.089)**2))*smooth(Math.abs(p.z),.025,.095)*r;
  // Lower the front/back centre of the split, retaining the actual underside of the crotch.
  p.y-=.010*Math.exp(-((o.x/.075)**2))*smooth(Math.abs(o.z),.035,.115)*Math.exp(-(((o.y-.846)/.041)**2))*r;
  // Spread the hip blend into the upper thigh. The central saddle shares both hips smoothly.
  const body=smooth(o.y,.68,.89),right=smooth(o.x,-.055,.055),leftHip=base.skeleton.bones.findIndex(b=>b.name==='hip-1'),rightHip=base.skeleton.bones.findIndex(b=>b.name==='hip1');
  const newWeights=[body,(1-body)*(1-right),(1-body)*right,0];
  const influence=smooth(o.y,.64,.70);const acc=new Map();for(let j=0;j<4;j++)acc.set(skinIndices[id][j],(acc.get(skinIndices[id][j])??0)+skinWeights[id][j]*(1-influence));for(const [j,bone]of [0,leftHip,rightHip,0].entries())acc.set(bone,(acc.get(bone)??0)+newWeights[j]*influence);
  const entries=[...acc].filter(x=>x[1]>1e-8).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=entries.reduce((s,x)=>s+x[1],0);skinIndices[id]=Array.from({length:4},(_,j)=>entries[j]?.[0]??0);skinWeights[id]=Array.from({length:4},(_,j)=>(entries[j]?.[1]??0)/sum);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions.flatMap(p=>p.toArray()),3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndices.flat(),4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeights.flat(),4));geometry.setIndex(triangles);for(const group of groups)geometry.addGroup(group.start,group.count,group.materialIndex);geometry.computeVertexNormals();
 for(let i=0;i<positions.length;i++)if(!pants.has(i)||region(original[i].y)<=0)geometry.attributes.normal.setXYZ(i,...normals[i]);geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData={study:'local pelvis refinement',editRegion:[.64,.90],previousVertexCount:source.attributes.position.count,pantsMaterial:5};
 mesh.geometry=geometry;source.dispose();const metrics=modelMetrics(base.object);
 return {...base,geometry,metrics,snapshot(){return {...base.snapshot(),name:'Pastel Human — pelvis refinement',...metrics}}};
}

