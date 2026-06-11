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

const hasAcceptedAnalytics = () => localStorage.getItem(cookieConsentKey) === "accepted";

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

const createCookieBanner = () => {
  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.setAttribute("aria-label", "Preferințe cookies");
  banner.innerHTML = `
    <p>Folosim cookies pentru a analiza traficul și pentru a îmbunătăți experiența pe website. Poți accepta sau refuza cookies de analiză.</p>
    <div class="cookie-banner-actions">
      <a href="/cookies-policy.html">Află mai multe</a>
      <button class="cookie-btn cookie-btn-secondary" type="button" data-cookie-reject>Refuz</button>
      <button class="cookie-btn cookie-btn-primary" type="button" data-cookie-accept>Accept</button>
    </div>
  `;

  document.body.appendChild(banner);

  banner.querySelector("[data-cookie-accept]").addEventListener("click", () => {
    localStorage.setItem(cookieConsentKey, "accepted");
    loadGoogleAnalytics();
    banner.remove();
  });

  banner.querySelector("[data-cookie-reject]").addEventListener("click", () => {
    localStorage.setItem(cookieConsentKey, "rejected");
    banner.remove();
  });
};

const initCookieConsent = () => {
  const savedPreference = localStorage.getItem(cookieConsentKey);

  if (savedPreference === "accepted") {
    loadGoogleAnalytics();
    return;
  }

  if (savedPreference === "rejected") {
    return;
  }

  createCookieBanner();
};

initCookieConsent();

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

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

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
