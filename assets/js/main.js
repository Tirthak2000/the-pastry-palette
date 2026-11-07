// The Pastry Palette — shop page: menu, cake designer, order cart and WhatsApp checkout.

import { loadShop, isLive, demoForget } from "./data.js";
import { artSVG, cakeSVG, placeholderHTML, TIER_TOPS, CAKE_VIEWS } from "./art.js";
import { esc, inr, hasPrice, shade, luminance, store, pincodeStatus, isoDate, addDays, niceDate, debounce, slug, parseLatLng, distanceKm } from "./util.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

let S = null; // settings
let P = []; // products
let byId = new Map();
const chosen = {}; // product id → selected option label

const CART_KEY = "tpp-cart-v1";
const CART_HOURS = 72;
const DETAILS_KEY = "tpp-details-v1";

/* ───────────── helpers ───────────── */
const waBase = () => `https://wa.me/${String(S?.whatsapp || "918460282977").replace(/\D/g, "")}`;
const waLink = (text) => `${waBase()}?text=${encodeURIComponent(text)}`;
const options = (p) => (p.options || []).filter((o) => o && String(o.label || "").trim());
const visible = () => P.filter((p) => !p.hidden);
const ordering = () => S.acceptingOrders !== false;

function optionFor(p, label) {
  const opts = options(p);
  return opts.find((o) => o.label === label) || opts[0] || null;
}

let toastTimer;
function toast(msg, action, fn) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action)}</button>` : ""}`;
  if (action) t.querySelector("button").onclick = () => { t.classList.remove("show"); fn(); };
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3600);
}

/* ───────────── cart ───────────── */
let cart = { lines: [], custom: [] };

function loadCart() {
  const c = store.get(CART_KEY);
  if (c && c.t && Date.now() - c.t < CART_HOURS * 3600e3) cart = { lines: c.lines || [], custom: c.custom || [] };
}
function saveCart() {
  store.set(CART_KEY, { ...cart, t: Date.now() });
  updateCartUI();
}
// Drop lines whose product was removed, hidden or sold out since the visitor added them.
function pruneCart() {
  cart.lines = cart.lines.filter((l) => {
    const p = byId.get(l.pid);
    return p && !p.hidden && !p.soldOut && p.kind !== "custom" && optionFor(p, l.label);
  });
}
const qtyOf = (pid, label) => cart.lines.find((l) => l.pid === pid && l.label === label)?.qty || 0;
const itemCount = () => cart.lines.reduce((a, l) => a + l.qty, 0) + cart.custom.length;

function setQty(pid, label, qty) {
  const i = cart.lines.findIndex((l) => l.pid === pid && l.label === label);
  if (qty <= 0) { if (i >= 0) cart.lines.splice(i, 1); }
  else if (i >= 0) cart.lines[i].qty = Math.min(qty, 50);
  else cart.lines.push({ pid, label, qty: 1 });
  saveCart();
}

function priced() {
  let sub = 0, unpriced = 0;
  for (const l of cart.lines) {
    const o = optionFor(byId.get(l.pid), l.label);
    if (hasPrice(o?.price)) sub += Number(o.price) * l.qty; else unpriced++;
  }
  unpriced += cart.custom.length;
  return { sub, unpriced };
}

/* ───────────── pickup / delivery ───────────── */
const METHOD_KEY = "tpp-method-v1";
let method = store.get(METHOD_KEY) || "pickup";
const offers = () => ({ pickup: S.delivery?.pickup !== false, delivery: S.delivery?.deliver !== false });
function currentMethod() {
  const o = offers();
  if (method === "delivery" && o.delivery) return "delivery";
  if (o.pickup) return "pickup";
  return "delivery";
}
const radius = () => Math.max(0.2, Number(S.delivery?.radiusKm) || 1);
const kmText = (km) => (km < 1 ? `${Math.round((km * 1000) / 50) * 50} m` : `${Number(km.toFixed(1))} km`);
const baseLoc = () => parseLatLng(S.delivery?.base);
function deliveryCharge() {
  const d = S.delivery || {};
  if (d.mode === "flat") return { short: inr(d.flatFee), long: `Delivery for ${inr(d.flatFee)}` };
  if (d.mode === "distance") return { short: "Charge confirmed on WhatsApp", long: "Delivery (charge confirmed on WhatsApp)" };
  return { short: "Free", long: "Free delivery" };
}

function deliveryInfo(sub, unpriced) {
  const d = S.delivery || {};
  if (currentMethod() === "pickup") return { label: "Pickup", text: "Free", fee: 0 };
  if (d.mode === "flat") {
    const free = Number(d.freeAbove) > 0 && sub >= Number(d.freeAbove) && !unpriced;
    return { label: "Delivery", text: free ? "Free" : inr(d.flatFee), fee: free ? 0 : Number(d.flatFee) || 0 };
  }
  if (d.mode === "distance") return { label: "Delivery", text: "Charge confirmed on WhatsApp", fee: null };
  return { label: "Delivery", text: `Free within ${kmText(radius())}`, fee: 0 };
}

function updateCartUI() {
  const n = itemCount();
  $("#cart-count").textContent = n;
  const btn = $("#cart-open");
  btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  document.body.classList.toggle("has-cart", n > 0);
  $("#cart-bar").hidden = n === 0 || $("#sheet").open;
  const { sub, unpriced } = priced();
  $("#cart-bar-text").textContent = `${n} item${n === 1 ? "" : "s"}${sub ? " · " + inr(sub) : ""}${unpriced && sub ? " +" : ""}`;
}

/* ───────────── menu ───────────── */
function media(p) {
  const fallback = placeholderHTML(p.tint);
  return p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async" width="400" height="500" data-pid="${esc(p.id)}">` : fallback;
}

function badges(p) {
  const b = [];
  if (p.bestseller) b.push(`<span class="badge best">Bestseller</span>`);
  if (p.eggless && !S.allEggless) b.push(`<span class="badge egg">Eggless</span>`);
  return b.length ? `<div class="badges">${b.join("")}</div>` : "";
}

function minPerKg() {
  const prices = (S.custom?.flavours || []).map((f) => Number(f.perKg)).filter((x) => x > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function cardControls(p) {
  if (p.kind === "custom") {
    const m = minPerKg();
    return `<div class="card-foot"><span class="price">${m ? `<small>from</small> ${inr(m)}<small>/kg</small>` : `<small>Price on request</small>`}</span><a class="btn primary add-btn" href="#custom">Design yours</a></div>`;
  }
  const opts = options(p);
  if (!opts.length) return `<div class="card-foot"><span class="price"><small>Ask us for the price</small></span></div>`;
  const cur = optionFor(p, chosen[p.id]);
  const optHTML = opts.length > 1
    ? `<div class="opts" role="radiogroup" aria-label="Size for ${esc(p.name)}">${opts.map((o) => `<button type="button" class="opt-btn" role="radio" aria-checked="${o.label === cur.label}" data-opt="${esc(o.label)}">${esc(o.label)}</button>`).join("")}</div>`
    : "";
  const priceHTML = hasPrice(cur.price) ? inr(cur.price) : `<small>Price on request</small>`;
  const single = opts.length === 1 ? ` <small>· ${esc(cur.label)}</small>` : "";
  let action = "";
  if (p.soldOut) action = `<span class="fine">Sold out for now</span>`;
  else if (!ordering()) action = "";
  else {
    const q = qtyOf(p.id, cur.label);
    action = q
      ? `<div class="stepper" role="group" aria-label="Quantity of ${esc(p.name)}, ${esc(cur.label)}"><button type="button" data-dec aria-label="One fewer">−</button><output aria-live="polite">${q}</output><button type="button" data-inc aria-label="One more">+</button></div>`
      : `<button type="button" class="btn primary add-btn" data-add>Add</button>`;
  }
  return `${optHTML}<div class="card-foot"><span class="price">${priceHTML}${single}</span>${action}</div>`;
}

function cardHTML(p) {
  return `<article class="card${p.soldOut ? " sold" : ""}" data-pid="${esc(p.id)}">
  <div class="card-media">${media(p)}${badges(p)}</div>
  <div class="card-body">
    <h4>${esc(p.name)}</h4>
    ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ""}
    ${p.note ? `<p class="note">${esc(p.note)}</p>` : ""}
    <div class="controls">${cardControls(p)}</div>
  </div>
</article>`;
}

function refreshCard(pid, focusSel) {
  const card = $(`.card[data-pid="${CSS.escape(pid)}"]`);
  if (!card) return;
  card.querySelector(".controls").innerHTML = cardControls(byId.get(pid));
  if (focusSel) (card.querySelector(focusSel) || card.querySelector("[data-add],[data-inc],.opt-btn"))?.focus();
}

function groups() {
  const list = visible();
  const cats = (S.categories || []).map((c) => ({ ...c, items: list.filter((p) => p.category === c.id) })).filter((c) => c.items.length);
  const known = new Set((S.categories || []).map((c) => c.id));
  const rest = list.filter((p) => !known.has(p.category));
  if (rest.length) cats.push({ id: "more", name: "More treats", items: rest });
  return cats;
}

function renderMenu() {
  const body = $("#menu-body");
  body.removeAttribute("aria-busy");
  const cats = groups();
  $("#chips").innerHTML = cats.map((c, i) => `<a class="chip${i === 0 ? " on" : ""}" href="#cat-${slug(c.id)}">${esc(c.name)} <small>${c.items.length}</small></a>`).join("");
  if (!cats.length) {
    body.innerHTML = `<div class="empty">The menu is being updated. Message us on WhatsApp and we'll tell you what's baking.</div>`;
    return;
  }
  body.innerHTML = cats.map((c) => `<section class="cat" id="cat-${slug(c.id)}" aria-labelledby="h-${slug(c.id)}">
    <div class="cat-head"><h3 id="h-${slug(c.id)}">${esc(c.name)}</h3></div>
    <div class="cat-grid">${c.items.map(cardHTML).join("")}</div>
  </section>`).join("");
  watchChips();
}

let chipObserver;
function watchChips() {
  chipObserver?.disconnect();
  if (!("IntersectionObserver" in window)) return;
  chipObserver = new IntersectionObserver((entries) => {
    const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!hit) return;
    // Only the chip strip scrolls sideways. Never call scrollIntoView here: it also scrolls the
    // page and cancels the visitor's own scrolling, which made the page feel stuck.
    const bar = $("#chips");
    $$(".chip", bar).forEach((c) => {
      const on = c.getAttribute("href") === "#" + hit.target.id;
      if (c.classList.contains("on") === on) return;
      c.classList.toggle("on", on);
      if (on) {
        const left = c.offsetLeft - (bar.clientWidth - c.offsetWidth) / 2;
        bar.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
      }
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  $$(".cat").forEach((s) => chipObserver.observe(s));
}

function onMenuClick(e) {
  const card = e.target.closest(".card");
  if (!card) return;
  const p = byId.get(card.dataset.pid);
  if (!p) return;
  const opt = e.target.closest("[data-opt]");
  if (opt) { chosen[p.id] = opt.dataset.opt; refreshCard(p.id, `[data-opt="${CSS.escape(opt.dataset.opt)}"]`); return; }
  const cur = optionFor(p, chosen[p.id]);
  if (!cur) return;
  if (e.target.closest("[data-add]")) {
    setQty(p.id, cur.label, 1);
    refreshCard(p.id, "[data-inc]");
    toast(`Added ${p.name}${options(p).length > 1 ? ` (${cur.label})` : ""}`, "View order", () => openSheet("cart"));
  } else if (e.target.closest("[data-inc]")) {
    setQty(p.id, cur.label, qtyOf(p.id, cur.label) + 1);
    refreshCard(p.id, "[data-inc]");
  } else if (e.target.closest("[data-dec]")) {
    setQty(p.id, cur.label, qtyOf(p.id, cur.label) - 1);
    refreshCard(p.id, qtyOf(p.id, cur.label) ? "[data-dec]" : "[data-add]");
  }
}

// A product photo that fails to load is swapped for its illustration.
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img.tagName !== "IMG" || !img.dataset.pid) return;
  const p = byId.get(img.dataset.pid);
  if (p) img.outerHTML = placeholderHTML(p.tint);
}, true);

/* ───────────── cake designer ───────────── */
const B = { occ: 0, fl: 1, sz: 1 };

function radios(list, cur, attr, label) {
  return list.map((x, i) => `<button type="button" class="pill" role="radio" aria-checked="${i === cur}" data-${attr}="${i}">${label(x)}</button>`).join("");
}

function renderBuilder() {
  const c = S.custom || {};
  const sec = $("#custom");
  if (c.enabled === false) { sec.hidden = true; $$('a[href="#custom"]').forEach((a) => (a.hidden = true)); return; }
  sec.hidden = false;
  const occ = c.occasions || [], fl = c.flavours || [], sz = c.sizes || [];
  B.occ = Math.min(B.occ, Math.max(occ.length - 1, 0));
  B.fl = Math.min(B.fl, Math.max(fl.length - 1, 0));
  B.sz = Math.min(B.sz, Math.max(sz.length - 1, 0));
  $("#b-occasion").setAttribute("role", "radiogroup");
  $("#b-occasion").innerHTML = radios(occ, B.occ, "occ", (x) => esc(x));
  $("#b-size").setAttribute("role", "radiogroup");
  $("#b-size").innerHTML = radios(sz, B.sz, "sz", (x) => esc(x.label));
  $("#b-flavour").setAttribute("role", "radiogroup");
  $("#b-flavour").innerHTML = fl.map((f, i) => `<button type="button" class="swatch" role="radio" aria-checked="${i === B.fl}" data-fl="${i}" style="--c:${esc(f.color)}"><i></i><span>${esc(f.name)}</span></button>`).join("");
  $("#b-note").textContent = c.note || "";
  $("#b-add").disabled = !ordering();
  updateCake();
}

function estimate() {
  const f = S.custom.flavours[B.fl], s = S.custom.sizes[B.sz];
  return f && s && Number(f.perKg) > 0 ? Math.round(Number(f.perKg) * Number(s.kg || 1)) : 0;
}

function updateCake() {
  const c = S.custom, f = c.flavours[B.fl] || { color: "#b9773f", name: "" }, s = c.sizes[B.sz] || { kg: 1, label: "1 kg" };
  const col = f.color || "#b9773f";
  const light = luminance(col) > 0.72;
  const stage = $("#stage");
  stage.style.setProperty("--cake", col);
  stage.style.setProperty("--cake-top", shade(col, light ? -0.04 : 0.12));
  stage.style.setProperty("--cake-drip", shade(col, light ? 0.62 : -0.38));
  const kg = Number(s.kg) || 1;
  const tiers = kg >= 3 ? 3 : kg >= 2 ? 2 : 1;
  $$(".tier", stage).forEach((t, i) => t.classList.toggle("off", i >= tiers));
  const scale = tiers > 1 ? 1 : kg <= 0.5 ? 0.84 : kg <= 1 ? 0.94 : 1.04;
  $(".cake-stack", stage).style.transform = `scale(${scale})`;
  zoomCake(CAKE_VIEWS[tiers - 1]);
  $(".topper", stage).style.transform = `translateY(${TIER_TOPS[tiers - 1] - TIER_TOPS[2]}px)`;
  const msg = ($("#b-message").value.trim() || c.occasions[B.occ] || "").slice(0, 18);
  const plaque = $(".plaque", stage), text = $(".plaque-text", stage);
  text.textContent = msg;
  const w = Math.max(84, Math.min(210, 26 + msg.length * 9.2));
  plaque.setAttribute("width", w);
  plaque.setAttribute("x", 180 - w / 2);
  $(".topper", stage).style.opacity = msg ? 1 : 0;
  $("#stage-tags").innerHTML = [f.name, s.label, c.occasions[B.occ]].filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join("");
  const est = estimate();
  $("#b-estimate").innerHTML = est ? `Estimate <b>${inr(est)}</b>` : `Price on request`;
}

let zoomFrom = null, zoomRaf = 0;
function zoomCake(to) {
  const svg = $(".cake-svg");
  const now = svg.getAttribute("viewBox").split(" ").map(Number);
  if (now.join() === to.join()) return;
  cancelAnimationFrame(zoomRaf);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { svg.setAttribute("viewBox", to.join(" ")); return; }
  zoomFrom = now;
  const t0 = performance.now(), dur = 450;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    svg.setAttribute("viewBox", zoomFrom.map((v, i) => (v + (to[i] - v) * e).toFixed(2)).join(" "));
    if (k < 1) zoomRaf = requestAnimationFrame(step);
  };
  zoomRaf = requestAnimationFrame(step);
}

function onBuilderClick(e) {
  const b = e.target.closest("[data-occ],[data-fl],[data-sz]");
  if (!b) return;
  if ("occ" in b.dataset) B.occ = Number(b.dataset.occ);
  if ("fl" in b.dataset) B.fl = Number(b.dataset.fl);
  if ("sz" in b.dataset) B.sz = Number(b.dataset.sz);
  const group = b.parentElement;
  $$("[role=radio]", group).forEach((x) => x.setAttribute("aria-checked", x === b));
  updateCake();
}

function addCustom(e) {
  e.preventDefault();
  if (!ordering()) return;
  const c = S.custom;
  const item = {
    cid: "c" + Date.now().toString(36),
    occasion: c.occasions[B.occ] || "",
    flavour: c.flavours[B.fl]?.name || "",
    color: c.flavours[B.fl]?.color || "#b9773f",
    size: c.sizes[B.sz]?.label || "",
    theme: $("#b-theme").value.trim(),
    message: $("#b-message").value.trim(),
    estimate: estimate(),
  };
  cart.custom.push(item);
  saveCart();
  $("#b-theme").value = "";
  $("#b-message").value = "";
  updateCake();
  toast("Custom cake added to your order", "View order", () => openSheet("cart"));
}

/* ───────────── pickup & delivery info ───────────── */
function renderFulfilment() {
  const d = S.delivery || {}, o = offers(), r = kmText(radius()), lead = Number(d.leadDays) || 0;
  const charge = deliveryCharge();
  const where = esc(d.pickupWhere || "our kitchen");
  const facts = [];
  facts.push(lead === 1
    ? `<b>Order 24–48 hours ahead.</b> Every bake is made fresh for your order.`
    : lead > 1 ? `<b>Order at least ${lead} days ahead.</b> Every bake is made fresh for your order.`
    : `<b>Same-day orders</b> when we have room. Custom cakes need a few days.`);
  if (o.pickup) facts.push(`<b>Pickup</b> from ${where}. We share the exact location on WhatsApp.`);
  if (o.delivery) facts.push(`<b>${charge.long}</b> within ${r} of our kitchen.`);
  if (o.pickup) facts.push(`<b>Live further away?</b> Book a Porter, Swiggy Genie or Rapido to collect it from us.`);
  if ((d.slots || []).length) facts.push(`<b>Time slots:</b> ${d.slots.map(esc).join(", ")}.`);
  if (Number(d.minOrder) > 0) facts.push(`<b>Minimum order ${inr(d.minOrder)}.</b>`);
  if (d.note) facts.push(esc(d.note));
  $("#delivery-facts").innerHTML = facts.map((f) => `<li><span>${f}</span></li>`).join("");

  $("#card-pickup").hidden = !o.pickup;
  $("#card-pickup-text").textContent = `From ${d.pickupWhere || "our kitchen"}. ${d.pickupNote || ""}`.trim();
  $("#card-delivery").hidden = !o.delivery;
  $("#card-delivery-title").textContent = d.mode === "free" || !d.mode ? "Free delivery nearby" : "Delivery nearby";
  $("#card-delivery-text").textContent = `${charge.long} if you live within ${r} of our kitchen.${o.pickup ? " Further away? Choose pickup." : ""}`;
  $("#near-check").hidden = !(o.delivery && baseLoc());

  const short = o.pickup && o.delivery
    ? `Pickup, or ${d.mode === "free" || !d.mode ? "free " : ""}delivery within ${r}`
    : o.pickup ? "Pickup in Ahmedabad" : `Delivery within ${r}`;
  $("#fact-where span").textContent = short;
  $("#foot-where").textContent = o.delivery ? `Pickup in Ahmedabad · delivery within ${r}` : "Pickup in Ahmedabad";
  $("#fact-lead span").textContent = lead === 1 ? "Order 24–48 hours ahead" : lead > 1 ? `Order ${lead} days ahead` : "Same-day when we have room";
  $("#fact-egg span").textContent = S.allEggless ? "100% eggless" : "Confirmed on WhatsApp";
}

function checkNear() {
  const out = $("#near-result"), base = baseLoc();
  if (!base) return;
  const fail = (msg) => { out.className = "pin-result no"; out.textContent = msg; };
  if (!navigator.geolocation) return fail("Your browser can't share your location. You can still order; we'll confirm on WhatsApp.");
  out.className = "pin-result";
  out.textContent = "Finding your location…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const km = distanceKm(base, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      const ok = km <= radius();
      out.className = "pin-result " + (ok ? "ok" : "no");
      out.textContent = ok
        ? `You're about ${kmText(km)} from our kitchen, so delivery is available.`
        : `You're about ${kmText(km)} away, outside our ${kmText(radius())} delivery range.${offers().pickup ? " Pickup is open to everyone." : ""}`;
    },
    () => fail("Couldn't get your location. You can still order; we'll confirm on WhatsApp."),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* ───────────── order sheet ───────────── */
let view = "cart";

function lineThumb(p) {
  return `<div class="line-thumb">${p.image ? `<img src="${esc(p.image)}" alt="" decoding="async" data-pid="${esc(p.id)}">` : placeholderHTML(p.tint)}</div>`;
}

function renderCart() {
  const box = $("#view-cart");
  if (!itemCount()) {
    box.innerHTML = `<div class="cart-empty"><strong>Your order is empty</strong><p>Add cakes, cupcakes and bakes from the menu, or design a custom cake.</p><button class="btn primary" type="button" data-browse>Browse the menu</button></div>`;
  } else {
    let html = "";
    for (const l of cart.lines) {
      const p = byId.get(l.pid), o = optionFor(p, l.label);
      html += `<div class="line" data-pid="${esc(l.pid)}" data-label="${esc(l.label)}">
        ${lineThumb(p)}
        <div><h4>${esc(p.name)}</h4><p>${esc(o.label)}${hasPrice(o.price) ? ` · ${inr(o.price)} each` : ""}</p></div>
        <div class="line-right"><span class="price">${hasPrice(o.price) ? inr(o.price * l.qty) : "On request"}</span>
          <div class="stepper"><button type="button" data-ldec aria-label="One fewer">−</button><output>${l.qty}</output><button type="button" data-linc aria-label="One more">+</button></div></div>
      </div>`;
    }
    for (const c of cart.custom) {
      const detail = [c.flavour, c.size, c.occasion].filter(Boolean).join(" · ");
      html += `<div class="line" data-cid="${esc(c.cid)}">
        <div class="line-thumb">${artSVG("cake", c.color, c.cid)}</div>
        <div><h4>Custom cake</h4><p>${esc(detail)}${c.theme ? `<br>Theme: ${esc(c.theme)}` : ""}${c.message ? `<br>Message: “${esc(c.message)}”` : ""}</p></div>
        <div class="line-right"><span class="price">${c.estimate ? `≈ ${inr(c.estimate)}` : "On request"}</span><button type="button" class="link-btn" data-cremove>Remove</button></div>
      </div>`;
    }
    box.innerHTML = html;
  }
  renderTotals();
}

function renderTotals() {
  const { sub, unpriced } = priced();
  const del = deliveryInfo(sub, unpriced);
  let rows = `<dt>Items</dt><dd>${inr(sub)}${unpriced ? " +" : ""}</dd><dt>${del.label}</dt><dd>${esc(del.text)}</dd>`;
  if (offers().pickup && offers().delivery) rows += `<dt style="grid-column:1/-1">Choose pickup or delivery in the next step</dt>`;
  if (unpriced) rows += `<dt style="grid-column:1/-1">${unpriced} item${unpriced === 1 ? "" : "s"} priced when we confirm your order</dt>`;
  const total = del.fee !== null && !unpriced ? sub + del.fee : null;
  rows += total !== null ? `<dt class="grand">Total</dt><dd class="grand">${inr(total)}</dd>` : `<dt class="grand">Estimated total</dt><dd class="grand">${inr(sub + (del.fee || 0))}${unpriced || del.fee === null ? " +" : ""}</dd>`;
  $("#totals").innerHTML = rows;

  const msg = $("#foot-msg"), go = $("#to-details");
  const min = Number(S.delivery?.minOrder) || 0;
  let block = "";
  if (!itemCount()) block = "Add something to your order first.";
  else if (!ordering()) block = S.pausedMessage;
  else if (min > 0 && sub < min && !unpriced) block = `Minimum order is ${inr(min)}. Add ${inr(min - sub)} more.`;
  msg.hidden = !block || !itemCount();
  msg.textContent = block;
  msg.classList.toggle("err", Boolean(block) && itemCount() > 0);
  go.disabled = Boolean(block);
}

function onCartClick(e) {
  if (e.target.closest("[data-browse]")) { closeSheet(); $("#menu").scrollIntoView(); return; }
  const line = e.target.closest(".line");
  if (!line) return;
  if (line.dataset.cid && e.target.closest("[data-cremove]")) {
    cart.custom = cart.custom.filter((c) => c.cid !== line.dataset.cid);
    saveCart(); renderCart(); return;
  }
  const { pid, label } = line.dataset;
  if (!pid) return;
  if (e.target.closest("[data-linc]")) setQty(pid, label, qtyOf(pid, label) + 1);
  else if (e.target.closest("[data-ldec]")) setQty(pid, label, qtyOf(pid, label) - 1);
  else return;
  renderCart();
  refreshCard(pid);
  const again = $(`#view-cart .line[data-pid="${CSS.escape(pid)}"][data-label="${CSS.escape(label)}"] ${e.target.closest("[data-linc]") ? "[data-linc]" : "[data-ldec]"}`);
  (again || $("#sheet-close")).focus();
}

function setView(v) {
  view = v;
  $("#view-cart").hidden = v !== "cart";
  $("#foot-cart").hidden = v !== "cart";
  $("#view-details").hidden = v !== "details";
  $("#foot-details").hidden = v !== "details";
  $("#view-sent").hidden = v !== "sent";
  $("#sheet-title").textContent = v === "details" ? "Pickup or delivery" : v === "sent" ? "Almost done" : "Your order";
  $$("#sheet-steps li").forEach((li, i) => li.classList.toggle("on", i === ["cart", "details", "sent"].indexOf(v)));
  if (v === "cart") renderCart();
  if (v === "details") prepDetails();
  $(".sheet-body:not([hidden])")?.scrollTo(0, 0);
}

function openSheet(v = "cart") {
  const d = $("#sheet");
  if (!d.open) d.showModal();
  setView(v);
  $("#cart-bar").hidden = true;
}
function closeSheet() {
  $("#sheet").close();
}

/* ───────────── delivery details form ───────────── */
const F = ["name", "phone", "date", "slot", "house", "street", "landmark", "pin", "map", "cakemsg", "notes"];
const field = (k) => $("#co-" + k);

function prepDetails() {
  const d = S.delivery || {};
  const min = isoDate(addDays(d.leadDays));
  const date = field("date");
  date.min = min;
  date.max = isoDate(addDays(120));
  if (!date.value || date.value < min) date.value = min;
  const slots = (d.slots || []).length ? d.slots : ["Any time"];
  const cur = field("slot").value;
  field("slot").innerHTML = `<option value="">Choose a time</option>` + slots.map((s) => `<option${s === cur ? " selected" : ""}>${esc(s)}</option>`).join("");
  const saved = store.get(DETAILS_KEY) || {};
  for (const k of ["name", "phone", "house", "street", "landmark", "pin", "map"]) if (!field(k).value && saved[k]) field(k).value = saved[k];
  const hasCakeMsg = cart.custom.some((c) => c.message);
  field("cakemsg").closest(".field").hidden = hasCakeMsg;
  const o = offers();
  $("#co-method").hidden = !(o.pickup && o.delivery);
  $("#m-pickup-text").textContent = "From our kitchen · free";
  $("#m-delivery-text").textContent = `${deliveryCharge().short} · within ${kmText(radius())}`;
  $$('input[name="co-method"]').forEach((r) => (r.checked = r.value === currentMethod()));
  applyMethod();
}

function applyMethod() {
  const m = currentMethod(), d = S.delivery || {};
  $("#addr-fields").hidden = m !== "delivery";
  const info = $("#pickup-info");
  info.hidden = m !== "pickup";
  info.textContent = `Pickup from ${d.pickupWhere || "our kitchen"}. ${d.pickupNote || ""}`.trim();
  $("#co-date-label").textContent = m === "pickup" ? "Pickup date" : "Delivery date";
  $("#co-slot-label").textContent = m === "pickup" ? "Pickup time" : "Delivery time";
  $("#co-map-hint").textContent = baseLoc()
    ? `Share your location so we can check you're within ${kmText(radius())}.`
    : "Helps us find you quickly.";
}

const saveDetails = debounce(() => {
  const o = {};
  for (const k of ["name", "phone", "house", "street", "landmark", "pin", "map"]) o[k] = field(k).value.trim();
  store.set(DETAILS_KEY, o);
}, 500);

function normPhone(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : "";
}

function mark(k, msg) {
  const f = field(k).closest(".field");
  f.classList.toggle("bad", Boolean(msg));
  let m = f.querySelector(".err-msg");
  if (msg) {
    if (!m) { m = document.createElement("p"); m.className = "err-msg"; m.id = `co-${k}-err`; f.appendChild(m); }
    m.textContent = msg;
    field(k).setAttribute("aria-invalid", "true");
    field(k).setAttribute("aria-describedby", m.id);
  } else {
    m?.remove();
    field(k).removeAttribute("aria-invalid");
    if (k !== "city") field(k).removeAttribute("aria-describedby");
  }
}

function readDetails() {
  const v = Object.fromEntries(F.map((k) => [k, field(k).value.trim()]));
  const m = currentMethod();
  const errors = {};
  let km = null;
  if (v.name.length < 2) errors.name = "Enter your name.";
  if (!normPhone(v.phone)) errors.phone = "Enter a 10-digit mobile number.";
  const min = isoDate(addDays(S.delivery?.leadDays));
  if (!v.date) errors.date = m === "pickup" ? "Choose a pickup date." : "Choose a delivery date.";
  else if (v.date < min) errors.date = `The earliest date is ${niceDate(min)}.`;
  if (!v.slot) errors.slot = "Choose a time.";
  if (m === "delivery") {
    if (v.house.length < 2) errors.house = "Enter your house or flat number and building.";
    if (v.street.length < 3) errors.street = "Enter your street, society and area.";
    const st = pincodeStatus(v.pin, S.delivery);
    if (st === "invalid") errors.pin = "Enter a 6-digit pincode.";
    if (st === "outside") errors.pin = "This pincode is outside Ahmedabad. Choose pickup instead, or message us on WhatsApp.";
    if (v.map && !/^https?:\/\//i.test(v.map)) errors.map = "Paste a full link starting with https://, or leave this empty.";
    const base = baseLoc(), here = parseLatLng(v.map);
    if (base && here) {
      km = distanceKm(base, here);
      if (km > radius()) {
        errors.map = `This location is about ${kmText(km)} from our kitchen and we deliver within ${kmText(radius())}.` +
          (offers().pickup ? " Choose pickup instead; you can book a Porter or Swiggy Genie to collect it." : "");
      }
    }
  }
  return { v, errors, m, km };
}

function orderText(v, m = currentMethod(), km = null) {
  const L = [`*New order · ${S.shopName || "The Pastry Palette"}*`, ""];
  let i = 1;
  for (const l of cart.lines) {
    const p = byId.get(l.pid), o = optionFor(p, l.label);
    const size = o.label ? ` (${o.label})` : "";
    L.push(`${i++}. ${p.name}${size} × ${l.qty} — ${hasPrice(o.price) ? inr(o.price * l.qty) : "price on request"}`);
  }
  for (const c of cart.custom) {
    L.push(`${i++}. Custom cake — ${[c.occasion, c.flavour, c.size].filter(Boolean).join(", ")}`);
    if (c.theme) L.push(`   Theme: ${c.theme}`);
    if (c.message) L.push(`   Message on cake: "${c.message}"`);
    L.push(`   Price to be confirmed${c.estimate ? ` (estimate ${inr(c.estimate)})` : ""}`);
  }
  const { sub, unpriced } = priced();
  const del = deliveryInfo(sub, unpriced);
  L.push("", `Items total: ${inr(sub)}${unpriced ? " + items priced on confirmation" : ""}`);
  L.push(`${del.label}: ${del.fee === null ? "charge to confirm" : del.text}`);
  if (del.fee !== null && !unpriced) L.push(`*Total: ${inr(sub + del.fee)}*`);
  if (m === "pickup") {
    L.push("", "*Pickup*", `Name: ${v.name}`, `Phone: ${normPhone(v.phone)}`, `Pickup: ${niceDate(v.date)}, ${v.slot}`);
  } else {
    L.push("", "*Delivery*", `Name: ${v.name}`, `Phone: ${normPhone(v.phone)}`, `Delivery: ${niceDate(v.date)}, ${v.slot}`);
    L.push(`Address: ${v.house}, ${v.street}, Ahmedabad ${v.pin}`);
    if (v.landmark) L.push(`Landmark: ${v.landmark}`);
    if (v.map) L.push(`Location: ${v.map}`);
    if (km !== null) L.push(`Distance: about ${kmText(km)} from the kitchen`);
  }
  if (v.cakemsg && !field("cakemsg").closest(".field").hidden) L.push(`Message on cake/card: ${v.cakemsg}`);
  if (v.notes) L.push(`Notes: ${v.notes}`);
  return L.join("\n");
}

let touched = false;
function syncSendLink() {
  const { v, errors, m, km } = readDetails();
  const ok = !Object.keys(errors).length;
  const a = $("#send-wa");
  a.href = ok ? waLink(orderText(v, m, km)) : waBase();
  a.setAttribute("aria-disabled", ok ? "false" : "true");
  if (touched) {
    for (const k of F) mark(k, errors[k]);
    $("#details-error").hidden = ok;
    $("#details-error").textContent = ok ? "" : "Fix the highlighted fields to send your order.";
  }
  return { ok, v, errors, m, km };
}

function onSend(e) {
  touched = true;
  const { ok, v, errors, m, km } = syncSendLink();
  if (!ok || !ordering() || !itemCount()) {
    e.preventDefault();
    const first = F.find((k) => errors[k]);
    if (first) field(first).focus();
    return;
  }
  // The link opens WhatsApp with the message written out. Show what was sent once it's on its way.
  const text = orderText(v, m, km);
  setTimeout(() => showSent(text), 400);
}

function showSent(text) {
  const box = $("#view-sent");
  box.innerHTML = `<div class="sent">
    <strong>Your order is ready in WhatsApp</strong>
    <p>Tap <b>Send</b> in WhatsApp to place it. We'll reply to confirm the total, the pickup location or delivery time, and payment.</p>
    <p class="fine">WhatsApp didn't open? Copy the message below and send it to ${esc(S.phoneDisplay || "+91 84602 82977")}.</p>
    <pre id="sent-text">${esc(text)}</pre>
    <div class="btn-row">
      <a class="btn wa" href="${waLink(text)}" target="_blank" rel="noopener">Open WhatsApp again</a>
      <button class="btn ghost" type="button" id="copy-order">Copy message</button>
      <button class="btn ghost" type="button" id="new-order">Start a new order</button>
    </div>
  </div>`;
  setView("sent");
  $("#copy-order").onclick = async () => {
    try { await navigator.clipboard.writeText(text); toast("Order copied"); }
    catch (err) { const r = document.createRange(); r.selectNodeContents($("#sent-text")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Selected. Copy it with your keyboard or long-press."); }
  };
  $("#new-order").onclick = () => {
    cart = { lines: [], custom: [] };
    saveCart();
    field("notes").value = ""; field("cakemsg").value = "";
    renderMenu();
    closeSheet();
    toast("Order cleared");
  };
}

function locate() {
  const btn = $("#co-locate");
  if (!navigator.geolocation) { mark("map", "Your browser can't share location. Paste a Google Maps link instead."); return; }
  btn.disabled = true;
  btn.textContent = "Finding…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      field("map").value = `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      btn.disabled = false; btn.textContent = "Use my location";
      mark("map", ""); saveDetails(); syncSendLink();
    },
    () => {
      btn.disabled = false; btn.textContent = "Use my location";
      mark("map", "Couldn't get your location. Paste a Google Maps link, or leave this empty.");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* ───────────── settings applied to the page ───────────── */
function applySettings() {
  const a = $("#announce");
  a.hidden = !S.announcement;
  $("#announce-text").textContent = S.announcement || "";
  const wa = waBase();
  for (const id of ["#wa-float", "#foot-wa"]) $(id).href = wa;
  const digits = String(S.whatsapp || "").replace(/\D/g, "");
  $("#foot-call").href = "tel:+" + digits;
  $("#foot-phone").textContent = S.phoneDisplay || "+" + digits;
  const ig = `https://www.instagram.com/${String(S.instagram || "thepastry_palette").replace(/^@/, "")}/`;
  $("#insta-link").href = ig; $("#foot-insta").href = ig;
  $("#insta-link").textContent = `Follow @${String(S.instagram || "thepastry_palette").replace(/^@/, "")}`;
  const paused = $("#paused");
  paused.hidden = ordering();
  if (!ordering()) paused.innerHTML = `<span>${esc(S.pausedMessage)}</span><a class="btn small wa" href="${waLink("Hi! I'd like to book an order for a later date.")}" target="_blank" rel="noopener">Message us</a>`;
}

function renderAll() {
  byId = new Map(P.map((p) => [p.id, p]));
  pruneCart();
  applySettings();
  renderMenu();
  renderBuilder();
  renderFulfilment();
  updateCartUI();
  if ($("#sheet").open && view === "cart") renderCart();
}

/* ───────────── start ───────────── */
async function start() {
  $("#year").textContent = new Date().getFullYear();
  $("#admin-link").hidden = isLive;
  $("#cake-art").innerHTML = cakeSVG();
  loadCart();
  try {
    const data = await loadShop();
    S = data.settings;
    P = data.products;
  } catch (err) {
    console.error(err);
    S = (await import("./data.js")).mergeSettings({});
    P = [];
    renderAll();
    $("#menu-body").innerHTML = `<div class="empty">We couldn't load the menu just now. Refresh the page, or <a href="${waBase()}" target="_blank" rel="noopener">message us on WhatsApp</a>.</div>`;
    return;
  }
  renderAll();

  // Demo mode: changes saved in /admin (another tab) show up here straight away.
  if (!isLive) {
    window.addEventListener("storage", async (e) => {
      if (e.key !== "tpp-demo-v2") return;
      demoForget();
      const data = await loadShop();
      S = data.settings; P = data.products;
      renderAll();
    });
  }
}

$("#menu-body").addEventListener("click", onMenuClick);
$("#builder").addEventListener("click", onBuilderClick);
$("#builder").addEventListener("submit", addCustom);
$("#b-message").addEventListener("input", () => updateCake());
$("#near-btn").addEventListener("click", checkNear);
$("#co-method").addEventListener("change", (e) => {
  if (e.target.name !== "co-method") return;
  method = e.target.value;
  store.set(METHOD_KEY, method);
  applyMethod();
  syncSendLink();
});
$("#cart-open").addEventListener("click", () => openSheet("cart"));
$("#cart-bar-btn").addEventListener("click", () => openSheet("cart"));
$("#sheet-close").addEventListener("click", closeSheet);
$("#sheet").addEventListener("close", () => { updateCartUI(); });
$("#sheet").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeSheet(); });
$("#view-cart").addEventListener("click", onCartClick);
$("#to-details").addEventListener("click", () => setView("details"));
$("#back-cart").addEventListener("click", () => setView("cart"));
$("#view-details").addEventListener("input", () => { saveDetails(); syncSendLink(); });
$("#view-details").addEventListener("change", () => syncSendLink());
$("#view-details").addEventListener("submit", (e) => e.preventDefault());
$("#send-wa").addEventListener("click", onSend);
$("#co-locate").addEventListener("click", locate);

start();
