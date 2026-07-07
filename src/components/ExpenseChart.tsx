/**
 * components/ExpenseChart.tsx
 *
 * Wrappers for react-native-chart-kit v2 LineChart and DonutChart.
 *
 * The chart library's default dark theme uses a bluish background. We override
 * it by passing a full CartesianChartTheme object that uses the app's own
 * background/text colors so the chart blends seamlessly with the UI.
 */

import { BarChart, DonutChart, LineChart } from "react-native-chart-kit/v2";
import type { CartesianChartTheme } from "react-native-chart-kit/v2";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import type { ThemeColors } from "@/context/ThemeContext";
import type { CategorySummary, DailyTotal, MonthlyTotal } from "@/lib/database";

// ─── Build a chart theme from the app's palette ───────────────────────────────

function buildChartTheme(colors: ThemeColors): CartesianChartTheme {
  return {
    background: colors.background,       // main chart background — pure black or white
    plotBackground: colors.background,   // the inner plotting area — same
    grid: colors.hairline,               // grid lines
    axis: colors.hairline,               // axis lines
    text: colors.body,                   // axis labels
    mutedText: colors.mute,              // secondary labels
  };
}

// ─── LineChart wrapper (daily data) ──────────────────────────────────────────

interface ExpenseLineChartProps {
  data: DailyTotal[];
  xLabelFormatter?: (date: string) => string;
  height?: number;
}

export function ExpenseLineChart({
  data,
  xLabelFormatter,
  height = 200,
}: ExpenseLineChartProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const chartWidth = width - 32;

  if (data.length === 0) {
    return (
      <View
        style={[
          styles.emptyChart,
          { height, backgroundColor: colors.backgroundSoft },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.mute }]}>
          No data for this period
        </Text>
      </View>
    );
  }

  const chartData = data.map((d) => ({
    label: xLabelFormatter ? xLabelFormatter(d.date) : d.date.slice(5),
    total: d.total,
  }));

  return (
    <LineChart
      data={chartData}
      xKey="label"
      yKey="total"
      width={chartWidth}
      height={height}
      curve="monotone"
      theme={buildChartTheme(colors)}
    />
  );
}

// ─── LineChart wrapper (monthly aggregated — for yearly view) ─────────────────

interface ExpenseMonthlyLineChartProps {
  data: MonthlyTotal[];
  xLabelFormatter?: (month: string) => string;
  height?: number;
}

export function ExpenseMonthlyLineChart({
  data,
  xLabelFormatter,
  height = 200,
}: ExpenseMonthlyLineChartProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const chartWidth = width - 32;

  if (data.length === 0) {
    return (
      <View
        style={[
          styles.emptyChart,
          { height, backgroundColor: colors.backgroundSoft },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.mute }]}>
          No data for this period
        </Text>
      </View>
    );
  }

  const chartData = data.map((d) => ({
    label: xLabelFormatter ? xLabelFormatter(d.month) : d.month.slice(5),
    total: d.total,
  }));

  return (
    <LineChart
      data={chartData}
      xKey="label"
      yKey="total"
      width={chartWidth}
      height={height}
      curve="monotone"
      theme={buildChartTheme(colors)}
    />
  );
}

// ─── BarChart wrapper (daily data — for monthly view) ────────────────────────

interface ExpenseBarChartProps {
  data: DailyTotal[];
  xLabelFormatter?: (date: string) => string;
  height?: number;
}

export function ExpenseBarChart({
  data,
  xLabelFormatter,
  height = 200,
}: ExpenseBarChartProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const chartWidth = width - 32;

  if (data.length === 0) {
    return (
      <View
        style={[
          styles.emptyChart,
          { height, backgroundColor: colors.backgroundSoft },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.mute }]}>
          No data for this period
        </Text>
      </View>
    );
  }

  const chartData = data.map((d) => ({
    label: xLabelFormatter ? xLabelFormatter(d.date) : d.date.slice(8), // default: day of month
    total: d.total,
  }));

  return (
    <BarChart
      data={chartData}
      xKey="label"
      series={[{ yKey: "total", color: colors.ink }]}
      width={chartWidth}
      height={height}
      theme={buildChartTheme(colors)}
    />
  );
}

// ─── BarChart wrapper (category totals — for daily view) ─────────────────────
// One bar per category. x = shortened category name, y = total spend.
// Uses a single series (color = ink) since BarChart colors per-series not per-bar.
// The donut + breakdown below the chart provides the color-coded detail.

interface ExpenseCategoryBarChartProps {
  data: CategorySummary[];
  height?: number;
}

export function ExpenseCategoryBarChart({
  data,
  height = 220,
}: ExpenseCategoryBarChartProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const chartWidth = width - 32;

  if (data.length === 0) {
    return (
      <View
        style={[
          styles.emptyChart,
          { height, backgroundColor: colors.backgroundSoft },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.mute }]}>
          No expenses today
        </Text>
      </View>
    );
  }

  // Shorten long category names so x-axis labels don't overlap
  const chartData = data.map((d) => ({
    label: d.category_name.length > 8
      ? d.category_name.slice(0, 7) + "…"
      : d.category_name,
    total: d.total,
  }));

  return (
    <BarChart
      data={chartData}
      xKey="label"
      series={[{ yKey: "total", color: colors.ink }]}
      width={chartWidth}
      height={height}
      theme={buildChartTheme(colors)}
    />
  );
}

// ─── DonutChart wrapper ───────────────────────────────────────────────────────

interface ExpenseDonutChartProps {
  data: CategorySummary[];
  total?: number;
  height?: number;
}

export function ExpenseDonutChart({
  data,
  total,
  height = 300,
}: ExpenseDonutChartProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const chartWidth = width - 32;

  if (data.length === 0) {
    return (
      <View
        style={[
          styles.emptyChart,
          { height, backgroundColor: colors.backgroundSoft },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.mute }]}>
          No category data for this period
        </Text>
      </View>
    );
  }

  const chartData = data.map((d) => ({
    category: d.category_name,
    amount: d.total,
    color: d.category_color || "#AEB6BF",
  }));

  const centerText =
    total !== undefined ? `₹${total.toFixed(0)}` : undefined;

  return (
    <DonutChart
      data={chartData}
      valueKey="amount"
      labelKey="category"
      colorKey="color"
      centerLabel={centerText}
      width={chartWidth}
      height={height}
      legend={{ reservedHeight: 100, itemGap: 6 }}
      activeSlice={{ inactiveOpacity: 0.36, strokeWidth: 3 }}
      theme={buildChartTheme(colors)}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyChart: {
    alignItems: "center",
    borderRadius: 16,
    justifyContent: "center",
    width: "100%",
  },
  emptyText: {
    fontFamily: "Inter",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 40,
  },
});
