import TWEEN from "./libs/tween.esm.js";

var r_finale = 0; // old angle
var r = (0 * Math.PI) / 180; // final angle
var r_new; // the new angle based on the new direction.
var diff = 0; //used to calculate the difference between the new angle and the old one


export function run(){
	
	
	if ((left || up)&& step > 0) step = -step;
	else if ((right || down) && step < 0) step = -step;
	
	
	var start = {
		
		torso: torso.rotation.x,
		root : root.rotation.y,
		armR : upperArmR.rotation.z,
		armL : upperArmL.rotation.z,
		legR : upperLegR.rotation.x,
		legL : upperLegL.rotation.x,
	};
	
	
	var middle = {
		
		head : -(5 * Math.PI) / 180,
		torso: (10 * Math.PI) / 180,
		armR : -(30 * Math.PI) / 180,
		armL : (30 * Math.PI) / 180,		
		legR : (45 * Math.PI) / 180,
		legL : -(45 * Math.PI) / 180,		
	};
	

	var end = {
				
		head : (5 * Math.PI) / 180,
		torso: -(10 * Math.PI) / 180,				
		armR : (30 * Math.PI) / 180,
		armL : -(30 * Math.PI) / 180,		
		legR : -(45 * Math.PI) / 180,
		legL : (45 * Math.PI) / 180,
		
		
	};
	
	var stop = {
				
		head : (0 * Math.PI) / 180,
		torso: (0 * Math.PI) / 180,				
		armR : (10 * Math.PI) / 180,
		armL : (10 * Math.PI) / 180,		
		legR : (0 * Math.PI) / 180,
		legL : (0 * Math.PI) / 180,
		
		
	};
	
	tween_run_middle = new TWEEN.Tween(start)
					.to(middle, time)
					.easing(TWEEN.Easing.Linear.None)
					.onUpdate(function () {
						
						if(!collided || collision_direction != direction ){
							if(direction == 'right' || direction == 'left'){
								camera.position.x += step;
								camera.updateProjectionMatrix();
								steve_box.position.x += step;  // x axe
								collided = false;
							}else if (direction == 'up' || direction == 'down'){
								camera.position.z += step;
								camera.updateProjectionMatrix();
								steve_box.position.z += step;  //z axe
								collided = false;
							}
						}
	
						torso.rotation.x = start.torso;
					
						upperArmR.rotation.x = start.armR;
						upperArmL.rotation.x = start.armL;
						
						upperLegR.rotation.x = start.legR;
						upperLegL.rotation.x = start.legL;
						

						steve_box.__dirtyPosition = true;
						steve_box.__dirtyRotation = true;
					})
					.start();
	
	tween_run_end =  new TWEEN.Tween(start)
					.to(end, time)
					.easing(TWEEN.Easing.Linear.None)
					.onUpdate(function () {
						
						if(!collided || collision_direction != direction ){
							if(direction == 'right' || direction == 'left'){
								camera.position.x += step;
								camera.updateProjectionMatrix();
								steve_box.position.x += step;  // x axe
								collided = false;
							}else if (direction == 'up' || direction == 'down'){
								camera.position.z += step;
								camera.updateProjectionMatrix();
								steve_box.position.z += step;  //z axe
								collided = false;
							}
						}
						

						torso.rotation.x = start.torso;
					
						upperArmR.rotation.x = start.armR;
						upperArmL.rotation.x = start.armL;
						
						upperLegR.rotation.x = start.legR;
						upperLegL.rotation.x = start.legL;
						

						
						steve_box.__dirtyPosition = true;
						steve_box.__dirtyRotation = true;
						
					})
					.yoyo(true)
					.repeat(Infinity);

	tween_run_middle.chain(tween_run_end);
	
	
	tween_stop = new TWEEN.Tween(start)
					.to(stop, time)
					.easing(TWEEN.Easing.Linear.None)
					.onUpdate(function () {
						
						//antenna.rotation.z = start.ant;
						
						//head.rotation.x = start.head;
						//neck.rotation.x = start.neck;
						torso.rotation.x = start.torso;
						
						upperArmR.rotation.x = start.armR;
						upperArmL.rotation.x = start.armL;
						
						upperLegR.rotation.x = start.legR;
						upperLegL.rotation.x = start.legL;
						
						//lowerLegR.rotation.x = start.loweLegR;
						//lowerLegL.rotation.x = start.loweLegL;
						
						steve_box.__dirtyPosition = true;
						steve_box.__dirtyRotation = true;
						
					});
	
	steve_box.__dirtyPosition = true;
	steve_box.__dirtyRotation = true;
}

export function rotate(){
	
	if(right) r_new = 270;
	else if(left) r_new = 90;
	else if(up) r_new = 0;
	else if(down) r_new = 180;
	
	
	
	diff = ( r_new - r_finale );
	
	if (diff > 180) diff = -90; // correct the angle if the difference is to big
	if (diff < -180) diff =90; // correct the angle if the difference is to low
		
	
	r += (diff * Math.PI) / 180;
	

	var start = {
		
		r : steve.rotation.y,
	}
	
	var end = {
		
		r : r,
	}
	
	if(right) r_finale = 270;
	else if(left) r_finale = 90;
	else if(up) r_finale = 0;
	else if(down) r_finale = 180;
	
	var tween_rotation = new TWEEN.Tween(start)
						.to(end, 100)
						.easing(TWEEN.Easing.Linear.None)
						.onUpdate(function () {
							steve.rotation.y = start.r;
							if(steve_box.rotation.y != (0 * Math.PI) / 180){ // this prevents the steve_box to rotate, or to re-establish the right rotation in case of strange collision effects
								steve_box.rotation.y = (0 * Math.PI) / 180;
							}
							
							
						})
						.start();
						
	steve_box.__dirtyPosition = true;
	steve_box.__dirtyRotation = true;
}

export function ball_animation(){
	
	var start = {
		y : ball.position.y,
	};
	
	var end = {
		y : ball.position.y + 0.5,
	};
	
	var ball_tween = new TWEEN.Tween(start)
				.to(end, time*3)
				.easing(TWEEN.Easing.Linear.None)
				.onUpdate(function () {
					ball_array.forEach( function (item) {
						item.position.y = start.y;
					});
					
				})
				.yoyo(true)
				.repeat(Infinity)
				.start();
}

export function ghost_animation(){
	
	ghost_array.forEach( function (item) {
		
	
	var start = {
			x : item.position.x,
			z : item.position.z,
		};
		
	var end1 = {
		x : item.position.x + 1,
		z : item.position.z,
	};
	
	var end2 = {
		x : item.position.x +1,
		z : item.position.z +1,
	};
	
	var end3 = {
		x : item.position.x,
		z : item.position.z + 1,
	};
	
	var end4 = {
		x : item.position.x,
		z : item.position.z,
	};
	
	var ghost_tween1 = new TWEEN.Tween(start)
			.to(end1, time*3)
			.easing(TWEEN.Easing.Linear.None)
			.onUpdate(function () {
				
					item.position.x = start.x;
					item.position.z = start.z;
					
					item.rotation.y = (90 * Math.PI) / 180;
					
					item.__dirtyPosition = true;
					item.__dirtyRotation = true;
					
			})
			.onComplete(function() {
				item.rotation.y -= (90 * Math.PI) / 180;
				item.__dirtyRotation = true;
			})
			.start();
	
	var ghost_tween2 = new TWEEN.Tween(start)
			.to(end2, time*3)
			.easing(TWEEN.Easing.Linear.None)
			.onUpdate(function () {
				
					item.position.x = start.x;
					item.position.z = start.z;
					
					
					
					item.__dirtyPosition = true;
					item.__dirtyRotation = true;
					
					
			})
			.onComplete(function() {
				item.rotation.y -= (90 * Math.PI) / 180;
				item.__dirtyRotation = true;
			});
			
			
	var ghost_tween3 = new TWEEN.Tween(start)
			.to(end3, time*3)
			.easing(TWEEN.Easing.Linear.None)
			.onUpdate(function () {
				
					item.position.x = start.x;
					item.position.z = start.z;
					
					
					
					item.__dirtyPosition = true;
					item.__dirtyRotation = true;
			})
			.onComplete(function() {
				item.rotation.y -= (90 * Math.PI) / 180;
				item.__dirtyRotation = true;		
		
			});
	

	var ghost_tween4 = new TWEEN.Tween(start)
			.to(end4, time*3)
			.easing(TWEEN.Easing.Linear.None)
			.onUpdate(function () {
				
					item.position.x = start.x;
					item.position.z = start.z;
					
					
					
					item.__dirtyPosition = true;
					item.__dirtyRotation = true;
		
			});
			
			
	
	item.__dirtyPosition = true;
	item.__dirtyRotation = true;
			
			
	ghost_tween1.chain(ghost_tween2);
			
	ghost_tween2.chain(ghost_tween3);
	
	ghost_tween3.chain(ghost_tween4);
	
	ghost_tween4.chain(ghost_tween1);
	
	
	});
	
}

export function wave(){
	var start = {
		
		z: (0 * Math.PI) / 180,
		z2: (0 * Math.PI) / 180,
	};
	var end= {
		//ant : -(20 * Math.PI) / 180,
		//rot : rotation.rotation.z + (90 * Math.PI) / 180,
		z: (180 * Math.PI) / 180,
		z2: (15 * Math.PI) / 180,
	};
	var tween = new TWEEN.Tween(start)
				.to(end, time)
				.easing(TWEEN.Easing.Linear.None)
				.onUpdate(function () {
					steve.rotation.y = (180 * Math.PI) / 180;
					
					//rotation.rotation.z += (5 * Math.PI) / 180;
	
					upperArmR.rotation.z = start.z2;
					upperArmL.rotation.z = - start.z;
					//upperArmR.rotation.z = start.z;
					//upperArmL.rotation.z = - start.z;
					//upperLegR.rotation.z =(60 * Math.PI) / 180;
					//upperLegL.rotation.z =-(60 * Math.PI) / 180;
					upperLegR.rotation.z = start.z2;
					upperLegL.rotation.z =- start.z2;
					
				
					
				})
				.yoyo(true)
				.repeat(Infinity)
				.start();
}

export function death(){
	var start = {

		//rot : rotation.rotation.z,
		dead: (0 * Math.PI) / 180,
		dead2: (0 * Math.PI) / 180,
		dead3: (0 * Math.PI) / 180,
	};
	var end= {
	
		//rot : rotation.rotation.z + (90 * Math.PI) / 180,
		dead: (180 * Math.PI) / 180,
		dead2: (15 * Math.PI) / 180,
		dead3: (45 * Math.PI) / 180,
	};
	var tween = new TWEEN.Tween(start)
				.to(end, time)
				.easing(TWEEN.Easing.Linear.None)
				.onUpdate(function () {
					steve.rotation.y = (180 * Math.PI) / 180;
					
					//rotation.rotation.z += (5 * Math.PI) / 180;
				
					upperArmR.rotation.x = start.dead;
					upperArmL.rotation.x = - start.dead;
					//upperArmR.rotation.z = start.z;
					//upperArmL.rotation.z = - start.z;
					//upperLegR.rotation.z =(60 * Math.PI) / 180;
					//upperLegL.rotation.z =-(60 * Math.PI) / 180;
					upperLegR.rotation.z = start.dead2;
					upperLegL.rotation.z =- start.dead2;
					torso.rotation.x = start.dead3;
		
				})
				.yoyo(true)
				.repeat(Infinity)
				.start();
}
