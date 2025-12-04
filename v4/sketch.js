// Disable p5play's built-in Google Analytics tagging
window._p5play_gtagged = false;

let DEBUG_MODE = false;
const QUESTION_NUMBERS = true;


let bestRank = "Play to earn a rank";

let showPseudoSummary = false;
let totalQuestionsAnsweredCorrect = 0;
let bgMusic, keySound, loseSound, hitSound;
let correctSound, winSound, wrongSound, splatSound, selectSound; 
let correctSoundPlaying = false;
let wrongSoundPlaying = false;

let soundsLoaded = 0;
const TOTAL_SOUNDS = 9;
let soundsReady = false;
// -------------------------
// Global game state
// -------------------------
let player, groundSensor, grass, platforms, coins, enemies, lwall, rwall;
let grassImg, coinsImg, charactersImg, brickImg, codeFont, bgImg, pinkMonsterImg, goldMonsterImg;
let key, door, keyImg, doorImg;
let loc = "HOME", foundKey = false; // for diections
let failMsg = "Stability has reached 0%";
const levelComplete  = [false,false,false, false, false];
const levelCompleteA = [false,false,false, false, false];
let csa = false;

let sparkles = [];
let glows = [];

let showDoorMessage = false;
let doorMessageEndTime = 0;

let isJumping = false;
let jumpPressedTime = 0;
const maxJumpHold = 220;   // milliseconds player can hold for higher jump
let jumpsLeft = 2;
let wasOnGround = false;  // NEW: track landing

const BASE_JUMP_VEL   = -3.0;   // your initial tap jump
const BOOST_DURATION  = 220;    // ms max boost time
const BOOST_TOTAL     = -3.0;   // *extra* upward velocity over full hold (in addition to BASE)

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
  let e,m,h;
  if(!csa){
    e = 'easy.txt', m = 'medium.txt', h = 'hard.txt';
  }
  else{
    e = 'easy-a.txt', m = 'medium-a.txt', h = 'hard-a.txt';
  }
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
  'l k                                 e                 cpp     r',
  'lpp                                                           r',
  'l      ppc                                       ppp          r',
  'l        e                                  e                 r',
  'l        ppp                                pcp               r',
  'l                                                             r',
  'l                                      ppp                    r',
  'l             ppc               pppc             e            r',
  'l              e              pp                              r',
  'l                                                             r',
  'l                ppp                                          r',
  'l                                                             r',
  'ggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];

const tilemapMedium = [
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'l                                                            r',
  'l                                                            r',
  'l                     k                                      r',
  'l                   epppp                                    r',
  'l                                                pce         r',
  'l                pp                     e                    r',
  'l          eppp          c             ppp    pp            cr',
  'l          c                                          pp     r',
  'l                                                            r',
  'l                       e ppp e                            d r',
  'l                                   pc                    pppr',
  'l      e                                                     r',
  'l     ppp                                            pc      r',
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
  'l                             ppp          e        ppe      r',
  'lppcpppp         ppp           e                         ppp r',
  'l       ppp             pppp         pp                      r',
  'l            e                                c              r',
  'l                                                           pr',
  'l                                                pppc        r',
  'l                                                            r',
  'l                                       ppppp               pr',
  'l                                                            r',
  'l                                cpp                         r',
  'l                                                           pr',
  'l                         e                                  r',
  'l                        ppppp                               r',
  'l                                                           pr',
  'l                     c                                      r',
  'l                                                            r',
  'l                                                           pr',
  'l                                                            r',
  'l    e                                                       r',
  'l                    c                                      pr',
  'l                                                            r',
  'l                                                            r',
  'l                      e                                    pr',
  'l                  cpppp                                     r',
  'l                                                            r',
  'l         ppp                                                r',
  'l       pc                                                 ppr',
  'l                                                            r',
  'l                 ppp                   e d         c        r',
  'l  e                                 cppppppppp              r',
  'l ppp             e                                       c  r',
  'l                                                         e  r',
  'l                                                            r',
  'l                                                            r',
  'l                                                     p      r',
  'l   pppc                                                     r',
  'l                                                            r',
  'l                                                    e     c r',
  'l           cpe                                              r',
  'l                                                            r',
  'l                                                       pp   r',
  'l                                                            r',
  'l     cppp                                                   r',
  'l                                                   ppp      r',
  'l                                                            r',
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];
const tilemapKpop = [
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'l                                                            r',
  'l                                                            r',
  'l                                                            r',
  'l                                                            r',
  'l                                                     e      r',
  'l                                                            r',
  'l              e                                        k    r',
  'l       d                                        e  pppppppppr',
  'l      ppp    c                                           e  r',
  'l     e                                e          c          r',
  'l              e                             pp      e       r',
  'l                 c                         e                r',
  'l                        e              c                    r',
  'l         e        e                            e            r',
  'l                     c                                      r',
  'l                                                            r',
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];
const tilemapMinecraft = [
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
  'l                             c                              r',
  'l                                                            r',
  'l                             e                              r',
  'l                                                            r',
  'l                             c                              r',
  'l                                                            r',
  'l                             e                              r',
  'l                                                            r',
  'l                             c                              r',
  'l                                                            r',
  'l                             e                              r',
  'l                                                            r',
  'l                             c                              r',
  'l                                                            r',
  'l                             e                              r',
  'l                                                            r',
  'l                             c                              r',
  'l                    e                 e                     r',
  'l                                                            r',
  'l                     k              d                       r',
  'gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
];

function getTilemapForDifficulty(diff) {
  if(diff === 'kpop') return tilemapKpop;
  if(diff === 'minecraft') return tilemapMinecraft;
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
pixelDensity(1);

// Load images/fonts (q5-style, no preload)
grassImg = loadImage('assets/grass.png');
coinsImg = loadImage('assets/coin.png');
// charactersImg = loadImage('assets/characters.png');
pinkMonsterImg = loadImage('assets/pink-monster.png');
goldMonsterImg = loadImage('assets/gold-monster.png');
brickImg = loadImage('assets/brick.png');
keyImg = loadImage('assets/key.png');
doorImg = loadImage('assets/door.png');
codeFont = loadFont('assets/SourceCodePro-Regular.ttf');
bgImg = loadImage('assets/background.png');


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

  const parallaxFactor = 1.5;
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
  // -------------------------
  // Sound
  // -------------------------
  soundFormats('mp3', 'ogg', 'wav'); // optional, ensures cross-browser support

  pixelDensity(1); 

  // Background music: load async, configure in callback
  bgMusic = loadSound('assets/retro.mp3', () => {
    bgMusic.setVolume(1);  // 0.0 to 1.0
    // Don't auto-loop here if you want to obey click-to-start
    // bgMusic.loop();
  });

  // Other sounds: load async; just guard before using them
  keySound     = loadSound('assets/key.mp3');
  hitSound     = loadSound('assets/hit.mp3');
  loseSound    = loadSound('assets/lose.wav');
  correctSound = loadSound('assets/correct.mp3');
  winSound     = loadSound('assets/win.wav');
  wrongSound   = loadSound('assets/wrong.wav');
  splatSound   = loadSound('assets/splat.mp3');
  selectSound  = loadSound('assets/select.mp3');

  // -------------------------
  // Rest of your setup
  // -------------------------
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
  key.addAni({ w: 16, h: 16, row: 0, frames: 6 });
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
    locked:   { row: 0, col: 1, frames: 8 },
    unlocked: { row: 0, col: 0, frames: 1 }
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
  enemies.collider = 'circle';        // (tiny fix: was "cirlce")
  enemies.collider.radius = 8;
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
  
  player.scale = 0.5;
  player.addAnis({
    idle:      { row: 0, frames: 4 },
    knockback: { row: 0, frames: 1 },
    run:       { row: 2, frames: 6 },
    jump:      { row: 1, frames: 8 }
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
  if(damageFlashTimer==0)
    player.overlaps(enemies, hitEnemy);

  // const scale = min(windowWidth / 2000, windowHeight / 1125);
  // camera.zoom = 4 * scale;  // or tune the 4

  camera.x = player.x;
  camera.y = player.y;
  camera.zoom = 4;

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
  matrixBG.image(bgImg, 0, 0, bgImg.width*2 , bgImg.height*2
  );
  // --- State-based input ---
  if (gameState === 'start') {
    world.gravity.y = 10;

    //toggle debugging mode
      // if (kb.presses('0')) {
      //   DEBUG_MODE = !DEBUG_MODE;
      //   loadQuestionFiles();
      // }
    // if(DEBUG_MODE){
    //   fill(255,0,0);
    //   text("DEBUGGING", canvas.w-30, 30)
    // }
    // Check level completion
    const allComplete = levelComplete.slice(0, 3).every(v => v === true);
    const allCompleteA = levelCompleteA.slice(0, 3).every(v => v === true);

    // CSA/CSP Toggle
    if (kb.presses('space')) {csa = !csa ;selectSound.play(); loadQuestionFiles();}
    if (kb.presses('c')) window.open("https://csplusplus.com", "_blank");
    if (kb.presses('1')) {setDifficulty('easy');selectSound.play()}
    if (kb.presses('2')) {setDifficulty('medium');selectSound.play()}
    if (kb.presses('3')) {setDifficulty('hard');selectSound.play()}
    if ((allComplete || allCompleteA) && kb.presses('q')) {setDifficulty('kpop');selectSound.play()}
    if ((allComplete || allCompleteA) && kb.presses('p')) {setDifficulty('minecraft');selectSound.play()}

    if (kb.presses('enter')) {
      // onGround =true;
      jumpsLeft = 2;
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
      selectSound.play();
      gameState = 'directions';
    }
  } else if (gameState === 'directions') {
        player.vel.x=0;
        player.vel.y=0;
        world.gravity.y=0;
        if (kb.presses('i')) {
          selectSound.play()
          showPseudoSummary = !showPseudoSummary;
        }
        if (kb.presses('escape') /*&& !showPseudoSummary*/) {
          showPseudoSummary = false;
          selectSound.play()
          if(loc === "HOME") gameState = 'start';
          else gameState = 'play';
          if(groundSensor.overlapping(grass) || groundSensor.overlapping(platforms))jumpsLeft = 2;
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
    
    // Toggle bg music on/off
    if(kb.presses('escape')){
      if(bgMusic.isLooping()) bgMusic.stop();
      else bgMusic.loop();
    }
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
        // allSprites.forEach(s => {
        //   if (s.ani) s.ani.stop();
        // });
        
        player.vel.x = 0;
        player.vel.y = 0;
        // world.gravity.y = 0;
        // gameState = 'paused';
        world.active = false;
        allSprites.forEach(s => {
          if (s.ani) s.ani.stop();
          s.vel.x = 0;
          s.vel.y = 0;
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
      loc = "to the GAME";
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
          s.vel.x = 0;
          s.vel.y = 0;
        });
      }
    }
  } else if (gameState === 'paused') {
    if(kb.presses('i')){
      selectSound.play();
      showPseudoSummary = true;
    }
    if(kb.presses('escape')){
      selectSound.play();
      showPseudoSummary = false;
    }
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
      if (kb.presses('enter')) {
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
      loc = "HOME"
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
    // ----- ENEMY ROAM LOGIC -----

let baseSpeed = 1;
if (currentDifficulty === 'medium')  baseSpeed = 1.25;
if (currentDifficulty === 'hard')    baseSpeed = 1.5;

// Enemies wander around their spawn point with random speeds + targets
for (let en of enemies) {
  // one-time setup per enemy
  if (en.roamInitialized !== true) {
    en.spawnX = en.spawnX ?? en.x;
    en.spawnY = en.spawnY ?? en.y;

    en.roamRadius = random(40,80); // how far from spawn they can wander
    // give each enemy its own speed, roughly around baseSpeed
    en.roamSpeed  = random(baseSpeed * 0.5, baseSpeed * 1);

    en.targetX = en.spawnX + random(-en.roamRadius, en.roamRadius);
    en.targetY = en.spawnY + random(-en.roamRadius, en.roamRadius);

    en.roamInitialized = true;
  }

  // move toward current target
  const dx = en.targetX - en.x;
  const dy = en.targetY - en.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 4) {
    // reached target: pick a new random point near spawn
    en.targetX = en.spawnX + random(-en.roamRadius, en.roamRadius);
    en.targetY = en.spawnY + random(-en.roamRadius, en.roamRadius);
  } else if (dist > 0) {
    const step = en.roamSpeed;
    en.x += (dx / dist) * step;
    en.y += (dy / dist) * step;
  }
  en.overlapping(key);
}

// --- DOUBLE JUMP + VARIABLE JUMP WITH COMPLETION CHECK ---

// 1) How many jumps are allowed right now?
const allComplete  = levelComplete.slice(0, 3).every(v => v === true);
const allCompleteA = levelCompleteA.slice(0, 3).every(v => v === true);

const maxJumps = (allComplete || allCompleteA) ? 2 : 1;

// 2) Ground check
const onGround =
  groundSensor.overlapping(grass) ||
  groundSensor.overlapping(platforms);

// 3) Reset jumps ONLY when we actually land (transition air → ground)
if (onGround && !wasOnGround) {
  jumpsLeft = maxJumps;   // 1 jump normally, 2 jumps if allComplete
}

// 4) START JUMP LOGIC
if (kb.presses('up') || kb.presses('space')) {

  // FIRST JUMP: must be on the ground
  if (onGround && jumpsLeft > 0) {
    isJumping = true;
    jumpPressedTime = millis();
    jumpsLeft--;                // consume first jump

    player.changeAni('jump');
    player.vel.y = BASE_JUMP_VEL;   // base jump
  }

  // SECOND JUMP: only allowed in the air, and only if we have a remaining jump
  else if (!onGround && jumpsLeft > 0 && jumpsLeft < maxJumps) {
    isJumping = true;
    jumpPressedTime = millis();
    jumpsLeft--;                // consume second jump

    player.changeAni('jump');
    player.vel.y = BASE_JUMP_VEL;   // same base for the double jump
  }
}

// 5) VARIABLE JUMP HEIGHT (tap vs hold), time-based so FPS doesn’t matter
if (isJumping) {
  const heldTime = millis() - jumpPressedTime;

  // Normalize to 60fps
  const dtNorm = deltaTime / 16.67; // 16.67 ms ≈ 1 frame at 60fps

  // Per-frame boost chosen so that over BOOST_DURATION we add roughly BOOST_TOTAL
  const framesForFullBoost = BOOST_DURATION / 16.67;
  const perFrameBoost = (BOOST_TOTAL / framesForFullBoost) * dtNorm;

  if ((kb.pressing('up') || kb.pressing('space')) && heldTime < BOOST_DURATION) {
    player.vel.y += perFrameBoost;  // BOOST_TOTAL is negative, so this pushes upward
  }

  // Stop boosting when key is released or we hit the time limit
  if (kb.released('up') || kb.released('space') || heldTime >= BOOST_DURATION) {
    isJumping = false;
  }
}

// 6) Remember ground state for next frame
wasOnGround = onGround;

// --- END BLOCK ---





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

    // KEY PICKUP (unchanged except maybe removing the unlock anim until all fixed)
if (player.overlapping(key)) {
  keySound.play();
  key[0].remove();
  foundKey = true;
  systemStability = 100;
  door.changeAni('unlocked'); // or leave this if you like the visual cue
}

// DOOR LOGIC
const allGlitchesFixed = (score >= totalNodes);

if(player.overlapping(door) && !foundKey){
  // ❌ not allowed in yet – bounce back and warn

    const halfPlayer = player.w / 2;
    const halfDoor   = door.w / 2;
    const buffer     = 5;   // push them just outside the overlap

    if (player.x < door.x) {
      // player is on the LEFT side of the door → move them LEFT
      player.x = door.x - halfDoor - halfPlayer - buffer;
    } else {
      // player is on the RIGHT side of the door → move them RIGHT
      player.x = door.x + halfDoor + halfPlayer + buffer;
    }

    // Optional tiny knockback in velocity to make it feel like a bump (not a slide)
    // Comment out if it fights your anim logic:
    player.vel.x = (player.x < door.x ? -1 : 1) * 1;

    systemStability -= 5;
    hitSound.play();
    damageFlashTimer = 300;

    doorMessageEndTime = millis() + 2000;
    if (currentDifficulty !== 'easy') {
      showDoorMessage = true;
    }
}

if (player.overlapping(door) && foundKey) {

  if (allGlitchesFixed) {
    // ✅ allowed to finish
    bgMusic.stop();
    winSound.play();
    player.vel.x = 0;
    player.vel.y = 0;
    triggerWin();

  } else {
    // ❌ not allowed in yet – bounce back and warn

    const halfPlayer = player.w / 2;
    const halfDoor   = door.w / 2;
    const buffer     = 5;   // push them just outside the overlap

    if (player.x < door.x) {
      // player is on the LEFT side of the door → move them LEFT
      player.x = door.x - halfDoor - halfPlayer - buffer;
    } else {
      // player is on the RIGHT side of the door → move them RIGHT
      player.x = door.x + halfDoor + halfPlayer + buffer;
    }

    // Optional tiny knockback in velocity to make it feel like a bump (not a slide)
    // Comment out if it fights your anim logic:
    player.vel.x = (player.x < door.x ? -1 : 1) * 1;

    systemStability -= 5;
    hitSound.play();
    damageFlashTimer = 300;

    doorMessageEndTime = millis() + 2000;
    if (currentDifficulty !== 'easy') {
      showDoorMessage = true;
    }
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

    if(DEBUG_MODE){
      levelComplete[0] = true;
      levelComplete[1] = true;
      levelComplete[2] = true;
      levelCompleteA[0] = true;
      levelCompleteA[1] = true;
      levelCompleteA[2] = true;
    }

    // fill(0, 0, 0, 200);
    // noStroke();
    // rect(0, 0, canvas.w, canvas.h);
  
    // Dark overlay
fill(0, 0, 0, 200);
noStroke();
rect(0, 0, canvas.w, canvas.h);

// Check level completion
const allComplete = levelComplete.slice(0, 3).every(v => v === true);
const allCompleteA = levelCompleteA.slice(0, 3).every(v => v === true);

if (allComplete || allCompleteA) {
  // GOLD skin if all complete
  player.spriteSheet = goldMonsterImg;
  for (const name in player.anis) {
    player.anis[name].spriteSheet = goldMonsterImg;
  }
  player.changeAni('idle');
  // Spawn new glow particles occasionally
  if (frameCount % 6 === 0) {
    for (let i = 0; i < 3; i++) {
      glows.push({
        x: random(canvas.w),
        y: random(canvas.h),
        radius: random(80, 200),
        alpha: random(40, 80),
        decay: random(0.3, 0.8)
      });
    }
  }

  // Spawn new sparkles occasionally
  if (frameCount % 10 === 0) {
    for (let i = 0; i < 6; i++) {
      sparkles.push({
        x: random(canvas.w),
        y: random(canvas.h),
        size: random(2, 6),
        alpha: 255,
        decay: random(1, 3),
        vy: random(-0.3, -0.1) // slow upward drift
      });
    }
  }
} else {
  // Clear particles when not complete
  sparkles = [];
  glows = [];
}

// DRAW GLOWS
push();
noStroke();
for (let i = glows.length - 1; i >= 0; i--) {
  let g = glows[i];
  fill(255, 215, 0, g.alpha);
  ellipse(g.x, g.y, g.radius);

  g.alpha -= g.decay;

  if (g.alpha <= 0) {
    glows.splice(i, 1);
  }
}
pop();

// DRAW SPARKLES
push();
noStroke();
for (let i = sparkles.length - 1; i >= 0; i--) {
  let s = sparkles[i];

  fill(255, 255, random(150, 255), s.alpha);
  ellipse(s.x, s.y, s.size);

  // update
  s.y += s.vy;
  s.alpha -= s.decay;

  if (s.alpha <= 0) {
    sparkles.splice(i, 1);
  }
}
pop();

// Title text
textAlign(CENTER, CENTER);
textStyle(BOLD);
textSize(80);
let mainTitleOffset = 350
if (allComplete || allCompleteA) {
  // slower shimmer effect
  const shimmerOffset = sin(frameCount * 0.01) * 4;
  const sparkle = random(220, 255);

  // gold shadow/glow
  fill(255, 180, 0, 220);
  text(
    "Debugging: Inside the Machine",
    canvas.w / 2 + 3,
    canvas.h / 2 - mainTitleOffset+3
  );

  // gold shimmer text
  fill(sparkle, sparkle * 0.9, 0);
  text(
    "Debugging: Inside the Machine",
    canvas.w / 2 + shimmerOffset,
    canvas.h / 2 - mainTitleOffset
  );

} else {
  // regular title (your original)
  fill(255);
  text(
    "Debugging: Inside the Machine",
    canvas.w / 2,
    canvas.h / 2 - mainTitleOffset
  );
}

// Subtitle
textSize(40);
if (allComplete || allCompleteA) {
  fill(220); // slightly brighter when gold is active
} else {
  fill(155, 155, 155); // your original gray
}
if(csa){
  text(
    "An AP Computer Science A Review Game",
    canvas.w / 2,
    canvas.h / 2 - mainTitleOffset +75
  );
}
else{
  text(
    "An AP Computer Science Principles Pseudocode Review Game",
    canvas.w / 2,
    canvas.h / 2 - mainTitleOffset +75
  );
}
fill('green');
textSize(30);
let mode = csa? "APCS-Principles":"APCS-A";
let mode2 = "Press 'space' to switch to " + mode
text(
    mode2,
    canvas.w / 2,
    canvas.h / 2 - mainTitleOffset +125
  );
  fill('green');
  textSize(35)
  textStyle('normal');
  text(
    "For more resources press 'c' to visit CS++",
    canvas.w / 2,
    canvas.h - 50
  );

    fill(255);
    textSize(60);
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
      canvas.h / 2 + 50
    );
    textSize(30);
    fill(255);
    
    if(!csa){
      text(
        "1 - Easy | Selection " + (levelComplete[0]?"✅":"❌"),
        canvas.w / 2,
        canvas.h / 2 + 150
      );
      text(
        "2 - Medium | Iteration " + (levelComplete[1]?"✅":"❌"),
        canvas.w / 2,
        canvas.h / 2 + 200
      );
      text(
        "3 - Hard | Functions & Lists " + (levelComplete[2]?"✅":"❌"),
        canvas.w / 2,
        canvas.h / 2 + 250
      );
      if(allComplete || allCompleteA){
        text(
        "Q - K-Pop Demon Hunters " + (levelComplete[3]?"✅":"❌"),
        canvas.w / 2,
        canvas.h / 2 + 300
      );
        text(
        "P - Minecraft " + (levelComplete[4]?"✅":"❌"),
        canvas.w / 2,
        canvas.h / 2 + 350
      );
      }
    }
    else{ //CSA
      text(
        "1 - Easy | Variables, Selection, String Methods " + (levelCompleteA[0]?"✅":"❌"),
        canvas.w / 2,
        canvas.h / 2 + 150
      );
      text(
        "2 - Medium | Iteration (while loops & for loops) " + (levelCompleteA[1]?"✅":"❌"),
        canvas.w / 2,
        canvas.h / 2 + 200
      );
      text(
        "3 - Hard | Arrays, ArrayList, 2d Arrays, Recursion " + (levelCompleteA[2]?"✅":"❌"),
        canvas.w / 2,
        canvas.h / 2 + 250
      );
      if(allComplete || allCompleteA){
        text(
        "Q - K-Pop Demon Hunters " + (levelCompleteA[3]?"✅":"❌"),
        canvas.w / 2,
        canvas.h / 2 + 300
      );
        text(
        "P - Minecraft " + (levelCompleteA[4]?"✅":"❌"),
        canvas.w / 2,
        canvas.h / 2 + 350
      );
      }
    }
    textStyle('normal');
    fill(150);
    textSize(40);

    text(
      "Press '1', '2', or '3' to select your level, then press ENTER/RETURN",
      canvas.w / 2,
      canvas.h - 105  
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
    if(allComplete || allCompleteA){
      textSize(30);
      fill(255,255,0)
      text(
      "** Double Jump Unlocked **",
      canvas.w / 2,
      canvas.h / 2 + 100
    ); }

  } else if (gameState === 'directions') {
      getDirections();
  } else if (gameState === 'gameOver' || gameState === 'win') {
    player.vel.x=0;
    //player.vel.y=0;
    const isWin = (gameState === 'win');

    if(isWin && !csa){
      if(currentDifficulty==='easy') levelComplete[0] = true;
      if(currentDifficulty==='medium') levelComplete[1] = true;
      if(currentDifficulty==='hard') levelComplete[2] = true;
      if(currentDifficulty==='kpop') levelComplete[3] = true;
      if(currentDifficulty==='minecraft') levelComplete[4] = true;
      if(currentDifficulty==='kpop') levelCompleteA[3] = true;
      if(currentDifficulty==='minecraft') levelCompleteA[4] = true;
    }
    if(isWin && csa){
      if(currentDifficulty==='easy') levelCompleteA[0] = true;
      if(currentDifficulty==='medium') levelCompleteA[1] = true;
      if(currentDifficulty==='hard') levelCompleteA[2] = true;
      if(currentDifficulty==='kpop') levelCompleteA[3] = true;
      if(currentDifficulty==='minecraft') levelCompleteA[4] = true;
      if(currentDifficulty==='kpop') levelComplete[3] = true;
      if(currentDifficulty==='minecraft') levelComplete[4] = true;
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
    else if(isWin) rank = rank1;
    else rank = "Complete a level to earn rank";

    if(bestRank === rank1 || bestRank === "Play to earn a rank" || bestRank === "Complete a level to earn rank") bestRank = rank;
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
    //if(currentDifficulty==='easy'){
      fill(255);
      stroke(0);
      strokeWeight(4);
      textAlign(CENTER, CENTER);
      textSize(36);
      let offOn = bgMusic.isLooping()?"off":"on";
      text('Press \'i\' for Instructions | \'esc\' to turn '+offOn+' music', canvas.w/2,canvas.h -30);
    //}   
    fill(250, 250, 250);
    stroke(0);
    strokeWeight(4);
    textAlign(LEFT, TOP);
    textSize(40);
    text('Glitches Repaired: ' + score + '/' + totalNodes, canvas.w - 600, 20);

    // door update
    if (currentDifficulty !== 'easy' && showDoorMessage && millis() < doorMessageEndTime) {
      textAlign(CENTER, CENTER);
      fill(255, 255, 0);
      textSize(45);
      text(
        'Fix all glitches and find the USB key before entering the USB Port!',
        canvas.w / 2,
        200
      );
    }


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
    if(currentDifficulty==='easy' && !foundKey && score==0){
      textAlign(CENTER, MIDDLE);
        fill(255,0,0)
        textSize(45);
        text('OBJECTIVES: Avoid the Viruses.', canvas.w/2, 200);
         textAlign(CENTER, MIDDLE);
        fill(255,0,0)
        textSize(45);
        text('Fix all glitches (don\'t touch them) using code lens.', canvas.w/2, 250);
       textAlign(CENTER, MIDDLE);
        fill(255,0,0)
        textSize(45);
        text('Find the USB Key to disable the firewall and regain stability!', canvas.w/2, 300);
  
      }
      else if(currentDifficulty==='easy' && !foundKey && score<totalNodes){
      textAlign(CENTER, MIDDLE);
        fill(255,0,0)
        textSize(45);
        text('OBJECTIVES: Avoid the Viruses.', canvas.w/2, 200);
         textAlign(CENTER, MIDDLE);
        fill(255,0,0)
        textSize(45);
        text('Find the USB Key to disable the firewall and fix all glitches!', canvas.w/2, 250);
       textAlign(CENTER, MIDDLE);
        fill(255,255,0)
        textSize(45);
        text('Hold the jump button longer to jump higher.', canvas.w/2, 300);
  
      }

    const barWidth = 400;
    const barHeight = 30;
    const padding = 20;

    fill(250, 250, 250);
    textAlign(LEFT, TOP);
        
    textSize(40);
    if(systemStability>=0) text('System Stability: ' + systemStability + '%', padding, padding);
    else text('System Stability: 0%', padding, padding);

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
    let currentMode = csa?"APCS-A Quick Reference Guide": "APCS-Principles Pseudocode"
    let headerTxt = showPseudoSummary?currentMode:"Code Lens";
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
  if (!QUESTION_NUMBERS) {
    promptText = currentQuestion.prompt.replace(/^.*?:\s*/, '');
  }

  const promptBottomY = drawWrappedText(
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

  const codeX    = qX;
  const choicesX = qX + columnWidth + gutter;

  // ============================
  // CODE BLOCK (LEFT COLUMN)
  // ============================
  textStyle('normal');
  textSize(26);
  fill(200, 255, 200);

  const codeLines   = currentQuestion.code.split('\n');
  let codeY         = columnTopY;
  let codeIndent    = 0;
  const codeIndentSize = 40;
  const codeBaseX   = codeX + 40;

  for (let i = 0; i < codeLines.length; i++) {
    let line = codeLines[i].trim();

    if (line.startsWith('}')) {
      codeIndent = Math.max(0, codeIndent - 1);
    }

    const x = codeBaseX + codeIndent * codeIndentSize;

    codeY = drawWrappedText(line, x, codeY, columnWidth, 1.5);

    if (line.endsWith('{')) {
      codeIndent++;
    }

    codeY += 8;
  }

  const codeBottomY = codeY;

  // ANSWER CHOICES (RIGHT COLUMN)
textSize(24);
textAlign(LEFT, TOP);

const labels = ['1', '2', '3', '4'];
let choicesY = columnTopY;

const maxAnswerWidth = columnWidth;  // width of the right column
const lineHeight     = 30;
const optionGap      = 32;

const answersToShow =
  currentShuffledAnswers && currentShuffledAnswers.length === 4
    ? currentShuffledAnswers
    : currentQuestion.choices;

for (let i = 0; i < answersToShow.length; i++) {
  const label        = labels[i] || (i + 1) + '.';
  const labelText    = label + '. ';
  const labelWidth   = textWidth(labelText);         // how wide "1. " is
  const textX        = choicesX + labelWidth;        // start of the answer text
  const widthLimit   = maxAnswerWidth - labelWidth;  // usable width for wrapping

  const optionNumber   = i + 1;
  const isCorrect      = (optionNumber === currentCorrectAnswerNumber);
  const isPlayerChoice = (codeLensPlayerChoice === optionNumber);

  // --- split the *answer text* (no label) into logical lines ---
  const logicalLines = String(answersToShow[i]).split('\n');
  const wrappedLines = [];

  for (let li = 0; li < logicalLines.length; li++) {
    const rawLine = logicalLines[li];

    if (rawLine.length === 0) {
      // preserve blank line
      wrappedLines.push('');
      continue;
    }

    const words = rawLine.split(' ');
    let line = '';

    for (let w = 0; w < words.length; w++) {
      const testLine = line.length > 0 ? line + ' ' + words[w] : words[w];
      if (textWidth(testLine) > widthLimit) {
        wrappedLines.push(line);
        line = words[w];
      } else {
        line = testLine;
      }
    }
    if (line.length > 0) {
      wrappedLines.push(line);
    }
  }

  // --- coloring logic ---
  if (codeLensAnswered) {
    if (isCorrect) {
      if (!correctSoundPlaying && isPlayerChoice) {
        correctSound.play();
        correctSoundPlaying = true;
      }
      textStyle('bold');
      fill(0, 255, 0);
    } else if (isPlayerChoice) {
      if (!wrongSoundPlaying) {
        wrongSound.play();
        wrongSoundPlaying = true;
      }
      textStyle('normal');
      fill(255, 80, 80);
    } else {
      textStyle('normal');
      fill(180);
    }
  } else {
    textStyle('bold');
    fill(255);
  }

  const blockTopY = choicesY;

  // draw label once at the top of the block
  text(labelText, choicesX, blockTopY);

  // draw each wrapped line aligned after the label
  for (let j = 0; j < wrappedLines.length; j++) {
    text(wrappedLines[j], textX, blockTopY + j * lineHeight);
  }

  // move Y down by the full height of this answer block plus gap
  const blockHeight = wrappedLines.length * lineHeight;
  choicesY = blockTopY + blockHeight + optionGap;
}

const choicesBottomY = choicesY;
const contentBottomY = Math.max(codeBottomY, choicesBottomY);





  // ============================
  // HINT SECTION
  // ============================
  fill(200);
  textSize(30);
  const hintY = overlayY + overlayH - 80;

  const hintText = codeLensAnswered
    ? "Press 'enter' to continue or 'i' to see " + currentMode
    : "Press 1, 2, 3, or 4 to choose your fix or 'i' to see " + currentMode;

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
      "Once you've stabilized the system, exit throught the USB port, but only after you've found the golden USB key to disable the firewall and regain stability. Exiting before you've fixed all the glitches and the system is doomed!",
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
    y = drawWrappedText("JUMP:               SPACE or ↑ (hold to jump higher)", padding, y, boxWidth);
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

    fill(255);
    textSize(36);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    let currentMode = csa?"APCS-A Quick Reference Guide": "APCS-Principles Pseudocode"
    text("Press 'i' for " + currentMode + " or Press 'esc' to return " + loc, canvas.w/2, canvas.h - 45);
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

    camera.x = (targetX / snap) * snap;
    camera.y = (targetY / snap) * snap;
  }
  function drawPseudocode(){
    fill(0, 0, 0, 225);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);
    const overlayPadding = 50;
    const overlayX = overlayPadding;
    const overlayY = overlayPadding;
    const overlayW = canvas.w - overlayPadding * 2;
    const overlayH = canvas.h - overlayPadding * 2;

    fill(0, 0, 0, 200);
    stroke(50, 205, 50, 255);
    strokeWeight(4);
    // rect(overlayX, overlayY, overlayW, overlayH, 10);

    noStroke();
    fill(50, 205, 50);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    textSize(60);
    let currentMode = csa?"APCS-A Quick Reference Guide": "APCS-Principles Pseudocode"

    let headerTxt = showPseudoSummary?currentMode:"Code Lens";
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
        let summaryLeft, summaryRight;
        // -------------------------
        // TWO-COLUMN CONTENT
        // -------------------------
        if(!csa){
          summaryLeft = [
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

          summaryRight = [
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
        }
        else{ // CSA
          // -------------------------
// TWO-COLUMN CONTENT (AP CSA 2026)
// Based on the Java Quick Reference
// -------------------------

summaryLeft = [
  { header: "STRING CLASS:" },
  "String s = new String(\"hi\");",
  "s.length()           // number of chars",
  "s.substring(from, to) // [from, to-1]",
  "s.substring(from)     // from to end",
  "s.indexOf(str)        // first index or -1",
  "s.equals(other)       // content equality",
  "s.compareTo(other)    // <0, 0, >0 by alphabet",
  "s.split(delim)        // String[] pieces",

  "",
  { header: "INTEGER & DOUBLE:" },
  "Integer.MIN_VALUE / Integer.MAX_VALUE",
  "Integer.parseInt(str)   // String → int",
  "Double.parseDouble(str) // String → double",

  "",
  { header: "MATH CLASS:" },
  "Math.abs(x)      // |x| (int/double)",
  "Math.pow(b, e)   // b^e",
  "Math.sqrt(x)     // √x (x ≥ 0)",
  "Math.random()    // 0.0 ≤ x < 1.0"
];

summaryRight = [
  { header: "ARRAYLIST<E>:" },
  "list.size()            // number of elements",
  "list.add(obj)          // append, returns true",
  "list.add(i, obj)       // insert at i, shift right",
  "list.get(i)            // element at index i",
  "list.set(i, obj)       // replace, returns old",
  "list.remove(i)         // remove, shift left, returns old",

  "",
  { header: "FILE & SCANNER:" },
  "File f = new File(pathname);",
  "Scanner in = new Scanner(f);",
  "in.nextInt() / nextDouble() / nextBoolean()",
  "in.nextLine()   // whole line (may be empty)",
  "in.next()       // next token",
  "in.hasNext()    // more data?",
  "in.close();     // close scanner",

  "",
  { header: "OBJECT CLASS:" },
  "obj.equals(other)  // custom equality",
  "obj.toString()     // String form"
];
        }
        //END REFERENCE GUIDE

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
        textStyle(BOLD);
        fill(255);
        textSize(36);        
        textAlign(CENTER)
        const hintY = overlayY + overlayH - 0;
        
        if (gameState === 'paused') {
          drawWrappedText(
          "Press 'esc' to return to the question",
          canvas.w/2,
          hintY,
          textBoxWidth,
          1.2
        );
        }
        else{
        drawWrappedText(
          "Press 'i' to see Instructions or Press 'esc' to return " + loc,
          canvas.w/2,
          hintY,
          textBoxWidth,
          1.2
        );
      }
        // pop();
        return; // prevent question UI from drawing
    }
  }
  pop();
  drawCRTOverlay();
}