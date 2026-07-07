/**
 * src/app/(tabs)/budget.tsx
 *
 * Budget tracker tab.
 *
 * - User sets their current balance (stored in budget_balance table).
 * - Every expense deducts from balance; every gain adds to balance.
 * - Line chart shows running balance over the current month.
 * - Full transaction list (both gains and expenses) at the bottom.
 * - FAB opens AddExpenseModal; single tap on list item opens edit modal.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AddExpenseModal from "@/components/AddExpenseModal";
import { BudgetLineChart } from "@/components/ExpenseChart";
import ExpenseList from "@/components/ExpenseList";
import { useTheme } from "@/context/ThemeContext";
import { formatDateShort } from "@/lib/dateUtils";
import {
  getBalanceOverTime,
  getBudgetBalance,
  getExpensesInRange,
  getGainTotalInRange,
  getMonthRange,
  getTotalInRange,
  setBudgetBalance,
  today,
  toISODate,
  type BalancePoint,
  type ExpenseWithCategory,
} from "@/lib/database";

const TAB_BAR_HEIGHT = 60;

function shortDay(date: string): string {
  return formatDateShort(date);
}

// ─── Set Balance Modal ────────────────────────────────────────────────────────

interface SetBalanceModalProps {
  visible: boolean;
  currentBalance: number;
  onClose: () => void;
  onSaved: () => void;
}

function SetBalanceModal({
  visible,
  currentBalance,
  onClose,
  onSaved,
}: SetBalanceModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(String(currentBalance > 0 ? currentBalance : ""));
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setValue(currentBalance > 0 ? String(currentBalance) : "");
      setError("");
    }
  }, [visible, currentBalance]);

  function handleSave() {
    const parsed = parseFloat(value);
    if (!value || isNaN(parsed) || parsed < 0) {
      setError("Enter a valid balance (≥ 0)");
      return;
    }
    setBudgetBalance(parsed);
    onSaved();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={bStyles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={bStyles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            bStyles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
            },
          ]}
        >
          <View style={[bStyles.handle, { backgroundColor: colors.hairline }]} />
          <View style={bStyles.header}>
            <Text style={[bStyles.title, { color: colors.ink }]}>Set balance</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[bStyles.closeBtn, { backgroundColor: colors.backgroundSoft }]}
              hitSlop={8}
            >
              <Text style={[bStyles.closeBtnText, { color: colors.ink }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[bStyles.subtitle, { color: colors.body }]}>
            Enter your current account balance. Gains and expenses will be applied on top of this.
          </Text>

          <TextInput
            style={[
              bStyles.input,
              {
                backgroundColor: colors.backgroundSoft,
                color: colors.ink,
                borderColor: error ? "#dc2626" : "transparent",
                borderWidth: 1,
              },
            ]}
            placeholder="e.g. 50000"
            placeholderTextColor={colors.mute}
            value={value}
            onChangeText={(t) => { setValue(t); setError(""); }}
            keyboardType="decimal-pad"
            returnKeyType="done"
            autoFocus
          />
          {error ? <Text style={bStyles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[bStyles.saveBtn, { backgroundColor: colors.ink }]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={[bStyles.saveBtnText, { color: colors.background }]}>
              Save balance
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const bStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  kav: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: { alignSelf: "center", borderRadius: 999, height: 4, marginBottom: 16, width: 40 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  title: { fontFamily: "Inter-Bold", fontSize: 20 },
  closeBtn: { alignItems: "center", borderRadius: 999, height: 32, justifyContent: "center", width: 32 },
  closeBtnText: { fontSize: 14 },
  subtitle: { fontFamily: "Inter", fontSize: 14, lineHeight: 20, marginBottom: 20 },
  input: { borderRadius: 8, fontFamily: "Inter", fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  error: { color: "#dc2626", fontFamily: "Inter", fontSize: 12, marginBottom: 12 },
  saveBtn: { alignItems: "center", borderRadius: 999, marginTop: 8, paddingVertical: 16 },
  saveBtnText: { fontFamily: "Inter-Medium", fontSize: 16 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BudgetScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [setBalanceVisible, setSetBalanceVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [storedBalance, setStoredBalance] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [balancePoints, setBalancePoints] = useState<BalancePoint[]>([]);
  const [transactions, setTransactions] = useState<ExpenseWithCategory[]>([]);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [monthGains, setMonthGains] = useState(0);

  const { start: monthStart, end: monthEnd } = getMonthRange();

  const loadData = useCallback(() => {
    const balance = getBudgetBalance();
    const base = balance?.amount ?? 0;
    setStoredBalance(base);

    const points = getBalanceOverTime(monthStart, monthEnd, base);
    setBalancePoints(points);

    // Current balance = last point in the series (up to today)
    const todayStr = today();
    const todayPoint = points.find(p => p.date === todayStr);
    setCurrentBalance(todayPoint?.balance ?? base);

    const txns = getExpensesInRange(monthStart, monthEnd);
    setTransactions(txns);

    setMonthExpenses(getTotalInRange(monthStart, monthEnd));
    setMonthGains(getGainTotalInRange(monthStart, monthEnd));
  }, [monthStart, monthEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  }, [loadData]);

  function handleEdit(expense: ExpenseWithCategory) {
    setEditingExpense(expense);
    setAddModalVisible(true);
  }

  function handleModalClose() {
    setAddModalVisible(false);
    setEditingExpense(null);
  }

  // Only show data points up to today for the chart
  const chartPoints = balancePoints.filter(p => p.date <= today());

  const tabBarClearance = TAB_BAR_HEIGHT + insets.bottom;
  const fabBottom = tabBarClearance + 16;

  const balanceDelta = currentBalance - storedBalance;
  const isPositive = balanceDelta >= 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.screenTitle, { color: colors.ink }]}>Budget</Text>
          <TouchableOpacity
            style={[styles.editBalanceBtn, { backgroundColor: colors.backgroundSoft }]}
            onPress={() => setSetBalanceVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.editBalanceBtnText, { color: colors.ink }]}>
              Set balance
            </Text>
          </TouchableOpacity>
        </View>

        {/* Balance hero card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>CURRENT BALANCE</Text>
          <Text style={styles.heroAmount}>₹{currentBalance.toFixed(2)}</Text>
          <View style={styles.heroSubRow}>
            <Text style={styles.heroSub}>
              Starting: ₹{storedBalance.toFixed(2)}
            </Text>
            <Text
              style={[
                styles.heroDelta,
                { color: isPositive ? "#4ade80" : "#f87171" },
              ]}
            >
              {isPositive ? "+" : ""}₹{balanceDelta.toFixed(2)} this month
            </Text>
          </View>
        </View>

        {/* Monthly stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1, marginRight: 8, backgroundColor: colors.backgroundSoft }]}>
            <Text style={[styles.statLabel, { color: colors.body }]}>Expenses</Text>
            <Text style={[styles.statAmount, { color: "#f87171" }]}>
              −₹{monthExpenses.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.statCard, { flex: 1, marginLeft: 8, backgroundColor: colors.backgroundSoft }]}>
            <Text style={[styles.statLabel, { color: colors.body }]}>Gains</Text>
            <Text style={[styles.statAmount, { color: "#4ade80" }]}>
              +₹{monthGains.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Balance over time chart */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Balance this month</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.background }]}>
            <BudgetLineChart
              data={chartPoints}
              xLabelFormatter={shortDay}
              height={200}
            />
          </View>
        </View>

        {/* All transactions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>All transactions</Text>
          <View style={[styles.listCard, { backgroundColor: colors.background, borderColor: colors.hairline }]}>
            <ExpenseList
              expenses={transactions}
              onRefresh={loadData}
              onEdit={handleEdit}
              showDate
              emptyMessage="No transactions this month"
            />
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.ink, shadowColor: colors.ink, bottom: fabBottom },
        ]}
        onPress={() => {
          setEditingExpense(null);
          setAddModalVisible(true);
        }}
        activeOpacity={0.85}
        accessibilityLabel="Add transaction"
        accessibilityRole="button"
      >
        <Text style={[styles.fabIcon, { color: colors.background }]}>+</Text>
      </TouchableOpacity>

      {/* Set balance modal */}
      <SetBalanceModal
        visible={setBalanceVisible}
        currentBalance={storedBalance}
        onClose={() => setSetBalanceVisible(false)}
        onSaved={loadData}
      />

      {/* Add/Edit transaction modal */}
      <AddExpenseModal
        visible={addModalVisible}
        onClose={handleModalClose}
        onAdded={loadData}
        defaultDate={today()}
        expense={editingExpense}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },

  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 20,
  },
  screenTitle: { fontFamily: "Inter-Bold", fontSize: 28 },
  editBalanceBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editBalanceBtnText: { fontFamily: "Inter-Medium", fontSize: 13 },

  // Hero balance card — polarity-flip dark band
  heroCard: {
    backgroundColor: "#000",
    borderRadius: 20,
    marginBottom: 16,
    padding: 24,
  },
  heroLabel: {
    color: "#afafaf",
    fontFamily: "Inter-Medium",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroAmount: {
    color: "#fff",
    fontFamily: "Inter-Bold",
    fontSize: 40,
    marginBottom: 12,
  },
  heroSubRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroSub: { color: "#afafaf", fontFamily: "Inter", fontSize: 13 },
  heroDelta: { fontFamily: "Inter-Medium", fontSize: 13 },

  statsRow: { flexDirection: "row", marginBottom: 24 },
  statCard: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
  statLabel: { fontFamily: "Inter", fontSize: 12, marginBottom: 4 },
  statAmount: { fontFamily: "Inter-Bold", fontSize: 20 },

  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter-Bold", fontSize: 18, marginBottom: 12 },
  chartCard: { borderRadius: 16, overflow: "hidden" },
  listCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },

  fab: {
    alignItems: "center",
    borderRadius: 999,
    elevation: 6,
    height: 60,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    width: 60,
  },
  fabIcon: { fontSize: 28, lineHeight: 32 },
});
