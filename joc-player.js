// Florian Molea - Jocul: Golf 8 verde, pixel-art, fizica saritului (stil Chrome Dino).
(function () {
  "use strict";

  var FMGame = window.FMGame = window.FMGame || {};
  var CONFIG = FMGame.CONFIG;

  function Player() {
    this.x = CONFIG.PLAYER_X;
    this.rise = 0; // 0 = banda 1 (repaus), CONFIG.LANE_GAP = banda 2
    this.velocity = 0;
    this.phase = "grounded"; // grounded | rising | hover | falling
    this.hoverTimer = 0;
    this.squash = 0; // mica animatie la aterizare
  }

  Player.prototype.reset = function () {
    this.rise = 0;
    this.velocity = 0;
    this.phase = "grounded";
    this.hoverTimer = 0;
    this.squash = 0;
  };

  Player.prototype.isJumping = function () {
    return this.phase !== "grounded";
  };

  Player.prototype.jump = function () {
    // Un singur salt per apasare: nu se poate re-declansa cat timp e deja in aer (fara hold-to-jump).
    if (this.phase !== "grounded") return false;
    this.phase = "rising";
    this.velocity = CONFIG.JUMP_FORCE;
    return true;
  };

  Player.prototype.update = function (dt) {
    if (this.phase === "rising") {
      this.velocity -= CONFIG.GRAVITY * dt;
      this.rise += this.velocity * dt;
      if (this.rise >= CONFIG.LANE_GAP) {
        this.rise = CONFIG.LANE_GAP;
        this.phase = "hover";
        this.hoverTimer = CONFIG.HOVER_TIME;
      }
    } else if (this.phase === "hover") {
      this.hoverTimer -= dt;
      if (this.hoverTimer <= 0) {
        this.phase = "falling";
        this.velocity = 0;
      }
    } else if (this.phase === "falling") {
      this.velocity -= CONFIG.GRAVITY * dt;
      this.rise += this.velocity * dt;
      if (this.rise <= 0) {
        this.rise = 0;
        this.velocity = 0;
        this.phase = "grounded";
        this.squash = 1;
      }
    }

    if (this.squash > 0) {
      this.squash = Math.max(0, this.squash - dt * 4);
    }
  };

  Player.prototype.getY = function () {
    return CONFIG.LANE1_Y - this.rise;
  };

  Player.prototype.getHitbox = function () {
    var y = this.getY();
    return {
      left: this.x - CONFIG.PLAYER_HITBOX_WIDTH / 2,
      right: this.x + CONFIG.PLAYER_HITBOX_WIDTH / 2,
      top: y - CONFIG.PLAYER_HITBOX_HEIGHT / 2,
      bottom: y + CONFIG.PLAYER_HITBOX_HEIGHT / 2
    };
  };

  Player.prototype.draw = function (ctx) {
    var y = this.getY();
    var squashScale = 1 - this.squash * 0.12;
    var w = CONFIG.PLAYER_SPRITE_WIDTH;
    var h = CONFIG.PLAYER_SPRITE_HEIGHT * squashScale;

    // Umbra: se micsoreaza cand masina e sus, pe banda 2.
    var shadowScale = FMGame.utils.clamp(1 - this.rise / CONFIG.LANE_GAP, 0.35, 1);
    ctx.fillStyle = "rgba(23, 23, 23, 0.22)";
    ctx.beginPath();
    ctx.ellipse(this.x, CONFIG.LANE1_Y + h / 2 + 2, (w / 2.4) * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    FMGame.Sprites.drawHatchback(ctx, this.x - w / 2, y - h / 2, w, h, FMGame.Sprites.PALETTE_PLAYER);

    if (CONFIG.DEBUG_GAME) {
      var box = this.getHitbox();
      ctx.strokeStyle = "#ff2a2a";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    }
  };

  FMGame.Player = Player;
})();
