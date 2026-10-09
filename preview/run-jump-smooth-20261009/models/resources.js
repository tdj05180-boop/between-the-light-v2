// Only call for resources owned by this visual (never shared world materials).
export function disposeObject(object) {
 const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
 object.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.skeleton)skeletons.add(node.skeleton);
  for(const m of (Array.isArray(node.material)?node.material:[node.material]))if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}
 });
 for(const x of geometries)x.dispose();for(const x of materials)x.dispose();for(const x of textures){x.dispose();x.source?.data?.close?.();}for(const x of skeletons)x.dispose();
 return {geometries:geometries.size,materials:materials.size,textures:textures.size,skeletons:skeletons.size};
}
