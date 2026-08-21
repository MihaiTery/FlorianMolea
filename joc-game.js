// Florian Molea - Jocul: bucla principala, input, randare drum/HUD, stari de joc.
(function () {
  "use strict";

  var FMGame = window.FMGame = window.FMGame || {};
  var CONFIG = FMGame.CONFIG;
  var utils = FMGame.utils;

  var stage = document.querySelector("[data-game-stage]");
  if (!stage) return; // pagina nu are jocul (siguranta la reutilizare accidentala a scriptului)

  var canvas = stage.querySelector("[data-game-canvas]");
  var ctx = canvas.getContext("2d");

  var hud = stage.querySelector("[data-game-hud]");
  var hudScore = stage.querySelector("[data-hud-score]");
  var hudHi = stage.querySelector("[data-hud-hi]");

  var overlayStart = stage.querySelector("[data-overlay-start]");
  var overlayGameover = stage.querySelector("[data-overlay-gameover]");
  var overlayName = stage.querySelector("[data-overlay-name]");
  var overlayPaused = stage.querySelector("[data-overlay-paused]");

  var gameoverMessageEl = stage.querySelector("[data-gameover-message]");
  var gameoverScoreEl = stage.querySelector("[data-gameover-score]");
  var gameoverHiEl = stage.querySelector("[data-gameover-hi]");
  var gameoverBadgeEl = stage.querySelector("[data-gameover-badge]");
  var gameoverBadgeMobileEl = stage.querySelector("[data-gameover-badge-mobile]");
  var gameoverRecordEl = stage.querySelector("[data-gameover-record]");
  var retryBtn = stage.querySelector("[data-retry-btn]");

  var nameEntryScoreEl = stage.querySelector("[data-name-entry-score]");
  var nameEntryForm = stage.querySelector("[data-name-entry-form]");
  var nameEntryInput = stage.querySelector("[data-name-entry-input]");

  var leaderboardList = document.querySelector("[data-leaderboard-list]");

  var jumpBtn = document.querySelector("[data-jump-btn]");
  var jumpBtnLabel = jumpBtn && jumpBtn.querySelector("[data-jump-btn-label]");

  var player = new FMGame.Player();
  var obstacles = new FMGame.ObstacleManager();
  var ads = new FMGame.AdManager();
  ads.loadConfig();

  var STATE = { START: "start", PLAYING: "playing", PAUSED: "paused", GAMEOVER: "gameover" };
  var state = STATE.START;
  var stateBeforePause = STATE.PLAYING;
  var nameEntryVisible = false;

  var elapsedSeconds = 0;
  var distance = 0;
  var score = 0;
  var lastTimestamp = null;
  var decorOffset = 0;
  var lastRunWasNewRecord = false;

  function setupCanvas() {
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(CONFIG.CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CONFIG.CANVAS_HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function renderLeaderboard() {
    if (!leaderboardList) return;
    var list = FMGame.Leaderboard.getList();
    leaderboardList.innerHTML = "";
    if (list.length === 0) {
      var empty = document.createElement("li");
      empty.className = "game-leaderboard-empty";
      empty.textContent = "Niciun scor inregistrat inca. Fii primul!";
      leaderboardList.appendChild(empty);
      return;
    }
    list.forEach(function (entry) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.className = "game-leaderboard-name";
      name.textContent = entry.name;
      var value = document.createElement("span");
      value.className = "game-leaderboard-score";
      value.textContent = utils.padScore(entry.score);
      li.appendChild(name);
      li.appendChild(value);
      leaderboardList.appendChild(li);
    });
  }

  function updateHud() {
    if (hudScore) hudScore.textContent = "SCORE " + utils.padScore(score);
    if (hudHi) hudHi.textContent = "HI " + utils.padScore(FMGame.Leaderboard.getHighScore());
  }

  function showOnly(overlay) {
    [overlayStart, overlayGameover, overlayName, overlayPaused].forEach(function (el) {
      if (!el) return;
      el.hidden = el !== overlay;
    });
  }

  function updateJumpButton() {
    if (!jumpBtn) return;

    if (nameEntryVisible) {
      jumpBtn.disabled = true;
      return;
    }

    jumpBtn.disabled = false;
    var label = "SARI";
    if (state === STATE.START) {
      label = "START";
    } else if (state === STATE.GAMEOVER) {
      label = "MAI ÎNCEARCĂ";
    }
    if (jumpBtnLabel) jumpBtnLabel.textContent = label;
  }

  function startGame() {
    player.reset();
    obstacles.reset();
    ads.reset();
    elapsedSeconds = 0;
    distance = 0;
    score = 0;
    nameEntryVisible = false;
    state = STATE.PLAYING;
    hud.hidden = false;
    showOnly(null);
    updateHud();
    updateJumpButton();
  }

  function currentDifficulty() {
    return utils.clamp(elapsedSeconds / CONFIG.SPEED_RAMP_SECONDS, 0, 1);
  }

  function currentSpeed() {
    return utils.lerp(CONFIG.INITIAL_SPEED, CONFIG.MAX_SPEED, currentDifficulty());
  }

  function endGame() {
    state = STATE.GAMEOVER;
    var finalScore = score;
    var previousHighScore = FMGame.Leaderboard.getHighScore();
    FMGame.Leaderboard.updateHighScore(finalScore);
    lastRunWasNewRecord = finalScore > 0 && finalScore > previousHighScore;
    updateHud();

    if (FMGame.Leaderboard.qualifies(finalScore)) {
      nameEntryVisible = true;
      updateJumpButton();
      if (nameEntryScoreEl) nameEntryScoreEl.textContent = "Scorul tau: " + utils.padScore(finalScore);
      showOnly(overlayName);
      if (nameEntryInput) {
        nameEntryInput.value = "";
        window.setTimeout(function () {
          nameEntryInput.focus();
        }, 30);
      }
    } else {
      showGameoverOverlay(finalScore, false);
    }
  }

  function showGameoverOverlay(finalScore, justQualified) {
    nameEntryVisible = false;
    var messages = FMGame.GAMEOVER_MESSAGES;
    var message = messages[utils.randomInt(0, messages.length - 1)];
    if (gameoverMessageEl) gameoverMessageEl.textContent = message;
    if (gameoverScoreEl) gameoverScoreEl.textContent = "Scor: " + utils.padScore(finalScore);
    if (gameoverHiEl) gameoverHiEl.textContent = "Recordul tau: " + utils.padScore(FMGame.Leaderboard.getHighScore());
    if (gameoverBadgeEl) gameoverBadgeEl.hidden = !justQualified;
    if (gameoverBadgeMobileEl) gameoverBadgeMobileEl.hidden = !justQualified;
    if (gameoverRecordEl) gameoverRecordEl.hidden = !lastRunWasNewRecord;
    showOnly(overlayGameover);
    updateJumpButton();
  }

  nameEntryForm && nameEntryForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = nameEntryInput ? nameEntryInput.value : "";
    FMGame.Leaderboard.submit(name, score);
    renderLeaderboard();
    showGameoverOverlay(score, true);
  });

  retryBtn && retryBtn.addEventListener("click", function () {
    startGame();
  });

  jumpBtn && jumpBtn.addEventListener("click", function () {
    handlePrimaryInput();
  });

  function handlePrimaryInput() {
    if (state === STATE.START) {
      startGame();
    } else if (state === STATE.PLAYING) {
      player.jump(currentDifficulty());
    } else if (state === STATE.GAMEOVER && !nameEntryVisible) {
      startGame();
    }
  }

  function isInteractiveTarget(target) {
    return !!(target && target.closest && target.closest("input, button, form, label, a"));
  }

  stage.addEventListener("click", function (event) {
    if (isInteractiveTarget(event.target)) return;
    handlePrimaryInput();
  });

  stage.addEventListener("touchstart", function (event) {
    if (isInteractiveTarget(event.target)) return;
    event.preventDefault();
    handlePrimaryInput();
  }, { passive: false });

  window.addEventListener("keydown", function (event) {
    if (event.code !== "Space" && event.key !== " ") return;
    if (document.activeElement === nameEntryInput) return;
    event.preventDefault();
    handlePrimaryInput();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (state === STATE.PLAYING) {
        stateBeforePause = state;
        state = STATE.PAUSED;
        showOnly(overlayPaused);
      }
    } else if (state === STATE.PAUSED) {
      state = stateBeforePause;
      showOnly(null);
      lastTimestamp = null;
    }
  });

  window.addEventListener("resize", setupCanvas);

  function drawBackground(speed, dt) {
    decorOffset = (decorOffset + speed * dt * 0.3) % 120;

    // Zona A (roadside/fundal): fundalul unde apar panourile publicitare - niciodata
    // peste carosabil.
    ctx.fillStyle = "#fff4df";
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.SKY_HEIGHT);

    // Margine/trotuar ingust chiar deasupra soselei, separa vizual Zona A de drum.
    var shoulderHeight = 10;
    ctx.fillStyle = "#e3d6b8";
    ctx.fillRect(0, CONFIG.ROAD_TOP - shoulderHeight, CONFIG.CANVAS_WIDTH, shoulderHeight);

    ctx.fillStyle = "#8fc76b";
    ctx.fillRect(0, CONFIG.ROAD_BOTTOM, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - CONFIG.ROAD_BOTTOM);

    ctx.fillStyle = "#4b4f58";
    ctx.fillRect(0, CONFIG.ROAD_TOP, CONFIG.CANVAS_WIDTH, CONFIG.ROAD_DIVIDER_Y - CONFIG.ROAD_TOP);
    ctx.fillStyle = "#43474f";
    ctx.fillRect(0, CONFIG.ROAD_DIVIDER_Y, CONFIG.CANVAS_WIDTH, CONFIG.ROAD_BOTTOM - CONFIG.ROAD_DIVIDER_Y);

    ctx.strokeStyle = "#fff4df";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.ROAD_TOP + 1.5);
    ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.ROAD_TOP + 1.5);
    ctx.moveTo(0, CONFIG.ROAD_BOTTOM - 1.5);
    ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.ROAD_BOTTOM - 1.5);
    ctx.stroke();

    ctx.strokeStyle = "#ffc847";
    ctx.lineWidth = 4;
    ctx.setLineDash([28, 20]);
    ctx.lineDashOffset = -decorOffset;
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.ROAD_DIVIDER_Y);
    ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.ROAD_DIVIDER_Y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function update(dt) {
    if (state !== STATE.PLAYING) return;

    var speed = currentSpeed();
    elapsedSeconds += dt;
    distance += speed * dt;
    score = Math.floor(distance / 10);

    player.update(dt);
    obstacles.update(dt, speed, elapsedSeconds, CONFIG.CANVAS_WIDTH);
    ads.update(dt, true, speed, CONFIG.CANVAS_WIDTH);

    if (obstacles.checkCollision(player.getHitbox())) {
      endGame();
    }
    updateHud();
  }

  function draw() {
    var isPlaying = state === STATE.PLAYING;
    var speed = isPlaying ? currentSpeed() : CONFIG.INITIAL_SPEED;
    var dt = isPlaying ? 1 / 60 : 0;

    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    drawBackground(speed, dt);
    ads.draw(ctx);
    obstacles.draw(ctx);
    player.draw(ctx);
  }

  function loop(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    var deltaMs = utils.clamp(timestamp - lastTimestamp, 0, CONFIG.MAX_DELTA_MS);
    lastTimestamp = timestamp;

    if (state !== STATE.PAUSED) {
      update(deltaMs / 1000);
    }
    draw();

    window.requestAnimationFrame(loop);
  }

  setupCanvas();
  renderLeaderboard();
  updateHud();
  showOnly(overlayStart);
  updateJumpButton();
  window.requestAnimationFrame(loop);
})();
