"use strict";

const SHOP_CONFIG = {
  currency: "RON",
  locale: "ro-RO",
  shippingCost: 25,
  freeShippingMinQuantity: 2,
  maxQuantityPerProduct: 20,
  cartStorageKey: "florianmolea_cart_v1"
};

// Comutator central al modului live al comerțului. Rămâne "false" până când
// documentația de siguranță VANESICA FRESH SRL este confirmată ("documentationStatus":
// "confirmed") pentru toate produsele active — vezi COMPLIANCE-TODO.md. În modul live,
// produsele cu date critice incomplete nu mai pot fi adăugate în coș (secțiunea 17).
const IS_LIVE_COMMERCE = false;

// Comutator separat pentru fluxul de plată online (Stripe, mediul de staging).
// Nu are legătură cu IS_LIVE_COMMERCE (acela gestionează conformitatea datelor de
// produs). Cât timp rămâne "false": butonul de comandă rămâne dezactivat, NU se
// trimite niciun POST /checkout/session, iar niciun vizitator public nu poate crea
// o comandă — restul interfeței (magazin, coș, formularul de checkout) rămâne
// testabil vizual. Singurul mod de a-l activa este să editezi manual valoarea de mai
// jos, local — nu există niciun query parameter, flag din localStorage sau alt
// mecanism public care îl poate activa de la distanță.
const SHOP_CHECKOUT_ENABLED = false;

// URL-ul API-ului Worker de staging. Relevant doar când SHOP_CHECKOUT_ENABLED = true.
// Înlocuiește cu URL-ul real după primul `wrangler deploy --env staging`.
const SHOP_CHECKOUT_API_BASE = "https://florianmolea-shop-api-staging.florianmolea.workers.dev";

const LEGAL_DATA_URLS = {
  legalConfig: "data/legal-config.json",
  manufacturers: "data/manufacturers.json"
};

// NOTĂ PENTRU INTEGRAREA STRIPE (etapă viitoare):
// - Prețurile, stocul și totalurile din acest fișier sunt doar pentru afișarea în frontend.
// - La checkout real, un backend va recalcula produsele, prețurile, stocul, transportul și totalul —
//   frontend-ul (acest fișier) nu va fi niciodată sursa de adevăr la plată.
// - Stripe Checkout Session va fi creată exclusiv server-side, niciodată din acest fișier.
// - Facturarea se va face prin API-ul Oblio, apelat de backend doar după confirmarea
//   plății printr-un webhook Stripe.

const moneyFormatter = new Intl.NumberFormat(SHOP_CONFIG.locale, {
  style: "currency",
  currency: SHOP_CONFIG.currency
});

const formatMoney = (amount) => moneyFormatter.format(Number(amount) || 0);

let products = [];
let productsError = false;
let productsPromise = null;
let cart = [];

let legalConfig = null;
let manufacturers = {};
let legalDataError = false;
let legalDataPromise = null;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[char]));

const trackShopEvent = (eventName, params = {}) => {
  if (typeof trackEvent === "function") {
    trackEvent(eventName, params);
  }
};

const getCartAnnouncer = () => {
  let element = document.querySelector("[data-cart-announcer]");

  if (!element) {
    element = document.createElement("div");
    element.className = "visually-hidden";
    element.setAttribute("aria-live", "polite");
    element.setAttribute("data-cart-announcer", "");
    document.body.appendChild(element);
  }

  return element;
};

const announce = (message) => {
  const announcer = getCartAnnouncer();
  announcer.textContent = "";
  window.requestAnimationFrame(() => {
    announcer.textContent = message;
  });
};

/* ---------- Produse ---------- */

const loadProducts = () => {
  if (productsPromise) {
    return productsPromise;
  }

  productsPromise = fetch("products.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error("products.json request failed");
      }
      return response.json();
    })
    .then((data) => {
      products = Array.isArray(data) ? data : [];
      productsError = false;
      return products;
    })
    .catch(() => {
      products = [];
      productsError = true;
      return products;
    });

  return productsPromise;
};

const getProductById = (productId) => products.find((product) => product.id === productId);

const getProductBySlug = (slug) => products.find((product) => product.slug === slug);

const getActiveProducts = () => products.filter((product) => product.active);

/* ---------- Date juridice: vânzător + producători ---------- */

const loadLegalData = () => {
  if (legalDataPromise) {
    return legalDataPromise;
  }

  const fetchJson = (url) => fetch(url, { cache: "no-store" }).then((response) => {
    if (!response.ok) {
      throw new Error(`${url} request failed`);
    }
    return response.json();
  });

  legalDataPromise = Promise.all([
    fetchJson(LEGAL_DATA_URLS.legalConfig),
    fetchJson(LEGAL_DATA_URLS.manufacturers)
  ])
    .then(([configData, manufacturersData]) => {
      legalConfig = configData && typeof configData === "object" ? configData : null;
      manufacturers = manufacturersData && typeof manufacturersData === "object" ? manufacturersData : {};
      legalDataError = !legalConfig;
    })
    .catch(() => {
      legalConfig = null;
      manufacturers = {};
      legalDataError = true;
    });

  return legalDataPromise;
};

const getManufacturer = (manufacturerId) => (manufacturerId && manufacturers[manufacturerId]) || null;

/* ---------- Conformitate comercială (secțiunea 17) ---------- */

const validateCommerceCompliance = (product, config, manufacturersRegistry) => {
  const missing = [];

  if (!config || !config.seller || !config.seller.legalName) {
    missing.push("vânzător configurat");
  }

  const manufacturer = product && manufacturersRegistry ? manufacturersRegistry[product.manufacturerId] : null;

  if (!product || !product.manufacturerId || !manufacturer) {
    missing.push("producător configurat");
    return { compliant: false, missing };
  }

  const address = manufacturer.postalAddress;

  if (!address || !address.locality || !address.county || !address.postalCode || !address.country) {
    missing.push("adresă poștală a producătorului");
  }

  if (!manufacturer.electronicAddress) {
    missing.push("adresă electronică a producătorului");
  }

  if (!product.productIdentifier) {
    missing.push("identificator de produs");
  }

  if (!product.netQuantity) {
    missing.push("cantitate netă");
  }

  const safety = product.safety || {};

  if (!Array.isArray(safety.usageInstructions) || safety.usageInstructions.length === 0) {
    missing.push("instrucțiuni de utilizare");
  }

  if (!Array.isArray(safety.warnings) || safety.warnings.length === 0) {
    missing.push("avertismente");
  }

  const clp = safety.clp || {};

  if (clp.applicable === null || clp.applicable === undefined) {
    missing.push("status CLP explicit (aplicabil/neaplicabil)");
  }

  if (safety.documentationStatus !== "confirmed") {
    missing.push("confirmarea documentației producătorului");
  }

  return { compliant: missing.length === 0, missing };
};

const logComplianceWarning = (product, result) => {
  if (typeof console === "undefined" || !result || result.compliant) {
    return;
  }

  console.warn(
    `[conformitate comercială] Produsul "${product.id}" are date lipsă: ${result.missing.join(", ")}.` +
    (IS_LIVE_COMMERCE ? " Cumpărarea este blocată în modul live." : " Vizibil doar în mediul de dezvoltare/test.")
  );
};

const isProductPurchasable = (product) => {
  if (!product || !product.active || product.stock <= 0) {
    return false;
  }

  const result = validateCommerceCompliance(product, legalConfig, manufacturers);
  logComplianceWarning(product, result);

  if (!IS_LIVE_COMMERCE) {
    return true;
  }

  return result.compliant;
};

/* ---------- Coș: persistență ---------- */

const clampQuantity = (product, quantity) => {
  const maxAllowed = Math.min(product.stock, SHOP_CONFIG.maxQuantityPerProduct);
  const safeQuantity = Math.trunc(Number(quantity));

  if (!Number.isFinite(safeQuantity) || safeQuantity < 1 || maxAllowed < 1) {
    return 0;
  }

  return Math.min(safeQuantity, maxAllowed);
};

const sanitizeCart = (rawCart) => {
  if (productsError) {
    return rawCart;
  }

  return rawCart.reduce((cleaned, entry) => {
    const product = getProductById(entry.productId);

    // Un produs poate fi salvat în coș dintr-o sesiune anterioară (mod dev/test)
    // și devine neconform ulterior în modul live — nu presupune că doar addToCart()
    // controlează ce ajunge în coș; verifică din nou aici la fiecare încărcare.
    if (!product || !isProductPurchasable(product)) {
      return cleaned;
    }

    const quantity = clampQuantity(product, entry.quantity);

    if (quantity > 0) {
      cleaned.push({ productId: entry.productId, quantity });
    }

    return cleaned;
  }, []);
};

const readRawCart = () => {
  try {
    const raw = localStorage.getItem(SHOP_CONFIG.cartStorageKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.reduce((cleaned, entry) => {
      if (!entry || typeof entry.productId !== "string" || !entry.productId.trim()) {
        return cleaned;
      }

      const quantity = Math.trunc(Number(entry.quantity));

      if (Number.isFinite(quantity) && quantity > 0) {
        cleaned.push({ productId: entry.productId, quantity });
      }

      return cleaned;
    }, []);
  } catch (error) {
    return [];
  }
};

const loadCart = () => {
  cart = sanitizeCart(readRawCart());
  return cart;
};

const saveCart = () => {
  const payload = cart.map(({ productId, quantity }) => ({ productId, quantity }));
  localStorage.setItem(SHOP_CONFIG.cartStorageKey, JSON.stringify(payload));
  renderAll();
};

const getCartCount = () => cart.reduce((total, entry) => total + entry.quantity, 0);

const getCartSubtotal = () => cart.reduce((total, entry) => {
  const product = getProductById(entry.productId);
  return product ? total + product.price * entry.quantity : total;
}, 0);

const getShippingInfo = () => {
  const subtotal = getCartSubtotal();
  const quantity = getCartCount();
  const isFree = quantity >= SHOP_CONFIG.freeShippingMinQuantity;
  const remainingQuantity = Math.max(0, SHOP_CONFIG.freeShippingMinQuantity - quantity);
  const shippingCost = cart.length === 0 ? 0 : (isFree ? 0 : SHOP_CONFIG.shippingCost);

  return { subtotal, quantity, isFree, remainingQuantity, shippingCost, total: subtotal + shippingCost };
};

const addToCart = (productId, quantity = 1) => {
  const product = getProductById(productId);

  if (!product || !product.active || product.stock <= 0) {
    return { ok: false, reason: "unavailable" };
  }

  // Reverifică regula de conformitate comercială aici, nu doar la randare: UI-ul
  // ascunde butonul pentru produse neconforme în modul live, dar cineva ar putea
  // apela addToCart() direct (consolă, DOM modificat manual) — funcția trebuie să
  // rămână sursa de adevăr pentru blocarea comercială, nu doar markup-ul cardului.
  if (!isProductPurchasable(product)) {
    return { ok: false, reason: "not-compliant" };
  }

  const requestedQuantity = Math.trunc(Number(quantity));

  if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
    return { ok: false, reason: "invalid" };
  }

  const existing = cart.find((entry) => entry.productId === productId);
  const previousQuantity = existing ? existing.quantity : 0;
  const finalQuantity = clampQuantity(product, previousQuantity + requestedQuantity);

  if (finalQuantity <= previousQuantity) {
    return { ok: false, reason: "max-stock" };
  }

  if (existing) {
    existing.quantity = finalQuantity;
  } else {
    cart.push({ productId, quantity: finalQuantity });
  }

  saveCart();

  const addedQuantity = finalQuantity - previousQuantity;
  trackShopEvent("add_to_cart", {
    currency: SHOP_CONFIG.currency,
    value: Number((product.price * addedQuantity).toFixed(2)),
    items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: addedQuantity }]
  });

  return { ok: true, quantity: finalQuantity };
};

const removeFromCart = (productId) => {
  const index = cart.findIndex((entry) => entry.productId === productId);

  if (index === -1) {
    return;
  }

  const [removed] = cart.splice(index, 1);
  const product = getProductById(productId);
  saveCart();

  if (product) {
    trackShopEvent("remove_from_cart", {
      currency: SHOP_CONFIG.currency,
      value: Number((product.price * removed.quantity).toFixed(2)),
      items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: removed.quantity }]
    });
  }
};

const updateCartQuantity = (productId, quantity) => {
  const product = getProductById(productId);
  const existing = cart.find((entry) => entry.productId === productId);

  if (!product || !existing) {
    return;
  }

  const safeQuantity = clampQuantity(product, quantity);

  if (safeQuantity <= 0) {
    removeFromCart(productId);
    return;
  }

  existing.quantity = safeQuantity;
  saveCart();
};

const clearCart = () => {
  cart = [];
  saveCart();
};

/* ---------- Randare: badge + drawer ---------- */

const renderCartBadge = () => {
  const count = getCartCount();

  document.querySelectorAll("[data-cart-badge]").forEach((badge) => {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  });

  document.querySelectorAll("[data-cart-toggle]").forEach((button) => {
    button.setAttribute("aria-label", count > 0 ? `Deschide coșul (${count} produse)` : "Deschide coșul");
  });
};

const buildCartLineItemMarkup = (product, entry, options = {}) => {
  const { editable = false } = options;
  const maxAllowed = Math.min(product.stock, SHOP_CONFIG.maxQuantityPerProduct);
  const name = escapeHtml(product.shortName || product.name);

  const qtyControl = editable
    ? `
      <div class="cart-item-qty" role="group" aria-label="Cantitate ${name}">
        <button type="button" class="qty-btn" data-cart-decrease aria-label="Scade cantitatea">−</button>
        <input type="number" inputmode="numeric" class="cart-qty-input" data-cart-qty-input min="1" max="${maxAllowed}" step="1" value="${entry.quantity}" aria-label="Cantitate ${name}">
        <button type="button" class="qty-btn" data-cart-increase aria-label="Crește cantitatea" ${entry.quantity >= maxAllowed ? "disabled" : ""}>+</button>
      </div>
    `
    : `
      <div class="cart-item-qty" role="group" aria-label="Cantitate ${name}">
        <button type="button" class="qty-btn" data-cart-decrease aria-label="Scade cantitatea">−</button>
        <span data-cart-qty-value>${entry.quantity}</span>
        <button type="button" class="qty-btn" data-cart-increase aria-label="Crește cantitatea" ${entry.quantity >= maxAllowed ? "disabled" : ""}>+</button>
      </div>
    `;

  return `
    <li class="cart-item" data-cart-item="${escapeHtml(product.id)}">
      <img class="cart-item-media" src="${escapeHtml(product.image)}" alt="" width="72" height="72" loading="lazy" decoding="async">
      <div class="cart-item-info">
        <p class="cart-item-name">${name}</p>
        <p class="cart-item-price">${formatMoney(product.price)} / buc.</p>
        ${qtyControl}
      </div>
      <div class="cart-item-side">
        <p class="cart-item-line-total">${formatMoney(product.price * entry.quantity)}</p>
        <button type="button" class="cart-item-remove" data-cart-remove aria-label="Elimină ${name} din coș">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16"></path><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"></path></svg>
        </button>
      </div>
    </li>
  `;
};

const buildCartListMarkup = (options) => {
  if (productsError) {
    return `<li class="cart-empty-state"><p>Nu am putut încărca produsele momentan. Reîncarcă pagina sau revino mai târziu.</p></li>`;
  }

  if (cart.length === 0) {
    return "";
  }

  return cart.map((entry) => {
    const product = getProductById(entry.productId);
    return product ? buildCartLineItemMarkup(product, entry, options) : "";
  }).join("");
};

const getFocusableElements = (container) => Array.from(
  container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
).filter((el) => el.offsetParent !== null);

const trapFocus = (event, container) => {
  const focusable = getFocusableElements(container);

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

const wireCartItemEvents = (container) => {
  if (!container || container.dataset.cartEventsWired) {
    return;
  }

  container.dataset.cartEventsWired = "true";

  container.addEventListener("click", (event) => {
    const item = event.target.closest("[data-cart-item]");

    if (!item) {
      return;
    }

    const productId = item.dataset.cartItem;
    const entry = cart.find((cartEntry) => cartEntry.productId === productId);

    if (!entry) {
      return;
    }

    if (event.target.closest("[data-cart-increase]")) {
      updateCartQuantity(productId, entry.quantity + 1);
    } else if (event.target.closest("[data-cart-decrease]")) {
      updateCartQuantity(productId, entry.quantity - 1);
    } else if (event.target.closest("[data-cart-remove]")) {
      const product = getProductById(productId);
      removeFromCart(productId);
      announce(`${product ? (product.shortName || product.name) : "Produsul"} a fost eliminat din coș.`);
    }
  });

  container.addEventListener("change", (event) => {
    const input = event.target.closest("[data-cart-qty-input]");

    if (!input) {
      return;
    }

    const item = event.target.closest("[data-cart-item]");

    if (!item) {
      return;
    }

    updateCartQuantity(item.dataset.cartItem, input.value);
  });
};

let cartDrawerPreviousFocus = null;

const injectCartDrawer = () => {
  if (document.querySelector("[data-cart-drawer]")) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="cart-drawer-overlay" data-cart-overlay hidden></div>
    <aside id="cart-drawer" class="cart-drawer" data-cart-drawer role="dialog" aria-modal="true" aria-label="Coșul tău" hidden>
      <div class="cart-drawer-head">
        <h2>Coșul tău</h2>
        <button type="button" class="cart-drawer-close" data-cart-close aria-label="Închide coșul">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>
        </button>
      </div>
      <ul class="cart-item-list" data-cart-drawer-body></ul>
      <div class="cart-drawer-footer" data-cart-drawer-footer hidden>
        <p class="cart-shipping-note" data-cart-shipping-note></p>
        <div class="cart-drawer-subtotal">
          <span>Subtotal</span>
          <strong data-cart-subtotal>${formatMoney(0)}</strong>
        </div>
        <div class="cart-drawer-actions">
          <a class="btn btn-outline" href="/cos.html">Vezi coșul</a>
          <a class="btn btn-primary" href="/checkout.html">Continuă către checkout</a>
        </div>
      </div>
    </aside>
  `;

  while (wrapper.firstChild) {
    document.body.appendChild(wrapper.firstChild);
  }

  const overlay = document.querySelector("[data-cart-overlay]");
  const drawer = document.querySelector("[data-cart-drawer]");
  const closeButton = drawer.querySelector("[data-cart-close]");

  overlay.addEventListener("click", closeCartDrawer);
  closeButton.addEventListener("click", closeCartDrawer);
  wireCartItemEvents(drawer.querySelector("[data-cart-drawer-body]"));

  drawer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCartDrawer();
      return;
    }

    if (event.key === "Tab") {
      trapFocus(event, drawer);
    }
  });
};

const renderCartDrawer = () => {
  const drawer = document.querySelector("[data-cart-drawer]");

  if (!drawer) {
    return;
  }

  const body = drawer.querySelector("[data-cart-drawer-body]");
  const footer = drawer.querySelector("[data-cart-drawer-footer]");
  const subtotalEl = drawer.querySelector("[data-cart-subtotal]");
  const shippingNote = drawer.querySelector("[data-cart-shipping-note]");

  if (productsError) {
    body.innerHTML = `<li class="cart-empty-state"><p>Nu am putut încărca produsele momentan. Reîncarcă pagina sau revino mai târziu.</p></li>`;
    footer.hidden = true;
    return;
  }

  if (cart.length === 0) {
    body.innerHTML = `
      <li class="cart-empty-state">
        <p>Coșul tău este gol momentan.</p>
        <a class="btn btn-primary" href="/magazin.html">Vezi magazinul</a>
      </li>
    `;
    footer.hidden = true;
    return;
  }

  body.innerHTML = buildCartListMarkup({ editable: false });
  footer.hidden = false;

  const shipping = getShippingInfo();
  subtotalEl.textContent = formatMoney(shipping.subtotal);
  shippingNote.textContent = shipping.isFree
    ? "Ai transport gratuit."
    : "Mai adaugă un produs pentru transport gratuit.";
};

const openCartDrawer = () => {
  const overlay = document.querySelector("[data-cart-overlay]");
  const drawer = document.querySelector("[data-cart-drawer]");

  if (!overlay || !drawer) {
    return;
  }

  cartDrawerPreviousFocus = document.activeElement;
  overlay.hidden = false;
  drawer.hidden = false;
  document.body.classList.add("cart-open");

  const closeButton = drawer.querySelector("[data-cart-close]");

  window.requestAnimationFrame(() => {
    drawer.classList.add("is-open");
    overlay.classList.add("is-open");
    closeButton.focus();
  });

  if (cart.length > 0) {
    trackShopEvent("view_cart", {
      currency: SHOP_CONFIG.currency,
      value: Number(getCartSubtotal().toFixed(2)),
      items: cart.map((entry) => {
        const product = getProductById(entry.productId);
        return product ? { item_id: product.id, item_name: product.name, price: product.price, quantity: entry.quantity } : null;
      }).filter(Boolean)
    });
  }
};

const closeCartDrawer = () => {
  const overlay = document.querySelector("[data-cart-overlay]");
  const drawer = document.querySelector("[data-cart-drawer]");

  if (!overlay || !drawer || drawer.hidden) {
    return;
  }

  drawer.classList.remove("is-open");
  overlay.classList.remove("is-open");
  document.body.classList.remove("cart-open");

  window.setTimeout(() => {
    overlay.hidden = true;
    drawer.hidden = true;
  }, 220);

  if (cartDrawerPreviousFocus instanceof HTMLElement) {
    cartDrawerPreviousFocus.focus();
  }
};

/* ---------- Randare: magazin.html ---------- */

const injectItemListStructuredData = (activeProducts) => {
  const existing = document.querySelector("script[data-shop-itemlist]");

  if (existing) {
    existing.remove();
  }

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.shopItemlist = "true";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": activeProducts.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://florianmolea.ro/magazin.html#${product.slug}`,
      "name": product.name
    }))
  });
  document.head.appendChild(script);
};

const buildProductCardMarkup = (product) => {
  const inStock = product.stock > 0;
  const purchasable = isProductPurchasable(product);
  const maxAllowed = Math.min(product.stock, SHOP_CONFIG.maxQuantityPerProduct);
  const name = escapeHtml(product.name);
  const shortName = escapeHtml(product.shortName || product.name);
  const scent = escapeHtml(product.scent || "");
  const description = escapeHtml(product.description || "");
  const detailsHref = `/produs.html?slug=${encodeURIComponent(product.slug)}`;

  return `
    <article class="shop-card" id="${escapeHtml(product.slug)}" data-product-card data-product-id="${escapeHtml(product.id)}">
      <div class="shop-card-media" data-select-item>
        <img src="${escapeHtml(product.image)}" alt="${name}" width="400" height="400" loading="lazy" decoding="async">
        ${!inStock ? '<span class="shop-badge shop-badge-out">Stoc epuizat</span>' : ""}
      </div>
      <div class="shop-card-body">
        ${scent ? `<p class="shop-card-scent">${scent}</p>` : ""}
        <h3 data-select-item>${shortName}</h3>
        <p class="shop-card-desc">${description}</p>
        <p class="shop-card-price">${formatMoney(product.price)}</p>
        <p class="shop-card-stock ${inStock ? "in-stock" : "out-of-stock"}">${inStock ? "În stoc" : "Stoc epuizat"}</p>
        <a class="shop-card-details-link" href="${detailsHref}">Detalii produs și siguranță</a>
        ${purchasable ? `
          <div class="shop-card-controls">
            <div class="qty-input" role="group" aria-label="Cantitate ${shortName}">
              <button type="button" class="qty-btn" data-qty-decrease aria-label="Scade cantitatea">−</button>
              <input type="number" inputmode="numeric" class="qty-value" data-qty-input min="1" max="${maxAllowed}" step="1" value="1" aria-label="Cantitate ${shortName}">
              <button type="button" class="qty-btn" data-qty-increase aria-label="Crește cantitatea">+</button>
            </div>
            <button type="button" class="btn btn-primary shop-add-btn" data-add-to-cart>Adaugă în coș</button>
          </div>
          <p class="shop-card-feedback" data-add-feedback role="status" hidden>
            <span data-add-feedback-text>Adăugat în coș.</span>
            <a href="/cos.html" class="shop-feedback-link">Vezi coșul</a>
          </p>
        ` : `
          <p class="shop-card-note">${inStock ? "Produs în curs de pregătire." : "Acest produs nu poate fi adăugat momentan în coș."}</p>
        `}
      </div>
    </article>
  `;
};

const wireProductCardEvents = (grid) => {
  if (grid.dataset.shopEventsWired) {
    return;
  }

  grid.dataset.shopEventsWired = "true";

  const clampInput = (input) => {
    const max = Number(input.max) || SHOP_CONFIG.maxQuantityPerProduct;
    const value = Math.trunc(Number(input.value));
    input.value = String(Number.isFinite(value) && value >= 1 ? Math.min(value, max) : 1);
  };

  grid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-product-card]");

    if (!card) {
      return;
    }

    const productId = card.dataset.productId;
    const qtyInput = card.querySelector("[data-qty-input]");

    if (event.target.closest("[data-qty-increase]")) {
      const max = Number(qtyInput.max) || SHOP_CONFIG.maxQuantityPerProduct;
      qtyInput.value = String(Math.min(max, (Number(qtyInput.value) || 1) + 1));
      return;
    }

    if (event.target.closest("[data-qty-decrease]")) {
      qtyInput.value = String(Math.max(1, (Number(qtyInput.value) || 1) - 1));
      return;
    }

    if (event.target.closest("[data-add-to-cart]")) {
      const quantity = Math.max(1, Math.trunc(Number(qtyInput.value)) || 1);
      const result = addToCart(productId, quantity);
      const feedback = card.querySelector("[data-add-feedback]");
      const feedbackText = card.querySelector("[data-add-feedback-text]");
      const product = getProductById(productId);

      feedback.hidden = false;

      if (result.ok) {
        feedbackText.textContent = "Adăugat în coș.";
        announce(`${product.shortName || product.name} a fost adăugat în coș.`);
      } else {
        feedbackText.textContent = "Cantitatea maximă disponibilă este deja în coș.";
      }
      return;
    }

    if (event.target.closest("[data-select-item]")) {
      const product = getProductById(productId);

      if (product) {
        trackShopEvent("select_item", {
          items: [{ item_id: product.id, item_name: product.name, price: product.price }]
        });
      }
    }
  });

  grid.addEventListener("change", (event) => {
    const input = event.target.closest("[data-qty-input]");

    if (input) {
      clampInput(input);
    }
  });
};

const renderShopGrid = () => {
  const grid = document.querySelector("[data-shop-grid]");

  if (!grid) {
    return;
  }

  const errorState = document.querySelector("[data-shop-error]");

  if (productsError) {
    grid.hidden = true;
    if (errorState) {
      errorState.hidden = false;
    }
    return;
  }

  const activeProducts = getActiveProducts();
  grid.innerHTML = activeProducts.map((product) => buildProductCardMarkup(product)).join("");
  wireProductCardEvents(grid);

  trackShopEvent("view_item_list", {
    item_list_name: "Magazin FlorianMolea",
    items: activeProducts.map((product) => ({ item_id: product.id, item_name: product.name, price: product.price }))
  });

  injectItemListStructuredData(activeProducts);
};

/* ---------- Randare: cos.html ---------- */

const renderCartPage = () => {
  const page = document.querySelector("[data-cart-page]");

  if (!page) {
    return;
  }

  const layout = page.querySelector("[data-cart-layout]");
  const listEl = page.querySelector("[data-cart-page-list]");
  const emptyState = page.querySelector("[data-cart-empty]");
  const errorState = page.querySelector("[data-cart-error]");

  if (productsError) {
    layout.hidden = true;
    emptyState.hidden = true;
    errorState.hidden = false;
    return;
  }

  errorState.hidden = true;

  if (cart.length === 0) {
    layout.hidden = true;
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  layout.hidden = false;
  listEl.innerHTML = buildCartListMarkup({ editable: true });
  wireCartItemEvents(listEl);

  const shipping = getShippingInfo();
  page.querySelector("[data-summary-subtotal]").textContent = formatMoney(shipping.subtotal);
  page.querySelector("[data-summary-shipping]").textContent = shipping.isFree ? "Gratuit" : formatMoney(shipping.shippingCost);
  page.querySelector("[data-summary-total]").textContent = formatMoney(shipping.total);

  const progressFill = page.querySelector("[data-shipping-progress-fill]");
  const progressNote = page.querySelector("[data-shipping-progress-note]");
  const progressRatio = Math.min(1, shipping.quantity / SHOP_CONFIG.freeShippingMinQuantity);

  progressFill.style.transform = `scaleX(${progressRatio})`;
  progressNote.textContent = shipping.isFree
    ? "Ai transport gratuit."
    : "Mai adaugă un produs pentru transport gratuit.";

  if (!page.dataset.viewCartTracked) {
    page.dataset.viewCartTracked = "true";
    trackShopEvent("view_cart", {
      currency: SHOP_CONFIG.currency,
      value: Number(shipping.subtotal.toFixed(2)),
      items: cart.map((entry) => {
        const product = getProductById(entry.productId);
        return product ? { item_id: product.id, item_name: product.name, price: product.price, quantity: entry.quantity } : null;
      }).filter(Boolean)
    });
  }
};

/* ---------- Randare: checkout.html ---------- */

const renderCheckoutSummary = () => {
  const page = document.querySelector("[data-checkout-page]");

  if (!page) {
    return;
  }

  const emptyState = page.querySelector("[data-checkout-empty]");
  const formSection = page.querySelector("[data-checkout-form-section]");
  const errorState = page.querySelector("[data-checkout-error]");
  const listEl = page.querySelector("[data-checkout-summary-list]");

  if (productsError) {
    emptyState.hidden = true;
    formSection.hidden = true;
    errorState.hidden = false;
    return;
  }

  errorState.hidden = true;

  if (cart.length === 0) {
    emptyState.hidden = false;
    formSection.hidden = true;
    return;
  }

  emptyState.hidden = true;
  formSection.hidden = false;

  // Rezumatul de mai jos este strict informativ. La activarea plăților, un backend va
  // recalcula produsele/prețurile/stocul înainte de a crea sesiunea Stripe reală.
  listEl.innerHTML = cart.map((entry) => {
    const product = getProductById(entry.productId);

    if (!product) {
      return "";
    }

    return `
      <li class="checkout-summary-item">
        <span class="checkout-summary-name">${escapeHtml(product.shortName || product.name)} × ${entry.quantity}</span>
        <span class="checkout-summary-line-total">${formatMoney(product.price * entry.quantity)}</span>
      </li>
    `;
  }).join("");

  const shipping = getShippingInfo();
  page.querySelector("[data-checkout-subtotal]").textContent = formatMoney(shipping.subtotal);
  page.querySelector("[data-checkout-shipping]").textContent = shipping.isFree ? "Gratuit" : formatMoney(shipping.shippingCost);
  page.querySelector("[data-checkout-total]").textContent = formatMoney(shipping.total);

  if (!page.dataset.beginCheckoutTracked) {
    page.dataset.beginCheckoutTracked = "true";
    trackShopEvent("begin_checkout", {
      currency: SHOP_CONFIG.currency,
      value: Number(shipping.total.toFixed(2)),
      items: cart.map((entry) => {
        const product = getProductById(entry.productId);
        return product ? { item_id: product.id, item_name: product.name, price: product.price, quantity: entry.quantity } : null;
      }).filter(Boolean)
    });
  }

  setCheckoutSubmitButtonState(page);
};

// Protecție dublă trimitere: verificată sincron, înainte de orice `await`, ca două
// declanșări aproape simultane ale submit-ului (dublu-click, Enter + click) să nu
// poată porni două cereri către Worker.
let checkoutSubmitInFlight = false;

const setCheckoutSubmitButtonState = (page) => {
  const button = page.querySelector("[data-checkout-submit]");

  if (!button || checkoutSubmitInFlight) {
    return;
  }

  button.disabled = !SHOP_CHECKOUT_ENABLED || cart.length === 0;
};

const setCheckoutSubmitting = (page, isSubmitting) => {
  const button = page.querySelector("[data-checkout-submit]");

  checkoutSubmitInFlight = isSubmitting;

  if (button) {
    button.disabled = isSubmitting || !SHOP_CHECKOUT_ENABLED || cart.length === 0;
    button.textContent = isSubmitting ? "Se trimite comanda…" : "Comandă cu obligație de plată";
  }

  const errorEl = page.querySelector("[data-checkout-submit-error]");

  if (isSubmitting && errorEl) {
    errorEl.hidden = true;
  }
};

const showCheckoutSubmitError = (page, message) => {
  const errorEl = page.querySelector("[data-checkout-submit-error]");

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
};

// Construiește payload-ul EXACT pe forma validată de Worker (`POST /checkout/session`):
// items[], customer{type,name,email,phone}, shippingAddress{...}, billingSameAsShipping.
// Nu trimite preț/total — acelea sunt recalculate integral server-side. Nu trimite câmpurile
// de firmă (companyName/companyCui/...): Worker-ul nu le validează/persistă încă (confirmat
// pe backend-ul de staging), deci nu are rost să le trimitem ca sursă falsă de adevăr.
// Formularul nu are un toggle de adresă de facturare diferită, deci billingSameAsShipping
// e mereu `true`, aliniat cu presupunerea hardcodată din backend.
const buildCheckoutPayload = (form) => {
  const data = new FormData(form);
  const isCompany = Boolean(form.querySelector("[data-company-toggle]")?.checked);
  const get = (name) => String(data.get(name) ?? "").trim();

  return {
    items: cart.map((entry) => ({ productId: entry.productId, quantity: entry.quantity })),
    customer: {
      type: isCompany ? "company" : "individual",
      name: `${get("firstName")} ${get("lastName")}`.trim(),
      email: get("email"),
      phone: get("phone")
    },
    shippingAddress: {
      line1: get("address"),
      line2: get("addressDetails"),
      city: get("city"),
      county: get("county"),
      postalCode: get("postalCode"),
      country: "RO"
    },
    billingSameAsShipping: true
  };
};

const submitCheckout = async (form) => {
  const page = form.closest("[data-checkout-page]");

  if (!page || checkoutSubmitInFlight) {
    return;
  }

  setCheckoutSubmitting(page, true);

  let response;
  let body;

  try {
    response = await fetch(`${SHOP_CHECKOUT_API_BASE}/checkout/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildCheckoutPayload(form))
    });
    body = await response.json().catch(() => null);
  } catch {
    showCheckoutSubmitError(page, "Nu am putut contacta serverul de plăți. Verifică conexiunea și încearcă din nou.");
    setCheckoutSubmitting(page, false);
    return;
  }

  if (!response.ok || !body?.ok || !body.data?.checkoutUrl) {
    showCheckoutSubmitError(
      page,
      body?.error?.message || "Nu am putut trimite comanda. Te rugăm să încerci din nou."
    );
    setCheckoutSubmitting(page, false);
    return;
  }

  // Coșul NU se golește aici — rămâne neschimbat până la confirmarea reală a plății
  // (paid/invoiced), verificată pe comanda-confirmata.html. Butonul rămâne dezactivat
  // în timp ce browserul navighează către Stripe.
  window.location.href = body.data.checkoutUrl;
};

const initCheckoutForm = () => {
  const page = document.querySelector("[data-checkout-page]");

  if (!page) {
    return;
  }

  const companyToggle = page.querySelector("[data-company-toggle]");
  const companyFields = page.querySelector("[data-company-fields]");

  if (companyToggle && companyFields) {
    companyToggle.addEventListener("change", () => {
      companyFields.hidden = !companyToggle.checked;
      companyFields.querySelectorAll("[data-required-when-company]").forEach((input) => {
        input.required = companyToggle.checked;
      });
    });
  }

  const noteEl = page.querySelector("[data-checkout-payment-note]");

  if (noteEl) {
    noteEl.textContent = SHOP_CHECKOUT_ENABLED
      ? "Vânzător: WORLDWIDE CONSULTING LINE SRL. Plata online cu cardul (Stripe)."
      : "Comenzile online vor fi disponibile în curând.";
  }

  const form = page.querySelector("[data-checkout-form]");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      // Gardă redundantă, sincronă: chiar dacă butonul ar ajunge activat prin
      // manipulare manuală a DOM-ului, handler-ul de submit refuză să pornească
      // orice cerere cât timp comutatorul e "false".
      if (!SHOP_CHECKOUT_ENABLED) {
        return;
      }

      if (!form.reportValidity()) {
        return;
      }

      submitCheckout(form);
    });
  }
};

/* ---------- Randare: produs.html ---------- */

const buildSafetyListMarkup = (product) => {
  const manufacturer = getManufacturer(product.manufacturerId);
  const safety = product.safety || {};
  const clp = safety.clp || {};
  const rows = [];

  const addRow = (term, value) => {
    if (!value) {
      return;
    }
    rows.push(`<div class="product-safety-row"><dt>${escapeHtml(term)}</dt><dd>${value}</dd></div>`);
  };

  const addListRow = (term, items) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    addRow(term, `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
  };

  if (manufacturer) {
    addRow("Producător", escapeHtml(manufacturer.legalName));

    const address = manufacturer.postalAddress;
    if (address && address.locality && address.county && address.postalCode && address.country) {
      addRow("Adresă producător", escapeHtml(`${address.locality}, județul ${address.county}, cod poștal ${address.postalCode}, ${address.country}`));
    }

    if (manufacturer.electronicAddress) {
      addRow("Adresă electronică producător", `<a href="mailto:${escapeHtml(manufacturer.electronicAddress)}">${escapeHtml(manufacturer.electronicAddress)}</a>`);
    }

    if (manufacturer.postalAddress && manufacturer.postalAddress.country) {
      addRow("Țară de origine", escapeHtml(manufacturer.postalAddress.country));
    }
  }

  addRow("Identificator produs", product.productIdentifier ? escapeHtml(product.productIdentifier) : "");
  addRow("Cantitate netă", product.netQuantity ? escapeHtml(product.netQuantity) : "");
  addListRow("Instrucțiuni de utilizare", safety.usageInstructions);
  addListRow("Instrucțiuni de depozitare", safety.storageInstructions);
  addListRow("Avertismente", safety.warnings);

  if (clp.applicable === true) {
    addRow("Clasificare CLP", clp.isHazardous ? "Amestec periculos" : "Neclasificat ca periculos");
    addRow("Cuvânt de avertizare", clp.signalWord ? escapeHtml(clp.signalWord) : "");
    addListRow("Fraze de pericol (H)", clp.hazardStatements);
    addListRow("Fraze de pericol suplimentare (EUH)", clp.supplementalHazardStatements);
    addListRow("Fraze de precauție (P)", clp.precautionaryStatements);
    addRow("UFI", clp.ufi ? escapeHtml(clp.ufi) : "");
  } else if (clp.applicable === false) {
    addRow("Clasificare CLP", "Nu este aplicabilă acestui produs.");
  }

  return rows.join("");
};

const initProductAccordion = (container, openByDefault) => {
  const trigger = container.querySelector("[data-accordion-trigger]");
  const panel = container.querySelector("[data-accordion-panel]");

  if (!trigger || !panel) {
    return;
  }

  const setOpen = (isOpen) => {
    trigger.setAttribute("aria-expanded", String(isOpen));
    panel.hidden = !isOpen;
    container.classList.toggle("is-open", isOpen);
  };

  setOpen(Boolean(openByDefault));

  trigger.addEventListener("click", () => {
    setOpen(trigger.getAttribute("aria-expanded") !== "true");
  });
};

const injectProductStructuredData = (product) => {
  const existing = document.querySelector("script[data-product-jsonld]");

  if (existing) {
    existing.remove();
  }

  const manufacturer = getManufacturer(product.manufacturerId);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.commercialBrand || "Eau de Floryan" },
    image: `https://florianmolea.ro/${product.image}`,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "RON",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://florianmolea.ro/produs.html?slug=${encodeURIComponent(product.slug)}`
    }
  };

  if (manufacturer && manufacturer.legalName) {
    data.manufacturer = { "@type": "Organization", name: manufacturer.legalName };
  }

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.productJsonld = "true";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

const renderProductDetailPage = () => {
  const page = document.querySelector("[data-product-page]");

  if (!page) {
    return;
  }

  const errorState = page.querySelector("[data-product-error]");
  const detail = page.querySelector("[data-product-detail]");
  const safetySection = page.querySelector("[data-product-safety]");
  // Breadcrumb-ul este plasat ca element frate al <main>, nu în interiorul lui
  // (aceeași convenție ca în magazin.html/checkout.html/cos.html) — trebuie
  // căutat în document, altfel page.querySelector returnează null.
  const breadcrumb = document.querySelector("[data-product-breadcrumb]");

  if (productsError || legalDataError) {
    errorState.hidden = false;
    detail.hidden = true;
    safetySection.hidden = true;
    return;
  }

  const slug = new URLSearchParams(window.location.search).get("slug");
  const product = slug ? getProductBySlug(slug) : null;

  if (!product || !product.active) {
    errorState.hidden = false;
    detail.hidden = true;
    safetySection.hidden = true;
    document.title = "Produs indisponibil | Florian Molea";
    return;
  }

  errorState.hidden = true;
  detail.hidden = false;
  safetySection.hidden = false;
  breadcrumb.hidden = false;
  breadcrumb.querySelector("[data-product-breadcrumb-name]").textContent = product.shortName || product.name;

  document.title = `${product.name} | Florian Molea`;

  const image = detail.querySelector("[data-product-image]");
  image.src = product.image;
  image.alt = product.name;

  detail.querySelector("[data-product-brand]").textContent = product.commercialBrand || "Eau de Floryan";
  detail.querySelector("[data-product-name]").textContent = product.name;

  const scentEl = detail.querySelector("[data-product-scent]");
  scentEl.textContent = product.scent || "";
  scentEl.hidden = !product.scent;

  detail.querySelector("[data-product-price]").textContent = formatMoney(product.price);

  const inStock = product.stock > 0;
  const stockEl = detail.querySelector("[data-product-stock]");
  stockEl.textContent = inStock ? "În stoc" : "Stoc epuizat";
  stockEl.className = `product-detail-stock ${inStock ? "in-stock" : "out-of-stock"}`;

  const netQtyEl = detail.querySelector("[data-product-net-qty]");
  if (product.netQuantity) {
    netQtyEl.hidden = false;
    netQtyEl.textContent = `Cantitate netă: ${product.netQuantity}`;
  } else {
    netQtyEl.hidden = true;
  }

  detail.querySelector("[data-product-description]").textContent = product.description || "";

  const purchasable = isProductPurchasable(product);
  const controls = detail.querySelector("[data-product-controls]");
  const noteEl = detail.querySelector("[data-product-note]");
  const maxAllowed = Math.min(product.stock, SHOP_CONFIG.maxQuantityPerProduct);

  if (purchasable) {
    controls.hidden = false;
    noteEl.hidden = true;
    const qtyInput = controls.querySelector("[data-qty-input]");
    qtyInput.max = String(maxAllowed);
    qtyInput.value = "1";
  } else {
    controls.hidden = true;
    noteEl.hidden = false;
    noteEl.textContent = inStock ? "Produs în curs de pregătire." : "Acest produs nu poate fi adăugat momentan în coș.";
  }

  const safetyList = safetySection.querySelector("[data-product-safety-list]");
  safetyList.innerHTML = buildSafetyListMarkup(product);

  const hasCriticalWarnings = Array.isArray(product.safety?.warnings) && product.safety.warnings.length > 0;

  if (!safetySection.dataset.accordionWired) {
    safetySection.dataset.accordionWired = "true";
    initProductAccordion(safetySection.querySelector("[data-product-accordion]"), hasCriticalWarnings);
  }

  if (!page.dataset.eventsWired) {
    page.dataset.eventsWired = "true";

    controls.addEventListener("click", (event) => {
      const qtyInput = controls.querySelector("[data-qty-input]");

      if (event.target.closest("[data-qty-increase]")) {
        const max = Number(qtyInput.max) || SHOP_CONFIG.maxQuantityPerProduct;
        qtyInput.value = String(Math.min(max, (Number(qtyInput.value) || 1) + 1));
        return;
      }

      if (event.target.closest("[data-qty-decrease]")) {
        qtyInput.value = String(Math.max(1, (Number(qtyInput.value) || 1) - 1));
        return;
      }

      if (event.target.closest("[data-add-to-cart]")) {
        const quantity = Math.max(1, Math.trunc(Number(qtyInput.value)) || 1);
        const currentSlug = new URLSearchParams(window.location.search).get("slug");
        const currentProduct = getProductBySlug(currentSlug);

        if (!currentProduct) {
          return;
        }

        const result = addToCart(currentProduct.id, quantity);
        const feedback = detail.querySelector("[data-add-feedback]");
        const feedbackText = detail.querySelector("[data-add-feedback-text]");
        feedback.hidden = false;

        if (result.ok) {
          feedbackText.textContent = "Adăugat în coș.";
          announce(`${currentProduct.shortName || currentProduct.name} a fost adăugat în coș.`);
        } else {
          feedbackText.textContent = "Cantitatea maximă disponibilă este deja în coș.";
        }
      }
    });
  }

  injectProductStructuredData(product);

  trackShopEvent("view_item", {
    currency: SHOP_CONFIG.currency,
    value: product.price,
    items: [{ item_id: product.id, item_name: product.name, price: product.price }]
  });
};

/* ---------- Randare: comanda-confirmata.html ---------- */

const ORDER_STATUS_POLL_INTERVAL_MS = 2500;
const ORDER_STATUS_POLL_TIMEOUT_MS = 60000;

const ORDER_STATUS_ICON_CHECK = `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>`;
const ORDER_STATUS_ICON_CROSS = `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>`;

const setOrderStatusPanel = (panel, { icon = null, iconClass = "", title, message }) => {
  const iconEl = panel.querySelector("[data-order-status-icon]");
  const titleEl = panel.querySelector("[data-order-status-title]");
  const messageEl = panel.querySelector("[data-order-status-message]");

  if (iconEl) {
    if (icon) {
      iconEl.hidden = false;
      iconEl.className = `status-icon ${iconClass}`.trim();
      iconEl.innerHTML = icon;
    } else {
      iconEl.hidden = true;
    }
  }

  if (titleEl) {
    titleEl.textContent = title;
  }

  if (messageEl) {
    messageEl.textContent = message;
  }
};

const fetchOrderStatus = (token) => fetch(
  `${SHOP_CHECKOUT_API_BASE}/orders/${encodeURIComponent(token)}/status`,
  { cache: "no-store" }
).then((response) => {
  if (response.status === 404) {
    return { notFound: true };
  }

  if (!response.ok) {
    throw new Error("order status request failed");
  }

  return response.json().then((body) => body?.data ?? null);
});

// Interoghează GET /orders/:token/status până când plata ajunge într-o stare finală
// (paid / payment_failed) sau expiră timeout-ul local. Coșul se golește DOAR când
// backend-ul confirmă `paid: true` — niciodată doar pe baza redirect-ului din browser.
const pollOrderStatus = async (panel, token) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < ORDER_STATUS_POLL_TIMEOUT_MS) {
    let status;

    try {
      status = await fetchOrderStatus(token);
    } catch {
      setOrderStatusPanel(panel, {
        icon: ORDER_STATUS_ICON_CROSS,
        iconClass: "cancelled",
        title: "Nu am putut verifica starea comenzii",
        message: "Reîncarcă pagina peste câteva momente sau contactează-ne dacă problema persistă."
      });
      return;
    }

    if (status?.notFound) {
      setOrderStatusPanel(panel, {
        icon: ORDER_STATUS_ICON_CROSS,
        iconClass: "cancelled",
        title: "Comanda nu a fost găsită",
        message: "Linkul folosit nu corespunde unei comenzi valide."
      });
      return;
    }

    if (status?.paid) {
      setOrderStatusPanel(panel, {
        icon: ORDER_STATUS_ICON_CHECK,
        iconClass: "success",
        title: "Plata a fost confirmată",
        message: `Comanda ta a fost înregistrată și plata a fost confirmată. Total: ${formatMoney((status.totalMinor || 0) / 100)}.`
      });
      clearCart();
      return;
    }

    if (status?.status === "payment_failed") {
      setOrderStatusPanel(panel, {
        icon: ORDER_STATUS_ICON_CROSS,
        iconClass: "cancelled",
        title: "Plata nu a putut fi confirmată",
        message: "Poți relua comanda din coșul tău, care rămâne neschimbat."
      });
      return;
    }

    setOrderStatusPanel(panel, {
      title: "Verificăm plata…",
      message: "Te rugăm să aștepți câteva secunde în timp ce confirmăm plata cu banca ta."
    });

    await new Promise((resolve) => window.setTimeout(resolve, ORDER_STATUS_POLL_INTERVAL_MS));
  }

  setOrderStatusPanel(panel, {
    title: "Plata este încă în verificare",
    message: "Îți vom trimite un e-mail imediat ce plata este confirmată. Poți reveni pe această pagină mai târziu pentru a verifica statusul."
  });
};

const initOrderConfirmationPage = () => {
  const panel = document.querySelector("[data-order-status-panel]");

  // Cât timp SHOP_CHECKOUT_ENABLED este "false", pagina rămâne exact cum e randată
  // static în HTML (mesajul generic existent) — niciun apel către Worker nu are loc.
  if (!panel || !SHOP_CHECKOUT_ENABLED) {
    return;
  }

  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    return;
  }

  pollOrderStatus(panel, token);
};

/* ---------- Init ---------- */

const renderAll = () => {
  renderCartBadge();
  renderCartDrawer();
  renderCartPage();
  renderCheckoutSummary();
};

const initShop = async () => {
  await Promise.all([loadProducts(), loadLegalData()]);
  loadCart();
  saveCart();

  injectCartDrawer();
  renderShopGrid();
  renderAll();
  renderProductDetailPage();
  initCheckoutForm();
  initOrderConfirmationPage();

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest("[data-cart-toggle]")) {
      event.preventDefault();
      openCartDrawer();
      return;
    }

    if (event.target.closest("[data-shop-retry]")) {
      window.location.reload();
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initShop);
} else {
  initShop();
}
