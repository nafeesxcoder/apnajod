import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ReferenceIconTile } from '../../../components/premium/PremiumIcon';
import { buildIntentPassport, type IntentPassportInput } from '../../../domain/intentPassport';
import { colors } from '../../../theme';
import { passportStyles } from '../../../theme/appStyles';

export function IntentPassportCard({input,compact=false,onEdit}:{input:IntentPassportInput;compact?:boolean;onEdit:()=>void}){
  const passport=buildIntentPassport(input);
  const visibleFields=compact?passport.fields.slice(0,3):passport.fields;
  return <LinearGradient colors={['#FDFBF6','#F6F0E5','#F8F3E9']} locations={[0,.62,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={[passportStyles.card,compact&&passportStyles.cardCompact]}>
    <LinearGradient pointerEvents="none" colors={['rgba(119,16,39,.13)','rgba(138,27,53,.035)','transparent']} start={{x:1,y:0}} end={{x:.25,y:1}} style={passportStyles.glow}/>
    <View pointerEvents="none" style={passportStyles.topAccent}/>
    <View style={passportStyles.header}>
      <ReferenceIconTile name="finger-print" orbSize={compact?42:48} iconSize={compact?18:20} tilePadding={compact?18:20}/>
      <View style={{flex:1}}><Text style={passportStyles.eyebrow}>MY INTENT PASSPORT</Text><Text style={passportStyles.summary}>{passport.summary}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit Intent Passport" onPress={onEdit} style={passportStyles.edit}><Ionicons name="create-outline" size={17} color={colors.wine}/></Pressable>
    </View>
    <View style={passportStyles.fieldGrid}>{visibleFields.map(field=><View key={field.id} style={passportStyles.field}><Text style={passportStyles.fieldLabel}>{field.label}</Text><Text numberOfLines={2} style={[passportStyles.fieldValue,!field.complete&&passportStyles.fieldPrivate]}>{field.value}</Text></View>)}</View>
    {compact&&<View style={passportStyles.privacyRow}><Ionicons name="shield-checkmark" size={14} color={colors.wine}/><Text style={passportStyles.privacy}>Shared deliberately. Never shown as a compatibility percentage.</Text></View>}
  </LinearGradient>
}


