# Debugging: Inside the Machine 🖥️🪲

A p5.js + p5play arcade platformer where you dive *inside* a malfunctioning computer and debug it from the inside out.

You’re a tiny avatar running along circuit-like platforms, chasing down corrupted nodes, dodging rogue bugs, and using a special **Code Lens** to decide how to fix broken logic. Stabilize the system before it crashes!

---

## ✨ Core Concept

The system is unstable.  
Corrupted **nodes** (coins) and rogue **bugs** (enemies) are scattered through a 2D world of tiles.

Your goals:

- **Inspect and repair nodes** to stabilize the system.
- **Avoid bugs** and bad fixes that make things worse.
- **Keep System Stability above 0%.**
- **Fix all nodes** to fully stabilize the machine and win.

---

## 🎮 Controls

### Movement & Jumping

- **Move Left:** `←` or `A`
- **Move Right:** `→` or `D`
- **(Optional) Vertical Movement:** `↑` or `W` and `↓` or `S` if enabled in your version
- **Jump:** `SPACE` (or `↑` in some control schemes)

### Game States

- **Start Game:** `ENTER` from the title screen  
- **Open Directions Screen:** `D` on the start screen  
- **Return from Directions:** `ESC`  

### Code Lens / Debugging

When you’re near a corrupted node (coin), a **“Code Lens”** button appears on the HUD.

- **Enter Code Lens View (Pause Near a Node):**
  - Touch a coin (player overlaps it), **or**
  - Be near a coin while the Code Lens button is visible and press `C`.

This pauses the game and brings up the **Code Lens** overlay.

Inside Code Lens, choose how to “fix” the logic:

- **`1` – Correct Logic**
  - Unpauses the game
  - Removes the coin
  - Replaces it with **grass** (a stable tile)
  - **Score +1 node fixed**
  - **System Stability +5%** (capped at 100%)

- **`2` – Incorrect Logic**
  - Unpauses the game
  - Removes the coin
  - Replaces it with a **brick enemy** (a new bug)
  - **System Stability –10%**
  - If Stability reaches 0, the system crashes (Game Over)

### Pausing & Restarting

- **Pause into Code Lens:** `C` (when the Code Lens button is available)
- **Game Over / Win – Restart:** `P` (reloads the page / restarts the sketch)

---

## 🧠 System Stability

Your **System Stability** is shown as a percentage bar at the top-left of the screen.

- Stability **slowly drains over time** during gameplay.
- Choosing **correct logic (`1`)** while in Code Lens:
  - Increases stability by **+5** (up to a max of 100).
- Choosing **incorrect logic (`2`)**:
  - Decreases stability by **–10**.
- Colliding with enemies also reduces stability.
- If stability hits **0**, you get a **System Failure** screen.

---

## 🎯 Win & Lose Conditions

### Win – “System Stabilized”

You **win** when:

- You’ve fixed **all nodes** (coins in the tilemap) using correct logic.
- Your score (`Nodes Fixed`) reaches `totalNodes`.

The **Win Screen** will display:

- “System Stabilized”
- An option to **press `P` to play again**

### Lose – “System Failure”

You **lose** when:

- **System Stability** drops to **0%**.

The **Game Over Screen** shows:

- “System Failure”
- How many nodes you fixed
- The final percentage of system stabilized
- A prompt to **press `P` to restart**

---

## 🧱 World & Tilemap

The level is built from a **static tilemap** using characters to represent tiles:

- `g` – **Grass** (solid ground / walls)
- `p` – **Platforms** (floating or mid-air platforms)
- `c` – **Coins / Nodes** (corrupted nodes to inspect)
- `e` – **Enemies / Bugs** (moving bricks)
- Space – Empty air

In the code, a static `const tilemap = [ ... ]` array is passed to:

```js
new Tiles(tilemap, 0, 0, 16, 16);
```

This automatically spawns:

- Static grass tiles (Group: `grass`, `tile = 'g'`)
- Static platform tiles (Group: `platforms`, `tile = 'p'`)
- Coin sprites with animations (Group: `coins`, `tile = 'c'`)
- Enemy sprites (Group: `enemies`, `tile = 'e'`)

Enemies orbit around their spawn points using a simple circular motion based on `sin`/`cos`.

---

## 🕹 How the Game Logic Works (High Level)

- **Game States**  
  The game uses a `gameState` variable:
  - `'start'` – Title screen
  - `'directions'` – Instructions / story screen
  - `'play'` – Active gameplay
  - `'paused'` – Code Lens inspection state
  - `'gameOver'` – System Failure
  - `'win'` – System Stabilized

- **Start Screen**
  - Shows the title: **“Debugging: Inside the Machine”**
  - Prompts:
    - `ENTER` to start
    - `D` for directions

- **Directions Screen**
  - Explains the story:
    - You’re a debugger inside a glitching machine
    - Nodes = corrupted data
    - Bricks = rogue code loops
  - Explains controls and goals in a thematic way

- **Update Loop (`update()`)**
  - Handles:
    - Player movement & jumping
    - Enemy circular motion
    - Stability timer drain
    - Proximity to coins and Code Lens visibility
    - Game state transitions

- **Drawing / Camera**
  - World is drawn with `allSprites.draw()` while the camera is on.
  - UI/HUD (text, bars, overlays) are drawn after calling `camera.off()` and `resetMatrix()`.

---

## 🛠 Running the Game Locally

You’ll need:

- **p5.js**
- **p5play (v3 / Q5)** – since the code uses `new Q5()` and `new Sprite()`, `new Group()`, `new Tiles()`.

### 1. File Structure

```text
project/
├─ index.html
├─ sketch.js        // your main game code
└─ assets/
   ├─ grass.png
   ├─ coin.png
   ├─ characters.png
   └─ brick.png
```

Make sure your image paths in `loadImage()` match this structure:

```js
grassImg = loadImage('assets/grass.png');
coinsImg = loadImage('assets/coin.png');
charactersImg = loadImage('assets/characters.png');
brickImg = loadImage('assets/brick.png');
```

### 2. Example `index.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Debugging: Inside the Machine</title>
  </head>
  <body>
    <!-- p5.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
    <!-- p5play v3 (Q5) -->
    <script src="https://p5play.org/v3/p5play.js"></script>

    <!-- Your game code -->
    <script src="sketch.js"></script>
  </body>
</html>
```

Then open `index.html` in a browser (or use a local server if needed).

---

## 🎨 Assets & Visual Style

- **Grass / Platforms:** pixel-art tiles (originally ground/grass, now can be styled as circuit-board platforms).
- **Coins:** animated sprites representing corrupted nodes.
- **Characters:** sprite sheet for the player animations (idle, run, jump).
- **Bricks:** used as enemy “bug” visuals.

You can swap in your own art as long as the dimensions and file paths stay consistent.

---

## 💡 Design Notes & Possible Extensions

Some ideas if you want to extend the game:

- Add multiple **levels** with different tilemaps.
- Add **different bug types** (faster, homing, shooting).
- Add **power-ups** that temporarily freeze bugs or stop stability drain.
- Add a **timer** that affects final score.
- Tie the Code Lens choices to actual **logic puzzles** or **mini code snippets**.

---

## 📚 Credits

- **Game Design & Code:** You 🙂
- **Frameworks:**
  - [p5.js](https://p5js.org/)
  - [p5play](https://p5play.org/) (v3, Q5 mode)
- Concept & narrative: “Debugging from inside the machine.”

Happy debugging, Operator.  
Don’t let the system crash. 🖥️🔥
