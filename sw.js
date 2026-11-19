/* ประปา อปท — Service Worker
   cache-first: ครั้งแรกต้องมีเน็ตเพื่อติดตั้ง ครั้งต่อ ๆ ไปเปิดได้แม้ไม่มีเน็ต
   version: 20261119-192021
*/
var VERSION = "20261119-192021";
var CACHE = "prapa-" + VERSION;

var ASSETS = [
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // cache:"reload" = ดึงจากเซิร์ฟเวอร์จริงทุกไฟล์ ไม่ใช้สำเนาใน HTTP cache
      // กันติดตั้งเวอร์ชันใหม่แล้วได้ไฟล์เก่าปนกับไฟล์ใหม่
      return c.addAll(ASSETS.map(function (u) { return new Request(u, { cache: "reload" }); }))
        .then(function () { return self.skipWaiting(); });
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE && k.indexOf("prapa-") === 0; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // หน้าเว็บ (navigate): ใช้จาก cache ทันที + อัปเดตเบื้องหลังเมื่อมีเน็ต
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("index.html").then(function (hit) {
        var update = fetch(req).then(function (res) {
          if (res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put("index.html", copy); });
          }
          return res;
        }).catch(function () { return null; });
        return hit || update;
      })
    );
    return;
  }

  // ไฟล์อื่น: cache-first แล้วค่อยเช็คเน็ตเบื้องหลัง
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
