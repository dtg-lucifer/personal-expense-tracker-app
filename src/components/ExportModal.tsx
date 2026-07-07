/**
 * components/ExportModal.tsx
 * Fixed bottom sheet — no emojis, dark mode aware.
 */

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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

  const s = makeStyles(colors, insets.bottom);

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.kav}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.header}>
            <Text style={s.title}>Export data</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Period</Text>
          <View style={s.periodRow}>
            {(["week", "month", "year", "custom"] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[s.periodBtn, period === p && s.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    s.periodBtnText,
                    period === p && s.periodBtnTextActive,
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {period === "custom" ? (
            <View style={s.rangeRow}>
              <View style={s.dateField}>
                <Text style={s.dateLabel}>From</Text>
                <TextInput
                  style={s.dateInput}
                  value={customStart}
                  onChangeText={setCustomStart}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mute}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <Text style={s.dateSep}>–</Text>
              <View style={s.dateField}>
                <Text style={s.dateLabel}>To</Text>
                <TextInput
                  style={s.dateInput}
                  value={customEnd}
                  onChangeText={setCustomEnd}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mute}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          ) : (
            <View style={s.rangePreview}>
              <Text style={s.rangeText}>
                {range.start} – {range.end}
              </Text>
            </View>
          )}

          <Text style={s.hint}>
            CSV columns: id, name, amount, category, description, date, tags.
          </Text>

          <TouchableOpacity
            style={[s.exportBtn, exporting && s.exportBtnOff]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={s.exportBtnText}>Export CSV</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(
  c: ReturnType<typeof useTheme>["colors"],
  bottomInset: number
) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    kav: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: (bottomInset || 16) + 8,
    },
    handle: {
      alignSelf: "center",
      backgroundColor: c.hairline,
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
    title: {
      color: c.ink,
      fontFamily: "Inter-Bold",
      fontSize: 20,
    },
    closeBtn: {
      alignItems: "center",
      backgroundColor: c.backgroundSoft,
      borderRadius: 999,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    closeBtnText: {
      color: c.ink,
      fontSize: 14,
    },
    label: {
      color: c.ink,
      fontFamily: "Inter-Medium",
      fontSize: 14,
      marginBottom: 12,
    },
    periodRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
    },
    periodBtn: {
      alignItems: "center",
      borderColor: c.hairline,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      paddingVertical: 10,
    },
    periodBtnActive: {
      backgroundColor: c.ink,
      borderColor: c.ink,
    },
    periodBtnText: {
      color: c.body,
      fontFamily: "Inter-Medium",
      fontSize: 13,
    },
    periodBtnTextActive: {
      color: c.background,
    },
    rangeRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
    },
    dateField: { flex: 1 },
    dateLabel: {
      color: c.body,
      fontFamily: "Inter",
      fontSize: 12,
      marginBottom: 6,
    },
    dateInput: {
      backgroundColor: c.backgroundSoft,
      borderRadius: 8,
      color: c.ink,
      fontFamily: "Inter",
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    dateSep: {
      color: c.mute,
      fontSize: 16,
      marginTop: 16,
    },
    rangePreview: {
      backgroundColor: c.backgroundSoft,
      borderRadius: 8,
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    rangeText: {
      color: c.body,
      fontFamily: "Inter-Medium",
      fontSize: 14,
      textAlign: "center",
    },
    hint: {
      color: c.mute,
      fontFamily: "Inter",
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 24,
    },
    exportBtn: {
      alignItems: "center",
      backgroundColor: c.ink,
      borderRadius: 999,
      paddingVertical: 16,
    },
    exportBtnOff: { opacity: 0.5 },
    exportBtnText: {
      color: c.background,
      fontFamily: "Inter-Medium",
      fontSize: 16,
    },
  });
}
