import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { SectionTitle, shared } from '../../../components';
import { FilterChip } from '../../../components/selection/FilterChip';
import { MiniPremiumIcon, PremiumIcon } from '../../../components/premium/PremiumIcon';
import { profileCities, vibes } from '../../../data';
import { resolveLaunchMarket } from '../../../domain/cityDensity';
import { defaultMatchFilters, type DiscoverySignal, type MatchFilters } from '../../../storage';
import { colors } from '../../../theme';
import { aiStyles, cityDensityStyles, discoveryStyles, premiumButtonStyles, selectorStyles, styles } from '../../../theme/appStyles';

export function DiscoveryCenterScreen({filters,onFiltersChange,signals,smartDiscovery,crossedPaths,onSmartChange,onCrossedChange,onClear,onBack}:{filters:MatchFilters;onFiltersChange:(filters:MatchFilters)=>void;signals:DiscoverySignal[];smartDiscovery:boolean;crossedPaths:boolean;onSmartChange:(value:boolean)=>void;onCrossedChange:(value:boolean)=>void;onClear:()=>void;onBack:()=>void}){
  const [locationError,setLocationError]=useState('');
  const [citySearch,setCitySearch]=useState('');
  const [verifiedProfilesOnly,setVerifiedProfilesOnly]=useState(true);
  const views=signals.filter(signal=>signal.type==='view').length;
  const likes=signals.filter(signal=>signal.type==='interested').length;
  const skips=signals.filter(signal=>signal.type==='skip').length;
  const update=(patch:Partial<MatchFilters>)=>onFiltersChange({...filters,...patch});
  const toggleArray=(key:'intents'|'mustHaveVibes'|'cities',value:string)=>{const current=filters[key];update({[key]:current.includes(value)?current.filter(item=>item!==value):[...current,value]} as Partial<MatchFilters>)};
  const cityOptions=(citySearch?profileCities.filter(city=>city.toLowerCase().includes(citySearch.toLowerCase())):profileCities).slice(0,42);
  const selectedLaunchMarkets=[...new Map(filters.cities.map(city=>resolveLaunchMarket(city)).filter(Boolean).map(market=>[market!.name,market!])).values()];
  const toggleCrossed=async()=>{
    if(crossedPaths){onCrossedChange(false);return}
    setLocationError('');
    const permission=await Location.requestForegroundPermissionsAsync();
    if(!permission.granted){setLocationError('Approximate location permission is needed for Crossed Paths.');return}
    try{await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Low});onCrossedChange(true)}catch{setLocationError('Location is unavailable right now. Please try again outdoors.')}
  };
  return <LinearGradient colors={['#F4EEE3',colors.black,colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={discoveryStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>AI filters & privacy</Text></View><ScrollView contentContainerStyle={discoveryStyles.content} showsVerticalScrollIndicator={false}>
    <SectionTitle eyebrow="Your choices, your control" title="Smarter matches without spying." body="Milaan learns from your filters, profile views and in-app actions only. You can reset this anytime."/>
    <View style={aiStyles.filterCard}>
      <View style={shared.row}><PremiumIcon name="sparkles" tone="gold" size={42} iconSize={19}/><Text style={[styles.cardTitle,{marginLeft:10}]}>Detailed match filters</Text><View style={shared.spacer}/><Pressable onPress={()=>onFiltersChange(defaultMatchFilters)} style={premiumButtonStyles.smallGhost}><Text style={discoveryStyles.manageText}>Reset</Text></Pressable></View>
      <FilterSection title="Looking for">{(['Women','Men','Everyone'] as const).map(option=><FilterChip key={option} label={option} active={filters.lookingFor===option} onPress={()=>update({lookingFor:option})}/>)}</FilterSection>
      <FilterSection title={`Age range · ${filters.minAge}-${filters.maxAge}`}><FilterChip label="25-30" active={filters.minAge===25&&filters.maxAge===30} onPress={()=>update({minAge:25,maxAge:30})}/><FilterChip label="25-35" active={filters.minAge===25&&filters.maxAge===35} onPress={()=>update({minAge:25,maxAge:35})}/><FilterChip label="30-35" active={filters.minAge===30&&filters.maxAge===35} onPress={()=>update({minAge:30,maxAge:35})}/></FilterSection>
      <FilterSection title="Relationship intent">{['Marriage','Long-term, leading to Marriage','Long-term Relationship'].map(option=><FilterChip key={option} label={option} active={filters.intents.includes(option)} onPress={()=>toggleArray('intents',option)}/>)}</FilterSection>
      <FilterSection title="Family priority"><FilterChip label="Any" active={filters.familyPriority==='any'} onPress={()=>update({familyPriority:'any'})}/><FilterChip label="Family First" active={filters.familyPriority==='high'} onPress={()=>update({familyPriority:'high'})}/><FilterChip label="Balanced" active={filters.familyPriority==='balanced'} onPress={()=>update({familyPriority:'balanced'})}/></FilterSection>
      <FilterSection title="Future plans"><FilterChip label="Any children plan" active={filters.children==='any'} onPress={()=>update({children:'any'})}/><FilterChip label="Wants children" active={filters.children==='wants'} onPress={()=>update({children:'wants'})}/><FilterChip label="Open to children" active={filters.children==='open'} onPress={()=>update({children:'open'})}/><FilterChip label="Marriage 1-2 yrs" active={filters.marriageTimeline==='1_2_years'} onPress={()=>update({marriageTimeline:'1_2_years'})}/><FilterChip label="Marriage 2-3 yrs" active={filters.marriageTimeline==='2_3_years'} onPress={()=>update({marriageTimeline:'2_3_years'})}/></FilterSection>
      <FilterSection title="Must-have vibe">{vibes.map(option=><FilterChip key={option} label={option} active={filters.mustHaveVibes.includes(option)} onPress={()=>toggleArray('mustHaveVibes',option)}/>)}</FilterSection>
      <View style={{gap:8}}><Text style={styles.sectionLabel}>CITY / LOCATION</Text><View style={selectorStyles.searchBox}><MiniPremiumIcon name="search" tone="rose" size={32} iconSize={15}/><TextInput value={citySearch} onChangeText={setCitySearch} placeholder="Search your city" placeholderTextColor="#51484B" style={selectorStyles.searchInput}/></View><View style={aiStyles.filterWrap}>{cityOptions.map(option=><FilterChip key={option} label={option} active={filters.cities.includes(option)} onPress={()=>toggleArray('cities',option)}/>)}</View></View>
      <FilterSection title="Location preference"><FilterChip label="Anywhere" active={filters.distancePreference==='anywhere'} onPress={()=>update({distancePreference:'anywhere'})}/><FilterChip label="Selected cities only" active={filters.distancePreference==='selected_cities'} onPress={()=>update({distancePreference:'selected_cities'})}/><FilterChip label="Same state/province" active={filters.distancePreference==='same_state'} onPress={()=>update({distancePreference:'same_state'})}/><FilterChip label="Open to relocate" active={filters.distancePreference==='open_to_relocate'} onPress={()=>update({distancePreference:'open_to_relocate'})}/></FilterSection>
      <FilterSection title="Relocation"><FilterChip label="Any" active={filters.relocation==='any'} onPress={()=>update({relocation:'any'})}/><FilterChip label="Open to relocate" active={filters.relocation==='open'} onPress={()=>update({relocation:'open'})}/><FilterChip label="Prefers same city" active={filters.relocation==='same_city'} onPress={()=>update({relocation:'same_city'})}/></FilterSection>
    </View>
    <CityCoverageCard selectedCities={filters.cities} launchMarkets={selectedLaunchMarkets}/>
    <View style={discoveryStyles.neverTrack}><PremiumIcon name="eye-off-outline" tone="ruby" size={50} iconSize={23}/><View style={{flex:1}}><Text style={styles.cardTitle}>What we never read</Text><Text style={styles.helper}>Browser or Google searches, messages outside Milaan, contacts, photos you don’t select, microphone activity, or usage in other apps.</Text></View></View>
    <DiscoveryToggle icon="sparkles" title="Smart Discovery" body="Reorders daily matches using your stated preferences, profile views, interests and skips." value={smartDiscovery} onPress={()=>onSmartChange(!smartDiscovery)}/>
    <DiscoveryToggle icon="walk" title="Crossed Paths" body="Shows opted-in members whose approximate area overlapped with yours. Exact place and time stay hidden." value={crossedPaths} onPress={()=>void toggleCrossed()}/>
    <DiscoveryToggle icon="shield-checkmark" title="Verified profiles only" body="Frontend option is ready. Your developer can connect it to the verified-member field in the matching API." value={verifiedProfilesOnly} onPress={()=>setVerifiedProfilesOnly(value=>!value)}/>
    {!!locationError&&<Text style={styles.formError}>{locationError}</Text>}
    <View style={discoveryStyles.activityCard}><View style={shared.row}><Text style={styles.cardTitle}>Your in-app activity</Text><View style={shared.spacer}/><Text style={styles.helper}>On this device</Text></View><View style={discoveryStyles.stats}><DiscoveryStat value={views} label="Profiles viewed"/><DiscoveryStat value={likes} label="Interested"/><DiscoveryStat value={skips} label="Skipped"/></View><Pressable disabled={!signals.length} onPress={onClear} style={[discoveryStyles.clearButton,!signals.length&&{opacity:.4}]}><PremiumIcon name="trash-outline" tone="ruby" size={30} iconSize={13}/><Text style={discoveryStyles.clearText}>Clear activity and reset learning</Text></Pressable></View>
    <View style={aiStyles.privacyPolicyCard}><PremiumIcon name="lock-closed" tone="gold" size={46} iconSize={20}/><View style={{flex:1}}><Text style={styles.cardTitle}>AI Privacy Policy</Text><Text style={styles.helper}>Your filters and in-app signals improve ranking. Exact scores stay internal, and you can reset learning anytime.</Text></View></View>
    <View style={discoveryStyles.privacyGrid}><PrivacyPoint icon="location-outline" title="Approximate only" body="Location filters are preference-based; Crossed Paths uses low-accuracy foreground location only."/><PrivacyPoint icon="people-outline" title="Both must opt in" body="You appear in Crossed Paths only when both members enable it."/><PrivacyPoint icon="time-outline" title="Delayed display" body="Profiles appear later, never as a live location tracker."/><PrivacyPoint icon="shield-checkmark-outline" title="Block always wins" body="Blocked or reported members never appear in discovery."/></View>
  </ScrollView></SafeAreaView></LinearGradient>
}

function CityCoverageCard({selectedCities,launchMarkets}:{selectedCities:string[];launchMarkets:ReturnType<typeof resolveLaunchMarket>[]}){
  const validMarkets=launchMarkets.filter((market):market is NonNullable<typeof market>=>Boolean(market));
  const [densityMode,setDensityMode]=useState<'city'|'metro'|'waitlist'>('city');
  const [densityStatus,setDensityStatus]=useState('Choose how Milaan should respond when your city does not yet have balanced verified supply.');
  const primaryCity=selectedCities[0]??'';
  const chooseDensityMode=(mode:'city'|'metro'|'waitlist')=>{
    setDensityMode(mode);
    const label=mode==='city'?'City only':mode==='metro'?'Expand to nearby metro':'Waitlist until balanced';
    setDensityStatus(`${label} selected in the frontend. Your developer will connect live density checks and matching enforcement.`);
  };
  return <View style={cityDensityStyles.memberCard}>
    <View style={shared.row}><PremiumIcon name="location" tone="gold" size={46} iconSize={21}/><View style={{flex:1,marginLeft:10}}><Text style={styles.kicker}>CITY AVAILABILITY</Text><Text style={styles.cardTitle}>{selectedCities.length?'Your selected communities':'Choose where you want to build'}</Text></View></View>
    <Text style={styles.helper}>{selectedCities.length?`${selectedCities.length} location${selectedCities.length===1?'':'s'} selected. Reciprocal matches are prioritized within your choices and relocation preference.`:'Search any Indian city above. Launch communities open gradually when verified supply is balanced.'}</Text>
    {!!validMarkets.length&&<View style={cityDensityStyles.memberMarketList}>{validMarkets.map(market=><View key={market.name} style={cityDensityStyles.memberMarketRow}><MiniPremiumIcon name="people-outline" tone="rose" size={28} iconSize={13}/><View style={{flex:1}}><Text style={cityDensityStyles.memberMarketName}>{market.market}</Text><Text style={cityDensityStyles.memberMarketMeta}>Founding community · verified members first</Text></View></View>)}</View>}
    <View style={cityDensityStyles.memberDensityCard}>
      <View style={cityDensityStyles.memberDensityHeader}><PremiumIcon name="people-circle-outline" tone="ruby" size={48} iconSize={22}/><View style={{flex:1}}><Text style={cityDensityStyles.memberDensityEyebrow}>VERIFIED USER DENSITY</Text><Text style={cityDensityStyles.memberDensityTitle}>{primaryCity||'Select one city above'}</Text><Text style={cityDensityStyles.memberDensityBody}>Density should unlock only when verified, recently active and mutually eligible members form a privacy-safe pool.</Text></View><View style={cityDensityStyles.memberDensityPending}><View style={cityDensityStyles.memberDensityDot}/><Text style={cityDensityStyles.memberDensityPendingText}>API PENDING</Text></View></View>
      <View style={cityDensityStyles.memberDensitySignals}>{([
        ['Verified active members','Live count required','shield-checkmark-outline' as const],
        ['Reciprocal candidates','Intent + preference balance','git-compare-outline' as const],
        ['Privacy-safe minimum','Small cohorts stay hidden','eye-off-outline' as const],
        ['Healthy outcomes','Replies, dates, safety','heart-circle-outline' as const],
      ] as const).map(([title,value,icon])=><View key={title} style={cityDensityStyles.memberDensitySignal}><MiniPremiumIcon name={icon} tone="dark" size={28} iconSize={13}/><View style={{flex:1}}><Text style={cityDensityStyles.memberDensitySignalTitle}>{title}</Text><Text style={cityDensityStyles.memberDensitySignalValue}>{value}</Text></View></View>)}</View>
      <Text style={cityDensityStyles.memberDensityChoiceLabel}>IF THIS CITY IS NOT READY</Text>
      <View style={cityDensityStyles.memberDensityChoices}>{([
        ['city','City only','Keep my boundary strict','business-outline'],
        ['metro','Nearby metro','Use a wider, named area','navigate-circle-outline'],
        ['waitlist','Waitlist','Notify me when balanced','notifications-outline'],
      ] as const).map(([id,title,body,icon])=>{const active=densityMode===id;return <Pressable disabled={!primaryCity} accessibilityRole="radio" accessibilityState={{checked:active,disabled:!primaryCity}} key={id} onPress={()=>chooseDensityMode(id)} style={[cityDensityStyles.memberDensityChoice,active&&cityDensityStyles.memberDensityChoiceOn,!primaryCity&&cityDensityStyles.memberDensityChoiceDisabled]}><MiniPremiumIcon name={active?'checkmark-circle':icon} tone={active?'gold':'dark'} size={30} iconSize={14}/><View style={{flex:1}}><Text style={cityDensityStyles.memberDensityChoiceTitle}>{title}</Text><Text style={cityDensityStyles.memberDensityChoiceBody}>{body}</Text></View></Pressable>})}</View>
      <View style={cityDensityStyles.memberDensityStatus}><Ionicons name="code-slash-outline" size={16} color={colors.gold}/><Text style={cityDensityStyles.memberDensityStatusText}>{densityStatus}</Text></View>
    </View>
    <View style={cityDensityStyles.privacyRow}><MiniPremiumIcon name="shield-checkmark-outline" tone="gold" size={26} iconSize={12}/><Text style={cityDensityStyles.privacyText}>No exact coordinates are used for city filters. Crossed Paths stays separately opt-in and approximate.</Text></View>
  </View>
}

function DiscoveryToggle({icon,title,body,value,onPress}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string;value:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={discoveryStyles.toggleCard}><PremiumIcon name={icon} tone={value?'gold':'ruby'} size={52} iconSize={23}/><View style={{flex:1}}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View><View style={[discoveryStyles.switch,value&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,value&&discoveryStyles.switchThumbOn]}/></View></Pressable>}
function FilterSection({title,children}:{title:string;children:React.ReactNode}){return <View style={aiStyles.filterSection}><Text style={styles.sectionLabel}>{title.toUpperCase()}</Text><View style={aiStyles.filterWrap}>{children}</View></View>}
function DiscoveryStat({value,label}:{value:number;label:string}){return <View style={discoveryStyles.stat}><Text style={discoveryStyles.statValue}>{value}</Text><Text style={discoveryStyles.statLabel}>{label}</Text></View>}
function PrivacyPoint({icon,title,body}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string}){return <View style={discoveryStyles.privacyPoint}><PremiumIcon name={icon} tone="ruby" size={38} iconSize={17}/><Text style={discoveryStyles.privacyTitle}>{title}</Text><Text style={discoveryStyles.privacyBody}>{body}</Text></View>}


