// Florian Molea - Jocul: panouri publicitare pixel-art, parte din decor (fara collision, fara click).
// Config: data/game-ads.json -> [{ "image": "banner-01.webp", "alt": "..." }, ...]
// Pentru a adauga o reclama noua: pune imaginea in images/game-ads/ si adauga filename-ul in JSON.
(function () {
  "use strict";

  var FMGame = window.FMGame = window.FMGame || {};
  var CONFIG = FMGame.CONFIG;

  var BOARD_WIDTH = CONFIG.AD_BOARD_WIDTH;
  var BOARD_HEIGHT = CONFIG.AD_BOARD_HEIGHT;
  var BOARD_TOP = CONFIG.AD_BOARD_TOP_MARGIN; // muchia de sus a panoului, in Zona A (roadside)
  var BOARD_BOTTOM = BOARD_TOP + BOARD_HEIGHT;
  var LEG_HEIGHT = Math.max(0, CONFIG.ROAD_TOP - BOARD_BOTTOM); // se opreste exact la marginea soselei, niciodata peste ea

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
      // eslint-disable-next-line no-console
      console.log("[FM GAME ADS]", this.ads[0].image); // TEMPORAR - doar pentru testarea reclamelor
      return this.ads[0];
    }
    var index;
    do {
      index = FMGame.utils.randomInt(0, this.ads.length - 1);
    } while (index === this.lastAdIndex);
    this.lastAdIndex = index;
    // eslint-disable-next-line no-console
    console.log("[FM GAME ADS]", this.ads[index].image); // TEMPORAR - doar pentru testarea reclamelor
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
    var y = BOARD_TOP;
    var legWidth = 8;

    // Picioarele panoului ajung exact pana la muchia soselei (CONFIG.ROAD_TOP), niciodata
    // mai jos - panoul e intotdeauna in intregime in Zona A (roadside), niciodata peste
    // carosabil/benzi/masini/con/Golf.
    if (LEG_HEIGHT > 0) {
      ctx.fillStyle = "#8a7358";
      ctx.fillRect(Math.round(x + 18), Math.round(y + BOARD_HEIGHT - 6), legWidth, LEG_HEIGHT + 6);
      ctx.fillRect(Math.round(x + BOARD_WIDTH - 26), Math.round(y + BOARD_HEIGHT - 6), legWidth, LEG_HEIGHT + 6);
    }

    ctx.fillStyle = "#171717";
    ctx.fillRect(Math.round(x), Math.round(y), BOARD_WIDTH, BOARD_HEIGHT);
    ctx.fillStyle = "#fff4df";
    ctx.fillRect(Math.round(x + 4), Math.round(y + 4), BOARD_WIDTH - 8, BOARD_HEIGHT - 8);

    var image = board.ad ? this.getImage(board.ad.image) : null;
    if (image && image.loaded && !image.errored) {
      // "contain": pastram raportul de aspect al logo-ului, nu il intindem - il incadram
      // centrat in zona panoului, cu fundalul deschis la culoare vizibil ca margine.
      var contentX = x + 6;
      var contentY = y + 6;
      var contentW = BOARD_WIDTH - 12;
      var contentH = BOARD_HEIGHT - 12;
      var naturalW = image.el.naturalWidth || contentW;
      var naturalH = image.el.naturalHeight || contentH;
      var scale = Math.min(contentW / naturalW, contentH / naturalH);
      var drawW = naturalW * scale;
      var drawH = naturalH * scale;
      var drawX = contentX + (contentW - drawW) / 2;
      var drawY = contentY + (contentH - drawH) / 2;
      ctx.drawImage(image.el, Math.round(drawX), Math.round(drawY), Math.round(drawW), Math.round(drawH));
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
