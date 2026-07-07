/**
 * components/ExportModal.tsx
 *
 * Export bottom sheet with native date pickers for the custom range:
 * - Android: DateTimePickerAndroid.open() — native calendar dialog
 * - iOS: inline DateTimePicker rendered inside the sheet
 */

import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
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
  ScrollView,
  StyleSheet,
  Text,
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
type DateField = "start" | "end";

interface Props {
  visible: boolean;
  onClose: () => void;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  // iOS only — which field's picker is open
  const [iosPickerField, setIosPickerField] = useState<DateField | null>(null);

  function getRange() {
    if (period === "week") return getWeekRange();
    if (period === "month") return getMonthRange();
    if (period === "year") return getYearRange();
    return { start: customStart, end: customEnd };
  }

  function openDatePicker(field: DateField) {
    const current = field === "start" ? customStart : customEnd;
    const maxDate = field === "start"
      ? parseISODate(customEnd)
      : new Date();
    const minDate = field === "end"
      ? parseISODate(customStart)
      : undefined;

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: parseISODate(current),
        mode: "date",
        display: "calendar",
        maximumDate: maxDate,
        minimumDate: minDate,
        onChange: (event, picked) => {
          if (event.type === "set" && picked) {
            if (field === "start") setCustomStart(toISODate(picked));
            else setCustomEnd(toISODate(picked));
          }
        },
      });
    } else {
      // Toggle: tapping same field closes it
      setIosPickerField((prev) => (prev === field ? null : field));
    }
  }

  async function handleExport() {
    const { start, end } = getRange();
    if (period === "custom" && start > end) {
      Alert.alert("Invalid range", "Start date must be before end date.");
      return;
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
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/*
          ScrollView wraps the sheet content so the iOS inline date pickers
          (which can be ~300px tall) don't overflow the bottom sheet.
        */}
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

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Period selector */}
            <Text style={[styles.label, { color: colors.ink }]}>Period</Text>
            <View style={styles.periodRow}>
              {(["week", "month", "year", "custom"] as Period[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodBtn,
                    { borderColor: colors.hairline },
                    period === p && {
                      backgroundColor: colors.ink,
                      borderColor: colors.ink,
                    },
                  ]}
                  onPress={() => {
                    setPeriod(p);
                    setIosPickerField(null);
                  }}
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

            {/* Date range — picker rows for custom, preview for presets */}
            {period === "custom" ? (
              <View style={styles.customRange}>
                {/* From date */}
                <View style={styles.dateFieldWrap}>
                  <Text style={[styles.dateLabel, { color: colors.body }]}>From</Text>
                  <TouchableOpacity
                    style={[
                      styles.dateRow,
                      { backgroundColor: colors.backgroundSoft },
                      iosPickerField === "start" && {
                        borderColor: colors.ink,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => openDatePicker("start")}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.calIcon, { color: colors.body }]}>📅</Text>
                    <Text style={[styles.dateRowText, { color: colors.ink }]}>
                      {formatDisplayDate(customStart)}
                    </Text>
                  </TouchableOpacity>
                  {Platform.OS === "ios" && iosPickerField === "start" && (
                    <View
                      style={[
                        styles.iosPickerWrap,
                        { backgroundColor: colors.backgroundSoft },
                      ]}
                    >
                      <DateTimePicker
                        value={parseISODate(customStart)}
                        mode="date"
                        display="inline"
                        maximumDate={parseISODate(customEnd)}
                        themeVariant={colors.isDark ? "dark" : "light"}
                        onChange={(_, picked) => {
                          if (picked) setCustomStart(toISODate(picked));
                        }}
                        style={styles.iosPicker}
                      />
                      <TouchableOpacity
                        style={[styles.iosPickerDone, { backgroundColor: colors.ink }]}
                        onPress={() => setIosPickerField(null)}
                      >
                        <Text
                          style={[
                            styles.iosPickerDoneText,
                            { color: colors.background },
                          ]}
                        >
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* To date */}
                <View style={styles.dateFieldWrap}>
                  <Text style={[styles.dateLabel, { color: colors.body }]}>To</Text>
                  <TouchableOpacity
                    style={[
                      styles.dateRow,
                      { backgroundColor: colors.backgroundSoft },
                      iosPickerField === "end" && {
                        borderColor: colors.ink,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => openDatePicker("end")}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.calIcon, { color: colors.body }]}>📅</Text>
                    <Text style={[styles.dateRowText, { color: colors.ink }]}>
                      {formatDisplayDate(customEnd)}
                    </Text>
                  </TouchableOpacity>
                  {Platform.OS === "ios" && iosPickerField === "end" && (
                    <View
                      style={[
                        styles.iosPickerWrap,
                        { backgroundColor: colors.backgroundSoft },
                      ]}
                    >
                      <DateTimePicker
                        value={parseISODate(customEnd)}
                        mode="date"
                        display="inline"
                        minimumDate={parseISODate(customStart)}
                        maximumDate={new Date()}
                        themeVariant={colors.isDark ? "dark" : "light"}
                        onChange={(_, picked) => {
                          if (picked) setCustomEnd(toISODate(picked));
                        }}
                        style={styles.iosPicker}
                      />
                      <TouchableOpacity
                        style={[styles.iosPickerDone, { backgroundColor: colors.ink }]}
                        onPress={() => setIosPickerField(null)}
                      >
                        <Text
                          style={[
                            styles.iosPickerDoneText,
                            { color: colors.background },
                          ]}
                        >
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.rangePreview,
                  { backgroundColor: colors.backgroundSoft },
                ]}
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
          </ScrollView>
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
  kav: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexShrink: 1,
    maxHeight: "92%",
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
  scroll: { flexShrink: 1 },
  scrollContent: { paddingBottom: 8 },
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
  // Custom date range
  customRange: { marginBottom: 20, gap: 12 },
  dateFieldWrap: {},
  dateLabel: { fontFamily: "Inter", fontSize: 12, marginBottom: 6 },
  dateRow: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "transparent",
  },
  calIcon: { fontSize: 15, marginRight: 10 },
  dateRowText: { flex: 1, fontFamily: "Inter", fontSize: 15 },
  // iOS inline picker
  iosPickerWrap: {
    borderRadius: 12,
    marginTop: 8,
    overflow: "hidden",
    paddingBottom: 8,
  },
  iosPicker: { width: "100%" },
  iosPickerDone: {
    alignItems: "center",
    borderRadius: 999,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 12,
  },
  iosPickerDoneText: { fontFamily: "Inter-Medium", fontSize: 15 },
  // Preset range preview
  rangePreview: {
    borderRadius: 8,
    marginBottom: 20,
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
