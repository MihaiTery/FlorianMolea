// Florian Molea - Jocul: generarea obstacolelor (masini pe banda 1, con/masina pe banda 2).
// Randomness controlat: distanta minima intre obstacole - si distanta dintre orice pereche
// care ar putea cere actiuni opuse (sari / nu sari) - e calculata din viteza curenta si
// durata reala (eventual asistata) a saltului, ca sa existe intotdeauna o solutie corecta.
(function () {
  "use strict";

  var FMGame = window.FMGame = window.FMGame || {};
  var CONFIG = FMGame.CONFIG;
  var utils = FMGame.utils;

  function ObstacleManager() {
    this.items = [];
    this.spawnCountdown = 0;
    this.lastCarModelKey = null;
    this.lastCarPaletteIndex = -1;
  }

  ObstacleManager.prototype.reset = function () {
    this.items = [];
    this.spawnCountdown = CONFIG.INITIAL_SPEED * 2.2;
    this.lastCarModelKey = null;
    this.lastCarPaletteIndex = -1;
  };

  function makeCar(x, laneY, model, palette) {
    var width = utils.randomBetween(CONFIG.CAR_SPRITE_WIDTH_MIN, CONFIG.CAR_SPRITE_WIDTH_MAX);
    var height = utils.randomBetween(CONFIG.CAR_SPRITE_HEIGHT_MIN, CONFIG.CAR_SPRITE_HEIGHT_MAX);
    return {
      type: "car",
      x: x,
      y: laneY,
      width: width,
      height: height,
      hitboxHalfW: (width * model.hitboxShrinkX) / 2,
      hitboxHalfH: (height * model.hitboxShrinkY) / 2,
      model: model,
      palette: palette
    };
  }

  function makeCone(x) {
    var width = CONFIG.CONE_SPRITE_WIDTH;
    var height = CONFIG.CONE_SPRITE_HEIGHT;
    return {
      type: "cone",
      x: x,
      y: CONFIG.LANE2_Y,
      width: width,
      height: height,
      hitboxHalfW: (width * CONFIG.CONE_HITBOX_SHRINK_X) / 2,
      hitboxHalfH: (height * CONFIG.CONE_HITBOX_SHRINK_Y) / 2
    };
  }

  // Con la inceput, mai multa varietate (inclusiv masini) pe masura ce creste dificultatea.
  function pickUpperLaneType(difficultyT) {
    var carChance = utils.lerp(CONFIG.UPPER_LANE_CAR_CHANCE_START, CONFIG.UPPER_LANE_CAR_CHANCE_MAX, difficultyT);
    return Math.random() < carChance ? "car" : "cone";
  }

  ObstacleManager.prototype.pickCarModelAndPalette = function () {
    var models = FMGame.Sprites.CAR_MODELS;
    var palettes = FMGame.Sprites.VARIANT_PALETTES;
    var modelIndex = utils.randomInt(0, models.length - 1);
    var paletteIndex = utils.randomInt(0, palettes.length - 1);

    // Evitam repetarea vizuala exacta (acelasi model + aceeasi culoare ca ultima masina)
    // cu un singur reroll - nu un shuffle bag complex.
    if (models[modelIndex].key === this.lastCarModelKey && paletteIndex === this.lastCarPaletteIndex) {
      modelIndex = utils.randomInt(0, models.length - 1);
      paletteIndex = utils.randomInt(0, palettes.length - 1);
    }

    this.lastCarModelKey = models[modelIndex].key;
    this.lastCarPaletteIndex = paletteIndex;
    return { model: models[modelIndex], palette: palettes[paletteIndex] };
  };

  ObstacleManager.prototype.spawnCarAt = function (x, laneY) {
    var picked = this.pickCarModelAndPalette();
    this.items.push(makeCar(x, laneY, picked.model, picked.palette));
  };

  ObstacleManager.prototype.spawnConeAt = function (x) {
    this.items.push(makeCone(x));
  };

  // x-ul celei mai indepartate masini deja existente pe banda dat (sau -Infinity daca
  // nu exista niciuna) - folosit ca sa nu plasam niciodata o masina noua prea aproape
  // de o masina deja "in coada" pe banda opusa (vezi safeCarSpawnX).
  ObstacleManager.prototype.getFarthestCarX = function (laneY) {
    var maxX = -Infinity;
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      if (item.type === "car" && item.y === laneY && item.x > maxX) maxX = item.x;
    }
    return maxX;
  };

  // Garanteaza geometric (nu doar prin timing) ca o masina noua, pe banda "laneY",
  // apare la cel putin "durata saltului * marja de siguranta" distanta de orice masina
  // deja existenta pe banda opusa - indiferent daca acea masina a fost plasata acum o
  // clipa sau ca parte a unei combinatii anterioare. Verificare explicita "zid imposibil"
  // (sectiunea 10): fara aceasta, o masina impinsa mai departe (spawnX + dangerGap) de o
  // combinatie ar putea ajunge, dupa ce lumea deruleaza, la o distanta aproape nula fata
  // de o masina noua, independenta, spawnata pe banda opusa la un moment ulterior.
  ObstacleManager.prototype.safeCarSpawnX = function (baseX, laneY, difficultyT, speed) {
    var oppositeLaneY = laneY === CONFIG.LANE1_Y ? CONFIG.LANE2_Y : CONFIG.LANE1_Y;
    var farthestOpposite = this.getFarthestCarX(oppositeLaneY);
    if (farthestOpposite === -Infinity) return baseX;
    var dangerGap = FMGame.getJumpDurationSeconds(difficultyT) * speed * CONFIG.COMBO_SAFETY_FACTOR;
    return Math.max(baseX, farthestOpposite + dangerGap);
  };

  ObstacleManager.prototype.spawnPattern = function (difficultyT, speed, canvasWidth) {
    var baseSpawnX = canvasWidth + 60;
    var comboChance = 0;
    if (difficultyT >= CONFIG.COMBO_UNLOCK_T) {
      var comboProgress = (difficultyT - CONFIG.COMBO_UNLOCK_T) / (1 - CONFIG.COMBO_UNLOCK_T);
      comboChance = utils.lerp(0, CONFIG.COMBO_CHANCE_MAX, utils.clamp(comboProgress, 0, 1));
    }

    var self = this;
    function placeLane1Car() {
      var x = self.safeCarSpawnX(baseSpawnX, CONFIG.LANE1_Y, difficultyT, speed);
      self.spawnCarAt(x, CONFIG.LANE1_Y);
    }
    function placeLane2(upperType) {
      if (upperType === "car") {
        var x = self.safeCarSpawnX(baseSpawnX, CONFIG.LANE2_Y, difficultyT, speed);
        self.spawnCarAt(x, CONFIG.LANE2_Y);
      } else {
        // Conurile nu cer niciodata jump, deci nu au nevoie de aceasta protectie -
        // raman langa marginea normala de spawn.
        self.spawnConeAt(baseSpawnX);
      }
    }

    var roll = Math.random();
    if (roll < comboChance) {
      // Masina pe banda 1 (cere jump) + con-sau-masina pe banda 2 (poate cere sa NU
      // sari). Fiecare element e plasat prin safeCarSpawnX, care - dupa ce primul
      // element e deja in lista - impinge automat al doilea la distanta de siguranta,
      // indiferent de ordine. Rezultat: mereu o secventa corecta - sar, aterizez, *apoi*
      // ajung la al doilea obstacol (sau invers, daca al doilea nu cere deloc jump).
      var upperType = pickUpperLaneType(difficultyT);
      if (Math.random() < 0.5) {
        placeLane1Car();
        placeLane2(upperType);
      } else {
        placeLane2(upperType);
        placeLane1Car();
      }
    } else if (roll < comboChance + (1 - comboChance) * 0.5) {
      placeLane1Car();
    } else {
      placeLane2(pickUpperLaneType(difficultyT));
    }
  };

  ObstacleManager.prototype.update = function (dt, speed, elapsedSeconds, canvasWidth) {
    var difficultyT = utils.clamp(elapsedSeconds / CONFIG.SPEED_RAMP_SECONDS, 0, 1);

    this.spawnCountdown -= speed * dt;
    if (this.spawnCountdown <= 0) {
      this.spawnPattern(difficultyT, speed, canvasWidth);

      var minGap = utils.lerp(CONFIG.OBSTACLE_MIN_GAP_TIME_START, CONFIG.OBSTACLE_MIN_GAP_TIME_FLOOR, difficultyT);
      var graceT = utils.clamp(elapsedSeconds / CONFIG.START_GRACE_PERIOD_SECONDS, 0, 1);
      var graceMultiplier = utils.lerp(CONFIG.START_OBSTACLE_GAP_MULTIPLIER, 1, graceT);
      var gapSeconds = (minGap + utils.randomBetween(0, CONFIG.OBSTACLE_GAP_RANDOM_EXTRA)) * graceMultiplier;

      this.spawnCountdown = gapSeconds * speed;
    }

    for (var i = this.items.length - 1; i >= 0; i--) {
      var item = this.items[i];
      item.x -= speed * dt;
      if (item.x + item.width < -80) {
        this.items.splice(i, 1);
      }
    }
  };

  ObstacleManager.prototype.checkCollision = function (playerHitbox) {
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      var left = item.x - item.hitboxHalfW;
      var right = item.x + item.hitboxHalfW;
      var top = item.y - item.hitboxHalfH;
      var bottom = item.y + item.hitboxHalfH;

      var overlapX = left < playerHitbox.right && right > playerHitbox.left;
      var overlapY = top < playerHitbox.bottom && bottom > playerHitbox.top;
      if (overlapX && overlapY) return true;
    }
    return false;
  };

  ObstacleManager.prototype.draw = function (ctx) {
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      var left = item.x - item.width / 2;
      var top = item.y - item.height / 2;

      if (item.type === "car") {
        item.model.draw(ctx, left, top, item.width, item.height, item.palette);
      } else {
        FMGame.Sprites.drawCone(ctx, left, top, item.width, item.height);
      }

      if (CONFIG.DEBUG_GAME) {
        ctx.strokeStyle = "#2f6df6";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          item.x - item.hitboxHalfW,
          item.y - item.hitboxHalfH,
          item.hitboxHalfW * 2,
          item.hitboxHalfH * 2
        );
      }
    }
  };

  FMGame.ObstacleManager = ObstacleManager;
})();
