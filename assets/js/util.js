// Small helpers shared by the shop page and the admin panel.

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

export const hasPrice = (p) => p !== null && p !== undefined && p !== "" && !isNaN(Number(p)) && Number(p) > 0;

export const clone = (o) => JSON.parse(JSON.stringify(o));

export const slug = (s) =>
  String(s || "item").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";

export const uid = (name) => slug(name) + "-" + Math.random().toString(36).slice(2, 6);

// Mix a hex colour toward white (amt > 0) or black (amt < 0).
export function shade(hex, amt) {
  let h = String(hex || "#b9773f").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (isNaN(n)) return hex;
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function luminance(hex) {
  let h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (isNaN(n)) return 0.5;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

// Repeatable pseudo-random numbers, so a product's illustration looks the same on every visit.
export function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const store = {
  get(k, fallback = null) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

export function debounce(fn, ms = 400) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Ahmedabad delivery check: every 380xxx pincode, plus the extra pincodes listed in settings.
export function pincodeStatus(pin, delivery) {
  const p = String(pin || "").replace(/\D/g, "");
  if (p.length !== 6) return "invalid";
  if (p.startsWith("380")) return "ok";
  const extra = (delivery?.extraPincodes || []).map((x) => String(x).trim());
  return extra.includes(p) ? "ok" : "outside";
}

// Coordinates from "23.0225, 72.5714" or a Google Maps link that contains them
// (…/@23.02,72.57,17z · ?q=23.02,72.57 · !3d23.02!4d72.57). Short maps.app.goo.gl links don't.
export function parseLatLng(text) {
  const s = String(text || "");
  const m =
    s.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/) ||
    s.match(/@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/) ||
    s.match(/[?&](?:q|query|ll|destination|center)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i) ||
    s.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

// Straight-line distance in km between two { lat, lng } points.
export function distanceKm(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Local date helpers (yyyy-mm-dd in the visitor's own time zone).
export function isoDate(d) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function addDays(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + Number(n || 0));
  return d;
}
export function niceDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
