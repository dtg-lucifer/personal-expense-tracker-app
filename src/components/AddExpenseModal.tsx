/**
 * components/AddExpenseModal.tsx
 *
 * Bottom-sheet modal. The layout is:
 *   <Modal>
 *     <View flex:1>                        ← full-screen container
 *       <Pressable absoluteFill onPress=close />   ← backdrop (behind sheet)
 *       <KeyboardAvoidingView justifyContent=flex-end>
 *         <View sheet />
 *       </KeyboardAvoidingView>
 *     </View>
 *   </Modal>
 *
 * The backdrop is inside the same flex:1 container but rendered first (behind).
 * The KAV sits on top with pointerEvents="box-none" so touches pass through its
 * transparent area to the backdrop, while the sheet itself captures touches.
 *
 * Keyboard: behavior="padding" on both platforms pushes the sheet up when the
 * keyboard appears. The ScrollView is flex:1 so it shrinks to fit.
 */

import { useEffect, useRef, useState } from "react";
import {
  Alert,
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
  getAllCategories,
  insertExpense,
  today,
  type Category,
} from "@/lib/database";

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  defaultDate?: string;
}

export default function AddExpenseModal({
  visible,
  onClose,
  onAdded,
  defaultDate,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate ?? today());
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      const cats = getAllCategories();
      setCategories(cats);
      if (!categoryId && cats.length > 0) setCategoryId(cats[0].id);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setName("");
      setAmount("");
      setDescription("");
      setDate(defaultDate ?? today());
      setTags("");
      setErrors({});
      setShowCategoryPicker(false);
    }
  }, [visible, defaultDate]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    const p = parseFloat(amount);
    if (!amount || isNaN(p) || p <= 0) errs.amount = "Enter a valid amount";
    if (!categoryId) errs.category = "Select a category";
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) errs.date = "Use YYYY-MM-DD";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    try {
      insertExpense({
        name: name.trim(),
        amount: parseFloat(amount),
        category_id: categoryId!,
        description: description.trim(),
        date,
        tags: tags.trim(),
      });
      onAdded();
      onClose();
    } catch {
      Alert.alert("Error", "Could not save expense.");
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Outer container fills the whole screen */}
      <View style={styles.container}>
        {/* Backdrop — sits behind everything, tapping it closes the modal */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/*
          KAV with pointerEvents="box-none": the KAV's own transparent area
          doesn't eat touches (they fall through to the backdrop), but child
          views (the sheet) still receive touches normally.
          behavior="padding" lifts the sheet up when keyboard appears.
        */}
        <KeyboardAvoidingView
          style={styles.kav}
          behavior="padding"
          pointerEvents="box-none"
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
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.ink }]}>
                Log expense
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: colors.backgroundSoft }]}
                hitSlop={8}
              >
                <Text style={[styles.closeBtnText, { color: colors.ink }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable form — flex:1 shrinks when KAV reduces available height */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <Field label="Name" error={errors.name} colors={colors}>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.backgroundSoft,
                    color: colors.ink,
                    borderColor: errors.name ? "#dc2626" : "transparent",
                    borderWidth: 1,
                  }]}
                  placeholder="e.g. Coffee"
                  placeholderTextColor={colors.mute}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  onSubmitEditing={() => amountRef.current?.focus()}
                />
              </Field>

              <Field label="Amount" error={errors.amount} colors={colors}>
                <TextInput
                  ref={amountRef}
                  style={[styles.input, {
                    backgroundColor: colors.backgroundSoft,
                    color: colors.ink,
                    borderColor: errors.amount ? "#dc2626" : "transparent",
                    borderWidth: 1,
                  }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.mute}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </Field>

              <Field label="Category" error={errors.category} colors={colors}>
                <TouchableOpacity
                  style={[styles.input, styles.pickerRow, {
                    backgroundColor: colors.backgroundSoft,
                    borderColor: errors.category ? "#dc2626" : "transparent",
                    borderWidth: 1,
                  }]}
                  onPress={() => setShowCategoryPicker((v) => !v)}
                  activeOpacity={0.7}
                >
                  {selectedCategory && (
                    <View style={[styles.dot, { backgroundColor: selectedCategory.color }]} />
                  )}
                  <Text style={[styles.pickerText, { color: colors.ink }]}>
                    {selectedCategory?.name ?? "Select category"}
                  </Text>
                  <Text style={[styles.chevron, { color: colors.body }]}>
                    {showCategoryPicker ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>

                {showCategoryPicker && (
                  <View style={[styles.dropList, {
                    backgroundColor: colors.background,
                    borderColor: colors.hairline,
                  }]}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.dropItem,
                          { borderBottomColor: colors.backgroundSoft },
                          cat.id === categoryId && { backgroundColor: colors.backgroundSofter },
                        ]}
                        onPress={() => {
                          setCategoryId(cat.id);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <View style={[styles.dot, { backgroundColor: cat.color }]} />
                        <Text style={[
                          styles.dropItemText,
                          { color: colors.ink },
                          cat.id === categoryId && { fontFamily: "Inter-Medium" },
                        ]}>
                          {cat.name}
                        </Text>
                        {cat.id === categoryId && (
                          <Text style={[styles.check, { color: colors.ink }]}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Field>

              <Field label="Description (optional)" colors={colors}>
                <TextInput
                  style={[styles.input, styles.multiline, {
                    backgroundColor: colors.backgroundSoft,
                    color: colors.ink,
                    borderColor: "transparent",
                    borderWidth: 1,
                  }]}
                  placeholder="Add notes…"
                  placeholderTextColor={colors.mute}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </Field>

              <Field label="Date" error={errors.date} colors={colors}>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.backgroundSoft,
                    color: colors.ink,
                    borderColor: errors.date ? "#dc2626" : "transparent",
                    borderWidth: 1,
                  }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mute}
                  value={date}
                  onChangeText={setDate}
                  keyboardType="numbers-and-punctuation"
                />
              </Field>

              <Field label="Tags (space-separated, optional)" colors={colors}>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.backgroundSoft,
                    color: colors.ink,
                    borderColor: "transparent",
                    borderWidth: 1,
                  }]}
                  placeholder="e.g. lunch work"
                  placeholderTextColor={colors.mute}
                  value={tags}
                  onChangeText={setTags}
                  autoCapitalize="none"
                  returnKeyType="done"
                />
              </Field>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.ink }]}
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <Text style={[styles.submitBtnText, { color: colors.background }]}>
                  Save expense
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  colors,
  children,
}: {
  label: string;
  error?: string;
  colors: ReturnType<typeof useTheme>["colors"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.ink }]}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Full-screen container — backdrop is absolute inside this
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  // KAV itself is not full-height — it wraps only the sheet
  kav: {
    // no flex:1 here — we want it to hug the sheet at the bottom
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    marginBottom: 20,
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  input: {
    borderRadius: 8,
    fontFamily: "Inter",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  multiline: { height: 80, paddingTop: 14, textAlignVertical: "top" },
  pickerRow: { alignItems: "center", flexDirection: "row", paddingVertical: 14 },
  pickerText: { flex: 1, fontFamily: "Inter", fontSize: 16 },
  chevron: { fontSize: 12 },
  dot: { borderRadius: 999, height: 12, marginRight: 10, width: 12 },
  dropList: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 200,
    overflow: "hidden",
  },
  dropItem: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropItemText: { flex: 1, fontFamily: "Inter", fontSize: 15 },
  check: { fontFamily: "Inter-Bold", fontSize: 14 },
  fieldWrap: { marginBottom: 20 },
  fieldLabel: { fontFamily: "Inter-Medium", fontSize: 14, marginBottom: 8 },
  fieldError: { color: "#dc2626", fontFamily: "Inter", fontSize: 12, marginTop: 4 },
  submitBtn: {
    alignItems: "center",
    borderRadius: 999,
    marginTop: 8,
    paddingVertical: 16,
  },
  submitBtnText: { fontFamily: "Inter-Medium", fontSize: 16 },
});
