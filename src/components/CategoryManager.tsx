/**
 * components/CategoryManager.tsx
 *
 * Category list + add/edit bottom-sheet modal.
 * Modal layout uses the same correct pattern as AddExpenseModal:
 *
 *   <Modal>
 *     <Pressable absoluteFill />              ← backdrop
 *     <KeyboardAvoidingView flex:1            ← needs flex:1 to have measured height
 *                           justifyContent="flex-end">
 *       <View sheet flexShrink:1 maxHeight:90% />
 *         <ScrollView flexShrink:1 />
 *     </KeyboardAvoidingView>
 *   </Modal>
 */

import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import {
  deleteCategory,
  getAllCategories,
  insertCategory,
  updateCategory,
  type Category,
} from "@/lib/database";

const COLOR_PALETTE = [
  "#FF6B6B", "#FF8E53", "#FFA07A", "#F7DC6F",
  "#98D8C8", "#4ECDC4", "#45B7D1", "#85C1E9",
  "#BB8FCE", "#AEB6BF", "#000000", "#5e5e5e",
];

interface Props {
  onCategoriesChanged?: () => void;
}

export default function CategoryManager({ onCategoriesChanged }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    load();
  }, []);

  function load() {
    setCategories(getAllCategories());
  }

  function openAdd() {
    setEditing(null);
    setName("");
    setColor(COLOR_PALETTE[0]);
    setNameError("");
    setModalVisible(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name);
    setColor(cat.color);
    setNameError("");
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
  }

  function handleSave() {
    const t = name.trim();
    if (!t) {
      setNameError("Name is required");
      return;
    }
    try {
      if (editing) updateCategory(editing.id, t, color);
      else insertCategory(t, color);
      closeModal();
      load();
      onCategoriesChanged?.();
    } catch {
      setNameError("Name already exists");
    }
  }

  function handleDelete(cat: Category) {
    Alert.alert(
      "Delete category",
      `Delete "${cat.name}"? Expenses will move to "Other".`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteCategory(cat.id);
            load();
            onCategoriesChanged?.();
          },
        },
      ]
    );
  }

  return (
    <View>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>
          Categories
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.ink }]}
          onPress={openAdd}
          activeOpacity={0.8}
        >
          <Text style={[styles.addBtnText, { color: colors.background }]}>
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category list */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.background, borderColor: colors.hairline },
        ]}
      >
        <FlatList
          data={categories}
          scrollEnabled={false}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => (
            <View
              style={[styles.sep, { backgroundColor: colors.hairline, marginLeft: 16 }]}
            />
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.swatch, { backgroundColor: item.color }]} />
              <View style={styles.rowBody}>
                <Text style={[styles.catName, { color: colors.ink }]}>
                  {item.name}
                </Text>
                {item.is_predefined === 1 && (
                  <View
                    style={[styles.badge, { backgroundColor: colors.backgroundSoft }]}
                  >
                    <Text style={[styles.badgeText, { color: colors.mute }]}>
                      built-in
                    </Text>
                  </View>
                )}
              </View>
              {item.is_predefined === 0 && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => openEdit(item)}
                    style={[styles.actionBtn, { backgroundColor: colors.backgroundSoft }]}
                    hitSlop={4}
                  >
                    <Text style={[styles.actionText, { color: colors.ink }]}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    style={[styles.actionBtn, { backgroundColor: colors.backgroundSoft }]}
                    hitSlop={4}
                  >
                    <Text style={[styles.actionText, { color: colors.body }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      </View>

      {/* Add / Edit bottom sheet modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        {/* Backdrop — absoluteFill, outside the KAV so it doesn't affect layout */}
        <Pressable style={styles.backdrop} onPress={closeModal} />

        {/*
          KAV must have flex:1 — this gives it a real measured height so it can
          actually move its children up when the keyboard appears.
          justifyContent="flex-end" keeps the sheet pinned to the bottom.
        */}
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
              },
            ]}
          >
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.hairline }]} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>
                {editing ? "Edit category" : "New category"}
              </Text>
              <TouchableOpacity
                onPress={closeModal}
                style={[styles.closeBtn, { backgroundColor: colors.backgroundSoft }]}
                hitSlop={8}
              >
                <Text style={[styles.closeBtnText, { color: colors.ink }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable form — flexShrink:1 compresses when keyboard appears */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <Text style={[styles.inputLabel, { color: colors.ink }]}>Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSoft,
                    color: colors.ink,
                    borderColor: nameError ? "#dc2626" : "transparent",
                    borderWidth: 1,
                  },
                ]}
                placeholder="Category name"
                placeholderTextColor={colors.mute}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setNameError("");
                }}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                autoFocus={modalVisible}
              />
              {nameError ? (
                <Text style={styles.errText}>{nameError}</Text>
              ) : null}

              <Text style={[styles.inputLabel, { color: colors.ink, marginTop: 20 }]}>
                Color
              </Text>
              <View style={styles.colorGrid}>
                {COLOR_PALETTE.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      color === c && [styles.colorSelected, { borderColor: colors.ink }],
                    ]}
                    onPress={() => setColor(c)}
                  />
                ))}
              </View>

              {/* Preview */}
              <View
                style={[styles.preview, { backgroundColor: colors.backgroundSoft }]}
              >
                <View style={[styles.swatch, { backgroundColor: color }]} />
                <Text style={[styles.previewName, { color: colors.ink }]}>
                  {name || "Preview"}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.ink }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={[styles.saveBtnText, { color: colors.background }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: "Inter-Bold", fontSize: 18 },
  addBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { fontFamily: "Inter-Medium", fontSize: 14 },
  card: { borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  sep: { height: 1 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  swatch: { borderRadius: 999, height: 14, marginRight: 12, width: 14 },
  rowBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  catName: { fontFamily: "Inter-Medium", fontSize: 15 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: "Inter", fontSize: 10 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  actionText: { fontSize: 14 },

  // ── Modal ──────────────────────────────────────────────────────────────────
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
    maxHeight: "90%",
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
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: { fontFamily: "Inter-Bold", fontSize: 18 },
  closeBtn: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  closeBtnText: { fontSize: 13 },
  scroll: { flexShrink: 1 },
  scrollContent: { paddingBottom: 16 },
  inputLabel: { fontFamily: "Inter-Medium", fontSize: 14, marginBottom: 8 },
  input: {
    borderRadius: 8,
    fontFamily: "Inter",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errText: { color: "#dc2626", fontFamily: "Inter", fontSize: 12, marginTop: 4 },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  colorDot: { borderRadius: 999, height: 36, width: 36 },
  colorSelected: { borderWidth: 3 },
  preview: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewName: { fontFamily: "Inter-Medium", fontSize: 15 },
  saveBtn: {
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 16,
  },
  saveBtnText: { fontFamily: "Inter-Medium", fontSize: 16 },
});
