# The Pastry Palette

Website and admin panel for **The Pastry Palette by Heli**, a home bakery in Ahmedabad
([@thepastry_palette](https://www.instagram.com/thepastry_palette/)).

- **Shop** (`/`): menu grouped by category, size options, a cake designer, recent bakes from
  Instagram, an order cart, and a checkout that collects the delivery address and sends the order to
  **+91 84602 82977** on WhatsApp. Delivery is Ahmedabad only: every 380xxx pincode is accepted,
  plus the extra pincodes listed in the admin panel; other pincodes are blocked.
- **Admin** (`/admin`): add, edit and delete products, upload photos, change prices (one at a time or
  in bulk), mark items sold out or hidden, reorder, manage categories, delivery rules, the cake
  designer's flavours and sizes, shop details, and backups. Protected by a username and password.

Plain HTML, CSS and JavaScript modules. No build step. Data lives in Firebase Firestore (free plan).

## Files

```
index.html              shop page
admin.html              admin panel
assets/css/style.css    shop styles and colour tokens (light + dark), taken from the logo
assets/css/admin.css    admin layout
assets/img/logo.png     the Instagram profile logo
assets/img/gallery/     photos from @thepastry_palette (hero, recent bakes, some products)
assets/img/products/    stand-in photos from Unsplash (see "Photos" below)
assets/js/config.js     ← paste your Firebase config here
assets/js/seed.js       starter menu and default settings (placeholder prices)
assets/js/data.js       Firestore / demo-mode data layer
assets/js/main.js       shop logic: menu, cart, cake designer, WhatsApp checkout
assets/js/admin.js      admin logic
assets/js/art.js        cake-designer drawing, and illustrations for products without a photo
assets/js/util.js       helpers (pincode check, money format, dates)
firestore.rules         security rules: public read, admin-only writes
firebase.json           lets `firebase deploy --only firestore:rules` find the rules
vercel.json             clean URLs (/admin) and noindex for the admin page
```

## Demo mode vs live

While `assets/js/config.js` is empty the site runs in **demo mode**: it shows the starter menu, and
`/admin` opens without a login and saves changes **only in your own browser**. Once the Firebase
config is filled in, the site is **live**: the shop reads from Firestore and `/admin` needs the
username and password.

## Run it on your Mac

The scripts are ES modules, so open the site through a local server, not by double-clicking:

```bash
cd ~/Projects/the-pastry-palette
python3 -m http.server 8080
# open http://localhost:8080 and http://localhost:8080/admin.html
```

## Admin setup (about 15 minutes, once)

### 1. Make a username and password nobody can guess

On your Mac, run:

```bash
echo "Username: pp-$(openssl rand -hex 4)"
echo "Password: $(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)"
```

Save both in Apple Passwords (or another password manager) right away, and share them with Heli
privately. The username looks like `pp-7f3a9c2e`; the password is 20 random characters.

### 2. Create the Firebase project

1. Open <https://console.firebase.google.com> and sign in with your Google account.
2. **Create a new Firebase project** → name it `the-pastry-palette` → Continue.
   Turn **Google Analytics off** → **Create project**. (It stays on the free Spark plan.)

### 3. Create the database

1. In the left menu open **Firestore Database** (under *Build* or *Databases & Storage*).
2. **Create database** → edition **Standard** if asked → location **asia-south1 (Mumbai)** →
   **Start in production mode** → **Create**.
3. Open the **Rules** tab, delete what's there, paste the whole of `firestore.rules`, click **Publish**.

### 4. Turn on username/password login

1. Left menu → **Authentication** → **Get started**.
2. **Sign-in method** tab → **Email/Password** → switch on the first toggle (leave "Email link" off)
   → **Save**.

### 5. Create the admin account

1. **Authentication → Users → Add user**.
2. Email: your username from step 1 followed by `@thepastrypalette.app`,
   for example `pp-7f3a9c2e@thepastrypalette.app`. This address is never emailed; it only acts as
   the login name.
3. Password: the password from step 1 → **Add user**.
4. In the user list, copy the **User UID** (a long code like `Xy9k…`).

### 6. Mark that account as an admin

1. **Firestore Database → Data → + Start collection**.
2. Collection ID: `admins` → **Next**.
3. Document ID: paste the **User UID** from step 5.
4. Add one field: name `name`, type `string`, value `Heli` → **Save**.

Only accounts listed in `admins` can change the shop. Anyone else who somehow signs in can't save anything.

### 7. Connect the website to Firebase

1. Gear icon → **Project settings** → **General** → *Your apps* → the **Web** icon (`</>`).
2. Nickname `website` → leave "Firebase Hosting" unticked → **Register app**.
3. Copy the values from the `firebaseConfig` it shows into `assets/js/config.js`
   (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
4. Commit and push. Vercel redeploys on its own.

### 8. Allow your website's address

**Authentication → Settings → Authorized domains → Add domain** → your site's domain, for example
`the-pastry-palette.vercel.app` (and your own domain if you add one later).

### 9. First login

1. Open `https://your-site/admin`.
2. Username: just the `pp-…` part. Password: from step 1. **Sign in**.
3. Click **Load starter menu**. Then set the real prices, upload photos, and check the settings tabs.

If the admin page says *"This account can't edit the shop yet"*, step 6 used the wrong UID: the page
shows the right one with a **Copy UID** button.

### Keeping it safe

- The password lives only in Firebase, never in the website code.
- Firebase blocks a login after repeated wrong passwords.
- To change the password or remove access: **Authentication → Users → ⋮** next to the user. Firebase
  can't email a reset link to the username address, so if the password is lost, delete the user,
  add it again (step 5) and rename the `admins` document to the new UID (step 6).
- Optional: in Google Cloud console → **APIs & Services → Credentials**, restrict the browser API key
  to your site's domain.

### Free-plan limits

Photos uploaded in the admin are compressed in the browser (about 100–230 KB each) and stored inside
the product records, so Firebase Storage (paid) isn't needed. Each shop visit reads one record per
product plus one for settings; the free plan allows 50,000 reads a day, about 3,500 visits a day with
13 products.

## Deploy on Vercel

Import the GitHub repo on <https://vercel.com/new>, set **Framework Preset: Other**, leave build
settings empty, and deploy. The admin panel is at `/admin`.

## Photos

- `assets/img/logo.png` and everything in `assets/img/gallery/` come from
  [@thepastry_palette](https://www.instagram.com/thepastry_palette/). Cakes with cartoon characters or
  another business's logo were left out.
- `assets/img/products/` are free stand-ins from Unsplash, used where the Instagram profile had no
  usable photo. Replace each with a real photo from the admin panel (Edit → Upload photo):

| Product | Unsplash photo |
| --- | --- |
| Whipped Caramel Chocolate Cake | <https://unsplash.com/photos/H2t7or5XgPs> |
| Chocolate Truffle Cake | <https://unsplash.com/photos/L9bM17bEWfI> |
| Blueberry Cheesecake | <https://unsplash.com/photos/LGNxQzYmeUk> |
| Biscoff Cheesecake | <https://unsplash.com/photos/P8Xn4jX_fVo> |
| Buttercream Cupcakes | <https://unsplash.com/photos/jxWL76TZQNw> |
| Unjunk Cookies | <https://unsplash.com/photos/nKFObFgq0jA> |
| Sourdough Loaf | <https://unsplash.com/photos/kU7TkW9FIJY> |
| Celebration Hamper | <https://unsplash.com/photos/_f8S_o9xQK8> |

## Before going live: check these placeholders

- **Prices** in the starter menu are placeholders. Set the real ones in Admin → Products.
- **Descriptions** were written from the Instagram posts; edit anything that isn't right.
- **Eggless**: only the tiramisu carries the "Eggless" badge. If everything is eggless, turn on
  Admin → Orders & delivery → **Everything is eggless**.
- **Cake designer** flavours, prices per kg and sizes are examples (Admin → Cake designer).
- **Delivery**: the charge is "by distance, confirmed on WhatsApp", earliest delivery is tomorrow,
  and the 382xxx pincode list is a starting set. Review all three in Admin → Orders & delivery.
