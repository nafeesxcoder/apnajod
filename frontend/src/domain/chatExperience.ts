import type { ChatMessage, CoupleChatSettings } from '../storage';

export type GifLibraryEntry = {
  uri: string;
  title: string;
  style: string;
  previewEmoji?: string;
  usedAt: number;
};

export const gifLibraryStorageKey='@milaan/chat_gif_library/v1';

const urlPattern=/https?:\/\/[^\s<>"')\]]+/i;
const riskyHostTokens=['bit.ly','tinyurl.com','t.co','cutt.ly','rb.gy','is.gd'];
const scamPathTokens=['login','verify','wallet','crypto','payment','gift-card','password','otp','seed-phrase'];

export function extractFirstUrl(text?:string){
  return text?.match(urlPattern)?.[0]?.replace(/[.,!?;:]+$/,'')??null;
}

function readablePath(pathname:string){
  const value=decodeURIComponent(pathname).replace(/[-_]+/g,' ').replace(/\/+/, ' ').trim();
  if(!value)return 'Shared link';
  return value.split('/').filter(Boolean).slice(0,3).join(' · ').slice(0,80)||'Shared link';
}

export function buildPrivacySafeLinkPreview(text?:string):ChatMessage['linkPreview']|undefined{
  const candidate=extractFirstUrl(text);
  if(!candidate)return undefined;
  try{
    const parsed=new URL(candidate);
    if(!['http:','https:'].includes(parsed.protocol))return undefined;
    const host=parsed.hostname.replace(/^www\./,'').toLowerCase();
    const suspiciousShortener=riskyHostTokens.includes(host);
    const suspiciousPath=scamPathTokens.some(token=>`${host}${parsed.pathname}`.toLowerCase().includes(token));
    const unsafeProtocol=parsed.protocol!=='https:';
    const safety=suspiciousShortener||unsafeProtocol?'danger':suspiciousPath?'caution':'safe';
    return {
      url:parsed.toString(),
      host,
      title:readablePath(parsed.pathname),
      description:safety==='danger'?'Open carefully. This link hides its destination or is not encrypted.':safety==='caution'?'This link contains a sensitive account or payment term. Verify it before opening.':`Shared securely from ${host}`,
      safety,
    };
  }catch{return undefined}
}

export function mergeGifRecents(current:GifLibraryEntry[],entry:GifLibraryEntry,limit=36){
  return [entry,...current.filter(item=>item.uri!==entry.uri)].slice(0,limit);
}

export function toggleGifFavourite(current:GifLibraryEntry[],entry:GifLibraryEntry){
  return current.some(item=>item.uri===entry.uri)?current.filter(item=>item.uri!==entry.uri):[entry,...current].slice(0,100);
}

export function notificationMuteLabel(settings:CoupleChatSettings,now=Date.now()){
  if(settings.notificationMode!=='muted')return settings.notificationMode==='mentions'?'Mentions only':'All messages';
  if(!settings.mutedUntil)return 'Muted until turned back on';
  if(settings.mutedUntil<=now)return 'Mute expired';
  return `Muted until ${new Date(settings.mutedUntil).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`;
}

export function isConversationMuted(settings:CoupleChatSettings,now=Date.now()){
  return settings.notificationMode==='muted'&&(!settings.mutedUntil||settings.mutedUntil>now);
}

export function applyMessageEdit(message:ChatMessage,text:string,editedAt=Date.now()):ChatMessage{
  const clean=text.trim().slice(0,2000);
  return {...message,text:clean,editedAt,linkPreview:buildPrivacySafeLinkPreview(clean)};
}

export function applyMessageDeletion(message:ChatMessage,deletedAt=Date.now()):ChatMessage{
  return {...message,text:undefined,uri:undefined,rose:undefined,snap:undefined,sticker:undefined,voice:undefined,document:undefined,location:undefined,date:undefined,linkPreview:undefined,deletedAt,deletedForEveryone:true};
}

