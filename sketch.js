/**
 * Modified with p5play!
 * https://p5play.org
 *
 * This version includes:
 * - A "Start Screen" (Press Enter to start)
 * - A detailed "Directions" screen
 * - Touching a coin pauses the game to "inspect" it
 * - A "Code Lens" button that appears near coins
 * - A pause screen ('c' key)
 * - Code Lens actions:
 *   - '1' (Correct): Unpauses, +1 score, +5 stability, replaces coin with grass
 *   - '2' (Incorrect): Unpauses, -10 stability, replaces coin with brick
 * - A styled pause overlay (50% transparent) with padding and border
 * - A "Game Over" screen with stats when stability hits 0
 * - A "Win Screen" when all nodes are fixed
 * - Camera zoom and layering fixes
 * - Stability timer moved to update() to fix scope errors
 * - Static tilemap (no random generation), aligned with player spawn
 */

let player, groundSensor, grass, platforms, coins, enemies;
let grassImg, coinsImg, charactersImg, brickImg;

let score = 9;
let systemStability = 100;

// Required globals
let showCodeLensButton = false;
let stabilityTimer = 0;
const stabilityInterval = 1000; // 1000 ms = 1 second
let nearestCoin = null; // Tracks the coin being inspected
const ROAM_SPEED = 1.5;

// Game state
let gameState = 'start'; // 'start', 'directions', 'play', 'paused', 'gameOver', 'win'

// Will be set from the tilemap based on the number of coins
let totalNodes = 0;

// World bounds (for camera constraints)
let mapLeft = 0;
let mapRight = 2000;
let mapTop = -1600;
let mapBottom = 1600;

// STATIC TILEMAP: g = grass, p = platform, c = coin (node), e = enemy
const tilemap = [
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'g                                                            g',
  'g                                                            g',
  'g                                                            g',
  'g     c                                                      g',
  'g    ppp                                                     g',
  'g                                                            g',
  'g            e                                               g',
  'g           ppp                                              g',
  'g                                                            g',
  'g    p p p                                 c                 g',
  'g                                         ppp                g',
  'g                                                            g',
  'g                                                            g',
  'g  c                                                         g',
  'g ppp                     e                                  g',
  'g                        ppp                                 g',
  'g                                                            g',
  'g                                                            g',
  'g      c                                                     g',
  'g     ppp                                                    g',
  'g                                                            g',
  'g    e                                                       g',
  'g   ppp                                                      g',
  'g                                                            g',
  'g                                                            g',
  'g                      c                                     g',
  'g                     ppp                                    g',
  'g          c                                                 g',
  'g         ppp                                                g',
  'g                                                            g',
  'g                                                            g',
  'g                                                            g',
  'g  e                               p p p p                   g',
  'g ppp             e                                          g',
  'g                ppp                                         g',
  'g                                                            g',
  'g                                                            g',
  'g    c                                                       g',
  'g   ppp                 c                                    g',
  'g                      ppp                                   g',
  'g                                                            g',
  'g                                                            g',
  'g     p p p p p p p p p p p p p p p p p p p p p p p p p      g',
  'g                                                            g',
  'g  c                                                         g',
  'g gggg                                                       g',
  'g                                                            g',
  'g                                                            g',
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];

new Q5();

new Canvas(2000, 1600);
displayMode('maxed', 'pixelated');

grassImg = loadImage('assets/grass.png');
coinsImg = loadImage('assets/coin.png');
charactersImg = loadImage('assets/characters.png');
brickImg = loadImage('assets/brick.png');

function setup() {
  world.gravity.y = 10;
  allSprites.pixelPerfect = true;

  // We'll manually draw sprites so GUI stays on top
  allSprites.autoDraw = false;

  // Game starts paused
  world.active = false;

  // --- GROUPS ---

  grass = new Group();
  grass.physics = 'static';
  grass.layer = 0;
  grass.img = grassImg;
  grass.tile = 'g';

  platforms = new Group();
  platforms.physics = 'static';
  platforms.layer = 0;
  platforms.img = grassImg;
  platforms.tile = 'p';

  coins = new Group();
  coins.physics = 'static';
  coins.spriteSheet = coinsImg;
  coins.addAni({ w: 16, h: 16, row: 0, frames: 14 });
  coins.tile = 'c';

  enemies = new Group();
  enemies.physics = 'static';
  enemies.img = brickImg;
  enemies.w = 16;
  enemies.h = 16;
  enemies.rotationLock = true;
  enemies.layer = 0;
  enemies.tile = 'e';

  // --- TILEMAP BUILD (STATIC, ALIGNED TO BOTTOM) ---

  const tileSize = 16;
  const tilemapHeight = tilemap.length * tileSize;

  mapLeft = 0;
  mapRight = tilemap[0].length * tileSize; // width from string length
  mapBottom = 1600;                         // keep your old "floor" at 1600
  mapTop = mapBottom - tilemapHeight;       // top row so last row lands at 1600

  new Tiles(
    tilemap,
    mapLeft,
    mapTop,
    tileSize,
    tileSize
  );

  // Now that tiles are placed, set totalNodes from coins and init enemy roaming
  totalNodes = coins.length;

  for (let en of enemies) {
    en.spawnX = en.x;
    en.spawnY = en.y;
    en.angle = random(360);
  }

  // --- PLAYER + GROUND SENSOR ---

  const playerStartX = mapLeft + (mapRight - mapLeft) / 2;
  const playerStartY = mapBottom - 100; // a bit above the bottom row

  player = new Sprite(playerStartX, playerStartY, 12, 12);
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
  player.friction = 0;

  // Overlaps for game logic
  player.overlaps(coins, inspectCoin);
  player.overlaps(enemies, hitEnemy);

  // Ground sensor glued to player, used only for "on ground?" checks
  groundSensor = new Sprite(playerStartX, playerStartY + 6, 6, 12, 'n');
  groundSensor.visible = false;
  groundSensor.mass = 0.01;

  let j = new GlueJoint(player, groundSensor);
  j.visible = false;

  textSize(50);
  textStyle(BOLD);

  camera.x = player.x;
  camera.y = player.y;
  camera.zoom = 5;

  // Stop all animations at start
  world.active = false;
  allSprites.forEach(s => {
    if (s.ani) s.ani.stop();
  });
}

// --- COIN INSPECTION (CODE LENS ENTRY) ---

function inspectCoin(player, coin) {
  if (gameState === 'play') {
    gameState = 'paused';
    world.active = false;
    allSprites.forEach(s => {
      if (s.ani) s.ani.stop();
    });
    nearestCoin = coin;
  }
}

// --- GAME END HELPERS ---

function triggerGameOver() {
  gameState = 'gameOver';
  world.active = false;
  allSprites.forEach(s => {
    if (s.ani) s.ani.stop();
  });
}

function triggerWin() {
  gameState = 'win';
  world.active = false;
  allSprites.forEach(s => {
    if (s.ani) s.ani.stop();
  });
}

// --- ENEMY COLLISION ---

function hitEnemy(player, enemy) {
  enemy.remove();
  systemStability -= 10;
  if (systemStability < 0) systemStability = 0;

  if (systemStability <= 0) {
    triggerGameOver();
  }
}

// --- MAIN UPDATE LOOP ---

function update() {

  // --- 1. State-based Input ---

  if (gameState === 'start') {
    if (kb.presses('enter')) {
      gameState = 'play';
      world.active = true;
      allSprites.forEach(s => {
        if (s.ani) s.ani.play();
      });
    }
    if (kb.presses('d')) {
      gameState = 'directions';
    }
  }
  else if (gameState === 'directions') {
    if (kb.presses('escape')) {
      gameState = 'start';
    }
  }
  else if (gameState === 'play') {
    if (kb.presses('c') && showCodeLensButton) {
      gameState = 'paused';
      world.active = false;
      allSprites.forEach(s => {
        if (s.ani) s.ani.stop();
      });
    }
  }
  else if (gameState === 'paused') {
    // '1' = Correct action
    if (kb.presses('1')) {
      if (nearestCoin) {
        let coinX = nearestCoin.x;
        let coinY = nearestCoin.y;
        nearestCoin.remove();

        new grass.Sprite(coinX, coinY);

        systemStability += 5;
        if (systemStability > 100) systemStability = 100;

        score++;
        nearestCoin = null;

        if (score >= totalNodes) {
          triggerWin();
        } else {
          gameState = 'play';
          world.active = true;
          allSprites.forEach(s => {
            if (s.ani) s.ani.play();
          });
        }
      } else {
        gameState = 'play';
        world.active = true;
        allSprites.forEach(s => {
          if (s.ani) s.ani.play();
        });
      }
    }

    // '2' = Incorrect action
    if (kb.presses('2')) {
      gameState = 'play';
      world.active = true;
      allSprites.forEach(s => {
        if (s.ani) s.ani.play();
      });

      if (nearestCoin) {
        let coinX = nearestCoin.x;
        let coinY = nearestCoin.y;
        nearestCoin.remove();

        let en = new enemies.Sprite(coinX, coinY);
        en.spawnX = coinX;
        en.spawnY = coinY;
        en.angle = random(360);

        systemStability -= 10;
        if (systemStability < 0) systemStability = 0;

        if (systemStability <= 0) {
          triggerGameOver();
        }

        nearestCoin = null;
      }
    }
  }
  else if (gameState === 'gameOver' || gameState === 'win') {
    if (kb.presses('p')) {
      location.reload();
    }
  }

  // --- 2. Clear Background ---

  background('black');

  // --- 3. Game Logic (play state only) ---

  if (gameState === 'play') {

    // Stability timer
    stabilityTimer += deltaTime;
    if (stabilityTimer >= stabilityInterval) {
      if (systemStability > 0) systemStability--;
      stabilityTimer = 0;
      if (systemStability <= 0) {
        triggerGameOver();
      }
    }

    // Enemy circular movement
    for (let en of enemies) {
      let radius = 100;
      let speed = ROAM_SPEED / 2;
      en.angle += speed;
      en.x = en.spawnX + cos(en.angle) * radius;
      en.y = en.spawnY + sin(en.angle) * radius;
    }

    // Player movement / jump
    if (groundSensor.overlapping(grass) || groundSensor.overlapping(platforms)) {
      if (kb.presses('up') || kb.presses('space')) {
        player.changeAni('jump');
        player.vel.y = -5.5;
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
      if (
        player.vel.y === 0 &&
        (groundSensor.overlapping(grass) || groundSensor.overlapping(platforms))
      ) {
        player.changeAni('idle');
      }
      player.vel.x = 0;
    }

    if (
      player.vel.y !== 0 &&
      !groundSensor.overlapping(grass) &&
      !groundSensor.overlapping(platforms)
    ) {
      player.changeAni('jump');
    }

    // Code Lens proximity check
    showCodeLensButton = false;
    nearestCoin = null;

    for (let coin of coins) {
      let d = dist(player.x, player.y, coin.x, coin.y);
      if (d < 50) {
        showCodeLensButton = true;
        nearestCoin = coin;
        break;
      }
    }

    // Camera constraint logic using tilemap bounds
    let cameraViewHalfWidth = (canvas.w / camera.zoom) / 2;
    let cameraViewHalfHeight = (canvas.h / camera.zoom) / 2;

    let minX = mapLeft + cameraViewHalfWidth;
    let maxX = mapRight - cameraViewHalfWidth;
    let minY = mapTop + cameraViewHalfHeight;
    let maxY = mapBottom - cameraViewHalfHeight;

    // If map is narrower than the camera view, clamp to center
    if (maxX < minX) {
      let midX = (mapLeft + mapRight) / 2;
      minX = maxX = midX;
    }
    if (maxY < minY) {
      let midY = (mapTop + mapBottom) / 2;
      minY = maxY = midY;
    }

    camera.x = constrain(player.x, minX, maxX);
    camera.y = constrain(player.y, minY, maxY);
  }

  // --- 4. Draw Sprites (camera space) ---

  camera.on();
  allSprites.draw();
  camera.off();

  // --- 5. GUI / SCREENS (screen space, zoom-safe) ---

  push();
  resetMatrix();

  if (gameState === 'start') {
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);

    fill(255);
    textSize(100);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("Debugging: Inside the Machine", canvas.w / 2, canvas.h / 2 - 100);

    fill(200);
    textSize(50);
    text("Press ENTER to Start", canvas.w / 2, canvas.h / 2 + 20);

    fill(150);
    textSize(40);
    text("Press 'd' for Directions", canvas.w / 2, canvas.h / 2 + 100);
  }

  else if (gameState === 'directions') {
    fill(0, 0, 0, 225);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);
    let padding = 80;

    fill(255);
    textSize(80);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text("SYSTEM BRIEFING // MISSION: DEBUGGING", canvas.w / 2, padding);

    fill(200);
    textSize(36);
    textStyle(NORMAL);
    textAlign(LEFT, TOP);
    let textY = padding + 120;
    text("Welcome, Debugger.", padding, textY);
    textY += 100;
    text("You’ve been uploaded inside the machine — a living, breathing network of corrupted data.", padding, textY);
    textY += 100;
    text("Your mission: stabilize the system before it collapses.", padding, textY);
    textY += 100;
    text("Every node you repair will restore fragments of code stability.", padding, textY);
    textY += 100;
    text("Watch for the Code Lens - it will appear near critical logic points.", padding, textY);
    textY += 100;
    text("But beware: rogue fragments are looping endlessly, spreading chaos in the circuits.", padding, textY);
    textY += 100;
    text("Collide with one and you’ll corrupt your own memory buffer.", padding, textY);
    textY += 100;
    text("Stay sharp. Stay stable.", padding, textY);
    textY += 100;
    text("The machine is counting on you.", padding, textY);

    textY += 150;
    fill(50, 205, 50);
    textStyle(BOLD);

    text("MOVEMENT:           ← → or A / D", padding, textY);
    textY += 50;
    text("JUMP:               SPACE or ↑", padding, textY);
    textY += 50;
    text("ENTER CODE LENS:    C (or touch the glitch)", padding, textY);
    textY += 50;
    text("MAKE SELECTION:     1 (Correct) or 2 (Incorrect)", padding, textY);
    textY += 70;
    text(
      "GOAL: Fix all " + totalNodes + " Nodes, avoid rogue code, and stabilize the system.",
      padding,
      textY
    );

    fill(150);
    textSize(40);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text("Press 'esc' to return Home", canvas.w / 2, canvas.h - 100);
  }

  else if (gameState === 'gameOver') {
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);

    fill(255, 0, 0);
    textSize(150);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("System Failure", canvas.w / 2, canvas.h / 2 - 80);

    let percentFixed = (score / totalNodes) * 100;
    fill(200);
    textSize(50);
    text("Nodes Fixed: " + score, canvas.w / 2, canvas.h / 2 + 50);
    text("System " + percentFixed + "% Stabilized", canvas.w / 2, canvas.h / 2 + 110);

    fill(200);
    textSize(40);
    text("Press 'p' to play again", canvas.w / 2, canvas.h / 2 + 300);
  }

  else if (gameState === 'win') {
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);

    fill(0, 255, 0);
    textSize(150);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("System Stabilized", canvas.w / 2, canvas.h / 2);

    fill(200);
    textSize(40);
    text("Press 'p' to play again", canvas.w / 2, canvas.h / 2 + 300);
  }

  else if (gameState === 'play') {
    // HUD
    fill(250, 250, 250, 200);
    stroke(0);
    strokeWeight(4);
    textAlign(RIGHT, TOP);
    textSize(50);
    text('Nodes Fixed: ' + score, canvas.w - 20, 20);

    let barWidth = 400;
    let barHeight = 30;
    let padding = 20;

    fill(250, 250, 250, 200);
    textAlign(LEFT, TOP);
    textSize(50);
    text('System Stability: ' + systemStability + '%', padding, padding);

    noStroke();
    fill(50, 50, 50, 200);
    rect(padding, padding + 55, barWidth, barHeight);

    let stabilityColor = lerpColor(
      color(255, 0, 0, 200),
      color(0, 255, 0, 200),
      systemStability / 100
    );
    fill(stabilityColor);
    rect(padding, padding + 55, barWidth * (systemStability / 100), barHeight);

    if (showCodeLensButton) {
      let buttonText = 'Code Lens';
      textSize(40);
      textStyle(BOLD);

      let buttonW = textWidth(buttonText) + 60;
      let buttonH = 80;
      let padding = 20;
      let buttonX = canvas.w - buttonW - padding;
      let buttonY = canvas.h - buttonH - padding;

      fill(0, 0, 0, 220);
      stroke(50, 205, 50, 255);
      strokeWeight(4);
      rect(buttonX, buttonY, buttonW, buttonH, 10);

      noStroke();
      fill(50, 205, 50);
      textAlign(CENTER, CENTER);
      text(buttonText, buttonX + buttonW / 2, buttonY + buttonH / 2 + 5);
    }
  }

  else if (gameState === 'paused') {
    let overlayPadding = 50;
    let overlayX = overlayPadding;
    let overlayY = overlayPadding;
    let overlayW = canvas.w - (overlayPadding * 2);
    let overlayH = canvas.h - (overlayPadding * 2);

    fill(0, 0, 0, 128);
    stroke(50, 205, 50, 255);
    strokeWeight(4);
    rect(overlayX, overlayY, overlayW, overlayH, 10);

    noStroke();
    fill(50, 205, 50);
    textSize(120);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("Code Lens", canvas.w / 2, canvas.h / 2);
  }

  pop();
}
