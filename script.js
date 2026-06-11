const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const revealItems = document.querySelectorAll(".reveal");
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

const trackEvent = (eventName) => {
  if (typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName);
};

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const clickedLink = event.target.closest("a");

  if (!clickedLink) {
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
