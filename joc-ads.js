// Florian Molea - Jocul: panouri publicitare pixel-art, parte din decor (fara collision, fara click).
// Config: data/game-ads.json -> [{ "image": "banner-01.webp", "alt": "..." }, ...]
// Pentru a adauga o reclama noua: pune imaginea in images/game-ads/ si adauga filename-ul in JSON.
(function () {
  "use strict";

  var FMGame = window.FMGame = window.FMGame || {};
  var CONFIG = FMGame.CONFIG;

  var BOARD_WIDTH = 150;
  var BOARD_HEIGHT = 96;
  var BOARD_Y = CONFIG.SKY_HEIGHT / 2; // centrata in fasia de cer/decor de deasupra soselei

  function AdManager() {
    this.ads = [];
    this.ready = false;
    this.lastAdIndex = -1;
    this.timer = 0;
    this.activeBoards = [];
    this.imageCache = {};
  }

  AdManager.prototype.loadConfig = function () {
    var self = this;
    return fetch(CONFIG.ADS_CONFIG_URL, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("ads config not ok");
        return response.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error("ads config not an array");
        self.ads = data.filter(function (entry) {
          return entry && typeof entry.image === "string" && entry.image.trim().length > 0;
        });
      })
      .catch(function () {
        self.ads = [];
      })
      .then(function () {
        self.ready = true;
      });
  };

  AdManager.prototype.pickNextAd = function () {
    if (this.ads.length === 0) return null;
    if (this.ads.length === 1) {
      this.lastAdIndex = 0;
      return this.ads[0];
    }
    var index;
    do {
      index = FMGame.utils.randomInt(0, this.ads.length - 1);
    } while (index === this.lastAdIndex);
    this.lastAdIndex = index;
    return this.ads[index];
  };

  AdManager.prototype.getImage = function (filename) {
    var cached = this.imageCache[filename];
    if (cached) return cached;

    var record = { el: new Image(), loaded: false, errored: false };
    record.el.onload = function () {
      record.loaded = true;
    };
    record.el.onerror = function () {
      record.errored = true;
    };
    record.el.src = CONFIG.ADS_IMAGE_BASE + filename;
    this.imageCache[filename] = record;
    return record;
  };

  AdManager.prototype.reset = function () {
    this.timer = 0;
    this.activeBoards = [];
    this.lastAdIndex = -1;
  };

  AdManager.prototype.update = function (dt, canSpawn, worldSpeed, canvasWidth) {
    if (canSpawn && this.ready && this.ads.length > 0) {
      this.timer += dt;
      if (this.timer >= CONFIG.AD_INTERVAL_SECONDS) {
        this.timer = 0;
        var ad = this.pickNextAd();
        if (ad) {
          this.activeBoards.push({
            x: canvasWidth + BOARD_WIDTH,
            ad: ad
          });
        }
      }
    }

    for (var i = this.activeBoards.length - 1; i >= 0; i--) {
      var board = this.activeBoards[i];
      board.x -= worldSpeed * dt;
      if (board.x < -BOARD_WIDTH) {
        this.activeBoards.splice(i, 1);
      }
    }
  };

  AdManager.prototype.draw = function (ctx) {
    for (var i = 0; i < this.activeBoards.length; i++) {
      this.drawBoard(ctx, this.activeBoards[i]);
    }
  };

  AdManager.prototype.drawBoard = function (ctx, board) {
    var x = board.x;
    var y = BOARD_Y - BOARD_HEIGHT / 2;
    var legWidth = 8;
    var legHeight = CONFIG.SKY_HEIGHT + 14;

    ctx.fillStyle = "#8a7358";
    ctx.fillRect(Math.round(x + 18), Math.round(y + BOARD_HEIGHT - 6), legWidth, legHeight);
    ctx.fillRect(Math.round(x + BOARD_WIDTH - 26), Math.round(y + BOARD_HEIGHT - 6), legWidth, legHeight);

    ctx.fillStyle = "#171717";
    ctx.fillRect(Math.round(x), Math.round(y), BOARD_WIDTH, BOARD_HEIGHT);
    ctx.fillStyle = "#fff4df";
    ctx.fillRect(Math.round(x + 4), Math.round(y + 4), BOARD_WIDTH - 8, BOARD_HEIGHT - 8);

    var image = board.ad ? this.getImage(board.ad.image) : null;
    if (image && image.loaded && !image.errored) {
      ctx.drawImage(image.el, Math.round(x + 6), Math.round(y + 6), BOARD_WIDTH - 12, BOARD_HEIGHT - 12);
    } else if (!image || !image.errored) {
      ctx.fillStyle = "#d8cdb8";
      ctx.fillRect(Math.round(x + 6), Math.round(y + 6), BOARD_WIDTH - 12, BOARD_HEIGHT - 12);
      ctx.fillStyle = "#b8480f";
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("AD", Math.round(x + BOARD_WIDTH / 2), Math.round(y + BOARD_HEIGHT / 2));
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  };

  FMGame.AdManager = AdManager;
})();
