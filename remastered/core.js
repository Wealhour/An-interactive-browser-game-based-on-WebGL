// Rendering-free simulation. World units are maze cells; elapsed time is seconds.
export const WORLDS = [
  { name: 'The Verdant Veil', short: 'Verdant Veil', subtitle: 'Where the forest remembers.', tag: '01 / THE AWAKENING', size: 15, seed: 1988, par: 100, ground: '#56785b', wall: '#a3b8a0', leaf: '#54836a', accent: '#c6f38c', sky: '#142b2a', story: 'A familiar forest. An unfamiliar sky. Gather three fragments of light to find your way home.' },
  { name: 'The Ember Archive', short: 'Ember Archive', subtitle: 'Every ruin holds a little light.', tag: '02 / THE CROSSING', size: 17, seed: 8339, par: 140, ground: '#80674e', wall: '#c9a681', leaf: '#a85e47', accent: '#ffbe83', sky: '#30262b', story: 'Beyond the veil, old stone holds the warmth of a forgotten world. Follow its golden echoes.' },
  { name: 'The Astral Garden', short: 'Astral Garden', subtitle: 'One last path through the stars.', tag: '03 / THE HOMECOMING', size: 19, seed: 2026, par: 180, ground: '#575f89', wall: '#a5a6ce', leaf: '#8272b5', accent: '#b8baff', sky: '#20243d', story: 'The last gate waits in a garden between stars. Bring its scattered light together. Home is close.' }
];
export const DIFFICULTIES = {
  explorer: { name: 'Easy', hearts: 5, speed: 3.1, ghostSpeed: 0.55, hazardCount: 1, description: '5 hearts · slow ghosts' },
  adventure: { name: 'Normal', hearts: 3, speed: 3.1, ghostSpeed: 0.85, hazardCount: 2, description: '3 hearts · normal ghosts' },
  expert: { name: 'Hard', hearts: 2, speed: 3.1, ghostSpeed: 1.15, hazardCount: 3, description: '2 hearts · fast ghosts' }
};
export function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function neighbors(grid, cell) {
  return [[1,0],[-1,0],[0,1],[0,-1]].map(([x,z]) => ({ x: cell.x + x, z: cell.z + z })).filter(p => grid[p.z]?.[p.x] === 0);
}
export function distances(grid, start) {
  const result = new Map([[`${start.x},${start.z}`, 0]]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const p of neighbors(grid, queue[i])) {
    const key = `${p.x},${p.z}`;
    if (!result.has(key)) { result.set(key, result.get(`${queue[i].x},${queue[i].z}`) + 1); queue.push(p); }
  }
  return { result, cells: queue };
}
export function findPath(grid, start, end) {
  const queue = [start], parents = new Map([[`${start.x},${start.z}`, null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p.x === end.x && p.z === end.z) { const path = []; let cur = p; while (cur) { path.unshift(cur); cur = parents.get(`${cur.x},${cur.z}`); } return path; }
    for (const next of neighbors(grid, p)) { const key = `${next.x},${next.z}`; if (!parents.has(key)) { parents.set(key, p); queue.push(next); } }
  }
  return [];
}
// Treat the entire patrol, at every possible phase, as occupied. This is a
// conservative walking map: neither a well-timed dash nor losing a heart is
// required to reach an objective. All mushrooms are included, even on Easy.
export function safeNavigationGrid(world) {
  const grid=world.grid.map(row=>row.slice());
  for(const p of [...world.ghosts.flatMap(ghost=>ghost.route),...world.hazards])grid[p.z][p.x]=1;
  return grid;
}
function connectSafePassages(world) {
  const safe=safeNavigationGrid(world),n=safe.length;
  let reachable=distances(safe,world.start).result;
  // Join safe corridor components with the fewest removed wall tiles. A
  // patrol remains a tempting shortcut, with a permanent walkable bypass.
  while(reachable.size<safe.flat().filter(cell=>cell===0).length) {
    const costs=new Map(),parents=new Map(),queue=[];
    for(const key of reachable.keys()){costs.set(key,0);queue.push(key);}
    let end=null;
    while(queue.length){
      queue.sort((a,b)=>costs.get(a)-costs.get(b));
      const key=queue.shift(),[x,z]=key.split(',').map(Number);
      if(safe[z][x]===0&&!reachable.has(key)){end=key;break;}
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,nz=z+dz,next=`${nx},${nz}`;
        if(nx<1||nz<1||nx>=n-1||nz>=n-1)continue;
        // An original floor tile blocked in the safe map belongs to a threat.
        if(world.grid[nz][nx]===0&&safe[nz][nx]===1)continue;
        const cost=costs.get(key)+(world.grid[nz][nx]===1?1:0);
        if(!costs.has(next)||cost<costs.get(next)){costs.set(next,cost);parents.set(next,key);if(!queue.includes(next))queue.push(next);}
      }
    }
    if(!end)throw new Error(`No safe bypass in world ${world.index+1}`);
    for(let key=end;key&&!reachable.has(key);key=parents.get(key)){
      const [x,z]=key.split(',').map(Number);world.grid[z][x]=0;safe[z][x]=0;
    }
    reachable=distances(safe,world.start).result;
  }
}
export function createWorld(index = 0) {
  const config = WORLDS[index], n = config.size, rng = random(config.seed);
  const grid = Array.from({length:n}, () => Array(n).fill(1));
  const start = { x: 1, z: n - 2 }, stack = [start]; grid[start.z][start.x] = 0;
  while (stack.length) {
    const p = stack.at(-1);
    const options = [[2,0],[-2,0],[0,2],[0,-2]].map(([x,z])=>({x:p.x+x,z:p.z+z})).filter(c=>c.x>0&&c.z>0&&c.x<n-1&&c.z<n-1&&grid[c.z][c.x]);
    if (!options.length) { stack.pop(); continue; }
    const next = options[Math.floor(rng()*options.length)]; grid[(p.z+next.z)/2][(p.x+next.x)/2]=0; grid[next.z][next.x]=0; stack.push(next);
  }
  // A few loops allow exploration and recovery without dead-end traps.
  for (let i=0;i<n*3;i++) { const x=1+Math.floor(rng()*(n-2)),z=1+Math.floor(rng()*(n-2)); if (grid[z][x] && ((grid[z][x-1]===0&&grid[z][x+1]===0)||(grid[z-1][x]===0&&grid[z+1][x]===0))) grid[z][x]=0; }
  const { result, cells } = distances(grid,start);
  const sorted = [...cells].sort((a,b)=>result.get(`${b.x},${b.z}`)-result.get(`${a.x},${a.z}`));
  const portal = sorted[0];
  const chosen = [start,portal];
  const pick = (minDistance=2,allowed=()=>true) => {
    let best = null, score = -1;
    for (const cell of cells) {
      const separation = Math.min(...chosen.map(p=>Math.hypot(p.x-cell.x,p.z-cell.z)));
      if (result.get(`${cell.x},${cell.z}`) < minDistance||!allowed(cell)) continue;
      const value = separation + rng()*0.35;
      if (value>score) {best=cell; score=value;}
    }
    if(!best)throw new Error(`No valid object placement in world ${index+1}`);
    chosen.push(best); return {...best};
  };
  const shards = Array.from({length:3},()=>({...pick(4),collected:false}));
  const checkpoint = {...findPath(grid,start,portal)[Math.floor(findPath(grid,start,portal).length*0.45)]};
  chosen.push(checkpoint);
  const motes = Array.from({length:7},()=>({...pick(3),collected:false}));
  const protectedGoals=[start,portal,checkpoint,...shards];
  const occupied=new Set(),key=p=>`${p.x},${p.z}`;
  const clearOfGoals=p=>protectedGoals.every(goal=>Math.hypot(p.x-goal.x,p.z-goal.z)>=2)&&motes.every(goal=>key(p)!==key(goal));
  // Never build a ring or a boundary-to-boundary barrier of threats. Check
  // the whole interior before carving so every isolated corridor can get a
  // bypass, including optional starlight and checkpoint approaches.
  const leavesRoomForBypass=p=>{
    if(!clearOfGoals(p)||occupied.has(key(p)))return false;
    const interior=grid.map((row,z)=>row.map((_,x)=>x===0||z===0||x===n-1||z===n-1||occupied.has(`${x},${z}`)||key(p)===`${x},${z}`?1:0));
    return distances(interior,start).cells.length===interior.flat().filter(cell=>cell===0).length;
  };
  const ghosts = Array.from({length:3+index},()=>{
    const origin=pick(7,p=>leavesRoomForBypass(p)&&neighbors(grid,p).some(next=>clearOfGoals(next)&&!occupied.has(key(next)))), route=[origin]; let p=origin;
    occupied.add(key(origin));
    for(let i=0;i<5;i++) { const opts=neighbors(grid,p).filter(leavesRoomForBypass); if(!opts.length)break; const next=opts[Math.floor(rng()*opts.length)];route.push(next);occupied.add(key(next));p=next; }
    if(route.length<2)throw new Error(`Stationary patrol in world ${index+1}`);
    const next=route[1]||origin;
    return {x:origin.x,z:origin.z,route,target:1,direction:1,heading:Math.atan2(next.x-origin.x,next.z-origin.z)};
  });
  const hazards=Array.from({length:3},()=>{const p=pick(7,leavesRoomForBypass);occupied.add(key(p));return p;});
  const world={index,config,grid,start,portal,shards,motes,ghosts,hazards,checkpoint};
  connectSafePassages(world);
  return world;
}
export function canStand(grid,x,z,radius=0.21) {
  for (const [dx,dz] of [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]]) if(grid[Math.floor(z+dz+0.5)]?.[Math.floor(x+dx+0.5)]!==0)return false;
  return true;
}
export function move(grid,player,dx,dz,onStep) {
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/0.12));
  for(let i=0;i<steps;i++) {
    if(canStand(grid,player.x+dx/steps,player.z))player.x+=dx/steps;
    if(canStand(grid,player.x,player.z+dz/steps))player.z+=dz/steps;
    onStep?.(player);
  }
}
export function touchesPickup(player,pickup) {
  // Entering the marked floor tile counts, even when walking around its corner.
  // The modest extra reach also lets the character's body touch a pickup.
  const sameTile=Math.floor(player.x+0.5)===pickup.x&&Math.floor(player.z+0.5)===pickup.z;
  return sameTile||Math.hypot(player.x-pickup.x,player.z-pickup.z)<=0.58;
}
export function createRun(index,difficulty='adventure') {
  const world=createWorld(index), rules=DIFFICULTIES[difficulty]||DIFFICULTIES.adventure;
  return {world,difficulty,rules,player:{...world.start},respawn:{...world.start},health:rules.hearts,time:0,shards:0,motes:0,invulnerable:2,boost:0,dash:0,dashCooldown:0,dashVector:{x:0,z:-1},checkpoint:false,status:'playing',events:[],hits:0};
}
export function tick(run,input,dt) {
  if(run.status!=='playing')return;
  dt=Math.max(0,Math.min(dt,0.05)); run.time+=dt;
  for(const key of ['invulnerable','boost','dash','dashCooldown'])run[key]=Math.max(0,run[key]-dt);
  let x=input.x||0,z=input.z||0; const len=Math.hypot(x,z); if(len>1){x/=len;z/=len;}
  if(len>0 && run.dash===0)run.dashVector={x:x/(len>1?1:len),z:z/(len>1?1:len)};
  if(input.dash&&run.dashCooldown===0&&len>0){run.dash=0.16;run.dashCooldown=1.4;run.events.push({type:'dash'});}
  const speed=run.dash>0?8:run.rules.speed*(run.boost>0?1.45:1);
  if(run.dash>0){x=run.dashVector.x;z=run.dashVector.z;}
  const collect=()=>{
    for(const shard of run.world.shards) if(!shard.collected&&touchesPickup(run.player,shard)) {shard.collected=true;run.shards++;run.events.push({type:'shard',count:run.shards});}
    for(const mote of run.world.motes) if(!mote.collected&&touchesPickup(run.player,mote)) {mote.collected=true;run.motes++;run.boost=3;run.events.push({type:'mote'});}
  };
  collect();
  // Check actual collision-constrained substeps, rather than only the endpoint
  // of a dash. Pickups behind a wall are never reached by this traversal.
  move(run.world.grid,run.player,x*speed*dt,z*speed*dt,collect);
  const near=(p,r=0.52)=>Math.hypot(p.x-run.player.x,p.z-run.player.z)<r;
  if(!run.checkpoint&&near(run.world.checkpoint)){run.checkpoint=true;run.respawn={...run.world.checkpoint};run.health=run.rules.hearts;run.events.push({type:'checkpoint'});}
  for(const ghost of run.world.ghosts) {
    if(ghost.route.length<2)continue;
    const target=ghost.route[ghost.target], dx=target.x-ghost.x,dz=target.z-ghost.z,d=Math.hypot(dx,dz),step=run.rules.ghostSpeed*dt;
    if(d>0&&step>0)ghost.heading=Math.atan2(dx,dz);
    if(d<=step){ghost.x=target.x;ghost.z=target.z;if(ghost.target===ghost.route.length-1)ghost.direction=-1;if(ghost.target===0)ghost.direction=1;ghost.target+=ghost.direction;}
    else {ghost.x+=dx/d*step;ghost.z+=dz/d*step;}
  }
  if(run.invulnerable===0&&run.dash===0&&(run.world.ghosts.some(p=>near(p,0.50))||run.world.hazards.slice(0,run.rules.hazardCount).some(p=>near(p,0.36)))) {
    run.health--;run.hits++;run.events.push({type:'hit'});
    if(run.health<=0){run.status='lost';run.events.push({type:'lost'});}
    else {run.player={...run.respawn};run.invulnerable=2.5;run.boost=0;}
  }
  if(run.status==='playing'&&run.shards===3&&near(run.world.portal,0.65)){run.status='won';run.events.push({type:'won'});}
}
export function rating(run) { return Math.max(1,3-(run.hits>0?1:0)-(run.time>run.world.config.par?1:0)); }
