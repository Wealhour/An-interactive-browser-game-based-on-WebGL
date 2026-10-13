import { WORLDS, DIFFICULTIES, createWorld, createRun, tick, rating } from './core.js';

const $=id=>document.getElementById(id);
const STORAGE='cube-man-remastered-v2';
const defaults={unlocked:0,selected:0,difficulty:'adventure',sound:false,quality:'high',reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,best:{}};
function loadSave() {
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE))||{};
    return {...defaults,unlocked:Number.isInteger(saved.unlocked)?Math.max(0,Math.min(2,saved.unlocked)):0,selected:Number.isInteger(saved.selected)?Math.max(0,Math.min(2,saved.selected)):0,difficulty:DIFFICULTIES[saved.difficulty]?saved.difficulty:defaults.difficulty,sound:saved.sound===true,quality:saved.quality==='low'?'low':'high',reduced:typeof saved.reduced==='boolean'?saved.reduced:defaults.reduced,best:saved.best&&typeof saved.best==='object'&&!Array.isArray(saved.best)?saved.best:{}};
  } catch {return {...defaults,best:{}};}
}
const save=loadSave();save.selected=Math.min(save.selected,save.unlocked);
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
    const button=document.createElement('button');button.className=`world-card${selected===i?' selected':''}`;button.style.setProperty('--card-color',world.accent);button.disabled=i>save.unlocked;
    button.setAttribute('aria-pressed',String(selected===i));button.setAttribute('aria-label',`${world.name}${i>save.unlocked?'. Complete the previous world to unlock.':''}`);
    const best=bestFor(i);
    button.innerHTML=`<span class="world-icon" aria-hidden="true">${['♧','♜','✧'][i]}</span><span><small>WORLD 0${i+1}</small><strong>${world.short}</strong><span class="world-status">${i>save.unlocked?'◇ Complete world 0'+i:best?'★'.repeat(best.stars)+' · '+formatTime(best.time):i===0?'Your journey starts here':'Ready to explore'}</span></span>`;
    button.onclick=()=>preview(i);$('worlds').appendChild(button);
  });
}
function preview(index){selected=index;save.selected=index;persist();const world=WORLDS[index];
  $('preview-tag').textContent=world.tag;$('preview-name').textContent=world.name;$('preview-subtitle').textContent=world.subtitle;
  document.documentElement.style.setProperty('--lime',world.accent);
  if(scene){scene.playing=false;scene.build(createWorld(index),DIFFICULTIES[save.difficulty]);}
  $('play-button').innerHTML=`${bestFor(index)?'Return to this world':'Begin adventure'} <span>→</span>`;worldCards();
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
function settingsMarkup(){return `<div class="setting-row"><label for="quality">Graphics</label><select id="quality"><option value="high" ${save.quality==='high'?'selected':''}>Detailed · soft shadows</option><option value="low" ${save.quality==='low'?'selected':''}>Light · better performance</option></select></div><div class="setting-row"><label for="reduced">Reduce ambient motion</label><input id="reduced" type="checkbox" ${save.reduced?'checked':''}></div>`;}
function bindSettings(){const q=$('quality');if(q)q.onchange=()=>{save.quality=q.value;scene.quality(q.value);persist();};const r=$('reduced');if(r)r.onchange=()=>{save.reduced=r.checked;scene.reduced=r.checked;persist();};}
function guide(){modal(`<span class="eyebrow">A WANDERER’S FIELD GUIDE</span><h2 id="dialog-title">A little light goes<br>a long way.</h2><div class="guide-grid"><span>◇</span><p><strong>Gather three light fragments</strong>Find the glowing diamonds to restore the gate. Then step into the gate to travel onward.</p><span>✦</span><p><strong>Catch a little starlight</strong>Golden sparks grant a three-second speed boost. They’re optional, but lovely to find.</p><span>◎</span><p><strong>Rest at the waystone</strong>The pale blue ring restores hearts and marks a checkpoint. Your fragments survive a hit.</p><span>☁</span><p><strong>Give the locals some space</strong>Lavender wisps patrol the paths; red mushrooms sting. Dash through danger or take another route.</p></div><div class="guide-controls"><b>Keyboard:</b> WASD / arrows to move · Space to dash<br>C to switch camera · Esc / P to pause<br><b>Touch:</b> drag the thumbstick · tap dash<br><b>Gamepad:</b> left stick / D-pad · A to dash · Start to pause</div><p>Earn three stars by finishing without a hit and beating the world’s target time. There is no time limit.</p>${settingsMarkup()}<div class="dialog-actions"><button id="guide-done" class="primary-button">Let’s wander <span>→</span></button></div>`,{resume:started&&run?.status==='playing'});$('guide-done').onclick=closeModal;bindSettings();}
$('guide-button').onclick=guide;
$('credits-button').onclick=()=>modal(`<span class="eyebrow">FROM A SMALL BEGINNING</span><h2 id="dialog-title">Made with curiosity.</h2><p><span class="credit-name">Weihao Wang</span><br>Original creator, game concept, and student project for the Interactive Graphics course at Sapienza.</p><p><span class="credit-name">ChatGPT / OpenAI Codex</span><br>Remaster collaborator: game design, original procedural artwork, programming, interface, accessibility improvements, and testing.</p><p>Built on the Three.js engine included in the original project. The remaster’s worlds, character, and sounds are generated in code.</p><p>The original project is preserved as a playable archive, including its original asset attributions.</p><div class="dialog-actions"><a class="secondary-button" href="../original/">Play the original ↗</a><a class="secondary-button" href="https://github.com/Wealhour/An-interactive-browser-game-based-on-WebGL" target="_blank" rel="noopener">View the source ↗</a></div>`,{resume:started&&run?.status==='playing'});

function start(index=selected){if(!scene)return;leaveModal();selected=index;save.selected=index;persist();run=createRun(index,save.difficulty);paused=false;started=true;clearInput();
  scene.playing=true;scene.follow=window.innerWidth<761;scene.build(run.world,run.rules);
  $('lobby').hidden=true;$('hud').hidden=false;document.body.classList.add('playing');scene.resize();
  $('world-number').textContent=`WORLD 0${index+1} / ${run.rules.name.toUpperCase()}`;$('world-name').textContent=run.world.config.name;document.documentElement.style.setProperty('--lime',run.world.config.accent);
  cameraLabel();updateHud();sound.play('start');toast(index===0?'Find three light fragments. Follow your curiosity.':run.world.config.story,5);
  $('pause-button').focus({preventScroll:true});
}
$('play-button').onclick=()=>{sound.wake();start();};
function home(){leaveModal();started=false;paused=false;run=null;toastUntil=0;$('toast').classList.remove('visible');document.body.classList.remove('playing');$('hud').hidden=true;$('lobby').hidden=false;clearInput();preview(selected);scene.resize();$('play-button').focus({preventScroll:true});}
function pause(){if(!started||run.status!=='playing'||dialog.open)return;modal(`<span class="eyebrow">TAKE A BREATH</span><h2 id="dialog-title">The world can wait.</h2><p>Your journey is paused. ${run.shards} of 3 light fragments found.</p>${settingsMarkup()}<div class="dialog-actions"><button id="resume" class="primary-button">Keep wandering <span>→</span></button><button id="restart" class="secondary-button">Restart world</button><button id="home" class="secondary-button">Title screen</button></div>`,{resume:true});$('resume').onclick=closeModal;$('restart').onclick=()=>start(selected);$('home').onclick=home;bindSettings();}
$('pause-button').onclick=pause;
function cameraLabel(){$('camera-button').innerHTML=`⌖ <span>${scene.follow?'Overview':'Follow'}</span>`;$('camera-button').setAttribute('aria-label',`Switch to ${scene.follow?'overview':'follow'} camera`);}
function toggleCamera(){if(!scene)return;scene.follow=!scene.follow;cameraLabel();}
$('camera-button').onclick=toggleCamera;

function finish(won){
  if(won){const stars=rating(run),key=`${selected}-${run.difficulty}`,old=bestFor(selected);save.unlocked=Math.min(2,Math.max(save.unlocked,selected+1));
    save.best[key]={time:old?Math.min(old.time,run.time):run.time,stars:old?Math.max(old.stars,stars):stars};persist();worldCards();
    modal(`<span class="eyebrow">${selected===2?'A LITTLE CUBE. A LONG WAY HOME.':'WORLD 0'+(selected+1)+' / COMPLETE'}</span><h2 id="dialog-title">${selected===2?'Every path led home.':'A world of wonder,<br>behind you.'}</h2><p>${selected===2?'Through forest, fire, and starlight, our little wanderer found the way. Thank you for taking this journey.':WORLDS[selected+1].name+' is waiting on the other side.'}</p><div class="result-stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}<span style="opacity:.2">${'★'.repeat(3-stars)}</span></div><div class="result-stats"><div><strong>${formatTime(run.time)}</strong><span>YOUR TIME</span></div><div><strong>${run.motes} / 7</strong><span>STARLIGHT</span></div><div><strong>${run.hits}</strong><span>HITS TAKEN</span></div></div><p>${stars===3?'A perfect crossing. Beautifully done.':`Three stars: finish without a hit and under ${formatTime(run.world.config.par)}. Your best time and star rating are saved separately for this difficulty.`}</p><div class="dialog-actions">${selected<2?'<button id="next-world" class="primary-button">Into the next world <span>→</span></button>':'<button id="return-home" class="primary-button">Back to the beginning <span>→</span></button>'}<button id="try-again" class="secondary-button">Explore again</button><button id="result-home" class="secondary-button">Title screen</button></div>`,{closable:false});
    if($('next-world'))$('next-world').onclick=()=>start(selected+1);if($('return-home'))$('return-home').onclick=()=>{selected=0;home();};$('try-again').onclick=()=>start(selected);$('result-home').onclick=home;
  }else{
    modal(`<span class="eyebrow">EVERY WANDERER TAKES A WRONG TURN</span><h2 id="dialog-title">A pause in the path.</h2><p>The wisps got a little too close. This world is still yours to discover.</p><div class="result-stats"><div><strong>${formatTime(run.time)}</strong><span>TIME EXPLORING</span></div><div><strong>${run.shards} / 3</strong><span>FRAGMENTS</span></div></div><p>Try a dash through danger, or choose Explorer for five hearts and slower wisps.</p><div class="dialog-actions"><button id="retry" class="primary-button">Try this world again <span>→</span></button><button id="easier" class="secondary-button">Try as Explorer</button><button id="result-home" class="secondary-button">Title screen</button></div>`,{closable:false});
    $('retry').onclick=()=>start(selected);$('easier').onclick=()=>{save.difficulty='explorer';$('difficulty').value='explorer';$('difficulty-description').textContent=DIFFICULTIES.explorer.description;start(selected);};$('result-home').onclick=home;
  }
}
function handleEvents(){for(const event of run.events){sound.play(event.type);switch(event.type){
  case 'shard':toast(event.count===3?'The gate is awake. Follow the ring on your map.':`Light fragment found. ${event.count} of 3.`);break;
  case 'mote':toast('A little starlight. A little more speed.',1.8);break;
  case 'checkpoint':toast('Waystone lit. Hearts restored. A safe place to return.');break;
  case 'hit':if(run.health>0)toast('Back to safety. Your fragments are still with you.');break;
  case 'won':finish(true);break;
  case 'lost':finish(false);break;
  }}run.events.length=0;}
function updateHud(){if(!run)return;$('timer').textContent=formatTime(run.time);$('hearts').textContent='♥ '.repeat(run.health)+'♡ '.repeat(run.rules.hearts-run.health);$('hearts').setAttribute('aria-label',`${run.health} of ${run.rules.hearts} hearts`);$('shard-count').innerHTML=`${run.shards} <span>/ 3</span>`;$('mote-count').textContent=`✦ ${run.motes} / 7`;$('boost').hidden=run.boost===0;$('dash-meter').style.width=`${(1-run.dashCooldown/1.4)*100}%`;
  $('objective-label').textContent=run.shards===3?'The gate is awake':'Restore the gate';$('objective-description').textContent=run.shards===3?'Step through the glowing portal':'Find the three light fragments';drawMap();
}
const map=$('minimap'),mapCtx=map.getContext('2d');
function drawMap(){const {grid,config,shards,motes,portal,checkpoint,ghosts}=run.world,n=config.size,cell=map.width/n;mapCtx.clearRect(0,0,map.width,map.height);
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){mapCtx.fillStyle=grid[z][x]?'#29413e':'#617166';mapCtx.fillRect(x*cell,z*cell,cell-.5,cell-.5);}
  const dot=(p,color,r=cell*.22)=>{mapCtx.fillStyle=color;mapCtx.beginPath();mapCtx.arc((p.x+.5)*cell,(p.z+.5)*cell,r,0,Math.PI*2);mapCtx.fill();};
  motes.filter(p=>!p.collected).forEach(p=>dot(p,'#e9c775',cell*.12));shards.filter(p=>!p.collected).forEach(p=>dot(p,config.accent,cell*.28));
  dot(checkpoint,run.checkpoint?config.accent:'#9bc4dd',cell*.23);ghosts.forEach(p=>dot(p,'#c79fe0',cell*.18));
  run.world.hazards.slice(0,run.rules.hazardCount).forEach(p=>dot(p,'#e29079',cell*.17));
  mapCtx.strokeStyle=run.shards===3?config.accent:'#8ba392';mapCtx.lineWidth=2;mapCtx.strokeRect((portal.x+.15)*cell,(portal.z+.15)*cell,cell*.7,cell*.7);
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
  const {AdventureScene}=await import('./scene.js');scene=new AdventureScene($('scene'));scene.reduced=save.reduced;scene.quality(save.quality);preview(selected);$('loading').hidden=true;requestAnimationFrame(frame);
  scene.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();clearInput();paused=true;$('error').hidden=false;$('error-message').textContent='The graphics connection was interrupted. Reload to reopen the world. Completed worlds are saved.';});
  if(new URL(location.href).searchParams.has('guide'))guide();
}catch(error){console.error('Unable to start Cube Man Adventure:',error);$('loading').hidden=true;$('error').hidden=false;$('lobby').hidden=true;$('play-button').disabled=true;$('error-message').textContent='This adventure needs WebGL. Try enabling hardware acceleration or opening it in a recent Chrome, Edge, Firefox, or Safari browser.';}}
boot();
