// মিলন — Service Worker (network-first, যাতে সব ফোনে সবসময় সর্বশেষ ভার্সন দেখা যায়)
const CACHE_NAME = "milon-cache-v2"; // ভার্সন বাড়ানো হলো — পুরনো ক্যাশ স্বয়ংক্রিয়ভাবে মুছে যাবে
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Firebase/Firestore রিকোয়েস্ট কখনোই cache করা হবে না — এগুলো সবসময়
  // সরাসরি নেটওয়ার্ক থেকে যাবে, যাতে পোস্ট/লাইক/কমেন্ট/ফলো সবসময় রিয়েল-টাইম থাকে।
  if (event.request.url.includes("firebase") || event.request.url.includes("firestore") || event.request.url.includes("googleapis")) {
    return;
  }

  // NETWORK-FIRST: প্রতিবার আগে ইন্টারনেট থেকে সর্বশেষ ফাইল আনার চেষ্টা করবে।
  // পেলে সেটাই দেখাবে + ক্যাশ আপডেট করে রাখবে (পরের অফলাইন ব্যবহারের জন্য)।
  // ইন্টারনেট না থাকলে (অফলাইন) তখনই পুরনো ক্যাশ থেকে দেখাবে।
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match("./index.html"));
      })
  );
});
