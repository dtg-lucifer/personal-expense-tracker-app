import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { importFullBackup } from "@/lib/database";

export default function ImportScreen() {
  const { colors } = useTheme();
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      setImporting(true);
      const json = await File.readAsStringAsync(asset.uri);
      importFullBackup(json);
      Alert.alert("Imported", "Backup restored successfully.");
    } catch (e) {
      Alert.alert("Import failed", String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.hint, { color: colors.body }]}>
          Select a JSON backup file to restore all your data (categories, expenses, goals, balance).
          This will replace all existing data.
        </Text>

        <View style={[styles.warning, { backgroundColor: colors.backgroundSoft }]}>
          <Text style={[styles.warningTitle, { color: colors.ink }]}>Caution</Text>
          <Text style={[styles.warningText, { color: colors.body }]}>
            Importing a backup will delete all current data and replace it with the backup contents. This action cannot be undone.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.importBtn,
            { backgroundColor: colors.ink },
            importing && styles.btnDisabled,
          ]}
          onPress={handleImport}
          disabled={importing}
          activeOpacity={0.8}
        >
          {importing ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.importBtnText, { color: colors.background }]}>
              Select backup file
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
  warning: {
    borderRadius: 16,
    marginBottom: 28,
    padding: 20,
  },
  warningTitle: { fontFamily: "Inter-Bold", fontSize: 16, marginBottom: 8 },
  warningText: { fontFamily: "Inter", fontSize: 13, lineHeight: 20 },
  importBtn: {
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 16,
  },
  importBtnText: { fontFamily: "Inter-Medium", fontSize: 16 },
  btnDisabled: { opacity: 0.5 },
});
