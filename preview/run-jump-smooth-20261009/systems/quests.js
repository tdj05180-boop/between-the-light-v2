export function validateChapter(c){
  const fail=m=>{throw Error(`Chapter JSON: ${m}`)};
  if(!c||c.schemaVersion!==1||typeof c.id!=='string'||!c.id||!Array.isArray(c.quests)||!c.quests.length)fail('schemaVersion/id/quests');
  if(typeof c.title!=='string'||c.sceneId!=='legacy-room'||!Array.isArray(c.interactions)||!c.sequences||typeof c.sequences!=='object')fail('title/sceneId/interactions/sequences');
  const ids=new Set(),targets=new Set();
  for(const t of c.interactions){if(!t.id||targets.has(t.id)||!['npc','object'].includes(t.kind)||!['x','z','radius'].every(k=>Number.isFinite(t[k]))||t.radius<=0||typeof t.label!=='string')fail('interaction');targets.add(t.id);}
  for(const [id,s] of Object.entries(c.sequences)){
    if(!Array.isArray(s.lines)||!s.lines.length||typeof s.lockMovement!=='boolean')fail(`sequence ${id}`);
    for(const line of s.lines){if(typeof line.text!=='string'||!Number.isFinite(line.durationMs)||line.durationMs<=0)fail(`durationMs/text in ${id}`);
      if(line.effect&&!['warmth'].includes(line.effect))fail(`unknown effect ${line.effect}`);
      if(line.lockMovement!==undefined&&typeof line.lockMovement!=='boolean')fail('line.lockMovement');}
    if(s.camera&&(!['free','fixed','close','wide'].includes(s.camera.preset)||s.camera.target&&!['x','y','z'].every(k=>Number.isFinite(s.camera.target[k]))))fail(`camera ${id}`);
  }
  for(const q of c.quests){if(!q.id||ids.has(q.id)||typeof q.title!=='string'||typeof q.description!=='string'||!['interact','boxes','light','exit'].includes(q.type))fail('quest id/title/type');ids.add(q.id);
    if(!q.goal||typeof q.goal.event!=='string'||!Number.isInteger(q.goal.count)||q.goal.count<1)fail(`goal ${q.id}`);
    if(!Array.isArray(q.targets)||!q.targets.length||new Set(q.targets).size!==q.targets.length||q.targets.some(id=>!targets.has(id)))fail(`targets ${q.id}`);
    if(q.goal.event!==({interact:'interact',boxes:'box:placed',light:'spark',exit:'arrive'})[q.type])fail(`unsupported event ${q.id}`);
    if(['interact','exit'].includes(q.type)&&q.goal.count>q.targets.length)fail(`unreachable count ${q.id}`);
    if(['boxes','light'].includes(q.type)&&q.goal.count!==3)fail(`legacy minigame count must be 3: ${q.id}`);
    if(q.type==='boxes'&&['crate0','crate1','crate2','slot0','slot1','slot2'].some(id=>!q.targets.includes(id)))fail('legacy boxes require all six anchors');
    if(q.type==='light'&&!q.targets.includes('light'))fail('legacy lantern requires light anchor');
    if(q.before&&q.type!=='interact')fail('before is supported on interact quests');
    for(const key of ['before','after'])if(q[key]&&!c.sequences[q[key]])fail(`sequence reference ${q.id}.${key}`);
  }
  for(const key of ['opening','ending'])if(c[key]&&!c.sequences[c[key]])fail(key);
  if(!c.spawn||!['x','z'].every(k=>Number.isFinite(c.spawn[k])))fail('spawn');return c;
}
export class QuestRunner {
  constructor(chapter){this.load(chapter);}
  load(chapter){this.chapter=validateChapter(chapter);this.index=0;this.count=0;this.seen=new Set();this.history=[];}
  get active(){return this.chapter.quests[this.index]??null;}
  get complete(){return !this.active;}
  get ready(){return !!this.active&&this.count>=this.active.goal.count;}
  emit(event,target,uniqueKey=target){const q=this.active;if(!q||this.ready||q.goal.event!==event||!q.targets.includes(target)||this.seen.has(uniqueKey))return false;
    this.seen.add(uniqueKey);this.count++;return true;
  }
  advance(){if(!this.ready)return false;this.history.push(this.active.id);this.index++;this.count=0;this.seen.clear();return true;}
}
