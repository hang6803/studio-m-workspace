// Studio M Workspace offline shell. The app's own files are kept on the phone so it opens with no connection;
// the data API (another server) is never cached here: the app keeps its own copy of the last data it loaded.
const VER = "__M_VER__";
const CACHE = "studio-m-" + VER;
const SHELL = ["./", "index.html", "app.css", "app.js", "graph.js", "xiaom.js", "backup.html", "manifest.webmanifest",
  "assets/cg-400.woff", "assets/cg-700.woff", "assets/logo-d.png", "assets/logo-l.png",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("studio-m-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // pages: the newest when online, the kept copy when not; files: the kept copy at once, refreshed in the background
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return r; });
    return hit ? (net.catch(() => {}), hit) : net;
  }));
});
