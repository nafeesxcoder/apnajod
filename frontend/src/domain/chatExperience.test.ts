import { applyMessageDeletion, applyMessageEdit, buildPrivacySafeLinkPreview, isConversationMuted, mergeGifRecents, notificationMuteLabel, toggleGifFavourite } from './chatExperience';
import { defaultCoupleChatSettings, type ChatMessage } from '../storage';
import { describe, expect, it } from 'vitest';

const message:ChatMessage={id:'m1',type:'text',text:'hello',createdAt:1,status:'sent'};

describe('chat experience contracts',()=>{
  it('builds privacy-safe rich link cards without fetching the remote page',()=>{
    expect(buildPrivacySafeLinkPreview('See https://example.com/romantic-date')).toMatchObject({host:'example.com',safety:'safe'});
    expect(buildPrivacySafeLinkPreview('Open http://bit.ly/verify')).toMatchObject({safety:'danger'});
  });
  it('edits and deletes messages with explicit audit timestamps',()=>{
    expect(applyMessageEdit(message,' Updated ',20)).toMatchObject({text:'Updated',editedAt:20});
    expect(applyMessageDeletion(message,30)).toMatchObject({text:undefined,deletedAt:30,deletedForEveryone:true});
  });
  it('keeps bounded GIF recents and deterministic favourites',()=>{
    const entry={uri:'milaan-gif:1',title:'Love',style:'Glow',usedAt:1};
    expect(mergeGifRecents([],entry)).toEqual([entry]);
    expect(toggleGifFavourite([],entry)).toEqual([entry]);
    expect(toggleGifFavourite([entry],entry)).toEqual([]);
  });
  it('models temporary and indefinite conversation mute',()=>{
    const muted={...defaultCoupleChatSettings,notificationMode:'muted' as const,mutedUntil:200};
    expect(isConversationMuted(muted,100)).toBe(true);
    expect(isConversationMuted(muted,300)).toBe(false);
    expect(notificationMuteLabel(muted,300)).toBe('Mute expired');
  });
});
