// Hazard-enabled end-to-end playthrough with real keyboard events. State is
// observed only: no teleportation, immunity override, removed hazards, dash,
// collectible mutation, or artificial victory.
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { findPath, DIFFICULTIES } from '../remastered/core.js';

const modulePath=process.env.PLAYWRIGHT_PATH||'playwright';
const {chromium}=await import(/^[A-Z]:/i.test(modulePath)?pathToFileURL(modulePath).href:modulePath);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const base=process.env.QA_URL||'http://127.0.0.1:4173';
const difficulties=(process.env.QA_DIFFICULTIES||'adventure,expert,explorer').split(',');
assert.ok(difficulties.every(d=>DIFFICULTIES[d]),'Unknown playthrough difficulty');
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
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
  await page.locator('#guide-button').click();
  await page.locator('#quality').selectOption('low');
  await page.locator('#reduced').check();
  await page.locator('#guide-done').click();
  let held=new Set();
  async function setKeys(codes){
    const next=new Set(codes);
    for(const code of held)if(!next.has(code))await page.keyboard.up(code);
    for(const code of next)if(!held.has(code))await page.keyboard.down(code);
    held=next;
  }
  async function snapshot(){return page.evaluate(()=>{
    const {run,scene}=window.__playtest;
    return {player:{...run.player},status:run.status,shards:run.shards,hits:run.hits,health:run.health,time:run.time,dashCooldown:run.dashCooldown,
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
        assert.equal(state.hits,0,'A playable route must not sacrifice hearts');
        assert.notEqual(state.status,'lost','Hazard-enabled keyboard run failed');
        assert.equal(state.dashCooldown,0,'A dash must not be required');
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
  for(const difficulty of difficulties){
    await page.locator('#difficulty').selectOption(difficulty);
    await page.locator('.world-card').nth(0).click();
    await page.locator('#play-button').click();
    for(let index=0;index<3;index++){
      // Let initial protection expire. Only read game state in page.evaluate.
      await page.waitForTimeout(2700);
      await page.waitForFunction(()=>window.__playtest.run.invulnerable===0,null,{timeout:15000});
      const world=await page.evaluate(()=>{
        const {world}=window.__playtest.run,grid=world.grid.map(row=>row.slice());
        for(const p of [...world.ghosts.flatMap(g=>g.route),...world.hazards])grid[p.z][p.x]=1;
        return {grid,shards:world.shards,portal:world.portal};
      });
      const pending=[...world.shards];
      while(pending.length){
        const state=await snapshot(),start={x:Math.round(state.player.x),z:Math.round(state.player.z)};
        pending.sort((a,b)=>findPath(world.grid,start,a).length-findPath(world.grid,start,b).length);
        await walkTo(world.grid,pending.shift());
        const count=(await snapshot()).shards;
        console.log(`${DIFFICULTIES[difficulty].name}, world ${index+1}: ${count}/3 fragments, ${(await snapshot()).hits} hits.`);
      }
      assert.equal((await snapshot()).shards,3);
      await walkTo(world.grid,world.portal);await page.locator('#dialog').waitFor({state:'visible'});
      assert.equal((await snapshot()).status,'won');
      assert.equal((await snapshot()).hits,0);
      assert.equal((await snapshot()).health,DIFFICULTIES[difficulty].hearts);
      await page.screenshot({path:fileURLToPath(new URL(`../test-results/feasibility-world-${index+1}-${difficulty}.png`,import.meta.url))});
      console.log(`${DIFFICULTIES[difficulty].name}, world ${index+1}: exit reached, full hearts, completion screen displayed.`);
      if(index<2)await page.locator('#next-world').click();
    }
    await page.locator('#result-home').click();
  }
  assert.ok(headings.size>1,'Ghosts must visibly turn during the playthrough');
  assert.deepEqual(errors,[]);
  console.log(`Hazard-enabled keyboard playthroughs: ${difficulties.length*3} PASS, zero hits. Rendered ghost orientation: PASS.`);
} finally {await browser.close();}
