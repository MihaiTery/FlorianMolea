// Florian Molea - Jocul: desenare pixel-art (siluete masini, con) direct pe canvas.
// Fara asset-uri externe: totul e generat programatic, usor de inlocuit ulterior cu sprite-uri reale.
(function () {
  "use strict";

  var FMGame = window.FMGame = window.FMGame || {};

  function px(value) {
    return Math.round(value);
  }

  function scalePoints(points, w, h) {
    // punctele sunt definite intr-un spatiu local 86x40, scalate la dimensiunea ceruta
    var scaleX = w / 86;
    var scaleY = h / 40;
    return points.map(function (p) {
      return [p[0] * scaleX, p[1] * scaleY];
    });
  }

  function fillPolygon(ctx, originX, originY, points) {
    ctx.beginPath();
    for (var i = 0; i < points.length; i++) {
      var px1 = px(originX + points[i][0]);
      var py1 = px(originY + points[i][1]);
      if (i === 0) ctx.moveTo(px1, py1);
      else ctx.lineTo(px1, py1);
    }
    ctx.closePath();
    ctx.fill();
  }

  var HATCHBACK_OUTLINE = [
    [2, 32], [2, 22], [14, 12], [30, 6], [58, 6], [72, 14],
    [80, 20], [84, 26], [84, 32], [78, 34], [8, 34]
  ];

  var HATCHBACK_GLASS = [
    [16, 13], [31, 8], [56, 8], [69, 15], [60, 16], [24, 16]
  ];

  var SEDAN_OUTLINE = [
    [1, 32], [1, 24], [8, 22], [16, 12], [32, 7], [52, 7], [62, 12],
    [66, 22], [80, 24], [85, 28], [85, 33], [1, 33]
  ];

  var SEDAN_GLASS = [
    [18, 13], [33, 9], [50, 9], [60, 13], [56, 17], [22, 17]
  ];

  var SUV_OUTLINE = [
    [2, 33], [2, 16], [10, 8], [28, 4], [58, 4], [74, 10],
    [82, 16], [84, 22], [84, 33], [78, 35], [8, 35]
  ];

  var SUV_GLASS = [
    [12, 9], [29, 5], [56, 5], [72, 11], [68, 17], [16, 17]
  ];

  // Break / station wagon: plafon lung, aproape pana la spate, spate vertical (nu teșit).
  var WAGON_OUTLINE = [
    [3, 34], [3, 14], [8, 8], [60, 6], [72, 12],
    [80, 18], [84, 22], [84, 32], [78, 34], [10, 34]
  ];

  var WAGON_GLASS = [
    [10, 10], [58, 8], [70, 13], [62, 18], [14, 18]
  ];

  var WHEELS_WAGON = [[20, 34], [66, 34]];

  // Coupe / sport compact: plafon coborat, cabina scurta, profil sportiv.
  var COUPE_OUTLINE = [
    [4, 32], [6, 24], [16, 16], [34, 10], [54, 10], [66, 16],
    [78, 22], [84, 26], [84, 32], [76, 34], [10, 34]
  ];

  var COUPE_GLASS = [
    [20, 17], [35, 12], [52, 12], [64, 17], [56, 20], [24, 20]
  ];

  var WHEELS_COUPE = [[22, 33], [66, 33]];

  // Van / utilitara mica: foarte inalt, caroserie aproape rectangulara.
  var VAN_OUTLINE = [
    [2, 34], [2, 6], [8, 4], [70, 4], [78, 8],
    [84, 14], [84, 32], [78, 34], [8, 34]
  ];

  var VAN_GLASS = [
    [6, 8], [70, 7], [76, 12], [70, 16], [8, 16]
  ];

  var WHEELS_VAN = [[18, 35], [68, 35]];

  function drawSilhouette(ctx, x, y, w, h, palette, outline, glass, wheelCenters) {
    var scaledOutline = scalePoints(outline, w, h);
    var scaledGlass = scalePoints(glass, w, h);
    var scaleX = w / 86;
    var scaleY = h / 40;

    // caroserie
    ctx.fillStyle = palette.body;
    fillPolygon(ctx, x, y, scaledOutline);

    // prag inferior (nuanta mai inchisa)
    ctx.fillStyle = palette.bodyDark;
    ctx.fillRect(px(x + 6 * scaleX), px(y + 30 * scaleY), px(74 * scaleX), px(5 * scaleY));

    // linie de centura (highlight)
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(px(x + 18 * scaleX), px(y + 19 * scaleY), px(60 * scaleX), px(2 * scaleY));

    // geamuri
    ctx.fillStyle = "#16202c";
    fillPolygon(ctx, x, y, scaledGlass);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(px(x + 24 * scaleX), px(y + 10 * scaleY), px(14 * scaleX), px(4 * scaleY));

    // stopuri / faruri
    ctx.fillStyle = "#ef2f2f";
    ctx.fillRect(px(x + 1 * scaleX), px(y + 23 * scaleY), px(5 * scaleX), px(6 * scaleY));
    ctx.fillStyle = "#ffc847";
    ctx.fillRect(px(x + 79 * scaleX), px(y + 20 * scaleY), px(5 * scaleX), px(6 * scaleY));

    // oglinda
    ctx.fillStyle = "#171717";
    ctx.fillRect(px(x + 66 * scaleX), px(y + 12 * scaleY), px(4 * scaleX), px(4 * scaleY));

    // roti
    for (var i = 0; i < wheelCenters.length; i++) {
      var wx = x + wheelCenters[i][0] * scaleX;
      var wy = y + wheelCenters[i][1] * scaleY;
      var radius = 9 * ((scaleX + scaleY) / 2);
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.arc(px(wx), px(wy), px(radius), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#9aa5ad";
      ctx.beginPath();
      ctx.arc(px(wx), px(wy), px(radius * 0.42), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  var WHEELS_HATCHBACK = [[22, 34], [64, 34]];
  var WHEELS_SEDAN = [[20, 33], [68, 33]];
  var WHEELS_SUV = [[20, 35], [66, 35]];

  var Sprites = {
    PALETTE_PLAYER: { body: "#20c36a", bodyDark: "#0f8a4c", highlight: "#8af0bd" },

    // Nicio culoare de aici nu e verde: Golf-ul jucatorului trebuie sa ramana instant
    // recognoscibil, niciodata confundabil cu un obstacol.
    VARIANT_PALETTES: [
      { body: "#2f6df6", bodyDark: "#1c46ad", highlight: "#a9c3ff" }, // albastru
      { body: "#ff7a3d", bodyDark: "#c9531f", highlight: "#ffcdad" }, // portocaliu
      { body: "#ef2f2f", bodyDark: "#a91d1d", highlight: "#ffb3b3" }, // rosu
      { body: "#ffc847", bodyDark: "#c99418", highlight: "#fff0c2" }, // galben
      { body: "#9b6bff", bodyDark: "#6b3fd6", highlight: "#d9c8ff" }, // mov
      { body: "#5f646d", bodyDark: "#3a3d43", highlight: "#c2c6cc" }, // gri
      { body: "#f2f4f7", bodyDark: "#c7cdd6", highlight: "#ffffff" }, // alb
      { body: "#2fd9c4", bodyDark: "#1a9c8c", highlight: "#a8f5ea" }  // turcoaz
    ],

    drawHatchback: function (ctx, x, y, w, h, palette) {
      drawSilhouette(ctx, x, y, w, h, palette, HATCHBACK_OUTLINE, HATCHBACK_GLASS, WHEELS_HATCHBACK);
    },
    drawSedan: function (ctx, x, y, w, h, palette) {
      drawSilhouette(ctx, x, y, w, h, palette, SEDAN_OUTLINE, SEDAN_GLASS, WHEELS_SEDAN);
    },
    drawSuv: function (ctx, x, y, w, h, palette) {
      drawSilhouette(ctx, x, y, w, h, palette, SUV_OUTLINE, SUV_GLASS, WHEELS_SUV);
    },
    drawWagon: function (ctx, x, y, w, h, palette) {
      drawSilhouette(ctx, x, y, w, h, palette, WAGON_OUTLINE, WAGON_GLASS, WHEELS_WAGON);
    },
    drawCoupe: function (ctx, x, y, w, h, palette) {
      drawSilhouette(ctx, x, y, w, h, palette, COUPE_OUTLINE, COUPE_GLASS, WHEELS_COUPE);
    },
    drawVan: function (ctx, x, y, w, h, palette) {
      drawSilhouette(ctx, x, y, w, h, palette, VAN_OUTLINE, VAN_GLASS, WHEELS_VAN);
    },

    // Fiecare model isi are propriile rapoarte de hitbox (mai mic decat sprite-ul,
    // niciodata folosit ca lever dinamic de dificultate - vezi joc-obstacles.js).
    // Modelele "boxy" (van, wagon) au mai putin spatiu gol la margini decat cele
    // "sportive" (coupe), deci raportul hitbox/sprite reflecta asta.
    CAR_MODELS: [
      { key: "hatchback", draw: null, hitboxShrinkX: 0.72, hitboxShrinkY: 0.68 },
      { key: "sedan", draw: null, hitboxShrinkX: 0.78, hitboxShrinkY: 0.62 },
      { key: "suv", draw: null, hitboxShrinkX: 0.74, hitboxShrinkY: 0.74 },
      { key: "wagon", draw: null, hitboxShrinkX: 0.80, hitboxShrinkY: 0.66 },
      { key: "coupe", draw: null, hitboxShrinkX: 0.70, hitboxShrinkY: 0.60 },
      { key: "van", draw: null, hitboxShrinkX: 0.82, hitboxShrinkY: 0.80 }
    ],

    drawCone: function (ctx, x, y, w, h) {
      var baseW = w;
      var topW = w * 0.32;
      var top = y;
      var bottom = y + h;

      ctx.fillStyle = "rgba(23, 23, 23, 0.22)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, bottom + 2, w / 1.8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1c1c1c";
      ctx.fillRect(px(x - 2), px(bottom - 4), px(baseW + 4), px(6));

      ctx.fillStyle = "#ff7a3d";
      fillPolygon(ctx, 0, 0, [
        [px(x + w / 2 - topW / 2), px(top)],
        [px(x + w / 2 + topW / 2), px(top)],
        [px(x + baseW), px(bottom - 4)],
        [px(x), px(bottom - 4)]
      ]);

      ctx.fillStyle = "#fff4df";
      var stripeY = top + h * 0.42;
      var stripeTopW = topW + (baseW - topW) * 0.32;
      var stripeBottomW = topW + (baseW - topW) * 0.5;
      fillPolygon(ctx, 0, 0, [
        [px(x + w / 2 - stripeTopW / 2), px(stripeY)],
        [px(x + w / 2 + stripeTopW / 2), px(stripeY)],
        [px(x + w / 2 + stripeBottomW / 2), px(stripeY + h * 0.14)],
        [px(x + w / 2 - stripeBottomW / 2), px(stripeY + h * 0.14)]
      ]);
    }
  };

  // Leaga fiecare model de functia lui de desenare (nu se pot referi la Sprites.drawX
  // in interiorul literalului de mai sus, inainte ca Sprites sa existe).
  var DRAW_BY_KEY = {
    hatchback: Sprites.drawHatchback,
    sedan: Sprites.drawSedan,
    suv: Sprites.drawSuv,
    wagon: Sprites.drawWagon,
    coupe: Sprites.drawCoupe,
    van: Sprites.drawVan
  };
  Sprites.CAR_MODELS.forEach(function (model) {
    model.draw = DRAW_BY_KEY[model.key];
  });

  FMGame.Sprites = Sprites;
})();
