/**
 * settings/about.tsx — About & app info
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.body }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.ink }]}>{value}</Text>
    </View>
  );
}

export default function AboutScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.hairline },
          ]}
        >
          <InfoRow label="App" value="Expense Tracker" />
          <View style={[styles.sep, { backgroundColor: colors.hairline, marginLeft: 16 }]} />
          <InfoRow label="Version" value="1.0.0" />
          <View style={[styles.sep, { backgroundColor: colors.hairline, marginLeft: 16 }]} />
          <InfoRow label="Storage" value="SQLite (local)" />
          <View style={[styles.sep, { backgroundColor: colors.hairline, marginLeft: 16 }]} />
          <InfoRow label="Network" value="None — fully offline" />
          <View style={[styles.sep, { backgroundColor: colors.hairline, marginLeft: 16 }]} />
          <InfoRow label="Author" value="Piush <mail@piush.in>" />
        </View>

        <View
          style={[
            styles.tipCard,
            { backgroundColor: colors.backgroundSoft },
          ]}
        >
          <Text style={[styles.tipTitle, { color: colors.ink }]}>Tips</Text>
          <Text style={[styles.tipText, { color: colors.body }]}>
            {[
              "Long-press any expense to delete it.",
              "Use tags to group expenses across categories.",
              "Pull down on any screen to refresh.",
              "Export CSV supports custom date ranges.",
            ]
              .map((t) => `· ${t}`)
              .join("\n")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: { fontFamily: "Inter", fontSize: 14 },
  rowValue: { fontFamily: "Inter-Medium", fontSize: 14 },
  tipCard: { borderRadius: 16, padding: 20 },
  tipTitle: { fontFamily: "Inter-Bold", fontSize: 15, marginBottom: 10 },
  tipText: { fontFamily: "Inter", fontSize: 14, lineHeight: 24 },
});
