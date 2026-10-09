import * as T from '../vendor/three.module.min.js';

// Indexed, authored cross-sections. No primitive meshes are used by the study avatar.
export class TailoredMesh {
 constructor(){this.p=[];this.faces=[];this.weights=[];this.parts=[];this.weld=new Map()}
 vertex(p,weights=[[0,1]],weld=false){
  const key=p.map(x=>(Math.abs(x)<.0000005?0:x).toFixed(6)).join(',')+'|'+JSON.stringify(weights);
  if(weld&&this.weld.has(key))return this.weld.get(key);
  const i=this.p.length;this.p.push(p);this.weights.push(weights);if(weld)this.weld.set(key,i);return i;
 }
 ring(points,weight,weld=false){return points.map(p=>this.vertex(p,typeof weight==='function'?weight(p):weight,weld))}
 tri(a,b,c){if(a===b||b===c||a===c)return;this.faces.push(a,b,c)}
 // Each tube has outward winding, including mirrored limbs and non-horizontal armhole rings.
 bridge(a,b,ca,cb){const quads=[];let score=0;const axis=new T.Vector3(...cb).sub(new T.Vector3(...ca)).normalize();for(let i=0;i<a.length;i++){
  const j=(i+1)%a.length,ids=[a[i],b[i],b[j],a[j]];
  const p=ids.map(k=>new T.Vector3(...this.p[k]));
  const n=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));
  const center=p.reduce((v,x)=>v.add(x),new T.Vector3()).multiplyScalar(.25);
  const radial=center.sub(new T.Vector3(...ca).add(new T.Vector3(...cb)).multiplyScalar(.5));
  radial.addScaledVector(axis,-radial.dot(axis));score+=n.dot(radial);quads.push(ids);
 }for(const ids of quads){if(score<0)ids.reverse();this.tri(ids[0],ids[1],ids[2]);this.tri(ids[0],ids[2],ids[3])}}
 cap(ring,center,weights,up=true){const k=this.vertex(center,weights);for(let i=0;i<ring.length;i++){const j=(i+1)%ring.length;const a=new T.Vector3(...this.p[ring[i]]).sub(new T.Vector3(...center)),b=new T.Vector3(...this.p[ring[j]]).sub(new T.Vector3(...center));const positive=a.cross(b).y>0;if(positive===up)this.tri(k,ring[i],ring[j]);else this.tri(k,ring[j],ring[i])}}
 begin(name,material){this.open={name,material,start:this.faces.length}}
 end(){this.parts.push({...this.open,count:this.faces.length-this.open.start});this.open=null}
 geometry(){const used=new Set(this.faces),map=new Map(),p=[],w=[];for(let i=0;i<this.p.length;i++)if(used.has(i)){map.set(i,p.length);p.push(this.p[i]);w.push(this.weights[i])}this.p=p;this.weights=w;this.faces=this.faces.map(i=>map.get(i));const g=new T.BufferGeometry(),skinIndex=[],skinWeight=[];
  for(const w of this.weights){const total=w.reduce((s,a)=>s+a[1],0);for(let i=0;i<4;i++){skinIndex.push(w[i]?.[0]??0);skinWeight.push((w[i]?.[1]??0)/total)}}
  g.setAttribute('position',new T.Float32BufferAttribute(this.p.flat(),3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndex,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeight,4));g.setIndex(this.faces);for(const p of this.parts)g.addGroup(p.start,p.count,p.material);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.parts=this.parts;return g;
 }
}
export const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
export function blendBones(a,b,t){return t<=0?[[a,1]]:t>=1?[[b,1]]:[[a,1-t],[b,t]]}
export function oval(cx,y,cz,rx,rz,n=24,exponent=2){return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);return [cx+Math.sign(c)*Math.abs(c)**(2/exponent)*rx,y,cz+Math.sign(s)*Math.abs(s)**(2/exponent)*rz]})}
export function loft(builder,rows,weight,{segments=24,exponent=2,cap=true,weld=false,deform=p=>p}={}){
 const rings=rows.map(([y,rx,rz,cx=0,cz=0])=>builder.ring(oval(cx,y,cz,rx,rz,segments,exponent).map(deform),weight,weld));
 for(let r=0;r<rings.length-1;r++)builder.bridge(rings[r],rings[r+1],[rows[r][3]??0,rows[r][0],rows[r][4]??0],[rows[r+1][3]??0,rows[r+1][0],rows[r+1][4]??0]);
 if(cap){for(const [i,up] of [[0,false],[rows.length-1,true]]){const row=rows[i],p=[row[3]??0,row[0],row[4]??0];builder.cap(rings[i],p,typeof weight==='function'?weight(p):weight,up)}}return rings;
}
