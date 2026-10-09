import {QuestRunner} from './systems/quests.js';
export const BOXES = [
 {id:0,x:-2.4,z:1.6,slotX:-.9,mark:'○',color:0x709886,name:'초록 동그라미'},
 {id:1,x:.5,z:.3,slotX:.6,mark:'△',color:0xc1945c,name:'노란 세모'},
 {id:2,x:3.3,z:1.6,slotX:2.1,mark:'□',color:0x9299b4,name:'보라 네모'}
];
export const OBSTACLES = [
 {x:-3.8,z:-2.65,w:2.5,d:1.3},
 {x:.6,z:-3.55,w:4.8,d:.8},
 {x:4.6,z:-2.9,w:.6,d:.6},
 {x:-4.85,z:.5,w:.75,d:.75},
 {x:4.85,z:3.35,w:.7,d:.7},
 {x:-4.8,z:3.35,w:.7,d:.7},
 {x:-3.8,z:5.2,w:2,d:.75},
 {x:4.8,z:5.4,w:1.15,d:1.15}
];

// Adapter for the retained box and lantern gameplay. Quest order lives in JSON.
export class Flow {
 constructor(chapter){this.load(chapter)}
 load(chapter){this.runner=new QuestRunner(chapter);this.carry=null;this.placed=new Set();this.sparks=0;}
 reset(){this.load(this.runner.chapter)}
 advance(){const advanced=this.runner.advance();if(advanced){this.carry=null;this.placed.clear();this.sparks=0;}return advanced}
 get phase(){return this.runner.active?.type??'done'}
 get quest(){return this.runner.active}
 record(target){return this.runner.emit('interact',target)}
 pick(id){if(this.phase!=='boxes'||this.carry!==null||this.placed.has(id)||!BOXES.some(b=>b.id===id))return false;this.carry=id;return true}
 place(id){if(this.phase!=='boxes'||this.carry!==id)return false;this.placed.add(id);this.carry=null;this.runner.emit('box:placed','slot'+id);return true}
 spark(pos){if(this.phase!=='light'||this.runner.ready||pos<.4||pos>.64)return false;this.sparks++;return this.runner.emit('spark','light',this.sparks)}
 finish(target){return this.runner.emit('arrive',target)}
 canWalk(x,z,r=.26){if(x< -5.12||x>5.12||z< -3.92||z>7.3)return false;return !OBSTACLES.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)}
 objectives(){const q=this.quest;return {index:this.runner.index,title:q?q.title.replace('{count}',this.runner.count):'완료',desc:q?.description??'챕터를 완료했습니다.'}}
}
