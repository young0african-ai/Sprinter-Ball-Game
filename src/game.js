const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#startButton");
const resetButton = document.querySelector("#resetButton");
const message = document.querySelector("#message");
const seekerName = document.querySelector("#seekerName");
const roundText = document.querySelector("#roundText");
const timerText = document.querySelector("#timerText");
const scoreText = document.querySelector("#scoreText");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();

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
  }

  if (state.round > state.maxRounds) {
    endGame();
  }
}

function fullReset() {
  state = {
    started: false,
    round: 1,
    maxRounds: 6,
    seeker: 0,
    timeLeft: 45,
    lastTick: performance.now(),
    winnerText: "",
  };
  players[0].score = 0;
  players[1].score = 0;
  resetRound(false);
  state.round = 1;
  state.seeker = 0;
  showMessage("Sprinter Ball", "Created by YoungOfAfrica. Player 1: WASD, Shift to run, E to hide. Player 2: Arrow keys, / to run, Enter to hide. The seeker tags the hider by touching them.", "Start Game");
  updateHud();
}

function startGame() {
  state.started = true;
  state.lastTick = performance.now();
  message.classList.add("hidden");
}

function endGame() {
  state.started = false;
  const [p1, p2] = players;
  const result = p1.score === p2.score ? "Draw game" : `${p1.score > p2.score ? p1.name : p2.name} wins`;
  showMessage(result, `Final score: ${p1.score} - ${p2.score}. Press reset to play again.`, "Play Again");
}

function showMessage(title, text, buttonText) {
  message.querySelector("h1").textContent = title;
  message.querySelector("p").textContent = text;
  startButton.textContent = buttonText;
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
  return hidingSpots.find((spot) => insideRect(player, spot));
}

function updatePlayer(player, dt) {
  const c = player.controls;
  if (player.hideCooldown > 0) player.hideCooldown -= dt;

  const hidePressed = keys.has(c.hide);
  if (hidePressed && !player.hidePressed && player.hideCooldown <= 0) {
    if (player.hiddenIn) {
      player.hiddenIn = null;
      player.hideCooldown = 0.35;
    } else if (players[state.seeker] !== player) {
      const spot = canHide(player);
      if (spot) {
        player.hiddenIn = spot;
        player.hideCooldown = 0.35;
      }
    }
  }
  player.hidePressed = hidePressed;

  if (player.hiddenIn) return;

  let dx = 0;
  let dy = 0;
  if (keys.has(c.up)) dy -= 1;
  if (keys.has(c.down)) dy += 1;
  if (keys.has(c.left)) dx -= 1;
  if (keys.has(c.right)) dx += 1;

  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
  }

  const running = keys.has(c.run) && player.stamina > 2 && (dx || dy);
  const speed = running ? 225 : 142;
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
}

function update(dt) {
  for (const player of players) updatePlayer(player, dt);
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

fullReset();
requestAnimationFrame(loop);
