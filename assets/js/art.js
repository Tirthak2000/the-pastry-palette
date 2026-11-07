// Hand-drawn style SVG illustrations, used when a product has no photo yet,
// plus the painter's-palette hero and the cake in the cake designer.
// Background, plate and shadow colours come from CSS tokens so they follow light/dark mode.

import { shade, rng, luminance, esc } from "./util.js";

export const ART_TYPES = [
  ["cake", "Cake"],
  ["cheesecake", "Cheesecake"],
  ["cupcakes", "Cupcakes"],
  ["jars", "Dessert jars"],
  ["tiramisu", "Tiramisu tray"],
  ["brownies", "Brownies"],
  ["cookies", "Cookies"],
  ["bread", "Sourdough loaf"],
  ["pav", "Pav"],
  ["hamper", "Hamper box"],
];

const n = (v) => Math.round(v * 10) / 10;

function frame(tint, body) {
  return `<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
<rect width="400" height="300" fill="var(--art-bg)"/>
<circle cx="338" cy="34" r="118" fill="${tint}" opacity=".16"/>
<circle cx="34" cy="296" r="72" fill="${tint}" opacity=".1"/>
${body}</svg>`;
}

function plate(cx, cy, r) {
  return `<circle cx="${cx + 6}" cy="${cy + 9}" r="${r}" fill="var(--art-shadow)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--plate)"/>
<circle cx="${cx}" cy="${cy}" r="${r - 11}" fill="none" stroke="var(--plate-rim)" stroke-width="2"/>`;
}

function wedge(cx, cy, r, a1, a2) {
  const p = (a) => [n(cx + r * Math.cos((a * Math.PI) / 180)), n(cy + r * Math.sin((a * Math.PI) / 180))];
  const [x1, y1] = p(a1), [x2, y2] = p(a2);
  return `M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}Z`;
}

const bead = (x, y, r, c) =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="${c}"/><circle cx="${n(x - r * 0.35)}" cy="${n(y - r * 0.35)}" r="${n(r * 0.32)}" fill="#fff" opacity=".55"/>`;

const SPRINKLES = ["#f5c542", "#8cc7e8", "#f28aa0", "#ffffff", "#a8d08d"];

const DRAW = {
  cake(t, R, top) {
    const cx = 200, cy = 150;
    let s = plate(cx, cy, 124);
    s += `<circle cx="${cx}" cy="${cy}" r="94" fill="${shade(t, -0.1)}"/><circle cx="${cx}" cy="${cy}" r="88" fill="${t}"/><circle cx="${cx}" cy="${cy}" r="62" fill="${shade(t, 0.07)}"/>`;
    const pipe = luminance(t) > 0.72 ? shade(t, -0.12) : shade(t, 0.3);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const x = cx + 76 * Math.cos(a), y = cy + 76 * Math.sin(a);
      s += `<circle cx="${n(x)}" cy="${n(y)}" r="10.5" fill="${pipe}"/><circle cx="${n(x)}" cy="${n(y)}" r="5" fill="${shade(pipe, 0.25)}"/>`;
    }
    const c1 = top || "#d7a748", c2 = top ? shade(top, 0.25) : shade(t, -0.45);
    for (let i = 0; i < 7; i++) {
      const a = R() * Math.PI * 2, d = 6 + R() * 30;
      s += bead(cx + d * Math.cos(a), cy + d * Math.sin(a), 7 + R() * 4, i % 2 ? c2 : c1);
    }
    return s;
  },

  cheesecake(t, R) {
    const cx = 186, cy = 150, crust = "#c99158";
    let s = plate(cx, cy, 120);
    s += `<circle cx="${cx}" cy="${cy}" r="92" fill="${crust}"/><circle cx="${cx}" cy="${cy}" r="83" fill="${t}"/>`;
    const blobs = (ox, oy, k) => {
      let b = "";
      for (let i = 0; i < k; i++) {
        const a = R() * Math.PI * 2, d = R() * 60;
        b += `<ellipse cx="${n(ox + d * Math.cos(a))}" cy="${n(oy + d * Math.sin(a))}" rx="${n(5 + R() * 6)}" ry="${n(4 + R() * 4)}" fill="${shade(t, -0.25)}" opacity=".8"/>`;
      }
      return b;
    };
    s += blobs(cx - 20, cy, 9);
    s += `<path d="${wedge(cx, cy, 95, -26, 26)}" fill="var(--plate)"/>`;
    s += `<g transform="translate(40 6)"><path d="${wedge(cx, cy, 92, -24, 24)}" fill="${crust}"/><path d="${wedge(cx, cy, 83, -24, 24)}" fill="${t}"/>`;
    s += `<ellipse cx="${cx + 52}" cy="${cy - 4}" rx="7" ry="5" fill="${shade(t, -0.25)}"/><ellipse cx="${cx + 66}" cy="${cy + 12}" rx="6" ry="4" fill="${shade(t, -0.25)}"/></g>`;
    return s;
  },

  cupcakes(t, R) {
    let s = `<rect x="76" y="58" width="260" height="196" rx="14" fill="var(--art-shadow)"/><rect x="70" y="50" width="260" height="196" rx="14" fill="#d8b086"/><rect x="82" y="62" width="236" height="172" rx="9" fill="#c99d6e"/>`;
    const tones = [t, shade(t, 0.18), t, shade(t, -0.1), shade(t, 0.1), t];
    let k = 0;
    for (const y of [108, 188]) for (const x of [124, 200, 276]) {
      const c = tones[k++ % tones.length];
      s += `<circle cx="${x}" cy="${y}" r="34" fill="#f4e6d4" stroke="#e3cdb2" stroke-width="2"/>`;
      s += `<circle cx="${x}" cy="${y}" r="28" fill="${c}"/><circle cx="${x}" cy="${y}" r="21" fill="${shade(c, 0.2)}"/><circle cx="${x}" cy="${y}" r="14" fill="${c}"/><circle cx="${x}" cy="${y}" r="7" fill="${shade(c, 0.3)}"/>`;
      for (let i = 0; i < 4; i++) {
        const a = R() * 360, d = 8 + R() * 16, r = (a * Math.PI) / 180;
        s += `<rect x="${n(x + d * Math.cos(r) - 3.5)}" y="${n(y + d * Math.sin(r) - 1.2)}" width="7" height="2.4" rx="1.2" fill="${SPRINKLES[Math.floor(R() * SPRINKLES.length)]}" transform="rotate(${Math.round(a)} ${n(x + d * Math.cos(r))} ${n(y + d * Math.sin(r))})"/>`;
      }
    }
    return s;
  },

  jars(t, R) {
    let s = "";
    const jars = [[128, 168, 54], [226, 116, 50], [292, 204, 46]];
    for (const [x, y, r] of jars) s += `<circle cx="${x + 6}" cy="${y + 8}" r="${r}" fill="var(--art-shadow)"/>`;
    for (const [x, y, r] of jars) {
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#eef2f3" opacity=".9" stroke="#d3dadd" stroke-width="2"/>`;
      s += `<circle cx="${x}" cy="${y}" r="${r - 8}" fill="${t}"/><circle cx="${x}" cy="${y}" r="${r - 24}" fill="${shade(t, 0.3)}"/><circle cx="${x}" cy="${y}" r="${r - 34}" fill="${shade(t, 0.45)}"/>`;
      s += bead(x + 4, y - 4, 6, R() > 0.5 ? "#d7a748" : shade(t, -0.4));
      s += `<path d="M${x - r + 9} ${y - 14} A${r - 9} ${r - 9} 0 0 1 ${x - 10} ${y - r + 9}" stroke="#fff" stroke-width="4" fill="none" opacity=".6" stroke-linecap="round"/>`;
    }
    return s;
  },

  tiramisu(t, R) {
    let s = `<rect x="66" y="56" width="280" height="204" rx="26" fill="var(--art-shadow)"/><rect x="58" y="46" width="280" height="204" rx="26" fill="var(--plate)" stroke="var(--plate-rim)" stroke-width="2"/>`;
    s += `<rect x="78" y="66" width="240" height="164" rx="12" fill="${t}"/>`;
    for (let i = 0; i < 170; i++) {
      s += `<circle cx="${n(80 + R() * 236)}" cy="${n(68 + R() * 160)}" r="${n(0.8 + R() * 1.8)}" fill="${shade(t, R() > 0.5 ? 0.18 : -0.2)}" opacity=".7"/>`;
    }
    s += `<path d="M232 230 V166 Q232 150 248 150 H318 V218 Q318 230 306 230 Z" fill="#f2e2c4"/>`;
    s += `<path d="M232 196 H318 V210 H232 Z" fill="#b27a47" opacity=".85"/>`;
    s += `<g transform="rotate(-28 140 214)"><ellipse cx="96" cy="214" rx="24" ry="15" fill="var(--steel)"/><rect x="116" y="209" width="96" height="10" rx="5" fill="var(--steel)"/><ellipse cx="92" cy="210" rx="11" ry="5" fill="#fff" opacity=".45"/></g>`;
    return s;
  },

  brownies(t, R) {
    let s = `<rect x="70" y="58" width="270" height="200" rx="18" fill="var(--art-shadow)"/><rect x="62" y="48" width="270" height="200" rx="18" fill="#c9965f"/><rect x="74" y="60" width="246" height="176" rx="10" fill="#b98352"/>`;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = 84 + c * 58, y = 70 + r * 54;
      s += `<rect x="${x}" y="${y}" width="52" height="48" rx="6" fill="${t}"/>`;
      s += `<path d="M${x + 8} ${y + 14 + R() * 8} q${n(10 + R() * 8)} ${n(-6 + R() * 6)} ${n(20 + R() * 10)} ${n(R() * 6)}" stroke="${shade(t, 0.22)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
      s += `<path d="M${x + 12} ${y + 34} q${n(8 + R() * 6)} ${n(-4)} ${n(18 + R() * 10)} ${n(-2 + R() * 4)}" stroke="${shade(t, 0.16)}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      if (R() > 0.4) s += `<ellipse cx="${n(x + 14 + R() * 24)}" cy="${n(y + 16 + R() * 16)}" rx="5" ry="3.4" fill="#d8b07a"/>`;
    }
    return s;
  },

  cookies(t, R) {
    const list = [[132, 112, 50], [258, 96, 42], [304, 196, 46], [182, 206, 52], [70, 210, 30], [356, 70, 24]];
    let s = "";
    for (const [x, y, r] of list) s += `<circle cx="${x + 5}" cy="${y + 8}" r="${r}" fill="var(--art-shadow)"/>`;
    for (const [x, y, r] of list) {
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${shade(t, -0.08)}"/><circle cx="${x}" cy="${y}" r="${r - 5}" fill="${t}"/>`;
      for (let i = 0; i < Math.round(r / 6); i++) {
        const a = R() * Math.PI * 2, d = R() * (r - 12);
        s += `<path d="M${n(x + d * Math.cos(a))} ${n(y + d * Math.sin(a))} l4 -3 l4 3 l-1.5 4 h-5 z" fill="#3e2318"/>`;
      }
      s += `<path d="M${x - r * 0.4} ${n(y + r * 0.2)} q${n(r * 0.2)} ${n(-r * 0.1)} ${n(r * 0.4)} 0" stroke="${shade(t, -0.22)}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }
    return s;
  },

  bread(t, R) {
    let s = `<ellipse cx="208" cy="162" rx="132" ry="90" fill="var(--art-shadow)"/>`;
    s += `<ellipse cx="200" cy="150" rx="132" ry="90" fill="${shade(t, -0.18)}"/><ellipse cx="200" cy="148" rx="122" ry="81" fill="${t}"/>`;
    s += `<ellipse cx="196" cy="140" rx="92" ry="54" fill="#fff" opacity=".16"/>`;
    for (let i = 0; i < 60; i++) s += `<circle cx="${n(110 + R() * 180)}" cy="${n(96 + R() * 110)}" r="${n(0.8 + R() * 1.6)}" fill="#fff" opacity=".5"/>`;
    s += `<path d="M112 128 Q200 84 292 124" stroke="${shade(t, -0.3)}" stroke-width="8" fill="none" stroke-linecap="round" opacity=".55" transform="translate(0 7)"/>`;
    s += `<path d="M112 128 Q200 84 292 124" stroke="#f3dfba" stroke-width="12" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M136 178 l14 -10 M168 188 l14 -10 M200 192 l14 -10 M232 188 l14 -10" stroke="#f3dfba" stroke-width="5" stroke-linecap="round" opacity=".8"/>`;
    return s;
  },

  pav(t) {
    let s = `<rect x="64" y="64" width="284" height="186" rx="16" fill="var(--art-shadow)"/><rect x="56" y="54" width="284" height="186" rx="16" fill="var(--steel)"/>`;
    s += `<rect x="72" y="70" width="252" height="154" rx="10" fill="${shade(t, -0.3)}"/>`;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = 74 + c * 62.5, y = 72 + r * 50;
      s += `<rect x="${n(x)}" y="${y}" width="60" height="48" rx="17" fill="${t}"/><ellipse cx="${n(x + 24)}" cy="${y + 18}" rx="17" ry="11" fill="${shade(t, 0.22)}" opacity=".85"/>`;
    }
    return s;
  },

  hamper(t) {
    const ribbon = luminance(t) > 0.62 ? "#b4365a" : "#f4e4c8";
    let s = `<rect x="88" y="66" width="240" height="190" rx="14" fill="var(--art-shadow)"/><rect x="80" y="56" width="240" height="190" rx="14" fill="${t}"/>`;
    s += `<rect x="92" y="68" width="216" height="166" rx="8" fill="none" stroke="${shade(t, -0.18)}" stroke-width="2"/>`;
    s += `<rect x="188" y="56" width="24" height="190" fill="${ribbon}"/><rect x="80" y="139" width="240" height="24" fill="${ribbon}"/>`;
    s += `<ellipse cx="174" cy="140" rx="34" ry="17" fill="${ribbon}" stroke="${shade(ribbon, -0.2)}" stroke-width="2" transform="rotate(-30 174 140)"/>`;
    s += `<ellipse cx="226" cy="140" rx="34" ry="17" fill="${ribbon}" stroke="${shade(ribbon, -0.2)}" stroke-width="2" transform="rotate(30 226 140)"/>`;
    s += `<path d="M196 158 l-16 40 l12 -4 l6 10 z M204 158 l16 40 l-12 -4 l-6 10 z" fill="${shade(ribbon, -0.08)}"/>`;
    s += `<circle cx="200" cy="150" r="12" fill="${shade(ribbon, -0.1)}"/>`;
    s += `<g transform="rotate(12 268 214)"><rect x="244" y="196" width="50" height="32" rx="6" fill="#fff8ee" stroke="${shade(t, -0.2)}" stroke-width="1.5"/><circle cx="252" cy="212" r="3" fill="${shade(t, -0.2)}"/></g>`;
    return s;
  },
};

export function artSVG(type, tint, seed, top) {
  const t = tint || "#b9773f";
  const draw = DRAW[type] || DRAW.cake;
  return frame(t, draw(t, rng(seed || type), top));
}

/* ───────────── hero: the painter's palette, loaded with frosting ───────────── */

const PALETTE_PATH =
  "M146 52 C 250 6 418 18 488 104 C 548 178 528 286 446 336 C 364 384 236 378 176 338 C 146 318 148 290 172 278 C 204 262 214 232 188 218 C 158 202 120 236 92 220 C 30 186 40 100 146 52 Z M106 150 a 24 24 0 1 0 48 0 a 24 24 0 1 0 -48 0 Z";

const DOLLOP_SPOTS = [[232, 92], [326, 68], [418, 104], [470, 186], [446, 270], [370, 322], [278, 330], [214, 278]];

function rosette(x, y, c, r = 30) {
  let s = `<circle cx="${x + 4}" cy="${y + 6}" r="${r + 2}" fill="var(--art-shadow)"/>`;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    s += `<circle cx="${n(x + (r - 8) * Math.cos(a))}" cy="${n(y + (r - 8) * Math.sin(a))}" r="10" fill="${c}"/>`;
  }
  s += `<circle cx="${x}" cy="${y}" r="${r - 6}" fill="${c}"/>`;
  s += `<path d="M${x} ${y} m-16 0 a16 16 0 0 1 16 -16 a12 12 0 0 1 12 12 a8 8 0 0 1 -8 8 a4 4 0 0 1 -4 -4" fill="none" stroke="${shade(c, luminance(c) > 0.7 ? -0.14 : 0.24)}" stroke-width="3.2" stroke-linecap="round"/>`;
  s += `<ellipse cx="${x - 9}" cy="${y - 11}" rx="6" ry="3.5" fill="#fff" opacity=".5" transform="rotate(-30 ${x - 9} ${y - 11})"/>`;
  return s;
}

export function paletteSVG(flavours) {
  const list = (flavours || []).slice(0, DOLLOP_SPOTS.length);
  let grain = "";
  for (let i = 0; i < 7; i++) {
    const y = 80 + i * 40;
    grain += `<path d="M${60 + i * 6} ${y} C 200 ${y - 30} 330 ${y + 30} ${520 - i * 8} ${y - 10}" stroke="var(--wood-grain)" stroke-width="2" fill="none" opacity=".55"/>`;
  }
  let dollops = "";
  list.forEach((f, i) => {
    const [x, y] = DOLLOP_SPOTS[i];
    dollops += `<g class="dollop" data-i="${i}" tabindex="0" role="button" aria-label="${esc(f.name)}: design a cake in this flavour" style="--d:${i * 70}ms;transform-origin:${x}px ${y}px">${rosette(x, y, f.color || "#b9773f")}</g>`;
  });
  const smear = list[1]?.color || "#b9773f";
  return `<svg class="palette-svg" viewBox="0 0 560 400" role="group" aria-label="Flavour palette">
<defs><clipPath id="pal-clip"><path d="${PALETTE_PATH}" clip-rule="evenodd"/></clipPath></defs>
<path d="${PALETTE_PATH}" fill="var(--art-shadow)" fill-rule="evenodd" transform="translate(8 12)"/>
<path d="${PALETTE_PATH}" fill="var(--wood)" fill-rule="evenodd"/>
<g clip-path="url(#pal-clip)">${grain}</g>
<path d="${PALETTE_PATH}" fill="none" stroke="var(--wood-edge)" stroke-width="3" fill-rule="evenodd"/>
<g transform="translate(336 206) rotate(-26)">
  <rect x="-96" y="-10" width="52" height="20" rx="10" fill="#6b4330"/>
  <rect x="-48" y="-7" width="16" height="14" rx="2" fill="#c7cbd0"/>
  <path d="M-34 -5 L58 -14 Q82 -14 82 0 Q82 14 58 14 L-34 5 Z" fill="var(--steel)" stroke="var(--steel-edge)" stroke-width="1.5"/>
  <ellipse cx="60" cy="1" rx="18" ry="9" fill="${smear}"/>
</g>
${dollops}
</svg>`;
}

/* ───────────── cake designer: side view, up to three tiers ───────────── */

const TIERS = [
  { x: 64, w: 232, top: 196, bottom: 286 }, // bottom tier
  { x: 100, w: 160, top: 128, bottom: 196 },
  { x: 128, w: 104, top: 72, bottom: 128 },
];

function tier(t, i) {
  const { x, w, top, bottom } = t;
  const rx = w / 2, ry = Math.max(10, w * 0.075), cx = x + rx;
  const body = `M${x} ${top} V${bottom} A${rx} ${ry} 0 0 0 ${x + w} ${bottom} V${top} Z`;
  let drips = "";
  const k = Math.round(w / 22);
  for (let j = 0; j < k; j++) {
    const dx = x + 6 + (j * (w - 12)) / (k - 1);
    const len = 14 + ((j * 37 + i * 13) % 26);
    drips += `<rect x="${n(dx - 7)}" y="${top}" width="14" height="${len}" rx="7"/>`;
  }
  let pearls = "";
  const pk = Math.round(w / 15);
  for (let j = 0; j < pk; j++) {
    const a = Math.PI - (j / (pk - 1)) * Math.PI;
    pearls += `<circle cx="${n(cx + (rx - 4) * Math.cos(a))}" cy="${n(bottom + ry * Math.sin(a) - 4)}" r="4.6"/>`;
  }
  return `<g class="tier tier-${i}">
  <clipPath id="tier-clip-${i}"><path d="${body}"/></clipPath>
  <path class="c-coat" d="${body}"/>
  <g clip-path="url(#tier-clip-${i})"><rect class="c-drip" x="${x}" y="${top - 2}" width="${w}" height="10"/><g class="c-drip">${drips}</g><rect class="c-sheen" x="${x + 14}" y="${top + 10}" width="10" height="${bottom - top - 8}" rx="5"/></g>
  <ellipse class="c-top" cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}"/>
  <g class="c-pearl">${pearls}</g>
</g>`;
}

export function cakeSVG() {
  return `<svg class="cake-svg" viewBox="${CAKE_VIEWS[0].join(" ")}" role="img" aria-labelledby="cake-svg-title">
<title id="cake-svg-title">Preview of your cake</title>
<ellipse cx="185" cy="303" rx="132" ry="18" fill="var(--art-shadow)"/>
<ellipse cx="180" cy="296" rx="132" ry="18" fill="var(--wood-edge)"/>
<ellipse cx="180" cy="290" rx="132" ry="18" fill="var(--wood)"/>
<g class="cake-stack">${TIERS.map(tier).join("")}
  <g class="topper"><rect x="176.5" y="20" width="3" height="60" rx="1.5" fill="#c9a24a"/>
    <rect class="plaque" x="110" y="6" width="140" height="34" rx="17"/>
    <text class="plaque-text" x="180" y="29" text-anchor="middle"></text></g>
</g>
</svg>`;
}

export const TIER_TOPS = TIERS.map((t) => t.top);

// The camera zooms in on the cake: one view per tier count (x, y, width, height; same aspect ratio).
export const CAKE_VIEWS = [
  [45, 76, 270, 248],
  [24, 38, 312, 286],
  [0, -6, 360, 330],
];
