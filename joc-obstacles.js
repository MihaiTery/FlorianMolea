// Florian Molea - Jocul: generarea obstacolelor (masini pe banda 1, conuri pe banda 2).
// Randomness controlat: distanta minima intre obstacole si distanta dintre perechile
// masina+con sunt calculate din viteza curenta si durata reala a saltului, ca sa
// existe intotdeauna o solutie corecta (vezi sectiunea 33 din specificatie).
(function () {
  "use strict";

  var FMGame = window.FMGame = window.FMGame || {};
  var CONFIG = FMGame.CONFIG;
  var utils = FMGame.utils;

  function ObstacleManager() {
    this.items = [];
    this.spawnCountdown = 0;
  }

  ObstacleManager.prototype.reset = function () {
    this.items = [];
    this.spawnCountdown = CONFIG.INITIAL_SPEED * 2.2;
  };

  function makeCar(x) {
    var width = utils.randomBetween(CONFIG.CAR_SPRITE_WIDTH_MIN, CONFIG.CAR_SPRITE_WIDTH_MAX);
    var height = utils.randomBetween(CONFIG.CAR_SPRITE_HEIGHT_MIN, CONFIG.CAR_SPRITE_HEIGHT_MAX);
    return {
      type: "car",
      x: x,
      y: CONFIG.LANE1_Y,
      width: width,
      height: height,
      hitboxHalfW: (width * CONFIG.CAR_HITBOX_SHRINK_X) / 2,
      hitboxHalfH: (height * CONFIG.CAR_HITBOX_SHRINK_Y) / 2,
      variantIndex: utils.randomInt(0, 2),
      palette: FMGame.Sprites.VARIANT_PALETTES[utils.randomInt(0, FMGame.Sprites.VARIANT_PALETTES.length - 1)]
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

  ObstacleManager.prototype.spawnPattern = function (difficultyT, speed, canvasWidth) {
    var spawnX = canvasWidth + 60;
    var comboChance = 0;
    if (difficultyT >= CONFIG.COMBO_UNLOCK_T) {
      var comboProgress = (difficultyT - CONFIG.COMBO_UNLOCK_T) / (1 - CONFIG.COMBO_UNLOCK_T);
      comboChance = utils.lerp(0, CONFIG.COMBO_CHANCE_MAX, utils.clamp(comboProgress, 0, 1));
    }

    var roll = Math.random();
    if (roll < comboChance) {
      // Distanta minima ca sa existe intotdeauna o secventa corecta: sar peste masina,
      // aterizez, si abia apoi ajung la con (sau invers: trec de con fara sa sar, apoi sar peste masina).
      var comboGap = CONFIG.JUMP_DURATION_SECONDS * speed * CONFIG.COMBO_SAFETY_FACTOR;
      var carFirst = Math.random() < 0.5;
      var carX = carFirst ? spawnX : spawnX + comboGap;
      var coneX = carFirst ? spawnX + comboGap : spawnX;
      this.items.push(makeCar(carX));
      this.items.push(makeCone(coneX));
    } else if (roll < comboChance + (1 - comboChance) * 0.5) {
      this.items.push(makeCar(spawnX));
    } else {
      this.items.push(makeCone(spawnX));
    }
  };

  ObstacleManager.prototype.update = function (dt, speed, elapsedSeconds, canvasWidth) {
    var difficultyT = utils.clamp(elapsedSeconds / CONFIG.SPEED_RAMP_SECONDS, 0, 1);

    this.spawnCountdown -= speed * dt;
    if (this.spawnCountdown <= 0) {
      this.spawnPattern(difficultyT, speed, canvasWidth);
      var minGap = utils.lerp(CONFIG.OBSTACLE_MIN_GAP_TIME_START, CONFIG.OBSTACLE_MIN_GAP_TIME_FLOOR, difficultyT);
      var gapSeconds = minGap + utils.randomBetween(0, CONFIG.OBSTACLE_GAP_RANDOM_EXTRA);
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
        FMGame.Sprites.drawCarVariant(ctx, left, top, item.width, item.height, item.variantIndex, item.palette);
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
