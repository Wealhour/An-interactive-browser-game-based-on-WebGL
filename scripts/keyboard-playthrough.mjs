// End-to-end playthrough with real keyboard events: no player teleportation,
// collectible mutation, or artificial victory. A test-only invulnerability
// setting isolates navigation/pickup regressions from the separate damage tests.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { findPath } from '../remastered/core.js';

const modulePath=process.env.PLAYWRIGHT_PATH||'playwright';
const {chromium}=await import(/^[A-Z]:/i.test(modulePath)?pathToFileURL(modulePath).href:modulePath);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const base=process.env.QA_URL||'http://127.0.0.1:4173';
const errors=[],headings=new Set();
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(/\/remastered\/app\.js(?:\?.*)?$/,async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nexport { run, scene };'});
  });
  await page.goto(base+'/remastered/');await page.locator('#loading').waitFor({state:'hidden'});
  await page.evaluate(async()=>{window.__playtest=await import(document.querySelector('script[type="module"][src]').src);});
  assert.equal(await page.locator('.world-card:disabled').count(),0);
  await page.locator('#play-button').click();
  let held=new Set();
  async function setKeys(codes){
    const next=new Set(codes);
    for(const code of held)if(!next.has(code))await page.keyboard.up(code);
    for(const code of next)if(!held.has(code))await page.keyboard.down(code);
    held=next;
  }
  async function snapshot(){return page.evaluate(()=>{
    const {run,scene}=window.__playtest;
    return {player:{...run.player},status:run.status,shards:run.shards,
      ghostHeading:run.world.ghosts[0]?.heading,
      facingErrors:run.world.ghosts.map((g,i)=>Math.abs(Math.atan2(Math.sin(g.heading-scene.ghostMeshes[i].rotation.y),Math.cos(g.heading-scene.ghostMeshes[i].rotation.y)))),
      pickupVisible:scene.shardMeshes.map(m=>m.group.visible),collected:run.world.shards.map(s=>s.collected)};
  });}
  const theta=Math.atan2(15,19),cos=Math.cos(theta),sin=Math.sin(theta);
  async function walkTo(grid,target){
    let state=await snapshot();
    const path=findPath(grid,{x:Math.round(state.player.x),z:Math.round(state.player.z)},target);
    assert.ok(path.length,'Goal must be reachable');
    for(const waypoint of path){
      const deadline=Date.now()+4000;
      while(true){
        state=await snapshot();
        assert.ok(state.facingErrors.every(e=>e<1e-8),'Rendered ghosts must face their actual travel direction');
        headings.add(Math.round(state.ghostHeading/(Math.PI/2)));
        state.collected.forEach((collected,i)=>assert.equal(state.pickupVisible[i],!collected,'Collected fragments disappear immediately'));
        if(state.status==='won'){await setKeys([]);return;}
        const dx=waypoint.x-state.player.x,dz=waypoint.z-state.player.z;
        if(Math.hypot(dx,dz)<.13)break;
        assert.ok(Date.now()<deadline,`Keyboard navigation stuck at ${JSON.stringify({player:state.player,waypoint})}`);
        const sx=dx*cos-dz*sin,sz=dx*sin+dz*cos,codes=[];
        if(Math.abs(sx)>Math.abs(sz)*.42)codes.push(sx>0?'KeyD':'KeyA');
        if(Math.abs(sz)>Math.abs(sx)*.42)codes.push(sz>0?'KeyS':'KeyW');
        await setKeys(codes);await page.waitForTimeout(25);
      }
    }
    await setKeys([]);
  }
  for(let index=0;index<3;index++){
    await page.evaluate(()=>{window.__playtest.run.invulnerable=3600;});
    const world=await page.evaluate(()=>{const {world}=window.__playtest.run;return {grid:world.grid,shards:world.shards,portal:world.portal};});
    const pending=[...world.shards];
    while(pending.length){
      const state=await snapshot(),start={x:Math.round(state.player.x),z:Math.round(state.player.z)};
      pending.sort((a,b)=>findPath(world.grid,start,a).length-findPath(world.grid,start,b).length);
      await walkTo(world.grid,pending.shift());
      const count=(await snapshot()).shards;
      console.log(`World ${index+1}: ${count}/3 fragments collected using keyboard movement.`);
    }
    assert.equal((await snapshot()).shards,3);
    await walkTo(world.grid,world.portal);await page.locator('#dialog').waitFor({state:'visible'});
    assert.equal((await snapshot()).status,'won');
    console.log(`World ${index+1}: exit reached and completion screen displayed.`);
    if(index<2)await page.locator('#next-world').click();
  }
  assert.ok(headings.size>1,'Ghosts must visibly turn during the playthrough');
  assert.deepEqual(errors,[]);
  console.log('Keyboard playthrough of all three worlds: PASS. Rendered ghost orientation: PASS.');
} finally {await browser.close();}
