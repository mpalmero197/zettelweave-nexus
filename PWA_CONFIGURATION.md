# PWA Configuration

This document explains how the Progressive Web App (PWA) features are configured in PendragonX.

## Overview

PendragonX is configured as a Progressive Web App, enabling:
- Installation on mobile and desktop devices
- Offline functionality
- Native app-like experience
- Fast loading and caching

## Configuration Files

### vite.config.ts
The PWA is configured using `vite-plugin-pwa` with:
- **Auto-update strategy**: Service worker updates automatically
- **Manifest**: App metadata for installation
- **Workbox caching**: Smart caching strategies for different resources

### Manifest Settings
```json
{
  "name": "PendragonX - Zettelkasten System",
  "short_name": "PendragonX",
  "description": "Intelligent knowledge management system with offline support",
  "theme_color": "#1a1a1a",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait"
}
```

### Icons
- **192x192**: `/icon-192x192.png` - Used for home screen icon
- **512x512**: `/icon-512x512.png` - Used for splash screen

## Caching Strategies

### Google Fonts
- **Strategy**: CacheFirst
- **Duration**: 1 year
- Fonts are cached on first load for offline use

### Supabase API
- **Strategy**: NetworkFirst with 10s timeout
- **Duration**: 1 week
- Falls back to cache when offline

### Static Assets
- All JS, CSS, HTML, images, and fonts are cached
- Updates automatically when new version is deployed

## Installation

### Mobile (iOS/Android)
Users can install PendragonX via:
1. **Auto-prompt**: Shows install banner on supported browsers
2. **Manual**: Browser menu → "Install App" or "Add to Home Screen"
3. **Install page**: Navigate to `/install` for guided installation

### Desktop
Chrome, Edge, and other Chromium browsers show an install icon in the address bar.

## Offline Support

The app works offline through:
1. **Service Worker**: Caches app shell and static assets
2. **Intelligent Cache**: Pre-loads frequently accessed content
3. **Offline Queue**: Queues changes made offline, syncs when online
4. **Local Storage**: Stores data locally with IndexedDB/localStorage

## Components

### PWAInstallPrompt
- Shows install prompt on mobile devices
- Dismissible and remembers user preference
- Only shows when app is installable

### Install Page (`/install`)
- Dedicated page for app installation
- Shows installation benefits
- Provides manual installation instructions
- Detects if already installed

## Hooks

### usePWAInstall
Custom hook that manages:
- Install prompt state
- Installation detection
- Installation trigger
- Installed state tracking

## Testing

### Install Prompt
1. Open app in mobile browser (Chrome/Safari)
2. Install prompt should appear after brief delay
3. Click "Install" to add to home screen

### Offline Mode
1. Install the app
2. Go offline (airplane mode)
3. App should still load and function
4. Changes sync when back online

### Desktop Install
1. Open in Chrome/Edge
2. Look for install icon in address bar
3. Click to install as desktop app

## Deployment

When deploying updates:
1. Service worker automatically updates
2. Users see update notification
3. App reloads with new version
4. Offline cache is refreshed

## Troubleshooting

### Install prompt not showing
- Check if already installed
- Verify HTTPS connection (required for PWA)
- Clear browser cache and reload

### Offline not working
- Check service worker registration in DevTools
- Verify network cache in Application tab
- Check localStorage/IndexedDB for data

### Icons not displaying
- Verify icons exist in `/public` folder
- Check manifest in DevTools → Application
- Clear cache and reinstall

## Resources

- [PWA Docs](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox Caching](https://developers.google.com/web/tools/workbox/modules/workbox-strategies)
