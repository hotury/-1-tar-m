// +1 Tarım Service Worker v4
const CACHE     = 'plus1-tarim-v4';
const URLS      = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

// Kurulum
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(URLS)).then(() => self.skipWaiting())
    );
});

// Aktivasyon — eski cache'leri temizle
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Fetch stratejisi: Supabase/API → her zaman ağ; statik → önce ağ, hata varsa cache
self.addEventListener('fetch', e => {
    const url = e.request.url;

    // Supabase, Open-Meteo, Nominatim — cache'leme
    if (url.includes('supabase.co') || url.includes('open-meteo.com') || url.includes('nominatim.openstreetmap.org')) {
        return; // tarayıcının normal davranışına bırak
    }

    // Statik dosyalar — network first, fallback cache
    e.respondWith(
        fetch(e.request)
            .then(res => {
                if (res && res.status === 200 && res.type === 'basic') {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});

// Push bildirimi (gelecek özellik — altyapı hazır)
self.addEventListener('push', e => {
    const data = e.data?.json() || { title: '+1 Tarım', body: 'Yeni bildirim' };
    e.waitUntil(
        self.registration.showNotification(data.title, {
            body:  data.body,
            icon:  '/icon-192.png',
            badge: '/icon-192.png',
            data:  { url: data.url || '/' }
        })
    );
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
