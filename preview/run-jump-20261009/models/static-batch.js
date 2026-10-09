import * as T from '../vendor/three.module.min.js';
import {mergeGeometries,mergeVertices} from '../vendor/BufferGeometryUtils.js';
// Bake only static visuals. Gameplay roots, moving trees, fading walls and lantern are excluded.
export function batchStatic(root,excluded,{cellSize=Infinity}={}){
 root.updateMatrixWorld(true);const inverseRoot=root.matrixWorld.clone().invert(),buckets=new Map(),oldGeometries=new Set();
 function visit(node){if(excluded.has(node))return;
  if(node.isMesh&&!Array.isArray(node.material)&&node.material.isMeshStandardMaterial&&!node.material.transparent&&!node.material.emissive.getHex()&&!node.isSkinnedMesh){
   const m=node.material,pos=new T.Vector3().setFromMatrixPosition(node.matrixWorld).applyMatrix4(inverseRoot),cell=Number.isFinite(cellSize)?[Math.floor((pos.x+cellSize/2)/cellSize),Math.floor((pos.z+cellSize/2)/cellSize)].join(':'):'all';
   const key=[cell,m.roughness,m.metalness,m.side,m.map?.uuid??'',m.flatShading,node.castShadow,node.receiveShadow].join('/');
   if(!buckets.has(key))buckets.set(key,{material:m,nodes:[]});buckets.get(key).nodes.push(node);
  }else if(!node.isMesh)for(const child of [...node.children])visit(child);
 }for(const child of [...root.children])visit(child);
 let before=0,after=0;
 for(const {material,nodes} of buckets.values()){
  if(nodes.length<2)continue;before+=nodes.length;after++;
  const geometries=nodes.map(node=>{
   const g=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();g.applyMatrix4(inverseRoot.clone().multiply(node.matrixWorld));g.clearGroups();
   const c=new Float32Array(g.attributes.position.count*3);for(let i=0;i<c.length;i+=3){c[i]=node.material.color.r;c[i+1]=node.material.color.g;c[i+2]=node.material.color.b}g.setAttribute('color',new T.BufferAttribute(c,3));
   for(const key of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(key))g.deleteAttribute(key);
   oldGeometries.add(node.geometry);return g;
  });
  const combined=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();if(!combined)throw Error('Static batch geometry mismatch');
  const mat=material.clone();mat.color.setHex(0xffffff);mat.vertexColors=true;
  const indexed=mergeVertices(combined,1e-5);combined.dispose();
  const mesh=new T.Mesh(indexed,mat);mesh.castShadow=nodes[0].castShadow;mesh.receiveShadow=nodes[0].receiveShadow;mesh.name='StaticPastelBatch';root.add(mesh);
  for(const node of nodes)node.removeFromParent();
 }
 const retained=new Set();root.traverse(n=>{if(n.geometry)retained.add(n.geometry)});for(const g of oldGeometries)if(!retained.has(g))g.dispose();
 return {before,after};
}
