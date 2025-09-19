// Nama cache untuk PWA
const CACHE_NAME = 'kasir-pos-chika-cache-v1';

// Daftar aset yang akan di-cache saat instalasi
// Ini termasuk halaman utama, ikon, dan manifest
const urlsToCache = [
  '/',
  '/login',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Event listener untuk 'install'
// Ini terjadi saat service worker pertama kali diinstal
self.addEventListener('install', (event) => {
  // Menunda event install sampai cache siap
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Menambahkan semua aset ke dalam cache
        return cache.addAll(urlsToCache);
      })
  );
});

// Event listener untuk 'fetch'
// Ini terjadi setiap kali aplikasi meminta sumber daya (misalnya, halaman, gambar, skrip)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // Coba cari respon di cache terlebih dahulu
    caches.match(event.request)
      .then((response) => {
        // Jika respon ditemukan di cache, kembalikan dari cache
        if (response) {
          return response;
        }

        // Jika tidak, coba ambil dari jaringan
        return fetch(event.request).then(
          (response) => {
            // Jika request gagal, jangan cache
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Jika berhasil, kloning responnya.
            // Satu untuk dikirim ke browser, satu untuk disimpan di cache.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Event listener untuk 'activate'
// Ini terjadi saat service worker baru diaktifkan
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Hapus cache lama yang tidak ada di whitelist
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
