/**
 * The page canvas.
 *
 * Ten screens each kept their own copy of a `PremiumBackground` that
 * stretched the same maroon velvet photograph behind the content. The photo
 * is gone with the old identity, and the daylight palette wants a flat
 * limewash wall so cards and type carry the hierarchy.
 *
 * Keeping it in one place means the canvas can change again in one edit, and
 * it saves ten full-screen image decodes.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors } from '../theme';

export function AppCanvas({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: colors.canvas }}>
      {children}
    </View>
  );
}
