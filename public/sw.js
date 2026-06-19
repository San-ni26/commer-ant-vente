// public/sw.js — Service Worker v2 — Commerce Vente
// Stratégies : Cache First (assets), SWR (pages), Network Only (API), Cache First (fonts/images)

const SW_VERSION = 'v2'
const CACHES = {
  static:  `cv-static-${SW_VERSION}`,   // JS/CSS chunks Next.js (immutables)
  pages:   `cv-pages-${SW_VERSION}`,    // Pages HTML (SWR)
  images:  `cv-images-${SW_VERSION}`,   // Images PNG/SVG/ICO
  fonts:   `cv-fonts-${SW_VERSION}`,    // Google Fonts
  offline: `cv-offline-${SW_VERSION}`,  // Fallback offline
}

// Pages pré-cachées dès l'installation
const PRECACHE_PAGES = ['/', '/connexion', '/inscription']
const PRECACHE_ASSETS = ['/favicon.ico', '/manifest.webmanifest']

// Limites de taille des caches (entrées max)
const CACHE_LIMITS = {
  pages:  30,
  images: 60,
  fonts:  20,
}

// Durées d'expiration (ms)
const EXPIRY = {
  pages:  7  * 24 * 60 * 60 * 1000, // 7 jours
  images: 30 * 24 * 60 * 60 * 1000, // 30 jours
  fonts:  90 * 24 * 60 * 60 * 1000, // 90 jours
}

// ─────────────────────────────────────────────
// PAGE OFFLINE FALLBACK (HTML inline)
// ─────────────────────────────────────────────
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hors ligne — Commerce Vente</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
      color: #111827;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.1);
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1.25rem;
    }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: .75rem; }
    p  { color: #6b7280; line-height: 1.6; margin-bottom: 1.5rem; }
    button {
      background: #2563eb;
      color: white;
      border: none;
      padding: .75rem 2rem;
      border-radius: .5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background .2s;
    }
    button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Vous êtes hors ligne</h1>
    <p>Vérifiez votre connexion internet et réessayez. Les pages visitées récemment sont disponibles depuis le cache.</p>
    <button onclick="window.location.reload()">Réessayer</button>
  </div>
</body>
</html>`

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

/** Ajoute un timestamp X-SW-Fetched-At à la réponse pour gérer l'expiry */
function stampResponse(response) {
  const headers = new Headers(response.headers)
  headers.set('X-SW-Fetched-At', Date.now().toString())
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/** Vérifie si une réponse estampillée est expirée */
function isExpired(response, maxAgeMs) {
  const fetchedAt = response.headers.get('X-SW-Fetched-At')
  if (!fetchedAt) return false
  return Date.now() - parseInt(fetchedAt) > maxAgeMs
}

/** Supprime les entrées en excès d'un cache (garde les N plus récentes) */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries)
    await Promise.all(toDelete.map(k => cache.delete(k)))
  }
}

// ─────────────────────────────────────────────
// INSTALL — Précache des ressources critiques
// ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Précache offline fallback
      const offlineCache = await caches.open(CACHES.offline)
      await offlineCache.put(
        '/__offline__',
        new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      )

      // Précache pages principales
      const pagesCache = await caches.open(CACHES.pages)
      const pageRequests = PRECACHE_PAGES.map(url => new Request(url))
      await Promise.allSettled(
        pageRequests.map(async (req) => {
          try {
            const res = await fetch(req)
            if (res.ok) await pagesCache.put(req, stampResponse(res))
          } catch (_) {/* réseau indisponible au moment de l'install */}
        })
      )

      // Précache assets statiques (favicon, manifest)
      const imagesCache = await caches.open(CACHES.images)
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url)
            if (res.ok) await imagesCache.put(url, res)
          } catch (_) {}
        })
      )

      // Activation immédiate sans attendre la fermeture des onglets
      self.skipWaiting()
    })()
  )
})

// ─────────────────────────────────────────────
// ACTIVATE — Nettoyage des vieux caches
// ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const knownCaches = Object.values(CACHES)
      const allCacheNames = await caches.keys()

      // Supprimer les caches des versions précédentes
      await Promise.all(
        allCacheNames
          .filter(name => name.startsWith('cv-') && !knownCaches.includes(name))
          .map(name => caches.delete(name))
      )

      // Prendre le contrôle de tous les onglets ouverts immédiatement
      await self.clients.claim()
    })()
  )
})

// ─────────────────────────────────────────────
// FETCH — Routeur de stratégies
// ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer : non-GET, chrome-extension, ws/wss
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) return

  // ── 1. API → Network Only (jamais en cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // ── 2. Assets Next.js statiques → Cache First (immutables 1 an)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHES.static))
    return
  }

  // ── 3. Google Fonts → Cache First (90 jours)
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirstWithExpiry(request, CACHES.fonts, EXPIRY.fonts))
    return
  }

  // ── 4. Images (PNG, JPG, SVG, ICO, WEBP) → Cache First (30 jours)
  if (/\.(png|jpg|jpeg|svg|ico|webp|avif|gif)$/i.test(url.pathname)) {
    event.respondWith(
      cacheFirstWithExpiry(request, CACHES.images, EXPIRY.images)
        .then(r => { trimCache(CACHES.images, CACHE_LIMITS.images); return r })
    )
    return
  }

  // ── 5. Pages HTML → Stale While Revalidate (7 jours)
  if (
    request.headers.get('accept')?.includes('text/html') &&
    !url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      staleWhileRevalidate(request, CACHES.pages, EXPIRY.pages)
        .then(r => { trimCache(CACHES.pages, CACHE_LIMITS.pages); return r })
    )
    return
  }

  // ── Défaut → Network with cache fallback
  event.respondWith(networkWithFallback(request))
})

// ─────────────────────────────────────────────
// STRATÉGIES
// ─────────────────────────────────────────────

/** Cache First : sert depuis le cache, fetch en cas de miss */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName })
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      await cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    return offlineFallback(request)
  }
}

/** Cache First avec expiry : rafraîchit si trop vieux */
async function cacheFirstWithExpiry(request, cacheName, maxAgeMs) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached && !isExpired(cached, maxAgeMs)) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, stampResponse(response.clone()))
      return response
    }
    return cached || response
  } catch (err) {
    if (cached) return cached
    return offlineFallback(request)
  }
}

/** Stale While Revalidate : sert le cache immédiatement + met à jour en arrière-plan */
async function staleWhileRevalidate(request, cacheName, maxAgeMs) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, stampResponse(response.clone()))
      }
      return response
    })
    .catch(() => null)

  // Si cache présent et non expiré → sert immédiatement
  if (cached && !isExpired(cached, maxAgeMs)) {
    return cached
  }

  // Si cache expiré ou absent → attendre le réseau
  try {
    const response = await fetchPromise
    if (response) return response
    if (cached) return cached
    return offlineFallback(request)
  } catch {
    if (cached) return cached
    return offlineFallback(request)
  }
}

/** Network with cache fallback : essaie le réseau, fallback sur cache */
async function networkWithFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHES.pages)
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return offlineFallback(request)
  }
}

/** Retourne la page offline ou une réponse 503 si tout échoue */
async function offlineFallback(request) {
  const accept = request.headers.get('accept') || ''

  if (accept.includes('text/html')) {
    const cache = await caches.open(CACHES.offline)
    const offline = await cache.match('/__offline__')
    if (offline) return offline
  }

  return new Response('Service indisponible', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

// ─────────────────────────────────────────────
// MESSAGE — Contrôle depuis le client
// ─────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION })
  }
  if (event.data?.type === 'CLEAR_PAGES_CACHE') {
    caches.delete(CACHES.pages).then(() => {
      event.ports[0]?.postMessage({ cleared: true })
    })
  }
})
