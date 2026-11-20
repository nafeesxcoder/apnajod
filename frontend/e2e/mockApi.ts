import type { Page, Route } from "@playwright/test";

/**
 * The server's answers, faked for the browser tests. The web build for the
 * tests talks to http://api.test/api (pnpm e2e:build); every other address
 * outside the test server is blocked, so a test can never reach the live
 * site.
 */
export type Handler = (body: any, route: Route) => unknown | Promise<unknown>;

export async function mockApi(page: Page, handlers: Record<string, Handler | object>) {
  const calls: { method: string; path: string; body: any }[] = [];
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("http://127.0.0.1:4173") || url.startsWith("http://api.test/")) return route.fallback();
    if (url.startsWith("data:") || url.startsWith("blob:")) return route.fallback();
    return route.abort();
  });
  await page.route("http://api.test/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, "");
    if (path.startsWith("/uploads/")) return route.fallback(); // fakePhotos
    const method = request.method();
    let body: any = null;
    try {
      body = request.postDataJSON();
    } catch {
      body = null;
    }
    calls.push({ method, path, body });
    const handler = handlers[`${method} ${path}`] ?? handlers[path];
    if (handler === undefined) return route.fulfill({ status: 404, json: { error: "Not found" } });
    const result = typeof handler === "function" ? await (handler as Handler)(body, route) : handler;
    if (result === undefined) return; // the handler answered itself
    return route.fulfill({ status: 200, json: result });
  });
  return calls;
}

/** Starts the app already signed in (a saved login, as after a real sign-in). */
export async function signedIn(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("milaan_access_token", "test-token");
    localStorage.setItem("milaan_refresh_token", "test-refresh");
  });
}

/** A 1x1 PNG, for any photo the app loads from the fake server. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * A signed-in member with a finished profile, kept in memory: what the app
 * saves comes back on the next read, as on the real server.
 */
export function fakeMember() {
  const state = {
    profile: {
      first_name: "Asha",
      gender: "woman",
      age: 27,
      city: "Lucknow",
      profession: "Teacher",
      about: "Loves books and chai.",
      hobbies: ["Reading"],
      onboarding_complete: 1,
    } as Record<string, any>,
    photos: ["http://api.test/api/uploads/photos/asha.png"],
  };
  const handlers: Record<string, any> = {
    "GET /auth/me": { ok: true, user: { id: "u1", username: "asha", phone: "+919999999999", role: "user" } },
    "GET /profile/me": () => ({ ok: true, profile: { ...state.profile }, photos: [...state.photos], vibes: [], intent: null }),
    "GET /profile/discover": { ok: true, matches: [] },
    "PUT /profile/profile": (body: any) => {
      if (body.firstName !== undefined) state.profile.first_name = body.firstName;
      if (body.city !== undefined) state.profile.city = body.city;
      if (body.profession !== undefined) state.profile.profession = body.profession;
      if (body.about !== undefined || body.bio !== undefined) state.profile.about = body.about ?? body.bio;
      if (body.hobbies !== undefined) state.profile.hobbies = body.hobbies;
      return { ok: true };
    },
    "PUT /profile/photos": (body: any) => {
      state.photos = body.photos;
      return { ok: true };
    },
    "POST /profile/upload-photo": { ok: true, url: "http://api.test/api/uploads/photos/new.png" },
  };
  return { state, handlers };
}

/** Serves the PNG for photo addresses on the fake server. */
export async function fakePhotos(page: Page) {
  await page.route("http://api.test/api/uploads/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
  );
}
