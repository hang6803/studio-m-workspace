// Studio M Workspace offline shell. The app's own files are kept on the phone so it opens with no connection;
// the data API (another server) is never cached here: the app keeps its own copy of the last data it loaded.
const VER = "__M_VER__";
const CACHE = "studio-m-" + VER;
const SHELL = ["./", "index.html", "app.css", "app.js", "fx.js", "brain.js", "graph.js", "xiaom.js", "festivals.js", "festival-theme.js", "celebrate.js", "sfx.js", "backup.html", "manifest.webmanifest",
  "assets/cg-400.woff", "assets/cg-700.woff", "assets/logo-d.png", "assets/logo-l.png",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
// cache: "reload" — straight from the server, past the browser's own cache. GitHub Pages lets a browser keep a file for
// 10 minutes, so a new version opened soon after it went live used to store the old app.js / app.css under the new version
// and stay on them until the next one.
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("studio-m-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // pages: the newest when online, the kept copy when not; files: the kept copy at once, refreshed in the background
  if (req.mode === "navigate") {
    // asked by its address (a page request can't take options itself). An error page (404, server down) is never kept:
    // the copy already on the phone opens instead
    const kept = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html"));
    e.respondWith(fetch(req.url, { cache: "no-cache" }).then(r => {
      if (!r.ok) return kept().then(k => k || r);
      const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r;
    }).catch(kept));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return r; });
    return hit ? (net.catch(() => {}), hit) : net;
  }));
});
// Reminders (the app works them out and keeps the list in the "m-remind" cache). On Android, Chrome wakes this now and
// then while the app is closed; anything due today and not shown yet is shown. A tap opens the app on that page.
self.addEventListener("periodicsync", e => {
  if (e.tag !== "m-remind") return;
  e.waitUntil((async () => {
    const c = await caches.open("m-remind"), list = await c.match("list").then(r => r ? r.json() : []).catch(() => []);
    const shown = await c.match("shown").then(r => r ? r.json() : []).catch(() => []);
    const d = new Date(), t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const fresh = list.filter(x => x.day === t && !shown.includes(x.id));
    for (const x of fresh) await self.registration.showNotification(x.title, { body: x.body, tag: x.id, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: x.url } });
    if (fresh.length) await c.put("shown", new Response(JSON.stringify([...shown, ...fresh.map(x => x.id)].slice(-300))));
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL("./" + ((e.notification.data && e.notification.data.url) || ""), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    const w = cs[0]; if (w) return w.focus().then(() => w.navigate(url)).catch(() => self.clients.openWindow(url));
    return self.clients.openWindow(url);
  }));
});
