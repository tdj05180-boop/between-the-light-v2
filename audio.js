const $=id=>document.getElementById(id);
export function createAudio(isPaused,isStarted){
let paused=false,started=false;
let audioCtx=null,master=null,musicTimer=null,muted=true,noteIndex=0;
function tone(freq,vol=.06,length=.35,type='sine',delay=0){if(!audioCtx||muted)return;const t=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(g);g.connect(master);o.start(t);o.stop(t+length+.04)}
function initAudio(){if(!audioCtx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audioCtx=new C();master=audioCtx.createGain();master.gain.value=.6;master.connect(audioCtx.destination);musicTimer=setInterval(()=>{if(document.hidden||isPaused()||!isStarted()||muted)return;const notes=[261.63,329.63,392,329.63,220,293.66,349.23,293.66];tone(notes[noteIndex%8],.018,2.5,'sine');if(noteIndex%4===0)tone(notes[noteIndex%8]/2,.022,3.8,'sine');noteIndex++},720)}audioCtx.resume().catch(()=>{});muted=false;updateSound()}
function updateSound(){$('soundState').textContent=muted?'OFF':'ON';$('soundBtn').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');if(master)master.gain.setTargetAtTime(muted?0:.6,audioCtx.currentTime,.08)}
function chime(){tone(523.25,.045,.8);tone(659.25,.034,.8,'sine',.12);tone(783.99,.026,1.15,'sine',.25)}

return {tone,chime,start:initAudio,toggle(){if(!audioCtx)initAudio();else{muted=!muted;audioCtx.resume().catch(()=>{});updateSound()}},pause(value){if(!audioCtx)return;if(value)audioCtx.suspend().catch(()=>{});else if(!muted)audioCtx.resume().catch(()=>{});}};
}
