/**
 * components/ExportModal.tsx
 *
 * Bottom-sheet modal using the same correct layout pattern:
 *
 *   <Modal>
 *     <Pressable absoluteFill />      ← backdrop
 *     <KeyboardAvoidingView flex:1    ← must have flex:1
 *                           justifyContent="flex-end">
 *       <View sheet flexShrink:1 />   ← content-hugging, compressible
 *     </KeyboardAvoidingView>
 *   </Modal>
 */

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import {
  exportExpensesToCSV,
  getMonthRange,
  getWeekRange,
  getYearRange,
  toISODate,
} from "@/lib/database";

type Period = "week" | "month" | "year" | "custom";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ExportModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
      if (
        !start.match(/^\d{4}-\d{2}-\d{2}$/) ||
        !end.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        Alert.alert("Invalid dates", "Use YYYY-MM-DD format.");
        return;
      }
      if (start > end) {
        Alert.alert("Invalid range", "Start must be before end.");
        return;
      }
    }
    setExporting(true);
    try {
      const csv = exportExpensesToCSV(start, end);
      if (csv.split("\n").length <= 1) {
        Alert.alert("No data", "No expenses in this period.");
        return;
      }
      const file = new File(Paths.cache, `expenses_${start}_to_${end}.csv`);
      file.write(csv);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          dialogTitle: "Export expenses",
        });
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
  const bottomPad = insets.bottom > 0 ? insets.bottom : 16;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop — absoluteFill so it doesn't affect flex layout */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* KAV fills the screen, sheet sits at the bottom */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: bottomPad + 8,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.hairline }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.ink }]}>Export data</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.backgroundSoft }]}
              hitSlop={8}
            >
              <Text style={[styles.closeBtnText, { color: colors.ink }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.ink }]}>Period</Text>
          <View style={styles.periodRow}>
            {(["week", "month", "year", "custom"] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodBtn,
                  { borderColor: colors.hairline },
                  period === p && { backgroundColor: colors.ink, borderColor: colors.ink },
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodBtnText,
                    { color: colors.body },
                    period === p && { color: colors.background },
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {period === "custom" ? (
            <View style={styles.rangeRow}>
              <View style={styles.dateField}>
                <Text style={[styles.dateLabel, { color: colors.body }]}>From</Text>
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
          ) : (
            <View
              style={[styles.rangePreview, { backgroundColor: colors.backgroundSoft }]}
            >
              <Text style={[styles.rangeText, { color: colors.body }]}>
                {range.start} – {range.end}
              </Text>
            </View>
          )}

          <Text style={[styles.hint, { color: colors.mute }]}>
            CSV columns: id, name, amount, category, description, date, tags.
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  kav: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexShrink: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 4,
    marginBottom: 16,
    width: 40,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: { fontFamily: "Inter-Bold", fontSize: 20 },
  closeBtn: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  closeBtnText: { fontSize: 14 },
  label: { fontFamily: "Inter-Medium", fontSize: 14, marginBottom: 12 },
  periodRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  periodBtn: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  periodBtnText: { fontFamily: "Inter-Medium", fontSize: 13 },
  rangeRow: {
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
  rangePreview: {
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rangeText: { fontFamily: "Inter-Medium", fontSize: 14, textAlign: "center" },
  hint: { fontFamily: "Inter", fontSize: 12, lineHeight: 18, marginBottom: 24 },
  exportBtn: {
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 16,
  },
  exportBtnOff: { opacity: 0.5 },
  exportBtnText: { fontFamily: "Inter-Medium", fontSize: 16 },
});
