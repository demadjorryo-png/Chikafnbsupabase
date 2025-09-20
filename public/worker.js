/*
Copyright 2021 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const { precacheAndRoute } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { StaleWhileRevalidate, NetworkFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

// Handle requests for offline content.
// Fallback to the offline page if the user is offline and the page is not cached.
const offlineFallback = '/offline.html';

// We need to precache the offline page so we can serve it when the user is offline.
precacheAndRoute([
  { url: offlineFallback, revision: '1' }
]);

// Use a Network First strategy for navigation requests.
// This means that the service worker will try to get the page from the network first.
// If it can't, it will fall back to the cache.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
      }),
    ],
    networkTimeoutSeconds: 4, // If the network doesn't respond in 4 seconds, fall back to the cache.
  })
);


// Use a Stale While Revalidate strategy for assets.
// This means that the service worker will serve the asset from the cache first,
// and then update the cache in the background.
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker' ||
    request.destination === 'font' ||
    request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100, // Cache up to 100 assets.
        maxAgeSeconds: 30 * 24 * 60 * 60, // Cache for 30 days.
      }),
    ],
  })
);