self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Apnajoda";
  const body = data.body || "You have a new notification";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      data: { conversationId: data.conversationId, postId: data.postId, storyUserId: data.storyUserId },
      // One notification per chat, and one per post (a new like replaces
      // the last "liked your post" instead of stacking up).
      tag: data.conversationId
        ? `chat-${data.conversationId}`
        : data.postId
          ? `post-${data.postId}`
          : undefined,
      renotify: !!(data.conversationId || data.postId),
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const conversationId =
    event.notification.data && event.notification.data.conversationId;
  // A like or comment on your post opens that post.
  const postId = event.notification.data && event.notification.data.postId;
  // A story like, mention or close-friends story opens that person's stories.
  const storyUserId = event.notification.data && event.notification.data.storyUserId;
  const target = conversationId
    ? `/?chat=${encodeURIComponent(conversationId)}`
    : postId
      ? `/?post=${encodeURIComponent(postId)}`
      : storyUserId
        ? `/?story=${encodeURIComponent(storyUserId)}`
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
            else if (postId) client.postMessage({ type: "open-post", postId });
            else if (storyUserId) client.postMessage({ type: "open-story", storyUserId });
            return client.focus();
          }
        }
        // App closed: open it straight onto that chat.
        if (self.clients.openWindow) return self.clients.openWindow(target);
      }),
  );
});
