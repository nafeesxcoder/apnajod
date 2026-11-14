import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { safetyApi, type BlockedPerson } from '../../../api/safetyApi';
import { Avatar } from '../../posts/PostSheets';
import { Linking, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, shared } from '../../../components';
import { SheetHeader } from '../../../components/sheets/SheetHeader';
import { MiniPremiumIcon, PremiumIcon } from '../../../components/premium/PremiumIcon';
import type { Match } from '../../../data';
import type { ExperienceMode } from '../../../domain/coupleMode';
import { buildReportActionPlan } from '../../../domain/safety';
import type { ChatMessage, LocalReport } from '../../../storage';
import { colors } from '../../../theme';
import { chatStyles, discoveryStyles, safetyStyles, styles } from '../../../theme/appStyles';

const reportReasons=['Fake or misleading profile','Harassment or disrespect','Asked for money','Inappropriate content','Safety concern','Something else'];

export function SafetyActions({mode='seeking',visible,match:matchProp,isBlocked=false,onClose,onSafetyCenter,onReport,onBlock,onUnblock,onUnmatch}:{mode?:ExperienceMode;visible:boolean;match?:Match|null;isBlocked?:boolean;onClose:()=>void;onSafetyCenter:()=>void;onReport:(reason:string,details?:string)=>void|Promise<unknown>;onBlock:()=>void|Promise<unknown>;onUnblock:()=>void;onUnmatch:()=>void}){
  const [reportMode,setReportMode]=useState(false);
  const [confirmAction,setConfirmAction]=useState<'block'|'unblock'|'unmatch'|null>(null);
  const [reason,setReason]=useState('');
  const [details,setDetails]=useState('');
  // Like Instagram: reporting offers to block in the same step, on by default,
  // so the reporter is rid of the person straight away.
  const [alsoBlock,setAlsoBlock]=useState(true);
  if(!matchProp) return null;
  const match=matchProp;
  const close=()=>{setReportMode(false);setConfirmAction(null);setReason('');setDetails('');setAlsoBlock(true);onClose()};
  const submitReport=async()=>{
    const block=alsoBlock&&!isBlocked;
    const text=details.trim()||undefined;
    close();
    await onReport(reason,text);
    if(block) await onBlock();
  };
  const confirmCopy=confirmAction==='block'
    ? {title:`Block ${match.name}?`,body:mode==='couple'?'This hides the shared conversation on this account. They are not notified by this preview.':'You will no longer see each other in matches, likes or chats. They are not notified.',icon:'ban-outline' as const,label:'Block privately',action:onBlock}
    : confirmAction==='unblock'
    ? {title:`Unblock ${match.name}?`,body:'You will be able to see each other in matches, likes and chats again.',icon:'checkmark-circle-outline' as const,label:'Unblock',action:onUnblock}
    : {title:`Unmatch ${match.name}?`,body:'This removes the connection and conversation from your Apnajoda preview.',icon:'person-remove-outline' as const,label:'Unmatch',action:onUnmatch};
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><Pressable style={chatStyles.modalBackdrop} onPress={close}/><SafeAreaView style={[chatStyles.sheet,{maxHeight:'82%'}]}>{confirmAction?<><SheetHeader title={confirmCopy.title} subtitle="This action helps keep your space intentional." onClose={close}/><View style={safetyStyles.confirmCard}><PremiumIcon name={confirmCopy.icon} tone="ruby" size={58} iconSize={27}/><View style={{flex:1}}><Text style={styles.cardTitle}>{confirmCopy.title}</Text><Text style={styles.helper}>{confirmCopy.body}</Text></View></View><View style={safetyStyles.confirmActions}><Button label="Keep connection" variant="secondary" onPress={()=>setConfirmAction(null)}/><Button label={confirmCopy.label} icon={confirmCopy.icon} onPress={()=>{confirmCopy.action();close()}}/></View></>:reportMode?<><SheetHeader title="Report privately" subtitle={`${match.name} will not be notified`} onClose={close}/><ScrollView contentContainerStyle={{gap:9}}>{reportReasons.map(item=><Pressable key={item} onPress={()=>setReason(item)} style={[safetyStyles.reason,reason===item&&safetyStyles.reasonOn]}><Text style={safetyStyles.reasonText}>{item}</Text><MiniPremiumIcon name={reason===item?'checkmark-circle':'ellipse-outline'} tone={reason===item?'gold':'dark'} size={32} iconSize={15}/></Pressable>)}<TextInput value={details} onChangeText={setDetails} multiline maxLength={500} placeholder="Add details · optional" placeholderTextColor="#20558B" style={safetyStyles.reportInput}/>{!isBlocked&&<Pressable accessibilityRole="checkbox" accessibilityState={{checked:alsoBlock}} onPress={()=>setAlsoBlock(v=>!v)} style={[safetyStyles.reason,alsoBlock&&safetyStyles.reasonOn]}><View style={{flex:1}}><Text style={safetyStyles.reasonText}>{`Also block ${match.name}`}</Text><Text style={styles.helper}>You won't see each other in matches, likes or chats. They are not notified.</Text></View><MiniPremiumIcon name={alsoBlock?'checkbox':'square-outline'} tone={alsoBlock?'gold':'dark'} size={32} iconSize={15}/></Pressable>}</ScrollView><Button disabled={!reason} label={alsoBlock&&!isBlocked?'Report and block':'Submit report'} onPress={()=>void submitReport()}/></>:<><SheetHeader title={match.name} subtitle="Your safety and boundaries come first" onClose={close}/><SafetyAction icon="shield-checkmark-outline" title="Safety Center" body="Check-ins, guidance and privacy controls" onPress={onSafetyCenter}/><SafetyAction icon="flag-outline" title="Report" body="Privately alert the Apnajoda safety team" onPress={()=>setReportMode(true)}/>{mode!=='couple'&&<SafetyAction icon="person-remove-outline" title="Unmatch" body="Remove this connection and conversation" danger onPress={()=>setConfirmAction('unmatch')}/>}{isBlocked?<SafetyAction icon="checkmark-circle-outline" title="Unblock" body="Let each other appear in matches and chats again" onPress={()=>setConfirmAction('unblock')}/>:<SafetyAction icon="ban-outline" title="Block" body={mode==='couple'?'Hide this shared conversation on your account':'Immediately hide each other everywhere'} danger onPress={()=>setConfirmAction('block')}/>}</>}</SafeAreaView></Modal>
}

function SafetyAction({icon,title,body,onPress,danger}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string;onPress:()=>void;danger?:boolean}){
  return <Pressable onPress={onPress} style={safetyStyles.action}><PremiumIcon name={icon} tone={danger?'ruby':'rose'} size={44} iconSize={20}/><View style={{flex:1}}><Text style={[styles.cardTitle,danger&&{color:colors.danger}]}>{title}</Text><Text style={styles.helper}>{body}</Text></View><MiniPremiumIcon name="chevron-forward" tone="dark" size={30} iconSize={14}/></Pressable>
}

export type SafetyTool = 'plan'|'emergency'|'privacy'|'data'|'delete'|'blocked';

export function SafetyCenter({reports,blockedCount,datePlans,safeCheckIns,preview,initialTool=null,accessToken,onUnblocked,onCheckIn,onDeleteAccount,onBack}:{reports:LocalReport[];blockedCount:number;datePlans:ChatMessage[];safeCheckIns:string[];preview:boolean;initialTool?:SafetyTool|null;accessToken?:string;onUnblocked?:(userId:string)=>void;onCheckIn:(id:string)=>void;onDeleteAccount:()=>void;onBack:()=>void}){
  const [activeTool,setActiveTool]=useState<SafetyTool|null>(initialTool);
  // The real numbers live on the server (this phone only knows what it did itself).
  const [summary,setSummary]=useState<{reports:number;blocked:number;hideActivity:boolean;safeCheckIns?:number}|null>(null);
  const loadSummary=()=>{if(accessToken)void safetyApi.summary(accessToken).then(value=>value&&setSummary(value)).catch(()=>undefined)};
  useEffect(loadSummary,[accessToken]); // eslint-disable-line react-hooks/exhaustive-deps
  return <LinearGradient colors={['#EAEBED',colors.black,colors.black]} style={{flex:1}}>
    <SafeAreaView style={shared.safe}>
      <View style={safetyStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>Safety Center</Text></View>
      <ScrollView contentContainerStyle={safetyStyles.content} showsVerticalScrollIndicator={false}>
        <View style={safetyStyles.hero}><PremiumIcon name="shield-checkmark" tone="gold" size={76} iconSize={36}/><Text style={[shared.h1,{textAlign:'center'}]}>Meet with confidence.</Text><Text style={[shared.body,{textAlign:'center'}]}>Tools for boundaries, safer dates and complete control of your data.</Text></View>
        <View style={safetyStyles.overview}><SafetyStat value={summary?.reports??reports.length} label="Reports submitted"/><Pressable accessibilityRole="button" accessibilityLabel="Blocked accounts" onPress={()=>setActiveTool('blocked')} style={{flex:1}}><SafetyStat value={summary?.blocked??blockedCount} label="People blocked"/></Pressable><SafetyStat value={summary?.safeCheckIns??safeCheckIns.length} label="Safe check-ins"/></View>
        <View style={safetyStyles.promiseCard}><PremiumIcon name="lock-closed" tone="gold" size={48} iconSize={22}/><View style={{flex:1}}><Text style={styles.cardTitle}>Private actions. Clear boundaries.</Text><Text style={styles.helper}>Reports stay confidential, blocks are silent, and date check-ins are yours to control.</Text></View></View>
        {reports.length>0&&<View style={safetyStyles.section}><Text style={styles.sectionLabel}>LATEST REPORT ACTIONS</Text>{reports.slice(-2).reverse().map(report=><SafetyReportPlan key={report.id} report={report}/>)}</View>}
        {datePlans.length>0&&<View style={safetyStyles.section}><Text style={styles.sectionLabel}>DATE CHECK-INS</Text>{datePlans.slice(-2).map(message=><View key={message.id} style={safetyStyles.checkInCard}><PremiumIcon name="calendar" tone="gold" size={42} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>{message.date?.venue}</Text><Text style={styles.helper}>{message.date?.time} · {message.date?.area}</Text></View>{safeCheckIns.includes(message.id)||message.date?.safeByMe?<View style={safetyStyles.safeDone}><MiniPremiumIcon name="checkmark" tone="gold" size={24} iconSize={11}/><Text style={safetyStyles.safeDoneText}>I'm safe</Text></View>:<Pressable onPress={()=>onCheckIn(message.id)} style={safetyStyles.checkInButton}><Text style={safetyStyles.checkInButtonText}>Check in</Text></Pressable>}</View>)}</View>}
        <View style={safetyStyles.warning}><PremiumIcon name="warning-outline" tone="gold" size={44} iconSize={21}/><View style={{flex:1}}><Text style={styles.cardTitle}>Money requests are a red flag</Text><Text style={styles.helper}>Never send money, crypto, gift cards or financial details to someone you met through the app. Report the conversation immediately.</Text></View></View>
        <View style={safetyStyles.section}><Text style={styles.sectionLabel}>SAFETY TOOLS</Text><SafetyAction icon="location-outline" title="Share a date plan" body="Let someone you trust know where you'll be" onPress={()=>setActiveTool('plan')}/><SafetyAction icon="call-outline" title="Emergency help" body="Call local emergency services if you are in immediate danger" onPress={()=>setActiveTool('emergency')}/><SafetyAction icon="document-lock-outline" title="Activity status" body={summary?.hideActivity?'Hidden: nobody sees when you are online':'Choose whether people see when you are online'} onPress={()=>setActiveTool('privacy')}/><SafetyAction icon="ban-outline" title="Blocked accounts" body="See who you blocked and unblock them" onPress={()=>setActiveTool('blocked')}/></View>
        <View style={safetyStyles.section}><Text style={styles.sectionLabel}>YOUR DATA</Text><Pressable onPress={()=>setActiveTool('data')} style={safetyStyles.dataCard}><PremiumIcon name="download-outline" tone="rose" size={42} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>Download my data</Text><Text style={styles.helper}>One file with your profile, matches, posts and the messages you sent.</Text></View><MiniPremiumIcon name="chevron-forward" tone="dark" size={30} iconSize={14}/></Pressable><Pressable onPress={()=>setActiveTool('delete')} style={safetyStyles.deleteCard}><PremiumIcon name="trash-outline" tone="ruby" size={42} iconSize={19}/><View style={{flex:1}}><Text style={[styles.cardTitle,{color:colors.danger}]}>Delete account</Text><Text style={styles.helper}>Permanently remove your account and associated data.</Text></View><MiniPremiumIcon name="chevron-forward" tone="ruby" size={30} iconSize={14}/></Pressable></View>
        <Text style={safetyStyles.disclaimer}>Apnajoda cannot guarantee another person's identity or behavior. Meet in public, arrange your own transport and trust your instincts.</Text>
      </ScrollView>
      {activeTool&&<SafetyToolSheet preview={preview} tool={activeTool} accessToken={accessToken} hideActivity={!!summary?.hideActivity} onHideActivity={(hidden)=>setSummary(current=>current?{...current,hideActivity:hidden}:current)} onUnblocked={(userId)=>{onUnblocked?.(userId);loadSummary()}} datePlans={datePlans} safeCheckIns={safeCheckIns} onCheckIn={onCheckIn} onDeleteAccount={onDeleteAccount} onClose={()=>setActiveTool(null)}/>}
    </SafeAreaView>
  </LinearGradient>
}

function SafetyReportPlan({report}:{report:LocalReport}){
  const plan=buildReportActionPlan(report.reason,report.details);
  const riskTone=plan.risk==='Critical'||plan.risk==='High'?'ruby':plan.risk==='Medium'?'gold':'rose';
  return <View style={safetyStyles.reportPlanCard}><MiniPremiumIcon name="flag-outline" tone={riskTone} size={34} iconSize={16}/><View style={{flex:1}}><Text style={safetyStyles.guardianTitle}>{plan.category.replace('_',' ')} · {plan.risk}</Text><Text style={safetyStyles.guardianBody}>{plan.primaryAction}</Text><Text style={safetyStyles.guardianBody}>{plan.memberCopy}</Text></View><Text style={safetyStyles.reportPlanScore}>{plan.riskScore}</Text></View>
}

function SafetyToolSheet({preview:_preview,tool,accessToken,hideActivity,onHideActivity,onUnblocked,datePlans,safeCheckIns,onCheckIn,onDeleteAccount,onClose}:{preview:boolean;tool:SafetyTool;accessToken?:string;hideActivity:boolean;onHideActivity:(hidden:boolean)=>void;onUnblocked:(userId:string)=>void;datePlans:ChatMessage[];safeCheckIns:string[];onCheckIn:(id:string)=>void;onDeleteAccount:()=>void;onClose:()=>void}){
  const [activityBusy,setActivityBusy]=useState(false);
  const [exportBusy,setExportBusy]=useState(false);
  const [exportNote,setExportNote]=useState('');
  const [blocked,setBlocked]=useState<BlockedPerson[]|null>(null);
  const [unblocking,setUnblocking]=useState<string|null>(null);
  useEffect(()=>{if(tool==='blocked'&&accessToken)void safetyApi.blocked(accessToken).then(setBlocked).catch(()=>setBlocked([]))},[tool,accessToken]);
  const toggleActivity=async()=>{
    if(!accessToken||activityBusy)return;
    const next=!hideActivity;
    setActivityBusy(true);onHideActivity(next);
    const ok=await safetyApi.setHideActivity(accessToken,next).catch(()=>false);
    if(!ok){onHideActivity(!next);setSharePlanStatus('Could not change your activity status. Please try again.')}else setSharePlanStatus(next?'Your activity status is hidden.':'People can see when you are online again.');
    setActivityBusy(false);
  };
  const unblock=async(person:BlockedPerson)=>{
    if(!accessToken)return;
    setUnblocking(person.userId);
    const result=await safetyApi.unblock(accessToken,person.userId).catch(()=>null);
    setUnblocking(null);
    if(result?.saved){setBlocked(list=>(list??[]).filter(p=>p.userId!==person.userId));onUnblocked(person.userId)}
  };
  // The file: downloaded on the website, shared from the phone.
  const downloadData=async()=>{
    if(!accessToken||exportBusy)return;
    setExportBusy(true);setExportNote('');
    try{
      const text=await safetyApi.exportData(accessToken);
      if(Platform.OS==='web'&&typeof document!=='undefined'){
        const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download='apnajoda-my-data.json';document.body.appendChild(link);link.click();link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),2000);
        setExportNote('Downloaded: apnajoda-my-data.json');
      }else{
        await Share.share({title:'My Apnajoda data',message:text});
        setExportNote('Your data is ready. Save it from the share sheet.');
      }
    }catch(e){setExportNote(e instanceof Error?e.message:'Your data could not be prepared.')}
    finally{setExportBusy(false)}
  };
  const [sharedPlan,setSharedPlan]=useState(false);
  const [sharePlanStatus,setSharePlanStatus]=useState('');
  const [emergencyFallback,setEmergencyFallback]=useState(false);
  const latestPlan=[...datePlans].reverse().find(message=>message.date);
  const planText=latestPlan?.date?`Apnajoda meet-up plan: ${latestPlan.date.venue}, ${latestPlan.date.area}, ${latestPlan.date.time}. Safety check-in: ${latestPlan.date.safetyCheckIn?'on':'off'}.`:'No meet-up plan is saved yet. Plan one with Meet up in a chat first.';
  const sharePlan=async()=>{
    setSharedPlan(true);
    setSharePlanStatus('');
    try{await Share.share({title:'Apnajoda date plan',message:planText});setSharePlanStatus('Date plan share card is ready for your trusted contact.')}catch{setSharePlanStatus('Share sheet is unavailable in this preview. Copy this plan from the card above and send it to someone you trust.')}
  };
  const callEmergency=()=>{setEmergencyFallback(false);void Linking.openURL('tel:112').catch(()=>setEmergencyFallback(true))};
  const titles={
    plan:['Share date plan','Send a public-place plan to someone you trust.'] as const,
    emergency:['Emergency help','Fast actions if something feels unsafe.'] as const,
    privacy:['Activity status','Choose whether people see when you are online.'] as const,
    data:['Download my data','Everything Apnajoda keeps about you, in one file.'] as const,
    blocked:['Blocked accounts','People you blocked cannot see you or message you.'] as const,
    delete:['Delete account','Confirm permanent account deletion.'] as const,
  };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,{maxHeight:'86%'}]}><SheetHeader title={titles[tool][0]} subtitle={titles[tool][1]} onClose={onClose}/>
    {tool==='plan'&&<View style={{gap:12}}><View style={safetyStyles.toolHero}><PremiumIcon name="location" tone="gold" size={50} iconSize={23}/><View style={{flex:1}}><Text style={styles.cardTitle}>{latestPlan?.date?.venue??'No active date plan yet'}</Text><Text style={styles.helper}>{latestPlan?.date?`${latestPlan.date.time} · ${latestPlan.date.area}`:'Open chat → Date to create one before sharing.'}</Text></View></View><View style={safetyStyles.sharePreview}><Text style={safetyStyles.shareText}>{planText}</Text></View>{!!sharePlanStatus&&<View style={safetyStyles.inlineNotice}><MiniPremiumIcon name="share-social" tone="gold" size={28} iconSize={13}/><Text style={safetyStyles.inlineNoticeText}>{sharePlanStatus}</Text></View>}{latestPlan&&!safeCheckIns.includes(latestPlan.id)&&<Pressable onPress={()=>onCheckIn(latestPlan.id)} style={safetyStyles.checkInWide}><MiniPremiumIcon name="shield-checkmark" tone="gold" size={26} iconSize={12}/><Text style={safetyStyles.checkInWideText}>Mark this plan as safe after date</Text></Pressable>}<Button disabled={!latestPlan} label={sharedPlan?'Share card prepared':'Share with trusted contact'} icon="share-social" onPress={()=>void sharePlan()}/></View>}
    {tool==='emergency'&&<View style={{gap:12}}><View style={safetyStyles.emergencyCard}><PremiumIcon name="warning" tone="ruby" size={54} iconSize={25}/><View style={{flex:1}}><Text style={[styles.cardTitle,{color:colors.danger}]}>If you are in immediate danger</Text><Text style={styles.helper}>Leave the situation if you can, move to a public place, and contact emergency services.</Text></View></View><Button label="Call emergency services" icon="call" variant="gold" onPress={callEmergency}/>{emergencyFallback&&<View style={safetyStyles.emergencyFallback}><MiniPremiumIcon name="call" tone="ruby" size={30} iconSize={14}/><Text style={safetyStyles.emergencyFallbackText}>This preview could not open your phone dialer. Please call local emergency services immediately from your device.</Text></View>}<View style={safetyStyles.toolList}>{['Keep conversations in Apnajoda until trust is built.','Do not share exact home/work address early.','Use your own transport for first dates.','Report pressure, money requests, threats or fake identity.'].map(item=><View key={item} style={safetyStyles.toolRow}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={26} iconSize={12}/><Text style={safetyStyles.toolRowText}>{item}</Text></View>)}</View></View>}
    {tool==='privacy'&&<View style={{gap:11}}><SafetyLocalToggle title="Hide activity status" body="Nobody sees whether you are online or when you were last active. Like Instagram, you will not see theirs either." value={hideActivity} onPress={()=>void toggleActivity()}/>{!!sharePlanStatus&&<View style={safetyStyles.inlineNotice}><MiniPremiumIcon name="lock-closed" tone="gold" size={28} iconSize={13}/><Text style={safetyStyles.inlineNoticeText}>{sharePlanStatus}</Text></View>}</View>}
    {tool==='blocked'&&<View style={{gap:10}}>{blocked===null?<Text style={styles.helper}>Loading...</Text>:blocked.length===0?<Text style={[styles.helper,{textAlign:'center',padding:16}]}>You have not blocked anyone.</Text>:<ScrollView style={{maxHeight:420}} contentContainerStyle={{gap:8}}>{blocked.map(person=><View key={person.userId} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:6}}><Avatar person={person} size={42}/><View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={styles.cardTitle}>{person.name}</Text><Text numberOfLines={1} style={styles.helper}>@{person.username}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Unblock ${person.username}`} disabled={unblocking===person.userId} onPress={()=>void unblock(person)} style={safetyStyles.checkInButton}><Text style={safetyStyles.checkInButtonText}>{unblocking===person.userId?'...':'Unblock'}</Text></Pressable></View>)}</ScrollView>}</View>}
    {tool==='data'&&<View style={{gap:12}}><View style={safetyStyles.toolHero}><PremiumIcon name="download-outline" tone="rose" size={50} iconSize={23}/><View style={{flex:1}}><Text style={styles.cardTitle}>Your data, one file</Text><Text style={styles.helper}>A JSON file you can keep or open in any text editor.</Text></View></View><View style={safetyStyles.toolList}>{['Account, profile and intent answers','Match filters, likes and passes','Matches, posts and photo links','Messages you sent, people you blocked, reports you made'].map(item=><View key={item} style={safetyStyles.toolRow}><MiniPremiumIcon name="document-text-outline" tone="rose" size={26} iconSize={12}/><Text style={safetyStyles.toolRowText}>{item}</Text></View>)}</View>{!!exportNote&&<View style={safetyStyles.exportReady}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={32} iconSize={15}/><Text style={safetyStyles.exportReadyText}>{exportNote}</Text></View>}<Button disabled={!accessToken||exportBusy} label={exportBusy?'Preparing...':'Download my data'} icon="download" onPress={()=>void downloadData()}/></View>}
    {tool==='delete'&&<View style={{gap:12}}><View style={safetyStyles.deleteConfirm}><PremiumIcon name="trash-outline" tone="ruby" size={58} iconSize={27}/><View style={{flex:1}}><Text style={[styles.cardTitle,{color:colors.danger}]}>Delete your Apnajoda account?</Text><Text style={styles.helper}>This deletes your profile and associated data. Active app-store subscriptions must be managed separately.</Text></View></View><View style={safetyStyles.toolList}>{['Your profile will stop appearing in matches.','Reports and safety records may be retained where legally required.','This preview action clears local app data after confirmation.'].map(item=><View key={item} style={safetyStyles.toolRow}><MiniPremiumIcon name="alert-circle-outline" tone="ruby" size={26} iconSize={12}/><Text style={safetyStyles.toolRowText}>{item}</Text></View>)}</View><Button label="Delete account" icon="trash" onPress={onDeleteAccount}/><Button label="Keep my account" variant="secondary" onPress={onClose}/></View>}
  </SafeAreaView></Modal>
}

function SafetyLocalToggle({title,body,value,onPress}:{title:string;body:string;value:boolean;onPress:()=>void}){
  return <Pressable onPress={onPress} style={safetyStyles.localToggle}><View style={{flex:1}}><Text style={safetyStyles.localToggleTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View><View style={[discoveryStyles.switch,value&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,value&&discoveryStyles.switchThumbOn]}/></View></Pressable>
}

function SafetyStat({value,label}:{value:number;label:string}){return <View style={safetyStyles.stat}><Text style={safetyStyles.statValue}>{value}</Text><Text style={safetyStyles.statLabel}>{label}</Text></View>}