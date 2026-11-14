import { useEffect } from "react";

import { StoryViewer } from "./StoryViewer";
import { closeStories, dropStory, loadStories, noteSeen, useStories } from "./storyStore";

/**
 * The one story viewer in the app, so a story can be opened from anywhere:
 * the row on Home, or the ring round someone's photo on a post, their
 * profile or a chat. Refreshes who has a story every few minutes.
 */
export function StoryHost({ accessToken }: { accessToken: string }) {
  const { people, seen, viewing } = useStories();

  useEffect(() => {
    void loadStories(accessToken);
    const timer = setInterval(() => void loadStories(accessToken), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [accessToken]);

  return (
    <StoryViewer
      people={people}
      start={viewing}
      seen={seen}
      accessToken={accessToken}
      onClose={closeStories}
      onSeen={noteSeen}
      onDeleted={dropStory}
    />
  );
}
