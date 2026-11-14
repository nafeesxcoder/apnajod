import { useSyncExternalStore } from "react";

import { storyApi, type StoryPerson } from "../../api/storyApi";
import { liveStories, loadSeen } from "./storySeen";

/**
 * The stories everyone can see right now, shared by the row on Home, the
 * rings round people's photos (posts, profiles, chat) and the one story
 * viewer that plays them. Kept in memory only.
 */
type State = { people: StoryPerson[]; seen: Set<string>; viewing: number | null };

let state: State = { people: [], seen: new Set(), viewing: null };
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export const storyStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useStories(): State {
  return useSyncExternalStore(storyStore.subscribe, storyStore.get, storyStore.get);
}

let loading: Promise<void> | null = null;

/** Fetches who has a story up (and which you have seen). */
export function loadStories(accessToken: string): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const [tray, seen] = await Promise.all([storyApi.tray(accessToken), loadSeen()]);
      set({
        seen,
        people: tray
          .map((person) => ({ ...person, stories: liveStories(person.stories) }))
          .filter((person) => person.stories.length > 0),
      });
    } catch {
      // Keep what we had; the row and rings simply stay as they were.
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** "new" - a story you have not watched; "seen" - all watched; "none" - no story up. */
export type StoryStatus = "new" | "seen" | "none";

export function statusOf(people: StoryPerson[], seen: Set<string>, userId: string | null | undefined): StoryStatus {
  const person = userId ? people.find((p) => p.user.userId === userId) : undefined;
  if (!person || !person.stories.length) return "none";
  return person.stories.some((story) => !seen.has(story.id)) ? "new" : "seen";
}

export function useStoryStatus(userId: string | null | undefined): StoryStatus {
  const { people, seen } = useStories();
  return statusOf(people, seen, userId);
}

/** Plays this person's stories (if they have any up). */
export function openStoriesOf(userId: string): boolean {
  const index = state.people.findIndex((p) => p.user.userId === userId);
  if (index < 0) return false;
  set({ viewing: index });
  return true;
}

export function openStoriesAt(index: number) {
  set({ viewing: index });
}

export function closeStories() {
  set({ viewing: null });
}

export function noteSeen(storyId: string) {
  if (state.seen.has(storyId)) return;
  set({ seen: new Set(state.seen).add(storyId) });
}

export function dropStory(storyId: string) {
  set({
    people: state.people
      .map((person) => ({ ...person, stories: person.stories.filter((story) => story.id !== storyId) }))
      .filter((person) => person.stories.length > 0),
  });
}
