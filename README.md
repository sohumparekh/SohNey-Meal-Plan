# Ghar ka Menu

An Android app for one household: a 4-week rotating vegetarian menu, weekly shopping
lists that come straight from the menu, and a WhatsApp message for the cook every night
with tomorrow's meals, a Plan B for each, and any soaking or prep to do tonight.

**Everything lives on the phone.** No server, no account, no internet needed. The only
things that leave the app are the WhatsApp messages you send and the Blinkit search links.

## Install on the phone (2 minutes)

1. On the phone, open **github.com/sohumparekh/SohNey-Meal-Plan/releases/latest**.
2. Under *Assets*, tap the `ghar-ka-menu-….apk` file to download it.
3. Open the downloaded file. If Android asks, allow **Install unknown apps** for your
   browser (or Files app), go back, and tap **Install**.
4. Open **Ghar ka Menu**. Go to **Settings**:
   - tap **Allow notifications**,
   - if it says exact alarms are off, tap **Allow exact reminders** and switch it on,
   - enter Vimal's WhatsApp number and tap **Save settings**.

**Updating:** download the newer APK from the latest release and install it the same
way. It installs over the old app and keeps all data, because every release is signed
with the same key.

## How it works

- **Week = Saturday to Friday.** The weekly order is picked up from the office grocer on
  Friday evening, after the cook has made Friday's dinner, so fresh food is used from
  Saturday. Fragile items (palak, methi, mushrooms, pav, paneer) are planned early in the
  week, hardy dishes later, with an optional Tuesday top-up.
- **Staples vs fresh.** Staples (atta, dal, oil, spices, onion, potato…) are never
  counted; they come back on a restock cycle or when marked "running low". Fresh items
  are computed from the menu and rounded to shop units.
- **Rotation.** 105 dishes and a 28-day rotation (`src/lib/seed/`). From Thursday the app
  drafts next week; swap what you like and approve.
- **Reminders** (India time, editable in Settings): every day 9 pm *Send tomorrow's menu*,
  4 pm *Check tonight's dinner*, Thursday 8 pm *Plan next week*, Friday 10 am *Send grocery
  order*. Tapping one opens a screen with one big **Send on WhatsApp** button. Reminders
  are set 4 weeks ahead each time the app opens and survive phone restarts.
- **Cook messages** in Hinglish, Hindi (Devanagari) or English (Settings).
- **New dishes:** type one in, or **Add with Claude**: the app copies a prompt, you paste
  it in the Claude app, and paste the JSON reply back. No API keys in the app.
- **Backups:** automatic weekly backup to `Documents/GharKaMenu` (kept if the app is
  uninstalled), plus **Share plan** to send the whole household file over WhatsApp/Drive
  and **Import** to load it on another phone or after a reinstall. Newest data wins; you
  are warned before loading an older file.

## Code

```
src/lib/seed/        dish library, ingredients, Hindi names, rotation.json
src/lib/core/        planner: dates, shelf life, weekly draft, suggestions, shopping lists,
                     eating out, cook messages (3 languages)
src/lib/dishImport.ts  "Add with Claude" prompt + JSON validation
src/data/            on-device database (IndexedDB via Dexie), backup/import
src/native/          reminders (local notifications), WhatsApp/Blinkit links, files, share
src/screens/         Today, Week, Shopping, Send, Dishes, Add dish, Settings
android/             Capacitor Android project
.github/workflows/   builds the signed APK and publishes a GitHub Release
```

React + Vite + Tailwind, wrapped with Capacitor 8.

```
npm install
npm test          # planner, data and reminder tests
npm run dev       # run in a browser (reminders only work in the APK)
npm run rotation  # regenerate the 4-week rotation
```

## Building the APK

Every push to `claude/household-meal-planner-bz8uhj` (or **Actions → Android APK → Run
workflow**) builds a signed release APK and publishes it as a GitHub Release
`v1.0.<build>`. The build number always goes up, so each APK installs over the last.

### One-time signing setup

The workflow needs four repository secrets (GitHub → repo **Settings → Secrets and
variables → Actions → New repository secret**): `ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Their values are in
the `github-secrets.txt` file that came with `release.jks`. Keep both files somewhere safe:
**every future release must be signed with the same key**, or Android will refuse to
update the installed app (you would have to uninstall, losing data unless restored from a
backup).

To make a new key instead (only for a fresh install):
`keytool -genkeypair -keystore release.jks -storetype PKCS12 -alias gharkamenu -keyalg RSA -keysize 2048 -validity 10000`,
then `base64 -w0 release.jks` for `ANDROID_KEYSTORE_BASE64`.
