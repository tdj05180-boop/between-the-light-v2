// Vertical hop only: horizontal collisions and quest interactions stay in their existing systems.
export class JumpController {
 constructor(){this.reset();}
 reset(){this.height=0;this.velocity=0;this.airborne=false;}
 start(locked=false){if(locked||this.airborne)return false;this.airborne=true;this.velocity=3.8;return true;}
 update(dt){if(!this.airborne||dt<=0)return this.height;this.height+=this.velocity*dt-6*dt*dt;this.velocity-=12*dt;if(this.height<=0){this.reset();}return this.height;}
 snapshot(){return {height:this.height,airborne:this.airborne};}
}
