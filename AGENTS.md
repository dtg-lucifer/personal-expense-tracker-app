# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Commands

- Package manager is `bun` (lockfile: `bun.lock`). No `package-lock.json` or `yarn.lock`.
- `bun start` — dev server
- `bun run ios` / `bun run android` / `bun run web`
- No lint, typecheck, formatter, or test scripts exist. No ESLint, Prettier, or test framework configured.
- Standard `metro.config.js` (no Tamagui metro plugin). Tamagui works without it on native.

## Structure

- **Entrypoint**: `expo-router/entry` (set in `package.json` `"main"`)
- **File-based routing** under `app/`:
  - `_layout.tsx` — root layout (stack navigator). Must import `react-native-reanimated` at top.
  - `(tabs)/` — tab navigator with `index.tsx` (Home), `budget.tsx`, `savings.tsx`, `reports.tsx`, `settings.tsx`
  - `+not-found.tsx`, `+html.tsx` — Expo Router conventions
- **Path alias** `@/*` maps to `./*` (configured in `tsconfig.json`)
- **Typed routes** enabled (`app.json` → `experiments.typedRoutes: true`)
- **Theme**: Uber-inspired black-and-white design from `DESIGN.md`. Tamagui config at `tamagui.config.ts`.
- **Data persistence**: SQLite via `expo-sqlite`. Schema in `lib/database.ts`.
- **Components**:
  - `AddExpenseModal` — Bottom sheet for logging gains and expenses. Has Gain/Expense tab switcher at top. Supports edit mode via `expense` prop.
  - `ExpenseList` — Styled list of transaction items. Single tap = edit, long press = delete. Shows type badge (↑ gain / ↓ expense) per row.
  - `ExpenseChart` — LineChart, BarChart, DonutChart, and BudgetLineChart wrappers (v2 API from `react-native-chart-kit`)
  - `CategoryManager` — CRUD for expense categories
  - `ExportModal` — CSV export with date range picker
- `expo-env.d.ts` is generated and gitignored

## Conventions

- **VS Code**: `source.fixAll`, `source.organizeImports`, `source.sortMembers` run on save. Recommended extension: `expo.vscode-expo-tools`.
- **Design language** (from `DESIGN.md`):
  - Black-and-white duet with pill-shaped buttons (`borderRadius: 999px`)
  - Cards at `borderRadius: 16px`, inputs at `borderRadius: 8px`
  - Sentence-case headlines, Inter font (substitute for UberMove)
  - FAB (floating action button) for "Add Transaction" on Home and Budget tabs
- **Uses `expo-sqlite`** for all data. No AsyncStorage.
- **Charts** use `react-native-chart-kit` v2 API (`import { LineChart, DonutChart } from 'react-native-chart-kit/v2'`).
- **Tamagui** v2 is fully configured with custom theme. All UI is built with Tamagui components (`YStack`, `XStack`, `Button`, `Input`, `Dialog`, `Select`, `Sheet`, etc.).
- **Tab bar** uses `expo-symbols` (`SymbolView`) with unicode fallback for cross-platform compatibility.

## Data Model

- `categories`: id, name, color, is_predefined, created_at
- `expenses`: id, name, amount, category_id (FK), description, date, tags, **type** (`'expense' | 'gain'`), created_at
  - `type = 'expense'` — subtracts from budget, counted in reports/savings
  - `type = 'gain'` — adds to budget, offsets expenses in savings tracking
- `budget_balance`: id, amount, set_at — single-row table storing user's manually-set base balance
- `savings_goals`: id, title, target_amount, period_type (`'monthly' | 'annual'`), start_date, end_date, created_at
- 9 predefined categories seeded on first launch. Custom categories deletable.
- Helper functions: `getWeekRange()`, `getMonthRange()`, `getYearRange()`, `getDailyTotalsInRange()`, `getExpenseSummaryInRange()`, `getTotalInRange()`, `getGainTotalInRange()`, `getBalanceOverTime()`, `getSavingsProgress()`, `getBudgetBalance()`, `setBudgetBalance()`, all savings goal CRUD

## Tab descriptions

| Tab | File | Purpose |
|-----|------|---------|
| Home | `index.tsx` | Today + weekly overview, FAB to add transaction |
| Budget | `budget.tsx` | Set base balance, running balance line chart, all transactions |
| Savings | `savings.tsx` | Add/edit savings goals, big status text (red/green), progress bars |
| Reports | `reports.tsx` | Daily/weekly/monthly/yearly charts and breakdowns |
| Settings | `settings/` | Theme, categories, export, about |
