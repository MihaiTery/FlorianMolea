// Florian Molea - Jocul: config central. Toate valorile "magice" traiesc aici.
(function () {
  "use strict";

  var FMGame = window.FMGame = window.FMGame || {};

  var GRAVITY = 2600; // px/s^2 (unitati logice canvas)
  var JUMP_FORCE = 850; // px/s, viteza initiala a saltului
  var LANE_GAP = 130; // distanta pe verticala intre banda 1 si banda 2
  var HOVER_TIME = 0.12; // pauza scurta in varful saltului, pentru senzatia de salt controlat

  var CANVAS_WIDTH = 960;
  var CANVAS_HEIGHT = 400;
  var ROAD_TOP = 60;
  var ROAD_DIVIDER_Y = 200;
  var ROAD_BOTTOM = 340;
  var LANE2_Y = 130; // banda 2 (sus): conurile apar aici
  var LANE1_Y = 260; // banda 1 (jos): pozitia de repaus a masinii si banda masinilor adverse
  var PLAYER_X = 170;

  var CONFIG = {
    DEBUG_GAME: false,

    CANVAS_WIDTH: CANVAS_WIDTH,
    CANVAS_HEIGHT: CANVAS_HEIGHT,
    SKY_HEIGHT: ROAD_TOP,
    ROAD_TOP: ROAD_TOP,
    ROAD_DIVIDER_Y: ROAD_DIVIDER_Y,
    ROAD_BOTTOM: ROAD_BOTTOM,

    GRAVITY: GRAVITY,
    JUMP_FORCE: JUMP_FORCE,
    LANE_GAP: LANE_GAP,
    HOVER_TIME: HOVER_TIME,
    LANE1_Y: LANE1_Y,
    LANE2_Y: LANE2_Y,
    PLAYER_X: PLAYER_X,

    // Player: dimensiunea sprite-ului vs. hitbox (hitbox mai permisiv, cf. sectiunea 20 din spec)
    PLAYER_SPRITE_WIDTH: 86,
    PLAYER_SPRITE_HEIGHT: 40,
    PLAYER_HITBOX_WIDTH: 58,
    PLAYER_HITBOX_HEIGHT: 24,

    CAR_SPRITE_WIDTH_MIN: 78,
    CAR_SPRITE_WIDTH_MAX: 94,
    CAR_SPRITE_HEIGHT_MIN: 34,
    CAR_SPRITE_HEIGHT_MAX: 42,
    CAR_HITBOX_SHRINK_X: 0.72,
    CAR_HITBOX_SHRINK_Y: 0.68,

    CONE_SPRITE_WIDTH: 26,
    CONE_SPRITE_HEIGHT: 32,
    CONE_HITBOX_SHRINK_X: 0.62,
    CONE_HITBOX_SHRINK_Y: 0.7,

    // Viteza si dificultate: totul e interpolat intre START si MAX pe durata RAMP_SECONDS
    INITIAL_SPEED: 260,
    MAX_SPEED: 620,
    SPEED_RAMP_SECONDS: 90,

    OBSTACLE_MIN_GAP_TIME_START: 1.45,
    OBSTACLE_MIN_GAP_TIME_FLOOR: 0.85,
    OBSTACLE_GAP_RANDOM_EXTRA: 0.9,

    COMBO_UNLOCK_T: 0.12, // combinatii permise abia dupa ~12% din rampa de dificultate
    COMBO_CHANCE_MAX: 0.35,
    COMBO_SAFETY_FACTOR: 1.2, // marja suplimentara peste durata saltului pt. distanta minima combo

    AD_INTERVAL_SECONDS: 10,
    AD_SPEED_X: 0, // reclamele se misca exact cu viteza lumii (world speed), setat runtime

    LEADERBOARD_SIZE: 10,
    MAX_NAME_LENGTH: 15,
    DEFAULT_NAME: "Jucător",

    MAX_DELTA_MS: 100, // clamp pt. tab inactiv / frame-uri lungi

    STORAGE_LEADERBOARD: "florianmolea_game_leaderboard_v1",
    STORAGE_HIGHSCORE: "florianmolea_game_highscore_v1",

    ADS_CONFIG_URL: "data/game-ads.json",
    ADS_IMAGE_BASE: "images/game-ads/",

    SCORE_DIGITS: 5,
  };

  // Durata totala a saltului (calculata prin simulare, ca sa ramana corecta
  // chiar daca GRAVITY / JUMP_FORCE / LANE_GAP se modifica ulterior).
  function computeJumpDurationSeconds() {
    var dt = 1 / 240;
    var t = 0;
    var velocity = CONFIG.JUMP_FORCE;
    var rise = 0;
    var phase = "rising";
    var hoverTimer = 0;
    var maxIterations = 5000;

    for (var i = 0; i < maxIterations; i++) {
      if (phase === "rising") {
        velocity -= CONFIG.GRAVITY * dt;
        rise += velocity * dt;
        if (rise >= CONFIG.LANE_GAP) {
          rise = CONFIG.LANE_GAP;
          phase = "hover";
          hoverTimer = CONFIG.HOVER_TIME;
        }
      } else if (phase === "hover") {
        hoverTimer -= dt;
        if (hoverTimer <= 0) {
          phase = "falling";
          velocity = 0;
        }
      } else if (phase === "falling") {
        velocity -= CONFIG.GRAVITY * dt;
        rise += velocity * dt;
        if (rise <= 0) {
          rise = 0;
          phase = "grounded";
        }
      } else {
        break;
      }
      t += dt;
    }
    return t;
  }

  CONFIG.JUMP_DURATION_SECONDS = computeJumpDurationSeconds();

  FMGame.CONFIG = CONFIG;

  FMGame.GAMEOVER_MESSAGES = [
    "Ai picat traseul 😅",
    "Instructorul a pus frână 😬",
    "Mai încercăm o dată?",
    "Asta era de neprezentare 😂",
    "Permisul mai așteaptă puțin.",
    "Data viitoare verificăm și oglinda 😅",
    "Examinatorul nu pare impresionat."
  ];

  FMGame.utils = {
    lerp: function (a, b, t) {
      return a + (b - a) * t;
    },
    clamp: function (value, min, max) {
      return Math.max(min, Math.min(max, value));
    },
    randomBetween: function (min, max) {
      return min + Math.random() * (max - min);
    },
    randomInt: function (min, max) {
      return Math.floor(FMGame.utils.randomBetween(min, max + 1));
    },
    padScore: function (value) {
      var digits = FMGame.CONFIG.SCORE_DIGITS;
      var str = String(Math.max(0, Math.floor(value)));
      while (str.length < digits) {
        str = "0" + str;
      }
      return str;
    }
  };
})();
