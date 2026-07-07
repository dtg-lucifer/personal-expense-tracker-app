/**
 * components/ExpenseList.tsx
 *
 * Dark-mode aware expense list. Long-press shows a custom themed
 * confirmation dialog instead of the system Alert.
 */

import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { deleteExpense, type ExpenseWithCategory } from "@/lib/database";

// ─── Confirmation modal ───────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  visible: boolean;
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDeleteModal({
  visible,
  name,
  onConfirm,
  onCancel,
}: ConfirmDeleteProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable
          style={[
            styles.dialog,
            {
              backgroundColor: colors.background,
              shadowColor: colors.isDark ? "#000" : "#00000040",
            },
          ]}
          onPress={() => {}} // prevent overlay close on dialog tap
        >
          {/* Icon */}
          <View
            style={[
              styles.dialogIcon,
              { backgroundColor: colors.backgroundSoft },
            ]}
          >
            <Text style={[styles.dialogIconText, { color: colors.ink }]}>
              ✕
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.dialogTitle, { color: colors.ink }]}>
            Delete expense?
          </Text>

          {/* Body */}
          <Text style={[styles.dialogBody, { color: colors.body }]}>
            "{name}" will be permanently removed.
          </Text>

          {/* Divider */}
          <View
            style={[styles.dialogDivider, { backgroundColor: colors.hairline }]}
          />

          {/* Actions */}
          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={[
                styles.dialogBtn,
                styles.dialogBtnCancel,
                { backgroundColor: colors.backgroundSoft },
              ]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.dialogBtnText, { color: colors.ink }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dialogBtn, styles.dialogBtnDelete]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={[styles.dialogBtnText, { color: "#ffffff" }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────

interface Props {
  expenses: ExpenseWithCategory[];
  onRefresh: () => void;
  onEdit?: (expense: ExpenseWithCategory) => void;
  emptyMessage?: string;
  showDate?: boolean;
}

export default function ExpenseList({
  expenses,
  onRefresh,
  onEdit,
  emptyMessage = "No expenses yet",
  showDate = false,
}: Props) {
  const { colors } = useTheme();
  const [pendingDelete, setPendingDelete] = useState<ExpenseWithCategory | null>(
    null
  );

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteExpense(pendingDelete.id);
    setPendingDelete(null);
    onRefresh();
  }

  if (expenses.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.emptyIconBox,
            { backgroundColor: colors.backgroundSoft },
          ]}
        >
          <Text style={[styles.emptyIconText, { color: colors.mute }]}>—</Text>
        </View>
        <Text style={[styles.emptyText, { color: colors.mute }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={false}
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: colors.hairline }]} />
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: colors.background }]}
            onPress={() => onEdit?.(item)}
            onLongPress={() => setPendingDelete(item)}
            delayLongPress={400}
            activeOpacity={0.7}
            accessibilityLabel={`${item.name}, ${item.amount.toFixed(2)}, ${item.category_name}`}
            accessibilityHint="Long press to delete"
          >
            {/* Category color dot */}
            <View
              style={[
                styles.colorPill,
                { backgroundColor: item.category_color ?? "#AEB6BF" },
              ]}
            />

            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text
                  style={[styles.name, { color: colors.ink }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={[styles.amount, { color: colors.ink }]}>
                  ₹{item.amount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.chip,
                    { borderColor: item.category_color ?? "#AEB6BF" },
                  ]}
                >
                  <Text style={[styles.chipText, { color: colors.body }]}>
                    {item.category_name ?? "Uncategorised"}
                  </Text>
                </View>

                {showDate && (
                  <Text style={[styles.meta, { color: colors.mute }]}>
                    {item.date}
                  </Text>
                )}

                {item.tags ? (
                  <Text
                    style={[styles.tags, { color: colors.mute }]}
                    numberOfLines={1}
                  >
                    {item.tags
                      .split(" ")
                      .filter(Boolean)
                      .map((t) => `#${t}`)
                      .join(" ")}
                  </Text>
                ) : null}
              </View>

              {item.description ? (
                <Text
                  style={[styles.desc, { color: colors.body }]}
                  numberOfLines={1}
                >
                  {item.description}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Custom delete confirmation dialog */}
      <ConfirmDeleteModal
        visible={pendingDelete !== null}
        name={pendingDelete?.name ?? ""}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sep: { height: 1 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  colorPill: {
    borderRadius: 999,
    height: 10,
    marginRight: 14,
    width: 10,
  },
  content: { flex: 1 },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontFamily: "Inter-Medium",
    fontSize: 15,
    marginRight: 8,
  },
  amount: {
    fontFamily: "Inter-Bold",
    fontSize: 15,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: { fontFamily: "Inter", fontSize: 11 },
  meta: { fontFamily: "Inter", fontSize: 11 },
  tags: { fontFamily: "Inter", fontSize: 11, flexShrink: 1 },
  desc: { fontFamily: "Inter", fontSize: 12, marginTop: 4 },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIconBox: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    marginBottom: 12,
    width: 48,
  },
  emptyIconText: {
    fontFamily: "Inter-Bold",
    fontSize: 20,
  },
  emptyText: {
    fontFamily: "Inter",
    fontSize: 14,
    textAlign: "center",
  },
  // ── Confirm dialog ──────────────────────────────────────
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  dialog: {
    borderRadius: 20,
    elevation: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 0,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: "100%",
  },
  dialogIcon: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    marginBottom: 16,
    width: 52,
  },
  dialogIconText: {
    fontFamily: "Inter-Bold",
    fontSize: 18,
  },
  dialogTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  dialogBody: {
    fontFamily: "Inter",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: "center",
  },
  dialogDivider: {
    height: 1,
    marginHorizontal: -24,
  },
  dialogActions: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
  },
  dialogBtn: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    paddingVertical: 14,
  },
  dialogBtnCancel: {},
  dialogBtnDelete: {
    backgroundColor: "#dc2626",
  },
  dialogBtnText: {
    fontFamily: "Inter-Medium",
    fontSize: 15,
  },
});
