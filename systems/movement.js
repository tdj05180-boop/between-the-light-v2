// Position/collision are independent of meshes, bones and animation names.
export class MovementController {
  constructor(actor,canWalk){this.actor=actor;this.canWalk=canWalk;this.velocity={x:0,z:0};this.direction=0;}
  stop(){this.velocity.x=this.velocity.z=0;}
  update(dt,input,yaw,speed,locked){
    if(locked){this.stop();return false;}
    let {x,z}=input;const length=Math.hypot(x,z);
    if(length<.13)x=z=0;else{x/=Math.max(1,length);z/=Math.max(1,length);}
    const dx=x*Math.cos(yaw)+z*Math.sin(yaw),dz=-x*Math.sin(yaw)+z*Math.cos(yaw);
    const a=1-Math.exp(-dt*16);this.velocity.x+=(dx*speed-this.velocity.x)*a;this.velocity.z+=(dz*speed-this.velocity.z)*a;
    const p=this.actor.position,oldX=p.x,oldZ=p.z;
    // Substeps keep collision stable during a slow foreground frame.
    const steps=Math.max(1,Math.ceil(dt/.016));
    for(let i=0;i<steps;i++){const nx=p.x+this.velocity.x*dt/steps,nz=p.z+this.velocity.z*dt/steps;if(this.canWalk(nx,p.z))p.x=nx;if(this.canWalk(p.x,nz))p.z=nz;}
    if(length>=.13)this.direction=Math.atan2(dx,dz);
    const delta=Math.atan2(Math.sin(this.direction-this.actor.rotation.y),Math.cos(this.direction-this.actor.rotation.y));
    this.actor.rotation.y+=delta*(1-Math.exp(-dt*12));return Math.hypot(p.x-oldX,p.z-oldZ)>.0001;
  }
}
