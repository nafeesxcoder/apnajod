/**
 * Which tab Notifications opens on. The bell on Home picks it: Likes, unless
 * only Activity has something new.
 */
export type NotificationsTab = "likes" | "activity";

let next: NotificationsTab = "likes";

export function openNotificationsOn(tab: NotificationsTab) {
  next = tab;
}

/** The tab to open, once: reading it goes back to Likes. */
export function takeNotificationsTab(): NotificationsTab {
  const tab = next;
  next = "likes";
  return tab;
}
