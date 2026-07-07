/**
 * src/app/(tabs)/_layout.tsx
 *
 * Bottom tab bar — 5 tabs: Home, Budget, Savings, Reports, Settings.
 * Icons are inline SVG paths via react-native-svg (already installed).
 * This is fully cross-platform: iOS, Android, and web.
 */

import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

// ─── SVG icon definitions (24×24 viewBox, filled style) ──────────────────────
// Paths sourced from Material Symbols (filled variant).

const ICONS = {
  // Home — house shape
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  // Budget — credit card
  budget: "M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
  // Savings — piggy bank approximation (wallet)
  savings: "M21 7.28V5c0-1.1-.9-2-2-2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2.28A2 2 0 0 0 22 15v-6a2 2 0 0 0-1-1.72zM20 15h-8v-4h8v4zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h6v2H5z M16 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  // Reports — bar chart
  reports: "M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z",
  // Settings — gear
  settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
} as const;

type IconName = keyof typeof ICONS;

// ─── Tab icon component ───────────────────────────────────────────────────────

function TabIcon({
  name,
  focused,
  color,
}: {
  name: IconName;
  focused: boolean;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.iconWrap,
        focused && { backgroundColor: colors.isDark ? "#ffffff18" : "#00000010" },
      ]}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
        <Path d={ICONS[name]} fill={color} />
      </Svg>
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
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "Budget",
          tabBarLabel: "Budget",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="budget" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          title: "Savings",
          tabBarLabel: "Savings",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="savings" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarLabel: "Reports",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="reports" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="settings" focused={focused} color={color} />
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
