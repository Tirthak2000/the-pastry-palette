# The Pastry Palette

Website and admin panel for **The Pastry Palette by Heli**, a home bakery in Ahmedabad
([@thepastry_palette](https://www.instagram.com/thepastry_palette/)).

- **Shop** (`/`): menu grouped by category, size options, a cake designer ("Paint your own cake"),
  an order cart, and a checkout that collects the delivery address and sends the order to
  **+91 84602 82977** on WhatsApp. Delivery is Ahmedabad only: every 380xxx pincode is accepted,
  plus the extra pincodes listed in the admin panel; other pincodes are blocked.
- **Admin** (`/admin`): add, edit and delete products, upload photos, change prices (one at a time or
  in bulk), mark items sold out or hidden, reorder, manage categories, delivery rules, the cake
  designer's flavours and sizes, shop details, and backups.

Plain HTML, CSS and JavaScript modules. No build step. Data lives in Firebase Firestore (free plan).

## Files

```
index.html              shop page
admin.html              admin panel
assets/css/style.css    shop styles and colour tokens (light + dark)
assets/css/admin.css    admin layout
assets/js/config.js     ← paste your Firebase config here
assets/js/seed.js       starter menu and default settings (placeholder prices)
assets/js/data.js       Firestore / demo-mode data layer
assets/js/main.js       shop logic: menu, cart, cake designer, WhatsApp checkout
assets/js/admin.js      admin logic
assets/js/art.js        illustrations used until a product has a photo
assets/js/util.js       helpers (pincode check, money format, dates)
firestore.rules         security rules: public read, admin-only writes
firebase.json           lets `firebase deploy --only firestore:rules` find the rules
vercel.json             clean URLs (/admin) and noindex for the admin page
```

## Demo mode vs live

While `assets/js/config.js` is empty the site runs in **demo mode**: it shows the starter menu, and
`/admin` opens without a login and saves changes **only in your own browser**. Customers won't see
those changes. Once the Firebase config is filled in, the site switches to **live**: the shop reads
from Firestore and `/admin` asks for a login.

## Run it on your Mac

The scripts are ES modules, so open the site through a local server, not by double-clicking
`index.html`:

```bash
cd ~/Projects/the-pastry-palette
python3 -m http.server 8080
# open http://localhost:8080 and http://localhost:8080/admin.html
```

## Connect Firebase (about 10 minutes)

1. Go to <https://console.firebase.google.com> → **Add project** (e.g. `the-pastry-palette`). Analytics can stay off.
2. **Build → Firestore Database → Create database** → production mode → location `asia-south1 (Mumbai)`.
3. **Firestore → Rules**: paste the contents of `firestore.rules` and **Publish**
   (or run `firebase deploy --only firestore:rules` from this folder).
4. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
5. **Authentication → Users → Add user**
   - Email: `heli@thepastrypalette.app` (the shop has no email; this address only works as a username
     and never receives mail)
   - Password: choose a strong one
   - Copy the new user's **User UID**.
6. **Firestore → Start collection** `admins` → Document ID = the UID from step 5 → add a field
   `name` (string) `Heli` → Save. Only accounts listed here can change the shop.
7. **Project settings → General → Your apps → Web app (`</>`)** → register → copy the
   `firebaseConfig` values into `assets/js/config.js`.
8. **Authentication → Settings → Authorized domains** → add your Vercel domain.
9. Deploy (below), open `https://your-domain/admin`, sign in with username **heli** and the password,
   click **Load starter menu**, then set the real prices.

To add another admin, repeat steps 5 and 6. Firebase can't email a reset link to the username
address, so if the password is forgotten: delete the user in **Authentication → Users**, add it again
with a new password, and rename the `admins` document to the new UID.

Optional hardening: in Google Cloud console → **APIs & Services → Credentials**, restrict the web API key
to your domain (HTTP referrers).

### Free-plan limits

Photos are compressed in the browser (about 100–230 KB each) and stored inside the product records,
so Firebase Storage (which needs the paid plan) isn't used. Each shop visit reads one document per
product plus one for settings. Firestore's free plan allows 50,000 reads a day, which is roughly
3,500 visits a day with 13 products.

## Deploy on Vercel

Import the GitHub repo on <https://vercel.com/new>, set **Framework Preset: Other**, leave build
settings empty, and deploy. The admin panel is at `/admin`.

## Before going live: check these placeholders

- **Prices** in the starter menu are placeholders. Set the real ones in Admin → Products.
- **Descriptions** were written from the Instagram posts; edit anything that isn't right.
- **Eggless**: only the tiramisu carries the "Eggless" badge. If everything is eggless, turn on
  Admin → Orders & delivery → **Everything is eggless**.
- **Cake designer** flavours, prices per kg and sizes are examples (Admin → Cake designer).
- **Delivery**: the charge is set to "by distance, confirmed on WhatsApp", earliest delivery is
  tomorrow, and the 382xxx pincode list is a starting set. Review all three in Admin → Orders & delivery.
- **Photos**: products show illustrations until you upload real photos in the editor.
