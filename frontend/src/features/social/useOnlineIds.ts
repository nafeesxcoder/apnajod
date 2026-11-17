import { useEffect, useState } from "react";

import { chatApi } from "../../api/chatApi";

/**
 * Who among these members is online right now, refreshed every 30 seconds.
 * Same rule as the chat list's green dot: a member who hid their activity is
 * never shown as online.
 */
export function useOnlineIds(accessToken: string | undefined, userIds: string[]) {
  const [online, setOnline] = useState<Record<string, boolean>>({});
  const key = [...new Set(userIds)].sort().join(",");

  useEffect(() => {
    if (!accessToken || !key) return;
    let live = true;
    const check = () =>
      chatApi
        .presenceFor(accessToken, key.split(","))
        .then((map) => {
          if (live) setOnline(map);
        })
        .catch(() => undefined);
    void check();
    const timer = setInterval(check, 30_000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [accessToken, key]);

  return online;
}
