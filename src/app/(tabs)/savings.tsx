/**
 * src/app/(tabs)/savings.tsx
 *
 * Savings Goals tab.
 * - Add multiple savings goals that accumulate into a combined target
 * - Active goals (period not ended) cannot be edited or deleted
 * - Large status text: red = "X more to save", green = "X extra saved"
 * - Progress bar showing how far along the goal period we are
 * - Net savings = gains - expenses within the active goals' date range
 */

import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useCallback, useEffect, useState } from "react";
import Svg, { Path } from "react-native-svg";
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

import { useTheme } from "@/context/ThemeContext";
import { formatDate, formatDateRange } from "@/lib/dateUtils";
import {
  deleteSavingsGoal,
  getAllSavingsGoals,
  getActiveGoals,
  getSavingsProgress,
  insertSavingsGoal,
  today,
  toISODate,
  type SavingsGoal,
  type SavingsPeriodType,
} from "@/lib/database";

// ─── SVG Icons ─────────────────────────────────────────────────────────────────

function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Compute end date from start date + period type */
function computeEndDate(start: string, period: SavingsPeriodType): string {
  const d = parseISODate(start);
  if (period === "monthly") {
    // Last day of the same month
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return toISODate(end);
  } else {
    // Annual: same date next year minus one day
    const end = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate() - 1);
    return toISODate(end);
  }
}

/** Progress 0–1 of how far through the goal period we are today */
function periodProgress(start: string, end: string): number {
  const s = parseISODate(start).getTime();
  const e = parseISODate(end).getTime();
  const t = new Date().getTime();
  if (t <= s) return 0;
  if (t >= e) return 1;
  return (t - s) / (e - s);
}

// ─── Add / Edit Goal Modal ────────────────────────────────────────────────────

interface GoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function GoalModal({ visible, onClose, onSaved }: GoalModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [periodType, setPeriodType] = useState<SavingsPeriodType>("monthly");
  const [startDate, setStartDate] = useState(today());
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setTitle("");
      setTargetAmount("");
      setPeriodType("monthly");
      setStartDate(today());
      setErrors({});
      setShowIOSPicker(false);
    }
  }, [visible]);

  function openDatePicker() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: parseISODate(startDate),
        mode: "date",
        display: "calendar",
        onChange: (event, picked) => {
          if (event.type === "set" && picked) setStartDate(toISODate(picked));
        },
      });
    } else {
      setShowIOSPicker((v) => !v);
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    const p = parseFloat(targetAmount);
    if (!targetAmount || isNaN(p) || p <= 0) errs.target = "Enter a valid target amount";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    try {
      const endDate = computeEndDate(startDate, periodType);
      insertSavingsGoal(title.trim(), parseFloat(targetAmount), periodType, startDate, endDate);
      onSaved();
      onClose();
    } catch {
      Alert.alert("Error", "Could not save goal.");
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
      <Pressable style={gStyles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={gStyles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            gStyles.sheet,
            { backgroundColor: colors.background, paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          ]}
        >
          <View style={[gStyles.handle, { backgroundColor: colors.hairline }]} />
          <View style={gStyles.header}>
            <Text style={[gStyles.title, { color: colors.ink }]}>
              New savings goal
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[gStyles.closeBtn, { backgroundColor: colors.backgroundSoft }]}
              hitSlop={8}
            >
              <Text style={[gStyles.closeBtnText, { color: colors.ink }]}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Title */}
            <View style={gStyles.field}>
              <Text style={[gStyles.label, { color: colors.ink }]}>Goal title</Text>
              <TextInput
                style={[
                  gStyles.input,
                  { backgroundColor: colors.backgroundSoft, color: colors.ink, borderColor: errors.title ? "#dc2626" : "transparent", borderWidth: 1 },
                ]}
                placeholder="e.g. Emergency fund"
                placeholderTextColor={colors.mute}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
              />
              {errors.title ? <Text style={gStyles.error}>{errors.title}</Text> : null}
            </View>

            {/* Target amount */}
            <View style={gStyles.field}>
              <Text style={[gStyles.label, { color: colors.ink }]}>Target amount (₹)</Text>
              <TextInput
                style={[
                  gStyles.input,
                  { backgroundColor: colors.backgroundSoft, color: colors.ink, borderColor: errors.target ? "#dc2626" : "transparent", borderWidth: 1 },
                ]}
                placeholder="e.g. 10000"
                placeholderTextColor={colors.mute}
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              {errors.target ? <Text style={gStyles.error}>{errors.target}</Text> : null}
            </View>

            {/* Period type */}
            <View style={gStyles.field}>
              <Text style={[gStyles.label, { color: colors.ink }]}>Period</Text>
              <View style={[gStyles.segmentBar, { backgroundColor: colors.backgroundSoft }]}>
                {(["monthly", "annual"] as SavingsPeriodType[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      gStyles.segment,
                      periodType === p && { backgroundColor: colors.ink },
                    ]}
                    onPress={() => setPeriodType(p)}
                  >
                    <Text
                      style={[
                        gStyles.segmentText,
                        { color: periodType === p ? colors.background : colors.body },
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Start date */}
            <View style={gStyles.field}>
              <Text style={[gStyles.label, { color: colors.ink }]}>Start date</Text>
              <TouchableOpacity
                style={[gStyles.input, gStyles.row, { backgroundColor: colors.backgroundSoft }]}
                onPress={openDatePicker}
                activeOpacity={0.7}
              >
                <Text style={[gStyles.calIcon, { color: colors.body }]}>[ ]</Text>
                <Text style={[gStyles.inputText, { color: colors.ink }]}>
                  {formatDate(startDate)}
                </Text>
                <Text style={[gStyles.chevron, { color: colors.body }]}>▼</Text>
              </TouchableOpacity>

              {Platform.OS === "ios" && showIOSPicker && (
                <View style={[gStyles.iosWrap, { backgroundColor: colors.backgroundSoft }]}>
                  <DateTimePicker
                    value={parseISODate(startDate)}
                    mode="date"
                    display="inline"
                    themeVariant={colors.isDark ? "dark" : "light"}
                    onChange={(_, picked) => { if (picked) setStartDate(toISODate(picked)); }}
                    style={{ width: "100%" }}
                  />
                  <TouchableOpacity
                    style={[gStyles.iosDone, { backgroundColor: colors.ink }]}
                    onPress={() => setShowIOSPicker(false)}
                  >
                    <Text style={[gStyles.iosDoneText, { color: colors.background }]}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={[gStyles.hint, { color: colors.mute }]}>
                End date: {formatDate(computeEndDate(startDate, periodType))}
              </Text>
            </View>

            <TouchableOpacity
              style={[gStyles.saveBtn, { backgroundColor: colors.ink }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={[gStyles.saveBtnText, { color: colors.background }]}>
                Create goal
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const gStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  kav: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, flexShrink: 1, maxHeight: "92%", paddingHorizontal: 24, paddingTop: 12 },
  handle: { alignSelf: "center", borderRadius: 999, height: 4, marginBottom: 16, width: 40 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: "Inter-Bold", fontSize: 20 },
  closeBtn: { alignItems: "center", borderRadius: 999, height: 32, justifyContent: "center", width: 32 },
  closeBtnText: { fontSize: 14 },
  field: { marginBottom: 20 },
  label: { fontFamily: "Inter-Medium", fontSize: 14, marginBottom: 8 },
  input: { borderRadius: 8, fontFamily: "Inter", fontSize: 16, paddingHorizontal: 16, paddingVertical: 14 },
  inputText: { flex: 1, fontFamily: "Inter", fontSize: 16 },
  row: { alignItems: "center", flexDirection: "row" },
  calIcon: { fontSize: 16, marginRight: 10 },
  chevron: { fontSize: 12 },
  error: { color: "#dc2626", fontFamily: "Inter", fontSize: 12, marginTop: 4 },
  hint: { fontFamily: "Inter", fontSize: 12, marginTop: 6 },
  segmentBar: { borderRadius: 999, flexDirection: "row", padding: 4 },
  segment: { alignItems: "center", borderRadius: 999, flex: 1, paddingVertical: 10 },
  segmentText: { fontFamily: "Inter-Medium", fontSize: 14 },
  iosWrap: { borderRadius: 12, marginTop: 8, overflow: "hidden", paddingBottom: 8 },
  iosDone: { alignItems: "center", borderRadius: 999, marginHorizontal: 16, marginTop: 4, paddingVertical: 12 },
  iosDoneText: { fontFamily: "Inter-Medium", fontSize: 15 },
  saveBtn: { alignItems: "center", borderRadius: 999, marginTop: 8, paddingVertical: 16, marginBottom: 24 },
  saveBtnText: { fontFamily: "Inter-Medium", fontSize: 16 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SavingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [activeGoals, setActiveGoals] = useState<SavingsGoal[]>([]);
  const [allGoals, setAllGoals] = useState<SavingsGoal[]>([]);
  const [netSaved, setNetSaved] = useState(0);

  const loadData = useCallback(() => {
    const active = getActiveGoals();
    setActiveGoals(active);
    setAllGoals(getAllSavingsGoals());
    if (active.length > 0) {
      // Use the earliest start and latest end across all active goals
      const starts = active.map(g => g.start_date).sort();
      const ends = active.map(g => g.end_date).sort().reverse();
      setNetSaved(getSavingsProgress(starts[0], ends[0]));
    } else {
      setNetSaved(0);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  }, [loadData]);

  function handleDeleteGoal(id: number) {
    Alert.alert("Delete goal?", "This will permanently remove the savings goal.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => { deleteSavingsGoal(id); loadData(); },
      },
    ]);
  }

  const tabBarClearance = 60 + insets.bottom;

  // ── Derived values ────────────────────────────────────────────────────────
  // Combined target = sum of all active goals
  const combinedTarget = activeGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const remaining = combinedTarget - netSaved;
  const isGoalMet = activeGoals.length > 0 && netSaved >= combinedTarget;
  const extraSaved = netSaved - combinedTarget;

  const progress = combinedTarget > 0 ? Math.min(1, Math.max(0, netSaved / combinedTarget)) : 0;

  // Time progress: use the earliest start and latest end of active goals
  const activeStarts = activeGoals.map(g => g.start_date).sort();
  const activeEnds = activeGoals.map(g => g.end_date).sort().reverse();
  const timePct = activeGoals.length > 0
    ? periodProgress(activeStarts[0], activeEnds[0])
    : 0;

  // An individual goal is "locked" if today is within its period (can't edit/delete)
  function isGoalLocked(g: SavingsGoal): boolean {
    return today() >= g.start_date && today() <= g.end_date;
  }

  // Determine the period label for the combined active goals
  const activePeriodType = activeGoals.length === 1
    ? activeGoals[0].period_type
    : activeGoals.length > 1 ? "combined" : "";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.screenTitle, { color: colors.ink }]}>Savings</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.ink }]}
            onPress={() => { setGoalModalVisible(true); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.addBtnText, { color: colors.background }]}>+ Add goal</Text>
          </TouchableOpacity>
        </View>

        {/* Info banner when there are active goals */}
        {activeGoals.length > 1 && (
          <View style={[styles.lockBanner, { backgroundColor: colors.backgroundSoft }]}>
            <Text style={[styles.lockBannerText, { color: colors.body }]}>
              {activeGoals.length} active goals · combined target ₹{combinedTarget.toFixed(2)}
            </Text>
          </View>
        )}

        {/* ── Active goal section ────────────────────────────────────────── */}
        {activeGoals.length > 0 ? (
          <>
            {/* Big status text */}
            <View style={styles.statusBlock}>
              {isGoalMet ? (
                <>
                  <Text style={styles.statusLabelGreen}>Goal met!</Text>
                  <Text style={styles.statusAmountGreen}>
                    +₹{extraSaved.toFixed(2)}
                  </Text>
                  <Text style={[styles.statusSub, { color: colors.body }]}>
                    saved beyond your target
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.statusLabelRed}>Still to save</Text>
                  <Text style={styles.statusAmountRed}>
                    ₹{remaining.toFixed(2)}
                  </Text>
                  <Text style={[styles.statusSub, { color: colors.body }]}>
                    to reach your {activePeriodType} goal
                  </Text>
                </>
              )}
            </View>

            {/* Combined progress card */}
            <View style={[styles.goalCard, { backgroundColor: colors.backgroundSoft }]}>
              <View style={styles.goalCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalTitle, { color: colors.ink }]}>
                    {activeGoals.length === 1 ? activeGoals[0].title : `${activeGoals.length} active goals`}
                  </Text>
                  <Text style={[styles.goalMeta, { color: colors.mute }]}>
                    {activePeriodType.charAt(0).toUpperCase() + activePeriodType.slice(1)}
                    {" · "}
                    {formatDateRange(activeStarts[0], activeEnds[0])}
                  </Text>
                </View>
              </View>

              {/* Savings progress bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={[styles.progressLabel, { color: colors.body }]}>
                    Saved: ₹{Math.max(0, netSaved).toFixed(2)}
                  </Text>
                  <Text style={[styles.progressLabel, { color: colors.body }]}>
                    Target: ₹{combinedTarget.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.hairline }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(progress * 100)}%` as any,
                        backgroundColor: isGoalMet ? "#16a34a" : colors.ink,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressPct, { color: colors.mute }]}>
                  {Math.round(progress * 100)}% of goal
                </Text>
              </View>

              {/* Time elapsed bar */}
              <View style={styles.progressSection}>
                <Text style={[styles.progressLabel, { color: colors.body }]}>
                  Time elapsed
                </Text>
                <View style={[styles.progressBar, { backgroundColor: colors.hairline }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(timePct * 100)}%` as any,
                        backgroundColor: colors.mute,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressPct, { color: colors.mute }]}>
                  {Math.round(timePct * 100)}% of period passed
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.emptyBlock, { backgroundColor: colors.backgroundSoft }]}>
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>No active goal</Text>
            <Text style={[styles.emptySub, { color: colors.mute }]}>
              Add a savings goal to start tracking your progress.
            </Text>
          </View>
        )}

        {/* ── All goals list ────────────────────────────────────────────── */}
        {allGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>All goals</Text>
            <View style={[styles.listCard, { borderColor: colors.hairline }]}>
              {allGoals.map((g, i) => {
                const locked = isGoalLocked(g);
                const isActiveGoal = activeGoals.some(ag => ag.id === g.id);
                const saved = getSavingsProgress(g.start_date, g.end_date);
                const pct = g.target_amount > 0 ? Math.min(1, Math.max(0, saved / g.target_amount)) : 0;
                const met = saved >= g.target_amount;
                return (
                  <View key={g.id}>
                    {i > 0 && <View style={[styles.sep, { backgroundColor: colors.hairline }]} />}
                    <View style={[styles.goalRow, { backgroundColor: colors.background }]}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.goalRowTop}>
                          <Text style={[styles.goalRowTitle, { color: colors.ink }]} numberOfLines={1}>
                            {g.title}
                          </Text>
                          {isActiveGoal && (
                            <View style={styles.activePill}>
                              <Text style={styles.activePillText}>Active</Text>
                            </View>
                          )}
                          {locked && (
                            <View style={[styles.lockedPill]}>
                              <Text style={styles.lockedPillText}>Locked</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.goalRowMeta, { color: colors.mute }]}>
                          {g.period_type} · ₹{g.target_amount.toFixed(0)} · {Math.round(pct * 100)}%{met ? " ✓" : ""}
                        </Text>
                      </View>
                      <View style={styles.goalRowActions}>
                        <TouchableOpacity
                          style={[styles.actionDeleteBtn, locked && styles.actionBtnDisabled]}
                          onPress={() => {
                            if (locked) return;
                            handleDeleteGoal(g.id);
                          }}
                        >
                          <TrashIcon size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add goal modal */}
      <GoalModal
        visible={goalModalVisible}
        onClose={() => { setGoalModalVisible(false); }}
        onSaved={loadData}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  addBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { fontFamily: "Inter-Medium", fontSize: 13 },

  lockBanner: {
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lockBannerText: { fontFamily: "Inter", fontSize: 13, lineHeight: 18 },

  // ── Big status text ──────────────────────────────────────────────────────
  statusBlock: {
    alignItems: "center",
    paddingVertical: 32,
    marginBottom: 16,
  },
  statusLabelRed: {
    color: "#dc2626",
    fontFamily: "Inter-Medium",
    fontSize: 14,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statusAmountRed: {
    color: "#dc2626",
    fontFamily: "Inter-Bold",
    fontSize: 52,
    lineHeight: 60,
    marginBottom: 8,
  },
  statusLabelGreen: {
    color: "#16a34a",
    fontFamily: "Inter-Medium",
    fontSize: 14,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statusAmountGreen: {
    color: "#16a34a",
    fontFamily: "Inter-Bold",
    fontSize: 52,
    lineHeight: 60,
    marginBottom: 8,
  },
  statusSub: { fontFamily: "Inter", fontSize: 14 },

  // ── Goal card ────────────────────────────────────────────────────────────
  goalCard: { borderRadius: 16, padding: 20, marginBottom: 24 },
  goalCardHeader: { alignItems: "flex-start", flexDirection: "row", marginBottom: 20 },
  goalTitle: { fontFamily: "Inter-Bold", fontSize: 17, marginBottom: 4 },
  goalMeta: { fontFamily: "Inter", fontSize: 12 },

  progressSection: { marginBottom: 16 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontFamily: "Inter", fontSize: 12 },
  progressBar: { borderRadius: 999, height: 8, overflow: "hidden", marginBottom: 4 },
  progressFill: { borderRadius: 999, height: 8 },
  progressPct: { fontFamily: "Inter", fontSize: 11, textAlign: "right" },

  // ── Empty state ──────────────────────────────────────────────────────────
  emptyBlock: {
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 24,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontFamily: "Inter-Bold", fontSize: 18, marginBottom: 8 },
  emptySub: { fontFamily: "Inter", fontSize: 14, textAlign: "center", lineHeight: 20 },

  // ── All goals list ───────────────────────────────────────────────────────
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter-Bold", fontSize: 18, marginBottom: 12 },
  listCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sep: { height: 1 },
  goalRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  goalRowTop: { alignItems: "center", flexDirection: "row", marginBottom: 4, flexWrap: "wrap", gap: 6 },
  goalRowTitle: { fontFamily: "Inter-Medium", fontSize: 15, flexShrink: 1 },
  goalRowMeta: { fontFamily: "Inter", fontSize: 12 },
  activePill: {
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "center",
  },
  activePillText: { color: "#16a34a", fontFamily: "Inter-Medium", fontSize: 10, lineHeight: 14 },
  lockedPill: {
    backgroundColor: "#fef9c3",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "center",
  },
  lockedPillText: { color: "#a16207", fontFamily: "Inter-Medium", fontSize: 10, lineHeight: 14 },
  goalRowActions: { flexDirection: "row", gap: 8, marginLeft: 12, alignItems: "center" },
  actionDeleteBtn: {
    alignItems: "center",
    backgroundColor: "#dc2626",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  actionBtnDisabled: { opacity: 0.35 },
});
