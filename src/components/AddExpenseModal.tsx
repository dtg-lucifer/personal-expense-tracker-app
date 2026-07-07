/**
 * components/AddExpenseModal.tsx
 *
 * Fullscreen modal for logging / editing transactions.
 *   - Fills the entire screen (no bottom-sheet, no backdrop)
 *   - Gain / Expense tab switcher at the top
 *   - Edit mode when `expense` prop is provided
 *   - Native date picker (Android: calendar dialog; iOS: inline)
 */

import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { formatDate } from "@/lib/dateUtils";
import {
  getAllCategories,
  insertExpense,
  today,
  toISODate,
  updateExpense,
  type Category,
  type ExpenseWithCategory,
  type TransactionType,
} from "@/lib/database";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  defaultDate?: string;
  /** Provide to open in edit mode pre-filled with this transaction */
  expense?: ExpenseWithCategory | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddExpenseModal({
  visible,
  onClose,
  onAdded,
  defaultDate,
  expense,
}: Props) {
  const { colors } = useTheme();
  const isEditMode = !!expense;

  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate ?? today());
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showIOSDatePicker, setShowIOSDatePicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const amountRef = useRef<TextInput>(null);

  // Populate form when modal opens
  useEffect(() => {
    if (visible) {
      const cats = getAllCategories();
      setCategories(cats);
      if (isEditMode && expense) {
        setTransactionType(expense.type ?? "expense");
        setName(expense.name);
        setAmount(String(expense.amount));
        setCategoryId(expense.category_id);
        setDescription(expense.description ?? "");
        setDate(expense.date);
        setTags(expense.tags ?? "");
      } else {
        setTransactionType("expense");
        if (!categoryId && cats.length > 0) setCategoryId(cats[0].id);
      }
    }
  }, [visible]);

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setName("");
      setAmount("");
      setDescription("");
      setDate(defaultDate ?? today());
      setTags("");
      setErrors({});
      setShowCategoryPicker(false);
      setShowIOSDatePicker(false);
    }
  }, [visible, defaultDate]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  function openDatePicker() {
    setShowCategoryPicker(false);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: parseISODate(date),
        mode: "date",
        display: "calendar",
        maximumDate: new Date(),
        onChange: (event, picked) => {
          if (event.type === "set" && picked) {
            setDate(toISODate(picked));
            setErrors((e) => ({ ...e, date: "" }));
          }
        },
      });
    } else {
      setShowIOSDatePicker((v) => !v);
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    const p = parseFloat(amount);
    if (!amount || isNaN(p) || p <= 0) errs.amount = "Enter a valid amount";
    if (!categoryId) errs.category = "Select a category";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    try {
      const params = {
        name: name.trim(),
        amount: parseFloat(amount),
        category_id: categoryId!,
        description: description.trim(),
        date,
        tags: tags.trim(),
        type: transactionType,
      };
      if (isEditMode && expense) {
        updateExpense(expense.id, params);
      } else {
        insertExpense(params);
      }
      onAdded();
      onClose();
    } catch {
      Alert.alert("Error", `Could not save ${transactionType}.`);
    }
  }

  const isGain = transactionType === "gain";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <View style={[styles.topBar, { borderBottomColor: colors.hairline }]}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelBtn}
              hitSlop={12}
            >
              <Text style={[styles.cancelBtnText, { color: colors.body }]}>Cancel</Text>
            </TouchableOpacity>

            <Text style={[styles.title, { color: colors.ink }]}>
              {isEditMode ? "Edit transaction" : "Log transaction"}
            </Text>

            {/* Spacer to balance the Cancel button and keep title centred */}
            <View style={styles.topBarSpacer} />
          </View>

          {/* ── Gain / Expense switcher ──────────────────────────────────── */}
          <View style={[styles.typeBar, { backgroundColor: colors.backgroundSoft }]}>
            <TouchableOpacity
              style={[styles.typeTab, isGain && styles.typeTabGain]}
              onPress={() => setTransactionType("gain")}
              activeOpacity={0.8}
            >
              <Text style={[styles.typeTabText, { color: isGain ? "#fff" : colors.body }]}>
                ↑  Gain
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeTab,
                !isGain && { backgroundColor: colors.ink },
              ]}
              onPress={() => setTransactionType("expense")}
              activeOpacity={0.8}
            >
              <Text style={[styles.typeTabText, { color: !isGain ? colors.background : colors.body }]}>
                ↓  Expense
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Form ─────────────────────────────────────────────────────── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <Field label="Name" error={errors.name} colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSoft, color: colors.ink, borderColor: errors.name ? "#dc2626" : "transparent", borderWidth: 1 }]}
                placeholder={isGain ? "e.g. Salary" : "e.g. Coffee"}
                placeholderTextColor={colors.mute}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                onSubmitEditing={() => amountRef.current?.focus()}
              />
            </Field>

            {/* Amount */}
            <Field label="Amount (₹)" error={errors.amount} colors={colors}>
              <TextInput
                ref={amountRef}
                style={[styles.input, { backgroundColor: colors.backgroundSoft, color: colors.ink, borderColor: errors.amount ? "#dc2626" : "transparent", borderWidth: 1 }]}
                placeholder="0.00"
                placeholderTextColor={colors.mute}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </Field>

            {/* Category */}
            <Field label="Category" error={errors.category} colors={colors}>
              <TouchableOpacity
                style={[styles.input, styles.row, { backgroundColor: colors.backgroundSoft, borderColor: errors.category ? "#dc2626" : "transparent", borderWidth: 1 }]}
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
                <View style={[styles.dropList, { backgroundColor: colors.background, borderColor: colors.hairline }]}>
                  <ScrollView style={styles.dropScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.dropItem, { borderBottomColor: colors.backgroundSoft }, cat.id === categoryId && { backgroundColor: colors.backgroundSofter }]}
                        onPress={() => { setCategoryId(cat.id); setShowCategoryPicker(false); }}
                      >
                        <View style={[styles.dot, { backgroundColor: cat.color }]} />
                        <Text style={[styles.dropItemText, { color: colors.ink }, cat.id === categoryId && { fontFamily: "Inter-Medium" }]}>
                          {cat.name}
                        </Text>
                        {cat.id === categoryId && <Text style={[styles.check, { color: colors.ink }]}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </Field>

            {/* Description */}
            <Field label="Description (optional)" colors={colors}>
              <TextInput
                style={[styles.input, styles.multiline, { backgroundColor: colors.backgroundSoft, color: colors.ink, borderColor: "transparent", borderWidth: 1 }]}
                placeholder="Add notes…"
                placeholderTextColor={colors.mute}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </Field>

            {/* Date */}
            <Field label="Date" error={errors.date} colors={colors}>
              <TouchableOpacity
                style={[styles.input, styles.row, { backgroundColor: colors.backgroundSoft, borderColor: errors.date ? "#dc2626" : "transparent", borderWidth: 1 }]}
                onPress={openDatePicker}
                activeOpacity={0.7}
              >
                <Text style={[styles.calIcon, { color: colors.body }]}>📅</Text>
                <Text style={[styles.pickerText, { color: colors.ink }]}>{formatDate(date)}</Text>
                <Text style={[styles.chevron, { color: colors.body }]}>▼</Text>
              </TouchableOpacity>

              {Platform.OS === "ios" && showIOSDatePicker && (
                <View style={[styles.iosPickerWrap, { backgroundColor: colors.backgroundSoft }]}>
                  <DateTimePicker
                    value={parseISODate(date)}
                    mode="date"
                    display="inline"
                    maximumDate={new Date()}
                    themeVariant={colors.isDark ? "dark" : "light"}
                    onChange={(_, picked) => {
                      if (picked) { setDate(toISODate(picked)); setErrors((e) => ({ ...e, date: "" })); }
                    }}
                    style={{ width: "100%" }}
                  />
                  <TouchableOpacity style={[styles.iosPickerDone, { backgroundColor: colors.ink }]} onPress={() => setShowIOSDatePicker(false)}>
                    <Text style={[styles.iosPickerDoneText, { color: colors.background }]}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Field>

            {/* Tags */}
            <Field label="Tags (space-separated, optional)" colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSoft, color: colors.ink, borderColor: "transparent", borderWidth: 1 }]}
                placeholder="e.g. lunch work"
                placeholderTextColor={colors.mute}
                value={tags}
                onChangeText={setTags}
                autoCapitalize="none"
                returnKeyType="done"
              />
            </Field>

            {/* Bottom save button (alternative to top-bar button) */}
            <TouchableOpacity
              style={[styles.bottomSaveBtn, { backgroundColor: isGain ? "#16a34a" : colors.ink }]}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={[styles.bottomSaveBtnText, { color: isGain ? "#fff" : colors.background }]}>
                {isEditMode ? `Update ${transactionType}` : `Save ${transactionType}`}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  safe: { flex: 1 },
  flex: { flex: 1 },

  // Top navigation bar
  topBar: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtn: { minWidth: 60 },
  cancelBtnText: { fontFamily: "Inter-Medium", fontSize: 15 },
  title: { fontFamily: "Inter-Bold", fontSize: 17 },
  topBarSpacer: { minWidth: 60 },

  // Gain / Expense switcher
  typeBar: {
    flexDirection: "row",
    margin: 16,
    borderRadius: 999,
    padding: 4,
  },
  typeTab: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    paddingVertical: 11,
  },
  typeTabGain: { backgroundColor: "#16a34a" },
  typeTabText: { fontFamily: "Inter-Medium", fontSize: 14 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  input: {
    borderRadius: 8,
    fontFamily: "Inter",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  multiline: { height: 88, paddingTop: 14, textAlignVertical: "top" },
  row: { alignItems: "center", flexDirection: "row" },
  pickerText: { flex: 1, fontFamily: "Inter", fontSize: 16 },
  calIcon: { fontSize: 16, marginRight: 10 },
  chevron: { fontSize: 12 },
  dot: { borderRadius: 999, height: 12, marginRight: 10, width: 12 },
  dropList: { borderRadius: 8, borderWidth: 1, marginTop: 4 },
  dropScroll: { borderRadius: 8, maxHeight: 200 },
  dropItem: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12 },
  dropItemText: { flex: 1, fontFamily: "Inter", fontSize: 15 },
  check: { fontFamily: "Inter-Bold", fontSize: 14 },
  iosPickerWrap: { borderRadius: 12, marginTop: 8, overflow: "hidden", paddingBottom: 8 },
  iosPickerDone: { alignItems: "center", borderRadius: 999, marginHorizontal: 16, marginTop: 4, paddingVertical: 12 },
  iosPickerDoneText: { fontFamily: "Inter-Medium", fontSize: 15 },

  fieldWrap: { marginBottom: 20 },
  fieldLabel: { fontFamily: "Inter-Medium", fontSize: 14, marginBottom: 8 },
  fieldError: { color: "#dc2626", fontFamily: "Inter", fontSize: 12, marginTop: 4 },

  bottomSaveBtn: { alignItems: "center", borderRadius: 999, marginTop: 8, paddingVertical: 16 },
  bottomSaveBtnText: { fontFamily: "Inter-Medium", fontSize: 16 },
});
