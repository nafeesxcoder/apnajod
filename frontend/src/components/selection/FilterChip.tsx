import { Pressable, Text } from 'react-native';

import { MiniPremiumIcon } from '../premium/PremiumIcon';
import { aiStyles } from '../../theme/appStyles';

export function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={[aiStyles.filterChip, active && aiStyles.filterChipOn]}>
    <Text style={[aiStyles.filterChipText, active && aiStyles.filterChipTextOn]}>{label}</Text>
    {active && <MiniPremiumIcon name="checkmark-circle" tone="gold" size={24} iconSize={11} />}
  </Pressable>;
}
