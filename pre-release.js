"use strict";

/*
  PRE-RELEASE TEMPORARY — drag-to-reveal teaser slider for the front page shop
  promo. Remove this file and its <script> tag before release.
  See pre-release.txt for the full removal checklist.
*/

(function () {
  const slider = document.querySelector("[data-pre-release-slider]");
  const cover = document.querySelector("[data-pre-release-cover]");
  const hint = document.querySelector("[data-pre-release-slider-hint]");

  if (!slider || !cover) {
    return;
  }

  const UNLOCK_THRESHOLD = 96;

  const updateFill = () => {
    const value = Number(slider.value) || 0;
    slider.style.setProperty("--pre-release-progress", `${value}%`);

    if (hint) {
      hint.style.opacity = value > 6 ? "0" : "1";
    }
  };

  const unlock = () => {
    document.body.classList.add("shop-teaser-unlocked");
    cover.classList.add("is-unlocked");
    slider.disabled = true;
  };

  slider.addEventListener("input", () => {
    updateFill();

    if (Number(slider.value) >= UNLOCK_THRESHOLD) {
      unlock();
    }
  });

  updateFill();
})();
