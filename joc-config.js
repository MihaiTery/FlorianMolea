// Florian Molea - Jocul: config central. Toate valorile "magice" traiesc aici.
(function () {
  "use strict";

  var FMGame = window.FMGame = window.FMGame || {};

  var GRAVITY = 2600; // px/s^2 (unitati logice canvas)
  var JUMP_FORCE = 850; // px/s, viteza initiala a saltului
  var LANE_GAP = 130; // distanta pe verticala intre banda 1 si banda 2 (fizica saltului - NU se modifica pe breakpoint)
  var HOVER_TIME = 0.12; // pauza scurta in varful saltului, pentru senzatia de salt controlat

  // Decidem O SINGURA DATA, la incarcarea paginii, daca folosim layout-ul mobil sau cel
  // desktop pentru geometria canvas-ului - acelasi prag (760px) ca breakpoint-ul din
  // joc.css. Alegerea NU se re-evalueaza la resize (evita "teleportarea" gameplay-ului
  // in mijlocul unei partide daca utilizatorul roteste telefonul sau redimensioneaza
  // fereastra); un reload simplu preia noul layout daca e cazul.
  var IS_DESKTOP_LAYOUT = (function () {
    try {
      return typeof window.matchMedia === "function" && window.matchMedia("(min-width: 760px)").matches;
    } catch (err) {
      return true;
    }
  })();

  var CANVAS_WIDTH = 960; // latimea logica ramane identica pe toate device-urile - pastreaza
  // pacing-ul orizontal (timpul de reactie pana la un obstacol) neschimbat indiferent de layout.

  // Zona A (roadside/fundal, unde apar panourile publicitare) - inaltime diferita pe
  // breakpoint, ca sa avem loc de un panou lizibil FARA sa se suprapuna peste HUD (care
  // are o dimensiune aproape fixa in px CSS, deci ocupa un interval logic mai mare cand
  // canvas-ul e afisat mai comprimat, pe mobil).
  var ROAD_TOP = IS_DESKTOP_LAYOUT ? 210 : 260;

  // Zona B (banda 2) + Zona C (banda 1): fiecare banda are aceeasi "grosime" vizuala
  // (LANE_BAND) pe toate device-urile - doar zona A (roadside) si pozitia lor absoluta
  // se schimba. LANE_BAND = LANE_GAP => benzile sunt perfect centrate si diferenta dintre
  // LANE1_Y si LANE2_Y ramane mereu exact LANE_GAP, indiferent de ROAD_TOP.
  var LANE_BAND = LANE_GAP;
  var GROUND_HEIGHT = 60;

  var LANE2_Y = ROAD_TOP + LANE_BAND / 2; // banda 2 (sus): conuri + masini
  var ROAD_DIVIDER_Y = ROAD_TOP + LANE_BAND;
  var LANE1_Y = ROAD_DIVIDER_Y + LANE_BAND / 2; // banda 1 (jos): pozitia de repaus a masinii
  var ROAD_BOTTOM = ROAD_DIVIDER_Y + LANE_BAND;
  var CANVAS_HEIGHT = ROAD_BOTTOM + GROUND_HEIGHT;

  var PLAYER_X = 170;

  var CONFIG = {
    DEBUG_GAME: false,
    IS_DESKTOP_LAYOUT: IS_DESKTOP_LAYOUT,

    CANVAS_WIDTH: CANVAS_WIDTH,
    CANVAS_HEIGHT: CANVAS_HEIGHT,
    SKY_HEIGHT: ROAD_TOP, // alias istoric - egal cu ROAD_TOP, folosit de drawBackground/AdManager
    ROAD_TOP: ROAD_TOP,
    ROAD_DIVIDER_Y: ROAD_DIVIDER_Y,
    ROAD_BOTTOM: ROAD_BOTTOM,

    // Zona A (roadside): panourile publicitare. TOP_MARGIN e ales suficient de mare
    // cat sa nu se suprapuna cu HUD-ul (care e pozitionat in CSS, la o dimensiune
    // aproape fixa in px - vezi .game-hud din joc.css), pe ambele breakpoint-uri.
    // WIDTH/HEIGHT marite cu 20% fata de original (160x96); TOP_MARGIN neschimbat, deci
    // marginea de sus a panoului (si distanta pana la HUD) ramane identica - doar
    // "picioarele" panoului se scurteaza usor (raman pozitive pe ambele layout-uri:
    // ROAD_TOP 210 desktop / 260 mobil), fara sa afecteze CANVAS_WIDTH/HEIGHT sau
    // aspect-ratio-ul din joc.css (care nu depind de dimensiunea panourilor).
    AD_BOARD_WIDTH: 192,
    AD_BOARD_HEIGHT: 115,
    AD_BOARD_TOP_MARGIN: 85,

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

    // Dimensiunea sprite-ului e comuna tuturor modelelor; rapoartele de hitbox insa
    // sunt specifice fiecarui model (vezi FMGame.Sprites.CAR_MODELS in joc-sprites.js).
    CAR_SPRITE_WIDTH_MIN: 78,
    CAR_SPRITE_WIDTH_MAX: 94,
    CAR_SPRITE_HEIGHT_MIN: 34,
    CAR_SPRITE_HEIGHT_MAX: 42,

    CONE_SPRITE_WIDTH: 26,
    CONE_SPRITE_HEIGHT: 32,
    CONE_HITBOX_SHRINK_X: 0.62,
    CONE_HITBOX_SHRINK_Y: 0.7,

    // Viteza si dificultate: totul e interpolat intre START si MAX pe durata RAMP_SECONDS
    INITIAL_SPEED: 260,
    MAX_SPEED: 620,
    SPEED_RAMP_SECONDS: 90,

    // Jump assist la viteza mica: la INITIAL_SPEED, distanta parcursa in timpul saltului
    // e mica, deci masina ramane "in zona periculoasa" mult mai mult timp relativ la
    // durata (fixa) a saltului decat la viteza mare. Compensam prelungind usor forta si
    // mai ales hover-ul saltului la viteza mica, si revenim continuu la fizica normala
    // pe masura ce raportul de dificultate (== raportul de viteza) creste. La
    // JUMP_ASSIST_END_SPEED_RATIO assist-ul e deja complet disparut (1.0).
    LOW_SPEED_JUMP_FORCE_MULTIPLIER: 1.1,
    LOW_SPEED_JUMP_HOVER_MULTIPLIER: 2.5,
    JUMP_ASSIST_END_SPEED_RATIO: 0.35,

    OBSTACLE_MIN_GAP_TIME_START: 1.45,
    OBSTACLE_MIN_GAP_TIME_FLOOR: 0.85,
    OBSTACLE_GAP_RANDOM_EXTRA: 0.9,

    // Grace period la pornire: gap-ul minim dintre obstacole e multiplicat suplimentar
    // in primele START_GRACE_PERIOD_SECONDS, apoi revine continuu (nu brusc) la
    // comportamentul normal dat de OBSTACLE_MIN_GAP_TIME_*.
    START_GRACE_PERIOD_SECONDS: 10,
    START_OBSTACLE_GAP_MULTIPLIER: 1.6,

    COMBO_UNLOCK_T: 0.12, // combinatii permise abia dupa ~12% din rampa de dificultate
    COMBO_CHANCE_MAX: 0.35,
    COMBO_SAFETY_FACTOR: 1.2, // marja de siguranta (in unitati de JUMP_DURATION_SECONDS) ori
    // de cate ori un obstacol de tip "masina" (banda 1 sau banda 2) e urmat/precedat de un
    // alt obstacol care ar putea cere actiunea opusa - vezi ObstacleManager.

    // Banda 2: pool mixt de obstacole, folosit identic pe toate device-urile (nicio
    // ramura mobile-vs-desktop). Conurile predomina usor la inceput, dar masinile
    // trebuie sa fie evidente inca din primele secunde - nu doar 5-10%.
    UPPER_LANE_CAR_CHANCE_START: 0.35,
    UPPER_LANE_CAR_CHANCE_MAX: 0.55,

    AD_INTERVAL_SECONDS: 10,
    AD_SPEED_X: 0, // reclamele se misca exact cu viteza lumii (world speed), setat runtime

    LEADERBOARD_SIZE: 10,
    MAX_NAME_LENGTH: 15,
    DEFAULT_NAME: "Jucător",

    MAX_DELTA_MS: 100, // clamp pt. tab inactiv / frame-uri lungi

    STORAGE_LEADERBOARD: "florianmolea_game_leaderboard_v1",
    STORAGE_HIGHSCORE: "florianmolea_game_highscore_v1",

    ADS_CONFIG_URL: "data/game-ads.json",
    // Gol intentionat: reclamele curente refolosesc logo-urile de parteneri deja
    // existente la radacina proiectului (cebia-logo.svg, fiftys-logo.jpg), fara sa le
    // duplice intr-un folder dedicat. Daca adaugi reclame cu imagini intr-un folder
    // separat (ex. images/game-ads/), pune calea aici ca prefix comun.
    ADS_IMAGE_BASE: "",

    SCORE_DIGITS: 5,
  };

  // Durata totala a unui salt cu forta/hover date (calculata prin simulare, ca sa
  // ramana corecta chiar daca GRAVITY / JUMP_FORCE / LANE_GAP se modifica ulterior).
  // Reutilizata atat pentru durata de baza cat si pentru durata "asistata" la viteza
  // mica (vezi getJumpDurationSeconds mai jos) - o singura sursa de adevar pentru
  // fizica saltului, ca sa nu poata diverge intre player.js si obstacole.
  function simulateJumpDuration(jumpForce, hoverTime) {
    var dt = 1 / 240;
    var t = 0;
    var velocity = jumpForce;
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
          hoverTimer = hoverTime;
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

  CONFIG.JUMP_DURATION_SECONDS = simulateJumpDuration(CONFIG.JUMP_FORCE, CONFIG.HOVER_TIME);

  FMGame.CONFIG = CONFIG;

  // difficultyT: 0..1 (0 = INITIAL_SPEED, 1 = MAX_SPEED). Interpolare continua unica
  // pentru jump assist - folosita atat de Player (fizica reala a saltului curent) cat
  // si de ObstacleManager (ca sa calculeze distanta minima sigura intre obstacole care
  // cer actiuni opuse, indiferent de banda).
  FMGame.getJumpAssistMultipliers = function (difficultyT) {
    var t = FMGame.utils.clamp((difficultyT || 0) / CONFIG.JUMP_ASSIST_END_SPEED_RATIO, 0, 1);
    return {
      forceMultiplier: FMGame.utils.lerp(CONFIG.LOW_SPEED_JUMP_FORCE_MULTIPLIER, 1, t),
      hoverMultiplier: FMGame.utils.lerp(CONFIG.LOW_SPEED_JUMP_HOVER_MULTIPLIER, 1, t)
    };
  };

  FMGame.getJumpDurationSeconds = function (difficultyT) {
    var mult = FMGame.getJumpAssistMultipliers(difficultyT);
    return simulateJumpDuration(CONFIG.JUMP_FORCE * mult.forceMultiplier, CONFIG.HOVER_TIME * mult.hoverMultiplier);
  };

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
