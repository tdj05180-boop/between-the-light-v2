export const CAMERA_PRESETS={free:{yaw:.56,pitch:.7,distance:21.7},fixed:{yaw:.56,pitch:.7,distance:21.7},close:{yaw:.56,pitch:.56,distance:10},wide:{yaw:.56,pitch:.82,distance:31}};
export class CameraRig {
  constructor(){this.select('free');}
  select(name,target=null){if(!CAMERA_PRESETS[name])throw Error(`Unknown camera ${name}`);this.mode=name;Object.assign(this,CAMERA_PRESETS[name]);this.target=target?{...target}:name==='fixed'?{x:0,y:1.15,z:.6}:null;}
  get acceptsInput(){return this.mode==='free';}
  rotate(dx,dy=0){if(!this.acceptsInput)return;this.yaw+=dx;this.pitch=Math.max(.43,Math.min(1.04,this.pitch+dy));}
  zoom(delta){if(this.acceptsInput)this.distance=Math.max(8,Math.min(34,this.distance+delta));}
  snapshot(){return {mode:this.mode,yaw:this.yaw,pitch:this.pitch,distance:this.distance,target:this.target?{...this.target}:null};}
  restore(state){Object.assign(this,state);}
}
