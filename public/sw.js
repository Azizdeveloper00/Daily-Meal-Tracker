const CACHE_PREFIX = 'daily-meal-tracker-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/theme-init.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
];

function isSensitiveRequest(url) {
  const pathname = url.pathname.toLowerCase();
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')
  );
}

function isCacheable(response) {
  return response.ok && response.type !== 'opaque' && !response.headers.has('set-cookie');
}

async function cacheResponse(cache, request, response) {
  if (isCacheable(response)) {
    await cache.put(request, response.clone());
  }
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const page = await fetch('/index.html', { cache: 'no-store' });
  if (!isCacheable(page)) throw new Error('Could not fetch the app shell.');
  await cache.put('/index.html', page.clone());

  const html = await page.text();
  const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
    .map((match) => match[1])
    .filter((asset) => asset.startsWith('/'));
  let fontCssText = '';
  try {
    const fontCss = await fetch(APP_SHELL[APP_SHELL.length - 1], { cache: 'no-store' });
    if (fontCss.ok && fontCss.type !== 'opaque' && !fontCss.headers.has('set-cookie')) {
      fontCssText = await fontCss.text();
    }
  } catch {
    // External fonts are optional; install the local app shell without them.
  }
  const fontFiles = [...fontCssText.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)]
    .map((match) => match[1]);
  const resources = [...new Set([...APP_SHELL, ...assetPaths, ...fontFiles])];

  await Promise.all(
    resources.map(async (resource) => {
      try {
        const response = await fetch(resource, { cache: 'no-store' });
        await cacheResponse(cache, resource, response);
      } catch {
        if (resource === '/index.html') throw new Error('Could not cache the app shell.');
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || isSensitiveRequest(url)) return;

  const isNavigation = request.mode === 'navigate' || url.pathname === '/index.html';
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const cache = await caches.open(CACHE_NAME);
          await cacheResponse(cache, '/index.html', response);
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          return Response.error();
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      try {
        const response = await fetch(request);
        const isGoogleFont =
          (url.origin === 'https://fonts.googleapis.com' ||
            url.origin === 'https://fonts.gstatic.com') &&
          response.type === 'cors';
        if (url.origin === self.location.origin || isGoogleFont) {
          const cache = await caches.open(CACHE_NAME);
          await cacheResponse(cache, request, response);
        }
        return response;
      } catch {
        return Response.error();
      }
    }),
  );
});
