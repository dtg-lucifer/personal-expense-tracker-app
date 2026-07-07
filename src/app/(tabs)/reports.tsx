/**
 * src/app/(tabs)/reports.tsx — Reports screen, fully theme-aware.
 *
 * Fixes:
 * - All hardcoded colors replaced with theme tokens
 * - "All" filter pill correctly deselects category
 * - Yearly mode uses monthly aggregation (ExpenseMonthlyLineChart) instead of
 *   365 daily points
 * - Charts receive isDark from theme
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

import {
  ExpenseDonutChart,
  ExpenseLineChart,
  ExpenseMonthlyLineChart,
} from "@/components/ExpenseChart";
import ExpenseList from "@/components/ExpenseList";
import { useTheme } from "@/context/ThemeContext";
import {
  getAllCategories,
  getDailyTotalsInRange,
  getExpenseSummaryInRange,
  getExpensesInRange,
  getMonthlyTotalsInRange,
  getTotalInRange,
  getMonthRange,
  getWeekRange,
  getYearRange,
  toISODate,
  type Category,
  type CategorySummary,
  type DailyTotal,
  type MonthlyTotal,
  type ExpenseWithCategory,
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
      label: d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    };
  }

  if (mode === "weekly") {
    const base = new Date(now);
    base.setDate(base.getDate() + offset * 7);
    const { start, end } = getWeekRange(base);
    return {
      start,
      end,
      label: `${start.slice(5)} – ${end.slice(5)}`,
    };
  }

  if (mode === "monthly") {
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const { start, end } = getMonthRange(base);
    return {
      start,
      end,
      label: base.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    };
  }

  // yearly
  const base = new Date(now.getFullYear() + offset, 0, 1);
  const { start, end } = getYearRange(base);
  return {
    start,
    end,
    label: String(base.getFullYear()),
  };
}

function shortDayLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function shortMonthLabel(month: string): string {
  // month is YYYY-MM
  const d = new Date(month + "-01T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short" });
}

// ─── Component ────────────────────────────────────────────────────────────────

const PERIOD_MODES: PeriodMode[] = ["daily", "weekly", "monthly", "yearly"];

export default function ReportsScreen() {
  const { colors } = useTheme();

  const [mode, setMode] = useState<PeriodMode>("weekly");
  const [offset, setOffset] = useState(0);

  // null = All selected; number = specific category
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    number | null
  >(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { start, end, label } = useMemo(
    () => getRangeForPeriod(mode, offset),
    [mode, offset]
  );

  const catIdArg = selectedCategoryId ?? undefined;

  const loadData = useCallback(() => {
    setCategories(getAllCategories());
    setCategorySummary(getExpenseSummaryInRange(start, end));
    setTotal(getTotalInRange(start, end));
    setExpenses(getExpensesInRange(start, end, catIdArg));

    if (mode === "yearly") {
      setMonthlyTotals(getMonthlyTotalsInRange(start, end, catIdArg));
    } else {
      setDailyTotals(getDailyTotalsInRange(start, end, catIdArg));
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
    setSelectedCategoryId((prev) => (prev === id ? null : id));
  }

  function handleAllPress() {
    setSelectedCategoryId(null);
  }

  // Dynamic styles that depend on theme
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
        navBtnDisabled: { opacity: 0.3 },
        navBtnText: { color: colors.ink, fontSize: 20, lineHeight: 24 },
        navLabel: {
          color: colors.ink,
          fontFamily: "Inter-Medium",
          fontSize: 16,
          flex: 1,
          textAlign: "center" as const,
        },
        totalCard: {
          backgroundColor: colors.ink,
          borderRadius: 16,
          marginBottom: 16,
          padding: 20,
        },
        totalLabel: {
          color: colors.background,
          fontFamily: "Inter",
          fontSize: 13,
          marginBottom: 4,
          opacity: 0.6,
        },
        totalAmount: {
          color: colors.background,
          fontFamily: "Inter-Bold",
          fontSize: 32,
        },
        filterNote: {
          color: colors.background,
          fontFamily: "Inter",
          fontSize: 11,
          marginTop: 4,
          opacity: 0.6,
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
        {/* Title */}
        <Text style={S.screenTitle}>Reports</Text>

        {/* Period toggle */}
        <View style={S.modeRow}>
          {PERIOD_MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[S.modeBtn, mode === m && S.modeBtnActive]}
              onPress={() => handleModeChange(m)}
            >
              <Text
                style={[S.modeBtnText, mode === m && S.modeBtnTextActive]}
              >
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
            style={[S.navBtn, offset >= 0 && S.navBtnDisabled]}
            onPress={() => setOffset((o) => Math.min(o + 1, 0))}
            disabled={offset >= 0}
          >
            <Text style={[S.navBtnText, offset >= 0 && { opacity: 0.3 }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Total card */}
        <View style={S.totalCard}>
          <Text style={S.totalLabel}>Total spent</Text>
          <Text style={S.totalAmount}>₹{total.toFixed(2)}</Text>
          {selectedCategoryId !== null && (
            <Text style={S.filterNote}>
              Filtered — tap All to see everything
            </Text>
          )}
        </View>

        {/* Category filter pills */}
        {categorySummary.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillScroll}
            contentContainerStyle={styles.pillRow}
          >
            {/* All pill */}
            <TouchableOpacity
              style={[S.pill, selectedCategoryId === null && S.pillActive]}
              onPress={handleAllPress}
            >
              <Text
                style={[
                  S.pillText,
                  selectedCategoryId === null && S.pillTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {/* Category pills */}
            {categorySummary.map((s) => (
              <TouchableOpacity
                key={s.category_id}
                style={[
                  S.pill,
                  selectedCategoryId === s.category_id && S.pillActive,
                ]}
                onPress={() => handleCategoryPress(s.category_id)}
              >
                <View
                  style={[
                    styles.pillDot,
                    { backgroundColor: s.category_color },
                  ]}
                />
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

        {/* Trend chart — line for daily/weekly/monthly, monthly-aggregated for yearly */}
        <View style={styles.section}>
          <Text style={S.sectionTitle}>Spending trend</Text>
          <View style={S.chartCard}>
            {mode === "yearly" ? (
              <ExpenseMonthlyLineChart
                data={monthlyTotals}
                xLabelFormatter={shortMonthLabel}
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

        {/* Donut chart — only when no category filter */}
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

        {/* Breakdown table — only when no category filter */}
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
                  >
                    <View
                      style={[
                        styles.breakdownDot,
                        { backgroundColor: s.category_color },
                      ]}
                    />
                    <Text style={S.breakdownName} numberOfLines={1}>
                      {s.category_name}
                    </Text>
                    <View style={styles.breakdownRight}>
                      <Text style={S.breakdownCount}>{s.count}×</Text>
                      <Text style={S.breakdownAmount}>
                        ₹{s.total.toFixed(2)}
                      </Text>
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
                  categorySummary.find(
                    (s) => s.category_id === selectedCategoryId
                  )?.category_name ?? "Category"
                } expenses`
              : "All expenses"}
          </Text>
          <View style={S.listCard}>
            <ExpenseList
              expenses={expenses}
              onRefresh={loadData}
              showDate
              emptyMessage="No expenses for this period"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Static styles (no theme dependency) ─────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  // Extra paddingBottom: 140 accounts for absolute-positioned tab bar (60) +
  // typical bottom inset (34) + breathing room (46)
  content: { paddingBottom: 140, paddingHorizontal: 16 },
  pillScroll: { marginBottom: 20 },
  pillRow: { flexDirection: "row", gap: 8 },
  pillDot: { borderRadius: 999, height: 8, marginRight: 6, width: 8 },
  section: { marginBottom: 24 },
  breakdownDot: { borderRadius: 999, height: 10, marginRight: 12, width: 10 },
  breakdownRight: { alignItems: "flex-end" },
  barFill: { borderRadius: 999, height: 3 },
});
