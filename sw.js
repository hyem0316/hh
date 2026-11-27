/* 햄 님 합동 비서실 — 홈화면 앱(PWA) 서비스 워커
 * 앱 화면(HTML·CSS·JS·아이콘)만 캐시하고, Firebase 같은 외부 통신은 그대로 둡니다.
 * 새 버전이 올라오면 캐시를 비우고 최신 파일을 먼저 받아 옵니다(네트워크 우선).
 */
var CACHE = 'hh-office-v3';
var SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './office-bg.png',
  './pickle-1.png',
  './pickle-2.png',
  './pickle-3.png',
  './pickle-4.png',
  './pickle-5.png',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL).catch(function () { /* 일부 파일이 없어도 설치를 막지 않는다 */ });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;      // Firebase 등 외부 요청은 손대지 않는다

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('오프라인이에요. 인터넷에 연결되면 다시 열려요.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
