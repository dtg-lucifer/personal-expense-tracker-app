/**
 * src/app/(tabs)/settings/index.tsx — Settings menu
 *
 * A clean menu of rows, each navigating to a sub-page.
 * DESIGN.md: card rows with icon-button-circular + chevron.
 */

import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

// ─── Icon box (icon-button-circular pattern from DESIGN.md) ──────────────────

function IconBox({
  glyph,
  bg,
  fg,
}: {
  glyph: string;
  bg: string;
  fg: string;
}) {
  return (
    <View style={[styles.iconBox, { backgroundColor: bg }]}>
      <Text style={[styles.iconGlyph, { color: fg }]}>{glyph}</Text>
    </View>
  );
}

// ─── Menu row ─────────────────────────────────────────────────────────────────

function MenuRow({
  icon,
  iconBg,
  iconFg,
  title,
  sub,
  onPress,
}: {
  icon: string;
  iconBg: string;
  iconFg: string;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.background }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <IconBox glyph={icon} bg={iconBg} fg={iconFg} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: colors.body }]}>{sub}</Text>
      </View>
      <Text style={[styles.chevron, { color: colors.mute }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsMenuScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.ink }]}>
          Settings
        </Text>

        {/* ── Appearance ─────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.body }]}>
          APPEARANCE
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.hairline },
          ]}
        >
          <MenuRow
            icon="◑"
            iconBg={colors.ink}
            iconFg={colors.background}
            title="Theme"
            sub="Light, dark or system"
            onPress={() => router.push("/(tabs)/settings/theme")}
          />
        </View>

        {/* ── Data ───────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.body }]}>
          DATA
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.hairline },
          ]}
        >
          <MenuRow
            icon="↗"
            iconBg={colors.ink}
            iconFg={colors.background}
            title="Export expenses"
            sub="Download CSV for any date range"
            onPress={() => router.push("/(tabs)/settings/export")}
          />
          <View style={[styles.sep, { backgroundColor: colors.hairline, marginLeft: 68 }]} />
          <MenuRow
            icon="#"
            iconBg={colors.backgroundSoft}
            iconFg={colors.ink}
            title="Categories"
            sub="Add, edit or delete categories"
            onPress={() => router.push("/(tabs)/settings/categories")}
          />
        </View>

        {/* ── About ──────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.body }]}>
          ABOUT
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.hairline },
          ]}
        >
          <MenuRow
            icon="i"
            iconBg={colors.backgroundSoft}
            iconFg={colors.ink}
            title="About"
            sub="Version and data info"
            onPress={() => router.push("/(tabs)/settings/about")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 60 },
  screenTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 32,
    paddingTop: 20,
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: "Inter-Medium",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    overflow: "hidden",
  },
  sep: { height: 1 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    marginRight: 16,
    width: 36,
  },
  iconGlyph: { fontFamily: "Inter-Bold", fontSize: 15 },
  rowBody: { flex: 1 },
  rowTitle: { fontFamily: "Inter-Medium", fontSize: 15, marginBottom: 2 },
  rowSub: { fontFamily: "Inter", fontSize: 13, lineHeight: 18 },
  chevron: { fontSize: 22, marginLeft: 8 },
});
