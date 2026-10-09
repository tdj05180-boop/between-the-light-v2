import * as T from '../vendor/three.module.min.js';
// One bevel segment: keep highlights on edges without subdivision-heavy surfaces.
export function bevelBox(w,h,d,r=.025){
 const b=Math.min(r,w*.18,h*.18,d*.18),s=new T.Shape();
 s.moveTo(-w/2+b,-h/2+b);s.lineTo(w/2-b,-h/2+b);s.lineTo(w/2-b,h/2-b);s.lineTo(-w/2+b,h/2-b);s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:1,steps:1,curveSegments:1});g.translate(0,0,-d/2+b);g.clearGroups();return g;
}
export function material(color,extra={}){return new T.MeshStandardMaterial({color,roughness:.88,metalness:0,...extra})}
export function mesh(parent,geometry,mat,x=0,y=0,z=0){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
export function modelMetrics(root){let triangles=0,meshes=0,geometryBytes=0;const seen=new Set();root.traverse(n=>{if(!n.isMesh)return;meshes++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;if(seen.has(n.geometry))return;seen.add(n.geometry);for(const a of Object.values(n.geometry.attributes))geometryBytes+=a.array.byteLength;if(n.geometry.index)geometryBytes+=n.geometry.index.array.byteLength});return {triangles,meshes,geometryBytes};}
