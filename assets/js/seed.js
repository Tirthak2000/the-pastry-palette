// Starter menu and default shop settings.
// In demo mode the site shows these. With Firebase connected, the admin panel's
// "Load starter menu" button copies them into the database once; after that,
// everything is edited from /admin and this file is no longer used for content.
//
// PRICES BELOW ARE PLACEHOLDERS. Set the real ones in the admin panel.
// Photos: assets/img/gallery/* are from @thepastry_palette on Instagram; assets/img/products/*
// are free Unsplash stand-ins (see README) to replace with real photos from the admin panel.

export const DEFAULT_SETTINGS = {
  shopName: "The Pastry Palette",
  whatsapp: "918460282977", // country code + number, digits only
  phoneDisplay: "+91 84602 82977",
  instagram: "thepastry_palette",
  announcement: "Freshly baked to order · Delivery across Ahmedabad",

  acceptingOrders: true,
  pausedMessage: "We're not taking new orders for a few days. Message us on WhatsApp to book a later date.",
  allEggless: false, // shows an "Everything is eggless" note across the site

  categories: [
    { id: "cakes", name: "Cakes" },
    { id: "cheesecakes", name: "Cheesecakes" },
    { id: "cupcakes", image: "assets/img/products/cupcakes.jpg", name: "Cupcakes" },
    { id: "desserts", name: "Tiramisu & desserts" },
    { id: "cookies", name: "Cookies" },
    { id: "breads", name: "Breads & pav" },
    { id: "hampers", name: "Hampers" },
  ],

  delivery: {
    mode: "distance", // "distance" = charged by distance, confirmed on WhatsApp · "flat" · "free"
    flatFee: 80,
    freeAbove: 0, // 0 = no free-delivery threshold
    minOrder: 0, // 0 = no minimum
    leadDays: 1, // earliest delivery date = today + leadDays
    slots: ["11 am – 2 pm", "2 pm – 5 pm", "5 pm – 8 pm", "8 pm – 10 pm"],
    note: "We deliver within Ahmedabad city only.",
    // Every 380xxx pincode is accepted automatically. Add other Ahmedabad pincodes here.
    extraPincodes: [
      "382330", "382340", "382345", "382346", "382350", "382405", "382415", "382418", "382424",
      "382430", "382440", "382443", "382445", "382449", "382470", "382475", "382480", "382481",
    ],
  },

  custom: {
    enabled: true,
    occasions: ["Birthday", "Anniversary", "Kids' party", "Baby shower", "Engagement", "Just because"],
    flavours: [
      { name: "Chocolate truffle", color: "#4e2b1f", perKg: 1300 },
      { name: "Lotus Biscoff", color: "#b9773f", perKg: 1600 },
      { name: "Whipped caramel", color: "#cf9a62", perKg: 1700 },
      { name: "Lemon blueberry", color: "#efe09a", perKg: 1600 },
      { name: "Vanilla berry", color: "#f3d9d5", perKg: 1200 },
      { name: "Butterscotch", color: "#dca457", perKg: 1300 },
      { name: "Rasmalai", color: "#f0d7a2", perKg: 1500 },
      { name: "Pistachio", color: "#aebf7d", perKg: 1700 },
    ],
    sizes: [
      { label: "500 g", kg: 0.5 },
      { label: "1 kg", kg: 1 },
      { label: "1.5 kg", kg: 1.5 },
      { label: "2 kg", kg: 2 },
      { label: "3 kg", kg: 3 },
    ],
    note: "Theme cakes are priced after we see your design. Toppers, figurines and fondant work cost extra.",
  },
};

export const STARTER_PRODUCTS = [
  {
    id: "lotus-biscoff-cake", image: "assets/img/gallery/lotus-biscoff.jpg", category: "cakes", sort: 10,
    name: "Lotus Biscoff Chocolate Cake",
    desc: "Chocolate sponge layered with Biscoff spread and crumble, finished with a caramel drip.",
    options: [{ label: "500 g", price: 850 }, { label: "1 kg", price: 1600 }],
    art: "cake", tint: "#b9773f", bestseller: true, note: "Order 1 day ahead",
  },
  {
    id: "whipped-caramel-cake", image: "assets/img/products/whipped-caramel-cake.jpg", category: "cakes", sort: 20,
    name: "Whipped Caramel Chocolate Cake",
    desc: "The viral London cake: soft chocolate sponge under clouds of whipped caramel cream.",
    options: [{ label: "500 g", price: 900 }, { label: "1 kg", price: 1700 }],
    art: "cake", tint: "#cf9a62", top: "#4e2b1f", bestseller: true, note: "Order 1 day ahead",
  },
  {
    id: "lemon-blueberry-cake", image: "assets/img/gallery/lemon-blueberry.jpg", category: "cakes", sort: 30,
    name: "Lemon Blueberry Buttercream Cake",
    desc: "Zesty lemon sponge with blueberry compote and silky buttercream.",
    options: [{ label: "500 g", price: 850 }, { label: "1 kg", price: 1600 }],
    art: "cake", tint: "#efe09a", top: "#4b5a9b", note: "Order 1 day ahead",
  },
  {
    id: "chocolate-truffle-cake", image: "assets/img/products/chocolate-truffle-cake.jpg", category: "cakes", sort: 40,
    name: "Chocolate Truffle Cake",
    desc: "Moist chocolate sponge with a rich dark-chocolate ganache.",
    options: [{ label: "500 g", price: 700 }, { label: "1 kg", price: 1300 }],
    art: "cake", tint: "#4e2b1f", note: "Order 1 day ahead",
  },
  {
    id: "custom-theme-cake", image: "assets/img/gallery/rainbow-4.jpg", category: "cakes", sort: 50, kind: "custom",
    name: "Custom Theme Cake",
    desc: "Birthdays, kids' themes, florals and toppers, designed with you. Pick a flavour, size and theme in the cake designer.",
    options: [], art: "cake", tint: "#f3d9d5", top: "#e2b65b", note: "Order 2–3 days ahead",
  },
  {
    id: "blueberry-cheesecake", image: "assets/img/products/blueberry-cheesecake.jpg", category: "cheesecakes", sort: 10,
    name: "Blueberry Cheesecake",
    desc: "Creamy baked cheesecake on a buttery biscuit base, topped with blueberry compote.",
    options: [{ label: "500 g", price: 950 }, { label: "1 kg", price: 1800 }],
    art: "cheesecake", tint: "#4f4e8f", note: "Order 1 day ahead",
  },
  {
    id: "biscoff-cheesecake", image: "assets/img/products/biscoff-cheesecake.jpg", category: "cheesecakes", sort: 20,
    name: "Biscoff Cheesecake",
    desc: "Biscoff-swirled cheesecake on a crunchy Lotus biscuit base.",
    options: [{ label: "500 g", price: 950 }, { label: "1 kg", price: 1800 }],
    art: "cheesecake", tint: "#c18447", note: "Order 1 day ahead",
  },
  {
    id: "cupcakes", category: "cupcakes", sort: 10,
    name: "Buttercream Cupcakes",
    desc: "Soft cupcakes with swirled buttercream. Tell us your flavours in the order notes.",
    options: [{ label: "Box of 6", price: 450 }, { label: "Box of 12", price: 850 }],
    art: "cupcakes", tint: "#e7a3b0",
  },
  {
    id: "eggless-tiramisu", image: "assets/img/gallery/tiramisu.jpg", category: "desserts", sort: 10,
    name: "Real Eggless Tiramisu",
    desc: "Homemade savoiardi soaked in moka-pot coffee, layered with mascarpone cream and dusted with cocoa.",
    options: [{ label: "Jar", price: 250 }, { label: "Tray (serves 4–5)", price: 899 }],
    art: "tiramisu", tint: "#6b4330", eggless: true, bestseller: true,
  },
  {
    id: "unjunk-cookies", image: "assets/img/products/cookies.jpg", category: "cookies", sort: 10,
    name: "Unjunk Cookies",
    desc: "Wholesome cookies made without the junk. Ask us for this week's flavours.",
    options: [{ label: "250 g box", price: 320 }],
    art: "cookies", tint: "#c98d52",
  },
  {
    id: "sourdough-loaf", image: "assets/img/products/sourdough.jpg", category: "breads", sort: 10,
    name: "Sourdough Loaf",
    desc: "Naturally leavened bread with a slow ferment, an open crumb and a crackly crust.",
    options: [{ label: "Loaf", price: 350 }],
    art: "bread", tint: "#c88a4e", note: "Baked to order. Order 2 days ahead",
  },
  {
    id: "ladi-pav", image: "assets/img/gallery/ladi-pav.jpg", category: "breads", sort: 20,
    name: "Fresh Ladi Pav",
    desc: "Soft, pull-apart pav, baked fresh for your pav bhaji or vada pav.",
    options: [{ label: "6 pav", price: 70 }, { label: "12 pav", price: 130 }],
    art: "pav", tint: "#d99a4e",
  },
  {
    id: "celebration-hamper", image: "assets/img/products/hamper.jpg", category: "hampers", sort: 10,
    name: "Celebration Hamper",
    desc: "A gift box of jar cakes, cookies and treats, put together for your occasion.",
    options: [{ label: "Classic", price: 999 }, { label: "Grand", price: 1799 }],
    art: "hamper", tint: "#b4365a", note: "Order 2 days ahead",
  },
];
