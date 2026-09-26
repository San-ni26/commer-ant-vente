// public/sw.js — Service Worker v9 — Kephalé BS
// Stratégie : Cache tout ce qui est nécessaire au fonctionnement offline
// Pages HTML + RSC payloads + assets statiques + API calls

const SW_VERSION = 'v9'
const CACHES = {
  static:  `kbs-static-${SW_VERSION}`,
  pages:   `kbs-pages-${SW_VERSION}`,
  images:  `kbs-images-${SW_VERSION}`,
  fonts:   `kbs-fonts-${SW_VERSION}`,
  offline: `kbs-offline-${SW_VERSION}`,
  api:     `kbs-api-${SW_VERSION}`,
}

// ─── Fallback offline ────────────────────────────────────────────────────────
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hors ligne — Kephalé BS</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0;
           background: linear-gradient(135deg,#eff6ff,#e0e7ff); }
    .card { background: white; border-radius: 1rem; padding: 2.5rem 2rem;
            max-width: 420px; width: 90%; text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,.1); }
    .icon { font-size: 3.5rem; margin-bottom: 1rem; }
    h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: .6rem; color: #111; }
    p  { color: #6b7280; line-height: 1.6; margin-bottom: 1.5rem; font-size: .95rem; }
    button { background: #2563eb; color: white; border: none; padding: .75rem 2rem;
             border-radius: .5rem; font-size: 1rem; font-weight: 600; cursor: pointer; }
    button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Page non disponible hors ligne</h1>
    <p>Cette page n'a pas encore été mise en cache.<br>
       Visitez-la une fois en ligne pour y accéder sans connexion.</p>
    <button onclick="history.back()">← Retour</button>
  </div>
</body>
</html>`

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function stamp(response) {
  const h = new Headers(response.headers)
  h.set('X-SW-At', Date.now().toString())
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h })
}

function aged(response, ms) {
  const t = response.headers.get('X-SW-At')
  return t ? Date.now() - parseInt(t) > ms : false
}

async function trim(name, max) {
  const c = await caches.open(name)
  const keys = await c.keys()
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => c.delete(k)))
}

// ─── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHES.offline)
    await c.put('/__offline__', new Response(OFFLINE_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }))
    await self.skipWaiting()
  })())
})

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const known = new Set(Object.values(CACHES))
    const all   = await caches.keys()
    await Promise.all(all.filter(n => n.startsWith('kbs-') && !known.has(n)).map(n => caches.delete(n)))
    await self.clients.claim()
  })())
})

// ─── FETCH ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const req = e.request
  const url = new URL(req.url)

  // Ignorer tout ce qui n'est pas HTTP(S)
  if (!url.protocol.startsWith('http')) return

  // Ignorer les websockets et HMR
  if (req.headers.get('upgrade') === 'websocket') return
  if (url.pathname.includes('webpack-hmr')) return
  if (url.pathname.includes('__nextjs')) return

  // Ne jamais intercepter les appels auth NextAuth (sauf /session)
  if (url.pathname.startsWith('/api/auth/') &&
      !url.pathname.includes('/api/auth/session')) return

  // Ne pas intercepter les mutations
  if (req.method !== 'GET') return

  // ── Assets immutables Next.js (/_next/static/) ─── Cache First pur
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(cacheFirstPur(req, CACHES.static))
    return
  }

  // ── Chunks dynamiques Next.js (/_next/) ─── Cache First + réseau
  if (url.pathname.startsWith('/_next/')) {
    e.respondWith(cacheFirst(req, CACHES.static))
    return
  }

  // ── API calls ─── Stale-While-Revalidate (cache 24h)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(swr(req))
    return
  }

  // ── Images ─── Cache First 30j
  if (/\.(png|jpe?g|svg|ico|webp|avif|gif)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(req, CACHES.images, 30 * 86400 * 1000))
    return
  }

  // ── Fonts Google ─── Cache First 90j
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req, CACHES.fonts, 90 * 86400 * 1000))
    return
  }

  // ── Pages HTML (navigation complète seulement) ───────────────────────────
  // IMPORTANT : Next.js App Router gère ses propres transitions côté client
  // On ne doit intercepter QUE les navigations complètes (req.mode === 'navigate')
  // et NON les requêtes RSC (Next-Router-Prefetch, RSC header) qui sont des
  // transitions client-side — les intercepter casse la navigation sans refresh
  const isFullNavigation = req.mode === 'navigate' &&
    !req.headers.has('RSC') &&
    !req.headers.has('Next-Router-Prefetch') &&
    !req.headers.get('accept')?.includes('text/x-component')

  const isRscPrefetch =
    req.headers.has('RSC') ||
    req.headers.has('Next-Router-Prefetch') ||
    req.headers.get('accept')?.includes('text/x-component')

  if (isFullNavigation) {
    // Navigation complète → Cache First + revalidation background
    e.respondWith(pageFirst(req))
    return
  }

  if (isRscPrefetch) {
    // Payload RSC Next.js (transition client-side) → toujours réseau
    // Ne jamais mettre en cache pour éviter les conflits de navigation
    e.respondWith(
      fetch(req).catch(() => offlineFallback(req))
    )
    return
  }

  // ── Tout le reste ─── réseau avec fallback cache
  e.respondWith(networkFallback(req))
})

// ─── Stratégies ──────────────────────────────────────────────────────────────

/** Cache First pur — assets immutables, jamais périmés */
async function cacheFirstPur(req, cacheName) {
  const c = await caches.open(cacheName)
  const hit = await c.match(req)
  if (hit) return hit
  try {
    const res = await fetch(req)
    if (res.ok) c.put(req, res.clone())
    return res
  } catch {
    return new Response('Asset non disponible', { status: 503 })
  }
}

/** Cache First avec expiry optionnel */
async function cacheFirst(req, cacheName, maxAge) {
  const c = await caches.open(cacheName)
  const hit = await c.match(req)
  if (hit && (!maxAge || !aged(hit, maxAge))) return hit
  try {
    const res = await fetch(req)
    if (res.ok) {
      c.put(req, stamp(res.clone()))
      trim(cacheName, 80)
    }
    return res
  } catch {
    if (hit) return hit
    return offlineFallback(req)
  }
}

/**
 * Page First (Stale-While-Revalidate pour les pages)
 * ➜ Sert le cache INSTANTANÉMENT si disponible
 * ➜ Revalide en background
 * ➜ Si pas de cache, attend le réseau
 */
async function pageFirst(req) {
  const c = await caches.open(CACHES.pages)

  // Clé normalisée — sans les params RSC de Next.js
  const cacheReq = normalizePageKey(req)
  const hit = await c.match(cacheReq, { ignoreVary: true })

  // Revalidation en arrière-plan (fire & forget)
  const refresh = fetch(req)
    .then(async res => {
      if (res && res.ok) await c.put(cacheReq, stamp(res.clone()))
    })
    .catch(() => {})

  if (hit) {
    refresh // revalidation silencieuse
    return hit
  }

  // Pas de cache → attendre le réseau
  try {
    const res = await fetch(req)
    if (res && res.ok) {
      c.put(cacheReq, stamp(res.clone()))
      trim(CACHES.pages, 60)
    }
    return res
  } catch {
    return offlineFallback(req)
  }
}

/**
 * Stale-While-Revalidate pour les API
 * Cache valide 24h, revalidation en background
 */
async function swr(req) {
  const c = await caches.open(CACHES.api)
  const hit = await c.match(req)
  const EXPIRY_API = 24 * 60 * 60 * 1000

  const refresh = fetch(req)
    .then(async res => {
      if (res && res.ok) {
        await c.put(req, stamp(res.clone()))
        trim(CACHES.api, 120)
      }
      return res
    })
    .catch(() => null)

  // Cache valide → retour immédiat
  if (hit && !aged(hit, EXPIRY_API)) {
    refresh // revalidation silencieuse
    return hit
  }

  // Cache expiré ou absent → attendre le réseau
  try {
    const res = await refresh
    if (res && res.ok) return res
    // Réseau KO → retourner le cache même expiré
    if (hit) return hit
    return new Response(
      JSON.stringify({ erreur: 'Hors ligne', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  } catch {
    if (hit) return hit
    return new Response(
      JSON.stringify({ erreur: 'Hors ligne', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/** Réseau avec fallback cache */
async function networkFallback(req) {
  try {
    const res = await fetch(req)
    if (res && res.ok) {
      const c = await caches.open(CACHES.pages)
      c.put(normalizePageKey(req), res.clone())
    }
    return res
  } catch {
    const c = await caches.open(CACHES.pages)
    const hit = await c.match(normalizePageKey(req), { ignoreVary: true })
    if (hit) return hit
    return offlineFallback(req)
  }
}

/** Fallback HTML offline */
async function offlineFallback(req) {
  const accept = req.headers.get('accept') || ''
  if (accept.includes('text/html') || req.mode === 'navigate') {
    const c = await caches.open(CACHES.offline)
    const fb = await c.match('/__offline__')
    if (fb) return fb
  }
  return new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain' } })
}

/** Normalise la clé de cache des pages Next.js */
function normalizePageKey(req) {
  const url = new URL(req.url)
  url.searchParams.delete('_rsc')

  // IMPORTANT : séparer les clés HTML et RSC pour éviter de servir
  // un payload RSC (JSON) en réponse à une navigation HTML
  const isRsc =
    req.headers.has('RSC') ||
    req.headers.has('Next-Router-Prefetch') ||
    req.headers.get('accept')?.includes('text/x-component')

  // On stocke HTML et RSC dans des clés séparées
  const suffix = isRsc ? '?__type=rsc' : '?__type=html'
  url.search = suffix

  return new Request(url.toString(), {
    method: 'GET',
    headers: { Accept: isRsc ? 'text/x-component' : 'text/html' }
  })
}

// ─── Messages ─────────────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return
  switch (e.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'CLEAR_ALL_CACHES':
      Promise.all(Object.values(CACHES).map(n => caches.delete(n)))
        .then(() => e.ports[0]?.postMessage({ cleared: true }))
      break
    case 'PRECACHE_PAGES':
      ;(async () => {
        const c = await caches.open(CACHES.pages)
        await Promise.allSettled(
          (e.data.urls || []).map(async url => {
            try {
              const res = await fetch(url, { credentials: 'same-origin' })
              if (res.ok) await c.put(normalizePageKey(new Request(url)), stamp(res))
            } catch {}
          })
        )
      })()
      break
  }
})

// ─── Background Sync ──────────────────────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-queue') {
    e.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SW_SYNC_REQUEST' }))
      )
    )
  }
})
