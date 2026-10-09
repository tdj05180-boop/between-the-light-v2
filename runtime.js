import * as THREE from './vendor/three.module.min.js';
import {Flow,BOXES} from './flow.js';
import {createImprovedWorld} from './models/improved-world.js';
import {createAudio} from './audio.js';
import {GameTime,Timeline,formatTime,withLoading} from './systems/time.js';
import {validateChapter} from './systems/quests.js';
import {MovementController} from './systems/movement.js';
import {InteractionRegistry} from './systems/interactions.js';
import {JumpController} from './systems/jump.js';
import {CameraRig} from './systems/camera.js';
import {capturePointer,releasePointer,inside,guardGameGestures,bindTouchAction,bindFullscreen,visibleGameViewport} from './systems/browser-compat.js';

const $=id=>document.getElementById(id);
const gameTime=new GameTime(),timeline=new Timeline(gameTime),rig=new CameraRig();
const campaignUrl=new URL('./data/campaign.json',import.meta.url);
async function readJSON(url){const r=await fetch(url);if(!r.ok)throw Error(`JSON 로딩 실패: ${r.status} ${url}`);return r.json();}
const campaign=await readJSON(campaignUrl);
if(campaign.schemaVersion!==1||!['presentation','distribution'].includes(campaign.mode)||!Array.isArray(campaign.chapters)||!campaign.chapters.length)throw Error('잘못된 campaign.json');
let chapterIndex=0;
async function loadChapter(index){const c=validateChapter(await readJSON(new URL(campaign.chapters[index],campaignUrl)));if(c.sceneId!=='legacy-room')throw Error(`등록되지 않은 sceneId: ${c.sceneId}`);return c;}
let chapter=await loadChapter(0);
const flow=new Flow(chapter);
let registry=new InteractionRegistry(chapter.interactions);
const canvas=$('scene');
const visualProfile='improved';
const view=createImprovedWorld(canvas);
const {renderer,scene,camera,world,avatar,avatarShadow,carryAnchor,playerView,crates,crateShadows,waypoint,goalBeam,waypointMaterial,dust,trees,sun,bulb,glass,lampLight,cutawayBack,cutawayLeft,add}=view;
const movement=new MovementController(avatar,(x,z)=>flow.canWalk(x,z));
const jump=new JumpController();let jumpOffset=0;
let started=false,finished=false,gameOpen=false,completing=false,warmth=0;
let elapsed=0,walkTime=0,lastStep=0,lampTime=0,gamePos=0,cooldown=0,nearest=null;
let currentYaw=.66,currentDistance=23.8,currentPitch=.7,lastFrame=performance.now();
let sequenceConfig=null,savedCamera=null,sequencePromiseResolve=null;
const camTarget=new THREE.Vector3(0,1.15,.6),lookTarget=new THREE.Vector3(),labelV=new THREE.Vector3();
const keys=new Set(),touch={x:0,z:0};let stickId=null,drag=null,touchRun=false,runPointerId=null;
const touchActions=[];let renderWidth=innerWidth,renderHeight=innerHeight;
let coarse=matchMedia('(any-pointer:coarse)').matches||innerWidth<=900;
const audio=createAudio(()=>gameTime.paused,()=>started);
const {tone,chime}=audio;
let labels=[],toastUntil=0;
const markerGroup=new THREE.Group();world.add(markerGroup);
const marker=add(new THREE.OctahedronGeometry(.115),new THREE.MeshBasicMaterial({color:0xf2d798}),0,0,0,markerGroup);marker.castShadow=false;

function syncRunButton(){$('runBtn').dataset.held=String(touchRun);$('runBtn').textContent='달리기';}
function endStick(){const id=stickId;stickId=null;touch.x=touch.z=0;$('stick').style.transform='translate(0,0)';releasePointer($('joystick'),id);}
function endRun(){const id=runPointerId;runPointerId=null;touchRun=false;syncRunButton();releasePointer($('runBtn'),id);}
function endDrag(){const id=drag?.id;drag=null;releasePointer(canvas,id??null);}
function clearInput(){keys.clear();endStick();endRun();endDrag();for(const clear of touchActions)clear();movement.stop();}
function movementLocked(){return !started||!gameTime.started||finished||gameTime.paused||gameOpen||completing&&!timeline.active||timeline.active&&(timeline.step.lockMovement??sequenceConfig.lockMovement);}
function interactionLocked(){return movementLocked()||timeline.active||completing;}
function cameraLocked(){return gameTime.paused||timeline.active||gameOpen||finished;}
function syncControls(){
 document.body.dataset.mobile=String(coarse);document.body.dataset.dialogue=String(timeline.active);
 $('touchControls').hidden=!coarse||!started||finished;
 $('joystick').setAttribute('aria-disabled',String(movementLocked()));
 $('interactBtn').hidden=coarse?false:timeline.active||finished;
 $('runBtn').hidden=!coarse;$('runBtn').disabled=movementLocked();
 $('jumpBtn').hidden=!coarse;$('jumpBtn').disabled=movementLocked()||jump.airborne;
 $('hint').hidden=timeline.active||finished;
 $('cameraPreset').disabled=cameraLocked();
 for(const id of ['rotateLeft','rotateRight','resetCamera'])$(id).disabled=cameraLocked()||!rig.acceptsInput;
 $('pauseBtn').disabled=!started||finished;
}
function makeLabels(){for(const l of labels)l.el.remove();labels=chapter.interactions.map(t=>{const el=document.createElement('div');el.className='world-label';el.textContent=t.label;$('worldLabels').appendChild(el);return {id:t.id,el,p:new THREE.Vector3(t.x,t.y??1.5,t.z)}});}
function candidates(){const q=flow.quest;if(!q)return [];let list=registry.candidates(q.targets);if(['interact','exit'].includes(q.type))list=list.filter(t=>!flow.runner.seen.has(t.id));
 if(q.type==='boxes')list=list.filter(t=>flow.carry===null?t.action==='pick'&&!flow.placed.has(t.boxId):t.action==='place'&&t.boxId===flow.carry);return list;
}
function chooseNearest(){nearest=interactionLocked()?null:registry.nearest(avatar.position,candidates());$('interactBtn').disabled=!nearest;$('interactText').textContent=nearest?.label??'주변을 둘러보세요';}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=gameTime.elapsed()+2700;}
function updateHUD(){const q=flow.objectives();$('questTitle').textContent=q.title;$('questDesc').textContent=q.desc;
 const steps=$('steps');if(steps.children.length!==chapter.quests.length)steps.replaceChildren(...chapter.quests.map(()=>document.createElement('span')));
 [...steps.children].forEach((el,i)=>el.className=i<q.index?'done':i===q.index?'active':'');
 document.querySelector('.quest-eyebrow').textContent=`CHAPTER ${chapterIndex+1} · ${chapter.title}`;
 $('cargo').hidden=flow.carry===null;if(flow.carry!==null)$('cargo').textContent=`들고 있는 상자 ${BOXES[flow.carry].mark} ${BOXES[flow.carry].name}`;
 waypoint.visible=goalBeam.visible=flow.phase==='exit';syncControls();
}
function playSequence(id){
 if(!id)return Promise.resolve();const config=chapter.sequences[id];
 if(!config)throw Error(`대사 설정 없음: ${id}`);
 if(timeline.active)throw Error('대사 중복 실행');
 sequenceConfig=config;savedCamera=rig.snapshot();clearInput();
 if(config.camera)rig.select(config.camera.preset,config.camera.target??null);
 $('letterbox').classList.toggle('on',!!config.cinematic);
 return new Promise(resolve=>{sequencePromiseResolve=resolve;timeline.play(config.lines,(line,index)=>{
   clearInput();$('speaker').textContent=config.speaker??'';$('dialogText').textContent=line.text;
   $('dialogCount').textContent=`${index+1} / ${config.lines.length}`;$('dialogue').hidden=!line.text;
   if(line.effect==='warmth'){warmth=1;chime();}syncControls();
 },()=>{rig.restore(savedCamera);$('cameraPreset').value=rig.mode;savedCamera=null;sequenceConfig=null;sequencePromiseResolve=null;
   $('dialogue').hidden=true;$('letterbox').classList.remove('on');clearInput();syncControls();resolve();
 });});
}
function persistRecord(completed=false){const record={version:1,mode:campaign.mode,chapterId:chapter.id,...gameTime.snapshot(),completed};
 try{localStorage.setItem('between-lights:current',JSON.stringify(record));if(completed){localStorage.setItem('between-lights:last',JSON.stringify(record));$('saveStatus').textContent='이 브라우저에 기록을 저장했습니다.';}return true;}
 catch{if(completed)$('saveStatus').textContent='브라우저 저장소를 사용할 수 없어 기록을 저장하지 못했습니다.';return false;}
}
function updateTimer(){const ms=gameTime.elapsed();$('runTime').textContent=formatTime(ms);$('runState').textContent=finished?'완료':gameTime.paused?'일시정지':started?'진행 중':'시작 대기';$('interruptState').textContent=gameTime.interrupted?'중단 이력 있음':'';}
function pause(reason){gameTime.pause(reason);clearInput();audio.pause(true);if(started&&!finished)persistRecord();syncControls();updateTimer();}
function resume(reason){gameTime.resume(reason);lastFrame=performance.now();clearInput();audio.pause(gameTime.paused);syncControls();updateTimer();}
function manualPause(){if(!started||finished)return;pause('manual');$('pauseMessage').textContent='게임과 기록, 대사·연출 시간이 멈췄습니다.';$('pauseOverlay').hidden=false;}
function continueGame(){if(document.hidden||gameTime.reasons.has('loading')||gameTime.reasons.has('context'))return;resume('background');resume('manual');$('pauseOverlay').hidden=true;canvas.focus();}
function resetCrates(){BOXES.forEach(b=>{const g=crates[b.id];world.add(g);g.position.set(b.x,.39,b.z);g.scale.setScalar(1);g.rotation.set(0,0,0);crateShadows[b.id].visible=true});}
function resetWorld(){clearInput();jump.reset();jumpOffset=0;avatar.position.set(chapter.spawn.x,.11,chapter.spawn.z);avatar.rotation.y=0;movement.direction=0;warmth=0;walkTime=elapsed=lastStep=lampTime=gamePos=cooldown=0;
 resetCrates();
 rig.select('free');$('cameraPreset').value='free';makeLabels();updateHUD();
}
async function advanceChapter(){
 await playSequence(chapter.ending);
 if(chapterIndex+1<campaign.chapters.length){
   await withLoading(gameTime,async()=>{clearInput();audio.pause(true);updateTimer();const next=await loadChapter(chapterIndex+1);chapterIndex++;chapter=next;flow.load(chapter);registry=new InteractionRegistry(chapter.interactions);resetWorld();renderer.render(scene,camera);});
   lastFrame=performance.now();audio.pause(gameTime.paused);await playSequence(chapter.opening);completing=false;updateHUD();return;
 }
 gameTime.finish();finished=true;completing=false;clearInput();persistRecord(true);updateTimer();
 $('finalTime').textContent=`기록 ${formatTime(gameTime.elapsed())}${gameTime.interrupted?' · 중단 이력 있음':''}`;
 $('ending').hidden=false;$('hud').hidden=true;$('controls').hidden=true;syncControls();
}
function fail(error){pause('error');$('loadError').hidden=false;$('errorMessage').textContent=`진행을 중단했습니다. ${error.message}`;console.error(error);}
async function completeQuest(){if(completing||!flow.runner.ready)return;completing=true;clearInput();
 await playSequence(flow.quest.after);flow.advance();
 if(flow.runner.complete){await advanceChapter();return;}
 if(flow.phase==='boxes')resetCrates();completing=false;updateHUD();
}
async function interact(){if(interactionLocked())return;chooseNearest();if(!nearest)return;const c=nearest,q=flow.quest;
 if(q.type==='interact'){completing=true;chime();await playSequence(q.before);flow.record(c.id);completing=false;await completeQuest();}
 else if(q.type==='boxes'){
  if(c.action==='pick'){if(!flow.pick(c.boxId))return;const g=crates[c.boxId];carryAnchor.add(g);g.position.set(0,0,0);g.rotation.set(0,0,0);g.scale.setScalar(.8);crateShadows[c.boxId].visible=false;tone(240,.035,.15,'triangle');toast('같은 모양의 뒤쪽 선반으로 옮겨주세요.');}
  else if(c.action==='place'){if(!flow.place(c.boxId))return;const b=BOXES[c.boxId],g=crates[c.boxId];world.add(g);g.position.set(b.slotX,1.61,-3.47);g.rotation.set(0,0,0);g.scale.setScalar(1);chime();}
  updateHUD();await completeQuest();
 }else if(q.type==='light'){gameOpen=true;lampTime=0;cooldown=0;clearInput();$('lampGame').hidden=false;updateLampDots();syncControls();}
 else if(q.type==='exit'){flow.finish(c.id);await completeQuest();}
}
function updateLampDots(){[...$('lampDots').children].forEach((el,i)=>el.classList.toggle('lit',i<flow.sparks));}
function closeLamp(){if(gameTime.paused)return;gameOpen=false;$('lampGame').hidden=true;clearInput();syncControls();}
function catchSpark(){if(!gameOpen||gameTime.paused||cooldown>0||timeline.active)return;cooldown=.38;
 if(flow.spark(gamePos)){chime();updateLampDots();$('lampStatus').textContent=`불씨를 모았어요. ${flow.sparks} / ${flow.quest.goal.count}`;
  if(flow.runner.ready){closeLamp();completeQuest().catch(fail);}}
 else{tone(220,.02,.2);$('lampStatus').textContent='불씨가 밝은 구간에 올 때 다시 눌러보세요.';}
}
async function start(){if(started||$('startBtn').disabled)return;started=true;gameTime.start();$('welcome').hidden=true;$('sceneCaption').hidden=true;$('hud').hidden=false;resetWorld();audio.start();await playSequence(chapter.opening);canvas.focus();}
async function reset(){if(!finished)return;timeline.cancel();gameTime.reset();finished=false;gameOpen=false;completing=false;chapterIndex=0;
 try{chapter=await loadChapter(0);flow.load(chapter);registry=new InteractionRegistry(chapter.interactions);resetWorld();['ending','lampGame','dialogue','help','pauseOverlay'].forEach(id=>$(id).hidden=true);$('hud').hidden=false;$('controls').hidden=false;gameTime.start();lastFrame=performance.now();await playSequence(chapter.opening);canvas.focus();}catch(e){fail(e);}
}
function showHelp(){pause('help');$('help').hidden=false;}
function closeHelp(){$('help').hidden=true;resume('help');canvas.focus();}
function safe(fn){return ()=>Promise.resolve().then(fn).catch(fail);}
$('startBtn').addEventListener('click',safe(start));touchActions.push(bindTouchAction($('interactBtn'),safe(interact)));$('catchBtn').addEventListener('click',catchSpark);
$('closeLamp').addEventListener('click',closeLamp);$('restartBtn').addEventListener('click',safe(reset));$('helpBtn').addEventListener('click',showHelp);$('closeHelp').addEventListener('click',closeHelp);$('resumeBtn').addEventListener('click',closeHelp);
$('pauseBtn').addEventListener('click',manualPause);$('continueBtn').addEventListener('click',continueGame);
$('homeLink').addEventListener('click',e=>{e.preventDefault();showHelp()});$('soundBtn').addEventListener('click',()=>{audio.toggle();audio.pause(gameTime.paused)});
const syncFullscreen=bindFullscreen($('fullBtn'),document,()=>toast('전체 화면으로 전환하지 못했습니다. 브라우저 설정을 확인해 주세요.'));
$('cameraPreset').addEventListener('change',()=>{if(cameraLocked())return;const mode=$('cameraPreset').value;rig.select(mode,mode==='fixed'?{x:0,y:1.15,z:.6}:null);syncControls();});
$('rotateLeft').addEventListener('click',()=>{if(!cameraLocked())rig.rotate(-Math.PI/5)});$('rotateRight').addEventListener('click',()=>{if(!cameraLocked())rig.rotate(Math.PI/5)});$('resetCamera').addEventListener('click',()=>{if(!cameraLocked())rig.select('free')});
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLSelectElement)return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyQ','KeyR','KeyP'].includes(e.code))e.preventDefault();
 if(e.repeat)return;
 if(e.code==='Escape'||e.code==='KeyP'){if(!$('help').hidden)closeHelp();else if(!$('pauseOverlay').hidden)continueGame();else if(started&&!finished)manualPause();else showHelp();return;}
 if(gameTime.paused||finished)return;
 if(!started){if(['Enter','Space'].includes(e.code))safe(start)();return;}
 if(gameOpen){if(['Space','Enter','KeyE'].includes(e.code))catchSpark();return;}
 if(['KeyE','Enter'].includes(e.code)&&!interactionLocked())safe(interact)();
 if(!cameraLocked()){if(e.code==='KeyQ')rig.rotate(-Math.PI/5);if(e.code==='KeyR')rig.rotate(Math.PI/5);}
 if(e.code==='Space'&&!movementLocked())jump.start();
 if(!movementLocked())keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clearInput);
touchActions.push(bindTouchAction($('jumpBtn'),()=>jump.start(movementLocked()),{onPress:true}));
guardGameGestures([$('world'),$('touchControls'),$('actionControls')]);
$('runBtn').addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();if(movementLocked()||runPointerId!==null||!capturePointer($('runBtn'),e.pointerId))return;runPointerId=e.pointerId;touchRun=true;syncRunButton();});
$('runBtn').addEventListener('pointermove',e=>{if(e.pointerId===runPointerId&&!inside($('runBtn'),e))endRun();});
$('runBtn').addEventListener('lostpointercapture',e=>{if(e.pointerId===runPointerId)endRun();});
document.addEventListener('visibilitychange',()=>{clearInput();if(document.hidden){pause('background');if(started&&!finished){$('pauseMessage').textContent='다른 탭으로 이동해 일시정지했습니다. 기록에 중단 이력이 저장됩니다.';$('pauseOverlay').hidden=false;}}
 else if(!started||finished){resume('background');}else{updateTimer();}});
window.addEventListener('pagehide',()=>{if(started&&!finished){pause('background');persistRecord();}});
canvas.addEventListener('pointerdown',e=>{if(cameraLocked()||!rig.acceptsInput||drag||!capturePointer(canvas,e.pointerId))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id||cameraLocked())return;rig.rotate(-(e.clientX-drag.x)*.007,(e.clientY-drag.y)*.004);drag.x=e.clientX;drag.y=e.clientY;});
canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===drag?.id)endDrag();});
canvas.addEventListener('wheel',e=>{e.preventDefault();if(!cameraLocked())rig.zoom(e.deltaY*.012)},{passive:false});
function moveStick(e){const r=$('joystick').getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width*.35),z=(e.clientY-r.top-r.height/2)/(r.height*.35);const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}touch.x=x;touch.z=z;$('stick').style.transform=`translate(${x*r.width*.29}px,${z*r.height*.29}px)`;}
$('joystick').addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();if(movementLocked()||stickId!==null||!capturePointer($('joystick'),e.pointerId))return;stickId=e.pointerId;moveStick(e);});
$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===stickId&&!movementLocked())moveStick(e)});
$('joystick').addEventListener('lostpointercapture',e=>{if(e.pointerId===stickId)endStick();});
// Capture-phase cleanup also covers release outside a button or a removed/disabled target.
for(const type of ['pointerup','pointercancel'])window.addEventListener(type,e=>{if(e.pointerId===stickId)endStick();if(e.pointerId===runPointerId)endRun();if(e.pointerId===drag?.id)endDrag();},true);
function syncInputHelp(){
 $('hint').innerHTML=coarse?'빛나는 표시 가까이에서 행동 버튼을 누르세요.':'빛나는 표시 가까이에서 <kbd>E</kbd> 를 누르세요.';
 $('controls').innerHTML=coarse?'조이스틱으로 이동 · 행동 버튼으로 상호작용 · 점프 버튼으로 점프 · 달리기 버튼을 누른 채 이동':'<span><kbd>W A S D</kbd> 이동 · <kbd>Shift</kbd> 달리기 · <kbd>Space</kbd> 점프</span><i></i><span><kbd>E</kbd> 상호작용</span><i></i><span>드래그 시점 회전 · 휠 확대</span>';
 const rows=coarse?[['이동','왼쪽 조이스틱'],['행동','대상 가까이에서 행동 버튼'],['점프','점프 버튼 · 착지 후 다시 점프'],['달리기','달리기 버튼을 누른 채 이동'],['시점','빈 화면을 밀어 회전 · 카메라 프리셋'],['대사·연출','자동 진행 · 스킵 불가'],['일시정지','왼쪽 위 버튼 · 복귀 후 직접 재개']]:[['이동','WASD / 방향키'],['달리기','Shift를 누른 채 이동'],['점프','Space · 착지 후 다시 점프'],['상호작용','E / 화면 오른쪽 아래 버튼'],['시점 회전','화면 드래그 / Q · R / 회전 버튼'],['가까이 보기','마우스 휠 · 시점 초기화 ◎'],['대사·연출','자동 진행 · 스킵 불가'],['일시정지','P / ESC / 왼쪽 위 버튼']];
 $('controlHelp').innerHTML=rows.map(([a,b])=>'<dt>'+a+'</dt><dd>'+b+'</dd>').join('');
 $('scene').setAttribute('aria-label',coarse?'조이스틱 이동, 행동 버튼 상호작용, 점프 버튼 점프, 달리기 버튼 홀드, 빈 화면 드래그 시점 회전':'방향키 또는 WASD 이동, E 상호작용, Space 점프, Shift 달리기, Q와 R 카메라 회전');
 $('lampInstruction').innerHTML=coarse?'움직이는 불씨가 밝은 구간에 닿으면<br>불씨 잡기 버튼을 누르세요.':'움직이는 불씨가 밝은 구간에 닿으면<br><strong>SPACE</strong> 또는 아래 버튼을 누르세요.';
}
function resize(){
 const viewport=visibleGameViewport(window);document.body.style.setProperty('--game-height',viewport.height+'px');document.body.style.setProperty('--game-top',viewport.top+'px');
 const width=canvas.clientWidth,height=canvas.clientHeight;
 if(width!==renderWidth||height!==renderHeight)clearInput();
 renderWidth=Math.max(1,width);renderHeight=Math.max(1,height);
 coarse=matchMedia('(any-pointer:coarse)').matches||renderWidth<=900;syncControls();syncInputHelp();syncFullscreen();
 renderer.setSize(renderWidth,renderHeight,false);camera.aspect=renderWidth/renderHeight;camera.updateProjectionMatrix();
}
let resizeFrame=0;function scheduleResize(){if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});}
window.addEventListener('resize',scheduleResize);window.addEventListener('orientationchange',scheduleResize);
window.visualViewport?.addEventListener('resize',scheduleResize);window.visualViewport?.addEventListener('scroll',scheduleResize);
document.addEventListener('fullscreenchange',scheduleResize);document.addEventListener('webkitfullscreenchange',scheduleResize);resize();
function animate(now){requestAnimationFrame(animate);const frameSeconds=Math.max(0,(now-lastFrame)/1000);lastFrame=now;
 const dt=gameTime.paused?0:Math.min(frameSeconds,.05);elapsed+=dt;timeline.tick();updateTimer();
 if(timeline.active)$('dialogRemaining').textContent=`자동 진행 · ${(timeline.remainingMs/1000).toFixed(1)}초${gameTime.paused?' · 일시정지':''}`;
 if(toastUntil&&gameTime.elapsed()>=toastUntil){$('toast').classList.remove('show');toastUntil=0;}
 const previousX=avatar.position.x,previousZ=avatar.position.z;
 const running=touchRun||keys.has('ShiftLeft')||keys.has('ShiftRight'),targetSpeed=flow.carry===null?(running?4.15:2.55):(running?3.2:2.1);
 const moving=movement.update(dt,{x:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x,z:(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touch.z},currentYaw,targetSpeed,movementLocked());
 if(!interactionLocked()&&flow.phase==='exit'){const target=candidates()[0];if(target&&Math.hypot(avatar.position.x-target.x,avatar.position.z-target.z)<.58){flow.finish(target.id);completeQuest().catch(fail);}}
 walkTime+=moving?dt*9:0;playerView.update({dt,speed:dt>0?Math.hypot(avatar.position.x-previousX,avatar.position.z-previousZ)/dt:0,moving,gait:moving?Math.sin(walkTime):0,elapsed,carrying:flow.carry!==null});
 avatar.position.y-=jumpOffset;view.updatePlayerHeight(dt);jumpOffset=jump.update(dt);avatar.position.y+=jumpOffset;
 $('jumpBtn').disabled=movementLocked()||jump.airborne;
 if(moving&&elapsed-lastStep>.28){lastStep=elapsed;tone(125,.006,.045,'triangle');}chooseNearest();
 let desiredDistance=rig.distance,desiredYaw=rig.yaw;const portrait=renderWidth/renderHeight<.8;
 if(rig.target){lookTarget.set(rig.target.x,rig.target.y,rig.target.z);if(portrait)desiredDistance*=1.18;}
 else if(!started){lookTarget.set(portrait?0:-2.8,portrait?-.3:1,portrait?2.6:.25);desiredDistance=portrait?29:25.5;desiredYaw+=Math.sin(elapsed*.13)*.025;}
 else{const close=rig.mode==='close';lookTarget.set(avatar.position.x*(close?1:.21),close?1:.9,close?avatar.position.z:.4+avatar.position.z*.19);if(portrait)desiredDistance*=1.47;}
 camTarget.lerp(lookTarget,1-Math.exp(-dt*2.7));currentYaw=THREE.MathUtils.lerp(currentYaw,desiredYaw,1-Math.exp(-dt*5));currentPitch=THREE.MathUtils.lerp(currentPitch,rig.pitch,1-Math.exp(-dt*5));currentDistance=THREE.MathUtils.lerp(currentDistance,desiredDistance,1-Math.exp(-dt*3));
 camera.position.set(camTarget.x+Math.sin(currentYaw)*Math.cos(currentPitch)*currentDistance,camTarget.y+Math.sin(currentPitch)*currentDistance,camTarget.z+Math.cos(currentYaw)*Math.cos(currentPitch)*currentDistance);camera.lookAt(camTarget);camera.updateMatrixWorld();
 const ct=candidates(),markerTarget=ct.reduce((best,c)=>!best||Math.hypot(c.x-avatar.position.x,c.z-avatar.position.z)<Math.hypot(best.x-avatar.position.x,best.z-avatar.position.z)?c:best,null);
 markerGroup.visible=!interactionLocked();if(markerTarget){markerGroup.position.set(markerTarget.x,(markerTarget.y??1.7)+Math.sin(elapsed*3)*.095,markerTarget.z);marker.rotation.y=elapsed;}
 for(const l of labels){const relevant=!interactionLocked()&&ct.some(c=>c.id===l.id);l.el.hidden=!relevant;if(!relevant)continue;labelV.copy(l.p).project(camera);l.el.style.left=(labelV.x*.5+.5)*renderWidth+'px';l.el.style.top=(-labelV.y*.5+.5)*renderHeight+'px';l.el.style.opacity=labelV.z<1?1:0;}
 view.updateAmbient({dt,elapsed,warmth,currentYaw});
 if(gameOpen&&!gameTime.paused){lampTime+=dt;cooldown=Math.max(0,cooldown-dt);gamePos=.5+.47*Math.sin(lampTime*(1.4+flow.sparks*.16)-Math.PI/2);$('spark').style.left=(gamePos*100)+'%';}
 renderer.render(scene,camera);
}
resetWorld();renderer.render(scene,camera);
await withLoading(gameTime,async()=>{});
lastFrame=performance.now();requestAnimationFrame(animate);
$('startBtn').disabled=false;$('startLabel').textContent='이야기 속으로';
if(document.hidden)pause('background');
// Read-only diagnostics. No teleport, skip, or state mutation API is exposed.
window.gameStatus=()=>({visualProfile,jump:jump.snapshot(),mobileUI:coarse,runRequested:touchRun||keys.has('ShiftLeft')||keys.has('ShiftRight'),graphics:{render:{...renderer.info.render},memory:{...renderer.info.memory},dpr:renderer.getPixelRatio()},model:playerView.adapter.snapshot?.(),phase:flow.phase,questId:flow.quest?.id,chapterId:chapter.id,chapterIndex,carrying:flow.carry,placed:flow.placed.size,sparks:flow.sparks,started,finished,completing,dialogue:timeline.active,lineIndex:timeline.index,remainingMs:timeline.remainingMs,movementLocked:movementLocked(),position:{x:avatar.position.x,z:avatar.position.z,yaw:avatar.rotation.y},camera:{...rig.snapshot(),currentYaw},gamePos,cooldown,gameOpen,nearest:nearest?.id,rendered:renderer.info.render.calls>0,timer:gameTime.snapshot()});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause('context');$('loadError').hidden=false;$('errorMessage').textContent='3D 화면 연결이 끊겼습니다. 기록과 진행을 멈췄습니다. 다시 불러오기를 눌러주세요.';});

