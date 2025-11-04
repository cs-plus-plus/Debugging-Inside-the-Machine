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
 * - '1' (Correct): Unpauses, +1 score, +5 stability, replaces coin with grass
 * - '2' (Incorrect): Unpauses, -10 stability, replaces coin with brick
 * - A styled pause overlay (50% transparent) with padding and border
 * - A "Game Over" screen with stats when stability hits 0
 * - A "Win Screen" when score reaches 10
 * - Camera zoom and layering fixes
 * - Stability timer moved to update() to fix scope errors
 */

let player, groundSensor, grass, platforms, coins, enemies;
let grassImg, coinsImg, charactersImg, brickImg;

let score = 10;
let systemStability = 100;

// ## THESE ARE THE REQUIRED GLOBAL VARIABLES ##
let showCodeLensButton = false;
let stabilityTimer = 0;
const stabilityInterval = 1000; // 1000 ms = 1 second
let nearestCoin = null; // Tracks the coin being inspected
const ROAM_SPEED = 1.5; // ## Make global

// ## NEW: Game State Management ##
let gameState = 'start'; // 'start', 'directions', 'play', 'paused', 'gameOver', 'win'
let totalNodes = 10; // ## NEW: Total number of nodes to fix

new Q5();

new Canvas(2000, 1600);
displayMode('maxed', 'pixelated');

grassImg = loadImage('assets/grass.png');
coinsImg = loadImage('assets/coin.png');
charactersImg = loadImage('assets/characters.png');
brickImg = loadImage('assets/brick.png');

function createTilemap(width, height) {
    let map = [];
    let platform = 'ppp';

    map.push('g' + ' '.repeat(width - 2) + 'g');
    map.push('g' + ' '.repeat(width - 2) + 'g');
    
    for (let i = 0; i < height - 3; i++) {
        let row = 'g' + ' '.repeat(width - 2) + 'g';
        
        if (i % 3 === 0) {
            let numPlatforms = Math.floor(width / 12);
            for (let p = 0; p < numPlatforms; p++) {
                let x = Math.floor(Math.random() * (width - platform.length - 2)) + 1;
                row = row.substring(0, x) + platform + row.substring(x + platform.length);
            }
        }
        map.push(row);
    }

    map.push('g'.repeat(width));
    return map;
}

function setup() {
    world.gravity.y = 10;
    allSprites.pixelPerfect = true;
    
    // We will manually draw the sprites in the update loop
    // to ensure the GUI is drawn on top.
    allSprites.autoDraw = false;

    // ## NEW: Game starts paused ##
    world.active = false;

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
    // ## MODIFIED: Physics changed to static for manual control ##
    enemies.physics = 'static';
    enemies.img = brickImg;
    enemies.w = 16;
    enemies.h = 16;
    // ## REMOVED: bounciness, friction (not needed for static) ##
    enemies.rotationLock = true;
    enemies.layer = 0;
	enemies.tile ='e'

    // ## REMOVED: Enemy collision lines (not needed for static) ##
    // enemies.collides(grass);
    // enemies.collides(enemies);

    let tileWidth = 125;
    let tileHeight = 200;
    let tilemap = createTilemap(tileWidth, tileHeight);
    // const tilemap = [
    // 'ggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                                c                                                                                            g',
    // 'g                               ppp                                                                                         g',
    // 'g            e                                                                                                              g',
    // 'g           ppp                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g    p p p                                                                                  c                               g',
    // 'g                                                                                          ppp                              g',
    // 'g                                                                e                                                        g',
    // 'g                                                               ppp                                                       g',
    // 'g  c                                                                                                                      g',
    // 'g ppp                     e                                                                                               g',
    // 'g                        ppp                                                                                              g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g      c                                                                                                                    g',
    // 'g     ppp                                                                                                                   g',
    // 'g                                                                                                                             g',
    // 'g    e                                                                                                                      g',
    // 'g   ppp                                                                                                                     g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                      c                                                                                                    g',
    // 'g                     ppp                                                                                                   g',
    // 'g          c                                                                                                                g',
    // 'g         ppp                                                                                                               g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g  e                               p p p p                                                                                  g',
    // 'g ppp             e                                                                                                         g',
    // 'g                ppp                                                                                                        g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g    c                                                                                                                      g',
    // 'g   ppp                 c                                                                                                   g',
    // 'g                      ppp                                                                                                  g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g     p p p p p p p p p p p p p p p p p p p p p p p p p                                                                       g',
    // 'g                                                                                                                             g',
    // 'g  c                                                                                                                        g',
    // 'g gggg                                                                                                                      g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                                c                                                                                            g',
    // 'g                               ppp                                                                                         g',
    // 'g            e                                                                                                              g',
    // 'g           ppp                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g    p p p                                                                                  c                               g',
    // 'g                                                                                          ppp                              g',
    // 'g                                                                e                                                        g',
    // 'g                                                               ppp                                                       g',
    // 'g  c                                                                                                                      g',
    // 'g ppp                     e                                                                                               g',
    // 'g                        ppp                                                                                              g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g      c                                                                                                                    g',
    // 'g     ppp                                                                                                                   g',
    // 'g                                                                                                                             g',
    // 'g    e                                                                                                                      g',
    // 'g   ppp                                                                                                                     g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                      c                                                                                                    g',
    // 'g                     ppp                                                                                                   g',
    // 'g          c                                                                                                                g',
    // 'g         ppp                                                                                                               g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g  e                               p p p p                                                                                  g',
    // 'g ppp             e                                                                                                         g',
    // 'g                ppp                                                                                                        g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g    c                                                                                                                      g',
    // 'g   ppp                 c                                                                                                   g',
    // 'g                      ppp                                                                                                  g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'g     p p p p p p p p p p p p p p p p p p p p p p p p p                                                                       g',
    // 'g                                                                                                                             g',
    // 'g  c                                                                                                                        g',
    // 'g gggg                                                                                                                      g',
    // 'g                                                                                                                             g',
    // 'g                                                                                                                             g',
    // 'ggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg'
    // ];

    new Tiles(
        tilemap,
        0,
        -1600,
        16,
        16
    );

    player = new Sprite(1000, 1500, 12, 12);
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

    // ## MODIFIED: Overlap now calls inspectCoin ##
    player.overlaps(coins, inspectCoin);
    player.overlaps(enemies, hitEnemy);

    groundSensor = new Sprite(1000, 1506, 6, 12, 'n');
    groundSensor.visible = false;
    groundSensor.mass = 0.01;

    let j = new GlueJoint(player, groundSensor);
    j.visible = false;

    textSize(50);
    textStyle(BOLD);

    camera.y = player.y;
    camera.x = canvas.w / 2;
    camera.zoom = 5;

    // ## MODIFIED ##
    // setInterval block removed. Timer logic is now in update().

    let xMin = 16;
    let xMax = canvas.w - 16;
    let yMin = 800;
    let yMax = 1600 - 32;

    for (let i = 0; i < totalNodes; i++) { // ## MODIFIED: Use totalNodes ##
        let x = random(xMin, xMax);
        let y = random(yMin, yMax);
        new coins.Sprite(x, y);
    }

    // const ROAM_SPEED = 1.5; // Moved to global scope
    for (let i = 0; i < 20; i++) {
        let x = random(xMin, xMax);
        let y = random(yMin, yMax);
        
        let en = new enemies.Sprite(x, y);
        
        // ## MODIFIED: Store spawn point and angle, remove velocity ##
        en.spawnX = x;
        en.spawnY = y;
        en.angle = random(360); // Random starting angle
    }

    // ## THIS IS THE FIX ##
    // Game starts paused. This is moved to the END of setup()
    // to ensure it stops kinematic enemies created above.
    world.active = false;

    // ## NEW: Stop all animations at start ##
    allSprites.forEach(s => { 
        if (s.ani) s.ani.stop();
    });
}

// ## NEW: Replaces collectCoin ##
function inspectCoin(player, coin) {
    // Only trigger if the game is running (not already paused or over)
    if (gameState === 'play') {
        gameState = 'paused';
        world.active = false; // Stop physics
        allSprites.forEach(s => { // Stop animations
            if (s.ani) s.ani.stop();
        });

        // Store the specific coin that was touched
        nearestCoin = coin; 
    }
}

// ## NEW: Helper function to stop the game ##
function triggerGameOver() {
    gameState = 'gameOver';
    world.active = false; // Stop physics
    allSprites.forEach(s => { // Stop animations
        if (s.ani) s.ani.stop();
    });
}

// ## NEW: Helper function to win the game ##
function triggerWin() {
    gameState = 'win';
    world.active = false; // Stop physics
    allSprites.forEach(s => { // Stop animations
        if (s.ani) s.ani.stop();
    });
}

// ## MODIFIED: Added Game Over check ##
function hitEnemy(player, enemy) {
    enemy.remove();
    systemStability -= 10;
    if (systemStability < 0) {
        systemStability = 0;
    }
    
    // Check for game over
    if (systemStability <= 0) {
        triggerGameOver();
    }
}

// ## MODIFIED ##
function update() {
    
    // --- 1. Handle Input Based on Game State ---

    // ## NEW: Start Screen Logic ##
    if (gameState === 'start') {
        if (kb.presses('enter')) {
            gameState = 'play';
            world.active = true;
            allSprites.forEach(s => {
                if (s.ani) s.ani.play();
            });
        }
        // ## NEW: Go to Directions ##
        if (kb.presses('d')) {
            gameState = 'directions';
        }
    } 
    // ## NEW: Directions Screen Logic ##
    else if (gameState === 'directions') {
        if (kb.presses('escape')) {
            gameState = 'start';
        }
    }
    // ## MODIFIED: Game Play/Pause Logic ##
    else if (gameState === 'play') {
        // PAUSE with 'c'
        if (kb.presses('c') && showCodeLensButton) {
            gameState = 'paused';
            world.active = false; // Stop physics
            allSprites.forEach(s => {
                if (s.ani) s.ani.stop();
            });
        }
    } 
    else if (gameState === 'paused') {
        // UNPAUSE with '1' (Correct Action)
        if (kb.presses('1')) {
            
            // Apply "correct" action
            if (nearestCoin) {
                let coinX = nearestCoin.x;
                let coinY = nearestCoin.y;
                nearestCoin.remove();
                
                // Replace with grass
                new grass.Sprite(coinX, coinY);
                
                systemStability += 5;
                if (systemStability > 100) systemStability = 100; // Cap at 100
                
                score++; // ## SCORE IS ADDED HERE ##
                
                nearestCoin = null; // Consume the action
                
                // ## NEW WIN CHECK ##
                if (score >= totalNodes) { // ## MODIFIED: Check against totalNodes ##
                    triggerWin();
                } else {
                    // Only resume game if not won
                    gameState = 'play';
                    world.active = true; 
                    allSprites.forEach(s => {
                        if (s.ani) s.ani.play();
                    });
                }
            } else { // If '1' is pressed but no coin was selected (e.g. 'c' pause)
                gameState = 'play';
                world.active = true; 
                allSprites.forEach(s => {
                    if (s.ani) s.ani.play();
                });
            }
        }

        // UNPAUSE with '2' (Incorrect Action)
        if (kb.presses('2')) {
            gameState = 'play';
            world.active = true; // Resume physics
            allSprites.forEach(s => {
                if (s.ani) s.ani.play();
            });
            
            // Apply "incorrect" action
            if (nearestCoin) {
                let coinX = nearestCoin.x;
                let coinY = nearestCoin.y;
                nearestCoin.remove();
                
                // Replace with brick (enemy)
                let en = new enemies.Sprite(coinX, coinY);
                // ## MODIFIED: Set properties for new static enemy ##
                en.spawnX = coinX;
                en.spawnY = coinY;
                en.angle = random(360);
                
                systemStability -= 10;
                if (systemStability < 0) systemStability = 0; // Floor at 0
                
                // Check for game over
                if (systemStability <= 0) {
                    triggerGameOver();
                }

                nearestCoin = null; // Consume the action
            }
        }	
    }
	else if (gameState === 'gameOver' || gameState === 'win') {
        if (kb.presses('p')) {
            location.reload(); // Reload the browser window
        }
    }

    // --- 2. Clear Background (ALWAYS) ---
    background('black'); 

    // --- 3. Run Game Logic *only* if in 'play' state ---
    if (gameState === 'play') {
        
        // --- Stability Timer Logic ---
        stabilityTimer += deltaTime; 
        if (stabilityTimer >= stabilityInterval) {
            if (systemStability > 0) {
                systemStability--;
            }
            stabilityTimer = 0; // Reset timer

            // Check for game over
            if (systemStability <= 0) {
                triggerGameOver();
            }
        }
        // --- End Stability Timer ---

        // ## NEW: Enemy Movement Loop ##
        for (let en of enemies) {
            let radius = 100; // 200px diameter circle
            let speed = ROAM_SPEED / 2;
            
            // Increment angle and update position using sine/cosine
            en.angle += speed;
            en.x = en.spawnX + cos(en.angle) * radius;
            en.y = en.spawnY + sin(en.angle) * radius;
        }

        // PLAYER MOVEMENT / JUMP
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
            if (player.vel.y == 0 && (groundSensor.overlapping(grass) || groundSensor.overlapping(platforms))) {
                player.changeAni('idle');
            }
            player.vel.x = 0;
        }
        
        if (player.vel.y != 0 && !groundSensor.overlapping(grass) && !groundSensor.overlapping(platforms)) {
            player.changeAni('jump');
        }

        // ## MODIFIED: Check distance and store nearest coin ##
        showCodeLensButton = false; 
        
        // Only look for a new "nearest coin"
        // This is for the 'c' key / button prompt
        if (gameState === 'play') { // Only check if playing
            nearestCoin = null; 
            for (let coin of coins) {
                // Calculate distance between player and coin
                let d = dist(player.x, player.y, coin.x, coin.y);
                
                // If any coin is within 50 pixels, set flag and stop checking
                if (d < 50) { 
                    showCodeLensButton = true;
                    nearestCoin = coin; // Store this coin
                    break; 
                }
            }
        }


        // Camera constraint logic
        let cameraViewHalfWidth = (canvas.w / camera.zoom) / 2;
        let cameraViewHalfHeight = (canvas.h / camera.zoom) / 2;

        let mapLeft = 0;
        let mapRight = canvas.w;
        let mapTop = -1600;
        let mapBottom = 1600;

        let minX = mapLeft + cameraViewHalfWidth;
        let maxX = mapRight - cameraViewHalfWidth;
        let minY = mapTop + cameraViewHalfHeight;
        let maxY = mapBottom - cameraViewHalfHeight;

        camera.x = constrain(player.x, minX, maxX);
        camera.y = constrain(player.y, minY, maxY);
        // --- End Camera Logic ---
    
    } // ## END of gameState 'play' block ##


    // --- 4. Draw Sprites (ALWAYS) ---
    // This draws the game world in 'start', 'play', 'paused', 'win', and 'gameOver'
    
    // Manually turn the camera ON (applies zoom and pan)
    camera.on();
    
    // Manually draw all sprites
    allSprites.draw();

    // Manually turn the camera OFF (resets matrix for GUI)
    camera.off();


    // --- 5. Manual GUI Drawing (ALWAYS) ---
    
    // We must reset the matrix for the GUI every frame
    push();
    resetMatrix(); 

    // ## NEW: Draw GUI based on game state ##
    if (gameState === 'start') {
        // Dark overlay
        fill(0, 0, 0, 200);
        noStroke();
        rect(0, 0, canvas.w, canvas.h);
        
        // Text
        fill(255); // White
        textSize(120);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text("Debugging: Inside the Machine", canvas.w / 2, canvas.h / 2 - 100);
        
        fill(200);
        textSize(50);
        text("Press ENTER to Start", canvas.w / 2, canvas.h / 2 + 20);
        
        // ## NEW Directions Text ##
        fill(150);
        textSize(40);
        text("Press 'd' for Directions", canvas.w / 2, canvas.h / 2 + 100);

    } 
    // ## NEW Directions Screen ##
    else if (gameState === 'directions') {
        // Dark overlay
        fill(0, 0, 0, 225);
        noStroke();
        rect(0, 0, canvas.w, canvas.h);
        let padding = 80;
        
        // --- Title ---
        fill(255); // White
        textSize(80);
        textStyle(BOLD);
        textAlign(CENTER, TOP);
        text("SYSTEM BRIEFING // MISSION: DEBUGGING", canvas.w / 2, padding);

        // --- Main Text ---
        fill(200); // Light gray
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

        // --- Controls Section ---
        textY += 150;
        fill(50, 205, 50); // Lime green
        textStyle(BOLD);
        
        text("MOVEMENT:           ← → or A / D", padding, textY);
        textY += 50;
        text("JUMP:               SPACE or ↑", padding, textY);
        textY += 50;
        text("ENTER CODE LENS:    C (or touch the glitch)", padding, textY);
        textY += 50;
        text("MAKE SELECTION:     1 (Correct) or 2 (Incorrect)", padding, textY);
        textY += 70;
        text("GOAL: Fix all 10 Nodes, avoid rogue code, and stabilize the system.", padding, textY);


        // --- Return Text ---
        fill(150);
        textSize(40);
        textStyle(BOLD);
        textAlign(CENTER, TOP);
        text("Press 'esc' to return Home", canvas.w / 2, canvas.h - 100);
    }
    else if (gameState === 'gameOver') {
        // Dark overlay
        fill(0, 0, 0, 200); // Dark, semi-transparent
        noStroke();
        rect(0, 0, canvas.w, canvas.h);
        
        // --- Main Text ---
        fill(255, 0, 0); // Red
        textSize(150);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text("System Failure", canvas.w / 2, canvas.h / 2 - 80); // Moved up

        // --- Stats Text ---
        let percentFixed = (score / totalNodes) * 100;
        fill(200); // Grayish-white
        textSize(50);
        
        text("Nodes Fixed: " + score, canvas.w / 2, canvas.h / 2 + 50);
        text("System " + percentFixed + "% Stabilized", canvas.w / 2, canvas.h / 2 + 110);

		fill(200);
        textSize(40);
        text("Press 'p' to play again", canvas.w / 2, canvas.h / 2 + 300);
        
    }
    // ## NEW WIN SCREEN ##
    else if (gameState === 'win') {
        // Dark overlay
        fill(0, 0, 0, 200); // Dark, semi-transparent
        noStroke();
        rect(0, 0, canvas.w, canvas.h);
        
        // Text
        fill(0, 255, 0); // Green
        textSize(150);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text("System Stabilized", canvas.w / 2, canvas.h / 2);

		fill(200);
        textSize(40);
        text("Press 'p' to play again", canvas.w / 2, canvas.h / 2 + 300);
    }
    else if (gameState === 'play') {
        // Draw the game HUD
        // Score Display (Top-Right)
        fill(250, 250, 250, 200);
        stroke(0);
        strokeWeight(4);
        textAlign(RIGHT, TOP);
        textSize(50); // Set size for score
        text('Nodes Fixed: ' + score, canvas.w - 20, 20);

        // System Stability (Top-Left)
        let barWidth = 400;
        let barHeight = 30;
        let padding = 20;

        fill(250, 250, 250, 200);
        textAlign(LEFT, TOP);
        textSize(50); // Set size for stability text
        text('System Stability: ' + systemStability + '%', padding, padding);

        noStroke();
        fill(50, 50, 50, 200);
        rect(padding, padding + 55, barWidth, barHeight);

        let stabilityColor = lerpColor(color(255, 0, 0, 200), color(0, 255, 0, 200), systemStability / 100);
        fill(stabilityColor);
        rect(padding, padding + 55, barWidth * (systemStability / 100), barHeight);
        
        // Draw the "Code Lens" button
        if (showCodeLensButton) {
            let buttonText = 'Code Lens';
            
            // Set text properties for the button
            textSize(40); // Larger text
            textStyle(BOLD);
            
            // Calculate button size based on text
            let buttonW = textWidth(buttonText) + 60; // Increased padding for larger button
            let buttonH = 80; // Fixed height, made larger
            
            // Position button in bottom-right corner
            let buttonX = canvas.w - buttonW - padding;
            let buttonY = canvas.h - buttonH - padding; 

            // Draw button box
            fill(0, 0, 0, 220); // Black, semi-transparent
            stroke(50, 205, 50, 255); // Lime green border
            strokeWeight(4); // Thicker border
            rect(buttonX, buttonY, buttonW, buttonH, 10); // 10px rounded corners

            // Draw button text
            noStroke();
            fill(50, 205, 50); // Lime green text
            textAlign(CENTER, CENTER);
            text(buttonText, buttonX + buttonW / 2, buttonY + buttonH / 2 + 5); // Adjusted text Y slightly for visual centering
        }
    }
    else if (gameState === 'paused') {
        // --- Draw Pause Overlay ---
        let overlayPadding = 50; // New padding for the overlay
        let overlayX = overlayPadding;
        let overlayY = overlayPadding;
        let overlayW = canvas.w - (overlayPadding * 2);
        let overlayH = canvas.h - (overlayPadding * 2);

        // Dark overlay with lime green border
        fill(0, 0, 0, 128); // 50% transparent black
        stroke(50, 205, 50, 255); // Lime green border
        strokeWeight(4); // Thicker border
        rect(overlayX, overlayY, overlayW, overlayH, 10); // Rounded corners
        
        // Text
        noStroke(); // Ensure text has no stroke
        fill(50, 205, 50); // Lime green to match button
        textSize(120);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text("Code Lens", canvas.w / 2, canvas.h / 2); // Text remains centered on the whole canvas
    }
    
    pop();
}