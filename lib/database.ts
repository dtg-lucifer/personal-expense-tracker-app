/**
 * lib/database.ts
 *
 * SQLite data layer for the expense tracker.
 * Uses expo-sqlite (v57 new API with `openDatabaseSync`).
 *
 * Schema:
 *   categories:     id, name, color, is_predefined, created_at
 *   expenses:       id, name, amount, category_id, description, date, tags, type, created_at
 *                   type: 'expense' | 'gain'
 *   budget_balance: id, amount, set_at (one active row, updated in place)
 *   savings_goals:  id, title, target_amount, period_type, start_date, end_date, created_at
 */

import * as SQLite from "expo-sqlite";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  color: string;
  is_predefined: 0 | 1;
  created_at: string;
}

export type TransactionType = "expense" | "gain";

export interface Expense {
  id: number;
  name: string;
  amount: number;
  category_id: number;
  description: string;
  date: string; // ISO date string: YYYY-MM-DD
  tags: string; // space-separated
  type: TransactionType;
  created_at: string;
}

export interface ExpenseWithCategory extends Expense {
  category_name: string;
  category_color: string;
}

export interface DailyTotal {
  date: string;
  total: number;
}

export interface CategorySummary {
  category_id: number;
  category_name: string;
  category_color: string;
  total: number;
  count: number;
}

export interface BudgetBalance {
  id: number;
  amount: number;
  set_at: string;
}

export type SavingsPeriodType = "monthly" | "annual";

export interface SavingsGoal {
  id: number;
  title: string;
  target_amount: number;
  period_type: SavingsPeriodType;
  start_date: string;
  end_date: string;
  created_at: string;
}

/** Running balance snapshot used for the budget line chart */
export interface BalancePoint {
  date: string;
  balance: number;
}

// ─── Predefined categories ────────────────────────────────────────────────────

const PREDEFINED_CATEGORIES: { name: string; color: string }[] = [
  { name: "Food & Dining", color: "#FF6B6B" },
  { name: "Transportation", color: "#4ECDC4" },
  { name: "Entertainment", color: "#45B7D1" },
  { name: "Shopping", color: "#FFA07A" },
  { name: "Health & Fitness", color: "#98D8C8" },
  { name: "Housing", color: "#F7DC6F" },
  { name: "Utilities", color: "#BB8FCE" },
  { name: "Education", color: "#85C1E9" },
  { name: "Other", color: "#AEB6BF" },
];

// ─── Database setup ───────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (_db) return _db;
  _db = SQLite.openDatabaseSync("expenses.db");
  return _db;
}

export function initDatabase(): void {
  const db = getDatabase();

  try {
    db.execSync("PRAGMA journal_mode = WAL;");
    db.execSync("PRAGMA foreign_keys = ON;");
  } catch {
    // Pragmas are best-effort
  }

  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS categories (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT    NOT NULL UNIQUE,
        color       TEXT    NOT NULL DEFAULT '#AEB6BF',
        is_predefined INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);
  } catch {
    // Table already exists — safe to ignore
  }

  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT    NOT NULL,
        amount      REAL    NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE SET NULL,
        description TEXT    NOT NULL DEFAULT '',
        date        TEXT    NOT NULL,
        tags        TEXT    NOT NULL DEFAULT '',
        type        TEXT    NOT NULL DEFAULT 'expense',
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);
  } catch {
    // Table already exists — safe to ignore
  }

  // Migrate existing rows that don't have the type column yet
  try {
    db.execSync("ALTER TABLE expenses ADD COLUMN type TEXT NOT NULL DEFAULT 'expense';");
  } catch {
    // Column already exists — safe to ignore
  }

  try {
    db.execSync(
      "CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);"
    );
    db.execSync(
      "CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);"
    );
  } catch {
    // Indexes already exist — safe to ignore
  }

  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS budget_balance (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL    NOT NULL DEFAULT 0,
        set_at TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);
  } catch {
    // Table already exists — safe to ignore
  }

  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        title         TEXT    NOT NULL,
        target_amount REAL    NOT NULL,
        period_type   TEXT    NOT NULL DEFAULT 'monthly',
        start_date    TEXT    NOT NULL,
        end_date      TEXT    NOT NULL,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);
  } catch {
    // Table already exists — safe to ignore
  }

  // Seed predefined categories if the table is empty
  try {
    const count = db.getFirstSync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM categories;"
    );
    if (count && count.n === 0) {
      const insertCat = db.prepareSync(
        "INSERT OR IGNORE INTO categories (name, color, is_predefined) VALUES (?, ?, 1);"
      );
      for (const cat of PREDEFINED_CATEGORIES) {
        insertCat.executeSync([cat.name, cat.color]);
      }
      insertCat.finalizeSync();
    }
  } catch {
    // Seeding is best-effort
  }
}

// ─── Date range helpers ───────────────────────────────────────────────────────

/** Returns { start, end } for the ISO week containing `date` (Mon–Sun). */
export function getWeekRange(date: Date = new Date()): {
  start: string;
  end: string;
} {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: toISODate(mon), end: toISODate(sun) };
}

/** Returns { start, end } for the calendar month containing `date`. */
export function getMonthRange(date: Date = new Date()): {
  start: string;
  end: string;
} {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0); // last day of month
  return { start: toISODate(start), end: toISODate(end) };
}

/** Returns { start, end } for the calendar year containing `date`. */
export function getYearRange(date: Date = new Date()): {
  start: string;
  end: string;
} {
  const y = date.getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

/** Convert a Date to YYYY-MM-DD */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today as YYYY-MM-DD */
export function today(): string {
  return toISODate(new Date());
}

// ─── Category CRUD ────────────────────────────────────────────────────────────

export function getAllCategories(): Category[] {
  const db = getDatabase();
  return db.getAllSync<Category>(
    "SELECT * FROM categories ORDER BY is_predefined DESC, name ASC;"
  );
}

export function getCategoryById(id: number): Category | null {
  const db = getDatabase();
  return (
    db.getFirstSync<Category>("SELECT * FROM categories WHERE id = ?;", [
      id,
    ]) ?? null
  );
}

export function insertCategory(name: string, color: string): number {
  const db = getDatabase();
  const result = db.runSync(
    "INSERT INTO categories (name, color, is_predefined) VALUES (?, ?, 0);",
    [name, color]
  );
  return result.lastInsertRowId;
}

export function updateCategory(
  id: number,
  name: string,
  color: string
): void {
  const db = getDatabase();
  db.runSync(
    "UPDATE categories SET name = ?, color = ? WHERE id = ? AND is_predefined = 0;",
    [name, color, id]
  );
}

export function deleteCategory(id: number): void {
  const db = getDatabase();
  // Reassign expenses to "Other" before deleting
  const other = db.getFirstSync<{ id: number }>(
    "SELECT id FROM categories WHERE name = 'Other' LIMIT 1;"
  );
  if (other) {
    db.runSync(
      "UPDATE expenses SET category_id = ? WHERE category_id = ?;",
      [other.id, id]
    );
  }
  db.runSync(
    "DELETE FROM categories WHERE id = ? AND is_predefined = 0;",
    [id]
  );
}

// ─── Expense CRUD ─────────────────────────────────────────────────────────────

export interface InsertExpenseParams {
  name: string;
  amount: number;
  category_id: number;
  description?: string;
  date?: string; // YYYY-MM-DD, defaults to today
  tags?: string; // space-separated
  type?: TransactionType; // defaults to 'expense'
}

export function insertExpense(params: InsertExpenseParams): number {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO expenses (name, amount, category_id, description, date, tags, type)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      params.name,
      params.amount,
      params.category_id,
      params.description ?? "",
      params.date ?? today(),
      params.tags ?? "",
      params.type ?? "expense",
    ]
  );
  return result.lastInsertRowId;
}

export function updateExpense(
  id: number,
  params: InsertExpenseParams
): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE expenses
     SET name = ?, amount = ?, category_id = ?, description = ?, date = ?, tags = ?, type = ?
     WHERE id = ?;`,
    [
      params.name,
      params.amount,
      params.category_id,
      params.description ?? "",
      params.date ?? today(),
      params.tags ?? "",
      params.type ?? "expense",
      id,
    ]
  );
}

export function deleteExpense(id: number): void {
  const db = getDatabase();
  db.runSync("DELETE FROM expenses WHERE id = ?;", [id]);
}

export function getExpenseById(id: number): ExpenseWithCategory | null {
  const db = getDatabase();
  return (
    db.getFirstSync<ExpenseWithCategory>(
      `SELECT e.*, c.name AS category_name, c.color AS category_color
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.id = ?;`,
      [id]
    ) ?? null
  );
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/** All expenses for a given date (YYYY-MM-DD), newest first. */
export function getExpensesForDate(date: string): ExpenseWithCategory[] {
  const db = getDatabase();
  return db.getAllSync<ExpenseWithCategory>(
    `SELECT e.*, c.name AS category_name, c.color AS category_color
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.date = ?
     ORDER BY e.created_at DESC;`,
    [date]
  );
}

/** All expenses in a date range [start, end] inclusive, newest first. */
export function getExpensesInRange(
  start: string,
  end: string,
  categoryId?: number
): ExpenseWithCategory[] {
  const db = getDatabase();
  const base = `
    SELECT e.*, c.name AS category_name, c.color AS category_color
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.date BETWEEN ? AND ?
  `;
  if (categoryId !== undefined) {
    return db.getAllSync<ExpenseWithCategory>(
      base + " AND e.category_id = ? ORDER BY e.date DESC, e.created_at DESC;",
      [start, end, categoryId]
    );
  }
  return db.getAllSync<ExpenseWithCategory>(
    base + " ORDER BY e.date DESC, e.created_at DESC;",
    [start, end]
  );
}

/**
 * Sum of expense-type transactions grouped by date within [start, end].
 * Returns one row per day (filled with 0 for days with no data).
 */
export function getDailyTotalsInRange(
  start: string,
  end: string,
  categoryId?: number
): DailyTotal[] {
  const db = getDatabase();
  let rows: DailyTotal[];

  if (categoryId !== undefined) {
    rows = db.getAllSync<DailyTotal>(
      `SELECT date, SUM(amount) AS total
       FROM expenses
       WHERE date BETWEEN ? AND ? AND category_id = ? AND type = 'expense'
       GROUP BY date
       ORDER BY date ASC;`,
      [start, end, categoryId]
    );
  } else {
    rows = db.getAllSync<DailyTotal>(
      `SELECT date, SUM(amount) AS total
       FROM expenses
       WHERE date BETWEEN ? AND ? AND type = 'expense'
       GROUP BY date
       ORDER BY date ASC;`,
      [start, end]
    );
  }

  // Fill in zero-total days
  const map = new Map<string, number>(rows.map((r) => [r.date, r.total]));
  const result: DailyTotal[] = [];
  const cursor = new Date(start);
  const endDate = new Date(end);
  while (cursor <= endDate) {
    const d = toISODate(cursor);
    result.push({ date: d, total: map.get(d) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/**
 * Total + count per category in [start, end] for expense-type only.
 * Sorted by total descending.
 */
export function getExpenseSummaryInRange(
  start: string,
  end: string
): CategorySummary[] {
  const db = getDatabase();
  return db.getAllSync<CategorySummary>(
    `SELECT
       e.category_id,
       c.name  AS category_name,
       c.color AS category_color,
       SUM(e.amount) AS total,
       COUNT(*)      AS count
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.date BETWEEN ? AND ? AND e.type = 'expense'
     GROUP BY e.category_id
     ORDER BY total DESC;`,
    [start, end]
  );
}

/**
 * Grand total of expense-type transactions for a date range.
 */
export function getTotalInRange(start: string, end: string): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date BETWEEN ? AND ? AND type = 'expense';",
    [start, end]
  );
  return row?.total ?? 0;
}

/**
 * Grand total of gain-type transactions for a date range.
 */
export function getGainTotalInRange(start: string, end: string): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date BETWEEN ? AND ? AND type = 'gain';",
    [start, end]
  );
  return row?.total ?? 0;
}

/**
 * Top-N most expensive categories this week (expense type only).
 */
export function getTopCategoryThisWeek(
  n: number = 1
): CategorySummary[] {
  const { start, end } = getWeekRange();
  const db = getDatabase();
  return db.getAllSync<CategorySummary>(
    `SELECT
       e.category_id,
       c.name  AS category_name,
       c.color AS category_color,
       SUM(e.amount) AS total,
       COUNT(*)      AS count
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.date BETWEEN ? AND ? AND e.type = 'expense'
     GROUP BY e.category_id
     ORDER BY total DESC
     LIMIT ?;`,
    [start, end, n]
  );
}

/**
 * Monthly totals for a year range — returns 12 rows (one per month).
 * Used by the yearly chart so we don't plot 365 data points.
 */
export interface MonthlyTotal {
  month: string; // YYYY-MM
  total: number;
}

export function getMonthlyTotalsInRange(
  start: string,
  end: string,
  categoryId?: number
): MonthlyTotal[] {
  const db = getDatabase();
  let rows: MonthlyTotal[];

  const query = categoryId !== undefined
    ? `SELECT strftime('%Y-%m', date) AS month, SUM(amount) AS total
       FROM expenses
       WHERE date BETWEEN ? AND ? AND category_id = ? AND type = 'expense'
       GROUP BY month
       ORDER BY month ASC;`
    : `SELECT strftime('%Y-%m', date) AS month, SUM(amount) AS total
       FROM expenses
       WHERE date BETWEEN ? AND ? AND type = 'expense'
       GROUP BY month
       ORDER BY month ASC;`;

  rows = categoryId !== undefined
    ? db.getAllSync<MonthlyTotal>(query, [start, end, categoryId])
    : db.getAllSync<MonthlyTotal>(query, [start, end]);

  // Fill in zero-total months for the entire range
  const map = new Map<string, number>(rows.map((r) => [r.month, r.total]));
  const result: MonthlyTotal[] = [];
  const startYear = parseInt(start.slice(0, 4));
  const startMonth = parseInt(start.slice(5, 7));
  const endYear = parseInt(end.slice(0, 4));
  const endMonth = parseInt(end.slice(5, 7));

  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    result.push({ month: key, total: map.get(key) ?? 0 });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

// ─── Budget balance ───────────────────────────────────────────────────────────

/** Get the current stored budget balance (the user's manually-set starting balance). */
export function getBudgetBalance(): BudgetBalance | null {
  const db = getDatabase();
  return db.getFirstSync<BudgetBalance>(
    "SELECT * FROM budget_balance ORDER BY id DESC LIMIT 1;"
  ) ?? null;
}

/**
 * Set (upsert) the budget balance.
 * We keep only one row — update it if it exists, insert otherwise.
 */
export function setBudgetBalance(amount: number): void {
  const db = getDatabase();
  const existing = getBudgetBalance();
  if (existing) {
    db.runSync(
      "UPDATE budget_balance SET amount = ?, set_at = datetime('now') WHERE id = ?;",
      [amount, existing.id]
    );
  } else {
    db.runSync(
      "INSERT INTO budget_balance (amount) VALUES (?);",
      [amount]
    );
  }
}

/**
 * Compute the running balance over time starting from a base amount.
 * For each day in [start, end]:
 *   balance += gains - expenses
 * Returns one BalancePoint per day.
 */
export function getBalanceOverTime(
  start: string,
  end: string,
  startingBalance: number
): BalancePoint[] {
  const db = getDatabase();

  // Get all transactions in range grouped by date, net = gains - expenses
  const rows = db.getAllSync<{ date: string; net: number }>(
    `SELECT date,
       SUM(CASE WHEN type = 'gain' THEN amount ELSE -amount END) AS net
     FROM expenses
     WHERE date BETWEEN ? AND ?
     GROUP BY date
     ORDER BY date ASC;`,
    [start, end]
  );

  const netMap = new Map<string, number>(rows.map((r) => [r.date, r.net]));

  const result: BalancePoint[] = [];
  let balance = startingBalance;
  const cursor = new Date(start);
  const endDate = new Date(end);

  while (cursor <= endDate) {
    const d = toISODate(cursor);
    balance += netMap.get(d) ?? 0;
    result.push({ date: d, balance });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

// ─── Savings goals ────────────────────────────────────────────────────────────

export function getAllSavingsGoals(): SavingsGoal[] {
  const db = getDatabase();
  return db.getAllSync<SavingsGoal>(
    "SELECT * FROM savings_goals ORDER BY created_at DESC;"
  );
}

export function getActiveSavingsGoal(): SavingsGoal | null {
  const t = today();
  const db = getDatabase();
  return (
    db.getFirstSync<SavingsGoal>(
      "SELECT * FROM savings_goals WHERE start_date <= ? AND end_date >= ? ORDER BY created_at DESC LIMIT 1;",
      [t, t]
    ) ?? null
  );
}

export function insertSavingsGoal(
  title: string,
  target_amount: number,
  period_type: SavingsPeriodType,
  start_date: string,
  end_date: string
): number {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO savings_goals (title, target_amount, period_type, start_date, end_date)
     VALUES (?, ?, ?, ?, ?);`,
    [title, target_amount, period_type, start_date, end_date]
  );
  return result.lastInsertRowId;
}

export function updateSavingsGoal(
  id: number,
  title: string,
  target_amount: number,
  period_type: SavingsPeriodType,
  start_date: string,
  end_date: string
): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE savings_goals
     SET title = ?, target_amount = ?, period_type = ?, start_date = ?, end_date = ?
     WHERE id = ?;`,
    [title, target_amount, period_type, start_date, end_date, id]
  );
}

export function deleteSavingsGoal(id: number): void {
  const db = getDatabase();
  db.runSync("DELETE FROM savings_goals WHERE id = ?;", [id]);
}

/**
 * For a savings goal covering [start, end]:
 *   net_saved = total gains - total expenses in that range
 * Returns how much was saved (positive = saved, negative = overspent).
 */
export function getSavingsProgress(
  start: string,
  end: string
): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ net: number }>(
    `SELECT SUM(CASE WHEN type = 'gain' THEN amount ELSE -amount END) AS net
     FROM expenses
     WHERE date BETWEEN ? AND ?;`,
    [start, end]
  );
  return row?.net ?? 0;
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function exportExpensesToCSV(start: string, end: string): string {
  const rows = getExpensesInRange(start, end);
  const header = "id,name,amount,type,category,description,date,tags,created_at";
  const lines = rows.map((r) => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    return [
      r.id,
      esc(r.name),
      r.amount,
      r.type,
      esc(r.category_name ?? ""),
      esc(r.description),
      r.date,
      esc(r.tags),
      r.created_at,
    ].join(",");
  });
  return [header, ...lines].join("\n");
}

// ─── Full backup (JSON) ───────────────────────────────────────────────────────

export interface FullBackup {
  version: 1;
  exported_at: string;
  categories: Category[];
  expenses: Expense[];
  budget_balance: BudgetBalance | null;
  savings_goals: SavingsGoal[];
}

export function exportFullBackup(): string {
  const db = getDatabase();
  const backup: FullBackup = {
    version: 1,
    exported_at: new Date().toISOString(),
    categories: db.getAllSync<Category>("SELECT * FROM categories;"),
    expenses: db.getAllSync<Expense>("SELECT * FROM expenses ORDER BY id;"),
    budget_balance: getBudgetBalance(),
    savings_goals: db.getAllSync<SavingsGoal>(
      "SELECT * FROM savings_goals ORDER BY id;"
    ),
  };
  return JSON.stringify(backup, null, 2);
}

export function importFullBackup(json: string): void {
  const backup: FullBackup = JSON.parse(json);
  if (!backup || backup.version !== 1) {
    throw new Error("Invalid backup file");
  }

  const db = getDatabase();

  // Clear existing data (order matters for FK constraints)
  db.execSync("DELETE FROM expenses;");
  db.execSync("DELETE FROM savings_goals;");
  db.execSync("DELETE FROM budget_balance;");
  db.execSync("DELETE FROM categories;");

  // Re-insert categories
  const insertCat = db.prepareSync(
    "INSERT INTO categories (id, name, color, is_predefined, created_at) VALUES (?, ?, ?, ?, ?);"
  );
  for (const c of backup.categories) {
    insertCat.executeSync([c.id, c.name, c.color, c.is_predefined, c.created_at]);
  }
  insertCat.finalizeSync();

  // Re-insert expenses
  const insertExp = db.prepareSync(
    "INSERT INTO expenses (id, name, amount, category_id, description, date, tags, type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);"
  );
  for (const e of backup.expenses) {
    insertExp.executeSync([
      e.id,
      e.name,
      e.amount,
      e.category_id,
      e.description,
      e.date,
      e.tags,
      e.type,
      e.created_at,
    ]);
  }
  insertExp.finalizeSync();

  // Re-insert budget balance
  if (backup.budget_balance) {
    db.runSync(
      "INSERT INTO budget_balance (id, amount, set_at) VALUES (?, ?, ?);",
      [
        backup.budget_balance.id,
        backup.budget_balance.amount,
        backup.budget_balance.set_at,
      ]
    );
  }

  // Re-insert savings goals
  const insertGoal = db.prepareSync(
    "INSERT INTO savings_goals (id, title, target_amount, period_type, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);"
  );
  for (const g of backup.savings_goals) {
    insertGoal.executeSync([
      g.id,
      g.title,
      g.target_amount,
      g.period_type,
      g.start_date,
      g.end_date,
      g.created_at,
    ]);
  }
  insertGoal.finalizeSync();
}
