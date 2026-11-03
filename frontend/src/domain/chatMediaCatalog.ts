export type EmojiMotion='laugh'|'cry'|'love'|'kiss'|'angry'|'party'|'surprise'|'sleep'|'celebrate'|'bounce';

export type ChatGifCatalogItem={
  id:string;
  title:string;
  style:string;
  uri:string;
  searchText:string;
  previewEmoji?:string;
  provider?:'catalog'|'giphy';
  attribution?:string;
};

export type CustomChatSticker={
  id:string;
  emoji:string;
  label:string;
  caption:string;
  tone:'ruby'|'rose'|'gold'|'plum'|'cocoa';
  motion:EmojiMotion;
  tags:string;
};

const gifIntents=[
  ['Good morning','morning gm sunrise wake up rise shine hello','☀️'],
  ['Good night','night sleep sweet dreams bedtime moon','🌙'],
  ['Hello','hello hi hey wave namaste','👋'],
  ['Bye for now','bye goodbye see you later','👋'],
  ['Love','love heart romance romantic adore','❤️'],
  ['Big hug','hug hugs cuddle comfort embrace','🤗'],
  ['Kiss','kiss kisses muah smooch love','😘'],
  ['Miss you','miss missing you distance come back','🥺'],
  ['Thinking of you','thinking remember care thoughtful','💭'],
  ['Thank you','thanks thank you grateful appreciate','🙏'],
  ['Sorry','sorry apology forgive my bad','🥺'],
  ['Please','please request pretty please','🙏'],
  ["You're welcome",'welcome anytime pleasure','😊'],
  ['Yes!','yes yup agree absolutely deal','🙌'],
  ['Nope','no nope nah decline','🙅'],
  ['Okay','okay ok fine understood got it','👌'],
  ['Wow','wow amazing impressive beautiful','🤩'],
  ['OMG','omg oh my god shocked','😱'],
  ['Laughing','laugh laughing funny haha hahaha','😂'],
  ['LOL','lol lmao too funny','🤣'],
  ['So cute','cute adorable sweet aww','🥰'],
  ['Blushing','blush blushing shy flirty','😊'],
  ['Excited','excited cant wait hype ready','🤩'],
  ['Celebration','celebrate celebration party yay','🎉'],
  ['Congratulations','congrats congratulations achievement','🥳'],
  ['Proud of you','proud support achievement well done','🥹'],
  ['You got this','encourage encouragement support motivate','💪'],
  ['Coffee time','coffee cafe caffeine date','☕'],
  ['Chai time','chai tea cozy date desi','🫖'],
  ['Foodie mood','food hungry dinner lunch restaurant','😋'],
  ['Date night','date night romantic dinner love','🌹'],
  ['Movie night','movie film popcorn cozy','🍿'],
  ['Road trip','road trip drive car adventure','🚗'],
  ['Travel mood','travel plane vacation holiday trip','✈️'],
  ['Happy dance','dance happy groove party','💃'],
  ['Weekend vibe','weekend friday saturday sunday chill','😎'],
  ['Rainy day','rain rainy weather cozy','🌧️'],
  ['Flowers for you','flowers rose bouquet romantic','💐'],
  ['Heart eyes','heart eyes crush love wow','😍'],
  ['Flirty mood','flirt flirty wink crush','😉'],
  ['Shy smile','shy smile nervous cute','☺️'],
  ['Angry','angry mad upset annoyed','😤'],
  ['Crying','cry crying tears emotional sad','😭'],
  ['Feeling sad','sad low upset comfort','😔'],
  ['Confused','confused what huh question','🤔'],
  ['Waiting','waiting wait patient soon','⏳'],
  ['Typing fast','typing reply message chat','⌨️'],
  ['Facepalm','facepalm oops awkward why','🤦'],
  ['High five','high five team win','🙌'],
  ['Sweet dreams','sweet dreams sleep love night','😴'],
] as const;

const gifStyles=['Classic','Cute','Dramatic','Meme','Romantic','Playful','Cozy','Big reaction','Soft','Sparkle','Bollywood','Desi','Warm','Silly','Premium','Chill','Expressive','Party','Date-night','Everyday'] as const;

const catalogGifUriPrefix='milaan-gif:';

export function buildCatalogGifUri(item:Pick<ChatGifCatalogItem,'id'>|string){
  const id=typeof item==='string'?item:item.id;
  return `${catalogGifUriPrefix}${encodeURIComponent(id)}`;
}

// These 1,000 records are first-party animated reaction variants, not 1,000
// duplicated binary files. Their stable in-app URIs keep preview/native chat
// usable without a provider key, while the provider service can add live,
// correctly-labelled GIPHY media when production credentials are configured.
export const chatGifCatalog:ChatGifCatalogItem[]=gifIntents.flatMap(([title,tags,previewEmoji],intentIndex)=>gifStyles.map((style,styleIndex)=>{
  const id=`gif-${intentIndex+1}-${styleIndex+1}`;
  return {
    id,
    title,
    style,
    uri:buildCatalogGifUri(id),
    previewEmoji,
    provider:'catalog',
    searchText:`${title} ${tags} ${style}`.toLowerCase(),
  };
}));

export const chatGifCatalogCount=chatGifCatalog.length;
const chatGifCatalogById=new Map(chatGifCatalog.map(item=>[item.id,item]));

export function parseCatalogGifUri(uri?:string){
  if(!uri?.startsWith(catalogGifUriPrefix))return null;
  try{
    return chatGifCatalogById.get(decodeURIComponent(uri.slice(catalogGifUriPrefix.length)))??null;
  }catch{
    return null;
  }
}

export function searchChatGifCatalog(query:string){
  const tokens=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!tokens.length)return chatGifCatalog;
  return chatGifCatalog
    .map(item=>({item,score:tokens.reduce((total,token)=>total+(item.searchText.includes(token)?1:0),0)}))
    .filter(result=>result.score>0)
    .sort((left,right)=>right.score-left.score||left.item.title.localeCompare(right.item.title))
    .map(result=>result.item);
}

export const customChatStickers:CustomChatSticker[]=[
  {id:'laugh-attack',emoji:'😂',label:'LAUGH ATTACK',caption:'You win this round!',tone:'ruby',motion:'laugh',tags:'laugh funny lol joke haha'},
  {id:'cant-breathe',emoji:'🤣',label:"I CAN'T BREATHE",caption:'That was way too funny.',tone:'plum',motion:'laugh',tags:'laugh funny lmao rolling'},
  {id:'hug-delivery',emoji:'🤗',label:'HUG DELIVERY',caption:'Emergency comfort incoming.',tone:'gold',motion:'love',tags:'hug hugs comfort cuddle care'},
  {id:'heart-explosion',emoji:'😍',label:'HEART EXPLOSION',caption:'Okay, that was adorable.',tone:'rose',motion:'love',tags:'love heart cute adorable crush'},
  {id:'kiss-incoming',emoji:'😘',label:'KISS INCOMING',caption:'Catch this!',tone:'ruby',motion:'kiss',tags:'kiss love muah romance'},
  {id:'miss-you',emoji:'🥺',label:'MISS YOU',caption:'Come back soon, please.',tone:'rose',motion:'cry',tags:'miss sad emotional come back'},
  {id:'good-morning',emoji:'☀️',label:'GOOD MORNING',caption:'Rise & shine, favorite human.',tone:'gold',motion:'celebrate',tags:'good morning sunrise wake up'},
  {id:'chai-question',emoji:'☕',label:'CHAI?',caption:'This is a serious question.',tone:'cocoa',motion:'bounce',tags:'chai coffee tea date cozy'},
  {id:'proud-of-you',emoji:'🥹',label:'PROUD OF YOU',caption:'Look at you doing amazing things.',tone:'gold',motion:'cry',tags:'proud support congrats achievement'},
  {id:'no-way',emoji:'😱',label:'NO WAY!',caption:'Tell me everything. Right now.',tone:'plum',motion:'surprise',tags:'wow omg shocked surprise'},
  {id:'drama-mode',emoji:'🙄',label:'DRAMA MODE',caption:'And the award goes to…',tone:'plum',motion:'bounce',tags:'drama eye roll funny annoyed'},
  {id:'tiny-angry',emoji:'😤',label:'TINY ANGRY',caption:'I need snacks and five minutes.',tone:'ruby',motion:'angry',tags:'angry mad upset annoyed'},
  {id:'oops',emoji:'🙈',label:'OOPS',caption:'Pretend you did not see that.',tone:'rose',motion:'bounce',tags:'oops awkward shy embarrassed'},
  {id:'chefs-kiss',emoji:'🤌',label:"CHEF'S KISS",caption:'Absolutely perfect.',tone:'gold',motion:'kiss',tags:'perfect chefs kiss amazing'},
  {id:'lets-go',emoji:'🕺',label:"LET'S GO!",caption:'Main-character energy activated.',tone:'plum',motion:'party',tags:'dance party lets go excited'},
  {id:'date-night',emoji:'💃',label:'DATE NIGHT',caption:'Pick the place. I am ready.',tone:'ruby',motion:'party',tags:'date night dance romantic ready'},
  {id:'sleepy',emoji:'😴',label:'SLEEPY MODE',caption:'One last message… maybe.',tone:'plum',motion:'sleep',tags:'sleep tired good night'},
  {id:'thinking',emoji:'🤔',label:'THINKING…',caption:'This needs a very serious answer.',tone:'cocoa',motion:'bounce',tags:'thinking confused question'},
  {id:'deal',emoji:'🤝',label:'DEAL!',caption:'No backing out now.',tone:'gold',motion:'celebrate',tags:'deal agree yes promise'},
  {id:'love-you',emoji:'❤️',label:'LOVE YOU',caption:'Just making sure you remember.',tone:'ruby',motion:'love',tags:'love heart romantic'},
  {id:'butterflies',emoji:'🦋',label:'BUTTERFLIES',caption:'Look what you started.',tone:'plum',motion:'love',tags:'butterflies crush romantic shy'},
  {id:'queen-energy',emoji:'👑',label:'QUEEN ENERGY',caption:'As you should.',tone:'gold',motion:'celebrate',tags:'queen crown proud slay'},
  {id:'forever-question',emoji:'💍',label:'FOREVER?',caption:'No pressure… just a tiny question.',tone:'gold',motion:'love',tags:'forever ring marriage romantic'},
  {id:'party-time',emoji:'🎉',label:'PARTY TIME',caption:'We are celebrating this!',tone:'ruby',motion:'party',tags:'party celebrate congratulations'},
  {id:'cant-even',emoji:'🤦',label:"I CAN'T EVEN",caption:'Please explain yourself.',tone:'plum',motion:'angry',tags:'facepalm confused funny'},
  {id:'slow-clap',emoji:'👏',label:'SLOW CLAP',caption:'Honestly… impressive.',tone:'gold',motion:'celebrate',tags:'clap impressive well done'},
  {id:'side-eye',emoji:'👀',label:'SIDE-EYE',caption:'Interesting. Very interesting.',tone:'cocoa',motion:'surprise',tags:'eyes watching suspicious funny'},
  {id:'call-me',emoji:'📞',label:'CALL ME',caption:'I need the full story.',tone:'ruby',motion:'bounce',tags:'call phone talk story'},
  {id:'on-my-way',emoji:'🚗',label:'ON MY WAY',caption:'Save me a seat.',tone:'gold',motion:'bounce',tags:'car road trip coming soon'},
  {id:'cozy-mode',emoji:'🧸',label:'COZY MODE',caption:'Blanket, snacks, and us.',tone:'rose',motion:'love',tags:'cozy teddy movie night cuddle'},
];

export function buildStickerPayload(sticker:CustomChatSticker){
  return `✨STICKER|${encodeURIComponent(sticker.id)}|${encodeURIComponent(sticker.emoji)}|${encodeURIComponent(sticker.label)}|${encodeURIComponent(sticker.caption)}|${sticker.tone}|${sticker.motion}`;
}

export function parseStickerPayload(text?:string):CustomChatSticker|null{
  if(!text?.startsWith('✨STICKER|'))return null;
  const parts=text.split('|');
  if(parts.length===2){
    const emoji=decodeURIComponent(parts[1]??'✨');
    return {id:'legacy',emoji,label:'JUST FOR YOU',caption:'A little animated reaction.',tone:'rose',motion:classifyEmojiMotion(emoji),tags:''};
  }
  return {
    id:decodeURIComponent(parts[1]??'custom'),
    emoji:decodeURIComponent(parts[2]??'✨'),
    label:decodeURIComponent(parts[3]??'JUST FOR YOU'),
    caption:decodeURIComponent(parts[4]??''),
    tone:(['ruby','rose','gold','plum','cocoa'].includes(parts[5]??'')?parts[5]:'rose') as CustomChatSticker['tone'],
    motion:(['laugh','cry','love','kiss','angry','party','surprise','sleep','celebrate','bounce'].includes(parts[6]??'')?parts[6]:'bounce') as EmojiMotion,
    tags:'',
  };
}

export function classifyEmojiMotion(value:string):EmojiMotion{
  if(/[😂🤣😆😹]/u.test(value))return 'laugh';
  if(/[😭😢🥺😿]/u.test(value))return 'cry';
  if(/[❤️💖💗💕💘💝😍🥰🫶🦋💍🤗🫂]/u.test(value))return 'love';
  if(/[😘😚😗💋🤌]/u.test(value))return 'kiss';
  if(/[😡😠🤬😤🤦]/u.test(value))return 'angry';
  if(/[🎉🥳💃🕺]/u.test(value))return 'party';
  if(/[😱😮😲🤯👀]/u.test(value))return 'surprise';
  if(/[😴🥱💤]/u.test(value))return 'sleep';
  if(/[👏🙌✨🔥👑🤝]/u.test(value))return 'celebrate';
  return 'bounce';
}
