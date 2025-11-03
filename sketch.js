/**
 * Made with p5play!
 * https://p5play.org
 */

let player, groundSensor, grass, water, coins;
let grassImg, waterImg, coinsImg, charactersImg;

let score = 0;

new Q5();

new Canvas(200, 160);
displayMode('maxed', 'pixelated');

grassImg = loadImage('assets/grass.png');
waterImg = loadImage('assets/water.png');
coinsImg = loadImage('assets/coin.png');
charactersImg = loadImage('assets/characters.png');


function setup() {
	world.gravity.y = 10;
	allSprites.pixelPerfect = true;

	grass = new Group();
	grass.physics = 'static';
	grass.layer = 0;
	grass.img = grassImg;
	grass.tile = 'g';

	water = new Group();
	water.physics = 'static';
	water.layer = 2;
	water.img = waterImg;
	water.h = 8;
	water.tile = 'w';

	coins = new Group();
	coins.physics = 'static';
	coins.spriteSheet = coinsImg;
	coins.addAni({ w: 16, h: 16, row: 0, frames: 14 });
	coins.tile = 'c';

	new Tiles(
		[
			'cc',
			'gg                                     g',
			' ',
			'   gg',
			'       c                        c  g',
			'      ggg    c                  g',
			'            ggg             g                 ccc',
			'                                              ccc',
			'     c c c       c c                          ccc',
			'gggggggggggwwwwwggggg  ggggggggggg            ggg'
		],
		8,
		8,
		16,
		16
	);

	player = new Sprite(48, 100, 12, 12);
	player.layer = 1;
	player.anis.w = 16;
	player.anis.h = 16;
	player.anis.offset.y = 1;
	player.anis.frameDelay = 8;
	player.spriteSheet = charactersImg;
	player.addAnis({
		idle: { row: 0, frames: 4 },
		knockback: { row: 0, frames: 1 },
		run: { row: 1, frames: 3 },
		jump: { row: 1, col: 3, frames: 2 }
	});
	player.changeAni('idle');
	player.rotationLock = true;

	// IMPORTANT! prevents the player from sticking to the sides of walls
	player.friction = 0;

	player.overlaps(coins, collectCoin);

	// This groundSensor sprite is used to check if the player
	// is close enough to the ground to jump. But why not use
	// `player.colliding(grass)`? Because then the player could
	// jump if they were touching the side of a wall!
	// Also the player's collider bounces a bit when it hits
	// the ground, even if its bounciness is set to 0. When
	// making a platformer game, you want the player to 
	// be able to jump right after they land.
	// This approach was inspired by this tutorial:
	// https://www.iforce2d.net/b2dtut/jumpability
	groundSensor = new Sprite(48, 106, 6, 12, 'n');
	groundSensor.visible = false;
	groundSensor.mass = 0.01;
	
	let j = new GlueJoint(player, groundSensor);
	j.visible = false;

	textAlign(CENTER);
}

function collectCoin(player, coin) {
	coin.remove();
	score++;
}

function update() {
	background('skyblue');
	fill(255);

	text('Score: ' + score, 160, 20);

	// make the player slower in water
	if (groundSensor.overlapping(water)) {
		player.drag = 20;
		player.friction = 10;
	} else {
		player.drag = 0;
		player.friction = 0;
	}
	//player jumps only when groundsensor overlaps grass or water
	if (groundSensor.overlapping(grass) ||
			groundSensor.overlapping(water)) {
		if (kb.presses('up') || kb.presses('space')) {
			player.changeAni('jump');
			player.vel.y = -4.5;
		}
	}

	if (kb.pressing('left')) {
		player.changeAni('run');
		player.vel.x = -1.5;
		player.scale.x = -1;
	} else if (kb.pressing('right')) {
		player.changeAni('run');
		player.vel.x = 1.5;
		player.scale.x = 1;
	} else {
		player.changeAni('idle');
		player.vel.x = 0;
	}

	// if player falls, reset them
	if (player.y > 400) {
		player.speed = 0;
		player.x = 48;
		player.y = 100;
	}
}

function drawFrame() {
	camera.x = player.x + 52;
}
