import * as THREE from './vendor/three.module.js';
import { random } from './core.js?v=2.1.0';

export class AdventureScene {
  constructor(container) {
    this.container=container;
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(1);
    this.renderer.outputEncoding=THREE.sRGBEncoding;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.BasicShadowMap;
    container.appendChild(this.renderer.domElement);
    this.scene=new THREE.Scene();
    this.camera=new THREE.OrthographicCamera(-15,15,15,-15,.1,180);
    this.scene.add(new THREE.HemisphereLight(0xdbefe7,0x343d4a,.65));
    this.sun=new THREE.DirectionalLight(0xffdfad,1.5);
    this.sun.position.set(-12,25,10);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);
    Object.assign(this.sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:65});
    this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.03;this.scene.add(this.sun);
    this.fill=new THREE.DirectionalLight(0xbcebd8,.5);this.fill.position.set(10,7,-12);this.scene.add(this.fill);
    this.look=new THREE.Vector3();this.playing=false;this.follow=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.frameTime=0;this.size={width:1,height:1};
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
  }
  quality(value) {
    this.renderer.setPixelRatio(value==='low'?.75:1);
    this.renderer.shadowMap.enabled=value!=='low';
    this.worldGroup?.traverse(o=>{if(o.material)o.material.needsUpdate=true;});this.resize();
  }
  resize() {
    const {width,height}=this.container.getBoundingClientRect();if(!width||!height)return;
    this.size={width,height};this.renderer.setSize(width,height,false);this.updateCamera(1);
  }
  updateCamera(dt,player) {
    if(!this.world)return;
    const {width,height}=this.size,aspect=width/height,mobile=width<761;
    let half=this.world.config.size*(this.playing?.63:.70);
    if(aspect<1.1)half/=aspect;
    if(this.playing&&this.follow)half=4.5/Math.min(aspect,1.3);
    const shift=!this.playing&&!mobile?.35:0;
    this.camera.left=-half*aspect*(1+shift);this.camera.right=half*aspect*(1-shift);
    this.camera.top=half*(!this.playing&&mobile?1.40:1);
    this.camera.bottom=-half*(!this.playing&&mobile?.60:1);
    this.camera.updateProjectionMatrix();
    const n=this.world.config.size,desired=new THREE.Vector3();
    if(this.playing&&this.follow){const p=player||this.world.start;desired.set(p.x-(n-1)/2,0,p.z-(n-1)/2);}
    this.look.lerp(desired,1-Math.exp(-dt*7));
    this.camera.position.copy(this.look).add(new THREE.Vector3(15,24,19));
    this.camera.lookAt(this.look);this.sun.target.position.copy(this.look);this.sun.target.updateMatrixWorld();
  }
  build(world,rules) {
    if(this.worldGroup) {
      const geometries=new Set(),materials=new Set();
      this.worldGroup.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
      this.scene.remove(this.worldGroup);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    }
    this.world=world;this.worldGroup=new THREE.Group();this.scene.add(this.worldGroup);
    this.scene.background=new THREE.Color(world.config.sky);
    this.scene.fog=new THREE.FogExp2(world.config.sky,.007);
    const n=world.config.size,c=(n-1)/2,rng=random(world.config.seed+99),batches=new Map(),box=new THREE.BoxBufferGeometry(1,1,1);
    const material=(color,glow=false)=>glow?new THREE.MeshBasicMaterial({color:new THREE.Color(color).convertSRGBToLinear(),toneMapped:false,transparent:true,opacity:.95}):new THREE.MeshStandardMaterial({color:new THREE.Color(color).convertSRGBToLinear(),roughness:.9,metalness:0});
    const addBox=(x,y,z,w,h,d,color,cast=true)=>{
      const key=color+cast;if(!batches.has(key))batches.set(key,{color,cast,items:[]});
      batches.get(key).items.push([x,y,z,w,h,d]);
    };
    addBox(0,-.46,0,n+.2,.85,n+.2,world.config.ground,false);
    addBox(0,-1.3,0,n-.3,.9,n-.3,'#4b5754');
    addBox(.3,-2.1,.1,n-1.3,.8,n-1.5,'#354547');
    addBox(-.2,-2.8,-.2,n-3,.6,n-3,'#263a3d');
    for(let z=0;z<n;z++)for(let x=0;x<n;x++) {
      const wx=x-c,wz=z-c;
      if(world.grid[z][x]===0) {
        addBox(wx,-.005,wz,.98,.04,.98,rng()>.5?'#b0ac86':'#a3a786',false);
        if(rng()>.55)addBox(wx+(rng()-.5)*.5,.025,wz+(rng()-.5)*.5,.10,.025,.24,'#c1bf98',false);
      } else {
        const edge=x===0||x===n-1||z===0||z===n-1;
        const h=edge?.58:.62+rng()*.18;
        addBox(wx,h/2,wz,.95,h,.95,world.config.wall);
        addBox(wx,h+.04,wz,.97,.13,.97,rng()>.4?world.config.ground:world.config.leaf);
        if(rng()>.48) {
          addBox(wx+(rng()-.5)*.5,h+.16,wz+(rng()-.5)*.5,.25,.21,.3,world.config.leaf);
          if(rng()>.75)addBox(wx-.1,h+.3,wz,.11,.18,.11,world.config.leaf,false);
        }
        // Trees grow on walls, so decoration never secretly blocks a path.
        if((edge&&rng()>.68)||(!edge&&x%3===0&&z%3===0&&rng()>.55)) {
          const th=1.35+rng()*.9;
          addBox(wx,h+th/2,wz,.21,th,.21,'#675345');
          addBox(wx,h+th,wz,1.2,.75,1.15,world.config.leaf);
          addBox(wx-.18,h+th+.55,wz+.07,.88,.55,.82,rng()>.5?'#77a581':world.config.leaf);
          addBox(wx+.2,h+th-.3,wz+.2,.85,.55,.75,world.config.leaf);
        }
      }
    }
    // Strata and hanging roots make the maze a little world of its own.
    for(let i=0;i<n;i++) {
      const h=.2+rng()*.8;
      addBox(i-c,-1.2-h/2,n/2+.11,.55,h,.16,'#60716a');
      if(rng()>.5)addBox(i-c,-2-h/2,n/2,.12,h*1.7,.13,world.config.leaf);
      addBox(-n/2-.1,-1.2-h/2,i-c,.16,h,.5,'#536a60');
    }
    // Distant fragments add depth without a downloaded skybox.
    for(let i=0;i<18;i++) {
      const angle=rng()*Math.PI*2,dist=n*.9+rng()*14,s=1+rng()*3;
      addBox(Math.cos(angle)*dist,-5-rng()*8,Math.sin(angle)*dist,s,.7,s,'#233c3b',false);
    }
    const dummy=new THREE.Object3D();
    for(const batch of batches.values()) {
      const mesh=new THREE.InstancedMesh(box,material(batch.color),batch.items.length);
      batch.items.forEach(([x,y,z,w,h,d],i)=>{dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
      mesh.castShadow=batch.cast;mesh.receiveShadow=true;this.worldGroup.add(mesh);
    }
    this.dynamic=new THREE.Group();this.worldGroup.add(this.dynamic);
    const meshAt=(geometry,mat,x,y,z,parent=this.dynamic)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
    const cuboid=(parent,x,y,z,w,h,d,color)=>{const m=meshAt(box,material(color),x,y,z,parent);m.scale.set(w,h,d);return m;};
    const player=new THREE.Group();this.dynamic.add(player);this.player=player;
    cuboid(player,0,.49,0,.38,.39,.25,'#65b5a3'); // coat
    cuboid(player,0,.83,0,.42,.36,.38,'#f4d0a2'); // head
    cuboid(player,0,1.03,0,.46,.10,.42,'#345d59'); // hair / hood
    cuboid(player,-.06,.98,.18,.34,.13,.07,'#345d59');
    cuboid(player,-.10,.85,.197,.058,.06,.018,'#283c3c');
    cuboid(player,.10,.85,.197,.058,.06,.018,'#283c3c');
    cuboid(player,0,.68,.15,.42,.10,.07,'#edab68'); // scarf
    cuboid(player,.19,.59,.16,.08,.23,.06,'#edab68');
    cuboid(player,0,.47,-.19,.3,.3,.16,'#aa764b'); // backpack
    this.limbs=[];
    for(const side of [-1,1]) {
      const arm=new THREE.Group();arm.position.set(side*.28,.62,0);player.add(arm);cuboid(arm,0,-.12,0,.14,.30,.16,'#65b5a3');cuboid(arm,0,-.29,0,.14,.08,.16,'#f4d0a2');this.limbs.push(arm);
      const leg=new THREE.Group();leg.position.set(side*.105,.29,0);player.add(leg);cuboid(leg,0,-.11,0,.15,.25,.17,'#334d53');cuboid(leg,0,-.25,.035,.17,.08,.23,'#263b3c');this.limbs.push(leg);
    }
    player.position.set(world.start.x-c,.04,world.start.z-c);this.lastPlayer={...world.start};this.facing=Math.PI*.2;this.walk=0;
    this.shardMeshes=world.shards.map(p=>{
      const group=new THREE.Group();group.position.set(p.x-c,0,p.z-c);this.dynamic.add(group);
      const shard=meshAt(new THREE.OctahedronBufferGeometry(.28),material('#36dfff',true),0,.52,0,group);
      // A fixed floor marker makes the exact pickup tile visible from any camera.
      const ring=new THREE.Group();group.add(ring);
      for(const [x,z,w,d] of [[0,-.41,.88,.06],[0,.41,.88,.06],[-.41,0,.06,.76],[.41,0,.06,.76]]){
        const edge=meshAt(box,material('#36dfff',true),x,.04,z,ring);edge.scale.set(w,.035,d);
      }
      const outline=new THREE.LineSegments(new THREE.EdgesGeometry(shard.geometry),new THREE.LineBasicMaterial({color:'#123c75'}));shard.add(outline);
      return {group,shard,ring};
    });
    this.moteMeshes=world.motes.map(p=>meshAt(new THREE.OctahedronBufferGeometry(.105),material('#ffe09b',true),p.x-c,.43,p.z-c));
    this.ghostMeshes=world.ghosts.map(p=>{
      const group=new THREE.Group();group.position.set(p.x-c,.5,p.z-c);this.dynamic.add(group);
      const mat=new THREE.MeshStandardMaterial({color:'#c2a8e7',emissive:'#645098',emissiveIntensity:.35,transparent:true,opacity:.85,roughness:1});
      meshAt(new THREE.IcosahedronBufferGeometry(.30,1),mat,0,0,0,group);
      cuboid(group,-.10,.03,.25,.06,.08,.04,'#3b3154');cuboid(group,.10,.03,.25,.06,.08,.04,'#3b3154');
      const skirt=meshAt(new THREE.ConeBufferGeometry(.29,.27,5),mat,0,-.21,0,group);skirt.rotation.z=Math.PI;
      group.rotation.y=p.heading;return group;
    });
    world.hazards.slice(0,rules.hazardCount).forEach(p=>{
      const group=new THREE.Group();group.position.set(p.x-c,0,p.z-c);this.dynamic.add(group);
      cuboid(group,0,.14,0,.10,.28,.1,'#ead6ba');
      const cap=meshAt(new THREE.ConeBufferGeometry(.28,.22,6),material('#d67864'),0,.34,0,group);cap.rotation.y=.2;
      cuboid(group,-.10,.40,.07,.06,.04,.06,'#f4dbb6');
    });
    const gate=new THREE.Group();gate.position.set(world.portal.x-c,0,world.portal.z-c);this.dynamic.add(gate);this.gate=gate;
    const gateMat=material(world.config.accent,true);this.gateMat=gateMat;
    cuboid(gate,0,.06,0,.87,.12,.87,'#5c7972');
    for(const side of [-1,1])cuboid(gate,side*.35,.63,0,.16,1.15,.24,'#879f92');
    cuboid(gate,0,1.21,0,.87,.18,.28,'#b8c9ac');
    this.gateRing=meshAt(new THREE.TorusBufferGeometry(.30,.035,5,32),gateMat,0,.67,.02,gate);
    this.gateCore=meshAt(new THREE.PlaneBufferGeometry(.52,.82),new THREE.MeshBasicMaterial({color:world.config.accent,transparent:true,opacity:.13,side:THREE.DoubleSide}),0,.66,0,gate);
    this.checkpointMesh=new THREE.Group();this.checkpointMesh.position.set(world.checkpoint.x-c,.07,world.checkpoint.z-c);this.dynamic.add(this.checkpointMesh);
    this.checkpointRing=meshAt(new THREE.TorusBufferGeometry(.32,.035,4,24),material('#abcbd2',true),0,0,0,this.checkpointMesh);this.checkpointRing.rotation.x=Math.PI/2;
    cuboid(this.checkpointMesh,0,.13,0,.14,.26,.14,'#abcbd2');
    // Soft particles are rendered in one draw call.
    const vertices=[];for(let i=0;i<90;i++)vertices.push((rng()-.5)*n*1.7,.8+rng()*4,(rng()-.5)*n*1.7);
    const points=new THREE.BufferGeometry();points.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    this.dust=new THREE.Points(points,new THREE.PointsMaterial({color:world.config.accent,size:.055,transparent:true,opacity:.65}));this.worldGroup.add(this.dust);
    this.look.set(0,0,0);this.resize();
  }
  draw(time,dt,run) {
    if(!this.world)return;
    const world=this.world,c=(world.config.size-1)/2,animated=this.reduced?0:time;
    this.updateCamera(dt,run?.player);
    const p=run?.player||world.start;
    const dx=p.x-this.lastPlayer.x,dz=p.z-this.lastPlayer.z,moving=Math.hypot(dx,dz)>.0001;
    if(moving){this.facing=Math.atan2(dx,dz);this.walk+=dt*(run?.boost>0?20:14);}
    this.player.position.set(p.x-c,.04+(moving&&!this.reduced?Math.abs(Math.sin(this.walk))*.04:0),p.z-c);
    const diff=Math.atan2(Math.sin(this.facing-this.player.rotation.y),Math.cos(this.facing-this.player.rotation.y));this.player.rotation.y+=diff*(1-Math.exp(-dt*16));
    this.limbs.forEach((l,i)=>l.rotation.x=moving&&!this.reduced?Math.sin(this.walk+(i%2?0:Math.PI))*.5:0);
    this.player.visible=!(run?.hits>0&&run.invulnerable>0&&Math.floor(time*12)%2===0&&this.playing);
    this.lastPlayer={...p};
    this.shardMeshes.forEach((m,i)=>{m.group.visible=!world.shards[i].collected;m.shard.position.y=.52+Math.sin(animated*2+i)*.06;m.shard.rotation.y=animated*.9+i;});
    this.moteMeshes.forEach((m,i)=>{m.visible=!world.motes[i].collected;m.position.y=.43+Math.sin(animated*3+i)*.07;m.rotation.y=animated;});
    this.ghostMeshes.forEach((m,i)=>{const g=world.ghosts[i];m.position.set(g.x-c,.55+Math.sin(animated*2+i)*.12,g.z-c);m.rotation.y=g.heading;});
    const open=run?.shards===3;this.gateMat.opacity=open?1:.25;this.gateCore.material.opacity=open?.46:.10;
    this.gateRing.rotation.z=animated*(open?.5:.15);this.gateCore.scale.x=1+Math.sin(animated*2)*.06;
    if(run?.checkpoint)this.checkpointRing.material.color.set(world.config.accent);
    this.dust.rotation.y=this.reduced?0:Math.sin(time*.04)*.04;
    this.renderer.render(this.scene,this.camera);
  }
  screenDirection(x,z) {
    // Input follows screen axes in both overview and follow cameras.
    const theta=Math.atan2(15,19),cos=Math.cos(theta),sin=Math.sin(theta);
    return {x:x*cos+z*sin,z:-x*sin+z*cos};
  }
}
