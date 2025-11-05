// Disable p5play's built-in Google Analytics tagging
window._p5play_gtagged = false;

// -------------------------
// Global game state
// -------------------------
let player, groundSensor, grass, platforms, coins, enemies, lwall, rwall;
let grassImg, coinsImg, charactersImg, brickImg, codeFont;

let score = 0;
let systemStability = 100;

let showCodeLensButton = false;
let stabilityTimer = 0;
const stabilityInterval = 1000;
let nearestCoin = null;
const ROAM_SPEED = 1.5;

let gameState = 'start'; // 'start', 'directions', 'play', 'paused', 'gameOver', 'win'
let currentDifficulty = 'hard'; // 'easy', 'medium', 'hard'

let totalNodes = 0;
let nodesAttempted = 0;

let mapLeft = 0;
let mapRight = 2000;
let mapTop = -1600;
let mapBottom = 1600;

let playerStartX;
let playerStartY;

let damageFlashTimer = 0;

// Directions demo coin animation
let demoCoinFrame = 0;
let demoCoinFrameTimer = 0;
const demoCoinFrameDelay = 80;

// Matrix background + CRT overlay
let matrixBG;
let matrixScrollY = 0;
let crtOverlayG;

// Question file lines + banks
let easyLines = [];
let mediumLines = [];
let hardLines = [];

let questionBanks = { easy: [], medium: [], hard: [] };
let usedQuestionIndices = { easy: [], medium: [], hard: [] };

let currentQuestion = null;
let currentQuestionIndex = -1;
let currentShuffledAnswers = [];
let currentCorrectAnswerNumber = 1; // 1–4

let questionsLoaded = false; // set true once files are fetched+parsed

// -------------------------
// Text wrapping utility
// -------------------------
function drawWrappedText(txt, x, y, maxWidth, lineHeightFactor = 1.3) {
  const lh = textSize() * lineHeightFactor;
  const words = txt.split(' ');
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = line.length ? line + ' ' + words[i] : words[i];

    if (textWidth(testLine) > maxWidth && line.length > 0) {
      text(line, x, y);
      y += lh;
      line = words[i];
    } else {
      line = testLine;
    }
  }

  if (line.length > 0) {
    text(line, x, y);
    y += lh;
  }

  return y;
}

// -------------------------
// Parse question JSON lines
// -------------------------
function parseQuestionLines(lines) {
  const result = [];
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const q = JSON.parse(line);
      if (
        typeof q.prompt === 'string' &&
        typeof q.code === 'string' &&
        Array.isArray(q.choices) &&
        q.choices.length === 4 &&
        typeof q.correctIndex === 'number'
      ) {
        result.push(q);
      }
    } catch (e) {
      console.log('Invalid question JSON line:', line);
    }
  }
  return result;
}

// -------------------------
// Load easy/medium/hard question files via fetch
// -------------------------
async function loadQuestionFiles() {
  try {
    const [easyRes, medRes, hardRes] = await Promise.all([
      fetch('easy.txt'),
      fetch('medium.txt'),
      fetch('hard.txt')
    ]);

    const [easyText, medText, hardText] = await Promise.all([
      easyRes.text(),
      medRes.text(),
      hardRes.text()
    ]);

    easyLines = easyText.split('\n');
    mediumLines = medText.split('\n');
    hardLines = hardText.split('\n');

    questionBanks.easy = parseQuestionLines(easyLines);
    questionBanks.medium = parseQuestionLines(mediumLines);
    questionBanks.hard = parseQuestionLines(hardLines);

    questionsLoaded = true;
    console.log('Questions loaded:', {
      easy: questionBanks.easy.length,
      medium: questionBanks.medium.length,
      hard: questionBanks.hard.length
    });
  } catch (err) {
    console.error('Failed to load question files:', err);
    questionsLoaded = false;
  }
}

// -------------------------
// Question selection + tracking
// -------------------------
function prepareQuestionForCurrentDifficulty() {
  if (!questionsLoaded) return;

  const bank = questionBanks[currentDifficulty];
  if (!bank || bank.length === 0) return;

  const used = usedQuestionIndices[currentDifficulty] || [];
  const available = [];
  for (let i = 0; i < bank.length; i++) {
    if (!used.includes(i)) available.push(i);
  }

  let index;
  if (available.length > 0) {
    // random(array) returns a random element from the array
    index = random(available); // unused question index
  } else {
    // all used, allow reuse
    index = floor(random(bank.length));
  }

  currentQuestionIndex = index;
  currentQuestion = bank[index];

  // Shuffle positions of the 4 choices
  const idxs = [0, 1, 2, 3];
  const shuffled = shuffle(idxs);

  // Build shuffled answer texts
  currentShuffledAnswers = shuffled.map(i => currentQuestion.choices[i]);

  // Compute which key (1–4) is correct after shuffle
  const safeCorrectIndex = constrain(
    currentQuestion.correctIndex,
    0,
    currentQuestion.choices.length - 1
  );
  const posInShuffled = shuffled.indexOf(safeCorrectIndex);
  currentCorrectAnswerNumber = posInShuffled + 1; // map 0–3 -> 1–4
}

function markCurrentQuestionUsed() {
  if (currentQuestionIndex < 0) return;
  const used = usedQuestionIndices[currentDifficulty];
  if (!used.includes(currentQuestionIndex)) {
    used.push(currentQuestionIndex);
  }
}

// -------------------------
// Tilemaps per difficulty
// -------------------------
const tilemapEasy = [
  'lggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'l                                                            r',
  'l     c                                                      r',
  'l                                                            r',
  'l                                                            r',
  'l                                       c                    r',
  'l        ppp                                                 r',
  'l                                                            r',
  'l                                                            r',
  'l              p                ppppp                        r',
  'l                                                            r',
  'l                 e                                          r',
  'l                ppp                                   c     r',
  'l                      c              c                      r',
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];

const tilemapMedium = [
  'lggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'l             c                                              r',
  'l                                                            r',
  'l                                                            r',
  'l                   ppp                                      r',
  'l                                               c            r',
  'l                                       e                    r',
  'l           ppp                        ppp                   r',
  'l          c                                                 r',
  'l                                                            r',
  'l                         ppp                                r',
  'l                                    c                       r',
  'l      e                                                     r',
  'l     ppp                                             c      r',
  'l                              ppp                           r',
  'l                           c                                r',
  'l                    e                      c                r',
  'l          c        ppp                                      r',
  'l                                                            r',
  'l                                                            r',
  'l              pppc                                          r',
  'l                                    c                       r',
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];

const tilemapHard = [
  'lggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'l                                                            r',
  'l                                                            r',
  'l                                                           cr',
  'l                                                            r',
  'l                     e                e          e          r',
  'l                                                    p       r',
  'l                             pe           e        p e      r',
  'lppppppp          p                            p             r',
  'l                       ppp         pp                       r',
  'l            e                                c              r',
  'l           ppp                                              r',
  'l                                                 p          r',
  'l                                                            r',
  'l                                       ppppp                r',
  'l         c                                                  r',
  'l                                c                           r',
  'l                                                            r',
  'l ppp                     e                                  r',
  'l                        ppppp                               r',
  'l                                                            r',
  'l                     c                                      r',
  'l               c                                            r',
  'l     ppp                                                    r',
  'l                                                            r',
  'l    e                                                       r',
  'l   ppp                                                      r',
  'l            c                                               r',
  'l                                                            r',
  'l                      e                                     r',
  'l                  c pppp                                    r',
  'l                                                            r',
  'l         ppp                                                r',
  'l        c                                                   r',
  'l                              c                             r',
  'l                                       e           c        r',
  'l  e                                  pppppppp               r',
  'l ppp             e                                       c  r',
  'l                ppp                                      e  r',
  'l                                                            r',
  'l                                                            r',
  'l                                                     p      r',
  'l   pppc                                                     r',
  'l                      ppp                                   r',
  'l                                                    e     c r',
  'l            ce                                              r',
  'l                                                            r',
  'l                                                       pp   r',
  'l                                                            r',
  'l      ppp                                                   r',
  'l                                                   ppp      r',
  'l                                                            r',
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];

function getTilemapForDifficulty(diff) {
  if (diff === 'easy') return tilemapEasy;
  if (diff === 'medium') return tilemapMedium;
  return tilemapHard;
}

// -------------------------
// Q5 + world bootstrapping
// -------------------------
new Q5();
world.autoStep = true;
world.debug = false;

new Canvas(2000, 1600);
displayMode('maxed', 'pixelated');

// Load images/fonts (q5-style, no preload)
grassImg = loadImage('assets/grass.png');
coinsImg = loadImage('assets/coin.png');
charactersImg = loadImage('assets/characters.png');
brickImg = loadImage('assets/brick.png');
codeFont = loadFont('assets/SourceCodePro-Regular.ttf');

// -------------------------
// Build level from tilemap
// -------------------------
function buildWorldFromTilemap(tilemap) {
  const tileSize = 16;

  if (grass) grass.removeAll();
  if (platforms) platforms.removeAll();
  if (lwall) lwall.removeAll();
  if (rwall) rwall.removeAll();
  if (coins) coins.removeAll();
  if (enemies) enemies.removeAll();

  const tilemapHeight = tilemap.length * tileSize;

  mapLeft = 0;
  mapRight = tilemap[0].length * tileSize;
  mapBottom = 1600;
  mapTop = mapBottom - tilemapHeight;

  new Tiles(tilemap, mapLeft, mapTop, tileSize, tileSize);

  totalNodes = coins.length;

  for (let en of enemies) {
    en.spawnX = en.x;
    en.spawnY = en.y;
    en.angle = random(360);
  }

  playerStartX = mapLeft + (mapRight - mapLeft) / 2;
  playerStartY = mapBottom - 100;

  if (player) {
    player.x = playerStartX;
    player.y = playerStartY;
    player.vel.x = 0;
    player.vel.y = 0;
  }
  if (groundSensor) {
    groundSensor.x = playerStartX;
    groundSensor.y = playerStartY + 6;
    groundSensor.vel.x = 0;
    groundSensor.vel.y = 0;
  }
}

// -------------------------
// Change difficulty
// -------------------------
function setDifficulty(diff) {
  currentDifficulty = diff;

  score = 0;
  systemStability = 100;
  nodesAttempted = 0;
  stabilityTimer = 0;
  damageFlashTimer = 0;
  showCodeLensButton = false;
  nearestCoin = null;

  usedQuestionIndices[diff] = [];
  currentQuestion = null;
  currentQuestionIndex = -1;
  currentShuffledAnswers = [];
  currentCorrectAnswerNumber = 1;

  world.active = false;
  gameState = 'start';

  allSprites.forEach(s => {
    if (s.ani) s.ani.stop();
  });

  buildWorldFromTilemap(getTilemapForDifficulty(diff));
}

// -------------------------
// Matrix background
// -------------------------
function initMatrixBackground() {
  matrixBG = createGraphics(canvas.w * 2, canvas.h * 2);
  matrixBG.background(0);
  matrixBG.noStroke();
  matrixBG.textFont('monospace');
  matrixBG.textSize(12);

  for (let x = 0; x < matrixBG.width; x += 24) {
    for (let y = 0; y < matrixBG.height; y += 24) {
      if (random() < 0.3) {
        matrixBG.fill(0, random(160, 255), 0, random(80, 180));
        const ch = String.fromCharCode(int(random(33, 127)));
        matrixBG.text(ch, x, y);
      }
    }
  }
}

function drawMatrixBackground() {
  if (!matrixBG) return;

  matrixScrollY = (matrixScrollY + 0.5) % matrixBG.height;

  push();
  resetMatrix();
  imageMode(CORNER);

  const parallaxFactor = 0.2;
  const pxBase = -camera.x * parallaxFactor + canvas.w / 2;
  const pyBase = -camera.y * parallaxFactor + canvas.h / 2 + matrixScrollY;

  for (let ox = -matrixBG.width; ox <= matrixBG.width; ox += matrixBG.width) {
    for (let oy = -matrixBG.height; oy <= matrixBG.height; oy += matrixBG.height) {
      image(matrixBG, pxBase + ox, pyBase + oy);
    }
  }

  pop();
}

// -------------------------
// CRT overlay
// -------------------------

function initCRTOverlay() {
  crtOverlayG = createGraphics(canvas.w, canvas.h);
  crtOverlayG.clear();
  crtOverlayG.noStroke();

  // Soft scanlines
  for (let y = 0; y < crtOverlayG.height; y += 2) {
    crtOverlayG.fill(0, 0, 0, 10); // less alpha than before
    crtOverlayG.rect(0, y, crtOverlayG.width, 1);
  }

  // Very subtle green tint over everything
  crtOverlayG.fill(0, 255, 0, 10);
  crtOverlayG.rect(0, 0, crtOverlayG.width, crtOverlayG.height);
}

// call this at the VERY END of update(), after all drawing
function drawCRTOverlay() {
  if (!crtOverlayG) return;

  // Base scanlines + tint
  imageMode(CORNER);
  image(crtOverlayG, 0, 0, canvas.w, canvas.h);

  // Animated static (light, flickery)
  push();
  resetMatrix();
  noStroke();

  // a few random noise specks each frame
  for (let i = 0; i < 80; i++) {
    let x = random(canvas.w);
    let y = random(canvas.h);
    let w = random(1, 3);
    let h = random(1, 3);
    fill(255, random(200, 255), 255, random(20, 60)); // green-ish specks
    rect(x, y, w, h);
  }

  pop();
}


// -------------------------
// Setup
// -------------------------
function setup() {
  world.gravity.y = 10;

  allSprites.pixelPerfect = true;
  allSprites.autoDraw = false;

  if (codeFont) textFont(codeFont);
  else textFont('Courier New');

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

  lwall = new Group();
  lwall.physics = 'static';
  lwall.layer = 0;
  lwall.img = grassImg;
  lwall.rotation = 90;
  lwall.tile = 'l';

  rwall = new Group();
  rwall.physics = 'static';
  rwall.layer = 0;
  rwall.img = grassImg;
  rwall.rotation = 90;
  rwall.tile = 'r';

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
  enemies.layer = 1;
  enemies.tile = 'e';

  buildWorldFromTilemap(getTilemapForDifficulty(currentDifficulty));

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

  groundSensor = new Sprite(playerStartX, playerStartY + 6, 6, 12, 'n');
  groundSensor.visible = false;
  groundSensor.mass = 0.01;
  const joint = new GlueJoint(player, groundSensor);
  joint.visible = false;

  player.overlaps(coins, touchCoinDamage);
  player.overlaps(enemies, hitEnemy);

  camera.x = player.x;
  camera.y = player.y;
  camera.zoom = 5;

  initMatrixBackground();
  initCRTOverlay();

  world.active = false;
  allSprites.forEach(s => {
    if (s.ani) s.ani.stop();
  });

  textSize(50);
  textStyle(BOLD);

  // Kick off async question loading
  loadQuestionFiles();
}

// -------------------------
// Collisions
// -------------------------
function touchCoinDamage(player, coin) {
  if (gameState !== 'play') return;

  systemStability -= 10;
  if (systemStability < 0) systemStability = 0;
  damageFlashTimer = 300;

  if (systemStability <= 0) {
    triggerGameOver();
    return;
  }

  player.x = playerStartX;
  player.y = playerStartY;
  player.vel.x = 0;
  player.vel.y = 0;

  groundSensor.x = playerStartX;
  groundSensor.y = playerStartY + 6;
  groundSensor.vel.x = 0;
  groundSensor.vel.y = 0;
}

function hitEnemy(player, enemy) {
  enemy.remove();
  systemStability -= 10;
  if (systemStability < 0) systemStability = 0;

  damageFlashTimer = 300;

  if (systemStability <= 0) {
    triggerGameOver();
  }
}

// -------------------------
// End states
// -------------------------
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

// -------------------------
// Main loop
// -------------------------
function update() {
  // --- State-based input ---
  if (gameState === 'start') {
    if (kb.presses('1')) setDifficulty('easy');
    if (kb.presses('2')) setDifficulty('medium');
    if (kb.presses('3')) setDifficulty('hard');

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
  } else if (gameState === 'directions') {
    if (kb.presses('escape')) {
      gameState = 'start';
    }
    demoCoinFrameTimer += deltaTime;
    if (demoCoinFrameTimer >= demoCoinFrameDelay) {
      demoCoinFrame = (demoCoinFrame + 1) % 14;
      demoCoinFrameTimer = 0;
    }
  } else if (gameState === 'play') {
    if (
      kb.presses('c') &&
      showCodeLensButton &&
      nearestCoin &&
      questionsLoaded &&
      questionBanks[currentDifficulty].length > 0
    ) {
      prepareQuestionForCurrentDifficulty();
      if (currentQuestion) {
        gameState = 'paused';
        world.active = false;
        allSprites.forEach(s => {
          if (s.ani) s.ani.stop();
        });
      }
    }
  } else if (gameState === 'paused') {
    let choice = null;
    if (kb.presses('1')) choice = 1;
    else if (kb.presses('2')) choice = 2;
    else if (kb.presses('3')) choice = 3;
    else if (kb.presses('4')) choice = 4;

    if (choice !== null) {
      if (nearestCoin && currentQuestion) {
        nodesAttempted++;

        if (choice === currentCorrectAnswerNumber) {
          const coinX = nearestCoin.x;
          const coinY = nearestCoin.y;
          nearestCoin.remove();
          new grass.Sprite(coinX, coinY);

          systemStability += 5;
          if (systemStability > 100) systemStability = 100;

          score++;
          markCurrentQuestionUsed();
          nearestCoin = null;

          // clear current question state
          currentQuestion = null;
          currentQuestionIndex = -1;
          currentShuffledAnswers = [];
          currentCorrectAnswerNumber = 1;

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
          systemStability -= 10;
          if (systemStability < 0) systemStability = 0;
          damageFlashTimer = 300;

          // clear question so next Code Lens gets a fresh one
          currentQuestion = null;
          currentQuestionIndex = -1;
          currentShuffledAnswers = [];
          currentCorrectAnswerNumber = 1;

          if (systemStability <= 0) {
            triggerGameOver();
            nearestCoin = null;
            return;
          }

          nearestCoin = null;
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
  } else if (gameState === 'gameOver' || gameState === 'win') {
    if (kb.presses('p')) {
      location.reload();
    }
  }

  // --- Background ---
  background('black');
  drawMatrixBackground();

  // --- Game logic (play) ---
  if (gameState === 'play') {
    stabilityTimer += deltaTime;
    if (stabilityTimer >= stabilityInterval) {
      if (systemStability > 0) systemStability--;
      stabilityTimer = 0;
      if (systemStability <= 0) {
        triggerGameOver();
      }
    }

    for (let en of enemies) {
      const radius = 100;
      const speed = ROAM_SPEED / 2;
      en.angle += speed;
      en.x = en.spawnX + cos(en.angle) * radius;
      en.y = en.spawnY + sin(en.angle) * radius;
    }

    if (groundSensor.overlapping(grass) || groundSensor.overlapping(platforms)) {
      if (kb.presses('up') || kb.presses('space')) {
        player.changeAni('jump');
        player.vel.y = -5.5;
      }
    }

    if (kb.pressing('left') || kb.pressing('a')) {
      player.changeAni('run');
      player.vel.x = -1.5;
      player.scale.x = -1;
    } else if (kb.pressing('right') || kb.pressing('d')) {
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

    showCodeLensButton = false;
    nearestCoin = null;
    for (let coin of coins) {
      const d = dist(player.x, player.y, coin.x, coin.y);
      if (d < 50) {
        showCodeLensButton = true;
        nearestCoin = coin;
        break;
      }
    }

    const cameraViewHalfWidth = (canvas.w / camera.zoom) / 2;
    const cameraViewHalfHeight = (canvas.h / camera.zoom) / 2;

    let minX = mapLeft + cameraViewHalfWidth;
    let maxX = mapRight - cameraViewHalfWidth;
    let minY = mapTop + cameraViewHalfHeight;
    let maxY = mapBottom - cameraViewHalfHeight;

    if (maxX < minX) {
      const midX = (mapLeft + mapRight) / 2;
      minX = maxX = midX;
    }
    if (maxY < minY) {
      const midY = (mapTop + mapBottom) / 2;
      minY = maxY = midY;
    }

    camera.x = constrain(player.x, minX, maxX);
    camera.y = constrain(player.y, minY, maxY);
  }

  // --- Draw world + CRT ---
  camera.on();
  allSprites.draw();
  camera.off();

  drawCRTOverlay();

  // --- UI and screens ---
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
    text("Debugging: Inside the Machine", canvas.w / 2, canvas.h / 2 - 140);

    fill(200);
    textSize(50);
    text("Press ENTER to Start", canvas.w / 2, canvas.h / 2 + 10);

    fill(150);
    textSize(40);
    text("Press 'd' for Directions", canvas.w / 2, canvas.h / 2 + 80);

    fill(50, 205, 50);
    textSize(36);
    text(
      "Difficulty: " + currentDifficulty.toUpperCase() + "  (1=Easy, 2=Medium, 3=Hard)",
      canvas.w / 2,
      canvas.h / 2 + 150
    );
  } else if (gameState === 'directions') {
    fill(0, 0, 0, 225);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);

    const padding = 80;
    const boxWidth = canvas.w - padding * 2;

    fill(255);
    textSize(80);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text("SYSTEM BRIEFING // MISSION: DEBUGGING", canvas.w / 2, padding);

    fill(200);
    textSize(36);
    textStyle(NORMAL);
    textAlign(LEFT, TOP);
    let y = padding + 120;

    y = drawWrappedText("Welcome, Debugger.", padding, y, boxWidth);
    y += 30;
    y = drawWrappedText(
      "You’ve been uploaded inside the machine — a living, breathing network of corrupted data.",
      padding, y, boxWidth
    );
    y += 30;
    y = drawWrappedText(
      "Your mission: stabilize the system before it collapses. Every node you repair restores fragments of stability.",
      padding, y, boxWidth
    );
    y += 30;
    y = drawWrappedText(
      "Watch for the Code Lens — it will appear near glitches when you are close enough to investigate.",
      padding, y, boxWidth
    );
    y += 30;
    y = drawWrappedText(
      "Repair the glitch in Code Lens before touching it in the world, or you’ll be snapped back to the beginning and lose stability.",
      padding, y, boxWidth
    );
    y += 30;
    y = drawWrappedText(
      "But beware: rogue viruses are looping endlessly, spreading chaos in the circuits. Collide with one and you’ll corrupt your own memory buffer and drain stability.",
      padding, y, boxWidth
    );
    y += 40;

    const centerX = canvas.w / 2;
    const iconY = y + 60;
    const iconSpacing = 260;
    const iconSize = 80;

    imageMode(CENTER);

    const glitchX = centerX - iconSpacing / 2;
    const sx = demoCoinFrame * 16;
    const sy = 0;
    const sw = 16;
    const sh = 16;
    noStroke();
    image(coinsImg, glitchX - 140, iconY + 40, iconSize, iconSize, sx, sy, sw, sh);

    fill(50, 205, 50);
    textSize(40);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    drawWrappedText("GLITCH", glitchX - 290, iconY + iconSize / 2 + 10, 140);

    const virusX = centerX + iconSpacing / 2;
    image(brickImg, virusX + 250, iconY + 40, iconSize, iconSize);

    fill(255, 80, 80);
    textSize(40);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    drawWrappedText("VIRUS", virusX + 110, iconY + iconSize / 2 + 10, 140);

    y = iconY + iconSize / 2 + 150;

    fill(50, 205, 50);
    textSize(36);
    textStyle(BOLD);
    textAlign(LEFT, TOP);

    y = drawWrappedText("MOVEMENT:           ← → or A / D", padding, y, boxWidth);
    y = drawWrappedText("JUMP:               SPACE or ↑", padding, y, boxWidth);
    y = drawWrappedText(
      "ENTER CODE LENS:    C (when \"Code Lens\" appears in the bottom-right)",
      padding, y, boxWidth
    );
    y = drawWrappedText(
      "MAKE SELECTION:     1, 2, 3, or 4",
      padding, y, boxWidth
    );
    y += 30;
    textSize(34);
    y = drawWrappedText(
      "GOAL: Fix all " + totalNodes + " Nodes, avoid rogue code and glitches, and stabilize the system.",
      padding,
      y,
      boxWidth
    );

    fill(150);
    textSize(40);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text("Press 'esc' to return Home", canvas.w / 2, canvas.h - 100);
  } else if (gameState === 'gameOver' || gameState === 'win') {
    const isWin = (gameState === 'win');

    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);

    const headingColor = isWin ? color(0, 255, 0) : color(255, 0, 0);
    const headingText = isWin ? "System Stabilized" : "System Failure";

    const percentFixed = totalNodes > 0 ? (score / totalNodes) * 100 : 0;
    const accuracy = nodesAttempted > 0 ? (score / nodesAttempted) * 100 : 0;

    let rank;
    if (accuracy >= 90) rank = "S-Rank: Kernel Guardian";
    else if (accuracy >= 70) rank = "A-Rank: Core Debugger";
    else if (accuracy >= 40) rank = "B-Rank: Stack Tracer";
    else rank = "C-Rank: Glitch Magnet";

    fill(headingColor);
    textSize(150);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(headingText, canvas.w / 2, canvas.h / 2 - 200);

    fill(230);
    textSize(42);
    textStyle(NORMAL);

    let lineY = canvas.h / 2 - 40;
    text("Difficulty: " + currentDifficulty.toUpperCase(), canvas.w / 2, lineY);
    lineY += 50;
    text("Nodes Fixed: " + score + " / " + totalNodes, canvas.w / 2, lineY);
    lineY += 50;
    text("Nodes Attempted (Code Lens): " + nodesAttempted, canvas.w / 2, lineY);
    lineY += 50;
    text("Accuracy: " + accuracy.toFixed(1) + "%", canvas.w / 2, lineY);
    lineY += 50;
    text("System Stabilized: " + percentFixed.toFixed(1) + "%", canvas.w / 2, lineY);
    lineY += 70;

    fill(50, 205, 50);
    textSize(46);
    textStyle(BOLD);
    text(rank, canvas.w / 2, lineY);

    fill(200);
    textSize(40);
    text("Press 'p' to play again", canvas.w / 2, canvas.h / 2 + 300);
  } else if (gameState === 'play') {
    fill(250, 250, 250, 200);
    stroke(0);
    strokeWeight(4);
    textAlign(RIGHT, TOP);
    textSize(50);
    text('Nodes Fixed: ' + score + ' / ' + totalNodes, canvas.w - 20, 20);

    const barWidth = 400;
    const barHeight = 30;
    const padding = 20;

    fill(250, 250, 250, 200);
    textAlign(LEFT, TOP);
    textSize(40);
    text('System Stability: ' + systemStability + '%', padding, padding);

    noStroke();
    fill(50, 50, 50, 200);
    rect(padding, padding + 55, barWidth, barHeight);

    const stabilityColor = lerpColor(
      color(255, 0, 0, 200),
      color(0, 255, 0, 200),
      systemStability / 100
    );
    fill(stabilityColor);
    rect(padding, padding + 55, barWidth * (systemStability / 100), barHeight);

    if (showCodeLensButton) {
      const buttonText = 'Code Lens';
      textSize(60);
      textStyle(BOLD);

      const buttonW = textWidth(buttonText) + 60;
      const buttonH = 220;
      const paddingBtn = 20;
      const buttonX = canvas.w - buttonW - paddingBtn;
      const buttonY = canvas.h - buttonH - paddingBtn;

      fill(0, 0, 0, 120);
      stroke(50, 205, 50, 255);
      strokeWeight(4);
      rect(buttonX, buttonY, buttonW, buttonH, 10);

      noStroke();
      fill(50, 205, 50);
      textAlign(CENTER, CENTER);
      text(buttonText, buttonX + buttonW / 2, buttonY + buttonH / 2 - 40);
      textSize(40);
      textStyle(ITALIC);
      text("press 'c'", buttonX + buttonW / 2, buttonY + buttonH / 2 + 50);
      textStyle(NORMAL);
    }
  } else if (gameState === 'paused') {
    const overlayPadding = 50;
    const overlayX = overlayPadding;
    const overlayY = overlayPadding;
    const overlayW = canvas.w - overlayPadding * 2;
    const overlayH = canvas.h - overlayPadding * 2;

    fill(0, 0, 0, 200);
    stroke(50, 205, 50, 255);
    strokeWeight(4);
    rect(overlayX, overlayY, overlayW, overlayH, 10);

    noStroke();
    fill(50, 205, 50);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    textSize(80);
    text("Code Lens", canvas.w / 2, overlayY + 30);

    if (currentQuestion) {
      const qX = overlayX + 60;
      const qY = overlayY + 240;
      const textBoxWidth = overlayW - 120;

      textAlign(LEFT, TOP);

      // -------------------------
      // QUESTION AT THE TOP
      // -------------------------
      textSize(60);
      fill(0, 255, 0); // question text color

      // Do NOT mutate the stored prompt; use a cleaned local copy
      const promptText = currentQuestion.prompt.replace(/^.*?:\s*/, '');

      let promptBottomY = drawWrappedText(
        promptText,
        qX,
        qY,
        textBoxWidth,
        1.4
      );

      // -------------------------
      // TWO COLUMNS UNDER PROMPT
      // left: code    right: choices
      // -------------------------
      const gutter = 40; // space between columns
      const columnTopY = promptBottomY + 40;
      const columnWidth = (textBoxWidth - gutter) / 2;

      const codeX = qX;                       // left column
      const choicesX = qX + columnWidth + gutter; // right column

      // -------------------------
      // CODE BLOCK (LEFT COLUMN)
      // -------------------------
      textSize(32);
      fill(200, 255, 200); // code text color

      const codeLines = currentQuestion.code.split('\n');
      let codeY = columnTopY;
      let indentLevel = 0;
      const indentSize = 40; // pixels per indent
      const baseX = codeX + 40;

      for (let i = 0; i < codeLines.length; i++) {
        let line = codeLines[i].trim(); // remove leading/trailing spaces

        if (line.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        const x = baseX + indentLevel * indentSize;

        codeY = drawWrappedText(line, x, codeY, columnWidth, 1.5);

        if (line.endsWith('{')) {
          indentLevel++;
        }

        codeY += 8;
      }

      const codeBottomY = codeY;

      // -------------------------
      // ANSWER CHOICES (RIGHT COLUMN)
      // -------------------------
      textSize(40);
      fill(255); // answer text color

      const labels = ['1', '2', '3', '4'];
      let choicesY = columnTopY;

      const answersToShow =
        currentShuffledAnswers && currentShuffledAnswers.length === 4
          ? currentShuffledAnswers
          : currentQuestion.choices;

      for (let i = 0; i < answersToShow.length; i++) {
        const label = labels[i] || (i + 1) + '.';
        const optionText = label + '. ' + answersToShow[i];

        choicesY = drawWrappedText(optionText, choicesX, choicesY, columnWidth, 1.4);
        choicesY += 50; // spacing between choices
      }

      const choicesBottomY = choicesY;

      const contentBottomY = Math.max(codeBottomY, choicesBottomY);

      // -------------------------
      // HINT SECTION (bottom area)
      // -------------------------
      fill(200);
      textSize(30);
      const hintY = overlayY + overlayH - 80;

      drawWrappedText(
        "Press 1, 2, 3, or 4 to choose your fix.",
        qX,
        hintY,
        textBoxWidth,
        1.2
      );

    } else {
      // If questions not ready but somehow paused
      fill(200);
      textSize(32);
      textAlign(CENTER, CENTER);
      text("Questions not loaded yet.", canvas.w / 2, canvas.h / 2);
    }
  }

  if (damageFlashTimer > 0) {
    damageFlashTimer -= deltaTime;
    if (damageFlashTimer < 0) damageFlashTimer = 0;
    noStroke();
    fill(255, 0, 0, 150);
    rect(0, 0, canvas.w, canvas.h);
  }

  pop();
  drawCRTOverlay();
}
