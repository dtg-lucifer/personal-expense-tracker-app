/**
 * src/app/(tabs)/reports.tsx
 *
 * Period modes:
 *   daily   — bar chart of spend per category, donut, breakdown, expense list
 *   weekly  — line chart (Mon–Sun), donut, breakdown, expense list
 *   monthly — bar chart (one bar per day), donut, breakdown, expense list
 *   yearly  — line chart (Jan–Dec monthly totals), donut, breakdown, expense list
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AddExpenseModal from "@/components/AddExpenseModal";
import {
  ExpenseCategoryBarChart,
  ExpenseDonutChart,
  ExpenseLineChart,
  ExpenseMonthlyLineChart,
  BudgetLineChart,
} from "@/components/ExpenseChart";
import ExpenseList from "@/components/ExpenseList";
import { useTheme } from "@/context/ThemeContext";
import { formatDate, formatDateRange, formatMonthYear } from "@/lib/dateUtils";
import {
  getDailyTotalsInRange,
  getExpenseSummaryInRange,
  getExpensesInRange,
  getMonthlyTotalsInRange,
  getTotalInRange,
  getGainTotalInRange,
  getMonthRange,
  getWeekRange,
  getYearRange,
  getBudgetBalance,
  getBalanceOverTime,
  getActiveSavingsGoal,
  getSavingsProgress,
  today,
  toISODate,
  type CategorySummary,
  type DailyTotal,
  type MonthlyTotal,
  type ExpenseWithCategory,
  type SavingsGoal,
} from "@/lib/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodMode = "daily" | "weekly" | "monthly" | "yearly";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRangeForPeriod(
  mode: PeriodMode,
  offset: number
): { start: string; end: string; label: string } {
  const now = new Date();

  if (mode === "daily") {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const s = toISODate(d);
    return {
      start: s,
      end: s,
      label: formatDate(s),
    };
  }

  if (mode === "weekly") {
    const base = new Date(now);
    base.setDate(base.getDate() + offset * 7);
    const { start, end } = getWeekRange(base);
    return {
      start,
      end,
      label: formatDateRange(start, end),
    };
  }

  if (mode === "monthly") {
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const { start, end } = getMonthRange(base);
    return {
      start,
      end,
      label: formatMonthYear(`${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`),
    };
  }

  // yearly
  const base = new Date(now.getFullYear() + offset, 0, 1);
  const { start, end } = getYearRange(base);
  return { start, end, label: String(base.getFullYear()) };
}

function shortDayLabel(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function dayOfMonthLabel(date: string): string {
  return String(parseInt(date.slice(8), 10));
}

function shortMonthLabel(month: string): string {
  return new Date(month + "-01T00:00:00").toLocaleDateString("en-US", {
    month: "short",
  });
}

// Section title for the main chart
const CHART_TITLE: Record<PeriodMode, string> = {
  daily: "Spend by category",
  weekly: "Spending trend",
  monthly: "Spending trend",
  yearly: "Monthly trend",
};

// ─── Component ────────────────────────────────────────────────────────────────

const PERIOD_MODES: PeriodMode[] = ["daily", "weekly", "monthly", "yearly"];

export default function ReportsScreen() {
  const { colors } = useTheme();

  const [mode, setMode] = useState<PeriodMode>("daily");
  const [offset, setOffset] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null);

  // Budget + Savings summary (always shows current month regardless of period toggle)
  const [budgetBalance, setBudgetBalanceState] = useState(0);
  const [budgetCurrentBalance, setBudgetCurrentBalance] = useState(0);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [monthGains, setMonthGains] = useState(0);
  const [activeSavingsGoal, setActiveSavingsGoal] = useState<SavingsGoal | null>(null);
  const [savingsNet, setSavingsNet] = useState(0);

  const { start, end, label } = useMemo(
    () => getRangeForPeriod(mode, offset),
    [mode, offset]
  );

  const catIdArg = selectedCategoryId ?? undefined;

  const loadData = useCallback(() => {
    setCategorySummary(getExpenseSummaryInRange(start, end));
    setTotal(getTotalInRange(start, end));
    setExpenses(getExpensesInRange(start, end, catIdArg));

    if (mode === "yearly") {
      setMonthlyTotals(getMonthlyTotalsInRange(start, end, catIdArg));
      setDailyTotals([]);
    } else {
      setDailyTotals(getDailyTotalsInRange(start, end, catIdArg));
      setMonthlyTotals([]);
    }

    // Budget summary — always current month
    const { start: mStart, end: mEnd } = getMonthRange();
    const bal = getBudgetBalance();
    const base = bal?.amount ?? 0;
    setBudgetBalanceState(base);
    const points = getBalanceOverTime(mStart, mEnd, base);
    const todayStr = today();
    const todayPoint = points.find((p) => p.date === todayStr);
    setBudgetCurrentBalance(todayPoint?.balance ?? base);
    setMonthExpenses(getTotalInRange(mStart, mEnd));
    setMonthGains(getGainTotalInRange(mStart, mEnd));

    // Active savings goal
    const goal = getActiveSavingsGoal();
    setActiveSavingsGoal(goal);
    if (goal) {
      setSavingsNet(getSavingsProgress(goal.start_date, goal.end_date));
    } else {
      setSavingsNet(0);
    }
  }, [start, end, catIdArg, mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  }, [loadData]);

  function handleModeChange(m: PeriodMode) {
    setMode(m);
    setOffset(0);
    setSelectedCategoryId(null);
  }

  function handleCategoryPress(id: number) {
    // Category filter only applies in non-daily modes (daily always shows all categories)
    if (mode === "daily") return;
    setSelectedCategoryId((prev) => (prev === id ? null : id));
  }

  function handleAllPress() {
    setSelectedCategoryId(null);
  }

  function handleEdit(expense: ExpenseWithCategory) {
    setEditingExpense(expense);
    setEditModalVisible(true);
  }

  function handleEditClose() {
    setEditModalVisible(false);
    setEditingExpense(null);
  }

  // ── Dynamic styles ──────────────────────────────────────────────────────────
  const S = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        screenTitle: {
          color: colors.ink,
          fontFamily: "Inter-Bold",
          fontSize: 28,
          paddingTop: 20,
          marginBottom: 20,
        },
        modeRow: {
          backgroundColor: colors.backgroundSoft,
          borderRadius: 999,
          flexDirection: "row" as const,
          marginBottom: 20,
          padding: 4,
        },
        modeBtn: {
          borderRadius: 999,
          flex: 1,
          alignItems: "center" as const,
          paddingVertical: 8,
        },
        modeBtnActive: { backgroundColor: colors.ink },
        modeBtnText: {
          color: colors.body,
          fontFamily: "Inter-Medium",
          fontSize: 13,
        },
        modeBtnTextActive: { color: colors.background },
        navRow: {
          alignItems: "center" as const,
          flexDirection: "row" as const,
          justifyContent: "space-between" as const,
          marginBottom: 16,
        },
        navBtn: {
          alignItems: "center" as const,
          backgroundColor: colors.backgroundSoft,
          borderRadius: 999,
          height: 36,
          justifyContent: "center" as const,
          width: 36,
        },
        navBtnText: { color: colors.ink, fontSize: 20, lineHeight: 24 },
        navLabel: {
          color: colors.ink,
          fontFamily: "Inter-Medium",
          fontSize: 16,
          flex: 1,
          textAlign: "center" as const,
        },
        totalCard: {
          backgroundColor: colors.backgroundSoft,
          borderRadius: 16,
          marginBottom: 16,
          padding: 20,
        },
        totalLabel: {
          color: colors.body,
          fontFamily: "Inter",
          fontSize: 13,
          marginBottom: 4,
        },
        totalAmount: {
          color: colors.ink,
          fontFamily: "Inter-Bold",
          fontSize: 32,
        },
        filterNote: {
          color: colors.mute,
          fontFamily: "Inter",
          fontSize: 11,
          marginTop: 4,
        },
        pill: {
          alignItems: "center" as const,
          backgroundColor: colors.backgroundSoft,
          borderRadius: 999,
          flexDirection: "row" as const,
          paddingHorizontal: 14,
          paddingVertical: 7,
        },
        pillActive: { backgroundColor: colors.ink },
        pillText: { color: colors.body, fontFamily: "Inter-Medium", fontSize: 13 },
        pillTextActive: { color: colors.background },
        sectionTitle: {
          color: colors.ink,
          fontFamily: "Inter-Bold",
          fontSize: 18,
          marginBottom: 12,
        },
        chartCard: {
          backgroundColor: colors.background,
          borderRadius: 16,
          overflow: "hidden" as const,
        },
        listCard: {
          backgroundColor: colors.background,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.hairline,
          overflow: "hidden" as const,
        },
        breakdownCard: {
          backgroundColor: colors.backgroundSoft,
          borderRadius: 16,
          overflow: "hidden" as const,
        },
        breakdownRow: {
          alignItems: "center" as const,
          flexDirection: "row" as const,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 6,
        },
        breakdownName: {
          color: colors.ink,
          flex: 1,
          fontFamily: "Inter-Medium",
          fontSize: 14,
        },
        breakdownAmount: {
          color: colors.ink,
          fontFamily: "Inter-Bold",
          fontSize: 14,
        },
        breakdownCount: {
          color: colors.mute,
          fontFamily: "Inter",
          fontSize: 11,
        },
        barBg: {
          backgroundColor: colors.hairline,
          borderRadius: 999,
          height: 3,
          marginBottom: 10,
          marginHorizontal: 16,
          overflow: "hidden" as const,
        },
        separator: {
          backgroundColor: colors.hairline,
          height: 1,
          marginLeft: 16,
        },
      }),
    [colors]
  );

  // In daily mode category pills are irrelevant — we always show all categories
  const showCategoryFilter = mode !== "daily" && categorySummary.length > 0;

  return (
    <SafeAreaView style={S.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
          />
        }
      >
        <Text style={S.screenTitle}>Reports</Text>

        {/* Period toggle */}
        <View style={S.modeRow}>
          {PERIOD_MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[S.modeBtn, mode === m && S.modeBtnActive]}
              onPress={() => handleModeChange(m)}
            >
              <Text style={[S.modeBtnText, mode === m && S.modeBtnTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date navigation */}
        <View style={S.navRow}>
          <TouchableOpacity
            style={S.navBtn}
            onPress={() => setOffset((o) => o - 1)}
          >
            <Text style={S.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={S.navLabel}>{label}</Text>
          <TouchableOpacity
            style={[S.navBtn, offset >= 0 && { opacity: 0.3 }]}
            onPress={() => setOffset((o) => Math.min(o + 1, 0))}
            disabled={offset >= 0}
          >
            <Text style={S.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Total card */}
        <View style={S.totalCard}>
          <Text style={S.totalLabel}>Total spent</Text>
          <Text style={S.totalAmount}>₹{total.toFixed(2)}</Text>
          {selectedCategoryId !== null && (
            <Text style={S.filterNote}>Filtered — tap All to see everything</Text>
          )}
        </View>

        {/* ── Budget summary (current month) ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={S.sectionTitle}>Budget · this month</Text>
          <View style={[styles.budgetCard, { backgroundColor: "#000" }]}>
            <Text style={styles.budgetCardLabel}>CURRENT BALANCE</Text>
            <Text style={styles.budgetCardAmount}>₹{budgetCurrentBalance.toFixed(2)}</Text>
            <View style={styles.budgetCardRow}>
              <View style={styles.budgetCardStat}>
                <Text style={styles.budgetCardStatLabel}>Starting</Text>
                <Text style={styles.budgetCardStatValue}>₹{budgetBalance.toFixed(2)}</Text>
              </View>
              <View style={styles.budgetCardStat}>
                <Text style={styles.budgetCardStatLabel}>Expenses</Text>
                <Text style={[styles.budgetCardStatValue, { color: "#f87171" }]}>−₹{monthExpenses.toFixed(2)}</Text>
              </View>
              <View style={styles.budgetCardStat}>
                <Text style={styles.budgetCardStatLabel}>Gains</Text>
                <Text style={[styles.budgetCardStatValue, { color: "#4ade80" }]}>+₹{monthGains.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Active savings goal ──────────────────────────────────────── */}
        {activeSavingsGoal && (() => {
          const target = activeSavingsGoal.target_amount;
          const isMet = savingsNet >= target;
          const pct = target > 0 ? Math.min(1, Math.max(0, savingsNet / target)) : 0;
          const remaining = target - savingsNet;
          return (
            <View style={styles.section}>
              <Text style={S.sectionTitle}>Savings · {activeSavingsGoal.title}</Text>
              <View style={[styles.savingsCard, { backgroundColor: colors.backgroundSoft }]}>
                {/* Status text */}
                <Text style={[styles.savingsStatus, { color: isMet ? "#16a34a" : "#dc2626" }]}>
                  {isMet
                    ? `+₹${(savingsNet - target).toFixed(2)} extra saved 🎉`
                    : `₹${remaining.toFixed(2)} more to save`}
                </Text>
                {/* Progress bar */}
                <View style={[styles.savingsBarBg, { backgroundColor: colors.hairline }]}>
                  <View
                    style={[
                      styles.savingsBarFill,
                      {
                        width: `${Math.round(pct * 100)}%` as any,
                        backgroundColor: isMet ? "#16a34a" : colors.ink,
                      },
                    ]}
                  />
                </View>
                {/* Labels */}
                <View style={styles.savingsLabelRow}>
                  <Text style={[styles.savingsLabel, { color: colors.body }]}>
                    Saved: ₹{Math.max(0, savingsNet).toFixed(2)}
                  </Text>
                  <Text style={[styles.savingsLabel, { color: colors.body }]}>
                    Target: ₹{target.toFixed(2)}  ({Math.round(pct * 100)}%)
                  </Text>
                </View>
                <Text style={[styles.savingsMeta, { color: colors.mute }]}>
                  {activeSavingsGoal.period_type} · ends {formatDate(activeSavingsGoal.end_date)}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Category filter pills — hidden in daily mode */}
        {showCategoryFilter && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillScroll}
            contentContainerStyle={styles.pillRow}
          >
            <TouchableOpacity
              style={[S.pill, selectedCategoryId === null && S.pillActive]}
              onPress={handleAllPress}
            >
              <Text style={[S.pillText, selectedCategoryId === null && S.pillTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {categorySummary.map((s) => (
              <TouchableOpacity
                key={s.category_id}
                style={[S.pill, selectedCategoryId === s.category_id && S.pillActive]}
                onPress={() => handleCategoryPress(s.category_id)}
              >
                <View style={[styles.pillDot, { backgroundColor: s.category_color }]} />
                <Text
                  style={[
                    S.pillText,
                    selectedCategoryId === s.category_id && S.pillTextActive,
                  ]}
                >
                  {s.category_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/*
          Main chart — varies by mode:
            daily   → category bar chart (x = category, y = total)
            weekly  → line chart         (x = day of week, y = total)
            monthly → bar chart          (x = day of month, y = total)
            yearly  → line chart         (x = month, y = total)
        */}
        <View style={styles.section}>
          <Text style={S.sectionTitle}>{CHART_TITLE[mode]}</Text>
          <View style={S.chartCard}>
            {mode === "daily" ? (
              <ExpenseCategoryBarChart
                data={categorySummary}
                height={220}
              />
            ) : mode === "yearly" ? (
              <ExpenseMonthlyLineChart
                data={monthlyTotals}
                xLabelFormatter={shortMonthLabel}
                height={200}
              />
            ) : mode === "monthly" ? (
              <ExpenseLineChart
                data={dailyTotals}
                xLabelFormatter={dayOfMonthLabel}
                height={200}
              />
            ) : (
              <ExpenseLineChart
                data={dailyTotals}
                xLabelFormatter={shortDayLabel}
                height={200}
              />
            )}
          </View>
        </View>

        {/* Donut chart — always show when there's data and no category filter */}
        {selectedCategoryId === null && categorySummary.length > 0 && (
          <View style={styles.section}>
            <Text style={S.sectionTitle}>By category</Text>
            <View style={S.chartCard}>
              <ExpenseDonutChart
                data={categorySummary}
                total={total}
                height={300}
              />
            </View>
          </View>
        )}

        {/* Breakdown table */}
        {selectedCategoryId === null && categorySummary.length > 0 && (
          <View style={styles.section}>
            <Text style={S.sectionTitle}>Breakdown</Text>
            <View style={S.breakdownCard}>
              {categorySummary.map((s, i) => (
                <View key={s.category_id}>
                  {i > 0 && <View style={S.separator} />}
                  <TouchableOpacity
                    style={S.breakdownRow}
                    onPress={() => handleCategoryPress(s.category_id)}
                    activeOpacity={mode === "daily" ? 1 : 0.7}
                  >
                    <View
                      style={[styles.breakdownDot, { backgroundColor: s.category_color }]}
                    />
                    <Text style={S.breakdownName} numberOfLines={1}>
                      {s.category_name}
                    </Text>
                    <View style={styles.breakdownRight}>
                      <Text style={S.breakdownCount}>{s.count}×</Text>
                      <Text style={S.breakdownAmount}>₹{s.total.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={S.barBg}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(100, (s.total / total) * 100)}%` as any,
                          backgroundColor: s.category_color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Expense list */}
        <View style={styles.section}>
          <Text style={S.sectionTitle}>
            {selectedCategoryId !== null
              ? `${
                  categorySummary.find((s) => s.category_id === selectedCategoryId)
                    ?.category_name ?? "Category"
                } expenses`
              : mode === "daily"
              ? "Today's expenses"
              : "All expenses"}
          </Text>
          <View style={S.listCard}>
            <ExpenseList
              expenses={expenses}
              onRefresh={loadData}
              onEdit={handleEdit}
              showDate={mode !== "daily"}
              emptyMessage={
                mode === "daily"
                  ? "No expenses today"
                  : "No expenses for this period"
              }
            />
          </View>
        </View>
      </ScrollView>

      <AddExpenseModal
        visible={editModalVisible}
        onClose={handleEditClose}
        onAdded={loadData}
        expense={editingExpense}
      />
    </SafeAreaView>
  );
}

// ─── Static styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 140, paddingHorizontal: 16 },
  pillScroll: { marginBottom: 20 },
  pillRow: { flexDirection: "row", gap: 8 },
  pillDot: { borderRadius: 999, height: 8, marginRight: 6, width: 8 },
  section: { marginBottom: 24 },
  breakdownDot: { borderRadius: 999, height: 10, marginRight: 12, width: 10 },
  breakdownRight: { alignItems: "flex-end" },
  barFill: { borderRadius: 999, height: 3 },

  // Budget card
  budgetCard: {
    borderRadius: 16,
    padding: 20,
  },
  budgetCardLabel: {
    color: "#afafaf",
    fontFamily: "Inter-Medium",
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  budgetCardAmount: {
    color: "#fff",
    fontFamily: "Inter-Bold",
    fontSize: 32,
    marginBottom: 16,
  },
  budgetCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetCardStat: { alignItems: "flex-start" },
  budgetCardStatLabel: {
    color: "#afafaf",
    fontFamily: "Inter",
    fontSize: 11,
    marginBottom: 2,
  },
  budgetCardStatValue: {
    color: "#fff",
    fontFamily: "Inter-Bold",
    fontSize: 14,
  },

  // Savings card
  savingsCard: { borderRadius: 16, padding: 20 },
  savingsStatus: { fontFamily: "Inter-Bold", fontSize: 20, marginBottom: 14 },
  savingsBarBg: { borderRadius: 999, height: 8, overflow: "hidden", marginBottom: 8 },
  savingsBarFill: { borderRadius: 999, height: 8 },
  savingsLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  savingsLabel: { fontFamily: "Inter", fontSize: 12 },
  savingsMeta: { fontFamily: "Inter", fontSize: 11 },
});
