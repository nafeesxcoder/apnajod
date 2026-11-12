/**
 * Profile strength - how complete a member's own profile is, out of 100,
 * and the single most useful thing to do next.
 *
 * Every step is something other members actually see or that changes who
 * sees you: photos, a bio and verification all count towards "Aaj ke 5"
 * (dailyPicksService.score), and the blue tick needs a verified selfie.
 * Weights add up to exactly 100.
 */
export type StrengthScreen = "profileSetup" | "alignment" | "verifyHub";

export type StrengthStep = {
  key: string;
  label: string;
  /** Short reason shown under the step. */
  why: string;
  points: number;
  done: boolean;
  /** Started but waiting on someone else (a selfie under review). */
  waiting?: boolean;
  screen: StrengthScreen;
};

export type StrengthInput = {
  firstName?: string;
  age?: string | number;
  gender?: string;
  city?: string;
  profession?: string;
  bio?: string;
  hobbies?: string[];
  photoCount: number;
  alignment?: { timeline?: string; children?: string; family?: string; relocation?: string };
  verificationStatus?: "none" | "pending" | "approved" | "rejected";
  verified?: boolean;
};

export const BIO_MIN = 30;
export const HOBBIES_MIN = 3;
export const PHOTOS_GOOD = 3;

const filled = (value: unknown) => String(value ?? "").trim().length > 0;

export function profileStrength(input: StrengthInput): {
  score: number;
  steps: StrengthStep[];
  next: StrengthStep | null;
} {
  const answers = input.alignment
    ? [input.alignment.timeline, input.alignment.children, input.alignment.family, input.alignment.relocation].filter(filled)
        .length
    : 0;
  const verified = !!input.verified || input.verificationStatus === "approved";

  const steps: StrengthStep[] = [
    {
      key: "photo",
      label: "Add a profile photo",
      why: "Profiles without a photo are never shown in Aaj ke 5.",
      points: 25,
      done: input.photoCount >= 1,
      screen: "profileSetup",
    },
    {
      key: "basics",
      label: "Add your name, age and gender",
      why: "The first thing people read on your card.",
      points: 10,
      done: filled(input.firstName) && filled(input.age) && filled(input.gender),
      screen: "profileSetup",
    },
    {
      key: "bio",
      label: "Write a short bio",
      why: `A few lines (${BIO_MIN}+ characters) give people something to reply to.`,
      points: 15,
      done: String(input.bio ?? "").trim().length >= BIO_MIN,
      screen: "profileSetup",
    },
    {
      key: "verify",
      label: "Verify with a selfie",
      why: "Shows you are real. Needed for the blue tick.",
      points: 15,
      done: verified,
      waiting: !verified && input.verificationStatus === "pending",
      screen: "verifyHub",
    },
    {
      key: "morePhotos",
      label: `Add ${PHOTOS_GOOD} or more photos`,
      why: "More photos, more reasons to say yes.",
      points: 10,
      done: input.photoCount >= PHOTOS_GOOD,
      screen: "profileSetup",
    },
    {
      key: "hobbies",
      label: `Pick ${HOBBIES_MIN} or more hobbies`,
      why: "Shared hobbies become your opening lines in chat.",
      points: 10,
      done: (input.hobbies ?? []).filter(filled).length >= HOBBIES_MIN,
      screen: "profileSetup",
    },
    {
      key: "work",
      label: "Add your city and work",
      why: "People look for someone nearby with a life they understand.",
      points: 10,
      done: filled(input.city) && filled(input.profession),
      screen: "profileSetup",
    },
    {
      key: "intent",
      label: "Answer the future questions",
      why: "Timeline, children, family, relocation - so you match on what matters.",
      points: 5,
      done: answers >= 3,
      screen: "alignment",
    },
  ];

  const score = steps.reduce((sum, step) => sum + (step.done ? step.points : 0), 0);
  // The next step is the open one worth the most; a selfie under review is
  // already in hand, so it is skipped rather than nagged about.
  const next =
    steps
      .filter((step) => !step.done && !step.waiting)
      .sort((a, b) => b.points - a.points)[0] ?? null;
  return { score, steps, next };
}
