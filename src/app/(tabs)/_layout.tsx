/**
 * src/app/(tabs)/_layout.tsx
 *
 * Modern bottom tab bar:
 * - expo-symbols icons (Material symbols for Android)
 * - Active tab has a filled pill indicator behind the icon
 * - Frosted glass / blur background via expo-blur (fallback: semi-opaque)
 * - No border line — elevation + shadow give depth instead
 */

import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

// ─── Tab icon wrapper ─────────────────────────────────────────────────────────

type IconName = {
  ios: any;
  android: any;
};

function TabIcon({
  iconName,
  focused,
  color,
}: {
  iconName: IconName;
  focused: boolean;
  color: string | undefined;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.iconWrap,
        focused && { backgroundColor: colors.isDark ? "#ffffff18" : "#00000010" },
      ]}
    >
      <SymbolView
        name={iconName}
        size={22}
        tintColor={color as string}
        weight="medium"
        fallback={null}
      />
    </View>
  );
}

// ─── Tab bar background ───────────────────────────────────────────────────────

function TabBarBackground() {
  const { colors } = useTheme();
  if (Platform.OS === "ios") {
    return (
      <BlurView
        intensity={60}
        tint={colors.isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  // Android: solid with slight transparency blending
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: colors.isDark
            ? "rgba(10,10,10,0.97)"
            : "rgba(255,255,255,0.97)",
        },
      ]}
    />
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const TAB_HEIGHT = 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: TAB_HEIGHT,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          // Shadow / elevation
          elevation: 20,
          shadowColor: colors.isDark ? "#000" : "#00000040",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.isDark ? "#606060" : "#ababab",
        tabBarLabelStyle: {
          fontFamily: "Inter-Medium",
          fontSize: 10,
          marginTop: -2,
          marginBottom: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              iconName={{ ios: "house.fill", android: "home_filled" }}
              focused={focused}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarLabel: "Reports",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              iconName={{ ios: "chart.bar.fill", android: "bar_chart" }}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              iconName={{ ios: "gearshape.fill", android: "settings" }}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 48,
  },
});
