"use strict";

const SHOP_CONFIG = {
  currency: "RON",
  locale: "ro-RO",
  shippingCost: 25,
  freeShippingMinQuantity: 2,
  maxQuantityPerProduct: 20,
  cartStorageKey: "florianmolea_cart_v1"
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

const getActiveProducts = () => products.filter((product) => product.active);

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

    if (!product || !product.active || product.stock <= 0) {
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
  const maxAllowed = Math.min(product.stock, SHOP_CONFIG.maxQuantityPerProduct);
  const name = escapeHtml(product.name);
  const shortName = escapeHtml(product.shortName || product.name);
  const scent = escapeHtml(product.scent || "");
  const description = escapeHtml(product.description || "");

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
        ${inStock ? `
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
          <p class="shop-card-note">Acest produs nu poate fi adăugat momentan în coș.</p>
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

  // Formularul nu trimite date către niciun serviciu extern și nu procesează plăți.
  // Butonul de plată rămâne dezactivat până la integrarea Stripe (server-side).
  const form = page.querySelector("[data-checkout-form]");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  }
};

/* ---------- Init ---------- */

const renderAll = () => {
  renderCartBadge();
  renderCartDrawer();
  renderCartPage();
  renderCheckoutSummary();
};

const initShop = async () => {
  await loadProducts();
  loadCart();
  saveCart();

  injectCartDrawer();
  renderShopGrid();
  renderAll();
  initCheckoutForm();

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
