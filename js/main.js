"use strict";

import * as THREE from "./libs/three.module.js";
import { GLTFLoader } from "./libs/GLTFLoader.js";
import { OrbitControls } from './libs/OrbitControls.js';
import TWEEN from "./libs/tween.esm.js";
import {run, rotate, wave, ball_animation, ghost_animation} from "./animations.js";
import {create_environment} from "./environment.js";

Physijs.scripts.worker = "physijs_worker.js"; //lib
Physijs.scripts.ammo = "ammo.js"; //lib


function init() {

  container = document.getElementById("game");
	
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.1, 1000); //PerspectiveCamera

  renderer = new THREE.WebGLRenderer({ antialias: true, });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.position.set(steveX, 11, steveZ+15);
  camera.lookAt(steveX, steveY, steveZ);
  camera.updateProjectionMatrix();


  window.addEventListener(
    "resize",
    function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    false
  );
	
	container.appendChild(renderer.domElement);

	scene = new Physijs.Scene({fixedTimeStep: 1/100});
	scene.setGravity(new THREE.Vector3( 0, -10, 0 ));
	scene.background = new THREE.Color( 0xffffff);

    
    const color = 0xffffff;
    const intensity = 1.5;

    
    ambientLight = new THREE.AmbientLight(color, intensity);
    scene.add(ambientLight);
  
	dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
	dirLight.color.setHSL( 0.1, 1, 0.95 );
	dirLight.position.set( - 1, 1.75, 1 );
	dirLight.position.multiplyScalar( 30 );
	

	dirLight.castShadow = true;

	dirLight.shadow.mapSize.width = 2048;
	dirLight.shadow.mapSize.height = 2048;


	dirLight.shadow.camera.left = -50;
	dirLight.shadow.camera.right = 50;
	dirLight.shadow.camera.top = 50;
	dirLight.shadow.camera.bottom = - 50;

	dirLight.shadow.camera.far = 3500;
	dirLight.shadow.bias = - 0.0001;
	
	scene.add( dirLight );
	
	gltfLoader = new GLTFLoader(); //GLTFLoader

	scene.add(camera);
	
	
	load_characters();
	
	setTimeout(function(){  //wait models to be loaded
		
		initialize_characters();
		create_environment();
		ball_animation();
		ghost_animation();
		input_controls();
		initial = data.getTime();
		requestAnimationFrame(animate);
		
	}, 2000);
	
}

function load_characters() {
	
	load_steve();
	load_ghost();
	load_ball();
	load_mushroom();
	
}

function initialize_characters(){
	initialize_steve();	
}

function load_steve() {
  
    steve = new Physijs.Scene();
    {
     
      gltfLoader.load("models/steve/scene.gltf", (gltf) => {
        steve = gltf.scene;
        steve.name = "steve";
        steve.position.set(-0.5, -0.2, 0);
		

        steve.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        steve.castShadow = true;
        steve.receiveShadow = true;

		root = steve.getObjectByName(steve_parts.Root);
		head = steve.getObjectByName(steve_parts.Head);
		torso = steve.getObjectByName(steve_parts.Torso);
		rotation = steve.getObjectByName(steve_parts.Rotation);
		upperArmR = steve.getObjectByName(steve_parts.UpperArmR);
		upperArmL = steve.getObjectByName(steve_parts.UpperArmL);
		upperLegR = steve.getObjectByName(steve_parts.UpperLegR);
		upperLegL = steve.getObjectByName(steve_parts.UpperLegL);
      });
    }
}

function load_ball(){
	ball = new THREE.Scene();
   
	gltfLoader.load("models/pokeball/scene.gltf", (gltf) => {
		ball = gltf.scene;
		ball.name = "ball";
		

		ball.traverse(function (child) {
		  if (child instanceof THREE.Mesh) {
			child.castShadow = true;
			child.receiveShadow = true;
		  }
		});
		ball.castShadow = true;
		ball.receiveShadow = true;
		
		
    });

}

function load_mushroom(){
	mushroom = new THREE.Scene();
   
	gltfLoader.load("models/mushroom/scene.gltf", (gltf) => {
		mushroom = gltf.scene;
		mushroom.name = "mushroom";
		

		mushroom.traverse(function (child) {
		  if (child instanceof THREE.Mesh) {
			child.castShadow = true;
			child.receiveShadow = true;
		  }
		});
		mushroom.castShadow = true;
		mushroom.receiveShadow = true;
		
		
    });

}

function load_ghost(){
	ghost = new Physijs.Scene();
   
      gltfLoader.load("models/gastly/scene.gltf", (gltf) => {
        ghost = gltf.scene;
        ghost.name = "ghost";
        

        ghost.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        ghost.castShadow = true;
        ghost.receiveShadow = true;
	
      });
   
}

function initialize_steve(){
	
	upperArmR.rotation.z = (5 * Math.PI) / 180;
	upperArmL.rotation.z = -(5 * Math.PI) / 180;
	root.rotation.y = (180 * Math.PI) / 180;
	root.position.set( 0,0,0);
	set_steve_physics();
}

function set_steve_physics(){
	var steve_material = Physijs.createMaterial(
		new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
	);
	steve_box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 0.7, 0.5, 0.7 ),  
		steve_material,
		20
	);
	upper_steve_box = new Physijs.BoxMesh(
		new THREE.CubeGeometry( 0.5, 0.75, 0.5 ),  
		steve_material,
		20
	);
	
	steve_box.setCcdMotionThreshold(1);// downpart detect
	upper_steve_box.setCcdMotionThreshold(1);// upperpart detect
	
	steve_box.addEventListener( 'collision', function( other_object, relative_velocity, relative_rotation, contact_normal ) {
	//event listener	
		if(other_object.name == 'finish'){
			
			fine = new Date().getTime();
			duration = (fine - initial)/1000;
			inputDisabled = true;
			tween_run_middle.stop();
			wave();
			
			//camera orbitale
			orbitControls = true;
			controls = new OrbitControls( camera, renderer.domElement );
			controls.update();
			controls.enablePan = false;
			controls.enableDamping = true;
			
			setTimeout(function(){
				sessionStorage.setItem("duration", duration);
				window.location.href = "./finish.html";
				
			}, 5000);
	
		}


	


		
		if((other_object.name != 'ground' && other_object.name != 'ball') && (contact_normal.x == 1 || contact_normal.x == -1 || contact_normal.z == 1 || contact_normal.z == -1)) {
			position = steve_box.position.x;
			if (contact_normal.x == 1 || right) {
				collision_direction = 'right';
			}else if (contact_normal.x == -1 || left) {
				collision_direction = 'left';
			}else if (contact_normal.z == 1 || down) {
				collision_direction = 'down';
			}else if (contact_normal.z == -1 || up) {
				collision_direction = 'up';
			}
			collided = true;
			
		}
		
		if(other_object.name == 'ball'){
			
			if(step > 0) step += 0.05;
			else step -= 0.05;
			
			time -= 20;
			
			setTimeout(function(){
	
				if(step > 0) step -= 0.05;
				else step += 0.05;
				
				time += 20;
				
			}, 2000);
			
		}
		});
	
	steve_box.castShadow = true;
	steve_box.position.set(steveX, steveY, steveZ);
	upper_steve_box.castShadow = true;
	upper_steve_box.position.set(0,0.75,0);
	
	steve_box.__dirtyPosition = true;
	steve_box.__dirtyRotation = true;
	upper_steve_box.__dirtyPosition = true;
	upper_steve_box.__dirtyRotation = true;
	
	steve_box.add(steve);
	steve_box.add(upper_steve_box);
	steve_box.name = 'steve';
	upper_steve_box.name = 'upper_steve';
	
	scene.add(steve_box);
	
}

function input_controls(){
	
	document.addEventListener("keydown", function(event) {
		if(!inputDisabled){
		var keyCode = event.which;
		switch (keyCode) {
			
			case 37: // left arrow
			
			if (!left){
				if(running){
					tween_run_middle.stop();
					tween_stop.start();
				}
				running = true;
				left = true;
				right = false;
				up = false;
				down = false;
				direction = 'left';
				rotate();
				run();
			}
			
			break;
			
			case 38: // up arrow			
			if (!up) {
				
				if(running){
					
					tween_run_middle.stop();
					tween_stop.start();
				}
				running = true;
				left = false;
				right = false;
				up = true;
				down = false;
				direction = 'up';
				rotate();
				run();
			}
			break;
		
			case 39: // right arrow
			
			if(!right){
				
				if(running){
					
					tween_run_middle.stop();
					tween_stop.start();
				}
				running = true;
				right = true;
				left = false;
				up = false;
				down = false;
				direction = 'right';
				rotate();
				run();
			}
			break;
			
			case 40: // down arrow
			 
			if (!down){
				
				if(running){
					
					tween_run_middle.stop();
					tween_stop.start();
				}
				running = true;
				left = false;
				right = false;
				up = false;
				down = true;
				direction = 'down';
				rotate();
				run();
			}
			break;
		
			case 65: // a left			
			if (!left){
				
				if(running){
					
					tween_run_middle.stop();
					tween_stop.start();
				}
				running = true;
				left = true;
				right = false;
				up = false;
				down = false;
				direction = 'left';
				rotate();
				run();
			}
			break;
			
			case 87: // w up
			if (!up) {
				
				if(running){
					
					tween_run_middle.stop();
					tween_stop.start();
				}
				running = true;
				left = false;
				right = false;
				up = true;
				down = false;
				direction = 'up';
				rotate();
				run();
			}
			break;
			
			case 68: // d right
			if(!right){
				
				if(running){
					
					tween_run_middle.stop();
					tween_stop.start();
				}
				running = true;
				right = true;
				left = false;
				up = false;
				down = false;
				direction = 'right';
				rotate();
				run();
			}
			break;

			case 83: // s down
			if (!down){
				
				if(running){
					
					down = false;
					running = false;
					tween_run_middle.stop();
					tween_stop.start();
				}
				running = true;
				left = false;
				right = false;
				up = false;
				down = true;
				direction = 'down';
				rotate();
				run();
			}
			break;
		
		};
		}
	});
	
	document.addEventListener("keyup", function(event) {
		var keyCode = event.which;
		switch (keyCode) {
			
			case 37: //left arrow
			if(left){
				
				tween_run_middle.stop();
				tween_stop.start();
				left = false;
				running = false;
			}
			
			break;
			
			case 38: // up arrow
			if(up){
				
				tween_run_middle.stop();
				tween_stop.start();
				up = false;
				running = false;
			}
			
			break;
			
			case 39: //right arrow
			if(right){
				
				tween_run_middle.stop();
				tween_stop.start();
				running = false;
				right = false;
			}
			
			
			break;
			
			case 40: // down arrow			
			if(down){
				
				tween_run_middle.stop();
				tween_stop.start();
				running = false;
				down = false;
			}
			
			
			break;
		
			case 65: // a left
			if(left){
				
				tween_run_middle.stop();
				tween_stop.start();
				left = false;
				running = false;
			}
			
			break;
			
			case 87: // w up
			if(up){
				
				tween_run_middle.stop();
				tween_stop.start();
				up = false;
				running = false;
			}
			
			break;
			
			case 68: // d right
			if(right){
				
				tween_run_middle.stop();
				tween_stop.start();
				right = false;
				running = false;
			}
			
			break;

			case 83: // s down
			if(down){
				
				tween_run_middle.stop();
				tween_stop.start();
				down = false;
				running = false;
			}
			
			break;
			
		};
	});
	
}

function loadall(){
	init();
}

function animate() {
	
	delta = clock.getDelta();
	TWEEN.update();
	scene.simulate();
	if(orbitControls) {
		controls.target.set(steve_box.position.x, steve_box.position.y, steve_box.position.z);
		controls.update();
	} else{
		camera.position.set(steve_box.position.x, 11, steve_box.position.z+15);
		camera.lookAt(steve_box.position.x, steve_box.position.y, steve_box.position.z);
	
	}
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}


  


loadall();
