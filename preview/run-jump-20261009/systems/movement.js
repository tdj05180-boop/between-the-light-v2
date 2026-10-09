// Position/collision are independent of meshes, bones and animation names.
export const MOBILE_RUN_JUMP_GRACE_MS=250;
export const AIR_ACCELERATION=2.2;
export const AIR_BRAKING=.65;
function worldInput(input,yaw){
 let {x,z}=input;const length=Math.hypot(x,z);
 if(length<.13)x=z=0;else{x/=Math.max(1,length);z/=Math.max(1,length);}
 return {x:x*Math.cos(yaw)+z*Math.sin(yaw),z:-x*Math.sin(yaw)+z*Math.cos(yaw),active:length>=.13};
}
export class MovementController {
  constructor(actor,canWalk){this.actor=actor;this.canWalk=canWalk;this.velocity={x:0,z:0};this.direction=0;this.airSpeed=0;this.runRelease=null;this.lastTakeoff=null;}
  stop(){this.velocity.x=this.velocity.z=0;this.airSpeed=0;this.clearRunGrace();}
  clearRunGrace(){this.runRelease=null;}
  rememberRunRelease(now,input,yaw,walkSpeed){
    const desired=worldInput(input,yaw),speed=Math.hypot(this.velocity.x,this.velocity.z);
    this.runRelease=desired.active&&speed>walkSpeed+.1?{at:now,x:this.velocity.x,z:this.velocity.z,speed}:null;
  }
  beginJump({now,input,yaw,mobile=false,walkSpeed}){
    const desired=worldInput(input,yaw),saved=this.runRelease;
    // A stopped stick must never resurrect an old running velocity.
    if(!desired.active)this.velocity.x=this.velocity.z=0;
    const length=Math.hypot(desired.x,desired.z);
    const aligned=saved&&length>0&&(desired.x*saved.x+desired.z*saved.z)/(length*saved.speed)>=.5;
    const grace=!!(mobile&&desired.active&&saved&&now>=saved.at&&now<=saved.at+MOBILE_RUN_JUMP_GRACE_MS&&aligned);
    if(grace){this.velocity.x=desired.x/length*saved.speed;this.velocity.z=desired.z/length*saved.speed;}
    const speed=Math.hypot(this.velocity.x,this.velocity.z);
    this.airSpeed=Math.max(speed,walkSpeed);this.lastTakeoff={speed,graceUsed:grace,mobile};this.clearRunGrace();
  }
  land(){this.airSpeed=0;this.clearRunGrace();}
  snapshot(){return {velocity:{...this.velocity},airSpeed:this.airSpeed,lastTakeoff:this.lastTakeoff};}
  update(dt,input,yaw,speed,locked,airborne=false){
    if(locked){this.stop();return false;}
    const desired=worldInput(input,yaw),dx=desired.x,dz=desired.z;
    if(!desired.active)this.clearRunGrace();
    // Reuse the same velocity and collision integration in the air; only steering strength changes.
    const targetSpeed=airborne?(this.airSpeed||speed):speed;
    const response=airborne?(desired.active?AIR_ACCELERATION:AIR_BRAKING):16;
    const a=1-Math.exp(-dt*response);this.velocity.x+=(dx*targetSpeed-this.velocity.x)*a;this.velocity.z+=(dz*targetSpeed-this.velocity.z)*a;
    const p=this.actor.position,oldX=p.x,oldZ=p.z;
    // Substeps keep collision stable during a slow foreground frame.
    const steps=Math.max(1,Math.ceil(dt/.016));
    for(let i=0;i<steps;i++){const nx=p.x+this.velocity.x*dt/steps,nz=p.z+this.velocity.z*dt/steps;if(this.canWalk(nx,p.z))p.x=nx;if(this.canWalk(p.x,nz))p.z=nz;}
    if(desired.active)this.direction=Math.atan2(dx,dz);
    const delta=Math.atan2(Math.sin(this.direction-this.actor.rotation.y),Math.cos(this.direction-this.actor.rotation.y));
    this.actor.rotation.y+=delta*(1-Math.exp(-dt*12));return Math.hypot(p.x-oldX,p.z-oldZ)>.0001;
  }
}
