/**
 * lib/database.ts
 *
 * SQLite data layer for the expense tracker.
 * Uses expo-sqlite (v57 new API with `openDatabaseSync`).
 *
 * Schema:
 *   categories:  id, name, color, is_predefined, created_at
 *   expenses:    id, name, amount, category_id, description, date, tags, created_at
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

export interface Expense {
  id: number;
  name: string;
  amount: number;
  category_id: number;
  description: string;
  date: string; // ISO date string: YYYY-MM-DD
  tags: string; // space-separated
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

  // WAL mode for better concurrency
  db.execSync("PRAGMA journal_mode = WAL;");
  db.execSync("PRAGMA foreign_keys = ON;");

  // Categories table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      color       TEXT    NOT NULL DEFAULT '#AEB6BF',
      is_predefined INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Expenses table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      amount      REAL    NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT    NOT NULL DEFAULT '',
      date        TEXT    NOT NULL,
      tags        TEXT    NOT NULL DEFAULT '',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Index for fast date-range queries
  db.execSync(
    "CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);"
  );
  db.execSync(
    "CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);"
  );

  // Seed predefined categories if the table is empty
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
}

export function insertExpense(params: InsertExpenseParams): number {
  const db = getDatabase();
  const result = db.runSync(
    `INSERT INTO expenses (name, amount, category_id, description, date, tags)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      params.name,
      params.amount,
      params.category_id,
      params.description ?? "",
      params.date ?? today(),
      params.tags ?? "",
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
     SET name = ?, amount = ?, category_id = ?, description = ?, date = ?, tags = ?
     WHERE id = ?;`,
    [
      params.name,
      params.amount,
      params.category_id,
      params.description ?? "",
      params.date ?? today(),
      params.tags ?? "",
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
 * Sum of expenses grouped by date within [start, end].
 * Returns one row per day even for days with no expenses (filled with 0).
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
       WHERE date BETWEEN ? AND ? AND category_id = ?
       GROUP BY date
       ORDER BY date ASC;`,
      [start, end, categoryId]
    );
  } else {
    rows = db.getAllSync<DailyTotal>(
      `SELECT date, SUM(amount) AS total
       FROM expenses
       WHERE date BETWEEN ? AND ?
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
 * Total + count per category in [start, end].
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
     WHERE e.date BETWEEN ? AND ?
     GROUP BY e.category_id
     ORDER BY total DESC;`,
    [start, end]
  );
}

/**
 * Grand total for a date range.
 */
export function getTotalInRange(start: string, end: string): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date BETWEEN ? AND ?;",
    [start, end]
  );
  return row?.total ?? 0;
}

/**
 * Top-N most expensive categories this week.
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
     WHERE e.date BETWEEN ? AND ?
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
       WHERE date BETWEEN ? AND ? AND category_id = ?
       GROUP BY month
       ORDER BY month ASC;`
    : `SELECT strftime('%Y-%m', date) AS month, SUM(amount) AS total
       FROM expenses
       WHERE date BETWEEN ? AND ?
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

// ─── CSV export ───────────────────────────────────────────────────────────────

export function exportExpensesToCSV(start: string, end: string): string {
  const rows = getExpensesInRange(start, end);
  const header = "id,name,amount,category,description,date,tags,created_at";
  const lines = rows.map((r) => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    return [
      r.id,
      esc(r.name),
      r.amount,
      esc(r.category_name ?? ""),
      esc(r.description),
      r.date,
      esc(r.tags),
      r.created_at,
    ].join(",");
  });
  return [header, ...lines].join("\n");
}
