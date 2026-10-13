import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/AppText';

import { avatarColor, avatarPath } from './avatarShape';

type Props = {
  /** Renk ve biçim bu addan türetilir. */
  name: string;
  /** Gösterilen baş harf. */
  initial: string;
  size?: number;
};

/** Harfli, hafif organik biçimli avatar. Ad yanında yazıldığı için ekran okuyucudan gizlenir. */
export function OrganicAvatar({ name, initial, size = 88 }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
      testID="organic-avatar">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path d={avatarPath(name, size)} fill={avatarColor(name)} testID="organic-avatar-shape" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.letter]}>
        <AppText variant="title1" color="onPrimary">
          {Array.from(initial)[0] ?? ''}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  letter: { alignItems: 'center', justifyContent: 'center' },
});
