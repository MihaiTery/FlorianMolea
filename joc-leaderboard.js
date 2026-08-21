// Florian Molea - Jocul: leaderboard local (fara backend), persistat in localStorage.
(function () {
  "use strict";

  var FMGame = window.FMGame = window.FMGame || {};
  var CONFIG = FMGame.CONFIG;

  function safeGetItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeSetItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  function isValidEntry(entry) {
    return (
      entry &&
      typeof entry === "object" &&
      typeof entry.name === "string" &&
      typeof entry.score === "number" &&
      isFinite(entry.score)
    );
  }

  function readList() {
    var raw = safeGetItem(CONFIG.STORAGE_LEADERBOARD);
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(isValidEntry)
        .map(function (entry) {
          return {
            name: String(entry.name).slice(0, CONFIG.MAX_NAME_LENGTH),
            score: Math.max(0, Math.floor(entry.score))
          };
        })
        .sort(function (a, b) {
          return b.score - a.score;
        })
        .slice(0, CONFIG.LEADERBOARD_SIZE);
    } catch (err) {
      return [];
    }
  }

  function writeList(list) {
    safeSetItem(CONFIG.STORAGE_LEADERBOARD, JSON.stringify(list));
  }

  function readHighScore() {
    var raw = safeGetItem(CONFIG.STORAGE_HIGHSCORE);
    var value = parseInt(raw, 10);
    return isFinite(value) && value > 0 ? value : 0;
  }

  function writeHighScore(value) {
    safeSetItem(CONFIG.STORAGE_HIGHSCORE, String(Math.max(0, Math.floor(value))));
  }

  function sanitizeName(name) {
    var trimmed = String(name || "").trim().slice(0, CONFIG.MAX_NAME_LENGTH);
    return trimmed.length > 0 ? trimmed : CONFIG.DEFAULT_NAME;
  }

  function qualifies(score) {
    if (!score || score <= 0) return false;
    var list = readList();
    if (list.length < CONFIG.LEADERBOARD_SIZE) return true;
    var lowest = list[list.length - 1];
    return score > lowest.score;
  }

  function submit(name, score) {
    var list = readList();
    list.push({ name: sanitizeName(name), score: Math.max(0, Math.floor(score)) });
    list.sort(function (a, b) {
      return b.score - a.score;
    });
    list = list.slice(0, CONFIG.LEADERBOARD_SIZE);
    writeList(list);
    return list;
  }

  function updateHighScore(score) {
    var current = readHighScore();
    if (score > current) {
      writeHighScore(score);
      return score;
    }
    return current;
  }

  FMGame.Leaderboard = {
    getList: readList,
    getHighScore: readHighScore,
    updateHighScore: updateHighScore,
    qualifies: qualifies,
    submit: submit,
    sanitizeName: sanitizeName
  };
})();
