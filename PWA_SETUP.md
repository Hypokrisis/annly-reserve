# PWA Setup Guide

## Overview

Annly Reserve is configured as a Progressive Web App (PWA), allowing users to install it on their devices and use it offline.

## Files Created

### 1. manifest.json
Location: `public/manifest.json`

Defines the app metadata:
- App name and description
- Theme colors
- Display mode (standalone)
- Icon sizes (72x72 to 512x512)

### 2. service-worker.js
Location: `public/service-worker.js`

Handles caching and offline functionality:
- Caches static resources on install
- Serves from cache when available
- Falls back to network when needed
- Cleans up old caches on activation

## Required Assets

You need to create app icons in the following sizes and place them in `public/icons/`:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

**Tip:** Use a tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) to generate all sizes from a single source image.

## HTML Meta Tags

Add these tags to your `index.html` `<head>`:

```html
<!-- PWA Meta Tags -->
<meta name="theme-color" content="#4f46e5">
<meta name="description" content="Sistema de reservas para barberías">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
```

## Service Worker Registration

The service worker is registered in `src/main.tsx`:

```typescript
// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}
```

## Testing PWA

### Local Testing
1. Run `npm run build`
2. Serve the build folder with a static server
3. Open in Chrome DevTools → Application → Manifest
4. Check "Service Workers" tab

### Production Testing
1. Deploy to Netlify
2. Open in Chrome on mobile
3. Look for "Add to Home Screen" prompt
4. Install and test offline functionality

## Lighthouse Audit

Run a Lighthouse audit to verify PWA compliance:

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App"
4. Click "Generate report"

Target score: 90+

## Offline Functionality

Currently cached:
- Home page
- Static assets
- Manifest

**Future enhancements:**
- Cache API responses
- Offline booking queue
- Background sync for appointments
