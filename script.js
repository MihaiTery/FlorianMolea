const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const revealItems = document.querySelectorAll(".reveal");
const gaMeasurementId = "G-4X05ZPXPBN";
const cookieConsentKey = "florianMoleaCookieConsent";
let isGoogleAnalyticsLoaded = false;
const trackedClickEvents = [
  {
    eventName: "click_whatsapp",
    selector: 'a[href*="wa.me/40768622688"], a[href*="api.whatsapp.com/send"]'
  },
  {
    eventName: "click_youtube",
    selector: 'a[href*="youtube.com/@florianmolea"], a[href*="youtu.be/"]'
  },
  {
    eventName: "click_tiktok",
    selector: 'a[href*="tiktok.com/@florianmolea"]'
  },
  {
    eventName: "click_instagram",
    selector: 'a[href*="instagram.com/florianmoleainstructor"]'
  },
  {
    eventName: "click_facebook",
    selector: 'a[href*="facebook.com/Florianmoleainstructor"]'
  },
  {
    eventName: "click_x",
    selector: 'a[href*="x.com/FlorianMolea"]'
  },
  {
    eventName: "click_partner",
    selector: 'a.partner-card, a[data-ga-event="click_partner"]'
  }
];

const readConsent = () => {
  try {
    const raw = localStorage.getItem(cookieConsentKey);

    if (!raw) {
      return null;
    }

    // Compatibilitate cu formatul vechi (string simplu "accepted"/"rejected").
    if (raw === "accepted") {
      return { analytics: true, decidedAt: null, version: 1 };
    }

    if (raw === "rejected") {
      return { analytics: false, decidedAt: null, version: 1 };
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
};

const writeConsent = (analyticsAccepted) => {
  localStorage.setItem(cookieConsentKey, JSON.stringify({
    analytics: Boolean(analyticsAccepted),
    decidedAt: new Date().toISOString(),
    version: 1
  }));
};

const hasAcceptedAnalytics = () => {
  const consent = readConsent();
  return Boolean(consent && consent.analytics);
};

const loadGoogleAnalytics = () => {
  if (isGoogleAnalyticsLoaded || !hasAcceptedAnalytics()) {
    return;
  }

  isGoogleAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const analyticsScript = document.createElement("script");
  analyticsScript.async = true;
  analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
  document.head.appendChild(analyticsScript);

  window.gtag("js", new Date());
  window.gtag("config", gaMeasurementId);
};

const trackEvent = (eventName, params = {}) => {
  if (!hasAcceptedAnalytics() || !isGoogleAnalyticsLoaded || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
};

/* ---------- Consimțământ cookies: banner + panou de personalizare ---------- */

let cookieUiPreviousFocus = null;

const getCookieBanner = () => document.querySelector("[data-cookie-banner]");
const getCookieModalOverlay = () => document.querySelector("[data-cookie-settings-overlay]");

const removeCookieBanner = () => {
  const banner = getCookieBanner();
  if (banner) {
    banner.remove();
  }
};

const trapCookieUiFocus = (event, container) => {
  const focusable = Array.from(
    container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
  ).filter((el) => el.offsetParent !== null);

  if (focusable.length === 0) {
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const closeCookieSettings = () => {
  const overlay = getCookieModalOverlay();

  if (!overlay) {
    return;
  }

  overlay.remove();

  if (cookieUiPreviousFocus instanceof HTMLElement) {
    cookieUiPreviousFocus.focus();
  }
};

const openCookieSettings = () => {
  if (getCookieModalOverlay()) {
    return;
  }

  cookieUiPreviousFocus = document.activeElement;

  const current = readConsent();
  const analyticsChecked = current ? current.analytics : false;

  const overlay = document.createElement("div");
  overlay.className = "cookie-settings-overlay";
  overlay.setAttribute("data-cookie-settings-overlay", "");

  overlay.innerHTML = `
    <div class="cookie-settings-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
      <h2 id="cookie-settings-title">Setări cookies</h2>
      <p>Alege ce categorii de cookies pot fi folosite pe florianmolea.ro. Poți reveni oricând la această fereastră din linkul „Setări cookies” din subsolul paginii.</p>

      <div class="cookie-category">
        <div class="cookie-category-copy">
          <h3>Necesare</h3>
          <p>Necesare pentru funcționarea website-ului și a coșului de cumpărături. Nu pot fi dezactivate.</p>
        </div>
        <span class="cookie-switch">
          <input type="checkbox" id="cookie-cat-necessary" checked disabled>
          <span class="cookie-switch-track" aria-hidden="true"></span>
        </span>
      </div>

      <div class="cookie-category">
        <div class="cookie-category-copy">
          <h3>Analiză / statistică</h3>
          <p>Google Analytics 4 — ne ajută să înțelegem traficul și utilizarea website-ului. Se activează doar cu acordul tău.</p>
        </div>
        <span class="cookie-switch">
          <input type="checkbox" id="cookie-cat-analytics" data-cookie-analytics-toggle ${analyticsChecked ? "checked" : ""}>
          <span class="cookie-switch-track" aria-hidden="true"></span>
        </span>
      </div>

      <p><a href="/cookies-policy.html">Vezi Politica de Cookies completă</a></p>

      <div class="cookie-settings-actions">
        <button type="button" class="btn btn-outline" data-cookie-cancel>Anulează</button>
        <button type="button" class="btn btn-primary" data-cookie-save>Salvează preferințele</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const modal = overlay.querySelector(".cookie-settings-modal");
  const analyticsToggle = overlay.querySelector("[data-cookie-analytics-toggle]");

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeCookieSettings();
    }
  });

  overlay.querySelector("[data-cookie-cancel]").addEventListener("click", closeCookieSettings);

  overlay.querySelector("[data-cookie-save]").addEventListener("click", () => {
    writeConsent(analyticsToggle.checked);

    if (analyticsToggle.checked) {
      loadGoogleAnalytics();
    }

    removeCookieBanner();
    closeCookieSettings();
  });

  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCookieSettings();
      return;
    }

    if (event.key === "Tab") {
      trapCookieUiFocus(event, modal);
    }
  });

  window.requestAnimationFrame(() => {
    analyticsToggle.focus();
  });
};

const createCookieBanner = () => {
  if (getCookieBanner()) {
    return;
  }

  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.setAttribute("data-cookie-banner", "");
  banner.setAttribute("aria-label", "Preferințe cookies");
  banner.innerHTML = `
    <p>Folosim cookies necesare pentru funcționarea website-ului și, doar cu acordul tău, cookies de analiză pentru a înțelege traficul. <a href="/cookies-policy.html">Află mai multe</a>.</p>
    <div class="cookie-banner-actions">
      <button class="cookie-btn" type="button" data-cookie-customize>Personalizează</button>
      <button class="cookie-btn cookie-btn-secondary" type="button" data-cookie-reject>Refuză opționale</button>
      <button class="cookie-btn cookie-btn-primary" type="button" data-cookie-accept>Acceptă toate</button>
    </div>
  `;

  document.body.appendChild(banner);

  banner.querySelector("[data-cookie-accept]").addEventListener("click", () => {
    writeConsent(true);
    loadGoogleAnalytics();
    banner.remove();
  });

  banner.querySelector("[data-cookie-reject]").addEventListener("click", () => {
    writeConsent(false);
    banner.remove();
  });

  banner.querySelector("[data-cookie-customize]").addEventListener("click", () => {
    openCookieSettings();
  });
};

const initCookieConsent = () => {
  const consent = readConsent();

  if (consent) {
    if (consent.analytics) {
      loadGoogleAnalytics();
    }
    return;
  }

  createCookieBanner();
};

initCookieConsent();

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (event.target.closest("[data-cookie-settings-open]")) {
    event.preventDefault();
    openCookieSettings();
  }
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const clickedLink = event.target.closest("a");

  if (!clickedLink) {
    return;
  }

  const directEventName = clickedLink.dataset.gaEvent;

  if (directEventName) {
    trackEvent(directEventName, {
      link_url: clickedLink.href
    });
    return;
  }

  const trackedEvent = trackedClickEvents.find(({ selector }) => clickedLink.matches(selector));

  if (trackedEvent) {
    trackEvent(trackedEvent.eventName);
  }
});

const setHeaderState = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 10);
};

let headerStateTicking = false;

const queueHeaderState = () => {
  if (headerStateTicking) {
    return;
  }

  headerStateTicking = true;
  requestAnimationFrame(() => {
    setHeaderState();
    headerStateTicking = false;
  });
};

setHeaderState();
window.addEventListener("scroll", queueHeaderState, { passive: true });

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  document.body.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    nav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.16,
    rootMargin: "0px 0px -40px 0px"
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

const mediaKitFallbackData = {
  lastUpdate: "Iunie 2026",
  hero: {
    views30: "0",
    engagement30: "0"
  },
  social: {
    tiktok: {
      followers: "0",
      views30: "0",
      engagement30: "0"
    },
    instagram: {
      followers: "0",
      views30: "0",
      engagement30: "0"
    },
    facebook: {
      followers: "0",
      views30: "0",
      engagement30: "0"
    },
    youtube: {
      followers: "0",
      views30: "0"
    }
  },
  topVideos: [
    {
      title: "Cel mai performant clip #1",
      platform: "TikTok",
      views: "0",
      engagement: "0",
      url: "#"
    },
    {
      title: "Cel mai performant clip #2",
      platform: "YouTube Shorts",
      views: "0",
      engagement: "0",
      url: "#"
    },
    {
      title: "Cel mai performant clip #3",
      platform: "Instagram Reels",
      views: "0",
      engagement: "0",
      url: "#"
    }
  ],
  previousPartnerships: [
    {
      brand: "Exemplu partener",
      period: "Iunie 2026",
      type: "Short-form campaign",
      platforms: "TikTok, Instagram, Facebook, YouTube Shorts",
      views: "0",
      engagement: "0",
      url: "#"
    }
  ]
};

const getMediaValue = (data, path) => {
  return path.split(".").reduce((value, key) => {
    if (value && Object.prototype.hasOwnProperty.call(value, key)) {
      return value[key];
    }

    return undefined;
  }, data);
};

const observeNewRevealItems = (root) => {
  root.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));
};

const isPlaceholderPartnership = (partnership) => {
  return partnership.brand === "Exemplu partener" && partnership.url === "#";
};

const createTrackedLink = (href, label, eventName, className = "media-link-btn") => {
  const link = document.createElement("a");
  link.className = className;
  link.href = href || "#";
  link.textContent = label;
  link.dataset.gaEvent = eventName;

  if (href && href !== "#") {
    link.target = "_blank";
    link.rel = "noopener";
  }

  return link;
};

const renderMediaKitData = (data) => {
  document.querySelectorAll("[data-media-field]").forEach((element) => {
    const value = getMediaValue(data, element.dataset.mediaField);

    if (value !== undefined) {
      element.textContent = value;
    }
  });

  const topVideosContainer = document.querySelector("[data-top-videos]");

  if (topVideosContainer) {
    topVideosContainer.innerHTML = "";
    data.topVideos.slice(0, 3).forEach((video) => {
      const card = document.createElement("article");
      card.className = "video-card reveal";
      card.innerHTML = `
        <span>${video.platform}</span>
        <h3>${video.title}</h3>
        <dl>
          <div>
            <dt>Views</dt>
            <dd>${video.views}</dd>
          </div>
          <div>
            <dt>Engagement</dt>
            <dd>${video.engagement}</dd>
          </div>
        </dl>
      `;
      card.appendChild(createTrackedLink(video.url, "Vezi clipul", "click_partner_video"));
      topVideosContainer.appendChild(card);
    });
    observeNewRevealItems(topVideosContainer);
  }

  const partnershipsContainer = document.querySelector("[data-previous-partnerships]");
  const emptyPartnerships = document.querySelector("[data-empty-partnerships]");

  if (partnershipsContainer) {
    const partnerships = data.previousPartnerships || [];
    const hasOnlyPlaceholder = partnerships.length === 0 || partnerships.every(isPlaceholderPartnership);
    partnershipsContainer.innerHTML = "";

    if (emptyPartnerships) {
      emptyPartnerships.hidden = !hasOnlyPlaceholder;
    }

    if (!hasOnlyPlaceholder) {
      partnerships.forEach((partnership) => {
        const card = document.createElement("article");
        card.className = "campaign-card reveal";
        card.innerHTML = `
          <span>${partnership.period}</span>
          <h3>${partnership.brand}</h3>
          <dl>
            <div>
              <dt>Tip campanie</dt>
              <dd>${partnership.type}</dd>
            </div>
            <div>
              <dt>Platforme</dt>
              <dd>${partnership.platforms}</dd>
            </div>
            <div>
              <dt>Views</dt>
              <dd>${partnership.views}</dd>
            </div>
            <div>
              <dt>Engagement</dt>
              <dd>${partnership.engagement}</dd>
            </div>
          </dl>
        `;
        card.appendChild(createTrackedLink(partnership.url, "Vezi campania", "click_partner_campaign"));
        partnershipsContainer.appendChild(card);
      });
      observeNewRevealItems(partnershipsContainer);
    }
  }
};

const initMediaKit = async () => {
  if (!document.querySelector("[data-media-kit]")) {
    return;
  }

  try {
    const response = await fetch("media-kit-data.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Media kit data request failed");
    }

    renderMediaKitData(await response.json());
  } catch (error) {
    renderMediaKitData(mediaKitFallbackData);
  }
};

initMediaKit();

const initTestimonials = async () => {
  const section = document.querySelector("[data-testimonials]");

  if (!section) {
    return;
  }

  try {
    const response = await fetch("testimonials-data.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Testimonials request failed");
    }

    const data = await response.json();
    const testimonials = data.testimonials || [];

    if (testimonials.length === 0) {
      return;
    }

    const list = section.querySelector("[data-testimonials-list]");
    list.innerHTML = "";

    testimonials.forEach((testimonial) => {
      const rating = Math.max(0, Math.min(5, testimonial.rating || 5));
      const card = document.createElement("article");
      card.className = "testimonial-card reveal";
      card.innerHTML = `
        <span class="testimonial-rating" aria-label="${rating} din 5 stele">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span>
        <p class="testimonial-quote">"${testimonial.quote}"</p>
        <span class="testimonial-author">${testimonial.name}${testimonial.context ? ` — ${testimonial.context}` : ""}</span>
      `;
      list.appendChild(card);
    });

    section.hidden = false;
    observeNewRevealItems(list);
  } catch (error) {
    // Section stays hidden when there is no testimonial data yet.
  }
};

initTestimonials();

document.querySelectorAll("details").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (!details.open) {
      return;
    }

    document.querySelectorAll("details[open]").forEach((openDetails) => {
      if (openDetails !== details) {
        openDetails.open = false;
      }
    });
  });
});
