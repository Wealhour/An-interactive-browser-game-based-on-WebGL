// Optional browser QA: requires Playwright and Chrome. No production hooks are added.
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir, copyFile } from 'node:fs/promises';
const modulePath=process.env.PLAYWRIGHT_PATH||'playwright';
const {chromium}=await import(/^[A-Z]:/i.test(modulePath)?pathToFileURL(modulePath).href:modulePath);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const output=new URL('../test-results/',import.meta.url);
await mkdir(output,{recursive:true});
const imagePath=name=>fileURLToPath(new URL(name,output));
const base=process.env.QA_URL||'http://127.0.0.1:4173';
const errors=[];
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const gateway=await context.newPage();await gateway.goto(base+'/');
  assert.equal(await gateway.locator('.edition').count(),2);
  for(const edition of ['original/','remastered/'])assert.equal((await context.request.get(base+'/'+edition)).status(),200);
  await gateway.screenshot({path:imagePath('edition-selector.png'),fullPage:true});await gateway.close();
  console.log('Edition selector and both playable entry points: PASS');
  const page=await context.newPage();
  page.on('pageerror',e=>{errors.push(e.message);console.log('Browser error:',e.message);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  // Test-only module exports expose live bindings in an intercepted response.
  // Objective placement exercises actual simulation events, UI, and persistence;
  // production files remain unchanged and normal movement has separate tests.
  await page.route(/\/remastered\/app\.js(?:\?.*)?$/,async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nexport { run, save, scene };'});});
  await page.goto(base+'/remastered/');await page.locator('#loading').waitFor({state:'hidden'});
  await page.evaluate(async()=>{window.__qa=await import(document.querySelector('script[type="module"][src]').src);await document.fonts.ready;});
  assert.equal(await page.locator('#error').isVisible(),false);
  assert.equal(await page.locator('#scene canvas').count(),1);
  assert.equal(await page.locator('.world-card:disabled').count(),0,'Every world is available on a fresh visit');
  for(const world of [2,1]){
    await page.locator('.world-card').nth(world).click();await page.locator('#play-button').click();
    assert.equal(await page.evaluate(()=>window.__qa.run.world.index),world);
    await page.locator('#pause-button').click();await page.locator('#home').click();
  }
  await page.reload();await page.locator('#loading').waitFor({state:'hidden'});
  await page.evaluate(async()=>{window.__qa=await import(document.querySelector('script[type="module"][src]').src);await document.fonts.ready;});
  assert.equal(await page.locator('.world-card.selected small').textContent(),'WORLD 2','World selection survives reload without an earlier completion');
  await page.locator('.world-card').nth(0).click();
  console.log('Worlds 2 and 3 can be played immediately without a previous completion: PASS');
  await page.screenshot({path:imagePath('desktop.png'),fullPage:true});
  await page.locator('#sound-button').click();assert.equal(await page.locator('#sound-button').getAttribute('aria-pressed'),'true');
  console.log('Desktop WebGL title screen: PASS');
  await page.locator('#play-button').click();assert.ok(await page.locator('#hud').isVisible());
  const before=await page.evaluate(async()=>({...(window.__qa.run.player)}));
  const direction=await page.evaluate(async()=>{const {run}=window.__qa;return run.world.grid[run.player.z][run.player.x+1]===0?'east':'north';});
  const codes=direction==='east'?['KeyD','KeyS']:['KeyW','KeyD'];
  for(const code of codes)await page.keyboard.down(code);await page.waitForTimeout(450);for(const code of codes)await page.keyboard.up(code);
  const after=await page.evaluate(async()=>({...(window.__qa.run.player)}));
  assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.2,'Keyboard must move the character');
  await page.screenshot({path:imagePath('gameplay.png'),fullPage:true});
  await page.keyboard.press('Escape');assert.ok(await page.locator('#dialog').isVisible());
  const pausedTime=await page.evaluate(async()=>window.__qa.run.time);await page.waitForTimeout(250);
  assert.equal(await page.evaluate(async()=>window.__qa.run.time),pausedTime);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#dialog').isVisible(),false);
  await page.locator('#guide-button').click();await page.locator('#quality').selectOption('low');await page.locator('#reduced').check();
  assert.deepEqual(await page.evaluate(async()=>{const {scene}=window.__qa;return [scene.renderer.shadowMap.enabled,scene.reduced];}),[false,true]);
  await page.locator('#guide-done').click();await page.keyboard.press('KeyC');
  console.log('Keyboard movement, pause clock, Escape resume, camera, and settings: PASS');
  await page.locator('#pause-button').click();await page.locator('#home').click();
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:imagePath('mobile.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok(await page.evaluate(()=>document.querySelector('h1').scrollWidth<=document.querySelector('.hero').clientWidth),'Phone headline must fit');
  await page.locator('#play-button').click();await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>{
    const a=document.querySelector('.objective').getBoundingClientRect(),b=document.querySelector('.map-wrap').getBoundingClientRect();
    return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  }),false,'Phone fragment counter and minimap must not overlap');
  await page.screenshot({path:imagePath('mobile-game.png'),fullPage:true});
  const stick=await page.locator('#joystick').boundingBox();
  const mobileBefore=await page.evaluate(async()=>({...(window.__qa.run.player)}));
  const sign=direction==='east'?1:-1;
  const touch=await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x+55,y:stick.y+55}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:stick.x+55+34,y:stick.y+55+34*sign}]});
  await page.waitForTimeout(350);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  const mobileAfter=await page.evaluate(async()=>({...(window.__qa.run.player)}));
  assert.ok(Math.hypot(mobileAfter.x-mobileBefore.x,mobileAfter.z-mobileBefore.z)>.1,'Thumbstick must move the player');
  console.log('Phone layout, follow camera, and touch movement: PASS');
  await page.locator('#pause-button').click();await page.locator('#home').click();await page.setViewportSize({width:1440,height:1000});
  await page.locator('#play-button').click();
  for(let world=0;world<3;world++){
    for(let i=0;i<3;i++){
      await page.evaluate(async i=>{const {run}=window.__qa;run.invulnerable=999;run.player={x:run.world.shards[i].x,z:run.world.shards[i].z};},i);
      await page.waitForFunction(count=>window.__qa.run.shards===count,i+1);
    }
    await page.waitForFunction(()=>document.getElementById('objective-label').textContent==='EXIT OPEN!',null,{timeout:4000});
    await page.evaluate(async()=>{const {run}=window.__qa;run.player={...run.world.portal};});
    await page.locator('#dialog').waitFor({state:'visible'});assert.ok((await page.locator('#dialog-title').textContent()).length);
    if(world<2){await page.locator('#next-world').click();await page.waitForTimeout(100);await page.screenshot({path:imagePath(`world-${world+2}.png`),fullPage:true});}
  }
  await page.locator('#result-home').click();await page.reload();await page.locator('#loading').waitFor({state:'hidden'});
  await page.evaluate(async()=>{window.__qa=await import(document.querySelector('script[type="module"][src]').src);});
  assert.equal(await page.locator('.world-card:disabled').count(),0);
  const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('cube-man-remastered-v2')));
  assert.equal(progress.unlocked,2);assert.equal(Object.keys(progress.best).length,3);
  console.log('All completion screens and save restoration: PASS');
  for(let i=1;i<3;i++){await page.locator('.world-card').nth(i).click();await page.screenshot({path:imagePath(`world-${i+1}-title.png`),fullPage:true});}
  await page.locator('.world-card').nth(0).click();await page.locator('#play-button').click();
  await page.evaluate(async()=>{const {run}=window.__qa;run.health=1;run.invulnerable=0;run.world.hazards[0]={...run.player};});
  await page.locator('#dialog').waitFor({state:'visible'});assert.equal(await page.locator('#dialog-title').textContent(),'GAME OVER');
  await page.locator('#easier').click();assert.equal(await page.evaluate(async()=>window.__qa.run.rules.hearts),5);
  await page.locator('#pause-button').click();await page.locator('#home').click();
  console.log('Sound toggle, loss screen, and Easy-mode retry: PASS');
  const corrupt=await context.newPage();await corrupt.addInitScript(()=>localStorage.setItem('cube-man-remastered-v2','{broken'));
  await corrupt.goto(base+'/remastered/');await corrupt.locator('#loading').waitFor({state:'hidden'});assert.equal(await corrupt.locator('#error').isVisible(),false);await corrupt.close();
  const unavailable=await context.newPage();await unavailable.addInitScript(()=>{Storage.prototype.getItem=function(){throw new Error('Unavailable');};Storage.prototype.setItem=function(){throw new Error('Unavailable');};});
  await unavailable.goto(base+'/remastered/');await unavailable.locator('#loading').waitFor({state:'hidden'});assert.equal(await unavailable.locator('#error').isVisible(),false);await unavailable.locator('#play-button').click();assert.ok(await unavailable.locator('#hud').isVisible());await unavailable.close();
  const unsupported=await context.newPage();await unsupported.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return type.includes('webgl')?null:original.call(this,type,...rest);};});
  await unsupported.goto(base+'/remastered/');await unsupported.locator('#error').waitFor({state:'visible'});await unsupported.close();
  console.log('Corrupted storage, unavailable storage, and WebGL fallback: PASS');
  assert.deepEqual(errors,[],'The remaster must have no browser console errors');
  const legacy=await context.newPage(),legacyErrors=[];legacy.on('pageerror',e=>legacyErrors.push(e.message));
  await legacy.goto(base+'/original/',{waitUntil:'domcontentloaded'});await legacy.locator('#easyButton').click();await legacy.locator('#playButton').click();
  await legacy.locator('#game canvas').waitFor({state:'visible',timeout:20000});await legacy.waitForTimeout(3000);
  await legacy.screenshot({path:imagePath('original.png'),fullPage:true});console.log('Original archive launch:',JSON.stringify({canvas:true,errors:legacyErrors}));
  assert.deepEqual(legacyErrors,[],'Original archive must launch without script errors');
  await context.close();
  if(process.env.QA_WRITE_PREVIEW==='1')await copyFile(imagePath('desktop.png'),new URL('../docs/remaster-preview.png',import.meta.url));
  console.log('Browser QA complete.');
} finally {await browser.close();}
