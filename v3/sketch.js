// Disable p5play's built-in Google Analytics tagging
window._p5play_gtagged = false;

let bestRank = "Play to earn a rank";
let DEBUG_MODE = false;
const QUESTION_NUMBERS = false;
let showPseudoSummary = false;
let totalQuestionsAnsweredCorrect = 0;
let bgMusic, keySound, loseSound, hitSound;
let correctSound, winSound, wrongSound, splatSound, selectSound; 
let correctSoundPlaying = false;
let wrongSoundPlaying = false;
// -------------------------
// Global game state
// -------------------------
let player, groundSensor, grass, platforms, coins, enemies, lwall, rwall;
let grassImg, coinsImg, charactersImg, brickImg, codeFont, bgImg;
let key, door, keyImg, doorImg;
let loc = "HOME", foundKey = false; // for diections
let failMsg = "Stability has reached 0%";
const levelComplete  = [false,false,false];

let score = 0;
let systemStability = 100;

let showCodeLensButton = false;
let stabilityTimer = 0;
const stabilityInterval = 1000;
let nearestCoin = null;
let ROAM_SPEED = 1.5;

let gameState = 'start'; // 'start', 'directions', 'play', 'paused', 'gameOver', 'win'
let currentDifficulty = 'easy'; // 'easy', 'medium', 'hard'

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

// Directions demo virus animation
let demoEnemyFrame = 0;
let demoEnemyFrameTimer = 0;
const demoEnemyFrameDelay = 160;

// Directions demo key animation
let demoKeyFrame = 0;
let demoKeyFrameTimer = 0;
const demoKeyFrameDelay = 240; // flash speed

// Directions demo door animation
let demoDoorFrame = 0;
let demoDoorFrameTimer = 0;
const demoDoorFrameDelay = 160;


// Matrix background + CRT overlay
let matrixBG;
let matrixScrollY = 0;
let crtOverlayG;

// Question file lines + banks
let easyLines = [];
let mediumLines = [];
let hardLines = [];
let secretLines = [];
let secret2Lines = [];

let questionBanks = { easy: [], medium: [], hard: [], kpop: [], minecraft: [] };
let usedQuestionIndices = { easy: [], medium: [], hard: [], kpop: [], minecraft: [] };

let currentQuestion = null;
let currentQuestionIndex = -1;
let currentShuffledAnswers = [];
let currentCorrectAnswerNumber = 1; // 1–4

let questionsLoaded = false; // set true once files are fetched+parsed

// Code Lens answer/review state
let codeLensAnswered = false;        // has the player already chosen an answer?
let codeLensWasCorrect = false;      // was their choice correct?
let codeLensPlayerChoice = null;     // 1–4: which option they chose
let pendingStateAfterCodeLens = null; // 'play', 'win', or 'gameOver'

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
  let e = 'easy.txt', m = 'medium.txt', h = 'hard.txt';
  if(DEBUG_MODE) e = m = h = 'debug.txt';

  try {
    const [easyRes, medRes, hardRes, secretRes, secret2Res] = await Promise.all([
      fetch(e),
      fetch(m),
      fetch(h),
      fetch('secret.txt'),
      fetch('secret2.txt')
    ]);

    const [easyText, medText, hardText, secretText, secret2Text] = await Promise.all([
      easyRes.text(),
      medRes.text(),
      hardRes.text(),
      secretRes.text(),
      secret2Res.text()
    ]);

    easyLines = easyText.split('\n');
    mediumLines = medText.split('\n');
    hardLines = hardText.split('\n');
    secretLines = secretText.split('\n');
    secret2Lines = secret2Text.split('\n');

    questionBanks.easy = parseQuestionLines(easyLines);
    questionBanks.medium = parseQuestionLines(mediumLines);
    questionBanks.hard = parseQuestionLines(hardLines);
    questionBanks.kpop = parseQuestionLines(secretLines);
    questionBanks.minecraft = parseQuestionLines(secret2Lines);

    questionsLoaded = true;
    console.log('Questions loaded:', {
      easy: questionBanks.easy.length,
      medium: questionBanks.medium.length,
      hard: questionBanks.hard.length,
      kpop: questionBanks.kpop.length,
      minecraft: questionBanks.minecraft.length
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
    index = random(available);
  } else {
    index = floor(random(bank.length));
  }

  currentQuestionIndex = index;
  currentQuestion = bank[index];

  // Shuffle positions of the 4 choices
  const idxs = [0, 1, 2, 3];
  const shuffled = shuffle(idxs);

  currentShuffledAnswers = shuffled.map(i => currentQuestion.choices[i]);

  const safeCorrectIndex = constrain(
    currentQuestion.correctIndex,
    0,
    currentQuestion.choices.length - 1
  );
  const posInShuffled = shuffled.indexOf(safeCorrectIndex);
  currentCorrectAnswerNumber = posInShuffled + 1; // 0–3 -> 1–4
}

function markCurrentQuestionUsed() {
  questionBanks[currentDifficulty].splice(currentQuestionIndex,1);
  // if (currentQuestionIndex < 0) return;
  // const used = usedQuestionIndices[currentDifficulty];
  // if (!used.includes(currentQuestionIndex)) {
  //   used.push(currentQuestionIndex);
  // }
}

// -------------------------
// Tilemaps per difficulty
// -------------------------
const tilemapEasy = [
  'ggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'l                                                             r',
  'l                                                             r',
  'l                                                             r',
  'l                                                           d r',
  'l                                                          pppr',
  'l                                                             r',
  'l                                                             r',
  'l k                                 e                 c       r',
  'lpp                                                           r',
  'l      c                                         ppp          r',
  'l        e                                  e                 r',
  'l        ppp                                c                 r',
  'l                                                             r',
  'l                                      ppp                    r',
  'l             ec               ppppc             e            r',
  'l                                                             r',
  'l                                                             r',
  'l                ppp                                          r',
  'l                                                             r',
  'ggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];

const tilemapMedium = [
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'l                                                            r',
  'l                                                            r',
  'l                     k                                     cr',
  'l                   eppp                                     r',
  'l                                               ce           r',
  'l                                       e                    r',
  'l          eppp           c            ppp                   r',
  'l          c                                                 r',
  'l                                                            r',
  'l                       e ppp e                            d r',
  'l                                    c                    pppr',
  'l      e                                                     r',
  'l     ppp                                             c      r',
  'l                              ppp          e                r',
  'l                           c                                r',
  'l                    e                           pe          r',
  'l          c        ppp                                      r',
  'l                                          c                 r',
  'l                                                            r',
  'l              pcp                                           r',
  'l                                                            r',
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];

const tilemapHard = [
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'l                                                            r',
  'l                                                            r',
  'l                                                            r',
  'l                                                           kr',
  'l                     e                e          e        ppr',
  'l                                                            r',
  'l                             pe           e        ppe      r',
  'lppcppp           p                                          r',
  'l                       ppp         pp                       r',
  'l            e                                c              r',
  'l           ppp                                              r',
  'l                                                 p          r',
  'l                                                            r',
  'l                                       ppppp                r',
  'l         c                                                  r',
  'l                                cpp                         r',
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
  'l                  cpppp                                     r',
  'l                                                            r',
  'l         ppp                                                r',
  'l        c                                                   r',
  'l                                c                           r',
  'l                                       e d         c        r',
  'l  e                                  ppppppppp              r',
  'l ppp             e                                       c  r',
  'l                ppp                                      e  r',
  'l                                                            r',
  'l                                                            r',
  'l                                                     p      r',
  'l   pppc                                                     r',
  'l                      ppp                                   r',
  'l                                                    e     c r',
  'l           cpe                                              r',
  'l                                                            r',
  'l                                                       pp   r',
  'l                                                            r',
  'l      ppp                                                   r',
  'l                                                   ppp      r',
  'l                                                            r',
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];

function getTilemapForDifficulty(diff) {
  if(diff === 'kpop' || diff === 'minecraft') return tilemapEasy;
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

new Canvas(2000, 1125);
displayMode('maxed', 'pixelated');

// Load images/fonts (q5-style, no preload)
grassImg = loadImage('assets/grass.png');
coinsImg = loadImage('assets/coin.png');
// charactersImg = loadImage('assets/characters.png');
pinkMonsterImg = loadImage('assets/pink-monster.png')
brickImg = loadImage('assets/brick.png');
keyImg = loadImage('assets/key.png');
doorImg = loadImage('assets/door.png');
codeFont = loadFont('assets/SourceCodePro-Regular.ttf');
bgImg = loadImage('assets/background.png');

//sound
soundFormats('mp3', 'ogg'); // optional, ensures cross-browser support
bgMusic = loadSound('assets/retro.mp3');
keySound= loadSound('assets/key.mp3');
hitSound= loadSound('assets/hit.mp3');
loseSound= loadSound('assets/lose.mp3');
correctSound= loadSound('assets/correct.mp3');
winSound= loadSound('assets/win.mp3');
wrongSound= loadSound('assets/wrong.mp3');
splatSound=loadSound('assets/splat.mp3');
selectSound=loadSound('assets/select.mp3');
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
  if (key) key.removeAll();
  if (door) door.removeAll();

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

  // reset used questions
  questionBanks.easy = parseQuestionLines(easyLines);
  questionBanks.medium = parseQuestionLines(mediumLines);
  questionBanks.hard = parseQuestionLines(hardLines);
  questionBanks.kpop = parseQuestionLines(secretLines);
  questionBanks.minecraft = parseQuestionLines(secret2Lines);

  allSprites.forEach(s => {
    if (s.ani) s.ani.stop();
  });
  world.active = false;
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

  
  buildWorldFromTilemap(getTilemapForDifficulty(diff));
  

}

// -------------------------
// Matrix background
// -------------------------
function initMatrixBackground() {
  matrixBG = createGraphics(canvas.w * 2, canvas.h * 2);
  // matrixBG.noStroke();
}

function drawMatrixBackground() {
  if (!matrixBG) return;

  push();
  resetMatrix();
  imageMode(CORNER);

  const parallaxFactor = .1;
  const pxBase = canvas.w / 2 - matrixBG.width / 2  - camera.x * parallaxFactor;
  const pyBase = canvas.h / 2 - matrixBG.height / 2 - camera.y * parallaxFactor + matrixScrollY;

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
  for (let y = 0; y < crtOverlayG.height; y += 3) {
    crtOverlayG.fill(0, 0, 0, 30);
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

  for (let i = 0; i < 10; i++) {
    let x = random(canvas.w);
    let y = random(canvas.h);
    let w = random(1, 90);
    let h = random(1, 2);
    fill(255, random(200, 255), 255, random(20, 60));
    rect(x, y, w, h);
  }

  pop();
}

// -------------------------
// Setup
// -------------------------
function setup() {
  // Start looping background music
  bgMusic.setVolume(0.25);  // 0.0 to 1.0
  // bgMusic.loop();          // plays indefinitely
  
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
  lwall.scale = 1.75;
  lwall.tile = 'l';

  rwall = new Group();
  rwall.physics = 'static';
  rwall.layer = 0;
  rwall.img = grassImg;
  rwall.rotation = 270;
  rwall.scale = 1.75;
  rwall.tile = 'r';

  coins = new Group();
  coins.physics = 'static';
  coins.spriteSheet = coinsImg;
  coins.addAni({ w: 16, h: 16, row: 0, frames: 14 });
  coins.tile = 'c';
  coins.layer = 0;

  key = new Group();
  key.spriteSheet = keyImg;
  key.addAni({w:16, h:16,row:0,frames:6})
  key.anis.frameDelay = 10;
  key.tile = 'k';
  key.layer = 0;
  key.color = 'yellow';
  key.width = 8;
  key.height = 8;

  door = new Sprite();
  door.physics = 'static';
  door.anis.offset.y = -5;
  door.spriteSheet = doorImg;
  door.anis.w = 32;
  door.anis.h = 32;
  door.addAnis({
    locked:{row:0,col:1,frames:8},
    unlocked:{row:0,col:0,frames:1}
  });
  door.changeAni('locked');

  door.tile = 'd';
  door.layer = 0;
  door.color = 'brown';
  door.width = 16;
  door.height = 24;

  enemies = new Group();
  // enemies.physics = 'static';
  enemies.spriteSheet = brickImg;
  enemies.anis.w = 16;
  enemies.anis.h = 16;
  enemies.rotationLock = true;
  enemies.layer = 1;
  enemies.tile = 'e';
  enemies.collider = 'cirlce';
  enemies.collider.radius = 8;
  // enemies.collider.w = 60;
  // enemies.collider.h = 60;
  enemies.anis.frameDelay = 16;
  enemies.addAni({ w: 16, h: 16, row: 0, frames: 4 });

  buildWorldFromTilemap(getTilemapForDifficulty(currentDifficulty));

  player = new Sprite(playerStartX, playerStartY, 12, 12);
  player.layer = 1;
  player.anis.w = 32;
  player.anis.h = 32;
  player.anis.offset.y = 0;
  player.anis.frameDelay = 8;
  player.spriteSheet = pinkMonsterImg;
  player.scale =.5;
  player.addAnis({
    idle: { row: 0, frames: 4 },
    knockback: { row: 0, frames: 1 },
    run: { row: 2, frames: 6 },
    jump: { row: 1, frames: 8 }
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
  // initCRTOverlay();


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
  hitSound.play();
  if (gameState !== 'play') return;

  systemStability -= 10;
  if (systemStability < 0) systemStability = 0;
  damageFlashTimer = 300;

  if (systemStability <= 0) {
    player.vel.x = 0;
    player.vel.y = 0;
    world.active = false;
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
  // enemy.remove();
  splatSound.play();

  systemStability -= 10;
  if (systemStability < 0) systemStability = 0;

  damageFlashTimer = 300;

  if (systemStability <= 0) {
    player.vel.x = 0;
    player.vel.y = 0;
    triggerGameOver();
  }
}

// -------------------------
// End states
// -------------------------
function triggerGameOver() {
  bgMusic.stop();
  loseSound.play();
  player.vel.x = 0;
  player.vel.y = 0;
  world.active = false;
  gameState = 'gameOver';
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
  // BACKGROUND IMAGE
  matrixBG.image(bgImg, 0, 0, bgImg.width*2, bgImg.height*2);
  // --- State-based input ---
  if (gameState === 'start') {
    if (kb.presses('0')) {
      DEBUG_MODE = !DEBUG_MODE;
      loadQuestionFiles();
    }
    // if(DEBUG_MODE){
    //   fill(255,0,0);
    //   text("DEBUGGING", canvas.w-30, 30)
    // }
    if (kb.presses('1')) {setDifficulty('easy');selectSound.play()}
    if (kb.presses('2')) {setDifficulty('medium');selectSound.play()}
    if (kb.presses('3')) {setDifficulty('hard');selectSound.play()}
    if (kb.presses('q')) {setDifficulty('kpop');selectSound.play()}
    if (kb.presses('p')) {setDifficulty('minecraft');selectSound.play()}

    if (kb.presses('enter')) {
      bgMusic.loop();
      gameState = 'play';
      systemStability = 100;
      foundKey = false;
      door.changeAni('locked');
      world.active = true;
      allSprites.forEach(s => {
        if (s.ani) s.ani.play();
      });
    }
    if (kb.presses('i')) {
      selectSound.play()
      gameState = 'directions';
    }
  } else if (gameState === 'directions') {
        if (kb.presses('i')) {
          selectSound.play()
          showPseudoSummary = !showPseudoSummary;
        }
        if (kb.presses('escape') && !showPseudoSummary) {
          selectSound.play()
          if(loc === "HOME") gameState = 'start';
          else gameState = 'play';
        }
        demoCoinFrameTimer += deltaTime;
        if (demoCoinFrameTimer >= demoCoinFrameDelay) {
          demoCoinFrame = (demoCoinFrame + 1) % 14;
          demoCoinFrameTimer = 0;
        }
        demoEnemyFrameTimer += deltaTime;
        if (demoEnemyFrameTimer >= demoEnemyFrameDelay) {
          demoEnemyFrame = (demoEnemyFrame + 1) % 3;
          demoEnemyFrameTimer = 0;
        }
        demoKeyFrameTimer += deltaTime;
        if (demoKeyFrameTimer >= demoKeyFrameDelay) {
          demoKeyFrame = (demoKeyFrame + 1) % 5;
          demoKeyFrameTimer = 0;
        }
        demoDoorFrameTimer += deltaTime;
        if (demoDoorFrameTimer >= demoDoorFrameDelay) {
          demoDoorFrame = (demoDoorFrame + 1) % 8;
          demoDoorFrameTimer = 0;
        }
    
  } else if (gameState === 'play') {
    world.gravity.y = 10;
    
    // QUIT option
    if(kb.presses('q')){
        failMsg = "Mission Aborted";
        triggerGameOver();
    }
    if(kb.presses('i')){      
        selectSound.play()
        // gameState = 'pause';
        loc = "to the GAME";
        world.active = false;
        allSprites.forEach(s => {
          if (s.ani) s.ani.stop();
        });
        gameState = 'directions';
    }

    if (
      kb.presses('c') &&
      showCodeLensButton &&
      nearestCoin &&
      questionsLoaded &&
      questionBanks[currentDifficulty].length > 0
    ) {
      prepareQuestionForCurrentDifficulty();
      if (currentQuestion) {
        // reset Code Lens state each time we enter
        codeLensAnswered = false;
        codeLensWasCorrect = false;
        codeLensPlayerChoice = null;
        pendingStateAfterCodeLens = null;

        //stop player if in mid air
        player.vel.x = 0;
        player.vel.y = 0;
        world.gravity.y = 0;

        gameState = 'paused';
        world.active = false;
        allSprites.forEach(s => {
          if (s.ani) s.ani.stop();
        });
      }
    }
  } else if (gameState === 'paused') {
    if(kb.presses('i')) showPseudoSummary = !showPseudoSummary;
    // Phase 1: pick an answer 1–4
    if (!codeLensAnswered && !showPseudoSummary) {
      let choice = null;
      if (kb.presses('1')) choice = 1;
      else if (kb.presses('2')) choice = 2;
      else if (kb.presses('3')) choice = 3;
      else if (kb.presses('4')) choice = 4;

      if (choice !== null) {
        if (nearestCoin && currentQuestion) {
          codeLensAnswered = true;
          codeLensPlayerChoice = choice;
          codeLensWasCorrect = (choice === currentCorrectAnswerNumber);
          pendingStateAfterCodeLens = 'play';

          nodesAttempted++;

          if (codeLensWasCorrect) {
            totalQuestionsAnsweredCorrect++;
            // CORRECT: apply effects now but stay on screen
            const coinX = nearestCoin.x;
            const coinY = nearestCoin.y;
            nearestCoin.remove();
            new grass.Sprite(coinX, coinY);

            systemStability += 5;
            if (systemStability > 100) systemStability = 100;

            score++;
            markCurrentQuestionUsed();
            nearestCoin = null;

            if (score >= totalNodes) {
              pendingStateAfterCodeLens = 'win';
            }
          } else {
            // INCORRECT: apply damage now but stay on screen
            systemStability -= 10;
            if (systemStability < 0) systemStability = 0;
            damageFlashTimer = 300;

            markCurrentQuestionUsed(); // don't repeat questions

            nearestCoin = null;

            if (systemStability <= 0) {
              player.vel.x = 0;
              player.vel.y = 0;
              pendingStateAfterCodeLens = 'gameOver';
            }
          }
        } 
      }
    } else if(!showPseudoSummary) {
      // Phase 2: already answered, wait for 'c' to continue
      if (kb.presses('c')) {
        correctSoundPlaying = false;
        wrongSoundPlaying = false;
        // Clear question state
        currentQuestion = null;
        currentQuestionIndex = -1;
        currentShuffledAnswers = [];
        currentCorrectAnswerNumber = 1;

        codeLensAnswered = false;
        codeLensWasCorrect = false;
        codeLensPlayerChoice = null;

        // if (pendingStateAfterCodeLens === 'win') {
        //   pendingStateAfterCodeLens = null;
        //   triggerWin();
        // } 
        // else 
          if (pendingStateAfterCodeLens === 'gameOver') {
          pendingStateAfterCodeLens = null;
          player.vel.x=0;
          player.vel.y=0;
          world.active = false;
          triggerGameOver();
        } else {
          pendingStateAfterCodeLens = null;
          gameState = 'play';
          world.active = true;
          allSprites.forEach(s => {
            if (s.ani) s.ani.play();
          });
        }
      }
    }
  } else if (gameState === 'gameOver' || gameState === 'win') {
    if (kb.presses('escape')) {
      // location.reload();
      // resetBoard();
      selectSound.play()
      gameState = 'start';
      player.x = playerStartX;
      player.y = playerStartY;
      camera.x = player.x;
      camera.y = player.y;
      door.changeAni('locked');
      foundKey = false;
      failMsg = "Stability has reached 0%";
      setDifficulty(currentDifficulty);
    }
  } else if(gameState === 'directions'){
    if (kb.presses('escape')) {
      world.active = true;
      allSprites.forEach(s => {
        if (s.ani) s.ani.play();
      });
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
        player.vel.x = 0;
        player.vel.y = 0;
        world.active = false;
        triggerGameOver();
      }
    }
    if(currentDifficulty=='easy' || currentDifficulty == 'kpop' || currentDifficulty == 'minecraft') ROAM_SPEED = 1;
    if(currentDifficulty=='medium') ROAM_SPEED = 1.5;
    if(currentDifficulty=='hard') ROAM_SPEED = 2;
    for (let en of enemies) {
      const radius = 50;
      const speed = ROAM_SPEED /1.5;
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
      if(player.overlapping(lwall)) 
        player.vel.x = 0;
      else 
        player.vel.x=-1.5;
      player.scale.x = -.5;
    } else if (kb.pressing('right') || kb.pressing('d')) {
      player.changeAni('run');
      if(player.overlapping(rwall)) 
        player.vel.x = 0;
      else 
        player.vel.x=1.5;
      player.scale.x = .5;
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

    setCamera();

    if(player.overlapping(key)){
      keySound.play();
      key[0].remove();
      foundKey = true;
      door.changeAni('unlocked');
    }
    if(player.overlapping(door) && foundKey){
      bgMusic.stop();
      winSound.play();
      player.vel.x = 0;
      player.vel.y = 0;
      if(score >= totalNodes)triggerWin();
      else{ 
        triggerGameOver();
        failMsg = "Unrepaired Glitches";
      }
    }
  }

  // --- Draw world + CRT ---
  camera.on();
  allSprites.draw();
  camera.off();

  drawCRTOverlay();

  // --- UI and screens ---
  push();
  resetMatrix();
  if (showPseudoSummary && (gameState === 'paused' || gameState === 'directions')) {
    drawPseudocode();
    pop(); // important to balance push()
    return; // skip drawing other screens underneath
  }

  if (gameState === 'start') {
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);

    fill(255);
    textSize(80);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("Debugging: Inside the Machine", canvas.w / 2, canvas.h / 2 - 275);
    textSize(40)
    fill(155,155,155)
    text("An AP Computer Science Principles Pseudocode Review Game", canvas.w / 2, canvas.h / 2 - 200);

    fill(200);
    textSize(50);
    text("Press ENTER/RETURN to Start", canvas.w / 2, canvas.h / 2 - 100);
    textStyle('normal');
    fill(0,255,255);
    textSize(36);
    text("Press 'i' for Instructions", canvas.w / 2, canvas.h / 2 - 25);

    textStyle(BOLD);
    fill(50, 205, 50);
    textSize(50);
    if(currentDifficulty=="easy") fill(0,255,0);
    if(currentDifficulty=="medium") fill(255,255,0);
    if(currentDifficulty=="hard") fill(255,0,0);
    if(currentDifficulty=="kpop") fill(212,175,55);
    if(currentDifficulty=="minecraft") fill(65,111,40);

    let myLevel = currentDifficulty;
    if(myLevel == 'kpop') myLevel = 'K-Pop Demon Hunters'
    text(
      "Difficulty: " + myLevel.toUpperCase(),
      canvas.w / 2,
      canvas.h / 2 + 100
    );
    textSize(30);
    fill(255);
    text(
      "1 - Easy | Selection " + (levelComplete[0]?"✅":"❌"),
      canvas.w / 2,
      canvas.h / 2 + 175
    );
     text(
      "2 - Medium | Iteration " + (levelComplete[1]?"✅":"❌"),
      canvas.w / 2,
      canvas.h / 2 + 225
    );
     text(
      "3 - Hard | Functions & Lists " + (levelComplete[2]?"✅":"❌"),
      canvas.w / 2,
      canvas.h / 2 + 275
    );
    textStyle('normal');
    fill(150);
    textSize(40);

    text(
      "Press '1', '2', or '3' to select your level",
      canvas.w / 2,
      canvas.h / 2 + 500
    );
    // best rank
    fill(255)
    text(
      "Current Rank: " + bestRank + " | Questions Answered Correctly: " + totalQuestionsAnsweredCorrect,
      canvas.w / 2,
      canvas.h / 2 + 400
    );
    if(DEBUG_MODE){
      fill(255,0,0);
      text("DEBUGGING", canvas.w-160, 30)
    }

  } else if (gameState === 'directions') {
      getDirections();
  } else if (gameState === 'gameOver' || gameState === 'win') {
    player.vel.x=0;
    //player.vel.y=0;
    const isWin = (gameState === 'win');

    if(isWin){
      if(currentDifficulty==='easy') levelComplete[0] = true;
      if(currentDifficulty==='medium') levelComplete[1] = true;
      if(currentDifficulty==='hard') levelComplete[2] = true;
    }
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);

    const headingColor = isWin ? color(0, 255, 0) : color(255, 0, 0);
    const headingText = isWin ? "System Stabilized" : "System Failure | " + failMsg;

    const percentFixed = totalNodes > 0 ? (score / totalNodes) * 100 : 0;
    const accuracy = nodesAttempted > 0 ? (score / nodesAttempted) * 100 : 0;

    let rank;
    let rank4 = "Kernel Guardian ⭐⭐⭐⭐";
    let rank3 = "Core Debugger ⭐⭐⭐";
    let rank2 = "Stack Tracer ⭐⭐";
    let rank1 = "Glitch Magnet ⭐";
    if (accuracy == 100 && isWin) rank = rank4;
    else if (accuracy >= 75 && isWin) rank = rank3;
    else if (accuracy >= 50 && isWin) rank = rank2;
    else rank = rank1;

    if(bestRank === rank1 || bestRank === "Play to earn a rank") bestRank = rank;
    else if(bestRank === rank2 && rank !== rank1) bestRank = rank;
    else if(bestRank === rank3 && rank === rank4) bestRank = rank;

    fill(headingColor);
    textSize(65);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(headingText, canvas.w / 2, canvas.h / 2 - 300);

    fill(230);
    textSize(42);
    textStyle(NORMAL);

    let lineY = canvas.h / 2 - 175;
    text("Difficulty: " + currentDifficulty.toUpperCase(), canvas.w / 2, lineY);
    lineY += 60;
    text("Glitches Fixed: " + score + " / " + totalNodes, canvas.w / 2, lineY);
    lineY += 60;
    text("Glitches Attempted: " + nodesAttempted, canvas.w / 2, lineY);
    lineY += 60;
    text("Accuracy: " + accuracy.toFixed(1) + "%", canvas.w / 2, lineY);
    lineY += 60;
    text("System Stabilized: " + percentFixed.toFixed(1) + "%", canvas.w / 2, lineY);
    lineY += 80;

    fill(50, 205, 50);
    textSize(46);
    textStyle(BOLD);
    text(rank, canvas.w / 2, lineY);

    fill(200);
    textSize(40);
    text("Press ESCAPE to return to the MAIN MENU", canvas.w / 2, canvas.h / 2 + 500);
  } else if (gameState === 'play') {
    if(currentDifficulty==='easy'){
      fill(250, 250, 250, 250);
      stroke(0);
      strokeWeight(4);
      textAlign(CENTER, CENTER);
      textSize(40);
      text('Press \'i\' for Instructions', canvas.w/2,canvas.h -30);
    }   
    fill(250, 250, 250);
    stroke(0);
    strokeWeight(4);
    textAlign(LEFT, TOP);
    textSize(50);
    text('Nodes Fixed: ' + score + ' / ' + totalNodes, canvas.w - 600, 20);
    if(foundKey){ 
      fill(0,255,0);
      text('USB Key: FOUND', canvas.w - 600, 80);
    }
    else{ 
      fill(255,0,0)
      textAlign(LEFT, TOP);
      text('USB Key: MISSING', canvas.w - 600, 80);
    }
    if(currentDifficulty==='easy' && foundKey && score<totalNodes){
      textAlign(CENTER, MIDDLE);
        fill(255,255,0)
        textSize(45);
        text('USB Key found! Fix all glitches before entering the USB Port!', canvas.w/2, 200);
    }
    if(currentDifficulty==='easy' && foundKey && score>=totalNodes){
      textAlign(CENTER, MIDDLE);
        fill(0,255,0)
        textSize(45);
        text('USB Key found and all glitches fixed, find and enter the USB Port!', canvas.w/2, 200);
    }
    if(currentDifficulty==='easy' && !foundKey && score>=totalNodes){
      textAlign(CENTER, MIDDLE);
        fill(255,255,0)
        textSize(45);
        text('All glitches fixed, the USB Key to disable the firewall!', canvas.w/2, 200);
    }
    if(currentDifficulty==='easy' && !foundKey && score<totalNodes){
      textAlign(CENTER, MIDDLE);
        fill(255,0,0)
        textSize(45);
        text('Fix all glitches and find the USB Key to disable the firewall!', canvas.w/2, 200);
    }

    const barWidth = 400;
    const barHeight = 30;
    const padding = 20;

    fill(250, 250, 250);
    textAlign(LEFT, TOP);
        
    textSize(40);
    text('System Stability: ' + systemStability + '%', padding, padding);

    noStroke();
    fill(50, 50, 50);
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
  } else if (gameState === 'paused' && !showPseudoSummary) {
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
    textSize(60);
    let headerTxt = showPseudoSummary?"AP CSP Pseudocode":"Code Lens";
    text(headerTxt, canvas.w / 2, overlayY + 30);
    if (currentQuestion) {
      const qX = overlayX + 60;
      const qY = overlayY + 140;
      const textBoxWidth = overlayW - 120;

      textAlign(LEFT, TOP);

      // QUESTION AT THE TOP
      textSize(40);
      fill(0, 255, 0);

      let promptText = currentQuestion.prompt;
      if(!QUESTION_NUMBERS){
        promptText = currentQuestion.prompt.replace(/^.*?:\s*/, '');
      }

      let promptBottomY = drawWrappedText(
        promptText,
        qX,
        qY,
        textBoxWidth,
        1.4
      );

      // TWO COLUMNS UNDER PROMPT
      const gutter = 40;
      const columnTopY = promptBottomY + 40;
      const columnWidth = (textBoxWidth - gutter) / 2;

      const codeX = qX;
      const choicesX = qX + columnWidth + gutter;

      // CODE BLOCK (LEFT COLUMN)
      textStyle('normal')
      textSize(24);
      fill(200, 255, 200);

      const codeLines = currentQuestion.code.split('\n');
      let codeY = columnTopY;
      let indentLevel = 0;
      const indentSize = 40;
      const baseX = codeX + 40;

      for (let i = 0; i < codeLines.length; i++) {
        let line = codeLines[i].trim();

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

      // ANSWER CHOICES (RIGHT COLUMN)
      textSize(28);

      const labels = ['1', '2', '3', '4'];
      let choicesY = columnTopY;

      const answersToShow =
        currentShuffledAnswers && currentShuffledAnswers.length === 4
          ? currentShuffledAnswers
          : currentQuestion.choices;

      for (let i = 0; i < answersToShow.length; i++) {
        const label = labels[i] || (i + 1) + '.';
        const optionText = label + '. ' + answersToShow[i];

        const optionNumber = i + 1;
        const isCorrect = (optionNumber === currentCorrectAnswerNumber);
        const isPlayerChoice = (codeLensPlayerChoice === optionNumber);

        // Color based on correctness / choice once answered
        if (codeLensAnswered) {
          if (isCorrect) {
            if(!correctSoundPlaying && isPlayerChoice){
              correctSound.play();
              correctSoundPlaying = true;
            }
            textStyle('bold');
            fill(0, 255, 0); // green for correct
          } else if (isPlayerChoice && !isCorrect) {
            if(!wrongSoundPlaying){
              wrongSound.play();
              wrongSoundPlaying = true;
            }
          
            textStyle('normal');
            fill(255, 80, 80); // red for wrong chosen answer
          } else {
            textStyle('normal');
            fill(180); // dim others
          }
        } else {
          textStyle('bold');
          fill(255); // before answering
        }

        const choiceTopY = choicesY;
        choicesY = drawWrappedText(optionText, choicesX, choicesY, columnWidth, 1.4);
        choicesY += 50;

        // Strikethrough for incorrect chosen answer
        // if (codeLensAnswered && isPlayerChoice && !isCorrect) {
        //   stroke(255, 80, 80);
        //   strokeWeight(2);
        //   const lh = textSize() * 1.4;
        //   const midY = choiceTopY + lh * 0.5;
        //   line(choicesX, midY-5, choicesX + columnWidth, midY-5);
        //   noStroke();
        // }
      }

      const choicesBottomY = choicesY;
      const contentBottomY = Math.max(codeBottomY, choicesBottomY);

      // HINT SECTION
      fill(200);
      textSize(30);
      const hintY = overlayY + overlayH - 80;

      const hintText = codeLensAnswered
        ? "Press \'c\' to continue or 'i' to see AP CSP Pseudocode."
        : "Press 1, 2, 3, or 4 to choose your fix or 'i' to see AP CSP Pseudocode.";

      drawWrappedText(
        hintText,
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
  function getDirections(){
    fill(0, 0, 0, 225);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);

    const padding = 80;
    const boxWidth = canvas.w - padding * 2;

    fill(255);
    textSize(40);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text("SYSTEM BRIEFING // MISSION: DEBUGGING", canvas.w / 2, 40);

    fill(200);
    textSize(30);
    textStyle(NORMAL);
    textAlign(LEFT, TOP);
    let y = padding + 50;

    y = drawWrappedText(
      "You’ve been uploaded inside the machine!",
      padding, y, boxWidth
    );
    y += 20;
    y = drawWrappedText(
      "Your mission: Find the USB Key to disable the firewall, stabilize the system, and exit thorugh the port before the system collapses.",
      padding, y, boxWidth
    );
    y += 20;
    y = drawWrappedText(
      "Watch for the Code Lens: it will appear near glitches when you are close enough to investigate.",
      padding, y, boxWidth
    );
    y += 20;
    y = drawWrappedText(
      "Repair the glitch in Code Lens before touching it in the world, or you’ll be snapped back to the beginning and lose stability.",
      padding, y, boxWidth
    );
    y += 20;
    y = drawWrappedText(
      "Once you've stabilized the system, exit throught the USB port, but only after you've found the golden USB key to disable the firewall. Exiting before you've fixed and the node and the system is doomed!",
      padding, y, boxWidth
    );
     y += 20;
    y = drawWrappedText(
      "But beware: rogue viruses are looping endlessly, spreading chaos in the circuits. Collide with one and you’ll corrupt your own memory buffer and drain stability.",
      padding, y, boxWidth
    );
    y += 0;

    const centerX = canvas.w / 2;
    const iconY = y + 60;
    const iconSpacing = 260;
    const iconSize = 80;

    imageMode(CENTER);

    const glitchX = centerX - iconSpacing / 2;
    const sx = demoCoinFrame * 16;
    const sx2 = demoEnemyFrame * 16;
    const sx3 = demoKeyFrame * 16;
    // const sx5 = demoDoorFrame * 32;
    const sx4 = (demoDoorFrame + 1) * 32;
    const sy = 0;
    const sw = 16;
    const sh = 16;
    noStroke();
    image(coinsImg, glitchX - 420, iconY + 40, iconSize, iconSize, sx, sy, sw, sh);

    fill(50, 205, 50);
    textSize(40);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    drawWrappedText("GLITCH", glitchX - 600, iconY + iconSize / 2, 140);

    const virusX = centerX + iconSpacing / 2;
    image(brickImg, virusX + 650, iconY + 40, iconSize, iconSize, sx2, sy, sw, sh);

    // KEY

    fill(218, 165, 32);
    textSize(40);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    drawWrappedText("USB KEY", glitchX - 120, iconY + iconSize / 2-25, 10);

    const keyX = centerX + iconSpacing / 2;
    image(keyImg, keyX - 250, iconY+40, iconSize, iconSize, 0, sx3, 16, 16);

    // DOOR

    fill(106,137,167);
    textSize(40);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    drawWrappedText("USB PORT", glitchX + 250, iconY + iconSize / 2-25, 140);

    const doorX = centerX + iconSpacing / 2;
    image(doorImg, doorX + 120, iconY + 40, iconSize, iconSize, sx4, sy, 32, 32);
    image(doorImg, doorX + 220, iconY + 40, iconSize, iconSize, 0, sy, 32, 32);

    fill(255, 80, 80);
    textSize(40);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    drawWrappedText("VIRUS", virusX + 500, iconY + iconSize / 2, 140);

    y = iconY + iconSize / 2 + 100;

    fill(50, 205, 50);
    textSize(30);
    textStyle(BOLD);
    textAlign(LEFT, TOP);

    y = drawWrappedText("MOVEMENT:           ← → or A / D", padding, y, boxWidth);
    y = drawWrappedText("JUMP:               SPACE or ↑", padding, y, boxWidth);
    y = drawWrappedText(
      "ENTER CODE LENS:    C (when \"Code Lens\" appears)",
      padding, y, boxWidth
    );
    y = drawWrappedText(
      "MAKE SELECTION:     1, 2, 3, or 4",
      padding, y, boxWidth
    );
    fill(255,0,0);
    y = drawWrappedText(
      "GIVE UP:            Q",
      padding, y, boxWidth
    );
    fill(0,255,0);
    y += 30;
    // textSize(34);

    fill(150);
    textSize(40);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text("Press 'esc' to return " + loc + " or 'i' for AP CSP Pseudocode.", canvas.w/2, canvas.h - 80);
    if(loc !== "HOME"){
      world.active = true;
      allSprites.forEach(s => {
        if (s.ani) s.ani.play();
      });
    }
  } 
  function setCamera() {
    const viewW = canvas.w / camera.zoom;
    const viewH = canvas.h / camera.zoom;

    let minX = mapLeft + viewW / 2;
    let maxX = mapRight - viewW / 2;
    let minY = mapTop + viewH / 2;
    let maxY = mapBottom - viewH / 2;

    // Handle tiny maps smaller than the camera view
    if (maxX < minX) {
      const midX = (mapLeft + mapRight) / 2;
      minX = maxX = midX;
    }
    if (maxY < minY) {
      const midY = (mapTop + mapBottom) / 2;
      minY = maxY = midY;
    }

    // ---------- HORIZONTAL: follow player normally ----------
    let targetX = constrain(player.x, minX, maxX);

    // ---------- VERTICAL: dead zone around camera center ----------
    // How tall the dead zone should be in world units (e.g. 30% of the visible height)
    const deadZoneHeight = viewH * 0.3;
    const deadZoneTop    = camera.y - deadZoneHeight / 2;
    const deadZoneBottom = camera.y + deadZoneHeight / 2;

    let targetY = camera.y;

    // Only move camera up if player leaves top of dead zone
    if (player.y < deadZoneTop) {
      targetY = player.y + deadZoneHeight / 2;
    }
    // Only move camera down if player leaves bottom of dead zone
    else if (player.y > deadZoneBottom) {
      targetY = player.y - deadZoneHeight / 2;
    }

    // Stay inside map bounds
    targetY = constrain(targetY, minY, maxY);

    // ---------- SNAP to pixel grid (important with zoom + pixelPerfect) ----------
    const snap = 1 / camera.zoom; // one screen pixel in world units

    camera.x = Math.round(targetX / snap) * snap;
    camera.y = Math.round(targetY / snap) * snap;
  }
  function drawPseudocode(){
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
    textSize(60);
    let headerTxt = showPseudoSummary?"AP CSP Pseudocode":"Code Lens";
    text(headerTxt, canvas.w / 2, overlayY + 30);

    // ADD PSEUDOCODE
    // -----------------------------
      // PSEUDOCODE SUMMARY VIEW
      // -----------------------------
        if (showPseudoSummary) {
        const qX = overlayX + 60;
        const qY = overlayY + 140;
        const textBoxWidth = overlayW - 120;

        const gutter = 40;
        const columnWidth = (textBoxWidth - gutter) / 2;

        const leftX = qX;
        const rightX = qX + columnWidth + gutter;

        let leftY = qY;
        let rightY = qY;

        textAlign(LEFT, TOP);

        // -------------------------
        // TWO-COLUMN CONTENT
        // -------------------------

        const summaryLeft = [
          { header: "VARIABLES:" },
          "Use ← to assign values.",
          "x ← 5",
          "count ← count + 1",

          "",
          { header: "OPERATORS:" },
          "+  -  *  /  MOD",
          "=  ≠  >  <  ≥  ≤",
          "AND   OR   NOT",

          "",
          { header: "CONDITIONALS:" },
          "IF (condition) { ... }",
          "ELSE IF (condition) { ... }",
          "ELSE { ... }",

          "",
          { header: "LOOPS:" },
          "REPEAT n TIMES { ... }",
          "REPEAT UNTIL (condition)",
          "FOR EACH item IN list"
        ];

        const summaryRight = [
          { header: "LISTS (1-indexed):" },
          "nums ← [2,4,6]",
          "nums[1] // returns 2 (1st element)",
          "LENGTH(nums) // returns 3",
          "APPEND(nums, v) // adds v to end of list",
          "INSERT(nums, i, v) // inserts v at index i",
          "REMOVE(nums, i) // removes element at index i",

          "",
          { header: "STRINGS:" },
          "\"Hi \" + name",
          "LENGTH(word)",
          "SUBSTRING(word, s, e)",

          "",
          { header: "PROCEDURES:" },
          "PROCEDURE f(x) {",
          "  RETURN x",
          "}",
          "result ← f(5)"
        ];

        // Styles
        const headerSize = 30;
        const codeSize = 24;

        // indent pseudocode by 30 pixels
        const codeIndent = 30;

        fill(200, 255, 200);

        // LEFT COLUMN
        for (let line of summaryLeft) {

          if (typeof line === "object" && line.header) {
            // --- HEADER ---
            textStyle(BOLD);
            textSize(headerSize);
            leftY = drawWrappedText(line.header, leftX, leftY, columnWidth, 1.25);
          } else if (line === "") {
            // blank line
            leftY += 20;
          } else {
            // --- PSEUDOCODE (indented) ---
            textStyle('normal');
            textSize(codeSize);
            leftY = drawWrappedText("   " + line, leftX + codeIndent, leftY, columnWidth - codeIndent, 1.25);
          }

          leftY += 8;
        }

        // RIGHT COLUMN
        for (let line of summaryRight) {

          if (typeof line === "object" && line.header) {
            // --- HEADER ---
            textStyle(BOLD);
            textSize(headerSize);
            rightY = drawWrappedText(line.header, rightX, rightY, columnWidth, 1.25);
          } else if (line === "") {
            // blank line
            rightY += 20;
          } else {
            // --- PSEUDOCODE (indented) ---
            textStyle('normal');
            textSize(codeSize);
            rightY = drawWrappedText("   " + line, rightX + codeIndent, rightY, columnWidth - codeIndent, 1.25);
          }

          rightY += 8;
        }

        // Bottom hint
        fill(200);
        textStyle(BOLD);
        textSize(30);
        const hintY = overlayY + overlayH - 80;

        drawWrappedText(
          "Press 'i' to return.",
          qX,
          hintY,
          textBoxWidth,
          1.2
        );
        // pop();
        return; // prevent question UI from drawing
    }
  }
  pop();
  drawCRTOverlay();
}