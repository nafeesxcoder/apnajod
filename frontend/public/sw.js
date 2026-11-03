self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Milaan";
  const body = data.body || "You have a new notification";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      data: { conversationId: data.conversationId },
      tag: data.conversationId ? `chat-${data.conversationId}` : undefined,
      renotify: !!data.conversationId,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const conversationId =
    event.notification.data && event.notification.data.conversationId;
  const target = conversationId
    ? `/?chat=${encodeURIComponent(conversationId)}`
    : "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // App already open: don't reload it, tell it which chat to open.
        for (const client of clientList) {
          if ("focus" in client) {
            if (conversationId)
              client.postMessage({ type: "open-chat", conversationId });
            return client.focus();
          }
        }
        // App closed: open it straight onto that chat.
        if (self.clients.openWindow) return self.clients.openWindow(target);
      }),
  );
});
