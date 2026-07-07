/**
 * settings/theme.tsx — Theme picker: Light / Dark / System
 */

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme, type ColorScheme } from "@/context/ThemeContext";

const OPTIONS: { value: ColorScheme; label: string; sub: string; glyph: string }[] = [
  { value: "light", label: "Light", sub: "Always use light theme", glyph: "○" },
  { value: "dark", label: "Dark", sub: "Always use dark theme", glyph: "●" },
  { value: "system", label: "System", sub: "Follow device setting", glyph: "◑" },
];

export default function ThemeSettingsScreen() {
  const { colors, scheme, setScheme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <View style={styles.content}>
        <Text style={[styles.hint, { color: colors.body }]}>
          Choose how the app looks. "System" follows your device's setting.
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.hairline },
          ]}
        >
          {OPTIONS.map((opt, i) => (
            <View key={opt.value}>
              {i > 0 && (
                <View
                  style={[
                    styles.sep,
                    { backgroundColor: colors.hairline, marginLeft: 16 },
                  ]}
                />
              )}
              <TouchableOpacity
                style={styles.row}
                onPress={() => setScheme(opt.value)}
                activeOpacity={0.7}
              >
                {/* Icon circle */}
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor:
                        scheme === opt.value ? colors.ink : colors.backgroundSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.glyph,
                      {
                        color:
                          scheme === opt.value
                            ? colors.background
                            : colors.body,
                      },
                    ]}
                  >
                    {opt.glyph}
                  </Text>
                </View>

                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: colors.ink }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.body }]}>
                    {opt.sub}
                  </Text>
                </View>

                {/* Checkmark pill */}
                {scheme === opt.value && (
                  <View
                    style={[
                      styles.checkPill,
                      { backgroundColor: colors.ink },
                    ]}
                  >
                    <Text
                      style={[styles.checkText, { color: colors.background }]}
                    >
                      ✓
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  hint: {
    fontFamily: "Inter",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
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
  glyph: { fontFamily: "Inter-Bold", fontSize: 15 },
  rowBody: { flex: 1 },
  rowTitle: { fontFamily: "Inter-Medium", fontSize: 15, marginBottom: 2 },
  rowSub: { fontFamily: "Inter", fontSize: 13 },
  checkPill: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  checkText: { fontFamily: "Inter-Bold", fontSize: 13 },
});
