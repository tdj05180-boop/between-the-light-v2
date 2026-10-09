// Browser compatibility only; no game progression or timer state lives here.
export function capturePointer(element,id){try{element.setPointerCapture(id);return true;}catch{return false;}}
export function releasePointer(element,id){try{if(id!==null&&element.hasPointerCapture(id))element.releasePointerCapture(id);}catch{}}
export function inside(element,event){const r=element.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;}

// Scoped to canvas/controls. Help, story text and the rest of the document retain native zoom.
// Touch cancellation can suppress Safari's compatibility click, so touch action buttons below
// use Pointer Events directly. These listeners do NOT cancel or stop Pointer Events.
export function guardGameGestures(regions){
 const prevent=e=>{if(e.cancelable)e.preventDefault();};
 for(const region of regions){
  for(const type of ['touchstart','touchmove','touchend','gesturestart','gesturechange','gestureend'])region.addEventListener(type,prevent,{passive:false});
  region.addEventListener('dblclick',prevent);
  region.addEventListener('contextmenu',prevent);
 }
}

export function bindTouchAction(button,action,{onPress=false}={}){
 let pointer=null,lastTouch=-Infinity;
 const clear=()=>{const id=pointer;pointer=null;releasePointer(button,id);};
 button.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;
  lastTouch=performance.now();e.preventDefault();e.stopPropagation();
  if(button.disabled||pointer!==null)return;
  if(capturePointer(button,e.pointerId)){pointer=e.pointerId;if(onPress)action();}
 });
 button.addEventListener('pointermove',e=>{if(e.pointerId===pointer&&!inside(button,e))clear();});
 button.addEventListener('pointerup',e=>{
  if(e.pointerType!=='touch')return;
  lastTouch=performance.now();e.preventDefault();
  if(e.pointerId!==pointer)return;
  const activate=!onPress&&!button.disabled&&inside(button,e);clear();if(activate)action();
 });
 for(const type of ['pointercancel','lostpointercapture'])button.addEventListener(type,e=>{if(e.pointerId===pointer)clear();});
 button.addEventListener('click',e=>{
  // Real mouse and keyboard activation remain native. Ignore only touch-generated duplicates.
  if(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents||(e.detail>0&&performance.now()-lastTouch<800)){e.preventDefault();return;}
  action();
 });
 return clear;
}

export function fullscreenAPI(doc){
 const root=doc.documentElement;
 if(doc.fullscreenEnabled===true&&typeof root.requestFullscreen==='function'&&typeof doc.exitFullscreen==='function')return {active:()=>!!doc.fullscreenElement,enter:()=>root.requestFullscreen(),exit:()=>doc.exitFullscreen()};
 if(doc.webkitFullscreenEnabled===true&&typeof root.webkitRequestFullscreen==='function'&&typeof doc.webkitExitFullscreen==='function')return {active:()=>!!doc.webkitFullscreenElement,enter:()=>root.webkitRequestFullscreen(),exit:()=>doc.webkitExitFullscreen()};
 return null;
}

export function bindFullscreen(button,doc,onError){
 const sync=()=>{const api=fullscreenAPI(doc);button.hidden=!api;button.disabled=!api;button.setAttribute('aria-label',api?.active()?'전체 화면 종료':'전체 화면');button.title=button.getAttribute('aria-label');};
 button.addEventListener('click',async()=>{const api=fullscreenAPI(doc);if(!api){sync();return;}try{await(api.active()?api.exit():api.enter());}catch{onError();}finally{sync();}});
 doc.addEventListener('fullscreenchange',sync);doc.addEventListener('webkitfullscreenchange',sync);sync();
 return sync;
}

// Do not turn an intentionally zoomed help page into a feedback loop of layout resizes.
export function visibleGameViewport(win){
 const v=win.visualViewport,normal=!v||Math.abs(v.scale-1)<.01;
 const height=Math.max(1,normal&&v?Math.min(win.innerHeight,v.height):win.innerHeight);
 return {height,top:normal&&v?Math.max(0,Math.min(v.offsetTop,win.innerHeight-height)):0};
}
