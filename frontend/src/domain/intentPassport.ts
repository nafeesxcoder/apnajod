import type { Match } from '../data';

export type IntentPassportInput = {
  intent: string;
  alignment: Record<string, string>;
};

export type IntentPassportField = {
  id: 'intent' | 'timeline' | 'children' | 'family' | 'relocation';
  label: string;
  value: string;
  complete: boolean;
};

export type AlignmentBridgeItem = {
  id: IntentPassportField['id'];
  label: string;
  you: string;
  them: string;
  status: 'aligned' | 'discuss' | 'private';
};

const PRIVATE_VALUE = 'Not shared yet';

const fieldDefinitions: Array<{id:IntentPassportField['id'];label:string;key?:string}> = [
  {id:'intent',label:'Commitment'},
  {id:'timeline',label:'Marriage pace',key:'timeline'},
  {id:'children',label:'Children',key:'children'},
  {id:'family',label:'Family role',key:'family'},
  {id:'relocation',label:'Home base',key:'relocation'},
];

const normalize = (value: string) => value.toLowerCase().replace(/[–—-]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

function concept(id: IntentPassportField['id'], value: string) {
  const text = normalize(value);
  if (!text || value === PRIVATE_VALUE) return '';
  if (id === 'intent') {
    if (text.includes('marriage')) return 'marriage';
    if (text.includes('long term')) return 'long_term';
  }
  if (id === 'timeline') {
    if (text.includes('1 2') || text.includes('within 1')) return '1_2';
    if (text.includes('2 3') || text.includes('within 2')) return '2_3';
    if (text.includes('right')) return 'when_ready';
  }
  if (id === 'children') {
    if (text.includes('do not') || text.includes('does not')) return 'no';
    if (text.includes('open')) return 'open';
    if (text.includes('want')) return 'yes';
  }
  if (id === 'family') {
    if (text.includes('deep') || text.includes('involved')) return 'close';
    if (text.includes('boundar') || text.includes('balanced')) return 'balanced';
    if (text.includes('independent')) return 'independent';
  }
  if (id === 'relocation') {
    if (text.includes('open') || text.startsWith('yes')) return 'open';
    if (text.includes('depend') || text.includes('discuss')) return 'discuss';
    if (text.includes('prefer') || text.includes('stay')) return 'stay';
  }
  return text;
}

function matchValue(match: Match, id: IntentPassportField['id']) {
  if (id === 'intent') return match.intent;
  if (id === 'timeline') return match.timeline;
  if (id === 'children') return match.children;
  if (id === 'family') return match.family;
  return match.relocation;
}

export function buildIntentPassport(input: IntentPassportInput) {
  const fields = fieldDefinitions.map((definition):IntentPassportField => {
    const value = definition.id === 'intent' ? input.intent : input.alignment[definition.key ?? ''];
    return {id:definition.id,label:definition.label,value:value?.trim() || PRIVATE_VALUE,complete:Boolean(value?.trim())};
  });
  const completedCount = fields.filter(field => field.complete).length;
  return {
    fields,
    completedCount,
    totalCount: fields.length,
    ready: completedCount === fields.length,
    summary: completedCount === fields.length ? 'Your future essentials are clear' : `${completedCount} of ${fields.length} future essentials shared`,
  };
}

export function buildAlignmentBridge(input: IntentPassportInput, match: Match) {
  const passport = buildIntentPassport(input);
  const items = passport.fields.map((field):AlignmentBridgeItem => {
    const them = matchValue(match, field.id);
    if (!field.complete) return {...field,you:PRIVATE_VALUE,them,status:'private'};
    const yours = concept(field.id, field.value);
    const theirs = concept(field.id, them);
    const compatibleIntent = field.id === 'intent' && (yours === 'marriage' || theirs === 'marriage') && ['marriage','long_term'].includes(yours) && ['marriage','long_term'].includes(theirs);
    return {...field,you:field.value,them,status:yours === theirs || compatibleIntent ? 'aligned' : 'discuss'};
  });
  const alignedCount = items.filter(item => item.status === 'aligned').length;
  const discussion = items.find(item => item.status === 'discuss');
  const privateItem = items.find(item => item.status === 'private');
  const conversationPrompt = discussion
    ? `How do you imagine ${discussion.label.toLowerCase()} working in a serious relationship?`
    : privateItem
      ? `What does a future-ready relationship look like to you?`
      : `What would help a serious relationship feel steady and mutual to you?`;
  return {items,alignedCount,conversationPrompt,hasPrivateFields:Boolean(privateItem)};
}
