# Google Play Store Launch — Native Android Wrapper

To publish PendragonX on the Google Play Store, the app must be a real native Android binary (an `.aab` Android App Bundle). A PWA alone cannot be uploaded to Play. The standard, Lovable-supported path is **Capacitor**, which wraps the existing React/Vite app in a native Android shell.

## What gets added

### 1. NPM packages (the "specific set" Play requires indirectly)

Core wrapper:
- `@capacitor/core`
- `@capacitor/cli` (dev)
- `@capacitor/android`

Plugins needed to satisfy Play policies and match features you already use in-app:
- `@capacitor/app` — back-button + lifecycle (required for proper Android UX)
- `@capacitor/splash-screen` — Play requires a branded splash
- `@capacitor/status-bar` — theme the status bar to match the dark canvas
- `@capacitor/preferences` — native key/value storage
- `@capacitor/network` — used by your offline mode
- `@capacitor/share` — share sheet (used by export/share flows)
- `@capacitor/filesystem` — needed for downloads/exports on Android
- `@capacitor/browser` — in-app browser for OAuth + external links (Play prefers Custom Tabs over WebView for OAuth)
- `@capacitor/push-notifications` — your engagement nudges already use web push; this is the Android equivalent via FCM
- `@capacitor/local-notifications` — reminders/routines
- `@capacitor/clipboard` — copy buttons in chat/cards
- `@capacitor/haptics` — small UX polish, expected on Android
- `@capacitor/device` — needed for crash/error reporting metadata
- `@capacitor/keyboard` — fix viewport jumps on mobile inputs

### 2. Capacitor config (`capacitor.config.ts`)
- `appId`: `app.lovable.4eb34d34fd9d491db4fe83f99b554cfb`
- `appName`: `pendragonx`
- Dev `server.url` pointing at the Lovable sandbox for hot reload (commented note that it must be removed before producing the release `.aab`)
- Splash + status bar themed to the deep ink canvas (`#0A0A14`)

### 3. Android project scaffolding
- Run `npx cap add android` (user runs locally — sandbox can't)
- `android/app/src/main/AndroidManifest.xml` permissions matching the plugins above (INTERNET, POST_NOTIFICATIONS, VIBRATE, ACCESS_NETWORK_STATE)
- App icon + adaptive icon + splash assets generated from the existing PendragonX iridescent orb

### 4. Play Console requirements doc (`PLAY_STORE_LAUNCH.md`)
Step-by-step for the user covering what only they can do:
- Create Play Console account ($25 one-time)
- Generate upload keystore + signing
- Privacy policy URL (already at `/privacy-policy`)
- Data safety form answers (matches your existing privacy memory)
- Content rating questionnaire
- Screenshots + feature graphic spec
- How to run `npm run build && npx cap sync android && cd android && ./gradlew bundleRelease` to produce the uploadable `.aab`

## What I will NOT do
- I won't run `npx cap add android` — that has to happen on your local machine after you `git pull`, because the sandbox has no Android SDK.
- I won't generate or store the upload keystore — that must stay on your machine for security.
- I won't change any existing web behavior; the React app is unchanged.

## Files to create/modify
- **Create**: `capacitor.config.ts`, `PLAY_STORE_LAUNCH.md`
- **Modify**: `package.json` (add the Capacitor deps), `src/main.tsx` (tiny guarded init for StatusBar + SplashScreen.hide() when running natively), `index.html` (viewport-fit=cover for Android notch)

## After approval, your local steps
1. Export to GitHub → `git pull`
2. `npm install`
3. `npx cap add android`
4. `npm run build && npx cap sync android`
5. `npx cap run android` (emulator/device) or `cd android && ./gradlew bundleRelease` for the Play upload
6. Follow `PLAY_STORE_LAUNCH.md` for the Console submission

Read more: https://lovable.dev/blog/mobile-development-with-capacitor

Want me to proceed, or also include iOS (App Store) wiring in the same pass?
