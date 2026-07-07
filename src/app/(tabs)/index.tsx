/**
 * src/app/(tabs)/index.tsx — Home screen, dark-mode aware.
 *
 * The tab bar is position:absolute (overlay), so:
 * - ScrollView contentContainerStyle has paddingBottom that accounts for the
 *   tab bar height so content is never hidden behind it.
 * - FAB sits above the tab bar using `bottom` that accounts for insets.
 *
 * Single-tapping an expense in the list opens the edit modal.
 */

import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AddExpenseModal from "@/components/AddExpenseModal";
import { ExpenseLineChart } from "@/components/ExpenseChart";
import ExpenseList from "@/components/ExpenseList";
import { useTheme } from "@/context/ThemeContext";
import { formatDate as formatDateUtil } from "@/lib/dateUtils";
import {
  getDailyTotalsInRange,
  getExpensesForDate,
  getTopCategoryThisWeek,
  getTotalInRange,
  getWeekRange,
  today,
  type CategorySummary,
  type DailyTotal,
  type ExpenseWithCategory,
} from "@/lib/database";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function shortDay(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
  });
}

// Tab bar height: 60px + bottom inset (accounts for gesture nav bar)
const TAB_BAR_HEIGHT = 60;

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null);

  const [todayExpenses, setTodayExpenses] = useState<ExpenseWithCategory[]>([]);
  const [weeklyTotals, setWeeklyTotals] = useState<DailyTotal[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [topCategory, setTopCategory] = useState<CategorySummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    const t = today();
    const exp = getExpensesForDate(t);
    setTodayExpenses(exp);
    // Today total: only expenses (gains shown separately)
    setTodayTotal(exp.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0));
    const { start, end } = getWeekRange();
    setWeeklyTotals(getDailyTotalsInRange(start, end));
    setWeekTotal(getTotalInRange(start, end));
    setTopCategory(getTopCategoryThisWeek(1)[0] ?? null);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  }, [loadData]);

  function handleEdit(expense: ExpenseWithCategory) {
    setEditingExpense(expense);
    setModalVisible(true);
  }

  function handleModalClose() {
    setModalVisible(false);
    setEditingExpense(null);
  }

  // Tab bar overlays the screen; we need to push content above it
  const tabBarClearance = TAB_BAR_HEIGHT + insets.bottom;
  // FAB sits 16px above the tab bar
  const fabBottom = tabBarClearance + 16;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarClearance + 80 }, // 80px extra so FAB doesn't cover last item
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.body }]}>
            {greeting()}
          </Text>
          <Text style={[styles.dateText, { color: colors.ink }]}>
            {formatDateUtil(today())}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { flex: 1, marginRight: 8, backgroundColor: colors.backgroundSoft },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.body }]}>Today</Text>
            <Text style={[styles.statAmount, { color: colors.ink }]}>
              ₹{todayTotal.toFixed(2)}
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { flex: 1, marginLeft: 8, backgroundColor: colors.backgroundSoft },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.body }]}>
              This week
            </Text>
            <Text style={[styles.statAmount, { color: colors.ink }]}>
              ₹{weekTotal.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Top category — polarity-flipped band */}
        {topCategory ? (
          <View style={styles.topCard}>
            <View style={styles.topCardLeft}>
              <Text style={styles.topCardEyebrow}>TOP THIS WEEK</Text>
              <Text style={styles.topCardName}>{topCategory.category_name}</Text>
              <Text style={styles.topCardSub}>
                {topCategory.count} expense{topCategory.count !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.topCardRight}>
              <View
                style={[
                  styles.topDot,
                  { backgroundColor: topCategory.category_color },
                ]}
              />
              <Text style={styles.topCardAmount}>
                ₹{topCategory.total.toFixed(2)}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.topCardEmpty,
              { backgroundColor: colors.backgroundSoft },
            ]}
          >
            <Text style={[styles.topCardEmptyText, { color: colors.mute }]}>
              No expenses this week
            </Text>
          </View>
        )}

        {/* Weekly trend chart */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            Weekly trend
          </Text>
          <View
            style={[styles.chartCard, { backgroundColor: colors.background }]}
          >
            <ExpenseLineChart
              data={weeklyTotals}
              xLabelFormatter={shortDay}
              height={180}
            />
          </View>
        </View>

        {/* Today's transactions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            Today's transactions
          </Text>
          <View
            style={[
              styles.listCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.hairline,
              },
            ]}
          >
            <ExpenseList
              expenses={todayExpenses}
              onRefresh={loadData}
              onEdit={handleEdit}
              emptyMessage="Nothing logged today"
            />
          </View>
        </View>
      </ScrollView>

      {/* FAB — floats above the tab bar */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.ink,
            shadowColor: colors.ink,
            bottom: fabBottom,
          },
        ]}
        onPress={() => {
          setEditingExpense(null);
          setModalVisible(true);
        }}
        activeOpacity={0.85}
        accessibilityLabel="Add transaction"
        accessibilityRole="button"
      >
        <Text style={[styles.fabIcon, { color: colors.background }]}>+</Text>
      </TouchableOpacity>

      <AddExpenseModal
        visible={modalVisible}
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
  header: { paddingTop: 16, paddingBottom: 20 },
  greeting: { fontFamily: "Inter-Medium", fontSize: 14, marginBottom: 2 },
  dateText: { fontFamily: "Inter-Bold", fontSize: 24 },
  statsRow: { flexDirection: "row", marginBottom: 16 },
  statCard: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
  statLabel: { fontFamily: "Inter", fontSize: 12, marginBottom: 4 },
  statAmount: { fontFamily: "Inter-Bold", fontSize: 22 },
  // Polarity-flip dark band — intentionally hardcoded black/white (inversion motif)
  topCard: {
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    padding: 20,
  },
  topCardLeft: { flex: 1 },
  topCardEyebrow: {
    color: "#afafaf",
    fontFamily: "Inter-Medium",
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  topCardName: {
    color: "#ffffff",
    fontFamily: "Inter-Bold",
    fontSize: 20,
    marginBottom: 4,
  },
  topCardSub: { color: "#afafaf", fontFamily: "Inter", fontSize: 13 },
  topCardRight: { alignItems: "flex-end" },
  topDot: { borderRadius: 999, height: 12, marginBottom: 6, width: 12 },
  topCardAmount: { color: "#ffffff", fontFamily: "Inter-Bold", fontSize: 24 },
  topCardEmpty: {
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 24,
    paddingVertical: 20,
  },
  topCardEmptyText: { fontFamily: "Inter", fontSize: 14 },
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
