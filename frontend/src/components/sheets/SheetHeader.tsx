import { Pressable, Text, View } from 'react-native';

import { shared } from '../../components';
import { PremiumIcon } from '../premium/PremiumIcon';
import { chatStyles, styles } from '../../theme/appStyles';

const hitSlop = { top: 12, right: 12, bottom: 12, left: 12 } as const;

export function SheetHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return <View style={chatStyles.sheetHeader}>
    <View><Text accessibilityRole="header" style={shared.h2}>{title}</Text><Text style={styles.helper}>{subtitle}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} accessibilityHint="Closes this panel and returns to the previous screen" hitSlop={hitSlop} onPress={onClose} style={chatStyles.sheetClose}><PremiumIcon name="close" tone="dark" size={38} iconSize={18} /></Pressable>
  </View>;
}
