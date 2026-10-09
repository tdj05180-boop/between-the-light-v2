export class InteractionRegistry {
  constructor(entries){this.entries=new Map(entries.map(e=>[e.id,{...e}]));}
  get(id){return this.entries.get(id);}
  candidates(ids){return ids.map(id=>this.get(id)).filter(Boolean);}
  nearest(position,entries){let best=null,min=Infinity;for(const t of entries){const d=Math.hypot(position.x-t.x,position.z-t.z);if(d<t.radius&&d<min){best=t;min=d;}}return best;}
  // Change a logical anchor without touching a mesh or its child names.
  move(id,x,z){const target=this.get(id);if(!target)throw Error(`Unknown interaction ${id}`);Object.assign(target,{x,z});}
}
