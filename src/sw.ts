// src/sw.ts
export type { };
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "sovereign-ai-core-v3";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (event: any) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    // CRITICAL: Explicitly ignore .gguf files to prevent duplicating 400MB in the SW cache
    const isCoreAsset = [".wasm", ".js", ".css", ".html", ".json"].some(ext => url.pathname.endsWith(ext)) && !url.pathname.endsWith('.gguf');

    if (isCoreAsset) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(event.request);

                if (cachedResponse) {
                    return cachedResponse;
                }

                try {
                    const networkResponse = await fetch(event.request);
                    if (networkResponse.status === 200) {
                        await cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (error) {
                    return new Response("Offline execution failure: Asset not found in local cache.", {
                        status: 503,
                        statusText: "Service Unavailable"
                    });
                }
            })()
        );
    }
});