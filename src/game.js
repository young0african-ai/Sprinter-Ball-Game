const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#startButton");
const resetButton = document.querySelector("#resetButton");
const mobileResetButton = document.querySelector("#mobileResetButton");
const message = document.querySelector("#message");
const helpButton = document.querySelector("#helpButton");
const soundButton = document.querySelector("#soundButton");
const howToPlay = document.querySelector("#howToPlay");
const closeHelpButton = document.querySelector("#closeHelpButton");
const opponentMode = document.querySelector("#opponentMode");
const seekerName = document.querySelector("#seekerName");
const roundText = document.querySelector("#roundText");
const timerText = document.querySelector("#timerText");
const scoreText = document.querySelector("#scoreText");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const touchKeys = new Set();
let audioContext = null;
let soundEnabled = true;

const hidingSpots = [
  { x: 74, y: 68, w: 130, h: 74, type: "bush" },
  { x: 288, y: 42, w: 126, h: 92, type: "tent" },
  { x: 558, y: 55, w: 128, h: 78, type: "crate" },
  { x: 780, y: 70, w: 116, h: 94, type: "bush" },
  { x: 88, y: 222, w: 112, h: 106, type: "shed" },
  { x: 305, y: 216, w: 136, h: 82, type: "bush" },
  { x: 532, y: 238, w: 112, h: 118, type: "tent" },
  { x: 750, y: 250, w: 138, h: 76, type: "crate" },
  { x: 150, y: 436, w: 126, h: 86, type: "crate" },
  { x: 410, y: 448, w: 146, h: 92, type: "bush" },
  { x: 680, y: 438, w: 120, h: 102, type: "shed" },
];

const obstacles = [
  { x: 236, y: 162, w: 58, h: 172 },
  { x: 657, y: 168, w: 54, h: 184 },
  { x: 352, y: 360, w: 238, h: 38 },
];

const players = [
  makePlayer("Player 1", "#54c8ff", 86, 552, { up: "w", left: "a", down: "s", right: "d", run: "shift", hide: "e" }),
  makePlayer("Player 2", "#ff6b76", 874, 552, { up: "arrowup", left: "arrowleft", down: "arrowdown", right: "arrowright", run: "/", hide: "enter" }),
];

let state = {
  started: false,
  round: 1,
  maxRounds: 6,
  seeker: 0,
  timeLeft: 45,
  lastTick: performance.now(),
  winnerText: "",
  opponent: "human",
  aiTimer: 0,
  aiTarget: null,
};

const aiSettings = {
  easy: { speed: 0.72, mistake: 0.42, hideRange: 42, refresh: 1.4 },
  medium: { speed: 0.92, mistake: 0.22, hideRange: 70, refresh: 0.85 },
  hard: { speed: 1.08, mistake: 0.08, hideRange: 104, refresh: 0.45 },
};

function makePlayer(name, color, x, y, controls) {
  return {
    name,
    color,
    x,
    y,
    r: 17,
    controls,
    score: 0,
    hiddenIn: null,
    hidePressed: false,
    hideCooldown: 0,
    stamina: 100,
  };
}

function resetRound(switchSeeker = true) {
  if (switchSeeker) state.seeker = state.seeker === 0 ? 1 : 0;
  state.round += switchSeeker ? 1 : 0;
  state.timeLeft = 45;
  state.lastTick = performance.now();

  players[0].x = 86;
  players[0].y = 552;
  players[1].x = 874;
  players[1].y = 552;

  for (const player of players) {
    player.hiddenIn = null;
    player.hidePressed = false;
    player.hideCooldown = 0;
    player.stamina = 100;
    player.aiDx = 0;
    player.aiDy = 0;
    player.aiRun = false;
    player.aiHide = false;
  }

  if (state.round > state.maxRounds) {
    endGame();
  }
}

function fullReset() {
  keys.clear();
  touchKeys.clear();
  state = {
    started: false,
    round: 1,
    maxRounds: 6,
    seeker: 0,
    timeLeft: 45,
    lastTick: performance.now(),
    winnerText: "",
    opponent: opponentMode.value,
    aiTimer: 0,
    aiTarget: null,
  };
  players[0].score = 0;
  players[1].score = 0;
  players[1].name = state.opponent === "human" ? "Player 2" : "Computer";
  document.body.classList.toggle("computer-mode", state.opponent !== "human");
  resetRound(false);
  state.round = 1;
  state.seeker = 0;
  showMessage("Sprinter Ball", "Created by YoungOfAfrica. Run, hide, and outsmart the seeker across 6 quick rounds.", "Start Game");
  updateHud();
}

function startGame() {
  state.started = true;
  state.lastTick = performance.now();
  message.classList.add("hidden");
  message.classList.remove("victory");
  playSound("start");
}

function endGame() {
  state.started = false;
  const [p1, p2] = players;
  const result = p1.score === p2.score ? "Draw Game" : `${p1.score > p2.score ? p1.name : p2.name} Wins`;
  showMessage(result, `Final score: ${p1.score} - ${p2.score}. Great match. Play again and switch up your hiding strategy.`, "Play Again", true);
  playSound("win");
}

function showMessage(title, text, buttonText, victory = false) {
  message.querySelector("h1").textContent = title;
  message.querySelector("p").textContent = text;
  startButton.textContent = buttonText;
  message.classList.toggle("victory", victory);
  message.classList.remove("hidden");
}

function rectCircleCollision(rect, circle) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) < circle.r;
}

function insideRect(player, rect) {
  return player.x > rect.x && player.x < rect.x + rect.w && player.y > rect.y && player.y < rect.y + rect.h;
}

function canHide(player) {
  return hidingSpots.find((spot) => insideRect(player, spot) || nearSpot(player, spot));
}

function nearSpot(player, spot) {
  const centerX = spot.x + spot.w / 2;
  const centerY = spot.y + spot.h / 2;
  const hideRadius = Math.max(spot.w, spot.h) / 2 + player.r + 18;
  return Math.hypot(player.x - centerX, player.y - centerY) <= hideRadius;
}

function updatePlayer(player, dt, input = "human") {
  const c = player.controls;
  if (player.hideCooldown > 0) player.hideCooldown -= dt;

  const hidePressed = input === "ai" ? player.aiHide : isPressed(c.hide);
  if (hidePressed && !player.hidePressed && player.hideCooldown <= 0) {
    if (player.hiddenIn) {
      player.hiddenIn = null;
      player.hideCooldown = 0.35;
    } else if (players[state.seeker] !== player) {
      const spot = canHide(player);
      if (spot) {
        player.hiddenIn = spot;
        player.hideCooldown = 0.35;
        playSound("hide");
      }
    } else {
      player.hideCooldown = 0.18;
    }
  }
  player.hidePressed = hidePressed;

  if (player.hiddenIn) return;

  let dx = 0;
  let dy = 0;
  if (input === "ai") {
    dx = player.aiDx || 0;
    dy = player.aiDy || 0;
  } else {
    if (isPressed(c.up)) dy -= 1;
    if (isPressed(c.down)) dy += 1;
    if (isPressed(c.left)) dx -= 1;
    if (isPressed(c.right)) dx += 1;
  }

  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
  }

  const running = (input === "ai" ? player.aiRun : isPressed(c.run)) && player.stamina > 2 && (dx || dy);
  const speedMultiplier = input === "ai" ? aiSettings[state.opponent].speed : 1;
  const speed = (running ? 225 : 142) * speedMultiplier;
  player.stamina = Math.max(0, Math.min(100, player.stamina + (running ? -38 : 24) * dt));

  movePlayer(player, dx * speed * dt, dy * speed * dt);
}

function movePlayer(player, dx, dy) {
  const oldX = player.x;
  const oldY = player.y;
  player.x = Math.max(player.r, Math.min(WIDTH - player.r, player.x + dx));
  if (obstacles.some((obstacle) => rectCircleCollision(obstacle, player))) player.x = oldX;
  player.y = Math.max(player.r, Math.min(HEIGHT - player.r, player.y + dy));
  if (obstacles.some((obstacle) => rectCircleCollision(obstacle, player))) player.y = oldY;
}

function checkTag() {
  const seeker = players[state.seeker];
  const hider = players[state.seeker === 0 ? 1 : 0];
  if (hider.hiddenIn) return;
  if (Math.hypot(seeker.x - hider.x, seeker.y - hider.y) < seeker.r + hider.r + 5) {
    finishRound(seeker, `${seeker.name} found ${hider.name}`, "The seeker scores. Roles switch next round.");
    playSound("tag");
  }
}

function finishRound(scoringPlayer, title, text) {
  scoringPlayer.score += 1;
  if (state.round >= state.maxRounds) {
    endGame();
    return;
  }
  showBetweenRound(title, text);
}

function showBetweenRound(title, text) {
  state.started = false;
  showMessage(title, text, "Next Round");
  playSound("round");
}

function update(dt) {
  updatePlayer(players[0], dt);
  if (state.opponent === "human") {
    updatePlayer(players[1], dt);
  } else {
    updateAi(dt);
    updatePlayer(players[1], dt, "ai");
  }
  state.timeLeft -= dt;

  const hider = players[state.seeker === 0 ? 1 : 0];
  if (state.timeLeft <= 0) {
    finishRound(hider, `${hider.name} stayed hidden`, "The hider scores. Roles switch next round.");
    return;
  }

  checkTag();
}

function updateHud() {
  seekerName.textContent = players[state.seeker].name;
  roundText.textContent = `${Math.min(state.round, state.maxRounds)} / ${state.maxRounds}`;
  timerText.textContent = Math.max(0, Math.ceil(state.timeLeft));
  scoreText.textContent = `${players[0].score} - ${players[1].score}`;
}

function updateAi(dt) {
  const computer = players[1];
  const human = players[0];
  const settings = aiSettings[state.opponent];
  state.aiTimer -= dt;
  computer.aiHide = false;
  computer.aiRun = true;

  if (state.aiTimer <= 0 || !state.aiTarget) {
    state.aiTimer = settings.refresh;
    state.aiTarget = chooseAiTarget(computer, human, settings);
  }

  const wrongWay = Math.random() < settings.mistake * dt;
  const target = wrongWay ? { x: WIDTH - state.aiTarget.x, y: HEIGHT - state.aiTarget.y } : state.aiTarget;
  const dx = target.x - computer.x;
  const dy = target.y - computer.y;
  const distance = Math.hypot(dx, dy);

  computer.aiDx = distance > 4 ? dx / distance : 0;
  computer.aiDy = distance > 4 ? dy / distance : 0;

  const computerIsHider = players[state.seeker] !== computer;
  if (computerIsHider) {
    const spot = canHide(computer);
    const seekerDistance = Math.hypot(computer.x - human.x, computer.y - human.y);
    computer.aiHide = !!spot && seekerDistance < settings.hideRange;
  }
}

function chooseAiTarget(computer, human, settings) {
  const computerIsSeeker = players[state.seeker] === computer;
  if (computerIsSeeker) {
    if (human.hiddenIn) return nearestSpot(computer);
    return { x: human.x, y: human.y };
  }

  const dangerX = computer.x - human.x;
  const dangerY = computer.y - human.y;
  const dangerDistance = Math.hypot(dangerX, dangerY);
  if (dangerDistance < 190 + settings.hideRange) {
    const safestSpot = hidingSpots
      .map((spot) => ({
        x: spot.x + spot.w / 2,
        y: spot.y + spot.h / 2,
        score: Math.hypot(spot.x + spot.w / 2 - human.x, spot.y + spot.h / 2 - human.y) -
          Math.hypot(spot.x + spot.w / 2 - computer.x, spot.y + spot.h / 2 - computer.y),
      }))
      .sort((a, b) => b.score - a.score)[0];
    return safestSpot || { x: WIDTH - human.x, y: HEIGHT - human.y };
  }

  const randomSpot = hidingSpots[Math.floor(Math.random() * hidingSpots.length)];
  return { x: randomSpot.x + randomSpot.w / 2, y: randomSpot.y + randomSpot.h / 2 };
}

function nearestSpot(player) {
  return hidingSpots
    .map((spot) => ({
      x: spot.x + spot.w / 2,
      y: spot.y + spot.h / 2,
      distance: Math.hypot(spot.x + spot.w / 2 - player.x, spot.y + spot.h / 2 - player.y),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function draw() {
  drawMap();
  drawHidingSpots();
  drawObstacles();
  drawPlayers();
  drawMiniHints();
}

function drawMap() {
  ctx.fillStyle = "#284a2f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "rgba(246, 221, 159, 0.16)";
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(34, 184);
  ctx.bezierCurveTo(214, 118, 326, 176, 480, 166);
  ctx.bezierCurveTo(638, 155, 760, 102, 928, 194);
  ctx.moveTo(28, 415);
  ctx.bezierCurveTo(204, 362, 324, 424, 492, 416);
  ctx.bezierCurveTo(642, 409, 748, 356, 930, 422);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
  for (let x = 42; x < WIDTH; x += 85) {
    for (let y = 38; y < HEIGHT; y += 74) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHidingSpots() {
  for (const spot of hidingSpots) {
    if (spot.type === "bush") drawBush(spot);
    if (spot.type === "tent") drawTent(spot);
    if (spot.type === "crate") drawCrates(spot);
    if (spot.type === "shed") drawShed(spot);
  }
}

function drawBush(spot) {
  ctx.fillStyle = "#1f6a3c";
  ctx.strokeStyle = "#0f3c24";
  ctx.lineWidth = 4;
  for (let i = 0; i < 9; i += 1) {
    const x = spot.x + 18 + (i % 3) * (spot.w / 3);
    const y = spot.y + 20 + Math.floor(i / 3) * (spot.h / 3);
    ctx.beginPath();
    ctx.arc(x, y, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawTent(spot) {
  ctx.fillStyle = "#d65d48";
  ctx.strokeStyle = "#803122";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(spot.x + spot.w / 2, spot.y);
  ctx.lineTo(spot.x + spot.w, spot.y + spot.h);
  ctx.lineTo(spot.x, spot.y + spot.h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#783027";
  ctx.fillRect(spot.x + spot.w / 2 - 13, spot.y + spot.h - 34, 26, 34);
}

function drawCrates(spot) {
  ctx.fillStyle = "#9f7541";
  ctx.strokeStyle = "#513a20";
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i += 1) {
    const x = spot.x + 8 + i * (spot.w / 3);
    const y = spot.y + 10 + (i % 2) * 24;
    ctx.fillRect(x, y, 46, 46);
    ctx.strokeRect(x, y, 46, 46);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 46, y + 46);
    ctx.moveTo(x + 46, y);
    ctx.lineTo(x, y + 46);
    ctx.stroke();
  }
}

function drawShed(spot) {
  ctx.fillStyle = "#7f8b76";
  ctx.strokeStyle = "#343d35";
  ctx.lineWidth = 5;
  ctx.fillRect(spot.x, spot.y + 18, spot.w, spot.h - 18);
  ctx.strokeRect(spot.x, spot.y + 18, spot.w, spot.h - 18);
  ctx.fillStyle = "#4f6f63";
  ctx.beginPath();
  ctx.moveTo(spot.x - 8, spot.y + 22);
  ctx.lineTo(spot.x + spot.w / 2, spot.y);
  ctx.lineTo(spot.x + spot.w + 8, spot.y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawObstacles() {
  ctx.fillStyle = "#4b5d5a";
  ctx.strokeStyle = "#202a2a";
  ctx.lineWidth = 4;
  for (const obstacle of obstacles) {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  }
}

function drawPlayers() {
  for (let i = 0; i < players.length; i += 1) {
    const player = players[i];
    if (player.hiddenIn) {
      if (i === state.seeker) continue;
      drawHiddenMarker(player);
      continue;
    }

    ctx.fillStyle = player.color;
    ctx.strokeStyle = i === state.seeker ? "#ffe59c" : "#101416";
    ctx.lineWidth = i === state.seeker ? 5 : 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#101416";
    ctx.beginPath();
    ctx.arc(player.x - 6, player.y - 4, 2.5, 0, Math.PI * 2);
    ctx.arc(player.x + 6, player.y - 4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    drawHideReady(player);
    drawStamina(player);
  }
}

function drawHiddenMarker(player) {
  const spot = player.hiddenIn;
  ctx.fillStyle = "rgba(255, 230, 154, 0.28)";
  ctx.beginPath();
  ctx.arc(spot.x + spot.w / 2, spot.y + spot.h / 2, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawHideReady(player) {
  if (players[state.seeker] === player || player.hiddenIn || !canHide(player)) return;
  ctx.strokeStyle = "rgba(255, 224, 147, 0.9)";
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r + 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawStamina(player) {
  const w = 42;
  const h = 6;
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(player.x - w / 2, player.y + 26, w, h);
  ctx.fillStyle = player.stamina > 25 ? "#93dc70" : "#f2bb52";
  ctx.fillRect(player.x - w / 2, player.y + 26, w * (player.stamina / 100), h);
}

function drawMiniHints() {
  const hider = players[state.seeker === 0 ? 1 : 0];
  ctx.fillStyle = "rgba(7, 11, 12, 0.72)";
  ctx.fillRect(18, 18, 252, 48);
  ctx.fillStyle = "#f4f0e8";
  ctx.font = "16px Arial";
  ctx.fillText(hider.hiddenIn ? `${hider.name} is hidden` : `${hider.name} is visible`, 34, 48);
}

function isPressed(key) {
  return keys.has(key) || touchKeys.has(key);
}

function updateOrientationLayout() {
  const isTouchLike = matchMedia("(pointer: coarse)").matches || innerWidth <= 760;
  const isLandscape = innerWidth > innerHeight;
  document.body.classList.toggle("landscape-mode", isTouchLike && isLandscape);
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playTone(frequency, duration, delay = 0, type = "sine", volume = 0.045) {
  if (!soundEnabled) return;
  const audio = getAudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, audio.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, audio.currentTime + delay + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(audio.currentTime + delay);
  oscillator.stop(audio.currentTime + delay + duration);
}

function playSound(name) {
  if (!soundEnabled) return;
  const sounds = {
    start: [[392, 0.08], [523, 0.1, 0.08]],
    hide: [[220, 0.08, 0, "triangle"], [165, 0.12, 0.07, "triangle"]],
    tag: [[180, 0.08, 0, "square"], [120, 0.12, 0.08, "square"]],
    round: [[330, 0.08], [440, 0.09, 0.07], [550, 0.12, 0.14]],
    win: [[392, 0.08], [523, 0.09, 0.09], [659, 0.1, 0.18], [784, 0.22, 0.3]],
  };
  for (const tone of sounds[name] || []) playTone(...tone);
}

function openHelp() {
  howToPlay.classList.remove("hidden");
  playSound("round");
}

function closeHelp() {
  howToPlay.classList.add("hidden");
}

function loop(now) {
  const dt = Math.min(0.05, (now - state.lastTick) / 1000);
  state.lastTick = now;

  if (state.started) update(dt);
  updateHud();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener("resize", updateOrientationLayout);
window.addEventListener("orientationchange", () => {
  setTimeout(updateOrientationLayout, 150);
});

for (const button of document.querySelectorAll("[data-touch]")) {
  const key = button.dataset.touch;
  const press = (event) => {
    event.preventDefault();
    touchKeys.add(key);
  };
  const release = (event) => {
    event.preventDefault();
    touchKeys.delete(key);
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

startButton.addEventListener("click", () => {
  if (state.round > state.maxRounds) {
    fullReset();
  }
  if (!state.started && message.querySelector("h1").textContent !== "Sprinter Ball") {
    resetRound(true);
  }
  startGame();
});

resetButton.addEventListener("click", fullReset);
mobileResetButton.addEventListener("click", fullReset);
helpButton.addEventListener("click", openHelp);
closeHelpButton.addEventListener("click", closeHelp);
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? "Sound On" : "Sound Off";
  if (soundEnabled) playSound("start");
});

opponentMode.addEventListener("change", () => {
  fullReset();
});

fullReset();
updateOrientationLayout();
requestAnimationFrame(loop);
