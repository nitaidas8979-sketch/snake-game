const board3D = document.getElementById('game-board-3d');
const world = document.getElementById('world');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const turboIndicator = document.getElementById('turbo-indicator');

// Sound synthesis
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') { audioCtx.resume(); }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'eat') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'crash') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

// Constants
const GRID_SIZE = 40; // Pixels per unit matches CSS
const BOARD_UNITS = 20;

// State
let snake = [];
let food = null;
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let lastInputTime = 0;
let score = 0;
let highScore = localStorage.getItem('snake-high-score') || 0;
highScoreElement.textContent = highScore;

let gameInterval = null;
let isRunning = false;
let isPaused = false;
let speed = 150;
let turboMode = false;

// 3D Rendering Helpers
function createCube(type, x, y) {
  const cube = document.createElement('div');
  cube.className = `cube ${type}-cube`;

  // Position in 3D grid
  // CSS Transform translate3d
  updateCubePosition(cube, x, y);

  const inner = document.createElement('div');
  inner.className = 'cube-inner';
  cube.appendChild(inner);

  // Create faces
  ['top', 'bottom', 'front', 'back', 'left', 'right'].forEach(face => {
    const div = document.createElement('div');
    div.className = `cube-face cube-${face}`;
    inner.appendChild(div);
  });

  return cube;
}

function updateCubePosition(element, x, y) {
  // x, y are 0-indexed (0 to 19)
  // Translate converts to pixels
  element.style.transform = `translate3d(${x * GRID_SIZE}px, ${y * GRID_SIZE}px, 0)`;
}

// Game Loop
function initGame() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  food = null;
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  scoreElement.textContent = 0;
  speed = 150;

  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');

  generateFood();
  render();

  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(step, speed);
  isRunning = true;
}

function step() {
  // input buffering check? 
  direction = nextDirection;

  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // Wrap-around walls - snake exits one side and enters from the opposite side
  if (head.x < 0) head.x = BOARD_UNITS - 1;        // Exit left, enter right
  if (head.x >= BOARD_UNITS) head.x = 0;           // Exit right, enter left
  if (head.y < 0) head.y = BOARD_UNITS - 1;        // Exit top, enter bottom
  if (head.y >= BOARD_UNITS) head.y = 0;           // Exit bottom, enter top

  // Only check self-collision now (snake dies only when hitting itself)
  if (checkSelfCollision(head)) {
    gameOver(head);
    return;
  }

  snake.unshift(head);

  // Camera Tilt
  updateCamera(head.x, head.y);

  if (food && head.x === food.x && head.y === food.y) {
    playSound('eat');
    score += 10;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('snake-high-score', highScore);
      highScoreElement.textContent = highScore;
    }
    scoreElement.textContent = score;
    spawnParticles(head.x, head.y, 'eat');
    generateFood();
    // Snake grows
  } else {
    snake.pop();
  }

  render();
}

function checkSelfCollision(head) {
  // Start from index 0 because we haven't unshifted yet? No, unshift happens after check usually.
  // If we check before unshift, we check against current body.
  return snake.some(segment => segment.x === head.x && segment.y === head.y);
}

function render() {
  board3D.innerHTML = '';

  // Draw Snake
  snake.forEach((segment, index) => {
    const type = index === 0 ? 'snake-head' : 'snake';
    const cube = createCube(type, segment.x, segment.y);
    board3D.appendChild(cube);
  });

  // Draw Food
  if (food) {
    const cube = createCube('food', food.x, food.y);
    board3D.appendChild(cube);
  }
}

function generateFood() {
  let valid = false;
  while (!valid) {
    const x = Math.floor(Math.random() * BOARD_UNITS);
    const y = Math.floor(Math.random() * BOARD_UNITS);

    if (!snake.some(s => s.x === x && s.y === y)) {
      food = { x, y };
      valid = true;
    }
  }
}

function gameOver(crashHead) {
  isRunning = false;
  clearInterval(gameInterval);
  if (crashHead) {
    // Render the crash site
    const crashCube = createCube('crash', crashHead.x, crashHead.y);
    board3D.appendChild(crashCube);
  }
  playSound('crash');
  finalScoreElement.textContent = score;
  gameOverScreen.classList.remove('hidden');
}

// Particle System
function spawnParticles(x, y, type) {
  const count = 10;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    board3D.appendChild(p);

    // Random velocity
    const vx = (Math.random() - 0.5) * 100;
    const vy = (Math.random() - 0.5) * 100;
    const vz = (Math.random()) * 100;

    const startX = x * GRID_SIZE + 20;
    const startY = y * GRID_SIZE + 20;

    // Manual animation
    p.style.transform = `translate3d(${startX}px, ${startY}px, 20px)`;

    // Animate using Web Animations API
    p.animate([
      { transform: `translate3d(${startX}px, ${startY}px, 20px)`, opacity: 1 },
      { transform: `translate3d(${startX + vx}px, ${startY + vy}px, ${20 + vz}px)`, opacity: 0 }
    ], {
      duration: 500,
      easing: 'ease-out'
    }).onfinish = () => p.remove();
  }
}

// Camera Dynamic Tilt
function updateCamera(headX, headY) {
  // Map grid pos to rotation
  // Center is 10,10.
  // X movement -> Rotate Y axis (tilt left/right)
  // Y movement -> Rotate X axis (tilt up/down)

  const maxTilt = 10; // degrees
  const rotY = -((headX - BOARD_UNITS / 2) / (BOARD_UNITS / 2)) * maxTilt;
  const rotX = 60 + ((headY - BOARD_UNITS / 2) / (BOARD_UNITS / 2)) * maxTilt;

  world.style.transform = `rotateX(${rotX}deg) rotateZ(${rotY / 2}deg)`; // Subtle Z rotation
}

// Controls
document.addEventListener('keydown', e => {
  // Spacebar Turbo
  if (e.code === 'Space') {
    if (!turboMode && isRunning) {
      turboMode = true;
      clearInterval(gameInterval);
      gameInterval = setInterval(step, 50); // Fast speed
      turboIndicator.classList.remove('hidden');
    }
    // Also prevent scrolling
    e.preventDefault();
    // If game over or start screen, simple start
    if (!isRunning) {
      if (!gameOverScreen.classList.contains('hidden') || !startScreen.classList.contains('hidden')) {
        initGame();
      }
    }
  }

  if (!isRunning) return;

  const now = Date.now();
  // Allow rapid key presses but queue them properly? Simplification: direct assign

  switch (e.key) {
    case 'ArrowUp':
      if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
      break;
    case 'ArrowDown':
      if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
      break;
    case 'ArrowLeft':
      if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
      break;
    case 'ArrowRight':
      if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
      break;
  }
});

document.addEventListener('keyup', e => {
  if (e.code === 'Space') {
    if (turboMode && isRunning) {
      turboMode = false;
      clearInterval(gameInterval);
      gameInterval = setInterval(step, speed);
      turboIndicator.classList.add('hidden');
    }
  }
});

restartBtn.addEventListener('click', initGame);
startBtn.addEventListener('click', initGame);

// Mobile Touch/Swipe Controls
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

const minSwipeDistance = 30; // Minimum swipe distance in pixels

document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;
  handleSwipe();
});

function handleSwipe() {
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  // Check if swipe distance is significant
  if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
    // Tap detected - start game if not running
    if (!isRunning) {
      if (!gameOverScreen.classList.contains('hidden') || !startScreen.classList.contains('hidden')) {
        initGame();
      }
    }
    return;
  }

  if (!isRunning) {
    // Start game on any swipe if not running
    if (!gameOverScreen.classList.contains('hidden') || !startScreen.classList.contains('hidden')) {
      initGame();
    }
    return;
  }

  // Determine swipe direction (horizontal vs vertical)
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal swipe
    if (deltaX > 0) {
      // Swipe right
      if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
    } else {
      // Swipe left
      if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
    }
  } else {
    // Vertical swipe
    if (deltaY > 0) {
      // Swipe down
      if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
    } else {
      // Swipe up
      if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
    }
  }
}
