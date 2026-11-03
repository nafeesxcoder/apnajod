import type { ProfileDraft } from '../storage';

export type ProfileCompletionInput = {
  profile: ProfileDraft;
  verified: boolean;
  photoCount: number;
  hasVoiceIntro: boolean;
  vouchCount: number;
  vibeCount: number;
  intent: string;
  lastReminderShownAt: number;
  now?: number;
};

export type ProfileCompletionTask = {
  id: 'identity' | 'photos' | 'voice' | 'vouches' | 'vibes' | 'intent';
  label: string;
  points: number;
  complete: boolean;
};

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function buildProfileCompletion(input: ProfileCompletionInput) {
  const identityComplete = Boolean(
    input.verified
      && input.profile.firstName.trim()
      && Number(input.profile.age) >= 18
      && input.profile.city.trim()
      && input.profile.profession.trim(),
  );
  const tasks: ProfileCompletionTask[] = [
    { id: 'identity', label: 'Complete your verified profile details', points: 30, complete: identityComplete },
    { id: 'photos', label: 'Add at least three clear photos', points: 25, complete: input.photoCount >= 3 },
    { id: 'voice', label: 'Record a short voice introduction', points: 10, complete: input.hasVoiceIntro },
    { id: 'vouches', label: 'Invite one trusted vouch', points: 10, complete: input.vouchCount >= 1 },
    { id: 'vibes', label: 'Choose at least three values or vibes', points: 15, complete: input.vibeCount >= 3 },
    { id: 'intent', label: 'Confirm your relationship intent', points: 10, complete: Boolean(input.intent.trim()) },
  ];
  const score = tasks.reduce((total, task) => total + (task.complete ? task.points : 0), 0);
  const nextTask = tasks.find((task) => !task.complete) ?? null;
  const now = input.now ?? Date.now();
  const reminderDue = score < 100 && (input.lastReminderShownAt <= 0 || now - input.lastReminderShownAt >= REMINDER_INTERVAL_MS);
  return {
    score,
    complete: score === 100,
    tasks,
    nextTask,
    reminderDue,
    reminderTitle: score >= 80 ? 'Your profile is almost ready' : 'Complete your profile',
    reminderBody: nextTask ? `${score}% complete · ${nextTask.label}. Stronger profiles receive more relevant introductions.` : 'Your profile is complete.',
  };
}

export const profileCompletionReminderIntervalMs = REMINDER_INTERVAL_MS;
