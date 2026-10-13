import { WORLDS, DIFFICULTIES, createWorld, createRun, tick, rating } from './core.js?v=2.1.0';

const $=id=>document.getElementById(id);
const STORAGE='cube-man-remastered-v2';
const defaults={unlocked:0,selected:0,difficulty:'adventure',sound:false,quality:'high',reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,best:{}};
function loadSave() {
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE))||{};
    return {...defaults,unlocked:Number.isInteger(saved.unlocked)?Math.max(0,Math.min(2,saved.unlocked)):0,selected:Number.isInteger(saved.selected)?Math.max(0,Math.min(2,saved.selected)):0,difficulty:DIFFICULTIES[saved.difficulty]?saved.difficulty:defaults.difficulty,sound:saved.sound===true,quality:saved.quality==='low'?'low':'high',reduced:typeof saved.reduced==='boolean'?saved.reduced:defaults.reduced,best:saved.best&&typeof saved.best==='object'&&!Array.isArray(saved.best)?saved.best:{}};
  } catch {return {...defaults,best:{}};}
}
const save=loadSave();
let selected=save.selected,run=null,scene=null,paused=false,started=false,lastFrame=0,toastUntil=0,modalClosable=true,resumeOnClose=false,storageWarning=false;
let stick={x:0,z:0},dashQueued=false,gamepadDash=false,gamepadPause=false;
const keys=new Set();
function persist() {try{localStorage.setItem(STORAGE,JSON.stringify(save));}catch{if(!storageWarning){storageWarning=true;toast('Progress is saved for this visit only. Browser storage is unavailable.');}}}
const formatTime=t=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
function bestFor(index) {const b=save.best[`${index}-${save.difficulty}`];return b&&Number.isFinite(b.time)&&b.time>=0&&Number.isInteger(b.stars)&&b.stars>=1&&b.stars<=3?b:null;}

class Sound {
  constructor(){this.context=null;this.enabled=save.sound;}
  wake(){if(!this.enabled)return;try{this.context ||= new (window.AudioContext||window.webkitAudioContext)();this.context.resume().catch(()=>{});}catch{this.enabled=false;}}
  play(type){if(!this.enabled)return;this.wake();const ctx=this.context;if(!ctx)return;
    const tones={shard:[523,659,784],mote:[880,1109],checkpoint:[392,523,659],hit:[180,120],dash:[240,480],won:[523,659,784,1046],lost:[330,247,165],start:[392,523]};
    (tones[type]||[523]).forEach((freq,i)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+i*.085;oscillator.type=type==='hit'?'triangle':'sine';oscillator.frequency.setValueAtTime(freq,t);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.07,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.24);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(t);oscillator.stop(t+.25);});
  }
}
const sound=new Sound();
function updateSound(){const b=$('sound-button');b.setAttribute('aria-pressed',String(sound.enabled));b.setAttribute('aria-label',sound.enabled?'Mute sound':'Enable sound');b.title=sound.enabled?'Mute sound':'Enable sound';b.querySelector('.sound-slash').hidden=sound.enabled;}
$('sound-button').onclick=()=>{sound.enabled=!sound.enabled;save.sound=sound.enabled;updateSound();persist();sound.play('mote');};updateSound();

function toast(message,seconds=3.2){$('toast').textContent=message;$('toast').classList.add('visible');toastUntil=performance.now()+seconds*1000;}
function worldCards(){
  $('worlds').replaceChildren();
  WORLDS.forEach((world,i)=>{
    const button=document.createElement('button');button.className=`world-card${selected===i?' selected':''}`;button.style.setProperty('--card-color',world.accent);
    button.setAttribute('aria-pressed',String(selected===i));button.setAttribute('aria-label',`Select world ${i+1}: ${world.name}`);
    const best=bestFor(i);
    button.innerHTML=`<span class="world-icon" aria-hidden="true">${i+1}</span><span><small>WORLD ${i+1}</small><strong>${world.short}</strong><span class="world-status">${best?'★'.repeat(best.stars)+' · '+formatTime(best.time):'Click to select'}</span></span>`;
    button.onclick=()=>preview(i);$('worlds').appendChild(button);
  });
}
function preview(index){selected=index;save.selected=index;persist();const world=WORLDS[index];
  $('preview-tag').textContent=`WORLD ${index+1}`;$('preview-name').textContent=world.name;$('preview-subtitle').textContent=world.subtitle;
  document.documentElement.style.setProperty('--lime',world.accent);
  if(scene){scene.playing=false;scene.build(createWorld(index),DIFFICULTIES[save.difficulty]);}
  $('play-button').innerHTML=`PLAY WORLD ${index+1} <span>▶</span>`;worldCards();
}
$('difficulty').value=save.difficulty;
function difficultyChanged(){save.difficulty=$('difficulty').value;$('difficulty-description').textContent=DIFFICULTIES[save.difficulty].description;persist();worldCards();if(scene&&!started)scene.build(createWorld(selected),DIFFICULTIES[save.difficulty]);}
$('difficulty').onchange=difficultyChanged;$('difficulty-description').textContent=DIFFICULTIES[save.difficulty].description;worldCards();

const dialog=$('dialog');
function clearInput(){keys.clear();stick={x:0,z:0};dashQueued=false;$('joystick-knob').style.transform='translate(0,0)';}
function closeModal(){if(!modalClosable)return;dialog.close();}
dialog.addEventListener('close',()=>{clearInput();if(resumeOnClose&&run?.status==='playing')paused=false;resumeOnClose=false;});
dialog.addEventListener('cancel',event=>{if(!modalClosable)event.preventDefault();});
$('dialog-close').onclick=closeModal;
function modal(content,{closable=true,resume=false}={}){
  clearInput();paused=started;resumeOnClose=resume;modalClosable=closable;$('dialog-close').hidden=!closable;$('dialog-content').innerHTML=content;
  if(!dialog.open)dialog.showModal();
}
function leaveModal(){resumeOnClose=false;dialog.close();}
function settingsMarkup(){return `<div class="setting-row"><label for="quality">Graphics</label><select id="quality"><option value="high" ${save.quality==='high'?'selected':''}>HIGH / pixel shadows</option><option value="low" ${save.quality==='low'?'selected':''}>LOW / faster</option></select></div><div class="setting-row"><label for="reduced">Reduce ambient motion</label><input id="reduced" type="checkbox" ${save.reduced?'checked':''}></div>`;}
function bindSettings(){const q=$('quality');if(q)q.onchange=()=>{save.quality=q.value;scene.quality(q.value);persist();};const r=$('reduced');if(r)r.onchange=()=>{save.reduced=r.checked;scene.reduced=r.checked;persist();};}
function guide(){modal(`<span class="eyebrow">CUBE MAN ADVENTURE</span><h2 id="dialog-title">How to play</h2><div class="guide-grid"><span>◆</span><p><strong>Collect 3 BLUE fragments</strong>Walk onto their blue square floor markers. They are picked up automatically, including at tile edges. No extra key needed.</p><span>✦</span><p><strong>Golden lights = speed boost</strong>These optional pickups make you faster for 3 seconds.</p><span>◎</span><p><strong>Blue waystone = checkpoint</strong>Its pale ring restores your hearts. After a hit you return here and keep your fragments.</p><span>☁</span><p><strong>Avoid ghosts and red mushrooms</strong>They take a heart. Dash to pass through danger safely.</p></div><div class="guide-controls"><b>Keyboard:</b> WASD / arrows: move · Space: dash<br>C: camera · Esc / P: pause<br><b>Touch:</b> thumbstick: move · DASH: dash<br><b>Gamepad:</b> left stick / D-pad: move · A: dash · Start: pause</div><p>All 3 worlds can be selected from the menu. Collect the fragments and enter the exit to finish. There is no time limit.</p>${settingsMarkup()}<div class="dialog-actions"><button id="guide-done" class="primary-button">GOT IT <span>▶</span></button></div>`,{resume:started&&run?.status==='playing'});$('guide-done').onclick=closeModal;bindSettings();}
$('guide-button').onclick=guide;
$('credits-button').onclick=()=>modal(`<span class="eyebrow">CUBE MAN ADVENTURE</span><h2 id="dialog-title">Credits</h2><p><span class="credit-name">Weihao Wang</span><br>Original creator, game concept, and student project for the Interactive Graphics course at Sapienza.</p><p><span class="credit-name">ChatGPT / OpenAI Codex</span><br>Remaster collaborator: game design, original procedural artwork, programming, interface, accessibility improvements, and testing.</p><p>Built on the Three.js engine included in the original project. The remaster’s worlds, character, and sounds are generated in code.</p><p>The original project is preserved as a playable archive, including its original asset attributions.</p><div class="dialog-actions"><a class="secondary-button" href="../original/">Play the original ↗</a><a class="secondary-button" href="https://github.com/Wealhour/An-interactive-browser-game-based-on-WebGL" target="_blank" rel="noopener">View the source ↗</a></div>`,{resume:started&&run?.status==='playing'});

function start(index=selected){if(!scene)return;leaveModal();selected=index;save.selected=index;persist();run=createRun(index,save.difficulty);paused=false;started=true;clearInput();
  scene.playing=true;scene.follow=window.innerWidth<761;scene.build(run.world,run.rules);
  $('lobby').hidden=true;$('hud').hidden=false;document.body.classList.add('playing');scene.resize();
  $('world-number').textContent=`WORLD 0${index+1} / ${run.rules.name.toUpperCase()}`;$('world-name').textContent=run.world.config.name;document.documentElement.style.setProperty('--lime',run.world.config.accent);
  cameraLabel();updateHud();sound.play('start');toast(`WORLD ${index+1}: collect 3 BLUE fragments, then find the exit.`,5);
  $('pause-button').focus({preventScroll:true});
}
$('play-button').onclick=()=>{sound.wake();start();};
function home(){leaveModal();started=false;paused=false;run=null;toastUntil=0;$('toast').classList.remove('visible');document.body.classList.remove('playing');$('hud').hidden=true;$('lobby').hidden=false;clearInput();preview(selected);scene.resize();$('play-button').focus({preventScroll:true});}
function pause(){if(!started||run.status!=='playing'||dialog.open)return;modal(`<span class="eyebrow">GAME PAUSED</span><h2 id="dialog-title">Paused</h2><p>Your journey is paused. ${run.shards} of 3 light fragments found.</p>${settingsMarkup()}<div class="dialog-actions"><button id="resume" class="primary-button">RESUME <span>→</span></button><button id="restart" class="secondary-button">Restart world</button><button id="home" class="secondary-button">MENU</button></div>`,{resume:true});$('resume').onclick=closeModal;$('restart').onclick=()=>start(selected);$('home').onclick=home;bindSettings();}
$('pause-button').onclick=pause;
function cameraLabel(){$('camera-button').innerHTML=`⌖ <span>${scene.follow?'Overview':'Follow'}</span>`;$('camera-button').setAttribute('aria-label',`Switch to ${scene.follow?'overview':'follow'} camera`);}
function toggleCamera(){if(!scene)return;scene.follow=!scene.follow;cameraLabel();}
$('camera-button').onclick=toggleCamera;

function finish(won){
  if(won){const stars=rating(run),key=`${selected}-${run.difficulty}`,old=bestFor(selected);save.unlocked=Math.min(2,Math.max(save.unlocked,selected+1));
    save.best[key]={time:old?Math.min(old.time,run.time):run.time,stars:old?Math.max(old.stars,stars):stars};persist();worldCards();
    modal(`<span class="eyebrow">${selected===2?'ALL WORLDS COMPLETE!':'WORLD 0'+(selected+1)+' / COMPLETE'}</span><h2 id="dialog-title">${selected===2?'YOU WIN!':'WORLD COMPLETE!'}</h2><p>${selected===2?'Through forest, fire, and starlight, our little wanderer found the way. Thank you for taking this journey.':WORLDS[selected+1].name+' is waiting on the other side.'}</p><div class="result-stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}<span style="opacity:.2">${'★'.repeat(3-stars)}</span></div><div class="result-stats"><div><strong>${formatTime(run.time)}</strong><span>YOUR TIME</span></div><div><strong>${run.motes} / 7</strong><span>STARLIGHT</span></div><div><strong>${run.hits}</strong><span>HITS TAKEN</span></div></div><p>${stars===3?'A perfect crossing. Beautifully done.':`Three stars: finish without a hit and under ${formatTime(run.world.config.par)}. Your best time and star rating are saved separately for this difficulty.`}</p><div class="dialog-actions">${selected<2?'<button id="next-world" class="primary-button">NEXT WORLD <span>→</span></button>':'<button id="return-home" class="primary-button">WORLD SELECT <span>→</span></button>'}<button id="try-again" class="secondary-button">PLAY AGAIN</button><button id="result-home" class="secondary-button">MENU</button></div>`,{closable:false});
    if($('next-world'))$('next-world').onclick=()=>start(selected+1);if($('return-home'))$('return-home').onclick=()=>{selected=0;home();};$('try-again').onclick=()=>start(selected);$('result-home').onclick=home;
  }else{
    modal(`<span class="eyebrow">CUBE MAN ADVENTURE</span><h2 id="dialog-title">GAME OVER</h2><p>You ran out of hearts. Try again or choose another world from the menu.</p><div class="result-stats"><div><strong>${formatTime(run.time)}</strong><span>TIME EXPLORING</span></div><div><strong>${run.shards} / 3</strong><span>FRAGMENTS</span></div></div><p>Use Space to dash through danger, or try EASY mode for 5 hearts and slower ghosts.</p><div class="dialog-actions"><button id="retry" class="primary-button">RETRY <span>→</span></button><button id="easier" class="secondary-button">TRY EASY MODE</button><button id="result-home" class="secondary-button">MENU</button></div>`,{closable:false});
    $('retry').onclick=()=>start(selected);$('easier').onclick=()=>{save.difficulty='explorer';$('difficulty').value='explorer';$('difficulty-description').textContent=DIFFICULTIES.explorer.description;start(selected);};$('result-home').onclick=home;
  }
}
function handleEvents(){for(const event of run.events){sound.play(event.type);switch(event.type){
  case 'shard':toast(event.count===3?'3 / 3 FRAGMENTS! Exit open: find the green square on the map.':`FRAGMENT COLLECTED: ${event.count} / 3`);break;
  case 'mote':toast('A little starlight. A little more speed.',1.8);break;
  case 'checkpoint':toast('Waystone lit. Hearts restored. A safe place to return.');break;
  case 'hit':if(run.health>0)toast('Back to safety. Your fragments are still with you.');break;
  case 'won':finish(true);break;
  case 'lost':finish(false);break;
  }}run.events.length=0;}
function updateHud(){if(!run)return;$('timer').textContent=formatTime(run.time);$('hearts').textContent='♥ '.repeat(run.health)+'♡ '.repeat(run.rules.hearts-run.health);$('hearts').setAttribute('aria-label',`${run.health} of ${run.rules.hearts} hearts`);$('shard-count').innerHTML=`${run.shards} <span>/ 3</span>`;$('mote-count').textContent=`✦ ${run.motes} / 7`;$('boost').hidden=run.boost===0;$('dash-meter').style.width=`${(1-run.dashCooldown/1.4)*100}%`;
  $('objective-label').textContent=run.shards===3?'EXIT OPEN!':'Collect 3 fragments';$('objective-description').textContent=run.shards===3?'Enter the green exit on the map':'Walk onto the blue marked tiles';drawMap();
}
const map=$('minimap'),mapCtx=map.getContext('2d');
function drawMap(){const {grid,config,shards,motes,portal,checkpoint,ghosts}=run.world,n=config.size,cell=map.width/n;mapCtx.clearRect(0,0,map.width,map.height);
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){mapCtx.fillStyle=grid[z][x]?'#29413e':'#617166';mapCtx.fillRect(x*cell,z*cell,cell-.5,cell-.5);}
  const dot=(p,color,r=cell*.22)=>{mapCtx.fillStyle=color;mapCtx.beginPath();mapCtx.arc((p.x+.5)*cell,(p.z+.5)*cell,r,0,Math.PI*2);mapCtx.fill();};
  motes.filter(p=>!p.collected).forEach(p=>dot(p,'#e9c775',cell*.12));
  for(const p of shards.filter(p=>!p.collected)){
    const x=(p.x+.5)*cell,z=(p.z+.5)*cell,r=cell*.35;
    mapCtx.fillStyle='#36dfff';mapCtx.beginPath();mapCtx.moveTo(x,z-r);mapCtx.lineTo(x+r,z);mapCtx.lineTo(x,z+r);mapCtx.lineTo(x-r,z);mapCtx.closePath();mapCtx.fill();
  }
  dot(checkpoint,run.checkpoint?config.accent:'#9bc4dd',cell*.23);ghosts.forEach(p=>dot(p,'#c79fe0',cell*.18));
  run.world.hazards.slice(0,run.rules.hazardCount).forEach(p=>dot(p,'#e29079',cell*.17));
  mapCtx.strokeStyle=run.shards===3?'#92ff5f':'#8ba392';mapCtx.lineWidth=2;mapCtx.strokeRect((portal.x+.15)*cell,(portal.z+.15)*cell,cell*.7,cell*.7);
  dot(run.player,'#ffffff',cell*.28);
}

window.addEventListener('keydown',event=>{
  if(dialog.open)return;
  if(!started)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();
  if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();pause();return;}
  if(event.code==='KeyC'&&!event.repeat){toggleCamera();return;}
  if(event.code==='Space'&&!event.repeat)dashQueued=true;
  keys.add(event.code);
});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>{clearInput();pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
const joystick=$('joystick');let pointer=null;
function drag(event){if(pointer!==event.pointerId)return;const r=joystick.getBoundingClientRect(),radius=r.width*.34;let x=event.clientX-r.left-r.width/2,z=event.clientY-r.top-r.height/2;const d=Math.hypot(x,z);if(d>radius){x*=radius/d;z*=radius/d;}stick={x:x/radius,z:z/radius};$('joystick-knob').style.transform=`translate(${x}px,${z}px)`;}
joystick.addEventListener('pointerdown',event=>{pointer=event.pointerId;joystick.setPointerCapture(pointer);drag(event);});joystick.addEventListener('pointermove',drag);
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,event=>{if(pointer!==event.pointerId)return;pointer=null;stick={x:0,z:0};$('joystick-knob').style.transform='translate(0,0)';});
$('dash-touch').addEventListener('pointerdown',event=>{event.preventDefault();dashQueued=true;});
function gamepadInput(){const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);if(!pad)return {x:0,z:0};const dead=v=>Math.abs(v)>.18?v:0;
  const dash=pad.buttons[0]?.pressed,pausePressed=pad.buttons[9]?.pressed;if(dash&&!gamepadDash)dashQueued=true;if(pausePressed&&!gamepadPause){if(dialog.open&&resumeOnClose)closeModal();else pause();}gamepadDash=dash;gamepadPause=pausePressed;
  return {x:dead(pad.axes[0]||0)+(pad.buttons[15]?.pressed?1:0)-(pad.buttons[14]?.pressed?1:0),z:dead(pad.axes[1]||0)+(pad.buttons[13]?.pressed?1:0)-(pad.buttons[12]?.pressed?1:0)};
}
$('fullscreen-button').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Fullscreen isn’t available in this browser.');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');});
function frame(now){const dt=lastFrame?Math.min((now-lastFrame)/1000,.05):.016;lastFrame=now;
  const pad=gamepadInput();
  if(started&&!paused&&run.status==='playing'){
    const right=Number(keys.has('KeyD')||keys.has('ArrowRight')),left=Number(keys.has('KeyA')||keys.has('ArrowLeft')),up=Number(keys.has('KeyW')||keys.has('ArrowUp')),down=Number(keys.has('KeyS')||keys.has('ArrowDown'));
    const direction=scene.screenDirection(right-left+stick.x+pad.x,down-up+stick.z+pad.z);
    tick(run,{...direction,dash:dashQueued},dt);dashQueued=false;handleEvents();updateHud();
  }
  if(now>toastUntil)$('toast').classList.remove('visible');
  // Freeze the whole active world while paused, including its animation clock.
  if(!started||!paused)scene.frameTime+=dt;
  scene.draw(scene.frameTime,dt,run);requestAnimationFrame(frame);
}
async function boot(){try{
  const {AdventureScene}=await import('./scene.js?v=2.1.0');scene=new AdventureScene($('scene'));scene.reduced=save.reduced;scene.quality(save.quality);preview(selected);$('loading').hidden=true;requestAnimationFrame(frame);
  scene.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();clearInput();paused=true;$('error').hidden=false;$('error-message').textContent='The graphics connection was interrupted. Reload to reopen the world. Completed worlds are saved.';});
  if(new URL(location.href).searchParams.has('guide'))guide();
}catch(error){console.error('Unable to start Cube Man Adventure:',error);$('loading').hidden=true;$('error').hidden=false;$('lobby').hidden=true;$('play-button').disabled=true;$('error-message').textContent='This adventure needs WebGL. Try enabling hardware acceleration or opening it in a recent Chrome, Edge, Firefox, or Safari browser.';}}
boot();
