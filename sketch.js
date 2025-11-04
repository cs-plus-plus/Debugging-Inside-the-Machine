/**
 * Debugging: Inside the Machine
 *
 * This version includes:
 * - Difficulty selection (1 = Easy, 2 = Medium, 3 = Hard)
 * - Start + Directions screens
 * - Touching a coin DAMAGES you (no Code Lens)
 * - Code Lens near coins (press C), then:
 *   - 4-option multiple choice (press 1,2,3,4)
 *   - Exactly one correct answer, others incorrect
 *   - Correct: +1 node fixed, +5 stability, coin -> grass
 *   - Incorrect: -10 stability, coin stays
 * - System Stability drain over time
 * - Combined Results Screen for both Win and Game Over:
 *   - Shows Nodes Fixed, Nodes Attempted, Accuracy, % Stabilized, Rank
 * - Custom code font loaded from assets (monospace look)
 */

let player, groundSensor, grass, platforms, coins, enemies, lwall, rwall;
let grassImg, coinsImg, charactersImg, brickImg;
let codeFont; // custom code-looking font

let score = 0;
let systemStability = 100;

// Required globals
let showCodeLensButton = false;
let stabilityTimer = 0;
const stabilityInterval = 1000; // 1000 ms = 1 second
let nearestCoin = null; // Coin currently targeted by Code Lens
const ROAM_SPEED = 1.5;

// Game state
let gameState = 'start'; // 'start', 'directions', 'play', 'paused', 'gameOver', 'win'

// difficulty: 'easy', 'medium', 'hard'
let currentDifficulty = 'hard';

// Will be set from the tilemap based on the number of coins
let totalNodes = 0;

// Track Code Lens decisions
let nodesAttempted = 0;

// World bounds (for camera constraints)
let mapLeft = 0;
let mapRight = 2000;
let mapTop = -1600;
let mapBottom = 1600;

// Player spawn (set when building the tilemap)
let playerStartX;
let playerStartY;

// Damage flash timer (ms)
let damageFlashTimer = 0;

// --- Demo coin animation variables for Directions screen ---
let demoCoinFrame = 0;
let demoCoinFrameTimer = 0;
const demoCoinFrameDelay = 80; // milliseconds per frame


// ====== QUESTION SYSTEM ======

// current question + answer state
let questionBanks;
let usedQuestionIndices = {
  easy: [],
  medium: [],
  hard: []
};
let currentQuestion = null;
let currentQuestionIndex = -1;
let currentShuffledAnswers = [];
let currentCorrectAnswerNumber = 1; // 1..4

// =======================
// STATIC TILEMAPS
// g = grass, p = platform, c = coin (node), e = enemy, l = left wall, r = right wall
// =======================

// EASY LEVEL: few coins, few enemies, mostly flat
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

// MEDIUM LEVEL: more height, more coins/enemies
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

// HARD LEVEL: original map
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

// --------- TEXT WRAP HELPER ---------
// Draw multi-line wrapped text and return the next y position
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

  return y; // next Y position
}


function getTilemapForDifficulty(diff) {
  if (diff === 'easy') return tilemapEasy;
  if (diff === 'medium') return tilemapMedium;
  return tilemapHard;
}

new Q5();

new Canvas(2000, 1600);
displayMode('maxed', 'pixelated');

grassImg = loadImage('assets/grass.png');
coinsImg = loadImage('assets/coin.png');
charactersImg = loadImage('assets/characters.png');
brickImg = loadImage('assets/brick.png');

// 👇 load your custom font (make sure this file exists)
codeFont = loadFont('assets/SourceCodePro-Regular.ttf');

// ====== QUESTION BANKS (5 easy, 10 medium, 15 hard) ======

questionBanks = {
  easy: [
    {
      prompt: "A loop is running, but it NEVER stops. What is the most likely bug?",
      correct: "The loop condition is never becoming false.",
      incorrect: [
        "The computer ran out of electricity.",
        "The variables forgot their values.",
        "The semicolons are too shiny."
      ]
    },
    {
      prompt: "You get an error: 'undefined is not a function'. What does this usually mean?",
      correct: "You tried to call something as a function that isn't defined as one.",
      incorrect: [
        "The computer refuses to do math today.",
        "Your keyboard is not plugged in.",
        "The Wi-Fi signal is too weak."
      ]
    },
    {
      prompt: "What is the BEST first step when you see a bug?",
      correct: "Reproduce the bug and read the error or behavior carefully.",
      incorrect: [
        "Delete your whole project and start over.",
        "Press random keys until it works.",
        "Blame the hardware and go home."
      ]
    },
    {
      prompt: "What does it mean to 'debug' a program?",
      correct: "Find and fix mistakes in the code.",
      incorrect: [
        "Make the program run slower on purpose.",
        "Add more bugs so it's more realistic.",
        "Turn the code into pictures."
      ]
    },
    {
      prompt: "Why are print/log statements useful in debugging?",
      correct: "They show the values of variables while the program runs.",
      incorrect: [
        "They change how fast the CPU spins.",
        "They automatically fix your bugs.",
        "They make the code look cooler."
      ]
    }
  ],
  medium: [
    {
      prompt: "A variable 'score' always prints as 0, even after you change it. What might be wrong?",
      correct: "You are printing a different 'score' variable than the one you update.",
      incorrect: [
        "The number 0 is stuck in memory forever.",
        "The print function is allergic to larger numbers.",
        "The font can only draw zeros."
      ]
    },
    {
      prompt: "You see a bug only when you press jump AND move right at the same time. What kind of bug is this?",
      correct: "A logic bug that appears only under certain input combinations.",
      incorrect: [
        "A graphics card scratch.",
        "A random cosmic ray glitch only.",
        "A network error in offline mode."
      ]
    },
    {
      prompt: "Why might using global variables cause tricky bugs?",
      correct: "Many parts of the code can change them, making it hard to track what happened.",
      incorrect: [
        "Globals are stored off-planet and take longer to reach.",
        "They randomly rename themselves.",
        "They can only store prime numbers."
      ]
    },
    {
      prompt: "What is an 'off-by-one' error?",
      correct: "When a loop or index goes one step too far or not far enough.",
      incorrect: [
        "A bug that only appears at exactly 1:00 AM.",
        "A missing number 1 key on the keyboard.",
        "A loop that runs only once."
      ]
    },
    {
      prompt: "Your if-statement uses '=' instead of '=='. What is the likely result?",
      correct: "You assign a value instead of comparing, changing program behavior.",
      incorrect: [
        "The computer politely corrects it for you.",
        "The code prints your password.",
        "Nothing changes; they mean the same thing."
      ]
    },
    {
      prompt: "Which tool is best for stepping through code line-by-line?",
      correct: "A debugger or breakpoint tool.",
      incorrect: [
        "A text editor with dark mode.",
        "A faster keyboard.",
        "A screenshot app."
      ]
    },
    {
      prompt: "A function behaves differently the second time you call it. What might be happening?",
      correct: "It modifies shared state or global variables between calls.",
      incorrect: [
        "The CPU gets bored and improvises.",
        "The function forgets it exists.",
        "The compiler shuffles the lines randomly."
      ]
    },
    {
      prompt: "You see a 'null reference' or 'undefined' error. What should you check first?",
      correct: "Whether the variable actually has a value before you use it.",
      incorrect: [
        "Whether your monitor is plugged in.",
        "Whether your game character is smiling.",
        "Whether you used enough comments."
      ]
    },
    {
      prompt: "Why is it helpful to test with extreme or edge case values?",
      correct: "They reveal bugs that normal input might hide.",
      incorrect: [
        "Edge values make the program run twice as fast.",
        "They automatically compress your code.",
        "They unlock secret developer achievements."
      ]
    },
    {
      prompt: "Your game stutters when many enemies spawn. What is the best debugging focus?",
      correct: "Performance: check loops, physics, and unnecessary calculations.",
      incorrect: [
        "The color of your sprites.",
        "How many comments you wrote.",
        "The position of your mouse while coding."
      ]
    }
  ],
  hard: [
    {
      prompt: "A bug appears only after the game runs for several minutes. What is this commonly related to?",
      correct: "A resource leak or slow growth of memory/objects over time.",
      incorrect: [
        "The keyboard getting tired.",
        "The system clock running out of seconds.",
        "The monitor losing brightness."
      ]
    },
    {
      prompt: "You fix one bug, but three more appear in completely different systems. What might be happening?",
      correct: "Your fix changed shared state or assumptions used in multiple places.",
      incorrect: [
        "The computer is punishing you for debugging.",
        "The IDE automatically adds new bugs.",
        "The OS is rolling a random bug generator."
      ]
    },
    {
      prompt: "What is the main advantage of writing small, focused functions for debugging?",
      correct: "They isolate behavior so bugs are easier to locate and reason about.",
      incorrect: [
        "They make your file size physically lighter.",
        "They allow the CPU fan to spin quieter.",
        "They look cooler in the file explorer."
      ]
    },
    {
      prompt: "You suspect a race condition in an asynchronous system. What is a good debugging move?",
      correct: "Add logging around shared state access and run many times to spot timing patterns.",
      incorrect: [
        "Sort your files alphabetically and hope it vanishes.",
        "Change all variables to global ones.",
        "Disable all error messages."
      ]
    },
    {
      prompt: "Why is copying and pasting error messages into a search engine useful?",
      correct: "Others may have seen the same error and solutions can reveal the true cause.",
      incorrect: [
        "Search engines can secretly patch your code.",
        "It impresses the compiler.",
        "It automatically upgrades your hardware."
      ]
    },
    {
      prompt: "A function works in one file but breaks when you reuse it in another. Likely cause?",
      correct: "The new context has different assumptions (data shape, timing, or environment).",
      incorrect: [
        "The function misses its original file.",
        "Functions can only live in the first file.",
        "The new file doesn't like that function's name."
      ]
    },
    {
      prompt: "What is a 'Heisenbug'?",
      correct: "A bug that disappears or changes behavior when you try to observe or debug it.",
      incorrect: [
        "A bug that can time-travel.",
        "A bug that only appears on Tuesdays.",
        "A bug caused by quantum keyboards."
      ]
    },
    {
      prompt: "Why might you temporarily remove features or code paths while debugging?",
      correct: "To shrink the problem space and isolate the exact source of the bug.",
      incorrect: [
        "To make the code jealous and behave.",
        "To keep the CPU from overheating.",
        "To confuse future readers more."
      ]
    },
    {
      prompt: "How can writing tests help debug complex systems?",
      correct: "They lock in correct behavior and reveal when new changes break old features.",
      incorrect: [
        "Tests turn your code into machine learning.",
        "They automatically write documentation.",
        "They remove the need to ever run the program."
      ]
    },
    {
      prompt: "Your physics objects sometimes tunnel through walls. Which check is most relevant?",
      correct: "Collision step or speed being too high for the physics timestep.",
      incorrect: [
        "The brightness of your monitor.",
        "How many comments you wrote.",
        "The language you speak while coding."
      ]
    },
    {
      prompt: "Why can duplicated logic in multiple places create hidden bugs?",
      correct: "Fixes might only be applied in some places, leaving inconsistent behavior.",
      incorrect: [
        "The CPU charges extra for repeated logic.",
        "The compiler ignores any repeated lines.",
        "Repeated logic erases variables from RAM."
      ]
    },
    {
      prompt: "Logs are flooding your console. What is a better debugging approach?",
      correct: "Add fewer, more targeted logs or use log levels (info/warn/error).",
      incorrect: [
        "Turn your monitor upside down.",
        "Enable all logs in all libraries forever.",
        "Change logs to a random language."
      ]
    },
    {
      prompt: "Why is it risky to 'just catch and ignore' all errors?",
      correct: "It hides real problems and makes the program fail in strange ways later.",
      incorrect: [
        "Errors get offended and attack the CPU.",
        "It slows down the mouse cursor.",
        "It deletes temporary files only."
      ]
    },
    {
      prompt: "A function behaves differently on two machines. Good first question?",
      correct: "Are the environments, versions, or configuration files the same?",
      incorrect: [
        "Is one machine left-handed?",
        "Is the window size exactly identical?",
        "Is the code feeling shy on one machine?"
      ]
    },
    {
      prompt: "What is the benefit of writing down hypotheses while debugging?",
      correct: "It keeps your reasoning clear and prevents you from repeating failed ideas.",
      incorrect: [
        "The computer reads your notes and fixes itself.",
        "It increases your monitor resolution.",
        "It doubles your typing speed."
      ]
    }
  ]
};

// Pick a question and randomize answers
function prepareQuestionForCurrentDifficulty() {
  const bank = questionBanks[currentDifficulty];
  if (!bank || bank.length === 0) return;

  const used = usedQuestionIndices[currentDifficulty] || [];
  let available = [];
  for (let i = 0; i < bank.length; i++) {
    if (!used.includes(i)) available.push(i);
  }

  let index;
  if (available.length > 0) {
    index = random(available); // p5: random element from array
  } else {
    // all used, so allow reuse (fallback)
    index = floor(random(bank.length));
  }

  currentQuestionIndex = index;
  currentQuestion = bank[index];

  // Build and shuffle answers
  const answers = [currentQuestion.correct, ...currentQuestion.incorrect];
  currentShuffledAnswers = shuffle(answers);
  currentCorrectAnswerNumber =
    currentShuffledAnswers.indexOf(currentQuestion.correct) + 1;
}

// When we answer correctly, mark question as used
function markCurrentQuestionUsed() {
  if (currentQuestionIndex < 0) return;
  const used = usedQuestionIndices[currentDifficulty];
  if (!used.includes(currentQuestionIndex)) {
    used.push(currentQuestionIndex);
  }
}

// Build or rebuild world from a tilemap
function buildWorldFromTilemap(tilemap) {
  const tileSize = 16;

  // Clear existing tiles/sprites from tile groups
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

  new Tiles(
    tilemap,
    mapLeft,
    mapTop,
    tileSize,
    tileSize
  );

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

// Change difficulty from start screen
function setDifficulty(diff) {
  currentDifficulty = diff;
  score = 0;
  systemStability = 100;
  nodesAttempted = 0;
  damageFlashTimer = 0;
  showCodeLensButton = false;
  nearestCoin = null;

  // reset used questions for this difficulty
  usedQuestionIndices[diff] = [];
  currentQuestion = null;
  currentQuestionIndex = -1;
  currentShuffledAnswers = [];
  currentCorrectAnswerNumber = 1;

  gameState = 'start';
  world.active = false;
  if (allSprites) {
    allSprites.forEach(s => {
      if (s.ani) s.ani.stop();
    });
  }

  const tm = getTilemapForDifficulty(diff);
  buildWorldFromTilemap(tm);
}

function setup() {
  world.gravity.y = 10;
  allSprites.pixelPerfect = true;
  allSprites.autoDraw = false;

  // Game starts paused
  world.active = false;

  // Use the custom code font everywhere
   if (codeFont) textFont(codeFont);
   else  textFont('Courier New');
  //  textWrap(WORD);


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

  // Build initial (hard) world
  buildWorldFromTilemap(getTilemapForDifficulty(currentDifficulty));

  // --- PLAYER + GROUND SENSOR ---

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

  player.overlaps(coins, touchCoinDamage);
  player.overlaps(enemies, hitEnemy);

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

  world.active = false;
  allSprites.forEach(s => {
    if (s.ani) s.ani.stop();
  });
}

// --- COIN TOUCH = DAMAGE (NO CODE LENS) ---

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

  damageFlashTimer = 300;

  if (systemStability <= 0) {
    triggerGameOver();
  }
}

// --- MAIN UPDATE LOOP ---

function update() {

  // --- 1. State-based Input ---

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
  }
  else if (gameState === 'directions') {
    if (kb.presses('escape')) {
      gameState = 'start';
    }
     demoCoinFrameTimer += deltaTime;
  if (demoCoinFrameTimer >= demoCoinFrameDelay) {
    demoCoinFrame = (demoCoinFrame + 1) % 14; // 14 frames in the coin sprite sheet
    demoCoinFrameTimer = 0;
  }
  }
  else if (gameState === 'play') {
    // Only Code Lens via 'c' near a coin
    if (kb.presses('c') && showCodeLensButton && nearestCoin) {
      prepareQuestionForCurrentDifficulty();
      gameState = 'paused';
      world.active = false;
      allSprites.forEach(s => {
        if (s.ani) s.ani.stop();
      });
    }
  }
  else if (gameState === 'paused') {
    // One of the 4 answers
    let choice = null;
    if (kb.presses('1')) choice = 1;
    else if (kb.presses('2')) choice = 2;
    else if (kb.presses('3')) choice = 3;
    else if (kb.presses('4')) choice = 4;

    if (choice !== null) {
      if (nearestCoin) {
        nodesAttempted++;

        if (choice === currentCorrectAnswerNumber) {
          // CORRECT
          let coinX = nearestCoin.x;
          let coinY = nearestCoin.y;
          nearestCoin.remove();
          new grass.Sprite(coinX, coinY);

          systemStability += 5;
          if (systemStability > 100) systemStability = 100;

          score++;
          markCurrentQuestionUsed(); // don't reuse this question this run
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
          // INCORRECT
          systemStability -= 10;
          if (systemStability < 0) systemStability = 0;
          damageFlashTimer = 300;

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
        // No coin, just resume
        gameState = 'play';
        world.active = true;
        allSprites.forEach(s => {
          if (s.ani) s.ani.play();
        });
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

    // Enemy movement
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

    // Camera constraint logic
    let cameraViewHalfWidth = (canvas.w / camera.zoom) / 2;
    let cameraViewHalfHeight = (canvas.h / camera.zoom) / 2;

    let minX = mapLeft + cameraViewHalfWidth;
    let maxX = mapRight - cameraViewHalfWidth;
    let minY = mapTop + cameraViewHalfHeight;
    let maxY = mapBottom - cameraViewHalfHeight;

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

  // --- 5. GUI / SCREENS (screen space) ---

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
  }

   else if (gameState === 'directions') {
  fill(0, 0, 0, 225);
  noStroke();
  rect(0, 0, canvas.w, canvas.h);

  let padding = 80;
  let boxWidth = canvas.w - padding * 2;

  // --- TITLE ---
  fill(255);
  textSize(80);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text("SYSTEM BRIEFING // MISSION: DEBUGGING", canvas.w / 2, padding);

  // --- BODY TEXT ---
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

  // --- VISUAL EXAMPLES ROW: GLITCH (coin) & VIRUS (brick) ---
  let centerX = canvas.w / 2;
  let iconY = y + 60;
  let iconSpacing = 260; // distance between glitch + virus centers
  let iconSize = 80;     // how big to draw them on screen

  imageMode(CENTER);

  // GLITCH (coin/node) example
  let glitchX = centerX - iconSpacing / 2;

  // animated coin frame from coinsImg:
  // each frame is 16x16, row 0, frame index demoCoinFrame
  let sx = demoCoinFrame * 16;
  let sy = 0;
  let sw = 16;
  let sh = 16;
  noStroke();
  image(coinsImg, glitchX - 140, iconY+40, iconSize, iconSize, sx, sy, sw, sh);

  // label for glitch
  fill(50, 205, 50);
  textSize(40);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  drawWrappedText("GLITCH", glitchX - 290, iconY + iconSize / 2 + 10, 140);

  // VIRUS (enemy) example using brickImg
  let virusX = centerX + iconSpacing / 2;

  // brick image (static enemy)
  noStroke();
  // assuming brickImg is 16x16; if it's larger, it will be scaled to iconSize
  image(brickImg, virusX + 250, iconY + 40, iconSize, iconSize);

  // label for virus
  fill(255, 80, 80);
  textSize(40);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  drawWrappedText("VIRUS", virusX +110, iconY + iconSize / 2 + 10, 140);

  imageMode(CENTER); // reset for rest of the game

  // move y down below icons
  y = iconY + iconSize / 2 + 150;

  // --- CONTROLS ---
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

  // --- BACK HINT ---
  fill(150);
  textSize(40);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  text("Press 'esc' to return Home", canvas.w / 2, canvas.h - 100);
}



  // ===== COMBINED RESULTS SCREEN =====
  else if (gameState === 'gameOver' || gameState === 'win') {
    const isWin = (gameState === 'win');

    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, canvas.w, canvas.h);

    let headingColor = isWin ? color(0, 255, 0) : color(255, 0, 0);
    let headingText = isWin ? "System Stabilized" : "System Failure";

    let percentFixed = totalNodes > 0 ? (score / totalNodes) * 100 : 0;
    let accuracy = nodesAttempted > 0 ? (score / nodesAttempted) * 100 : 0;

    let rank;
    if (accuracy >= 90) {
      rank = "S-Rank: Kernel Guardian";
    } else if (accuracy >= 70) {
      rank = "A-Rank: Core Debugger";
    } else if (accuracy >= 40) {
      rank = "B-Rank: Stack Tracer";
    } else {
      rank = "C-Rank: Glitch Magnet";
    }

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
  }

  else if (gameState === 'play') {
    // HUD
    fill(250, 250, 250, 200);
    stroke(0);
    strokeWeight(4);
    textAlign(RIGHT, TOP);
    textSize(50);
    text('Nodes Fixed: ' + score + ' / ' + totalNodes, canvas.w - 20, 20);

    let barWidth = 400;
    let barHeight = 30;
    let padding = 20;

    fill(250, 250, 250, 200);
    textAlign(LEFT, TOP);
    textSize(40);
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
      textSize(60);
      textStyle(BOLD);

      let buttonW = textWidth(buttonText) + 60;
      let buttonH = 220;
      let paddingBtn = 20;
      let buttonX = canvas.w - buttonW - paddingBtn;
      let buttonY = canvas.h - buttonH - paddingBtn;

      fill(0, 0, 0, 120);
      stroke(50, 205, 50, 255);
      strokeWeight(4);
      rect(buttonX, buttonY, buttonW, buttonH, 10);

      noStroke();
      fill(50, 205, 50);
      textAlign(CENTER, CENTER);
      text(buttonText, buttonX + buttonW / 2, buttonY + buttonH / 2 - 40);
      textSize(40);
      textStyle('normal');
      textStyle('italic');
      text('press \'c\'', buttonX + buttonW / 2, buttonY + buttonH / 2 + 50);
      textStyle('normal');
    }
  }

  else if (gameState === 'paused') {
  let overlayPadding = 50;
  let overlayX = overlayPadding;
  let overlayY = overlayPadding;
  let overlayW = canvas.w - (overlayPadding * 2);
  let overlayH = canvas.h - (overlayPadding * 2);

  fill(0, 0, 0, 180);
  stroke(50, 205, 50, 255);
  strokeWeight(4);
  rect(overlayX, overlayY, overlayW, overlayH, 10);

  noStroke();
  fill(50, 205, 50);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  textSize(72);
  text("Code Lens", canvas.w / 2, overlayY + 30);

  if (currentQuestion) {
    // Question & options area
    let qX = overlayX + 60;
    let qY = overlayY + 140;
    let textBoxWidth = overlayW - 120;

    textAlign(LEFT, TOP);

    // Question
    textSize(44);  // bigger question text
    let nextY = drawWrappedText(currentQuestion.prompt, qX, qY, textBoxWidth, 1.4);

    // Options
    textSize(38);
    nextY += 30;
    for (let i = 0; i < currentShuffledAnswers.length; i++) {
      const label = (i + 1) + ") " + currentShuffledAnswers[i];
      nextY = drawWrappedText(label, qX, nextY, textBoxWidth, 1.3);
      nextY += 10; // extra space between options
    }

    // Hint line at the bottom
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
  }
}

  // --- Red damage flash overlay ---
  if (damageFlashTimer > 0) {
    damageFlashTimer -= deltaTime;
    if (damageFlashTimer < 0) damageFlashTimer = 0;
    noStroke();
    fill(255, 0, 0, 150);
    rect(0, 0, canvas.w, canvas.h);
  }

  pop();
}
