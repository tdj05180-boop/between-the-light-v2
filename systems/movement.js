// Position/collision are independent of meshes, bones and animation names.
export const RUN_RELEASE_BLEND_MS=250;
export const RUN_RELEASE_INITIAL_RESPONSE=2;
export const AIR_ACCELERATION=2.2;
export const AIR_BRAKING=.65;
function worldInput(input,yaw){
 let {x,z}=input;const length=Math.hypot(x,z);
 if(length<.13)x=z=0;else{x/=Math.max(1,length);z/=Math.max(1,length);}
 return {x:x*Math.cos(yaw)+z*Math.sin(yaw),z:-x*Math.sin(yaw)+z*Math.cos(yaw),active:length>=.13};
}
export class MovementController {
  constructor(actor,canWalk){this.actor=actor;this.canWalk=canWalk;this.velocity={x:0,z:0};this.direction=0;this.airSpeed=0;this.runRelease=null;this.lastTakeoff=null;}
  stop(){this.velocity.x=this.velocity.z=0;this.airSpeed=0;this.clearRunRelease();}
  clearRunRelease(){this.runRelease=null;}
  beginRunRelease(input,yaw,walkSpeed){
    const desired=worldInput(input,yaw),length=Math.hypot(desired.x,desired.z);
    const forwardSpeed=length?(this.velocity.x*desired.x+this.velocity.z*desired.z)/length:0;
    this.runRelease=desired.active&&forwardSpeed>walkSpeed*length+.1?{elapsed:0,walkSpeed,inputLength:length}:null;
  }
  beginJump({mobile=false}={}){
    // Capture current velocity without changing it: no stored run speed or direction is restored.
    const speed=Math.hypot(this.velocity.x,this.velocity.z);
    this.airSpeed=speed;this.lastTakeoff={speed,mobile};this.clearRunRelease();
  }
  land(){this.airSpeed=0;this.clearRunRelease();}
  snapshot(){return {velocity:{...this.velocity},airSpeed:this.airSpeed,lastTakeoff:this.lastTakeoff};}
  update(dt,input,yaw,speed,locked,airborne=false){
    if(locked){this.stop();return false;}
    const desired=worldInput(input,yaw),dx=desired.x,dz=desired.z;
    if(!desired.active)this.clearRunRelease();
    // Reuse the same velocity and collision integration in the air; only steering strength changes.
    const targetSpeed=airborne?(this.airSpeed||speed):speed;
    const response=airborne?(desired.active?AIR_ACCELERATION:AIR_BRAKING):16;
    const a=1-Math.exp(-dt*response);
    let tx=dx*targetSpeed,tz=dz*targetSpeed;
    if(this.runRelease&&!airborne&&dt>0){
      const release=this.runRelease,length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
      const along=this.velocity.x*ux+this.velocity.z*uz,current=Math.hypot(this.velocity.x,this.velocity.z),target=length*speed;
      if(speed!==release.walkSpeed||length<release.inputLength-.05||along<=target||along<current*.5){this.clearRunRelease();}
      else{
        // Only soften deceleration along the requested direction. Lateral steering still uses 16.
        // Integrate the 2 -> 16 quadratic response ramp to avoid frame-rate-dependent release timing.
        const duration=RUN_RELEASE_BLEND_MS/1000,t0=release.elapsed,t1=Math.min(duration,t0+dt);
        const integral=RUN_RELEASE_INITIAL_RESPONSE*(t1-t0)+(16-RUN_RELEASE_INITIAL_RESPONSE)*(t1**3-t0**3)/(3*duration**2)+16*Math.max(0,t0+dt-duration);
        const soft=1-Math.exp(-integral),adjusted=along+(target-along)*soft/a;
        tx=ux*adjusted;tz=uz*adjusted;release.elapsed=t1;
        if(t1>=duration)this.clearRunRelease();
      }
    }
    this.velocity.x+=(tx-this.velocity.x)*a;this.velocity.z+=(tz-this.velocity.z)*a;
    const p=this.actor.position,oldX=p.x,oldZ=p.z;
    // Substeps keep collision stable during a slow foreground frame.
    const steps=Math.max(1,Math.ceil(dt/.016));
    for(let i=0;i<steps;i++){const nx=p.x+this.velocity.x*dt/steps,nz=p.z+this.velocity.z*dt/steps;if(this.canWalk(nx,p.z))p.x=nx;if(this.canWalk(p.x,nz))p.z=nz;}
    if(desired.active)this.direction=Math.atan2(dx,dz);
    const delta=Math.atan2(Math.sin(this.direction-this.actor.rotation.y),Math.cos(this.direction-this.actor.rotation.y));
    this.actor.rotation.y+=delta*(1-Math.exp(-dt*12));return Math.hypot(p.x-oldX,p.z-oldZ)>.0001;
  }
}
