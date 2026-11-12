/**
 * What the app puts in front of people, and where.
 *
 * Four tabs, because the launch build has four things worth a tab: the deck
 * of people, who chose you, your conversations, and your own account. Finding
 * someone by name lives inside the deck's header, not in a tab of its own.
 */
export const primaryNavigation=[
  {label:'Matches',target:'home',purpose:'qualified_introductions'},
  {label:'Likes',target:'likes',purpose:'incoming_interest'},
  {label:'Chats',target:'chats',purpose:'conversations'},
  {label:'Profile',target:'profile',purpose:'trust_and_control'},
] as const;

export type FeatureTier='core'|'supporting'|'delight'|'operations';

export type FeatureSurface='primary_navigation'|'home'|'chat_toolbar'|'chat_attachment_primary'|'chat_attachment_more'|'profile_operations';


export const chatPrimaryAttachments=[
  {id:'camera',label:'Camera',icon:'camera',color:'#1F5286'},
  {id:'gallery',label:'Photo',icon:'images',color:'#194571'},
  // Games sit on the first page: two taps from a chat. They start real
  // conversation, which documents in a dating chat rarely do.
  {id:'games',label:'Games',icon:'game-controller',color:'#235A92'},
  {id:'location',label:'Location',icon:'location',color:'#AA2A44'},
  {id:'more',label:'More',icon:'ellipsis-horizontal',color:'#235A92'},
] as const;

export const chatMoreAttachments=[
  {id:'contact',label:'Contact',icon:'person',color:'#275C4A'},
  {id:'poll',label:'Poll',icon:'stats-chart',color:'#AA2A44'},
  {id:'gif',label:'GIF',icon:'happy',color:'#1D4F81'},
  {id:'document',label:'Document',icon:'document-text',color:'#235A92'},
  {id:'snap',label:'Snap',icon:'aperture',color:'#1D4F81'},
  {id:'face',label:'Face',icon:'person-circle',color:'#153B61'},
  {id:'spark',label:'Spark',icon:'sparkles',color:'#AA2A44'},
  {id:'disappearing',label:'24h',icon:'timer',color:'#AA2A44'},
  {id:'back',label:'Back',icon:'arrow-back',color:'#235A92'},
] as const;

export const featureSurfaceBudgets:Record<FeatureSurface,number>={
  primary_navigation:4,
  home:3,
  chat_toolbar:5,
  chat_attachment_primary:5,
  chat_attachment_more:9,
  profile_operations:8,
};

export const featureCatalog=[
  {id:'daily_matches',tier:'core',entry:'home'},
  {id:'incoming_likes',tier:'core',entry:'likes'},
  {id:'conversations',tier:'core',entry:'chats'},
  {id:'verification_profile',tier:'core',entry:'profile'},
  {id:'filters',tier:'supporting',entry:'home'},
  {id:'find_people',tier:'supporting',entry:'chats'},
  {id:'games_gifs_stickers',tier:'delight',entry:'chat_attachment'},
] as const;

export function buildFeatureFocusSnapshot(){
  const primaryTargets=new Set(primaryNavigation.map(item=>item.target));
  const core=featureCatalog.filter(item=>item.tier==='core');
  const mainNavigationExperiments=primaryNavigation.filter(item=>!['qualified_introductions','incoming_interest','conversations','trust_and_control'].includes(item.purpose));
  return {
    primaryTabCount:primaryNavigation.length,
    mainNavigationExperiments,
    coreDestinationCoverage:core.filter(item=>primaryTargets.has(item.entry as typeof primaryNavigation[number]['target'])).length,
    coreFeatureCount:core.length,
    delightFeatureCount:featureCatalog.filter(item=>item.tier==='delight').length,
    primaryAttachmentCount:chatPrimaryAttachments.length,
    primaryAttachmentOverflow:Math.max(0,chatPrimaryAttachments.length-featureSurfaceBudgets.chat_attachment_primary),
    duplicatePrimaryAttachmentIds:chatPrimaryAttachments.filter((item,index,items)=>items.findIndex(candidate=>candidate.id===item.id)!==index).map(item=>item.id),
  };
}
