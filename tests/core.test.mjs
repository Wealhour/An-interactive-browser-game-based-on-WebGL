import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, DIFFICULTIES, createWorld, createRun, tick, move, canStand, distances, findPath, rating } from '../remastered/core.js';

test('all three worlds are deterministic, connected, and have reachable objectives',()=>{
  for(let i=0;i<WORLDS.length;i++){
    const w=createWorld(i),other=createWorld(i),{cells}=distances(w.grid,w.start);
    assert.deepEqual(w,other);
    assert.equal(cells.length,w.grid.flat().filter(v=>v===0).length);
    const objects=[...w.shards,...w.motes,w.portal,w.checkpoint,...w.hazards];
    for(const p of objects){assert.ok(findPath(w.grid,w.start,p).length,`Unreachable object in world ${i}`);assert.ok(canStand(w.grid,p.x,p.z));}
    assert.equal(new Set([...w.shards,...w.motes,w.portal,w.start].map(p=>`${p.x},${p.z}`)).size,12);
    for(const ghost of w.ghosts)for(const p of ghost.route)assert.ok(canStand(w.grid,p.x,p.z));
    for(const ghost of w.ghosts)assert.ok(Math.hypot(ghost.x-w.start.x,ghost.z-w.start.z)>1);
  }
});

function openRun(){const r=createRun(0);r.world.grid=Array.from({length:9},(_,z)=>Array.from({length:9},(_,x)=>x===0||z===0||x===8||z===8?1:0));r.player={x:3,z:3};r.world.ghosts=[];r.world.hazards=[];r.world.shards=[];r.world.motes=[];r.world.portal={x:7,z:7};r.world.checkpoint={x:6,z:6};return r;}
test('movement is frame-rate independent and diagonals have the same speed',()=>{
  const a=openRun(),b=openRun(),diagonal=openRun();
  for(let i=0;i<30;i++)tick(a,{x:1,z:0},1/30);
  for(let i=0;i<120;i++)tick(b,{x:1,z:0},1/120);
  for(let i=0;i<60;i++)tick(diagonal,{x:1,z:1},1/60);
  assert.ok(Math.abs(a.player.x-b.player.x)<1e-8);
  assert.ok(Math.abs(Math.hypot(diagonal.player.x-3,diagonal.player.z-3)-(a.player.x-3))<1e-8);
});
test('fast movement cannot tunnel through walls, and can slide along them',()=>{
  const grid=[[1,1,1,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]],p={x:1,z:1};
  move(grid,p,5,0);assert.ok(p.x<1.3);assert.ok(canStand(grid,p.x,p.z));
  move(grid,p,1,1);assert.ok(p.z>1.8);assert.ok(p.x<1.3);
});
test('dash has a cooldown and grants a brief safe crossing',()=>{
  const r=openRun();tick(r,{x:1,z:0,dash:true},.05);assert.ok(r.dash>0);assert.ok(r.dashCooldown>1);assert.ok(r.player.x>3.3);
  const cooldown=r.dashCooldown;tick(r,{x:1,z:0,dash:true},.05);assert.ok(r.dashCooldown<cooldown);
});
test('fragments are collected once and a locked portal cannot complete the world',()=>{
  const r=openRun();r.world.shards=[{x:3,z:3,collected:false}];r.world.portal={x:3,z:3};
  tick(r,{},.016);tick(r,{},.016);assert.equal(r.shards,1);assert.equal(r.status,'playing');
  r.world.shards.push({x:3,z:3,collected:false},{x:3,z:3,collected:false});tick(r,{},.016);assert.equal(r.status,'won');
});
test('waystone restores hearts, and damage preserves fragments and respawns safely',()=>{
  const r=openRun();r.health=1;r.world.checkpoint={x:3,z:3};tick(r,{},.016);assert.equal(r.health,r.rules.hearts);assert.equal(r.checkpoint,true);
  r.shards=2;r.invulnerable=0;r.player={x:5,z:5};r.world.hazards=[{x:5,z:5}];tick(r,{},.016);
  assert.equal(r.health,r.rules.hearts-1);assert.deepEqual(r.player,{x:3,z:3});assert.equal(r.shards,2);assert.ok(r.invulnerable>2);
  const health=r.health;r.world.hazards=[{x:3,z:3}];tick(r,{},.016);assert.equal(r.health,health);
});
test('last heart ends a run; completed runs cannot continue advancing',()=>{
  const r=openRun();r.health=1;r.invulnerable=0;r.world.hazards=[{x:3,z:3}];tick(r,{},.016);assert.equal(r.status,'lost');
  const t=r.time,p={...r.player};tick(r,{x:1},.05);assert.equal(r.time,t);assert.deepEqual(r.player,p);
});
test('golden starlight boosts speed for three seconds and is consumed once',()=>{
  const r=openRun();r.world.motes=[{x:3,z:3,collected:false}];tick(r,{},.016);assert.equal(r.motes,1);assert.equal(r.boost,3);tick(r,{},.016);assert.equal(r.motes,1);assert.ok(r.boost<3);
});
test('each world can be completed using real movement in every difficulty',()=>{
  for(let i=0;i<3;i++)for(const difficulty of Object.keys(DIFFICULTIES)){
    const r=createRun(i,difficulty);r.world.ghosts=[];r.world.hazards=[];
    for(const target of [...r.world.shards,r.world.portal]){
      const start={x:Math.round(r.player.x),z:Math.round(r.player.z)},path=findPath(r.world.grid,start,target);
      for(const next of path){let limit=150;while(Math.hypot(next.x-r.player.x,next.z-r.player.z)>.03&&limit-->0){const dx=next.x-r.player.x,dz=next.z-r.player.z,len=Math.hypot(dx,dz);tick(r,{x:dx/len,z:dz/len},Math.min(1/60,len/r.rules.speed));if(r.status==='won')break;}
        assert.ok(limit>0,`Movement stuck in world ${i}, ${difficulty}`);if(r.status==='won')break;}
    }
    assert.equal(r.shards,3);assert.equal(r.status,'won',`World ${i} could not be completed`);
  }
});
test('star rating rewards speed and clean play without imposing a time limit',()=>{
  const r=createRun(0);assert.equal(rating(r),3);r.hits=1;assert.equal(rating(r),2);r.time=WORLDS[0].par+1;assert.equal(rating(r),1);
});
