import { useRef } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Chip, shared } from '../../../components';
import { MiniPremiumIcon, PremiumIcon } from '../../../components/premium/PremiumIcon';
import type { Match } from '../../../data';
import { aiStyles, homeCleanStyles, styles, swipeStyles } from '../../../theme/appStyles';

export function MatchCard({match,reasons,onPress,onInterested,onSkip,onRose,compact=false,featuredHome=false}:{match:Match;reasons:string[];onPress:()=>void;onInterested:()=>void;onSkip:()=>void;onRose:()=>void;compact?:boolean;featuredHome?:boolean}){
  const {width}=useWindowDimensions();
  const focalPoints:Record<string,string>={'1':'center 24%','2':'center 20%','3':'center 18%','4':'center 22%','5':'center 24%','6':'center 20%','7':'center 18%','27':'center 20%','28':'center 22%','29':'center 18%','30':'center 22%','31':'center 20%'};
  const photoFocalPoint=focalPoints[match.id]??'center 22%';
  const pan=useRef(new Animated.ValueXY()).current;
  const rotate=pan.x.interpolate({inputRange:[-180,0,180],outputRange:['-8deg','0deg','8deg']});
  const yesOpacity=pan.x.interpolate({inputRange:[20,120],outputRange:[0,1],extrapolate:'clamp'});
  const nopeOpacity=pan.x.interpolate({inputRange:[-120,-20],outputRange:[1,0],extrapolate:'clamp'});
  const roseOpacity=pan.y.interpolate({inputRange:[-150,-35],outputRange:[1,0],extrapolate:'clamp'});
  const visibleReasons=reasons.slice(0,1);
  const visibleVibes=match.vibes.slice(0,2);
  const hiddenVibes=Math.max(0,match.vibes.length-visibleVibes.length);
  const alignmentLabel=match.familyPriority==='high'?'Family-first':'Balanced future';
  const reset=()=>Animated.spring(pan,{toValue:{x:0,y:0},friction:6,tension:75,useNativeDriver:Platform.OS!=='web'}).start();
  const fly=(toValue:{x:number;y:number},done:()=>void)=>Animated.timing(pan,{toValue,duration:190,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'}).start(()=>{pan.setValue({x:0,y:0});done()});
  const panResponder=useRef(PanResponder.create({
    onMoveShouldSetPanResponder:(_,gesture)=>Math.abs(gesture.dx)>8||Math.abs(gesture.dy)>10,
    onPanResponderMove:(_,gesture)=>pan.setValue({x:gesture.dx,y:gesture.dy}),
    onPanResponderRelease:(_,gesture)=>{
      if(gesture.dx>105){fly({x:430,y:gesture.dy},onInterested);return}
      if(gesture.dx<-105){fly({x:-430,y:gesture.dy},onSkip);return}
      if(gesture.dy<-120){fly({x:0,y:-520},onRose);return}
      reset();
    },
    onPanResponderTerminate:reset,
  })).current;
  return <Animated.View {...panResponder.panHandlers} style={[styles.matchCard,!compact&&width<430&&{height:500},compact&&styles.matchCardCompact,featuredHome&&homeCleanStyles.featuredMatchCard,swipeStyles.cardLift,{transform:[{translateX:pan.x},{translateY:pan.y},{rotate}]}]}>
    <Pressable onPress={onPress} style={{width:'100%',height:'100%'}}>
      <Image source={{uri:match.photo}} resizeMode="cover" blurRadius={featuredHome?18:12} style={[styles.matchPhoto,swipeStyles.photoBackdrop,featuredHome&&({objectPosition:photoFocalPoint} as any)]}/>
      <View style={[swipeStyles.subjectStage,featuredHome&&swipeStyles.subjectStageFeatured]}><Image source={{uri:match.photo}} resizeMode="contain" accessibilityLabel={`${match.name}'s complete profile photo`} style={swipeStyles.photoSubject}/></View>
      <LinearGradient colors={['rgba(16,12,13,.04)','rgba(17,13,14,.12)','rgba(17,13,14,.98)']} locations={[0,.38,1]} style={StyleSheet.absoluteFill}/>
      <View style={swipeStyles.matchGlow}/>
      <View style={swipeStyles.photoVignette}/>
      <Animated.View pointerEvents="none" style={[swipeStyles.swipeOverlay,swipeStyles.swipeYes,{opacity:yesOpacity}]}><Text style={swipeStyles.swipeLabel}>SERIOUS YES</Text></Animated.View>
      <Animated.View pointerEvents="none" style={[swipeStyles.swipeOverlay,swipeStyles.swipeNope,{opacity:nopeOpacity}]}><Text style={swipeStyles.swipeLabel}>NOT FOR ME</Text></Animated.View>
      <Animated.View pointerEvents="none" style={[swipeStyles.swipeRose,{opacity:roseOpacity}]}><PremiumIcon name="sparkles" tone="gold" size={46} iconSize={21}/><Text style={swipeStyles.swipeRoseText}>SEND SPARK</Text></Animated.View>
      <View style={styles.matchTop}><View style={swipeStyles.premiumRibbon}><Chip label={featuredHome?'Strong Match':match.match}/></View></View>
      <View style={[styles.matchInfo,compact&&styles.matchInfoCompact]}>
        <View style={shared.row}><View style={{flex:1}}><View style={homeCleanStyles.matchIdentityRow}><Text numberOfLines={1} style={[styles.matchName,compact&&styles.matchNameCompact,featuredHome&&homeCleanStyles.featuredMatchName]}>{match.name}, {match.age}</Text>{match.verified&&<MiniPremiumIcon name="shield-checkmark" tone="ruby" size={featuredHome?32:32} iconSize={14} referenceGlass={featuredHome}/>}{featuredHome&&<Pressable accessibilityRole="button" accessibilityLabel={`Send ${match.name} a Golden Spark`} onPress={onRose} style={homeCleanStyles.sparkNamePill}><MiniPremiumIcon name="sparkles" tone="ruby" size={28} iconSize={12} referenceGlass/><Text style={homeCleanStyles.sparkNameText}>SPARK</Text></Pressable>}</View><Text numberOfLines={1} style={[styles.matchMeta,compact&&styles.matchMetaCompact]}>{match.city}</Text></View>{!featuredHome&&match.verified&&<MiniPremiumIcon name="shield-checkmark" tone="ruby" size={32} iconSize={15}/>}</View>
        {featuredHome?<>
          <Text style={homeCleanStyles.featuredTraits}>{[match.profession,...visibleVibes].join('  ·  ')}</Text>
          <View style={homeCleanStyles.alignmentPills}><View style={homeCleanStyles.alignmentPill}><Ionicons name="heart-outline" size={12} color="#E0D7C9"/><Text style={homeCleanStyles.alignmentPillText}>Values aligned</Text></View><View style={homeCleanStyles.alignmentPill}><Ionicons name="locate-outline" size={12} color="#E0D7C9"/><Text style={homeCleanStyles.alignmentPillText}>Shared goals</Text></View><View style={homeCleanStyles.alignmentPill}><Ionicons name="leaf-outline" size={12} color="#CEA956"/><Text style={homeCleanStyles.alignmentPillText}>Great lifestyle fit</Text></View></View>
        </>:<>
          <View style={swipeStyles.profileSummary}><View style={swipeStyles.summaryItem}><Text style={swipeStyles.summaryLabel}>Intent</Text><Text numberOfLines={2} style={swipeStyles.summaryValue}>{match.intent}</Text></View><View style={swipeStyles.summaryDivider}/><View style={swipeStyles.summaryItem}><Text style={swipeStyles.summaryLabel}>Trust & values</Text><Text numberOfLines={2} style={swipeStyles.summaryValue}>{alignmentLabel} · {match.vouches.count} vouches</Text></View></View>
          {visibleReasons.length>0&&<View style={swipeStyles.reasonCard}><MiniPremiumIcon name="sparkles" tone="gold" size={28} iconSize={13}/><View style={{flex:1}}><Text style={swipeStyles.reasonTitle}>Why this feels aligned</Text><Text numberOfLines={2} style={swipeStyles.reasonBody}>{visibleReasons.join(' · ')}</Text></View></View>}
          <View style={styles.chipRow}>{visibleVibes.map(x=><Chip key={x} label={x}/>)}{hiddenVibes>0&&<View style={swipeStyles.morePill}><Text style={swipeStyles.morePillText}>+{hiddenVibes}</Text></View>}</View>
        </>}
        <View style={styles.cardActions}><Pressable accessibilityRole="button" accessibilityLabel={`Pass on ${match.name}`} accessibilityHint="Removes this profile from the current preview deck" onPress={onSkip} style={({pressed})=>[styles.nope,compact&&styles.nopeCompact,featuredHome&&homeCleanStyles.featuredPass,pressed&&homeCleanStyles.actionPressed]}><PremiumIcon name="close" tone="ruby" size={featuredHome?40:compact?46:52} iconSize={featuredHome?18:compact?21:24}/>{featuredHome&&<View><Text style={homeCleanStyles.featuredPassText}>Pass</Text><Text style={homeCleanStyles.actionSubDark}>See the next profile</Text></View>}</Pressable>{!featuredHome&&<Pressable accessibilityRole="button" accessibilityLabel={`Send ${match.name} a Golden Spark`} onPress={onRose} style={[aiStyles.roseAction,compact&&aiStyles.roseActionCompact]}><PremiumIcon name="sparkles" tone="ruby" size={30} iconSize={14}/><Text style={aiStyles.roseActionText}>Spark</Text></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel={`Interested in ${match.name}`} accessibilityHint="Sends a serious-interest signal" onPress={onInterested} style={({pressed})=>[styles.yes,compact&&styles.yesCompact,featuredHome&&homeCleanStyles.featuredInterested,pressed&&homeCleanStyles.actionPressed]}>{featuredHome&&<LinearGradient pointerEvents="none" colors={['#110D0E','#181314','#6E0E24']} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{borderRadius:28}]}/>} {featuredHome&&<><View pointerEvents="none" style={homeCleanStyles.ctaLightStreak}/><View pointerEvents="none" style={homeCleanStyles.ctaSparkDot}/></>}<MiniPremiumIcon name="heart" tone="ruby" size={featuredHome?32:compact?34:38} iconSize={featuredHome?15:compact?16:18}/><View><Text style={[styles.yesText,compact&&styles.yesTextCompact,featuredHome&&homeCleanStyles.featuredInterestedText]}>Interested</Text>{featuredHome&&<Text style={homeCleanStyles.likeSub}>Start a thoughtful connection</Text>}</View></Pressable></View>
      </View>
    </Pressable>
  </Animated.View>
}

