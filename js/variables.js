var clock;
var delta;
var container;
var hard = false;

if(sessionStorage.getItem("hard") == "true") {
	hard = true;
}else if(sessionStorage.getItem("easy") == "true"){
	hard = false;
}


const data = new Date();
var initial;
var fine;
var duration = 0;
var orbitControls = false;
var inputDisabled = false;
var gltfLoader;
var loadManager;
var textureLoader;
var ground_material;
var ground_material2;
var ground1;
var ground2;
var renderer;
var scene;
var camera;
var controls;
var ambientLight;
var dirLight;



var steveX = -14;
var steveY = 0;
var steveZ = 16;





//steve Components
var steve;
var steve_box;
var upper_steve_box;
var root;
var head;
var torso;
var rotation;
var upperArmR;
var upperArmL;
var upperLegR;
var upperLegL;
var model;

//charctaers
var ball;
var ghost;
var mushroom;


var right = false;
var left = false;
var up = false;
var down = false;


var position;
var collided = false;
var collision_direction;
var direction;
var flag = true;
var running = false;
var stop_animation = false;


//Tweens
var tween_move;
var tween_run_end;
var tween_run_middle;
var tween_stop;

var time = 300;
var step = 0.05;


var randomStepX = 0;
var randomStepZ = 0;

var ghost_tween;

var ball_box;
var ball_array = [];

var ghost_box;
var ghost_array = [];

var mushroom_box;
var mushroom_array= [];

const steve_parts = {
	
	Root: "_12",

	Head: "head_10",
	

	Torso: "body_5",
	

	UpperArmR: "arm1_9",


	UpperArmL: "arm0_7",

	UpperLegR: "leg1_3",

	UpperLegL: "leg0_1",


};