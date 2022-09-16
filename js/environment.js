

import { OrbitControls } from './libs/OrbitControls.js';
import { death} from "./animations.js";



Physijs.scripts.worker = "physijs_worker.js";
Physijs.scripts.ammo = "ammo.js";


export function create_environment(){
	
	create_ground();
	create_limit();
	add_walls();
	
	add_ball( -14, 0, 13);
	add_ball( -5, 0, 7);
	add_ball( 1, 0, 13);
	add_ball( 6, 0, 17);
	add_ball( 11, 0, 13);
	add_ball( -3, 0, -3);
	add_ball( -5, 0, -13);
	add_ball( -7, 0, -8);
	add_ball( -9, 0,-1);

	add_tree(15, 1, 15);
	add_tree(5, 1, 9);
	add_tree(-11, 1, -15.5);
	add_tree(-15,1,8)
	
	add_finish_block(13, 1.5, -15);
	
	add_ghosts();
	add_mushrooms();
	
}		

function create_limit(){
	
	var down_limit = new Physijs.BoxMesh(new THREE.BoxGeometry(36, 2, 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 }),0);
	
	down_limit.position.set(0, 0.5, 19);
	scene.add(down_limit);
	
}

function create_ground(){
	// Ground 1
	  
	textureLoader = new THREE.TextureLoader();
	
	var ground_texture_url = 'textures/underground.jpg';
	var grass_texture_url = 'textures/grass.jpg';
	var underground_texture_url = 'textures/ground.jpg'; 
	
	var ground_texture = textureLoader.load(ground_texture_url);
	ground_texture.wrapS = THREE.RepeatWrapping;
	ground_texture.wrapT = THREE.RepeatWrapping;
	ground_texture.repeat.set( 12, 1 );
	
	var lateral_ground_texture = textureLoader.load(ground_texture_url);
	lateral_ground_texture.wrapS = THREE.RepeatWrapping;
	lateral_ground_texture.wrapT = THREE.RepeatWrapping;
	lateral_ground_texture.repeat.set( 4, 1 );
	
	var underground_texture = textureLoader.load(underground_texture_url);
	underground_texture.wrapS = THREE.RepeatWrapping;
	underground_texture.wrapT = THREE.RepeatWrapping;
	underground_texture.repeat.set( 36, 14);
	
	var grass_texture = textureLoader.load(grass_texture_url);
	grass_texture.wrapS = THREE.RepeatWrapping;
	grass_texture.wrapT = THREE.RepeatWrapping;
	grass_texture.repeat.set( 36, 14);
	
	//Ground 2
	var ground_texture2 = textureLoader.load(ground_texture_url);
	ground_texture2.wrapS = THREE.RepeatWrapping;
	ground_texture2.wrapT = THREE.RepeatWrapping;
	ground_texture2.repeat.set( 9, 1 );
	
	var lateral_ground_texture2 = textureLoader.load(ground_texture_url);
	lateral_ground_texture2.wrapS = THREE.RepeatWrapping;
	lateral_ground_texture2.wrapT = THREE.RepeatWrapping;
	lateral_ground_texture2.repeat.set( 7, 1 );
	
	var underground_texture2 = textureLoader.load(underground_texture_url);
	underground_texture2.wrapS = THREE.RepeatWrapping;
	underground_texture2.wrapT = THREE.RepeatWrapping;
	underground_texture2.repeat.set( 27, 22);
	
	var grass_texture2 = textureLoader.load(grass_texture_url);
	grass_texture2.wrapS = THREE.RepeatWrapping;
	grass_texture2.wrapT = THREE.RepeatWrapping;
	grass_texture2.repeat.set( 27, 22);
	
	ground_material = [
		new THREE.MeshPhongMaterial({map: lateral_ground_texture,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: lateral_ground_texture,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: grass_texture,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: underground_texture,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: ground_texture,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: ground_texture,
      color: 0x989898,}),
		];
		
	ground_material2 = [
		new THREE.MeshPhongMaterial({map: lateral_ground_texture2,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: lateral_ground_texture2,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: grass_texture2,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: underground_texture2,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: ground_texture2,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: ground_texture2,
      color: 0x989898,}),
		];
		
	ground1 = new Physijs.BoxMesh(new THREE.BoxGeometry(36, 3, 14),ground_material,0);
	ground1.receiveShadow = true;
	ground1.position.set( 0, -2, 11 ); 
	ground1.name = 'ground';
	
	
	scene.add( ground1 );
	
	ground2 = new Physijs.BoxMesh(new THREE.BoxGeometry(36, 3, 22),ground_material2,0);
	ground2.receiveShadow = true;
	ground2.position.set( 0, -2, -7 );
	ground2.name = 'ground';
	
	
	scene.add( ground2 );
	
}

function add_walls(){
	
	
	add_wall( -17, 0.5, -7, 2, 2, 22 ); //left up wall
	
	add_wall( -11.5, 0.5, 5, 9, 2, 2 );// left midlle wall
	
	//L block 1 neer orign
	add_block( -7, 0.5, 13 );
	add_block( -9, 0.5, 13 );
	add_block( -9, 0.5, 11 );
	
	//left lower wall 
	add_wall(-17, 0.5, 11, 2, 2, 14);   // p_y = d_y / 2 - 0.5
	
	//up wall
	add_wall(-5, 0.5, -17, 26, 2, 2);
	
	//letf of L block1 
	add_wall( -2, 0.5, 13, 2, 2, 10); // p_x p_y p_z d_x d_y d_z
	
	//block 1
	add_block( -10, 0.5, 5);
	
	//block 2
	add_block( -3, 0.5, 2);
	
	//block 3
	add_block( 10, 0.5, 5);
	
	//square block 1
	add_wall( 6, 0.5, 13, 5, 2, 5);

	//top square block 1
	add_wall( -11, 0.5, -5, 5, 2, 5);
	
	//L block 2
	add_block( 5, 0.5, 0 );
	add_block( 3, 0.5, 0 );
	add_block( 3, 0.5, -2 );
	
	//square block 2
	add_wall( 2, 0.5, -5, 4, 2, 5);
	
	//right wall
	add_wall(17, 0.5, 0, 2, 2, 36);
	
	//wall 2
	add_wall( 13, 0.5, -4, 6, 2, 2);
	
	//s wall 1
	add_wall( 3, 0.5, -10, 2, 2, 5);
	
	//s wall 2
	add_wall( 9, 0.5, -15, 2, 2, 5);

}

function initialize_ghost(){
	
	ghost.position.set(0, 0.5, 0);
	ghost.scale.set(0.004, 0.004, 0.004);
	
	
}

function add_ghost(x, y, z){
	
	initialize_ghost();
	
	var ghost_material = Physijs.createMaterial(
		new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 }));
		
		
	var ghost_box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 1, 1 ),  
		ghost_material,
		0//static object 
	);
	
	ghost_box.setCcdMotionThreshold(1);
	ghost_box.castShadow = true;
	ghost_box.name = 'ghost';
	
	ghost_box.addEventListener( 'collision', function( other_object, relative_velocity, relative_rotation, contact_normal ) {
    
		if(other_object.name == 'steve'){
			
			inputDisabled = true;
			tween_run_middle.stop();
			death();
			
			//camera orbitale
			orbitControls = true;
			controls = new OrbitControls( camera, renderer.domElement );
			controls.update();
			controls.enablePan = false;
			controls.enableDamping = true;
			
			setTimeout(function(){
				sessionStorage.setItem("duration", duration);
				window.location.href = "./gameover.html";
				
			}, 3000);		
			
		}
			
	});
	
	ghost_box.position.set(x, y, z);
	ghost_box.__dirtyPosition = true;
	ghost_box.__dirtyRotation = true;
	
	var ghost_new = ghost.clone();
	
	ghost_box.add(ghost_new);
		
	ghost_array.push(ghost_box);
	
	scene.add(ghost_box);
	
}

function add_ghosts(){
	
	//difficulty choose
	
	if(hard){
		
		add_ghost(-13, 0, 10);
		add_ghost(-5.5, 0, 5);
		add_ghost(-6, 0, -2);
		add_ghost(-3, 0, -13);
		add_ghost(6, 0, -11);
		add_ghost(7, 0, -6);
		add_ghost(7, 0, 4);
		add_ghost(13, 0, 10);
		add_ghost(2, 0, 3);
		
	}else{
		
		add_ghost(-13, 0, 10);
		add_ghost(-3, 0, -13);
		add_ghost(7, 0, -6);
		add_ghost(13, 0, 10);
		add_ghost(2, 0, 3);
		
	}
	
}

function initialize_mushroom(){
	
	mushroom.position.set(0, -0.6, 0);
	mushroom.scale.set(0.005, 0.005, 0.005);
	
	
}

function add_mushroom(x, y, z){
	
	initialize_mushroom();
	
	var mushroom_material = Physijs.createMaterial(
		new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 }));
				
	var mushroom_box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 1, 1 ),  
		mushroom_material,
		0//static object 
	);
	
	mushroom_box.setCcdMotionThreshold(1);
	mushroom_box.castShadow = true;
	mushroom_box.name = 'mushroom';
	
	mushroom_box.addEventListener( 'collision', function( other_object, relative_velocity, relative_rotation, contact_normal ) {
   
		if(other_object.name == 'steve'){
			
			fine = new Date().getTime();
			duration = (fine - initial)/1000;
			inputDisabled = true;
			tween_run_middle.stop();
			death();
			
			
			//camera orbitale
			orbitControls = true;
			controls = new OrbitControls( camera, renderer.domElement );
			controls.update();
			controls.enablePan = false;
			controls.enableDamping = true;
			
			setTimeout(function(){
				sessionStorage.setItem("duration", duration);
				window.location.href = "./gameover2.html";
				
			}, 3000);	
			
		}
			
	});
	
	mushroom_box.position.set(x, y, z);
	mushroom_box.__dirtyPosition = true;
	mushroom_box.__dirtyRotation = true;
	
	var mushroom_new = mushroom.clone();
	
	mushroom_box.add(mushroom_new);
		
	mushroom_array.push(mushroom_box);
	
	scene.add(mushroom_box);
	
}

function add_mushrooms(){
	
	//quantity based on difficulty
	
	if(hard){
		
		add_mushroom(-7, 0, 7);
		add_mushroom(-1, 0, 5);
		add_mushroom(-3.5, 0, 10);
		add_mushroom(-5, 0, -8);
		add_mushroom(3, 0, 10);
		add_mushroom(8, 0, 0);
		
	}else{
		
		




		add_mushroom(-3.5, 0, 10);
		add_mushroom(-5, 0, -8);
		add_mushroom(3, 0, 10);
		add_mushroom(8, 0, 0);
		
	}
	
}

function initialize_ball(){

	ball.position.set(0.2,-0.25,0.2);
	ball.scale.set(0.05, 0.05, 0.05);
	
}
	
function add_ball(x, y, z){
	
	initialize_ball();
	
	var ball_material = Physijs.createMaterial(
		new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 }),
			);
	
	var ball_box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 1, 1 ),  
		ball_material,
		0 // static object
	);
	
	ball_box.setCcdMotionThreshold(1);
	ball_box.castShadow = true;
	ball_box.name = 'ball';
	
	ball_box.addEventListener( 'collision', function( other_object, relative_velocity, relative_rotation, contact_normal ) {
   
		if(other_object.name == 'steve')
			scene.remove(this);
	});
	
	ball_box.position.set(x, y, z);
	ball_box.__dirtyPosition = true;
	ball_box.__dirtyRotation = true;
	
	var ball_new = ball.clone();
	
	ball_array.push(ball_new);
	
	ball_box.add(ball_new);
	
	scene.add(ball_box);
	
}

function add_wall( p_x, p_y, p_z, d_x, d_y, d_z){
	
	var texture = textureLoader.load("textures/rock.jpeg");
	var lateral_texture = textureLoader.load("textures/rock.jpeg");
	var front_texture = textureLoader.load("textures/rock.jpeg");
	
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set( d_x, d_z );
	
	lateral_texture.wrapS = THREE.RepeatWrapping;
	lateral_texture.wrapT = THREE.RepeatWrapping;
	lateral_texture.repeat.set( d_z, d_y );
	
	front_texture.wrapS = THREE.RepeatWrapping;
	front_texture.wrapT = THREE.RepeatWrapping;
	front_texture.repeat.set( d_x, d_y );
	
	var box_material = [
		new THREE.MeshPhongMaterial({map: lateral_texture,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: lateral_texture,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: texture,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: texture,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: front_texture,
      color: 0x989898,}),
		new THREE.MeshPhongMaterial({map: front_texture,
      color: 0x989898,}),
		];
	
	var box = new Physijs.BoxMesh(
		new THREE.BoxGeometry( d_x, d_y, d_z ),  
		box_material,
		0 // static object
	);
	
	box.setCcdMotionThreshold(1);
	box.castShadow = true;
	box.name = 'box';
	box.position.set(p_x, p_y, p_z);	
	scene.add(box);
	
}

function add_block( x, y, z ){
	
	var texture = textureLoader.load("textures/rock.jpeg");
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set( 2, 2 );
	
	var box_material = Physijs.createMaterial(
		new THREE.MeshPhongMaterial({map: texture,
      color: 0x989898,}),
			);
	var box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 2, 2, 2 ),  
		box_material,
		0 // static object
	);
	
	box.setCcdMotionThreshold(1);
	box.castShadow = true;
	box.name = 'box';
	box.position.set(x,y,z);	
	scene.add(box);
}

function add_finish_block(x, y, z){
	var texture = textureLoader.load("textures/finish.png");
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set( 2, 1 );
	
	var finish_material = Physijs.createMaterial(
		new THREE.MeshPhongMaterial({map: texture,
      color: 0x989898,}),
	);
	var finish = new Physijs.BoxMesh(
		new THREE.PlaneGeometry( 4, 1 ), 
		finish_material,
		0 //static object
	);
	
	finish.setCcdMotionThreshold(1);
	finish.castShadow = false;
	finish.position.set(x,y,z);	
	scene.add(finish);
	
	var box_material = Physijs.createMaterial(
		new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
	);
	var box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 4, 2, 2 ),  
		box_material,
		0 //static object
	);
	
	box.setCcdMotionThreshold(1);
	box.castShadow = false;
	box.name = 'finish';
	box.position.set(x,y-1,z-1);	
	scene.add(box);
	
	
}

function add_tree(x, y, z){
	var leafe_texture = textureLoader.load("textures/leafes.jpg");
	
	var leafe_bump_texture = textureLoader.load("textures/texture-bump.jpg");
	
	var wood_texture = textureLoader.load("textures/wood.jpg");
	wood_texture.wrapS = THREE.RepeatWrapping;
	wood_texture.wrapT = THREE.RepeatWrapping;
	wood_texture.repeat.set( 1, 3 );
	
	var leafe_box_material = Physijs.createMaterial(
		new THREE.MeshPhongMaterial({map: leafe_texture, bumpMap: leafe_bump_texture,
		color: 0x989898, bumpScale: 1.5}),
		
	);
	var leafe_box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 3, 3, 3 ),  
		leafe_box_material,
		0 // static object
	);
	
	leafe_box.setCcdMotionThreshold(1);
	leafe_box.castShadow = true;
	leafe_box.name = 'leafes';
	leafe_box.position.set(x,y+3,z);	
	scene.add(leafe_box);
	
	var wood_box_material = Physijs.createMaterial(
		new THREE.MeshPhongMaterial({map: wood_texture,
      color: 0x989898,}),
		
	);
	var wood_box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 1, 3, 1 ),  
		wood_box_material,
		0 // static object
	);
	
	wood_box.setCcdMotionThreshold(1);
	wood_box.castShadow = true;
	wood_box.name = 'wood';
	wood_box.position.set(x,y,z);	
	scene.add(wood_box);
	
}