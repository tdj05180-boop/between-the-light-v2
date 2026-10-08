// A single monotonic, pause-aware timeline drives records AND mandatory sequences.
export class GameTime {
  constructor(now=()=>performance.now()){this.now=now;this.reset();}
  reset(){this.started=false;this.ended=false;this.activeMs=0;this.anchor=null;this.reasons=new Set();this.interrupted=false;this.intervals=[];this.pauseAt=null;}
  start(){if(this.started)return;this.started=true;this.anchor=this.reasons.size?null:this.now();}
  get paused(){return this.reasons.size>0;}
  elapsed(){return this.activeMs+(this.anchor===null?0:Math.max(0,this.now()-this.anchor));}
  pause(reason){if(this.ended)return;if(reason==='background'&&this.started)this.interrupted=true;if(this.reasons.has(reason))return;
    const now=this.now();if(!this.paused){if(this.anchor!==null)this.activeMs+=Math.max(0,now-this.anchor);this.anchor=null;this.pauseAt=now;}
    this.reasons.add(reason);
  }
  resume(reason){if(!this.reasons.delete(reason)||this.paused||this.ended)return;const now=this.now();
    this.intervals.push({start:this.pauseAt,end:now});this.pauseAt=null;if(this.started)this.anchor=now;
  }
  finish(){if(!this.ended){this.activeMs=this.elapsed();this.anchor=null;this.ended=true;}return this.snapshot();}
  snapshot(){return {elapsedMs:this.elapsed(),interrupted:this.interrupted,started:this.started,completed:this.ended,pauseReasons:[...this.reasons]};}
}
export function formatTime(ms){const n=Math.max(0,Math.floor(ms));return `${String(Math.floor(n/60000)).padStart(2,'0')}:${String(Math.floor(n/1000)%60).padStart(2,'0')}.${String(n%1000).padStart(3,'0')}`;}

export class Timeline {
  constructor(clock){this.clock=clock;this.cancel();}
  cancel(){this.steps=[];this.index=-1;this.onStep=null;this.onDone=null;this.deadline=0;}
  get active(){return this.index>=0;}
  get step(){return this.active?this.steps[this.index]:null;}
  get remainingMs(){return this.active?Math.max(0,this.deadline-this.clock.elapsed()):0;}
  play(steps,onStep,onDone){if(this.active)throw Error('Sequence already active');
    if(!steps.length){onDone?.();return;}
    this.steps=steps;this.index=0;this.onStep=onStep;this.onDone=onDone;
    this.deadline=this.clock.elapsed()+steps[0].durationMs;onStep(steps[0],0);
  }
  tick(){if(this.clock.paused||!this.active)return;
    // Keep nominal duration independent of FPS. A delayed render cannot advance early.
    const now=this.clock.elapsed();
    while(this.active&&now>=this.deadline){
      if(++this.index>=this.steps.length){const done=this.onDone;this.cancel();done?.();break;}
      this.deadline+=this.step.durationMs;this.onStep(this.step,this.index);
    }
  }
}

export async function withLoading(clock,task){clock.pause('loading');try{return await task();}finally{clock.resume('loading');}}
