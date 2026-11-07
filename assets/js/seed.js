// Starter menu and default shop settings, taken from @thepastry_palette on Instagram:
// the "Menu", "Unjunk cookies", "Sourdough" and "Hampers" highlights, and recent posts.
//
// In demo mode the site shows these. With Firebase connected, the admin panel's
// "Load starter menu" button copies them into the database; after that, everything is
// edited from /admin and this file is no longer used for content.
//
// PRICES ARE LEFT EMPTY on purpose ("Price on request" on the site). Fill them in from
// Admin → Products. Sizes such as "500 g / 1 kg" and "Box" are starting points to edit too.
//
// Photos: assets/img/gallery/* are from the bakery's Instagram; assets/img/products/* are
// free Unsplash stand-ins (see README). Items without a photo show the logo on a soft colour.

const AHEAD = "Order 24–48 hours ahead";
const CAKE = [{ label: "500 g", price: null }, { label: "1 kg", price: null }];
const one = (label) => [{ label, price: null }];

export const DEFAULT_SETTINGS = {
  shopName: "The Pastry Palette",
  whatsapp: "918460282977", // country code + number, digits only
  phoneDisplay: "+91 84602 82977",
  instagram: "thepastry_palette",
  announcement: "Baked fresh on order · Please order 24–48 hours ahead",

  acceptingOrders: true,
  pausedMessage: "We're not taking new orders for a few days. Message us on WhatsApp to book a later date.",
  allEggless: false, // shows "100% eggless" at the top of the site instead of per-product badges

  categories: [
    { id: "cakes", name: "Signature cakes" },
    { id: "custom", name: "Custom & theme cakes" },
    { id: "cheesecakes", name: "Cheesecakes" },
    { id: "tubs", name: "Cake tubs" },
    { id: "cupcakes", name: "Cupcakes" },
    { id: "cookies", name: "Cookies" },
    { id: "treats", name: "Brownies & teacakes" },
    { id: "healthy", name: "Healthy treats" },
    { id: "unjunk", name: "Unjunk biscuits" },
    { id: "breads", name: "Breads" },
    { id: "hampers", name: "Hampers" },
  ],

  // From the Instagram menu notes: pickup only, with free delivery within 1 km.
  delivery: {
    pickup: true, // customers can collect from the kitchen
    pickupWhere: "our home kitchen in Ahmedabad", // shown on the site; the exact address is shared on WhatsApp
    pickupNote: "We share the exact pickup location on WhatsApp. Can't come yourself? Book a Porter, Swiggy Genie or Rapido pickup from our place.",
    deliver: true, // nearby delivery
    radiusKm: 1, // delivery only within this distance of the kitchen
    base: "", // kitchen location "lat, lng" for the distance check; empty = we confirm on WhatsApp
    mode: "free", // delivery charge within the radius: "free" · "flat" · "distance" (confirmed on WhatsApp)
    flatFee: 50,
    freeAbove: 0, // 0 = no free-delivery threshold (flat mode)
    minOrder: 0, // 0 = no minimum
    leadDays: 1, // earliest date = today + leadDays
    slots: ["11 am – 2 pm", "2 pm – 5 pm", "5 pm – 8 pm", "8 pm – 10 pm"],
    note: "",
    // Every 380xxx pincode is accepted automatically. Add other Ahmedabad pincodes here.
    extraPincodes: [
      "382330", "382340", "382345", "382346", "382350", "382405", "382415", "382418", "382424",
      "382430", "382440", "382443", "382445", "382449", "382470", "382475", "382480", "382481",
    ],
  },

  custom: {
    enabled: true,
    occasions: ["Birthday", "Anniversary", "Kids' party", "Baby shower", "Retirement", "Bon voyage", "Just because"],
    // The signature cake flavours. Add a price per kg to show customers an estimate.
    flavours: [
      { name: "Nutty chocolate salted caramel", color: "#6b3f2a", perKg: null },
      { name: "Nutella hazelnut", color: "#7a4a2e", perKg: null },
      { name: "Salted caramel", color: "#c98a4b", perKg: null },
      { name: "Lemon curd blueberry", color: "#efe09a", perKg: null },
      { name: "Chocolate mocha", color: "#4a2c20", perKg: null },
      { name: "Vanilla coffee", color: "#dcc39c", perKg: null },
      { name: "Raspberry pistachio", color: "#e8aab5", perKg: null },
      { name: "Orange choco mocha", color: "#b8652f", perKg: null },
      { name: "Chocolate Lotus Biscoff", color: "#b9773f", perKg: null },
    ],
    sizes: [
      { label: "500 g", kg: 0.5 },
      { label: "1 kg", kg: 1 },
      { label: "1.5 kg", kg: 1.5 },
      { label: "2 kg", kg: 2 },
      { label: "3 kg", kg: 3 },
    ],
    note: "All our cakes use pure couverture chocolate and buttercream. Themes, toppers and customisation cost extra; we confirm the price on WhatsApp.",
  },
};

export const STARTER_PRODUCTS = [
  /* ── Signature cakes (Menu highlight) ── */
  {
    id: "nutty-chocolate-salted-caramel", category: "cakes", sort: 10,
    name: "Nutty Chocolate Salted Caramel",
    desc: "Couverture chocolate cake with salted caramel and a roasted-nut crunch.",
    options: CAKE, image: "assets/img/products/chocolate-truffle-cake.jpg", art: "cake", tint: "#6b3f2a", note: AHEAD,
  },
  {
    id: "nutella-hazelnut", category: "cakes", sort: 20,
    name: "Nutella Hazelnut",
    desc: "Chocolate cake filled with Nutella and toasted hazelnuts.",
    options: CAKE, art: "cake", tint: "#7a4a2e", note: AHEAD,
  },
  {
    id: "salted-caramel", category: "cakes", sort: 30,
    name: "Salted Caramel",
    desc: "Buttery salted caramel cake, on a chocolate or a vanilla base.",
    options: [
      { label: "Chocolate · 500 g", price: null }, { label: "Chocolate · 1 kg", price: null },
      { label: "Vanilla · 500 g", price: null }, { label: "Vanilla · 1 kg", price: null },
    ],
    art: "cake", tint: "#c98a4b", note: AHEAD,
  },
  {
    id: "lemon-curd-blueberry", category: "cakes", sort: 40,
    name: "Lemon Curd Blueberry",
    desc: "Fresh lemon sponge with blueberry compote and lemon curd, in silky buttercream.",
    options: CAKE, image: "assets/img/gallery/lemon-blueberry.jpg", art: "cake", tint: "#efe09a", top: "#4b5a9b", note: AHEAD,
  },
  {
    id: "chocolate-mocha", category: "cakes", sort: 50,
    name: "Chocolate Mocha",
    desc: "Dark couverture chocolate with a coffee buttercream.",
    options: CAKE, art: "cake", tint: "#4a2c20", note: AHEAD,
  },
  {
    id: "vanilla-coffee", category: "cakes", sort: 60,
    name: "Vanilla Coffee",
    desc: "Soft vanilla sponge with a gentle coffee buttercream.",
    options: CAKE, art: "cake", tint: "#dcc39c", note: AHEAD,
  },
  {
    id: "raspberry-pistachio", category: "cakes", sort: 70,
    name: "Raspberry Pistachio",
    desc: "Pistachio sponge with fresh raspberry compote, roasted pistachio bites and raspberry buttercream.",
    options: CAKE, image: "assets/img/gallery/number-1.jpg", art: "cake", tint: "#e8aab5", note: AHEAD,
  },
  {
    id: "orange-choco-mocha", category: "cakes", sort: 80,
    name: "Orange Choco Mocha",
    desc: "Chocolate and coffee, brightened with orange.",
    options: CAKE, art: "cake", tint: "#b8652f", note: AHEAD,
  },
  {
    id: "chocolate-lotus-biscoff", category: "cakes", sort: 90,
    name: "Chocolate Lotus Biscoff",
    desc: "Chocolate cake with Lotus Biscoff spread and crumble under a caramel drip.",
    options: CAKE, image: "assets/img/gallery/lotus-biscoff.jpg", art: "cake", tint: "#b9773f", note: AHEAD,
  },
  {
    id: "whipped-caramel-chocolate", category: "cakes", sort: 100,
    name: "Whipped Caramel Chocolate Cake",
    desc: "The viral London cake: soft chocolate cake under clouds of whipped caramel.",
    options: CAKE, image: "assets/img/products/whipped-caramel-cake.jpg", art: "cake", tint: "#cf9a62", note: AHEAD,
  },
  {
    id: "mango-raspberry", category: "cakes", sort: 110, hidden: true,
    name: "Mango Raspberry",
    desc: "Mango and raspberry in light buttercream. Seasonal: turn it on in mango season.",
    options: CAKE, image: "assets/img/gallery/mango-raspberry.jpg", art: "cake", tint: "#f2b84b", note: "Seasonal",
  },

  /* ── Custom & theme cakes (posts) ── */
  {
    id: "custom-theme-cake", category: "custom", sort: 10, kind: "custom",
    name: "Custom Theme Cake",
    desc: "Birthdays, kids' themes, anniversaries, retirements and more, in any flavour from our menu. Themes and toppers cost extra.",
    options: [], image: "assets/img/gallery/rainbow-4.jpg", art: "cake", tint: "#f3d9d5", note: "Order 2–3 days ahead",
  },

  /* ── Cheesecakes (Menu highlight) ── */
  {
    id: "lotus-biscoff-cheesecake", category: "cheesecakes", sort: 10,
    name: "Lotus Biscoff Cheesecake",
    desc: "Creamy cheesecake on a Lotus biscuit base, topped with Biscoff.",
    options: CAKE, image: "assets/img/products/biscoff-cheesecake.jpg", art: "cheesecake", tint: "#c18447", note: AHEAD,
  },
  {
    id: "nutella-cheesecake", category: "cheesecakes", sort: 20,
    name: "Nutella Cheesecake",
    desc: "Smooth cheesecake swirled and topped with Nutella.",
    options: CAKE, art: "cheesecake", tint: "#6f4630", note: AHEAD,
  },
  {
    id: "blueberry-cheesecake", category: "cheesecakes", sort: 30,
    name: "Blueberry Cheesecake",
    desc: "Classic cheesecake under a glossy blueberry compote.",
    options: CAKE, image: "assets/img/products/blueberry-cheesecake.jpg", art: "cheesecake", tint: "#4f4e8f", note: AHEAD,
  },
  {
    id: "mixed-berries-cheesecake", category: "cheesecakes", sort: 40,
    name: "Mixed Berries Cheesecake",
    desc: "Cheesecake topped with a mixed berry compote.",
    options: CAKE, art: "cheesecake", tint: "#9c3550", note: AHEAD,
  },
  {
    id: "mango-cheesecake", category: "cheesecakes", sort: 50,
    name: "Mango Cheesecake",
    desc: "Cheesecake with a fresh mango topping.",
    options: CAKE, art: "cheesecake", tint: "#f2b84b", note: AHEAD,
  },

  /* ── Cake tubs (Menu highlight) ── */
  {
    id: "tub-classic-tiramisu", category: "tubs", sort: 10,
    name: "Classic Tiramisu",
    desc: "Homemade eggless savoiardi soaked in moka-pot coffee, with mascarpone mousse and cocoa.",
    options: one("Tub"), image: "assets/img/gallery/tiramisu.jpg", art: "tiramisu", tint: "#6b4330", eggless: true, note: AHEAD,
  },
  {
    id: "tub-classic-tres-leches", category: "tubs", sort: 20,
    name: "Classic Tres Leches",
    desc: "Sponge soaked in three milks, finished with cream.",
    options: one("Tub"), art: "jars", tint: "#ead9b8", note: AHEAD,
  },
  {
    id: "tub-rasmalai-tres-leches", category: "tubs", sort: 30,
    name: "Rasmalai Tres Leches",
    desc: "Tres leches with saffron, cardamom and pistachio, inspired by rasmalai.",
    options: one("Tub"), art: "jars", tint: "#f0d38a", note: AHEAD,
  },
  {
    id: "tub-mango-tres-leches", category: "tubs", sort: 40, hidden: true,
    name: "Mango Tres Leches",
    desc: "Tres leches with fresh mango. Seasonal: turn it on in mango season.",
    options: one("Tub"), art: "jars", tint: "#f2b84b", note: "Seasonal",
  },
  {
    id: "tub-raspberry-pistachio", category: "tubs", sort: 50,
    name: "Raspberry Pistachio",
    desc: "Pistachio cake, raspberry compote and raspberry buttercream in a tub.",
    options: one("Tub"), image: "assets/img/gallery/tub-raspberry-pistachio.jpg", art: "jars", tint: "#e8aab5", note: AHEAD,
  },
  {
    id: "tub-orange-mocha-chocolate", category: "tubs", sort: 60,
    name: "Orange Mocha Chocolate",
    desc: "Chocolate cake with a mocha ganache swirl and candied orange.",
    options: one("Tub"), image: "assets/img/gallery/tub-orange-mocha.jpg", art: "jars", tint: "#4a2c20", note: AHEAD,
  },
  {
    id: "tub-lotus-biscoff", category: "tubs", sort: 70,
    name: "Lotus Biscoff",
    desc: "Biscoff cake, Biscoff cream and crumble in a tub.",
    options: one("Tub"), art: "jars", tint: "#b9773f", note: AHEAD,
  },

  /* ── Cupcakes (Menu highlight) ── */
  {
    id: "cupcakes", category: "cupcakes", sort: 10,
    name: "Cupcakes",
    desc: "Choose any flavours from our cake menu and tell us in the order notes. The price depends on the flavours.",
    options: [{ label: "Box of 6", price: null }, { label: "Box of 12", price: null }],
    image: "assets/img/products/cupcakes.jpg", art: "cupcakes", tint: "#e7a3b0", note: "Minimum 6 · customisation extra",
  },

  /* ── Cookies (Menu highlight) ── */
  {
    id: "mocha-sea-salt-cookies", category: "cookies", sort: 10,
    name: "Dark Chocolate Mocha Sea Salt Cookies",
    desc: "Chewy dark chocolate and coffee cookies with a pinch of sea salt.",
    options: one("Box"), image: "assets/img/gallery/mocha-cookies.jpg", art: "cookies", tint: "#5a3a2b",
  },
  {
    id: "chocolate-chunk-cookies", category: "cookies", sort: 20,
    name: "Classic Chocolate Chunk Cookies",
    desc: "Golden cookies loaded with chunks of couverture chocolate.",
    options: one("Box"), image: "assets/img/products/cookies.jpg", art: "cookies", tint: "#c98d52",
  },

  /* ── Little treats (Menu highlight) ── */
  {
    id: "brownies", category: "treats", sort: 10,
    name: "Brownies",
    desc: "Fudgy brownies. Ask us for this week's flavours.",
    options: one("Box"), art: "brownies", tint: "#4a2c20",
  },
  {
    id: "teacakes", category: "treats", sort: 20,
    name: "Teacakes",
    desc: "Soft loaf cakes for your chai. Ask us for this week's flavours.",
    options: one("Loaf"), art: "cake", tint: "#d9a65f",
  },

  /* ── Healthy treats (Menu highlight): wholewheat flour and jaggery ── */
  {
    id: "apple-crumble-cake", category: "healthy", sort: 10,
    name: "Apple Crumble Cake",
    desc: "Wholewheat apple cake under a crumble topping, sweetened with jaggery.",
    options: one("Cake"), image: "assets/img/gallery/crumble-cake.jpg", art: "cake", tint: "#c9a06a", note: "Wholewheat & jaggery",
  },
  {
    id: "walnut-crumble-cake", category: "healthy", sort: 20,
    name: "Walnut Crumble Cake",
    desc: "Wholewheat walnut cake with a crunchy crumble, sweetened with jaggery.",
    options: one("Cake"), art: "cake", tint: "#a8743f", note: "Wholewheat & jaggery",
  },
  {
    id: "jowar-coconut-cookies", category: "healthy", sort: 30,
    name: "Jowar Coconut Cookies",
    desc: "Crisp jowar and coconut cookies made with jaggery.",
    options: one("Box"), image: "assets/img/gallery/healthy-cookies.jpg", art: "cookies", tint: "#d8b07a", note: "Wholewheat & jaggery",
  },

  /* ── Unjunk biscuits (Unjunk cookies highlight) ── */
  {
    id: "unjunk-biscuits", category: "unjunk", sort: 10,
    name: "Unjunk Biscuits",
    desc: "100% whole-wheat biscuits with no maida, no refined sugar and no palm or refined oil.",
    options: [
      { label: "Cheese & herbs", price: null },
      { label: "Almond pistachio", price: null },
      { label: "Butter elaichi nankhatai", price: null },
    ],
    image: "assets/img/gallery/unjunk-biscuits.jpg", art: "cookies", tint: "#d0a86c", eggless: true,
  },

  /* ── Breads (Sourdough and Ladipav highlights) ── */
  {
    id: "sourdough-loaf", category: "breads", sort: 10,
    name: "Sourdough Loaf",
    desc: "Slow-fermented, naturally leavened bread with an open crumb and a crackly crust.",
    options: [{ label: "Classic", price: null }, { label: "Roasted garlic & herb (wholewheat)", price: null }],
    image: "assets/img/gallery/sourdough.jpg", art: "bread", tint: "#c88a4e", note: AHEAD,
  },
  {
    id: "ladi-pav", category: "breads", sort: 20,
    name: "Fresh Ladi Pav",
    desc: "Soft, buttery pav made with pure butter, with no palm oil or preservatives.",
    options: one("Pack"), image: "assets/img/gallery/ladi-pav.jpg", art: "pav", tint: "#d99a4e", note: AHEAD,
  },

  /* ── Hampers (Hampers highlight) ── */
  {
    id: "signature-hamper", category: "hampers", sort: 10,
    name: "Signature Hamper",
    desc: "Roasted spiced almonds and cashews, cheese crackers, salted caramel makhana, sugar-free dates and nut ladoos (6), chocolate chunk sea salt cookies (3), chocolate coconut fudge (3) and a lemon blueberry teacake.",
    options: one("Hamper"), image: "assets/img/products/hamper.jpg", art: "hamper", tint: "#8c5a35", note: "Made for festivals · add-ons on request",
  },
  {
    id: "signature-hamper-dip", category: "hampers", sort: 20,
    name: "Signature Hamper with Lavash & Dip",
    desc: "Everything in the Signature Hamper, plus herbed lavash with a jalapeño cheese dip.",
    options: one("Hamper"), art: "hamper", tint: "#b07d4f", note: "Made for festivals · add-ons on request",
  },
  {
    id: "healthy-hamper", category: "hampers", sort: 30,
    name: "Healthy Hamper",
    desc: "Roasted spiced almonds and cashews, roasted cheese makhana, sugar-free dates and nut ladoos (6), a wholewheat jaggery nut-crumble tea loaf, wholewheat jaggery kesar pista nankhatai (6) and granola bars (6).",
    options: one("Hamper"), art: "hamper", tint: "#aebf7d", note: "Made for festivals · add-ons on request",
  },
  {
    id: "mini-hamper", category: "hampers", sort: 40,
    name: "Mini Hamper",
    desc: "Cheese crackers, sugar-free dates and nut ladoos (3), chocolate chunk sea salt cookies (2) and chocolate coconut fudge (3).",
    options: one("Hamper"), art: "hamper", tint: "#d9a65f", note: "Made for festivals · add-ons on request",
  },
];
