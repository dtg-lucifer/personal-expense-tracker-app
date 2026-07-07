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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, Wallet2, PiggyBankIcon, ChartBar, Settings2 } from "lucide-react-native"

import { useTheme } from "@/context/ThemeContext";

// ─── SVG icon definitions (24×24 viewBox, filled style) ──────────────────────
// Paths sourced from Material Symbols (filled variant).

const ICONS = {
  // Home — house shape
  home: Home,
  // Budget — wallet
  budget: Wallet2,
  // Savings — piggy bank approximation (wallet)
  savings: PiggyBankIcon,
  // Reports — bar chart
  reports: ChartBar,
  // Settings — gear
  settings: Settings2,
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
      {React.createElement(ICONS[name], {
        size: 20,
        color: color,
      })}
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
