import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, DIFFICULTIES, createWorld, createRun, distances, findPath, tick, canStand } from '../remastered/core.js';

// Independently reconstruct the conservative map instead of trusting the
// generator's routing helper. No ghost position or patrol timing is assumed.
function walkingMap(world) {
  const map=world.grid.map(row=>row.slice());
  for(const ghost of world.ghosts)for(const p of ghost.route)map[p.z][p.x]=1;
  for(const p of world.hazards)map[p.z][p.x]=1;
  return map;
}

test('every safe floor tile and every objective has a permanent bypass around all threats',()=>{
  for(let index=0;index<WORLDS.length;index++){
    const world=createWorld(index),map=walkingMap(world),reachable=distances(map,world.start).result;
    assert.equal(reachable.size,map.flat().filter(cell=>cell===0).length,`World ${index+1}: an occupied passage isolates a corridor`);
    for(const goal of [...world.shards,...world.motes,world.checkpoint,world.portal]){
      assert.ok(reachable.has(`${goal.x},${goal.z}`),`World ${index+1}: a threat blocks an objective at ${goal.x},${goal.z}`);
    }
    for(const goal of [world.start,world.checkpoint,world.portal,...world.shards]){
      for(const p of [...world.hazards,...world.ghosts.flatMap(ghost=>ghost.route)]){
        assert.ok(Math.hypot(p.x-goal.x,p.z-goal.z)>=2,`World ${index+1}: unsafe spawn, checkpoint or objective`);
      }
    }
    assert.equal(world.ghosts.length,3+index);
    assert.equal(world.hazards.length,3);
    assert.ok(world.ghosts.every(g=>g.route.length>=2),'Ghosts still patrol');
    // A walking route has at least one cell of clearance from every patrol
    // segment, including between its tile centers. This is greater than the
    // 0.50 damage radius and leaves room for imprecise player steering.
    for(const cell of distances(map,world.start).cells)for(const ghost of world.ghosts){
      for(let i=1;i<ghost.route.length;i++){
        const a=ghost.route[i-1],b=ghost.route[i];
        assert.equal(Math.abs(a.x-b.x)+Math.abs(a.z-b.z),1);
        const x=Math.max(Math.min(a.x,b.x),Math.min(Math.max(a.x,b.x),cell.x));
        const z=Math.max(Math.min(a.z,b.z),Math.min(Math.max(a.z,b.z),cell.z));
        assert.ok(Math.hypot(cell.x-x,cell.z-z)>=1);
      }
    }
  }
});

function walk(run,map,target,fps,offset) {
  const path=findPath(map,{x:Math.round(run.player.x),z:Math.round(run.player.z)},target);
  assert.ok(path.length,'A safe walking route must exist');
  for(const cell of path){
    // Alternate small offsets inside the corridor: the proof must tolerate
    // ordinary steering, rather than requiring exact mathematical centers.
    const next={x:cell.x+offset*(cell.z%2?1:-1),z:cell.z+offset*(cell.x%2?1:-1)};
    assert.ok(canStand(run.world.grid,next.x,next.z));
    let frames=0;
    while(Math.hypot(next.x-run.player.x,next.z-run.player.z)>.015&&run.status==='playing'){
      assert.ok(frames++<fps*3,'Walking stalled');
      const dx=next.x-run.player.x,dz=next.z-run.player.z,d=Math.hypot(dx,dz);
      const speed=run.rules.speed*(run.boost>0?1.45:1);
      tick(run,{x:dx/d,z:dz/d},Math.min(1/fps,d/speed));
      assert.equal(run.hits,0,'A bypass must work without sacrificing a heart');
    }
    if(run.status==='won')return;
  }
}

for(let index=0;index<WORLDS.length;index++)for(const difficulty of Object.keys(DIFFICULTIES)){
  test(`World ${index+1}, ${DIFFICULTIES[difficulty].name}: actual hazard-enabled completions at varied frame rates, phases and steering`,()=>{
    for(const fps of [20,60,120])for(const wait of [0,2.9,9.7,31.3])for(const offset of [0,.18]){
      const run=createRun(index,difficulty),map=walkingMap(run.world);
      // Only tick/input are used after createRun. Do not remove hazards,
      // override health/immunity, move the player, or fabricate pickups.
      for(let elapsed=0;elapsed<wait;elapsed+=1/fps)tick(run,{},Math.min(1/fps,wait-elapsed));
      assert.equal(run.hits,0,'Waiting at the spawn must be safe');
      for(const goal of [run.world.checkpoint,...run.world.motes,...run.world.shards,run.world.portal]){
        if(run.status==='won')break;
        walk(run,map,goal,fps,offset);
      }
      const label=`${fps} fps, ${wait}s patrol phase, ${offset} steering offset`;
      assert.equal(run.status,'won',label);
      assert.equal(run.shards,3,label);
      assert.equal(run.hits,0,label);
      assert.equal(run.health,run.rules.hearts,label);
      assert.equal(run.dashCooldown,0,'No dash was needed');
      assert.ok(run.time>2,'Completion extends beyond initial spawn protection');
    }
  });
}
