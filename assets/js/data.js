// Data layer.
// Live mode (Firebase config filled in): the shop reads Firestore through its public REST API
// (fast, no SDK download); the admin panel uses the Firebase SDK with a login.
// Demo mode (config empty): everything lives in this browser's localStorage.

import { firebaseConfig, adminEmailDomain, firebaseSdkVersion } from "./config.js";
import { DEFAULT_SETTINGS, STARTER_PRODUCTS } from "./seed.js";
import { clone } from "./util.js";

export const isLive = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const DEMO_KEY = "tpp-demo-v1";

// Settings from the database are laid over the defaults, so fields added later always exist.
export function mergeSettings(saved) {
  const merge = (base, over) => {
    if (over === undefined || over === null) return clone(base);
    if (Array.isArray(base) || typeof base !== "object" || base === null) return clone(over);
    const out = clone(base);
    for (const k of Object.keys(over)) out[k] = k in base ? merge(base[k], over[k]) : clone(over[k]);
    return out;
  };
  return merge(DEFAULT_SETTINGS, saved || {});
}

export const sortProducts = (list) =>
  [...list].sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999) || String(a.name).localeCompare(String(b.name)));

/* ───────────── demo storage ───────────── */
let mem = null;
let demoWarned = false;
function demoLoad() {
  if (!mem) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(DEMO_KEY) || "null"); } catch (e) {}
    mem = saved && saved.products
      ? { settings: mergeSettings(saved.settings), products: saved.products }
      : { settings: mergeSettings({}), products: clone(STARTER_PRODUCTS) };
  }
  return { settings: clone(mem.settings), products: sortProducts(clone(mem.products)) };
}
function demoPersist() {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(mem));
    return { ok: true };
  } catch (e) {
    const first = !demoWarned;
    demoWarned = true;
    return { ok: false, warn: first ? "This browser couldn't store the change (storage is full or blocked). It lasts until you close the page." : "" };
  }
}
// Drop the in-memory copy so the next load re-reads localStorage (used when another tab saved).
export function demoForget() {
  mem = null;
}
export function demoReset() {
  mem = null;
  try { localStorage.removeItem(DEMO_KEY); } catch (e) {}
}

/* ───────────── public read (shop page) ───────────── */
const restBase = () =>
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/(default)/documents`;

function decodeValue(v) {
  if (!v || typeof v !== "object") return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
function decodeFields(fields) {
  const o = {};
  for (const k of Object.keys(fields)) o[k] = decodeValue(fields[k]);
  return o;
}
async function restGet(path) {
  const r = await fetch(`${restBase()}/${path}?key=${firebaseConfig.apiKey}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Couldn't load ${path} (${r.status})`);
  const j = await r.json();
  return decodeFields(j.fields || {});
}
async function restList(collection) {
  const out = [];
  let token = "";
  do {
    const url = `${restBase()}/${collection}?key=${firebaseConfig.apiKey}&pageSize=300${token ? "&pageToken=" + encodeURIComponent(token) : ""}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Couldn't load the menu (${r.status})`);
    const j = await r.json();
    for (const d of j.documents || []) out.push({ ...decodeFields(d.fields || {}), id: d.name.split("/").pop() });
    token = j.nextPageToken || "";
  } while (token);
  return out;
}

export async function loadShop() {
  if (!isLive) return { ...demoLoad(), live: false };
  const [settings, products] = await Promise.all([restGet("settings/site"), restList("products")]);
  return { settings: mergeSettings(settings), products: sortProducts(products), live: true };
}

/* ───────────── admin (SDK + login in live mode) ───────────── */
let fb = null;
async function firebase() {
  if (fb) return fb;
  const base = `https://www.gstatic.com/firebasejs/${firebaseSdkVersion}`;
  const [appM, fs, au] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-firestore.js`),
    import(`${base}/firebase-auth.js`),
  ]);
  const app = appM.initializeApp(firebaseConfig);
  fb = { fs, au, db: fs.getFirestore(app), auth: au.getAuth(app) };
  return fb;
}

// Firestore rejects `undefined`, and the product id lives in the document name, not a field.
const toDoc = (p) => {
  const o = JSON.parse(JSON.stringify(p));
  delete o.id;
  o.updatedAt = Date.now();
  return o;
};

export const admin = {
  live: isLive,

  async start() {
    if (isLive) await firebase();
  },

  // cb receives: null (signed out) | { email, uid, isAdmin } | { demo: true }
  onAuth(cb) {
    if (!isLive) { cb({ demo: true }); return; }
    fb.au.onAuthStateChanged(fb.auth, async (user) => {
      if (!user) return cb(null);
      let ok = false;
      try { ok = (await fb.fs.getDoc(fb.fs.doc(fb.db, "admins", user.uid))).exists(); } catch (e) { ok = false; }
      cb({ email: user.email, uid: user.uid, isAdmin: ok });
    });
  },

  async signIn(name, password) {
    const n = String(name || "").trim().toLowerCase();
    const email = n.includes("@") ? n : `${n}@${adminEmailDomain}`;
    await fb.au.signInWithEmailAndPassword(fb.auth, email, password);
  },

  async signOut() {
    if (isLive) await fb.au.signOut(fb.auth);
  },

  async load() {
    if (!isLive) return { ...demoLoad(), empty: false };
    const { fs, db } = fb;
    const [s, ps] = await Promise.all([fs.getDoc(fs.doc(db, "settings", "site")), fs.getDocs(fs.collection(db, "products"))]);
    const products = ps.docs.map((d) => ({ ...d.data(), id: d.id }));
    return { settings: mergeSettings(s.exists() ? s.data() : {}), products: sortProducts(products), empty: !s.exists() && products.length === 0 };
  },

  async saveSettings(settings) {
    if (!isLive) { demoLoad(); mem.settings = clone(settings); return demoPersist(); }
    await fb.fs.setDoc(fb.fs.doc(fb.db, "settings", "site"), JSON.parse(JSON.stringify(settings)));
    return { ok: true };
  },

  async saveProduct(p) {
    if (!isLive) {
      demoLoad();
      const i = mem.products.findIndex((x) => x.id === p.id);
      if (i >= 0) mem.products[i] = clone(p); else mem.products.push(clone(p));
      return demoPersist();
    }
    await fb.fs.setDoc(fb.fs.doc(fb.db, "products", p.id), toDoc(p));
    return { ok: true };
  },

  // patches: [{ id, patch: { field: value } }] — small updates such as prices or order.
  async patchProducts(patches) {
    if (!patches.length) return { ok: true };
    if (!isLive) {
      demoLoad();
      for (const { id, patch } of patches) {
        const p = mem.products.find((x) => x.id === id);
        if (p) Object.assign(p, clone(patch));
      }
      return demoPersist();
    }
    const { fs, db } = fb;
    for (let i = 0; i < patches.length; i += 400) {
      const batch = fs.writeBatch(db);
      for (const { id, patch } of patches.slice(i, i + 400)) batch.update(fs.doc(db, "products", id), { ...JSON.parse(JSON.stringify(patch)), updatedAt: Date.now() });
      await batch.commit();
    }
    return { ok: true };
  },

  async deleteProduct(id) {
    if (!isLive) {
      demoLoad();
      mem.products = mem.products.filter((x) => x.id !== id);
      return demoPersist();
    }
    await fb.fs.deleteDoc(fb.fs.doc(fb.db, "products", id));
    return { ok: true };
  },

  // Replace the whole shop (starter menu, or a backup file).
  async replaceAll({ settings, products }) {
    if (!isLive) {
      mem = { settings: mergeSettings(settings), products: clone(products) };
      return demoPersist();
    }
    const { fs, db } = fb;
    const existing = await fs.getDocs(fs.collection(db, "products"));
    const keep = new Set(products.map((p) => p.id));
    const ops = [];
    existing.docs.forEach((d) => { if (!keep.has(d.id)) ops.push((b) => b.delete(d.ref)); });
    products.forEach((p) => ops.push((b) => b.set(fs.doc(db, "products", p.id), toDoc(p))));
    ops.push((b) => b.set(fs.doc(db, "settings", "site"), JSON.parse(JSON.stringify(mergeSettings(settings)))));
    // Small batches keep each request well under Firestore's size limit when products carry photos.
    for (let i = 0; i < ops.length; i += 20) {
      const batch = fs.writeBatch(db);
      ops.slice(i, i + 20).forEach((op) => op(batch));
      await batch.commit();
    }
    return { ok: true };
  },
};

export { DEFAULT_SETTINGS, STARTER_PRODUCTS };
