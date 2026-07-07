/**
 * settings/export.tsx — Export page (inline, no modal needed here)
 */

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import {
  exportExpensesToCSV,
  getMonthRange,
  getWeekRange,
  getYearRange,
  toISODate,
} from "@/lib/database";

type Period = "week" | "month" | "year" | "custom";

const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
];

export default function ExportScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState(
    toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [customEnd, setCustomEnd] = useState(toISODate(new Date()));
  const [exporting, setExporting] = useState(false);

  function getRange() {
    if (period === "week") return getWeekRange();
    if (period === "month") return getMonthRange();
    if (period === "year") return getYearRange();
    return { start: customStart, end: customEnd };
  }

  async function handleExport() {
    const { start, end } = getRange();
    if (period === "custom") {
      if (!start.match(/^\d{4}-\d{2}-\d{2}$/) || !end.match(/^\d{4}-\d{2}-\d{2}$/)) {
        Alert.alert("Invalid dates", "Use YYYY-MM-DD format.");
        return;
      }
      if (start > end) { Alert.alert("Invalid range", "Start must be before end."); return; }
    }
    setExporting(true);
    try {
      const csv = exportExpensesToCSV(start, end);
      if (csv.split("\n").length <= 1) {
        Alert.alert("No data", "No expenses in this period."); return;
      }
      const file = new File(Paths.cache, `expenses_${start}_to_${end}.csv`);
      file.write(csv);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Export expenses" });
      } else {
        Alert.alert("Exported", `Saved to:\n${file.uri}`);
      }
    } catch (e) {
      Alert.alert("Export failed", String(e));
    } finally {
      setExporting(false);
    }
  }

  const range = getRange();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.hint, { color: colors.body }]}>
          Choose a period and tap Export to share or save a CSV file.
        </Text>

        {/* Period selector */}
        <Text style={[styles.label, { color: colors.ink }]}>Period</Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.hairline },
          ]}
        >
          {PERIODS.map((p, i) => (
            <View key={p.value}>
              {i > 0 && (
                <View
                  style={[styles.sep, { backgroundColor: colors.hairline, marginLeft: 16 }]}
                />
              )}
              <TouchableOpacity
                style={styles.periodRow}
                onPress={() => setPeriod(p.value)}
                activeOpacity={0.7}
              >
                {/* Radio dot */}
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: colors.ink,
                      backgroundColor:
                        period === p.value ? colors.ink : "transparent",
                    },
                  ]}
                >
                  {period === p.value && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: colors.background },
                      ]}
                    />
                  )}
                </View>
                <Text style={[styles.periodLabel, { color: colors.ink }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Custom range inputs */}
        {period === "custom" && (
          <View style={styles.customRow}>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.body }]}>
                From
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  { backgroundColor: colors.backgroundSoft, color: colors.ink },
                ]}
                value={customStart}
                onChangeText={setCustomStart}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mute}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <Text style={[styles.dateSep, { color: colors.mute }]}>–</Text>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.body }]}>To</Text>
              <TextInput
                style={[
                  styles.dateInput,
                  { backgroundColor: colors.backgroundSoft, color: colors.ink },
                ]}
                value={customEnd}
                onChangeText={setCustomEnd}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mute}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        )}

        {/* Range preview */}
        {period !== "custom" && (
          <View
            style={[
              styles.preview,
              { backgroundColor: colors.backgroundSoft },
            ]}
          >
            <Text style={[styles.previewText, { color: colors.body }]}>
              {range.start} – {range.end}
            </Text>
          </View>
        )}

        <Text style={[styles.hint2, { color: colors.mute }]}>
          Columns: id, name, amount, category, description, date, tags.
        </Text>

        <TouchableOpacity
          style={[
            styles.exportBtn,
            { backgroundColor: colors.ink },
            exporting && styles.exportBtnOff,
          ]}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.8}
        >
          {exporting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.exportBtnText, { color: colors.background }]}>
              Export CSV
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },
  hint: { fontFamily: "Inter", fontSize: 14, lineHeight: 20, marginBottom: 24 },
  label: { fontFamily: "Inter-Medium", fontSize: 14, marginBottom: 10 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 20, overflow: "hidden" },
  sep: { height: 1 },
  periodRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  radio: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    marginRight: 14,
    width: 20,
  },
  radioInner: { borderRadius: 999, height: 8, width: 8 },
  periodLabel: { fontFamily: "Inter-Medium", fontSize: 15 },
  customRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  dateField: { flex: 1 },
  dateLabel: { fontFamily: "Inter", fontSize: 12, marginBottom: 6 },
  dateInput: {
    borderRadius: 8,
    fontFamily: "Inter",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateSep: { fontSize: 16, marginTop: 16 },
  preview: {
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewText: { fontFamily: "Inter-Medium", fontSize: 14, textAlign: "center" },
  hint2: {
    fontFamily: "Inter",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 28,
  },
  exportBtn: {
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 16,
  },
  exportBtnOff: { opacity: 0.5 },
  exportBtnText: { fontFamily: "Inter-Medium", fontSize: 16 },
});
