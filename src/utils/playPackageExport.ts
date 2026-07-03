/**
 * Baku Scribe — Google Play Store Package Export
 * --------------------------------------------------------------
 * Bundles every file required to build and submit the Baku Scribe
 * Android app to the Google Play Store into a single .zip:
 *
 *   - capacitor.config.ts
 *   - package.json (with the exact Capacitor deps)
 *   - PLAY_STORE_LAUNCH.md (full step-by-step submission guide)
 *   - public/manifest.webmanifest + PWA icons (used as app icons)
 *   - android/ scaffold templates (AndroidManifest.xml,
 *     build.gradle, strings.xml, network_security_config.xml)
 *   - play-store/ assets (listing copy, data-safety form answers,
 *     privacy policy URL, content rating answers, screenshot specs)
 *   - scripts/ for keystore generation + release .aab build
 *   - README.md with the local commands the user must run
 *
 * The output zip is self-contained — the user unpacks it into the
 * exported Baku Scribe repo, runs the scripts, and uploads the
 * generated .aab to Play Console.
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface PlayExportOptions {
  onProgress?: (stage: string, percent: number) => void;
}

export interface PlayExportResult {
  filesIncluded: number;
  totalSize: number;
}

const PROJECT_FILE_GLOBS = import.meta.glob(
  ['/capacitor.config.ts', '/PLAY_STORE_LAUNCH.md', '/package.json'],
  { eager: true, query: '?raw', import: 'default' }
) as Record<string, string>;

async function fetchBinary(path: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function fetchText(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function exportPlayPackage(opts: PlayExportOptions = {}): Promise<PlayExportResult> {
  const { onProgress = () => {} } = opts;
  const zip = new JSZip();
  let files = 0;

  onProgress('Collecting Capacitor config...', 5);
  for (const [path, content] of Object.entries(PROJECT_FILE_GLOBS)) {
    zip.file(path.replace(/^\//, ''), content);
    files++;
  }

  onProgress('Bundling PWA manifest and icons...', 20);
  const manifest = await fetchText('/manifest.webmanifest');
  if (manifest) {
    zip.file('public/manifest.webmanifest', manifest);
    files++;
  }
  for (const icon of ['icon-192x192.png', 'icon-512x512.png', 'favicon.png', 'favicon.ico']) {
    const buf = await fetchBinary('/' + icon);
    if (buf) {
      zip.file('public/' + icon, buf);
      files++;
    }
  }

  onProgress('Writing Android scaffold templates...', 40);
  zip.file('android-templates/AndroidManifest.xml', ANDROID_MANIFEST);
  zip.file('android-templates/build.gradle', ANDROID_BUILD_GRADLE);
  zip.file('android-templates/strings.xml', ANDROID_STRINGS);
  zip.file('android-templates/network_security_config.xml', ANDROID_NSC);
  zip.file('android-templates/proguard-rules.pro', PROGUARD);
  files += 5;

  onProgress('Writing Play Console assets...', 60);
  zip.file('play-store/listing.md', LISTING_COPY);
  zip.file('play-store/data-safety.md', DATA_SAFETY);
  zip.file('play-store/content-rating.md', CONTENT_RATING);
  zip.file('play-store/screenshots.md', SCREENSHOT_SPECS);
  zip.file('play-store/privacy-policy-url.txt', 'https://bakuscribe.com/privacy-policy\n');
  zip.file('play-store/terms-url.txt', 'https://bakuscribe.com/terms-of-service\n');
  files += 6;

  onProgress('Writing build scripts...', 80);
  zip.file('scripts/generate-keystore.sh', KEYSTORE_SCRIPT);
  zip.file('scripts/build-release-aab.sh', BUILD_AAB_SCRIPT);
  zip.file('scripts/build-release-aab.ps1', BUILD_AAB_PS);
  files += 3;

  zip.file('README.md', README);
  files++;

  onProgress('Compressing...', 95);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  saveAs(blob, `bakuscribe-play-package-${ts}.zip`);
  onProgress('Done', 100);

  return { filesIncluded: files, totalSize: blob.size };
}

// ---------------------------------------------------------------
// TEMPLATES
// ---------------------------------------------------------------

const ANDROID_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:networkSecurityConfig="@xml/network_security_config"
        android:usesCleartextTraffic="false">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
`;

const ANDROID_BUILD_GRADLE = `apply plugin: 'com.android.application'

android {
    namespace "app.lovable.bakuscribe"
    compileSdk 34
    defaultConfig {
        applicationId "app.lovable.4eb34d34fd9d491db4fe83f99b554cfb"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
    signingConfigs {
        release {
            storeFile file(System.getenv("BAKUSCRIBE_KEYSTORE") ?: "bakuscribe-release.keystore")
            storePassword System.getenv("BAKUSCRIBE_KEYSTORE_PASS")
            keyAlias System.getenv("BAKUSCRIBE_KEY_ALIAS") ?: "bakuscribe"
            keyPassword System.getenv("BAKUSCRIBE_KEY_PASS")
        }
    }
    bundle {
        language { enableSplit = true }
        density  { enableSplit = true }
        abi      { enableSplit = true }
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:\$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:\$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:\$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    testImplementation "junit:junit:\$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:\$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:\$androidxEspressoCoreVersion"
    implementation project(':capacitor-cordova-android-plugins')
}

apply from: 'capacitor.build.gradle'

try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found, push notifications won't work")
}
`;

const ANDROID_STRINGS = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Baku Scribe</string>
    <string name="title_activity_main">Baku Scribe</string>
    <string name="package_name">app.lovable.4eb34d34fd9d491db4fe83f99b554cfb</string>
    <string name="custom_url_scheme">app.lovable.4eb34d34fd9d491db4fe83f99b554cfb</string>
</resources>
`;

const ANDROID_NSC = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

const PROGUARD = `# Capacitor
-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * {
  @com.getcapacitor.PluginMethod public *;
}
# Keep JS interfaces
-keepattributes JavascriptInterface
-keepattributes *Annotation*
`;

const LISTING_COPY = `# Play Store Listing Copy

## App name (30 chars max)
Baku Scribe

## Short description (80 chars max)
Your AI-powered knowledge OS — notes, writing, research, and intelligent linking.

## Full description (4000 chars max)
Baku Scribe is an intelligent knowledge management system for writers, researchers, and lifelong learners.

KEY FEATURES
- ZettelCards: Atomic note-taking with auto-categorization via the Dewey system
- Notebooks & Spaces: Organize notes, projects, and references into flexible workspaces
- Catalyst: A focused, distraction-free writing studio with AI-assisted drafting and citations
- ALICE: Your AI assistant for research, summarization, and automated routines
- Knowledge Graph: Visualize how every idea connects with backlinks and contextual snippets
- Mind Maps & Whiteboards: Unified Canvas Studio for visual thinking
- Audio & Video Recorder Studio: Capture lectures, meetings, and voice notes
- Mock Exams & Study Guides: Generate exams and structured guides from your own notes
- Offline Mode: Work anywhere — changes sync the moment you reconnect

PRIVACY-FIRST
- Optional end-to-end encryption for sensitive items
- Your emails are visible only to confirmed friends
- No data is ever sold

SUBSCRIPTIONS
- Free tier with core features
- Premium: $4.99/month or $29.99/year (7-day free trial)

## Category
Productivity

## Tags
notes, knowledge, AI, writing, study, productivity, research, zettelkasten

## Contact email
support@bakuscribe.com

## Website
https://bakuscribe.com
`;

const DATA_SAFETY = `# Data Safety Form Answers

## Data collection
- Email address: Collected (account management). Required. Not shared.
- User IDs: Collected (account). Required. Not shared.
- App activity (in-app actions, search history): Collected (app functionality). Required. Not shared.
- User-generated content (notes, documents): Collected (app functionality). Required. Not shared. End-to-end encryption available as an opt-in.
- Crash logs, diagnostics: Collected (analytics, error reporting). Optional.

## Data sharing
- We do NOT sell user data.
- We share data only with subprocessors (Supabase for storage, Stripe for billing, OpenAI/Google for AI requests).

## Security practices
- Data is encrypted in transit (HTTPS/TLS).
- Data is encrypted at rest by Supabase.
- Optional client-side E2EE for individual items.
- Users can request data deletion at any time via Settings → Account.
- Account deletion URL: https://bakuscribe.com/app (Settings → Account → Delete)

## Children
This app is not directed at children under 13.
`;

const CONTENT_RATING = `# Content Rating Questionnaire Answers (IARC)

- Does the app contain violence? No
- Does the app contain sexual content? No
- Does the app contain profanity? No
- Does the app contain controlled substance references? No
- Does the app contain gambling? No
- Does the app allow user-generated content shareable with other users? Yes (note sharing between friends, with reporting + moderation)
- Does the app share user location? No
- Does the app allow purchases? Yes (subscriptions via Google Play Billing or Stripe)

Expected rating: Everyone / PEGI 3.
`;

const SCREENSHOT_SPECS = `# Required Screenshots

Google Play requires:
- At least 2 phone screenshots (min 320px, max 3840px, 16:9 or 9:16)
- 1 hi-res icon: 512x512 PNG (use /public/icon-512x512.png)
- 1 feature graphic: 1024x500 JPG/PNG (create one showing the Baku Scribe orb + tagline)

Recommended screenshots to capture (run the app, use phone viewport 1080x1920):
1. Dashboard with widgets
2. ZettelCards list
3. Catalyst writing studio
4. ALICE chat with a research result
5. Knowledge graph view
6. Canvas Studio mind map
7. Settings → Subscription page

Place captured PNGs in this folder before uploading to Play Console.
`;

const KEYSTORE_SCRIPT = `#!/usr/bin/env bash
# Generate a release signing keystore for Baku Scribe.
# Store the resulting file and passwords in a SECURE password manager — losing them
# means you can never publish updates to this app again.
set -euo pipefail

KEYSTORE_FILE="bakuscribe-release.keystore"
KEY_ALIAS="bakuscribe"

if [ -f "$KEYSTORE_FILE" ]; then
  echo "Keystore already exists at $KEYSTORE_FILE. Refusing to overwrite."
  exit 1
fi

keytool -genkey -v \\
  -keystore "$KEYSTORE_FILE" \\
  -alias "$KEY_ALIAS" \\
  -keyalg RSA -keysize 2048 \\
  -validity 10000

echo ""
echo "Keystore generated: $KEYSTORE_FILE"
echo "Set these environment variables before running scripts/build-release-aab.sh:"
echo "  export BAKUSCRIBE_KEYSTORE=\\\$(pwd)/$KEYSTORE_FILE"
echo "  export BAKUSCRIBE_KEYSTORE_PASS=<the store password you just entered>"
echo "  export BAKUSCRIBE_KEY_ALIAS=$KEY_ALIAS"
echo "  export BAKUSCRIBE_KEY_PASS=<the key password you just entered>"
`;

const BUILD_AAB_SCRIPT = `#!/usr/bin/env bash
# Build a release .aab ready for Play Console upload.
set -euo pipefail

echo "==> Building web bundle"
npm run build

echo "==> Syncing Capacitor"
npx cap sync android

echo "==> Building release .aab"
cd android
./gradlew clean bundleRelease

AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
  echo ""
  echo "SUCCESS: $AAB_PATH"
  echo "Upload this file to Google Play Console → Production → Create new release."
else
  echo "Build failed: $AAB_PATH not found."
  exit 1
fi
`;

const BUILD_AAB_PS = `# Build a release .aab ready for Play Console upload (Windows PowerShell).
$ErrorActionPreference = "Stop"

Write-Host "==> Building web bundle"
npm run build

Write-Host "==> Syncing Capacitor"
npx cap sync android

Write-Host "==> Building release .aab"
Push-Location android
./gradlew.bat clean bundleRelease
Pop-Location

$aab = "android/app/build/outputs/bundle/release/app-release.aab"
if (Test-Path $aab) {
  Write-Host ""
  Write-Host "SUCCESS: $aab"
  Write-Host "Upload this file to Google Play Console → Production → Create new release."
} else {
  Write-Error "Build failed: $aab not found."
}
`;

const README = `# Baku Scribe — Google Play Package

This zip contains every file required to build and submit Baku Scribe to the Google Play Store.

## What's inside

- \`capacitor.config.ts\` — Capacitor configuration (appId, splash, status bar)
- \`PLAY_STORE_LAUNCH.md\` — Full step-by-step launch guide
- \`package.json\` — Confirms the Capacitor packages already installed
- \`public/manifest.webmanifest\`, \`public/icon-*.png\` — PWA manifest + icons used as Android launcher icons
- \`android-templates/\` — AndroidManifest.xml, build.gradle, strings.xml, network_security_config.xml, proguard-rules.pro (drop into \`android/app/src/main/\` after \`npx cap add android\`)
- \`play-store/\` — Listing copy, data-safety answers, content rating answers, screenshot specs, privacy/terms URLs
- \`scripts/\` — Keystore generation + .aab build scripts (bash + PowerShell)

## Local steps (after exporting the project to GitHub)

\`\`\`bash
git pull
npm install
npx cap add android
# Copy android-templates/* into android/app/src/main/ (manifest, res/xml, res/values)
npm run build
npx cap sync android

# One-time: generate your release keystore (store it + passwords in a password manager)
bash scripts/generate-keystore.sh
export BAKUSCRIBE_KEYSTORE=\$(pwd)/bakuscribe-release.keystore
export BAKUSCRIBE_KEYSTORE_PASS=...
export BAKUSCRIBE_KEY_ALIAS=bakuscribe
export BAKUSCRIBE_KEY_PASS=...

# Build the release bundle
bash scripts/build-release-aab.sh
# -> android/app/build/outputs/bundle/release/app-release.aab
\`\`\`

## Play Console submission

1. Create a Google Play Console account ($25 one-time fee)
2. Create a new app: Baku Scribe, Productivity, English (United States)
3. Fill in the listing using \`play-store/listing.md\`
4. Fill in Data Safety using \`play-store/data-safety.md\`
5. Fill in Content Rating using \`play-store/content-rating.md\`
6. Paste the privacy policy URL from \`play-store/privacy-policy-url.txt\`
7. Upload 2+ phone screenshots (specs in \`play-store/screenshots.md\`), the 512x512 icon, and a 1024x500 feature graphic
8. Upload \`app-release.aab\` to Production → Create new release
9. Submit for review (typically 1-7 days)

See \`PLAY_STORE_LAUNCH.md\` for the long-form version of every step.
`;
