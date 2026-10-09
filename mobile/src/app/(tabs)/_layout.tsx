import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { colors, touch, typography } from '@/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON_SIZE = 24;
/** Koşu sekmesi halkaları: dış halka çapı, iç halkanın dıştan farkı ve çizgi kalınlıkları. */
const RING_SIZE = 40;
const RING_INNER_INSET = 8;
const RING_OUTER_BORDER = 1;
const RING_INNER_BORDER = 1.5;

/** Koşu sekmesi aktifken ikonun etrafında ince, iç içe iki "ağaç halkası" belirir. */
function TabIcon({ name, color, focused, rings }: { name: IconName; color: ColorValue; focused: boolean; rings?: boolean }) {
  return (
    <View style={styles.iconBox}>
      {rings && focused ? (
        <>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.ringOuter}
            testID="tab-rings"
          />
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.ringInner} />
        </>
      ) : null}
      <MaterialCommunityIcons name={name} size={ICON_SIZE} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenListeners={({ navigation }) => ({
        tabPress: () => {
          // Sadece sekme değişirken titret; aktif sekmeye tekrar basınca değil.
          if (!navigation.isFocused()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopWidth: 0,
          elevation: 0,
          height: touch.tabBar + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { minHeight: touch.min },
        tabBarLabelStyle: { fontFamily: typography.small.fontFamily, fontSize: typography.small.fontSize },
        sceneStyle: { backgroundColor: colors.canvas },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: tr.tabs.run,
          tabBarIcon: ({ color, focused }) => <TabIcon name="shoe-sneaker" color={color} focused={focused} rings />,
        }}
      />
      <Tabs.Screen
        name="forest"
        options={{
          title: tr.tabs.forest,
          tabBarIcon: ({ color, focused }) => <TabIcon name="pine-tree" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: tr.tabs.achievements,
          tabBarIcon: ({ color, focused }) => <TabIcon name="medal-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: tr.tabs.feed,
          tabBarIcon: ({ color, focused }) => <TabIcon name="account-group-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tr.tabs.profile,
          tabBarIcon: ({ color, focused }) => <TabIcon name="account-outline" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: touch.min, height: touch.min - 4, alignItems: 'center', justifyContent: 'center' },
  ringOuter: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_OUTER_BORDER,
    borderColor: colors.primaryGlow,
  },
  ringInner: {
    position: 'absolute',
    width: RING_SIZE - RING_INNER_INSET,
    height: RING_SIZE - RING_INNER_INSET,
    borderRadius: (RING_SIZE - RING_INNER_INSET) / 2,
    borderWidth: RING_INNER_BORDER,
    borderColor: colors.primary,
  },
});
