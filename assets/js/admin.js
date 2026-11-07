// The Pastry Palette — admin panel.
// Products (add, edit, delete, photos, prices, sold out, show/hide, order), bulk price changes,
// categories, order and delivery settings, the cake designer, shop details and backups.

import { admin, isLive, sortProducts, mergeSettings, STARTER_PRODUCTS, DEFAULT_SETTINGS } from "./data.js";
import { placeholderHTML, ART_TYPES } from "./art.js";
import { esc, inr, hasPrice, clone, slug, uid, store, parseLatLng } from "./util.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

let S = null;
let P = [];

/* ───────────── feedback ───────────── */
let toastTimer;
function toast(msg, kind = "") {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>`;
  t.style.background = kind === "err" ? "var(--err)" : "";
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), kind === "err" ? 6000 : 2600);
}

function errText(e) {
  const code = String(e?.code || "");
  if (code.includes("permission-denied")) return "You don't have permission to change the shop. Sign out and sign in with the admin account.";
  if (code.includes("unavailable") || code.includes("network")) return "Couldn't reach the server. Check your internet connection and try again.";
  if (code.includes("invalid-argument") && /bytes|size/i.test(e.message)) return "That's too large to save. Use a smaller photo.";
  return `Couldn't save: ${e?.message || e}`;
}

async function run(fn, okMsg) {
  try {
    const r = await fn();
    if (r && r.warn) toast(r.warn, "err");
    else if (okMsg) toast(okMsg);
    return true;
  } catch (e) {
    console.error(e);
    toast(errText(e), "err");
    return false;
  }
}

/* ───────────── boot + login ───────────── */
function show(id) {
  for (const x of ["#loading", "#login", "#noadmin", "#panel"]) $(x).hidden = x !== id;
}

async function loadAll() {
  const d = await admin.load();
  S = d.settings;
  P = d.products;
  $("#first-run").hidden = !d.empty;
  renderAll(true);
  show("#panel");
}

async function boot() {
  const chip = $("#mode-chip");
  chip.textContent = isLive ? "Live" : "Demo";
  chip.classList.add(isLive ? "live" : "demo");
  chip.title = isLive ? "Changes go to your website straight away" : "Changes are saved in this browser only";
  $("#demo-note").hidden = isLive;
  try {
    await admin.start();
  } catch (e) {
    console.error(e);
    $("#loading").textContent = "Couldn't load Firebase. Check your internet connection and the settings in assets/js/config.js.";
    return;
  }
  admin.onAuth(async (u) => {
    $("#sign-out").hidden = !(u && !u.demo);
    if (!u) { show("#login"); $("#login-user").focus(); return; }
    if (!u.demo && !u.isAdmin) {
      $("#noadmin-email").textContent = u.email || "this account";
      $("#noadmin-uid").textContent = u.uid;
      show("#noadmin");
      return;
    }
    show("#loading");
    try { await loadAll(); }
    catch (e) { console.error(e); $("#loading").textContent = "Couldn't load the shop data. " + errText(e).replace(/^Couldn't save: /, ""); show("#loading"); }
  });
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = $("#login-user").value.trim(), pass = $("#login-pass").value;
  const err = $("#login-err");
  if (!user || !pass) { err.hidden = false; err.textContent = "Enter your username and password."; return; }
  const btn = $("#login-btn");
  btn.disabled = true; btn.textContent = "Signing in…"; err.hidden = true;
  try {
    await admin.signIn(user, pass);
  } catch (ex) {
    const c = String(ex.code || "");
    err.textContent = /invalid-credential|wrong-password|user-not-found|invalid-email/.test(c) ? "Wrong username or password."
      : c.includes("too-many-requests") ? "Too many attempts. Wait a few minutes and try again."
      : c.includes("network") ? "Couldn't reach the server. Check your internet connection."
      : `Couldn't sign in (${c || ex.message}).`;
    err.hidden = false;
  }
  btn.disabled = false; btn.textContent = "Sign in";
});
$("#toggle-pass").addEventListener("click", (e) => {
  const input = $("#login-pass"), show = input.type === "password";
  input.type = show ? "text" : "password";
  e.currentTarget.textContent = show ? "Hide" : "Show";
  e.currentTarget.setAttribute("aria-pressed", String(show));
});
for (const id of ["#sign-out", "#noadmin-out"]) $(id).addEventListener("click", () => admin.signOut());

// A product photo that can't load shows its illustration instead.
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img.tagName !== "IMG" || !img.closest(".p-thumb")) return;
  const p = P.find((x) => x.id === img.closest(".p-row")?.dataset.id);
  if (p) img.outerHTML = placeholderHTML(p.tint);
}, true);
$("#copy-uid").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("#noadmin-uid").textContent); toast("UID copied"); } catch (e) { toast("Select the UID and copy it."); }
});

/* ───────────── tabs ───────────── */
const TAB_KEY = "tpp-admin-tab";
function selectTab(btn, focus) {
  $$("#tabs [role=tab]").forEach((b) => {
    const on = b === btn;
    b.setAttribute("aria-selected", on);
    b.tabIndex = on ? 0 : -1;
    $("#" + b.getAttribute("aria-controls")).hidden = !on;
  });
  if (focus) btn.focus();
  store.set(TAB_KEY, btn.id);
}
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("[role=tab]"); if (b) selectTab(b); });
$("#tabs").addEventListener("keydown", (e) => {
  if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
  const tabs = $$("#tabs [role=tab]");
  const i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  selectTab(tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length], true);
});

/* ───────────── products ───────────── */
const catName = (id) => S.categories.find((c) => c.id === id)?.name || "No category";
const thumb = (p) => (p.image ? `<img src="${esc(p.image)}" alt="">` : placeholderHTML(p.tint));

function renderCatFilter() {
  const sel = $("#p-cat"), cur = sel.value;
  const orphan = P.some((p) => !S.categories.some((c) => c.id === p.category));
  sel.innerHTML = `<option value="">All categories</option>` + S.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("") + (orphan ? `<option value="__none">No category</option>` : "");
  sel.value = [...sel.options].some((o) => o.value === cur) ? cur : "";
}

function rowHTML(p) {
  const opts = p.options || [];
  const prices = p.kind === "custom"
    ? `<span class="help">Priced by the cake designer's flavours and sizes.</span>`
    : opts.length
      ? opts.map((o, i) => `<label class="price-in"><span>${esc(o.label)}</span><i>₹</i><input type="number" min="0" step="1" inputmode="numeric" value="${hasPrice(o.price) ? Number(o.price) : ""}" placeholder="—" data-price="${i}" aria-label="Price of ${esc(p.name)}, ${esc(o.label)}"></label>`).join("")
      : `<span class="help">No sizes yet. Edit the product to add prices.</span>`;
  const tags = [
    p.hidden ? `<span class="tag warn">Hidden</span>` : "",
    p.soldOut ? `<span class="tag warn">Sold out</span>` : "",
    p.bestseller ? `<span class="tag">Bestseller</span>` : "",
    p.eggless ? `<span class="tag">Eggless</span>` : "",
    p.kind === "custom" ? `<span class="tag">Opens cake designer</span>` : "",
    ...(p.kind === "custom" ? [] : (p.choices || []).filter((g) => g?.name && g.values?.length).map((g) => `<span class="tag" title="${esc(g.values.map((v) => v.label).join(", "))}">${esc(g.name)}: ${g.values.length}</span>`)),
  ].join("");
  const id = esc(p.id);
  return `<div class="p-row${p.hidden ? " is-hidden" : ""}" data-id="${id}">
    <div class="p-thumb">${thumb(p)}</div>
    <div class="p-main">
      <div class="p-title"><b>${esc(p.name)}</b>${tags}</div>
      <div class="p-prices">${prices}</div>
      <div class="p-ctl">
        <div class="p-switches">
          <label class="switch-row"><input type="checkbox" data-toggle="show" ${p.hidden ? "" : "checked"}><span class="switch" aria-hidden="true"></span><span><b>On website</b></span></label>
          <label class="switch-row"><input type="checkbox" data-toggle="soldOut" ${p.soldOut ? "checked" : ""}><span class="switch" aria-hidden="true"></span><span><b>Sold out</b></span></label>
        </div>
        <div class="p-actions">
          <button class="mini" type="button" data-move="-1" aria-label="Move ${esc(p.name)} up">↑</button>
          <button class="mini" type="button" data-move="1" aria-label="Move ${esc(p.name)} down">↓</button>
          <button class="mini" type="button" data-edit>Edit</button>
          <button class="mini danger" type="button" data-del>Delete</button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderProducts() {
  renderCatFilter();
  const q = $("#p-search").value.trim().toLowerCase();
  const cat = $("#p-cat").value;
  const match = (p) => (!q || `${p.name} ${p.desc || ""}`.toLowerCase().includes(q)) &&
    (!cat || (cat === "__none" ? !S.categories.some((c) => c.id === p.category) : p.category === cat));
  const list = P.filter(match);
  const groups = S.categories.map((c) => ({ ...c, items: list.filter((p) => p.category === c.id) }));
  const orphans = list.filter((p) => !S.categories.some((c) => c.id === p.category));
  if (orphans.length) groups.push({ id: "__none", name: "No category", items: orphans });
  const hidden = P.filter((p) => p.hidden).length, sold = P.filter((p) => p.soldOut).length;
  $("#p-summary").textContent = `${P.length} product${P.length === 1 ? "" : "s"}${hidden ? ` · ${hidden} hidden` : ""}${sold ? ` · ${sold} sold out` : ""}${q || cat ? ` · showing ${list.length}` : ""}`;
  const html = groups.filter((g) => g.items.length).map((g) => `<section class="p-group"><h3>${esc(g.name)}<small>${g.items.length}</small></h3><div class="p-rows">${g.items.map(rowHTML).join("")}</div></section>`).join("");
  $("#p-list").innerHTML = html || `<div class="empty">${P.length ? "No products match." : "No products yet. Add your first product."}</div>`;
  // first/last in each category can't move further
  $$(".p-rows").forEach((rows) => {
    const r = $$(".p-row", rows);
    r.forEach((row, i) => {
      $('[data-move="-1"]', row).disabled = i === 0 || Boolean(q);
      $('[data-move="1"]', row).disabled = i === r.length - 1 || Boolean(q);
    });
  });
}

const findP = (id) => P.find((p) => p.id === id);
function replaceP(p) {
  const i = P.findIndex((x) => x.id === p.id);
  if (i >= 0) P[i] = p; else P.push(p);
  P = sortProducts(P);
}

$("#p-list").addEventListener("change", async (e) => {
  const row = e.target.closest(".p-row");
  if (!row) return;
  const p = findP(row.dataset.id);
  if (!p) return;
  if (e.target.matches("[data-price]")) {
    const i = Number(e.target.dataset.price);
    const raw = e.target.value.trim();
    const val = raw === "" ? null : Math.max(0, Math.round(Number(raw)));
    if (raw !== "" && isNaN(val)) { toast("Enter a number.", "err"); return; }
    const options = clone(p.options);
    options[i].price = val;
    if (await run(() => admin.patchProducts([{ id: p.id, patch: { options } }]), `${p.name}: ${options[i].label} is now ${val === null ? "price on request" : inr(val)}`)) p.options = options;
    else e.target.value = hasPrice(p.options[i].price) ? p.options[i].price : "";
  } else if (e.target.matches("[data-toggle]")) {
    const key = e.target.dataset.toggle;
    const patch = key === "show" ? { hidden: !e.target.checked } : { soldOut: e.target.checked };
    const msg = key === "show" ? `${p.name} is ${e.target.checked ? "on the website" : "hidden"}` : `${p.name} is ${e.target.checked ? "marked sold out" : "available again"}`;
    if (await run(() => admin.patchProducts([{ id: p.id, patch }]), msg)) Object.assign(p, patch);
    else e.target.checked = !e.target.checked;
    const focusKey = key;
    renderProducts();
    $(`.p-row[data-id="${CSS.escape(p.id)}"] [data-toggle="${focusKey}"]`)?.focus();
  }
});

$("#p-list").addEventListener("click", async (e) => {
  const row = e.target.closest(".p-row");
  if (!row) return;
  const p = findP(row.dataset.id);
  if (!p) return;
  const actions = $(".p-actions", row);
  if (e.target.closest("[data-edit]")) openEditor(p);
  else if (e.target.closest("[data-move]")) await move(p, Number(e.target.closest("[data-move]").dataset.move));
  else if (e.target.closest("[data-del]")) {
    actions.innerHTML = `<span class="confirm">Delete this product? <button class="mini yes" type="button" data-del-yes>Delete</button><button class="mini" type="button" data-del-no>Keep</button></span>`;
    $("[data-del-no]", actions).focus();
  } else if (e.target.closest("[data-del-no]")) renderProducts();
  else if (e.target.closest("[data-del-yes]")) {
    if (await run(() => admin.deleteProduct(p.id), `Deleted ${p.name}`)) { P = P.filter((x) => x.id !== p.id); renderAll(); }
  }
});

async function move(p, dir) {
  const group = P.filter((x) => x.category === p.category);
  const i = group.indexOf(p), j = i + dir;
  if (j < 0 || j >= group.length) return;
  [group[i], group[j]] = [group[j], group[i]];
  const patches = [];
  group.forEach((x, k) => { const s = (k + 1) * 10; if (x.sort !== s) patches.push({ id: x.id, patch: { sort: s } }); });
  if (await run(() => admin.patchProducts(patches))) {
    for (const { id, patch } of patches) Object.assign(findP(id), patch);
    P = sortProducts(P);
    renderProducts();
    const row = $(`.p-row[data-id="${CSS.escape(p.id)}"]`);
    ($(`[data-move="${dir}"]:not(:disabled)`, row) || $("[data-edit]", row))?.focus();
  }
}

$("#p-search").addEventListener("input", renderProducts);
$("#p-cat").addEventListener("change", renderProducts);

/* ───────────── product editor ───────────── */
let ed = null;

function nextSort(cat) {
  return Math.max(0, ...P.filter((p) => p.category === cat).map((p) => Number(p.sort) || 0)) + 10;
}

function openEditor(p) {
  const fresh = !p;
  ed = p ? clone(p) : {
    id: null, name: "", category: $("#p-cat").value && $("#p-cat").value !== "__none" ? $("#p-cat").value : S.categories[0]?.id || "",
    desc: "", options: [{ label: "", price: null }], art: "cake", tint: "#b9773f", note: "", kind: "",
    hidden: false, soldOut: false, bestseller: false, eggless: false,
  };
  $("#ed-title").textContent = fresh ? "Add a product" : "Edit product";
  $("#ed-name").value = ed.name;
  $("#ed-cat").innerHTML = S.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("") + (S.categories.some((c) => c.id === ed.category) ? "" : `<option value="${esc(ed.category)}">No category</option>`);
  $("#ed-cat").value = ed.category;
  $("#ed-kind").value = ed.kind || "";
  $("#ed-desc").value = ed.desc || "";
  $("#ed-note").value = ed.note || "";
  $("#ed-show").checked = !ed.hidden;
  $("#ed-sold").checked = Boolean(ed.soldOut);
  $("#ed-best").checked = Boolean(ed.bestseller);
  $("#ed-egg").checked = Boolean(ed.eggless);
  $("#ed-art").innerHTML = ART_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
  $("#ed-art").value = ed.art || "cake";
  $("#ed-tint").value = /^#[0-9a-f]{6}$/i.test(ed.tint || "") ? ed.tint : "#b9773f";
  $("#ed-err").hidden = true;
  $("#ed-file").value = "";
  $("#ed-photo-hint").textContent = "Square or landscape photos work best. They're resized and compressed before saving.";
  $("#ed-delete-zone").innerHTML = fresh ? "" : `<button class="btn small ghost danger" type="button" id="ed-del">Delete product</button>`;
  ed.choices = clone(ed.choices || []);
  renderEdOpts();
  renderEdChoices();
  renderEdPreview();
  toggleKind();
  $("#editor").showModal();
  $("#ed-name").focus();
}

function renderEdPreview() {
  $("#ed-preview").innerHTML = ed.image ? `<img src="${esc(ed.image)}" alt="Product photo">` : placeholderHTML(ed.tint);
  $("#ed-art-fields").hidden = Boolean(ed.image);
  $("#ed-remove-photo").hidden = !ed.image;
}

function renderEdOpts() {
  $("#ed-opts").innerHTML = (ed.options || []).map((o, i) => `<div class="row-edit" data-i="${i}">
    <input class="grow" data-f="label" value="${esc(o.label)}" placeholder="Size, e.g. 500 g or Box of 6" aria-label="Size ${i + 1} name" maxlength="40">
    <span class="unit">₹</span><input class="num" data-f="price" type="number" min="0" step="1" inputmode="numeric" value="${hasPrice(o.price) ? Number(o.price) : ""}" placeholder="Price" aria-label="Size ${i + 1} price">
    <button class="mini" type="button" data-up ${i === 0 ? "disabled" : ""} aria-label="Move size up">↑</button>
    <button class="mini danger" type="button" data-rm aria-label="Remove size ${i + 1}">Remove</button>
  </div>`).join("");
}

function readEdOpts() {
  return $$("#ed-opts .row-edit").map((r) => {
    const label = $('[data-f="label"]', r).value.trim();
    const raw = $('[data-f="price"]', r).value.trim();
    return { label, price: raw === "" ? null : Math.max(0, Math.round(Number(raw))) };
  });
}

function toggleKind() {
  const custom = $("#ed-kind").value === "custom";
  $("#ed-opts-wrap").hidden = custom;
  $("#ed-ch-wrap").hidden = custom;
}

/* flavour and other choice lists: [{ name, type: "one" | "many", values: [{ label, extra }] }] */
function renderEdChoices() {
  $("#ed-ch").innerHTML = (ed.choices || []).map((g, gi) => `<div class="ch-group" data-g="${gi}">
    <div class="ch-head">
      <input data-f="name" value="${esc(g.name || "")}" placeholder="List name, e.g. Flavour" aria-label="Choice list ${gi + 1} name" maxlength="30">
      <select data-f="type" aria-label="How many the customer picks from list ${gi + 1}">
        <option value="one"${g.type === "many" ? "" : " selected"}>Customer picks one</option>
        <option value="many"${g.type === "many" ? " selected" : ""}>Customer picks any</option>
      </select>
      <button class="mini danger" type="button" data-g-rm aria-label="Remove choice list ${gi + 1}">Remove list</button>
    </div>
    <div class="rows">${(g.values || []).map((v, vi) => `<div class="row-edit" data-v="${vi}">
      <input class="grow" data-f="label" value="${esc(v.label || "")}" placeholder="Option, e.g. Chocolate" aria-label="List ${gi + 1}, option ${vi + 1}" maxlength="50">
      <span class="unit">+ ₹</span><input class="num" data-f="extra" type="number" min="0" step="1" inputmode="numeric" value="${Number(v.extra) > 0 ? Number(v.extra) : ""}" placeholder="0" aria-label="Extra price for list ${gi + 1}, option ${vi + 1}">
      <button class="mini" type="button" data-v-up ${vi === 0 ? "disabled" : ""} aria-label="Move option up">↑</button>
      <button class="mini danger" type="button" data-v-rm aria-label="Remove option ${vi + 1}">Remove</button>
    </div>`).join("")}</div>
    <div class="ch-foot"><button class="btn small ghost" type="button" data-v-add>Add an option</button></div>
  </div>`).join("");
}

function readEdChoices() {
  return $$("#ed-ch .ch-group").map((gEl) => ({
    name: $('[data-f="name"]', gEl).value.trim(),
    type: $('[data-f="type"]', gEl).value === "many" ? "many" : "one",
    values: $$(".row-edit", gEl).map((r) => {
      const raw = $('[data-f="extra"]', r).value.trim();
      const n = Math.max(0, Math.round(Number(raw)));
      return { label: $('[data-f="label"]', r).value.trim(), extra: raw === "" || !n ? null : n };
    }),
  }));
}

$("#ed-ch").addEventListener("click", (e) => {
  const gEl = e.target.closest(".ch-group");
  if (!gEl) return;
  ed.choices = readEdChoices();
  const gi = Number(gEl.dataset.g), g = ed.choices[gi];
  const vEl = e.target.closest(".row-edit"), vi = vEl ? Number(vEl.dataset.v) : -1;
  let focus = null;
  if (e.target.closest("[data-g-rm]")) { ed.choices.splice(gi, 1); focus = "#ed-ch-add"; }
  else if (e.target.closest("[data-v-add]")) { g.values.push({ label: "", extra: null }); focus = `[data-g="${gi}"] .row-edit:last-child [data-f="label"]`; }
  else if (e.target.closest("[data-v-rm]")) { g.values.splice(vi, 1); focus = `[data-g="${gi}"] [data-v-add]`; }
  else if (e.target.closest("[data-v-up]") && vi > 0) { [g.values[vi - 1], g.values[vi]] = [g.values[vi], g.values[vi - 1]]; focus = `[data-g="${gi}"] [data-v="${vi - 1}"] [data-v-up]:not(:disabled), [data-g="${gi}"] [data-v="${vi - 1}"] [data-f="label"]`; }
  else return;
  renderEdChoices();
  if (focus) $(focus)?.focus();
});
$("#ed-ch-add").addEventListener("click", () => {
  ed.choices = readEdChoices();
  ed.choices.push({ name: ed.choices.some((g) => g.name.toLowerCase() === "flavour") ? "" : "Flavour", type: "one", values: [{ label: "", extra: null }, { label: "", extra: null }] });
  renderEdChoices();
  $$("#ed-ch .ch-group").at(-1)?.querySelector(".row-edit input")?.focus();
});
$("#ed-ch-flav").addEventListener("click", () => {
  ed.choices = readEdChoices();
  const names = (S.custom?.flavours || []).map((f) => f.name).filter(Boolean);
  if (!names.length) { toast("Add flavours in the Cake designer tab first.", "err"); return; }
  let g = ed.choices.find((x) => x.name.toLowerCase() === "flavour");
  if (!g) { g = { name: "Flavour", type: "one", values: [] }; ed.choices.push(g); }
  g.values = g.values.filter((v) => v.label);
  for (const n of names) if (!g.values.some((v) => v.label.toLowerCase() === n.toLowerCase())) g.values.push({ label: n, extra: null });
  renderEdChoices();
  $(`#ed-ch [data-g="${ed.choices.indexOf(g)}"] [data-f="name"]`)?.focus();
});

$("#ed-opts").addEventListener("click", (e) => {
  const r = e.target.closest(".row-edit");
  if (!r) return;
  ed.options = readEdOpts();
  const i = Number(r.dataset.i);
  if (e.target.closest("[data-rm]")) ed.options.splice(i, 1);
  else if (e.target.closest("[data-up]") && i > 0) [ed.options[i - 1], ed.options[i]] = [ed.options[i], ed.options[i - 1]];
  else return;
  renderEdOpts();
});
$("#ed-opt-add").addEventListener("click", () => {
  ed.options = readEdOpts();
  ed.options.push({ label: "", price: null });
  renderEdOpts();
  $$("#ed-opts .row-edit").at(-1)?.querySelector("input").focus();
});
$("#ed-kind").addEventListener("change", toggleKind);
$("#ed-art").addEventListener("change", () => { ed.art = $("#ed-art").value; renderEdPreview(); });
$("#ed-tint").addEventListener("input", () => { ed.tint = $("#ed-tint").value; renderEdPreview(); });
$("#ed-remove-photo").addEventListener("click", () => { delete ed.image; $("#ed-file").value = ""; renderEdPreview(); });

$("#ed-file").addEventListener("change", async () => {
  const f = $("#ed-file").files[0];
  if (!f) return;
  const hint = $("#ed-photo-hint");
  hint.textContent = "Preparing photo…";
  try {
    ed.image = await compress(f);
    renderEdPreview();
    hint.textContent = `Photo ready (${Math.round((ed.image.length * 0.75) / 1024)} KB). Save the product to keep it.`;
  } catch (e) {
    console.error(e);
    hint.textContent = "This photo couldn't be opened. Use a JPG or PNG file.";
  }
});

// Resize to at most 1000 px and compress (WebP where the browser supports it) so it fits in the database.
async function compress(file, maxSide = 1000, targetBytes = 230000) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    let side = maxSide, out = "";
    for (let pass = 0; pass < 3; pass++) {
      const s = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      let type = "image/webp", q = 0.82;
      out = c.toDataURL(type, q);
      if (!out.startsWith("data:image/webp")) { type = "image/jpeg"; out = c.toDataURL(type, q); }
      while (out.length * 0.75 > targetBytes && q > 0.5) { q -= 0.08; out = c.toDataURL(type, q); }
      if (out.length * 0.75 <= targetBytes) break;
      side = Math.round(side * 0.75);
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

$("#editor").addEventListener("click", async (e) => {
  if (e.target.closest("[data-close]")) { $("#editor").close(); return; }
  if (e.target.id === "ed-del") {
    $("#ed-delete-zone").innerHTML = `<span class="confirm">Delete for good? <button class="mini yes" type="button" id="ed-del-yes">Delete</button><button class="mini" type="button" id="ed-del-no">Keep</button></span>`;
    $("#ed-del-no").focus();
  } else if (e.target.id === "ed-del-no") {
    $("#ed-delete-zone").innerHTML = `<button class="btn small ghost danger" type="button" id="ed-del">Delete product</button>`;
  } else if (e.target.id === "ed-del-yes") {
    const id = ed.id, name = ed.name;
    if (await run(() => admin.deleteProduct(id), `Deleted ${name}`)) { P = P.filter((x) => x.id !== id); $("#editor").close(); renderAll(); }
  }
});

$("#ed-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#ed-err");
  const name = $("#ed-name").value.trim();
  const kind = $("#ed-kind").value;
  const options = readEdOpts().filter((o) => o.label);
  const problems = [];
  if (!name) problems.push("Give the product a name.");
  if (!$("#ed-cat").value) problems.push("Choose a category (add one in the Categories tab first).");
  if (kind !== "custom" && !options.length) problems.push("Add at least one size, such as \"500 g\" or \"Box of 6\".");
  if (readEdOpts().some((o) => !o.label && o.price !== null)) problems.push("Every price needs a size name.");
  const choices = kind === "custom" ? [] : readEdChoices()
    .map((g) => ({ ...g, values: g.values.filter((v) => v.label) }))
    .filter((g) => g.name || g.values.length);
  if (choices.some((g) => !g.name)) problems.push("Give every choice list a name, such as \"Flavour\".");
  if (choices.some((g) => g.name && !g.values.length)) problems.push("Add at least one option to every choice list, or remove the empty list.");
  const chNames = choices.map((g) => g.name.toLowerCase());
  if (chNames.some((n, i) => chNames.indexOf(n) !== i)) problems.push("Two choice lists have the same name.");
  if (choices.some((g) => { const l = g.values.map((v) => v.label.toLowerCase()); return l.some((x, i) => l.indexOf(x) !== i); })) problems.push("A choice list has the same option twice.");
  if (problems.length) { err.textContent = problems.join(" "); err.hidden = false; return; }
  err.hidden = true;
  const cat = $("#ed-cat").value;
  const p = {
    ...ed,
    name, kind, options: kind === "custom" ? [] : options, choices, category: cat,
    desc: $("#ed-desc").value.trim(), note: $("#ed-note").value.trim(),
    hidden: !$("#ed-show").checked, soldOut: $("#ed-sold").checked, bestseller: $("#ed-best").checked, eggless: $("#ed-egg").checked,
    art: $("#ed-art").value, tint: $("#ed-tint").value,
  };
  if (!p.kind) delete p.kind;
  if (!p.id) {
    let id = uid(name);
    while (findP(id)) id = uid(name);
    p.id = id;
    p.sort = nextSort(cat);
  } else if (cat !== findP(p.id)?.category) p.sort = nextSort(cat);
  const btn = $("#ed-save");
  btn.disabled = true; btn.textContent = "Saving…";
  const ok = await run(() => admin.saveProduct(p), `Saved ${p.name}`);
  btn.disabled = false; btn.textContent = "Save product";
  if (ok) { replaceP(p); $("#editor").close(); renderAll(); }
});

$("#add-product").addEventListener("click", () => openEditor(null));

/* ───────────── bulk price change ───────────── */
function bulkPlan() {
  const scope = $("#bk-scope").value;
  const dir = Number($("#bk-dir").value), amt = Math.max(0, Number($("#bk-amt").value) || 0);
  const unit = $("#bk-unit").value, step = Number($("#bk-round").value) || 1;
  const rows = [];
  for (const p of P) {
    if (p.kind === "custom" || (scope && p.category !== scope)) continue;
    (p.options || []).forEach((o, i) => {
      if (!hasPrice(o.price)) return;
      const old = Number(o.price);
      let nw = unit === "pct" ? old * (1 + (dir * amt) / 100) : old + dir * amt;
      nw = Math.max(step, Math.round(nw / step) * step);
      rows.push({ p, i, label: o.label, old, nw });
    });
  }
  return rows;
}
function renderBulk() {
  const rows = bulkPlan();
  const changed = rows.filter((r) => r.nw !== r.old).length;
  $("#bk-table").innerHTML = rows.length
    ? `<table><thead><tr><th>Product</th><th>Size</th><th class="num">Now</th><th class="num">New</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.p.name)}</td><td>${esc(r.label)}</td><td class="num">${inr(r.old)}</td><td class="num ${r.nw > r.old ? "up" : r.nw < r.old ? "down" : ""}">${inr(r.nw)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="help" style="padding:1rem">No priced products in this selection.</p>`;
  $("#bk-sum").textContent = `${changed} price${changed === 1 ? "" : "s"} will change`;
}
$("#bulk-open").addEventListener("click", () => {
  $("#bk-scope").innerHTML = `<option value="">All products</option>` + S.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  renderBulk();
  $("#bulk").showModal();
});
$("#bulk-form").addEventListener("input", renderBulk);
$("#bulk-form").addEventListener("change", renderBulk);
$("#bulk").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) $("#bulk").close(); });
$("#bulk-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const rows = bulkPlan().filter((r) => r.nw !== r.old);
  if (!rows.length) { toast("Nothing to change."); return; }
  const byP = new Map();
  for (const r of rows) {
    if (!byP.has(r.p.id)) byP.set(r.p.id, clone(r.p.options));
    byP.get(r.p.id)[r.i].price = r.nw;
  }
  const patches = [...byP].map(([id, options]) => ({ id, patch: { options } }));
  if (await run(() => admin.patchProducts(patches), `Updated ${rows.length} price${rows.length === 1 ? "" : "s"}`)) {
    for (const { id, patch } of patches) findP(id).options = patch.options;
    $("#bulk").close();
    renderProducts();
  }
});

/* ───────────── categories ───────────── */
function renderCategories() {
  $("#c-list").innerHTML = S.categories.map((c, i) => {
    const n = P.filter((p) => p.category === c.id).length;
    return `<div class="c-row" data-i="${i}">
      <input value="${esc(c.name)}" aria-label="Category name" maxlength="40" data-rename>
      <span class="count">${n} product${n === 1 ? "" : "s"}</span>
      <button class="mini" type="button" data-cmove="-1" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(c.name)} up">↑</button>
      <button class="mini" type="button" data-cmove="1" ${i === S.categories.length - 1 ? "disabled" : ""} aria-label="Move ${esc(c.name)} down">↓</button>
      <span class="c-del">${n ? `<button class="mini danger" type="button" disabled title="Move or delete its products first">Delete</button>` : `<button class="mini danger" type="button" data-cdel>Delete</button>`}</span>
    </div>`;
  }).join("") || `<p class="help">No categories yet.</p>`;
}
async function saveCats(msg) {
  const ok = await run(() => admin.saveSettings(S), msg);
  renderAll();
  return ok;
}
$("#c-list").addEventListener("change", async (e) => {
  if (!e.target.matches("[data-rename]")) return;
  const i = Number(e.target.closest(".c-row").dataset.i);
  const name = e.target.value.trim();
  if (!name) { e.target.value = S.categories[i].name; return; }
  S.categories[i].name = name;
  await saveCats("Category renamed");
});
$("#c-list").addEventListener("click", async (e) => {
  const row = e.target.closest(".c-row");
  if (!row) return;
  const i = Number(row.dataset.i);
  const mv = e.target.closest("[data-cmove]");
  if (mv) {
    const j = i + Number(mv.dataset.cmove);
    [S.categories[i], S.categories[j]] = [S.categories[j], S.categories[i]];
    await saveCats();
    $(`.c-row[data-i="${j}"] [data-cmove="${mv.dataset.cmove}"]:not(:disabled)`)?.focus();
  } else if (e.target.closest("[data-cdel]")) {
    $(".c-del", row).innerHTML = `<span class="confirm">Delete? <button class="mini yes" type="button" data-cdel-yes>Delete</button><button class="mini" type="button" data-cdel-no>Keep</button></span>`;
  } else if (e.target.closest("[data-cdel-no]")) renderCategories();
  else if (e.target.closest("[data-cdel-yes]")) {
    const name = S.categories[i].name;
    S.categories.splice(i, 1);
    await saveCats(`Deleted ${name}`);
  }
});
$("#c-add").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#c-new").value.trim();
  if (!name) { $("#c-new").focus(); return; }
  let id = slug(name), k = 2;
  while (S.categories.some((c) => c.id === id)) id = `${slug(name)}-${k++}`;
  S.categories.push({ id, name });
  if (await saveCats(`Added ${name}`)) $("#c-new").value = "";
});

/* ───────────── settings forms ───────────── */
const lines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
const num = (id, min = 0) => Math.max(min, Math.round(Number($(id).value) || 0));

function fillOrders() {
  const d = S.delivery;
  $("#s-accepting").checked = S.acceptingOrders !== false;
  $("#s-paused").value = S.pausedMessage || "";
  $("#s-announce").value = S.announcement || "";
  $("#s-eggless").checked = Boolean(S.allEggless);
  $("#s-lead").value = d.leadDays ?? 1;
  $("#s-min").value = d.minOrder ?? 0;
  $("#s-pickup").checked = d.pickup !== false;
  $("#s-pickup-where").value = d.pickupWhere || "";
  $("#s-pickup-note").value = d.pickupNote || "";
  $("#s-deliver").checked = d.deliver !== false;
  $("#s-radius").value = d.radiusKm ?? 1;
  $("#s-base").value = d.base || "";
  showBase();
  $$('input[name="s-mode"]').forEach((r) => (r.checked = r.value === (d.mode || "free")));
  $("#s-fee").value = d.flatFee ?? 0;
  $("#s-free").value = d.freeAbove ?? 0;
  $("#s-slots").value = (d.slots || []).join("\n");
  $("#s-note").value = d.note || "";
  $("#s-pins").value = (d.extraPincodes || []).join(", ");
  $("#flat-fields").hidden = (d.mode || "free") !== "flat";
}

function showBase() {
  const raw = $("#s-base").value.trim(), hint = $("#s-base-hint");
  const at = parseLatLng(raw);
  if (!raw) hint.textContent = "In Google Maps, right-click your kitchen and click the numbers at the top to copy them, then paste here. Leave empty to skip the check.";
  else if (at) hint.innerHTML = `Kitchen at ${at.lat.toFixed(5)}, ${at.lng.toFixed(5)}. <a href="https://www.google.com/maps?q=${at.lat},${at.lng}" target="_blank" rel="noopener">Check it on the map</a>`;
  else hint.textContent = "These aren't coordinates. Paste numbers like 23.0225, 72.5714 (short maps.app.goo.gl links don't contain them).";
}
$("#s-base").addEventListener("input", showBase);

let cakeDraft = null;
function fillCake() {
  cakeDraft = clone(S.custom);
  $("#s-cake-on").checked = cakeDraft.enabled !== false;
  $("#s-occasions").value = (cakeDraft.occasions || []).join("\n");
  $("#s-cake-note").value = cakeDraft.note || "";
  renderFlavourRows();
  renderSizeRows();
}
function renderFlavourRows() {
  $("#fl-list").innerHTML = cakeDraft.flavours.map((f, i) => `<div class="row-edit" data-i="${i}">
    <input type="color" data-f="color" value="${/^#[0-9a-f]{6}$/i.test(f.color) ? f.color : "#b9773f"}" aria-label="Colour of flavour ${i + 1}">
    <input class="grow" data-f="name" value="${esc(f.name)}" placeholder="Flavour name" aria-label="Flavour ${i + 1} name" maxlength="40">
    <span class="unit">₹/kg</span><input class="num" data-f="perKg" type="number" min="0" step="10" value="${hasPrice(f.perKg) ? Number(f.perKg) : ""}" placeholder="optional" aria-label="Flavour ${i + 1} price per kg">
    <button class="mini" type="button" data-up ${i === 0 ? "disabled" : ""} aria-label="Move flavour up">↑</button>
    <button class="mini danger" type="button" data-rm aria-label="Remove flavour ${i + 1}">Remove</button>
  </div>`).join("");
}
function renderSizeRows() {
  $("#sz-list").innerHTML = cakeDraft.sizes.map((s, i) => `<div class="row-edit" data-i="${i}">
    <input class="grow" data-f="label" value="${esc(s.label)}" placeholder="Label, e.g. 1 kg" aria-label="Size ${i + 1} label" maxlength="30">
    <input class="num" data-f="kg" type="number" min="0.25" step="0.25" value="${Number(s.kg) || ""}" aria-label="Size ${i + 1} weight in kg"><span class="unit">kg</span>
    <button class="mini" type="button" data-up ${i === 0 ? "disabled" : ""} aria-label="Move size up">↑</button>
    <button class="mini danger" type="button" data-rm aria-label="Remove size ${i + 1}">Remove</button>
  </div>`).join("");
}
const readFlavours = () => $$("#fl-list .row-edit").map((r) => ({
  name: $('[data-f="name"]', r).value.trim(), color: $('[data-f="color"]', r).value,
  perKg: $('[data-f="perKg"]', r).value.trim() === "" ? null : Math.round(Number($('[data-f="perKg"]', r).value)),
}));
const readSizes = () => $$("#sz-list .row-edit").map((r) => ({ label: $('[data-f="label"]', r).value.trim(), kg: Number($('[data-f="kg"]', r).value) || 0 }));

function rowsHandler(listSel, key, read, render) {
  $(listSel).addEventListener("click", (e) => {
    const r = e.target.closest(".row-edit");
    if (!r) return;
    cakeDraft[key] = read();
    const i = Number(r.dataset.i);
    if (e.target.closest("[data-rm]")) cakeDraft[key].splice(i, 1);
    else if (e.target.closest("[data-up]") && i > 0) [cakeDraft[key][i - 1], cakeDraft[key][i]] = [cakeDraft[key][i], cakeDraft[key][i - 1]];
    else return;
    render();
    markDirty($("#f-cake"));
  });
}
rowsHandler("#fl-list", "flavours", readFlavours, renderFlavourRows);
rowsHandler("#sz-list", "sizes", readSizes, renderSizeRows);
$("#fl-add").addEventListener("click", () => { cakeDraft.flavours = readFlavours(); cakeDraft.flavours.push({ name: "", color: "#e7a3b0", perKg: null }); renderFlavourRows(); markDirty($("#f-cake")); $$("#fl-list .row-edit").at(-1).querySelector('[data-f="name"]').focus(); });
$("#sz-add").addEventListener("click", () => { cakeDraft.sizes = readSizes(); cakeDraft.sizes.push({ label: "", kg: 1 }); renderSizeRows(); markDirty($("#f-cake")); $$("#sz-list .row-edit").at(-1).querySelector('[data-f="label"]').focus(); });

function fillShop() {
  $("#s-name").value = S.shopName || "";
  $("#s-wa").value = S.whatsapp || "";
  $("#s-phone").value = S.phoneDisplay || "";
  $("#s-insta").value = S.instagram || "";
}

function markDirty(form, on = true) { const d = $(".dirty", form); if (d) d.hidden = !on; }
for (const id of ["#f-orders", "#f-cake", "#f-shop"]) {
  $(id).addEventListener("input", () => markDirty($(id)));
  $(id).addEventListener("change", () => markDirty($(id)));
}
$$('input[name="s-mode"]').forEach((r) => r.addEventListener("change", () => ($("#flat-fields").hidden = $('input[name="s-mode"]:checked').value !== "flat")));

$("#f-orders").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tokens = $("#s-pins").value.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  const pins = [...new Set(tokens.filter((x) => /^\d{6}$/.test(x)))];
  const bad = tokens.filter((x) => !/^\d{6}$/.test(x));
  const next = clone(S);
  Object.assign(next, {
    acceptingOrders: $("#s-accepting").checked,
    pausedMessage: $("#s-paused").value.trim() || DEFAULT_SETTINGS.pausedMessage,
    announcement: $("#s-announce").value.trim(),
    allEggless: $("#s-eggless").checked,
  });
  const baseRaw = $("#s-base").value.trim(), at = parseLatLng(baseRaw);
  if (baseRaw && !at) { toast("Kitchen location must be coordinates like 23.0225, 72.5714.", "err"); $("#s-base").focus(); return; }
  if (!$("#s-pickup").checked && !$("#s-deliver").checked) { toast("Turn on pickup, delivery, or both.", "err"); return; }
  Object.assign(next.delivery, {
    pickup: $("#s-pickup").checked,
    pickupWhere: $("#s-pickup-where").value.trim() || DEFAULT_SETTINGS.delivery.pickupWhere,
    pickupNote: $("#s-pickup-note").value.trim(),
    deliver: $("#s-deliver").checked,
    radiusKm: Math.min(30, Math.max(0.2, Math.round((Number($("#s-radius").value) || 1) * 10) / 10)),
    base: at ? `${at.lat.toFixed(6)}, ${at.lng.toFixed(6)}` : "",
    leadDays: Math.min(30, num("#s-lead")), minOrder: num("#s-min"),
    mode: $('input[name="s-mode"]:checked')?.value || "free",
    flatFee: num("#s-fee"), freeAbove: num("#s-free"),
    slots: lines($("#s-slots").value), note: $("#s-note").value.trim(), extraPincodes: pins,
  });
  if (await run(() => admin.saveSettings(next), bad.length ? `Saved. Ignored ${bad.join(", ")} (not 6-digit pincodes).` : "Pickup and delivery settings saved")) {
    S = next; fillOrders(); markDirty($("#f-orders"), false);
  }
});

$("#f-cake").addEventListener("submit", async (e) => {
  e.preventDefault();
  const flavours = readFlavours().filter((f) => f.name);
  const sizes = readSizes().filter((s) => s.label && s.kg > 0);
  const occasions = lines($("#s-occasions").value);
  if (!flavours.length || !sizes.length || !occasions.length) {
    toast("Keep at least one flavour, one size (with its weight) and one occasion.", "err");
    return;
  }
  const next = clone(S);
  next.custom = { ...next.custom, enabled: $("#s-cake-on").checked, flavours, sizes, occasions, note: $("#s-cake-note").value.trim() };
  if (await run(() => admin.saveSettings(next), "Cake designer saved")) { S = next; fillCake(); markDirty($("#f-cake"), false); renderProducts(); }
});

$("#f-shop").addEventListener("submit", async (e) => {
  e.preventDefault();
  let wa = $("#s-wa").value.replace(/\D/g, "");
  if (wa.length === 10) wa = "91" + wa;
  if (wa.length < 11 || wa.length > 15) { toast("Enter the WhatsApp number with country code, e.g. 918460282977.", "err"); $("#s-wa").focus(); return; }
  const next = clone(S);
  Object.assign(next, {
    shopName: $("#s-name").value.trim() || DEFAULT_SETTINGS.shopName,
    whatsapp: wa,
    phoneDisplay: $("#s-phone").value.trim() || "+" + wa,
    instagram: $("#s-insta").value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[@/]/g, ""),
  });
  if (await run(() => admin.saveSettings(next), "Shop details saved")) { S = next; fillShop(); markDirty($("#f-shop"), false); }
});

/* ───────────── backup ───────────── */
const backupJSON = () => JSON.stringify({ app: "the-pastry-palette", version: 1, exportedAt: new Date().toISOString(), settings: S, products: P }, null, 2);

$("#bk-download").addEventListener("click", () => {
  const blob = new Blob([backupJSON()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pastry-palette-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast("Backup downloaded");
});
$("#bk-copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(backupJSON()); toast("Backup copied. Paste it into a .json file to keep it."); }
  catch (e) { toast("Copying isn't allowed here. Use Download backup instead.", "err"); }
});

let pendingRestore = null;
$("#bk-file").addEventListener("change", async () => {
  const f = $("#bk-file").files[0];
  const box = $("#bk-preview");
  pendingRestore = null;
  if (!f) { box.innerHTML = ""; return; }
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.products) || typeof data.settings !== "object") throw new Error("not a backup");
    data.products.forEach((p) => { if (!p.id || !p.name) throw new Error("bad product"); });
    pendingRestore = data;
    const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString("en-IN") : "an unknown date";
    box.innerHTML = `<p>Backup from <b>${esc(when)}</b>: ${data.products.length} products, ${(data.settings.categories || []).length} categories.</p>
      <div class="btn-row"><button class="btn primary" type="button" id="bk-restore">Replace current shop with this backup</button></div>`;
  } catch (e) {
    box.innerHTML = `<p class="form-err">This file isn't a Pastry Palette backup.</p>`;
  }
});
$("#bk-preview").addEventListener("click", async (e) => {
  if (e.target.id !== "bk-restore" || !pendingRestore) return;
  e.target.disabled = true; e.target.textContent = "Restoring…";
  if (await run(() => admin.replaceAll(pendingRestore), "Backup restored")) { pendingRestore = null; $("#bk-file").value = ""; $("#bk-preview").innerHTML = ""; await loadAll(); }
  else { e.target.disabled = false; e.target.textContent = "Replace current shop with this backup"; }
});

async function loadStarter() {
  if (await run(() => admin.replaceAll({ settings: clone(DEFAULT_SETTINGS), products: clone(STARTER_PRODUCTS) }), "Starter menu loaded")) await loadAll();
}
$("#reset-zone").addEventListener("click", async (e) => {
  const zone = $("#reset-zone");
  if (e.target.id === "reset-btn") {
    zone.innerHTML = `<span class="confirm">This replaces every product and setting. Continue? <button class="mini yes" type="button" id="reset-yes">Replace everything</button><button class="mini" type="button" id="reset-no">Cancel</button></span>`;
    $("#reset-no").focus();
  } else if (e.target.id === "reset-no") zone.innerHTML = `<button class="btn ghost danger" type="button" id="reset-btn">Replace with starter menu</button>`;
  else if (e.target.id === "reset-yes") { await loadStarter(); zone.innerHTML = `<button class="btn ghost danger" type="button" id="reset-btn">Replace with starter menu</button>`; }
});
$("#seed-btn").addEventListener("click", async (e) => { e.target.disabled = true; await loadStarter(); e.target.disabled = false; });

/* ───────────── render ───────────── */
function renderAll(force = false) {
  S = mergeSettings(S);
  renderProducts();
  renderCategories();
  // Refill a settings form only when it has no unsaved edits.
  const forms = [["#f-orders", fillOrders], ["#f-cake", fillCake], ["#f-shop", fillShop]];
  for (const [id, fill] of forms) {
    if (force || $(".dirty", $(id)).hidden) { fill(); markDirty($(id), false); }
  }
}

const lastTab = store.get(TAB_KEY);
if (lastTab && $("#" + lastTab)) selectTab($("#" + lastTab));
boot();
