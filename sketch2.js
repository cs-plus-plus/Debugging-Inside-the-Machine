new Q5();

//stage1 vars
let player;
let floor;
let changefloor;
let kbup;
let kbright;
let kbleft;
let rand;
let kbchange = false;
let onfloor;
let airfloor;
//let floorgroup;
//let floorgroup2;
let invisible;
let startportal;
let startportalimg;
let endportal;
let endportalimg;
let floorimg;

//stage stats
let stage1complete = false;
let stage2complete = false;
let stagenumber = 0;

//menu vars
let firstbutton;
let secondbutton;

function preload(){
	// startportalimg = loadImage('images/portal.png');
	// endportalimg = loadImage('images/portal2.png');
	// floorimg = loadImage('images/floor.png');
}


function setup(){
	new Canvas(1000,1000);
	world.gravity.y = 15;
	menustage();

    //floor
	floor = new Sprite();
	floor.physics = STA;
	floor.color = ('green');
	floor.h = 20;
	floor.y = 940;
	floor.w = 1000;
    floor.tile = 'f'

	//airfloor
	airfloor = new Group();
	airfloor.physics = STA;
	airfloor.color = ('green');
	airfloor.tile = 'o';
	airfloor.h = 15;
	airfloor.w = 100;
	//airfloor.img = floorimg;
	airfloor.scale = 2;
	//airfloor.debug = true;

	//invisible floor
	invisible = new Group();
	invisible.physics = STA;
	invisible.visible = true;
	invisible.tile = '0';
	invisible.h = 34;
	invisible.w = 202;
	//invisible.debug = true;

	//control change floor
	changefloor = new Group();
	changefloor.physics = STA;
	changefloor.color = ('gray');
	changefloor.tile = 'c';
	changefloor.h = 30;
	changefloor.w = 200;



}



function update(){
	background('skyblue');
    //stage 1 portal
	if (stagenumber == 1){
		//portal
		if (player.overlaps(endportal)){
			stage1complete = true;
			stagenumber = 0;
			menustage();
		}
	}

	//stage 2 portal
	if (stagenumber == 2){
		//portal
		if (player.overlaps(endportal)){
			stage2complete = true;
			stagenumber = 0;
			menustage();
		}
	}

	//menu stage
	if(stagenumber == 0){
		if (firstbutton.mouse.presses()){
			stagenumber = 1;
			first();
		}

		if (secondbutton.mouse.presses()){
			stagenumber = 2;
			console.log("stage2")
			second();
		}


		//complete stage
		if (stage1complete == true){
			firstbutton.color = ('gray')
		}
		if (stage2complete == true){
			secondbutton.color = ('gray')
		}
	}
	//first stage
	if (stagenumber == 1 || stagenumber == 2){

		//control explanation
		textSize(30);
		text("up = "+ kbup,100,70);
		text("right = "+ kbright,100,100);
		text("left = "+ kbleft,100,130);
	

		//playermovement
		if (player.collides(floor)||player.collides(changefloor)||player.colliding(airfloor)){
			player.velocity.y = 0;
		}
		//left and right
		if (kb.pressing(kbleft)) {
			player.vel.x = -5;
		}
		else if (kb.pressing(kbright)) {
			player.vel.x = 5;
			}	
		else {
			player.vel.x = 0;
		}

		//player out of the map
		if (player.x <= -50||player.x >= 1050){
			player.x = 800;
			player.y = 900;
		}

		//on floor
		if (player.collides(floor)||player.collides(changefloor)||player.colliding(airfloor)){
			onfloor = true;
		}
		else{
			onfloor = false;
		}
		
		//up
		if (kb.pressing(kbup) && onfloor == true) {
			player.vel.y = -10;
		}


		//change keys
		if ((player.overlaps(invisible))){
			kbchange = true;
			rand = Math.floor(random(0,4));
		}
		if (kbchange == true && (rand==0)) {
			kbup = 'up';
			kbright = 'left';
			kbleft = 'right';
		}
		else if (kbchange == true && (rand==1)){
			kbup = 'right';
			kbright = 'down';
			kbleft = 'up';
		}
		else if (kbchange == true && (rand==2)){
			kbup = 'down';
			kbright = 'up';
			kbleft = 'left';
		}
		else if(kbchange == true && (rand==3)){
			kbup = 'up';
			kbright = 'right';
			kbleft = 'left';
		}
		else {
			kbup = 'up';
			kbright = 'right';
			kbleft = 'left';
		}

	}
	

}


//menu
function menustage(){
	allSprites.remove();
	//first stage button
	firstbutton = new Sprite(500,400,300,50, STA);
	firstbutton.text = 'Stage 1';
	firstbutton.textSize = 30;
	firstbutton.color = ('white');
	//second stage button
	secondbutton = new Sprite(500,500,300,50,STA);
	secondbutton.text = 'Stage 2';
	secondbutton.textSize = 30;
	secondbutton.color = ('white');

}

//1st stage
function first(){
	allSprites.remove();
	//player
	player = new Sprite(800,900);
	player.bounciness = -10;
	player.rotationLock =true;

	//floor group
	floor1a = new Tiles(
		[
			'.o..',
			'...c',
			'.o..',
			'..o.',
			'c...',
            'f'
		]
		, 200, 150, changefloor.w, changefloor.h + 130
	);


	floor1b = new Tiles(
		[
			'....',
			'...0',
			'....',
			'....',
			'0...',
            'f'
		]
		,200, 150, changefloor.w, changefloor.h + 130
	);

	
	//start portal
	startportal = new Sprite (950,880);
	startportal.h = 16;
	startportal.w = 13;
	startportal.scale = 6;
	startportal.physics = STA;
	//startportal.img = startportalimg;

	//end portal
	endportal = new Sprite (350,85);
	endportal.physics = STA;
	endportal.h = 16;
	endportal.w = 13;
	//endportal.img = endportalimg;
	endportal.scale = 6;

}

//2nd stage
function second(){
	allSprites.remove();
	//player
	//player
	player = new Sprite(800,900);
	player.bounciness = -10;
	player.rotationLock =true;

	//floor group
	floor2a = new Tiles(
		[
			'.o..',
			'...c',
			'.o..',
			'..o.',
			'c...',
            'f'
		]
		, 200, 150, changefloor.w, changefloor.h + 130
	);


	floor2b = new Tiles(
		[
			'....',
			'...0',
			'....',
			'....',
			'0...',
            'f'
		]
		,200, 150, changefloor.w, changefloor.h + 130
	);

	

	//start portal
	startportal = new Sprite (950,880);
	startportal.h = 16;
	startportal.w = 13;
	startportal.scale = 6;
	startportal.physics = STA;
	//startportal.img = startportalimg;

	//end portal
	endportal = new Sprite (350,85);
	endportal.physics = STA;
	endportal.h = 16;
	endportal.w = 13;
	//endportal.img = endportalimg;
	endportal.scale = 6;

}