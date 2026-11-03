import type { Match } from '../data';
import type { MatchPreferences } from './matching';

export type GrowthSignal = {
  type: 'view' | 'interested' | 'skip';
  matchId: string;
  createdAt: number;
};

export type ProfileGrowthInput = {
  hasPhoto: boolean;
  verified: boolean;
  hasVoiceIntro: boolean;
  vouchesCount: number;
  vibeCount: number;
  hasIntent: boolean;
};

export type ProfileQuality = {
  stage: 'Starter' | 'Trust building' | 'Ready' | 'Standout';
  completion: number;
  missing: string[];
};

export type DeckHealth = {
  label: 'Needs wider filters' | 'Fresh start' | 'Learning fast' | 'Balanced serious deck' | 'Highly focused deck';
  body: string;
  publicScoreShown: false;
};

export type GrowthIcon =
  | 'camera-outline'
  | 'shield-checkmark-outline'
  | 'mic-outline'
  | 'mic-circle-outline'
  | 'people-outline'
  | 'options-outline'
  | 'sparkles-outline'
  | 'heart-outline'
  | 'refresh-outline'
  | 'calendar-outline'
  | 'chatbubble-ellipses-outline'
  | 'notifications-outline'
  | 'eye-outline'
  | 'trophy-outline';

export type GrowthNudge = {
  id: string;
  title: string;
  body: string;
  icon: GrowthIcon;
  actionLabel: string;
  actionScreen: 'profileSetup' | 'verifyHub' | 'circle' | 'discovery' | 'detail' | 'pricing';
  priority: number;
};

export type RetentionLoopId =
  | 'daily_matches'
  | 'daily_prompt'
  | 'weekly_drop'
  | 'voice_unlock'
  | 'date_reminder'
  | 'quality_feedback'
  | 'coach_suggestion'
  | 'profile_view'
  | 'events_near_you'
  | 'trusted_rewards';

export type RetentionActionScreen =
  | GrowthNudge['actionScreen']
  | 'home'
  | 'profile'
  | 'chat'
  | 'coach'
  | 'events'
  | 'datePlan';

export type RetentionLoop = {
  id: RetentionLoopId;
  title: string;
  body: string;
  icon: GrowthIcon;
  actionLabel: string;
  actionScreen: RetentionActionScreen;
  active: boolean;
  priority: number;
};

export type RetentionPlan = {
  dailyMatches: number;
  weeklyDropCount: number;
  dailyPrompt: string;
  profileViewNotification: { title: string; body: string };
  loops: RetentionLoop[];
};

export type HomeGrowthLoop = {
  profile: ProfileQuality;
  deckHealth: DeckHealth;
  nudges: GrowthNudge[];
  notificationIdeas: Array<{ title: string; body: string }>;
  retention: RetentionPlan;
};

export function evaluateProfileQuality(input: ProfileGrowthInput): ProfileQuality {
  const missing: string[] = [];
  let completion = 0;

  if (input.hasPhoto) completion += 20; else missing.push('Add a clear profile photo');
  if (input.verified) completion += 22; else missing.push('Complete selfie verification');
  if (input.hasVoiceIntro) completion += 16; else missing.push('Record a short voice intro');
  if (input.vouchesCount > 0) completion += Math.min(16, 6 + input.vouchesCount * 4); else missing.push('Invite one trusted vouch');
  if (input.vibeCount >= 5) completion += 16; else missing.push('Pick 5 vibes');
  if (input.hasIntent) completion += 10; else missing.push('Choose relationship intent');

  const safeCompletion = Math.min(100, completion);
  const stage =
    safeCompletion >= 88 ? 'Standout' :
    safeCompletion >= 68 ? 'Ready' :
    safeCompletion >= 40 ? 'Trust building' :
    'Starter';

  return { stage, completion: safeCompletion, missing };
}

export function evaluateDeckHealth(visibleMatches: readonly Match[], signals: readonly GrowthSignal[]): DeckHealth {
  const views = signals.filter((signal) => signal.type === 'view').length;
  const interested = signals.filter((signal) => signal.type === 'interested').length;
  const skips = signals.filter((signal) => signal.type === 'skip').length;

  if (visibleMatches.length === 0) {
    return {
      label: 'Needs wider filters',
      body: 'No profiles match the current filters. Widen city, age, vibe or family preferences.',
      publicScoreShown: false,
    };
  }
  if (signals.length === 0) {
    return {
      label: 'Fresh start',
      body: 'Open a few full profiles so Smart Discovery can learn inside the app.',
      publicScoreShown: false,
    };
  }
  if (views >= 3 || interested >= 2 || skips >= 4) {
    return {
      label: 'Learning fast',
      body: 'Your views, interests and skips are improving tomorrow’s deck.',
      publicScoreShown: false,
    };
  }
  if (visibleMatches.length <= 5) {
    return {
      label: 'Highly focused deck',
      body: 'Your filters are strict. That can feel premium, but too narrow may hide good people.',
      publicScoreShown: false,
    };
  }
  return {
    label: 'Balanced serious deck',
    body: 'A healthy mix of intent, values, lifestyle and location is available today.',
    publicScoreShown: false,
  };
}

export function buildGrowthNudges(input: {
  profile: ProfileQuality;
  deckHealth: DeckHealth;
  visibleMatches: readonly Match[];
  signals: readonly GrowthSignal[];
  dismissedCount: number;
}): GrowthNudge[] {
  const nudges: GrowthNudge[] = [];
  const missing = new Set(input.profile.missing);
  const viewed = input.signals.filter((signal) => signal.type === 'view').length;
  const interested = input.signals.filter((signal) => signal.type === 'interested').length;

  if (missing.has('Add a clear profile photo')) {
    nudges.push({
      id: 'photo',
      title: 'Make your profile feel real',
      body: 'A warm, clear photo is the fastest trust signal before backend verification.',
      icon: 'camera-outline',
      actionLabel: 'Add photo',
      actionScreen: 'profileSetup',
      priority: 100,
    });
  }
  if (missing.has('Complete selfie verification')) {
    nudges.push({
      id: 'verify',
      title: 'Unlock more trust',
      body: 'Verified members feel safer and get better serious-intent responses.',
      icon: 'shield-checkmark-outline',
      actionLabel: 'Verify',
      actionScreen: 'verifyHub',
      priority: 95,
    });
  }
  if (missing.has('Record a short voice intro')) {
    nudges.push({
      id: 'voice',
      title: 'Add a 10-second voice intro',
      body: 'Voice makes the app feel more human without turning it casual.',
      icon: 'mic-outline',
      actionLabel: 'Open profile',
      actionScreen: 'profileSetup',
      priority: 72,
    });
  }
  if (missing.has('Invite one trusted vouch')) {
    nudges.push({
      id: 'vouch',
      title: 'Build your Trusted Circle',
      body: 'One friend vouch creates a safer, more marriage-minded signal.',
      icon: 'people-outline',
      actionLabel: 'Invite',
      actionScreen: 'circle',
      priority: 70,
    });
  }
  if (input.deckHealth.label === 'Needs wider filters') {
    nudges.push({
      id: 'widen_filters',
      title: 'Widen filters gently',
      body: 'Try one more city or remove a must-have vibe so the deck can breathe.',
      icon: 'options-outline',
      actionLabel: 'Adjust',
      actionScreen: 'discovery',
      priority: 98,
    });
  }
  if (viewed < 3 && input.visibleMatches.length > 0) {
    nudges.push({
      id: 'open_profiles',
      title: 'Open 3 full profiles today',
      body: 'Smart Discovery learns more from thoughtful profile views than fast swiping.',
      icon: 'heart-outline',
      actionLabel: 'View first',
      actionScreen: 'detail',
      priority: 65,
    });
  }
  if (interested === 0 && input.visibleMatches.length > 0) {
    nudges.push({
      id: 'send_signal',
      title: 'Choose one intentional yes',
      body: 'A small daily action keeps the experience alive without endless scrolling.',
      icon: 'sparkles-outline',
      actionLabel: 'Send Spark',
      actionScreen: 'pricing',
      priority: 50,
    });
  }
  if (input.dismissedCount >= 8) {
    nudges.push({
      id: 'reset_learning',
      title: 'Reset if the deck feels off',
      body: 'Too many skips can over-train discovery. Tune filters or reset learning.',
      icon: 'refresh-outline',
      actionLabel: 'Tune',
      actionScreen: 'discovery',
      priority: 64,
    });
  }

  return nudges.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

export function buildRetentionPlan(input: {
  visibleMatches: readonly Match[];
  signals: readonly GrowthSignal[];
  dismissedCount: number;
  profile: ProfileGrowthInput;
}): RetentionPlan {
  const dailyMatches = Math.min(5, Math.max(0, input.visibleMatches.length));
  const exceptionalCount = input.visibleMatches.filter((match) => match.match === 'Exceptional Match').length;
  const weeklyDropCount = exceptionalCount || Math.min(3, input.visibleMatches.length);
  const views = input.signals.filter((signal) => signal.type === 'view').length;
  const interested = input.signals.filter((signal) => signal.type === 'interested').length;
  const skips = input.signals.filter((signal) => signal.type === 'skip').length;
  const profile = evaluateProfileQuality(input.profile);
  const dailyPrompt = 'What would make a first date feel safe, warm, and worth a second conversation?';
  const profileViewNotification = profile.completion >= 68
    ? {
      title: 'Someone thoughtful viewed your profile',
      body: 'Unlock the full viewer card after they spend meaningful time on your profile.',
    }
    : {
      title: 'Complete your trust profile to improve view alerts',
      body: profile.missing[0] ? `Next: ${profile.missing[0]}.` : 'A stronger profile creates better return notifications.',
    };

  const loops: RetentionLoop[] = [
    {
      id: 'daily_matches',
      title: '3–5 curated daily matches',
      body: dailyMatches >= 3
        ? `${dailyMatches} serious profiles are ready today — limited enough to feel premium.`
        : 'Widen one filter to restore the 3–5 profile daily rhythm.',
      icon: 'heart-outline',
      actionLabel: 'View today',
      actionScreen: dailyMatches > 0 ? 'detail' : 'discovery',
      active: dailyMatches > 0,
      priority: 100,
    },
    {
      id: 'daily_prompt',
      title: 'Daily relationship prompt',
      body: dailyPrompt,
      icon: 'chatbubble-ellipses-outline',
      actionLabel: 'Answer',
      actionScreen: 'coach',
      active: true,
      priority: 92,
    },
    {
      id: 'weekly_drop',
      title: 'Weekly high-intent match drop',
      body: weeklyDropCount
        ? `${weeklyDropCount} higher-intent profiles can be highlighted as the weekly drop.`
        : 'The weekly drop activates when enough high-intent profiles match your filters.',
      icon: 'sparkles-outline',
      actionLabel: 'Open drop',
      actionScreen: weeklyDropCount ? 'detail' : 'discovery',
      active: weeklyDropCount > 0,
      priority: 88,
    },
    {
      id: 'voice_unlock',
      title: 'Voice intro unlocks',
      body: input.profile.hasVoiceIntro
        ? 'Voice intros are unlocked — use them to make serious profiles feel human fast.'
        : 'Record a 10-second intro to unlock warmer matches and profile depth.',
      icon: 'mic-circle-outline',
      actionLabel: input.profile.hasVoiceIntro ? 'Listen' : 'Record',
      actionScreen: input.profile.hasVoiceIntro ? 'detail' : 'profileSetup',
      active: input.profile.hasVoiceIntro,
      priority: 82,
    },
    {
      id: 'date_reminder',
      title: 'Date plan reminders',
      body: interested
        ? 'You have intent signals ready — suggest a safe café, time and check-in.'
        : 'When you choose someone, Milaan can nudge a safe first-date plan.',
      icon: 'calendar-outline',
      actionLabel: 'Plan date',
      actionScreen: 'datePlan',
      active: interested > 0,
      priority: 78,
    },
    {
      id: 'quality_feedback',
      title: 'Match quality feedback',
      body: input.signals.length
        ? `${views} viewed · ${interested} interested · ${skips} skipped. Tomorrow’s deck learns from this.`
        : 'Give light feedback with views, interests and skips so the deck improves.',
      icon: 'options-outline',
      actionLabel: 'Tune',
      actionScreen: 'discovery',
      active: input.signals.length > 0,
      priority: 74,
    },
    {
      id: 'coach_suggestion',
      title: 'AI coach suggestion',
      body: interested
        ? 'Ask Coach for a warm opener that matches your values and their profile.'
        : 'Coach can polish your bio, prompt answers and first-message tone.',
      icon: 'sparkles-outline',
      actionLabel: 'Ask Coach',
      actionScreen: 'coach',
      active: true,
      priority: 70,
    },
    {
      id: 'profile_view',
      title: 'Someone viewed your profile',
      body: profileViewNotification.body,
      icon: 'eye-outline',
      actionLabel: 'Improve profile',
      actionScreen: 'profile',
      active: input.profile.hasPhoto || input.profile.verified,
      priority: 66,
    },
    {
      id: 'events_near_you',
      title: 'Events near you',
      body: 'Show safe cafés, mixers, speed dates and premium dinners close to their selected city.',
      icon: 'calendar-outline',
      actionLabel: 'Explore',
      actionScreen: 'events',
      active: true,
      priority: 62,
    },
    {
      id: 'trusted_rewards',
      title: 'Trusted Circle rewards',
      body: input.profile.vouchesCount
        ? `${input.profile.vouchesCount} vouch signal${input.profile.vouchesCount === 1 ? '' : 's'} can unlock reward loops and better trust.`
        : 'Invite one trusted friend to earn rewards and make your profile feel safer.',
      icon: 'trophy-outline',
      actionLabel: 'Open Circle',
      actionScreen: 'circle',
      active: input.profile.vouchesCount > 0,
      priority: 58,
    },
  ];

  return {
    dailyMatches,
    weeklyDropCount,
    dailyPrompt,
    profileViewNotification,
    loops: loops.sort((a, b) => b.priority - a.priority),
  };
}

export function buildHomeGrowthLoop(input: {
  visibleMatches: readonly Match[];
  preferences: MatchPreferences;
  signals: readonly GrowthSignal[];
  dismissedCount: number;
  profile: ProfileGrowthInput;
}): HomeGrowthLoop {
  const profile = evaluateProfileQuality(input.profile);
  const deckHealth = evaluateDeckHealth(input.visibleMatches, input.signals);
  const nudges = buildGrowthNudges({
    profile,
    deckHealth,
    visibleMatches: input.visibleMatches,
    signals: input.signals,
    dismissedCount: input.dismissedCount,
  });
  const retention = buildRetentionPlan({
    visibleMatches: input.visibleMatches,
    signals: input.signals,
    dismissedCount: input.dismissedCount,
    profile: input.profile,
  });
  const topMatch = input.visibleMatches[0];
  const notificationIdeas = [
    topMatch ? {
      title: `Today’s intentional pick: ${topMatch.name}`,
      body: `${topMatch.match} · ${topMatch.intent}. Open the full profile when you have a calm minute.`,
    } : {
      title: 'Filters may be too tight',
      body: 'Widen one preference to bring more serious profiles into the deck.',
    },
    {
      title: `${profile.stage} profile`,
      body: profile.missing[0] ? `Next: ${profile.missing[0]}.` : 'Your profile is ready for higher-intent introductions.',
    },
    retention.profileViewNotification,
  ];

  void input.preferences;
  return { profile, deckHealth, nudges, notificationIdeas, retention };
}
