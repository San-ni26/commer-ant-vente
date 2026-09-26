// public/sw.js — Service Worker v8 — Kephalé BS
// v8 : Timeout réseau universel (4s) + détection offline Safari + notifs SW_CONNECTIVITY

const SW_VERSION = 'v8'
const CACHES = {
  static:  `kbs-static-${SW_VERSION}`,
  pages:   `kbs-pages-${SW_VERSION}`,
  images:  `kbs-images-${SW_VERSION}`,
  fonts:   `kbs-fonts-${SW_VERSION}`,
  offline: `kbs-offline-${SW_VERSION}`,
  apiRead: `kbs-api-read-${SW_VERSION}`,
}

const PRECACHE_PAGES = ['/', '/connexion', '/inscription']
const PRECACHE_ASSETS = ['/favicon.ico']

const CACHE_LIMITS = {
  pages:   80,
  images:  60,
  fonts:   20,
  apiRead: 100,
}

const EXPIRY = {
  pages:   365  * 24 * 60 * 60 * 1000, // 7 jours
  images:  30 * 24 * 60 * 60 * 1000, // 30 jours
  fonts:   90 * 24 * 60 * 60 * 1000, // 90 jours
  apiRead: 24 * 60 * 60 * 1000,       // 24h
}

// ─────────────────────────────────────────────
// PAGE OFFLINE FALLBACK (HTML inline)
// Affiché UNIQUEMENT si la page n'a jamais été visitée
// ─────────────────────────────────────────────
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hors ligne — Kephalé BS</title>
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
    .icon { font-size: 4rem; margin-bottom: 1.25rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: .75rem; }
    p  { color: #6b7280; line-height: 1.6; margin-bottom: 1.5rem; }
    .hint {
      font-size: .875rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
      padding: .75rem;
      border-radius: .5rem;
      margin-bottom: 1.5rem;
    }
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
    <h1>Page non disponible hors ligne</h1>
    <p>Cette page n'a pas encore été mise en cache. Visitez-la une fois en ligne pour pouvoir y accéder hors connexion.</p>
    <div class="hint">
      💡 Naviguez vers vos boutiques en ligne — elles seront ensuite accessibles hors connexion.
    </div>
    <button onclick="history.back()">Retour</button>
  </div>
</body>
</html>`

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

/**
 * fetch() avec un timeout strict via AbortController.
 * Sans cela, Safari attend 75s+ sur coupure réseau avant de lever une erreur.
 * @param {Request|string} request
 * @param {number} timeoutMs — 4000ms par défaut
 */
async function fetchAvecTimeout(request, timeoutMs = 4000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timer)
    return response
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

/**
 * Notifie tous les onglets ouverts de l'état de connectivité réelle.
 * Utilisé pour synchroniser useOnlineStatus() sur Safari.
 */
async function notifierConnectivite(online) {
  await notifierClients({ type: 'SW_CONNECTIVITY', online })
}

function stampResponse(response) {
  const headers = new Headers(response.headers)
  headers.set('X-SW-Fetched-At', Date.now().toString())
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function isExpired(response, maxAgeMs) {
  const fetchedAt = response.headers.get('X-SW-Fetched-At')
  if (!fetchedAt) return false
  return Date.now() - parseInt(fetchedAt) > maxAgeMs
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries)
    await Promise.all(toDelete.map(k => cache.delete(k)))
  }
}

async function notifierClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  clients.forEach(client => client.postMessage(message))
}

/**
 * Clé de cache normalisée — ignore les paramètres RSC de Next.js
 * et partitionne HTML vs RSC pour éviter les conflits Vary
 */
function getCacheKey(request) {
  const url = new URL(request.url)
  url.searchParams.delete('_rsc')

  const isRsc =
    request.headers.has('RSC') ||
    request.headers.get('accept')?.includes('text/x-component') ||
    request.headers.has('Next-Router-Prefetch')

  if (isRsc) {
    url.searchParams.set('__rsc', '1')
  } else {
    url.searchParams.set('__html', '1')
  }

  return new Request(url.toString(), {
    method: 'GET',
    headers: { 'Accept': isRsc ? 'text/x-component' : 'text/html' }
  })
}

// ─────────────────────────────────────────────
// INSTALL
// ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Stocker le fallback offline
      const offlineCache = await caches.open(CACHES.offline)
      await offlineCache.put(
        '/__offline__',
        new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      )

      // Pré-cacher les pages d'auth
      const pagesCache = await caches.open(CACHES.pages)
      await Promise.allSettled(
        PRECACHE_PAGES.map(async (url) => {
          try {
            const req = new Request(url)
            const res = await fetch(req)
            if (res.ok) await pagesCache.put(getCacheKey(req), stampResponse(res))
          } catch (_) {}
        })
      )

      // Pré-cacher les assets statiques
      const imagesCache = await caches.open(CACHES.images)
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url)
            if (res.ok) await imagesCache.put(url, res)
          } catch (_) {}
        })
      )

      self.skipWaiting()
    })()
  )
})

// ─────────────────────────────────────────────
// ACTIVATE
// ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const knownCaches = Object.values(CACHES)
      const allCacheNames = await caches.keys()

      await Promise.all(
        allCacheNames
          .filter(name => name.startsWith('kbs-') && !knownCaches.includes(name))
          .map(name => caches.delete(name))
      )

      await self.clients.claim()
      await notifierClients({ type: 'SW_ACTIVE', version: SW_VERSION })
    })()
  )
})

// ─────────────────────────────────────────────
// FETCH — Routeur de stratégies
// ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer certains protocoles
  if (
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) return

  // Laisser passer HMR et WebSockets
  if (
    url.pathname.includes('webpack-hmr') ||
    request.headers.get('upgrade') === 'websocket'
  ) return

  // Ping de connectivité (header X-Ping) → bypass SW, va directement au réseau
  // Nécessaire pour que useOnlineStatus() mesure la vraie connexion Internet
  if (request.headers.get('X-Ping') === '1') return

  // Déconnexion → vider caches de session
  if (url.pathname.includes('/api/auth/signout')) {
    event.waitUntil(
      Promise.all([
        caches.delete(CACHES.pages),
        caches.delete(CACHES.apiRead),
      ])
    )
    return
  }

  // Laisser passer les routes d'auth (CSRF, tokens)
  if (url.pathname.startsWith('/api/auth/') && !url.pathname.includes('/api/auth/session')) {
    return
  }

  // Ignorer les mutations (POST, PUT, PATCH, DELETE) — gérées par fetch-offline.ts
  if (request.method !== 'GET') return

  // ── 1. API GET → Network First + cache offline 24h
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(apiNetworkFirst(request))
    return
  }

  // ── 2. Assets Next.js statiques → Cache First (immutables)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHES.static))
    return
  }

  // ── 3. Chunks Next.js data/image → Cache First
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(cacheFirst(request, CACHES.static))
    return
  }

  // ── 4. Google Fonts → Cache First 90 jours
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirstWithExpiry(request, CACHES.fonts, EXPIRY.fonts))
    return
  }

  // ── 5. Images → Cache First 30 jours
  if (/\.(png|jpg|jpeg|svg|ico|webp|avif|gif)$/i.test(url.pathname)) {
    event.respondWith(
      cacheFirstWithExpiry(request, CACHES.images, EXPIRY.images)
        .then(r => { trimCache(CACHES.images, CACHE_LIMITS.images); return r })
    )
    return
  }

  // ── 6. Pages HTML et payloads RSC → Cache First offline + revalidation en arrière-plan
  const isPageOrRsc =
    !url.pathname.startsWith('/_next/') &&
    (
      request.headers.get('accept')?.includes('text/html') ||
      request.headers.get('accept')?.includes('text/x-component') ||
      request.headers.has('RSC') ||
      request.headers.has('Next-Router-Prefetch')
    )

  if (isPageOrRsc) {
    event.respondWith(
      cacheFirstRevalidate(request)
        .then(r => { trimCache(CACHES.pages, CACHE_LIMITS.pages); return r })
    )
    return
  }

  // ── Défaut → Network with cache fallback
  event.respondWith(networkWithFallback(request))
})

// ─────────────────────────────────────────────
// BACKGROUND SYNC
// ─────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(
      (async () => {
        await notifierClients({ type: 'SW_SYNC_REQUEST' })
        await new Promise(resolve => setTimeout(resolve, 2000))
        await notifierClients({ type: 'SW_SYNC_COMPLETE' })
      })()
    )
  }
})

// ─────────────────────────────────────────────
// STRATÉGIES
// ─────────────────────────────────────────────

/**
 * Cache First avec revalidation en arrière-plan.
 * OFFLINE : sert le cache IMMÉDIATEMENT sans aller sur le réseau.
 * ONLINE  : sert le cache si disponible + met à jour en arrière-plan.
 * Jamais de page "hors ligne" si la page a déjà été visitée.
 */
async function cacheFirstRevalidate(request) {
  const cache = await caches.open(CACHES.pages)
  const cacheKey = getCacheKey(request)
  const cached = await cache.match(cacheKey, { ignoreVary: true })

  // Revalidation avec timeout 4s — Safari sinon attend 75s+ sur coupure réseau
  const revalidate = fetchAvecTimeout(request, 4000)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(cacheKey, stampResponse(response.clone()))
        // Réseau ok → notifier les onglets
        notifierConnectivite(true).catch(() => {})
      }
      return response
    })
    .catch(async () => {
      // Échec réseau → notifier les onglets (offline détecté)
      notifierConnectivite(false).catch(() => {})
      return null
    })

  // Cache disponible → servir immédiatement + revalider en arrière-plan
  if (cached) {
    revalidate.catch(() => {})
    return cached
  }

  // Pas encore en cache → attendre le réseau
  try {
    const response = await revalidate
    if (response && response.ok) return response
    return offlineFallback(request)
  } catch {
    return offlineFallback(request)
  }
}

/** API Network First : réseau d'abord, fallback sur cache 24h */
async function apiNetworkFirst(request) {
  try {
    // Timeout 4s — Safari sinon bloque sur coupure réseau
    const response = await fetchAvecTimeout(request, 4000)
    if (response.ok) {
      const cache = await caches.open(CACHES.apiRead)
      await cache.put(request, stampResponse(response.clone()))
      trimCache(CACHES.apiRead, CACHE_LIMITS.apiRead)
      notifierConnectivite(true).catch(() => {})
    }
    return response
  } catch {
    // Réseau KO → notifier + fallback cache
    notifierConnectivite(false).catch(() => {})
    const cache = await caches.open(CACHES.apiRead)
    const cached = await cache.match(request)
    if (cached && !isExpired(cached, EXPIRY.apiRead)) {
      return cached
    }
    return new Response(
      JSON.stringify({ erreur: 'Hors ligne', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

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
  } catch {
    return offlineFallback(request)
  }
}

/** Cache First avec expiry */
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
  } catch {
    if (cached) return cached
    return offlineFallback(request)
  }
}

/** Network with cache fallback */
async function networkWithFallback(request) {
  const cacheKey = getCacheKey(request)
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHES.pages)
      await cache.put(cacheKey, response.clone())
    }
    return response
  } catch {
    const cache = await caches.open(CACHES.pages)
    const cached = await cache.match(cacheKey, { ignoreVary: true })
    if (cached) return cached
    return offlineFallback(request)
  }
}

/** Fallback offline — affiché seulement si la page n'a JAMAIS été visitée */
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
  if (event.data?.type === 'CLEAR_API_CACHE') {
    caches.delete(CACHES.apiRead).then(() => {
      event.ports[0]?.postMessage({ cleared: true })
    })
  }
})
