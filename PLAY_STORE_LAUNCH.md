# PendragonX — Google Play Store Launch Guide

This project is now wired for native Android via **Capacitor**. The web app is unchanged; a thin native shell is produced for Play.

---

## 1. Packages installed (the "specific set" Play needs)

Already added to `package.json`:

**Core**
- `@capacitor/core`, `@capacitor/cli` (dev), `@capacitor/android`

**Required plugins (matched to PendragonX features + Play policies)**
- `@capacitor/app` — lifecycle + hardware back-button (Play UX requirement)
- `@capacitor/splash-screen` — branded splash
- `@capacitor/status-bar` — dark themed status bar
- `@capacitor/keyboard` — input viewport fixes
- `@capacitor/preferences` — native key/value storage
- `@capacitor/network` — pairs with offline mode
- `@capacitor/share` — share sheet for exports
- `@capacitor/filesystem` — saving exports/downloads
- `@capacitor/browser` — Chrome Custom Tabs for OAuth (Play requires OAuth in CCT, not WebView)
- `@capacitor/push-notifications` — FCM push (replaces web push on Android)
- `@capacitor/local-notifications` — reminders + routine notifications
- `@capacitor/clipboard` — copy buttons
- `@capacitor/haptics` — UX polish
- `@capacitor/device` — crash/error metadata

---

## 2. Local one-time setup

> **Sandbox can't do this** — Android SDK lives on your machine.

```bash
# 1. Pull the repo to your machine after exporting to GitHub
git pull

# 2. Install deps
npm install

# 3. Add the Android platform (creates the /android folder)
npx cap add android

# 4. Build the web bundle and sync to native
npm run build
npx cap sync android
```

You'll need:
- **Node 20+**
- **Android Studio** (Hedgehog or newer) with the Android 14 SDK (API 34) and build-tools 34.x
- **JDK 17**

---

## 3. Run on a device or emulator

```bash
npx cap run android        # opens an emulator or attached device
# OR
npx cap open android       # opens the project in Android Studio
```

With the dev `server.url` in `capacitor.config.ts`, the app hot-reloads from the Lovable sandbox.

---

## 4. Producing the upload `.aab` (the file Google Play wants)

1. **Comment out the `server` block** in `capacitor.config.ts` (otherwise the released app will try to load from the sandbox URL).
2. Rebuild + sync:
   ```bash
   npm run build
   npx cap sync android
   ```
3. Generate an **upload keystore** (one time, store safely — losing it = can't update the app):
   ```bash
   keytool -genkey -v -keystore pendragonx-upload.keystore \
     -alias pendragonx -keyalg RSA -keysize 2048 -validity 10000
   ```
4. Add `android/key.properties`:
   ```
   storePassword=YOUR_PASSWORD
   keyPassword=YOUR_PASSWORD
   keyAlias=pendragonx
   storeFile=../../pendragonx-upload.keystore
   ```
5. In `android/app/build.gradle`, add a `signingConfigs.release` block referencing `key.properties` and set `buildTypes.release.signingConfig signingConfigs.release`.
6. Build the bundle:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
7. Upload `android/app/build/outputs/bundle/release/app-release.aab` to Play Console.

---

## 5. Google Play Console checklist

| Requirement | Status / Where |
|---|---|
| Play Developer account ($25 one-time) | Sign up at https://play.google.com/console |
| App name | `PendragonX` |
| Package name | `app.lovable.4eb34d34fd9d491db4fe83f99b554cfb` |
| Privacy Policy URL | https://pendragonx.com/privacy-policy ✅ already exists |
| Terms of Service URL | https://pendragonx.com/terms-of-service ✅ already exists |
| Data Safety form | Collects: email, name, knowledge content, usage analytics. Encrypted in transit. Users can request deletion. |
| Content rating | Productivity / Everyone |
| Target audience | 13+ |
| App category | Productivity |
| Target API level | 34 (Android 14) — set in `android/variables.gradle` after `cap add android` |
| Feature graphic | 1024×500 PNG/JPG |
| Phone screenshots | 2–8 images, 16:9 or 9:16, min 320px |
| Tablet screenshots | Optional but recommended |
| App icon | 512×512 PNG (already have `/icon-512x512.png`) |
| Short description | ≤80 chars |
| Full description | ≤4000 chars |

---

## 6. Permissions declared (AndroidManifest.xml)

`npx cap add android` plus the installed plugins will register these automatically:

- `INTERNET`
- `ACCESS_NETWORK_STATE` (Network plugin)
- `POST_NOTIFICATIONS` (Push + Local Notifications, Android 13+)
- `VIBRATE` (Haptics + notifications)
- `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM` (Local Notifications)
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` (Filesystem, scoped to media on Android 13+)

If Play flags any sensitive permission, remove it from `android/app/src/main/AndroidManifest.xml` and re-sync.

---

## 7. FCM (push notifications)

Push requires a Firebase project:

1. Create a free Firebase project, add an Android app with package `app.lovable.4eb34d34fd9d491db4fe83f99b554cfb`.
2. Download `google-services.json` → drop into `android/app/`.
3. Re-run `npx cap sync android`.

Your existing `engagement-nudges` flow can call FCM via the Firebase Admin SDK from an edge function, using the device token returned by `PushNotifications.register()`.

---

## 8. After approval

- Play review usually takes 1–7 days for a first submission.
- Subsequent updates: bump `versionCode` and `versionName` in `android/app/build.gradle`, then repeat steps 4.2 → 4.7.

---

## Helpful links

- Capacitor Android docs: https://capacitorjs.com/docs/android
- Play Console: https://play.google.com/console
- Lovable + Capacitor blog: https://lovable.dev/blog/mobile-development-with-capacitor
