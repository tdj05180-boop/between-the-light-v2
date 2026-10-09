// Keep logical root transforms and interaction anchors when replacing visuals.
export class ModelSlot {
  constructor(root,adapter){this.root=root;this.adapter=null;this.replace(adapter);}
  replace(adapter){if(!adapter?.object)throw Error('Model adapter requires object');if(this.adapter){this.root.remove(this.adapter.object);this.adapter.dispose?.();}this.adapter=adapter;this.root.add(adapter.object);}
  update(state){this.adapter.update?.(state);}
}
