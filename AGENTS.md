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
  - `(tabs)/` — tab navigator with `index.tsx` (Home), `reports.tsx`, `settings.tsx`
  - `+not-found.tsx`, `+html.tsx` — Expo Router conventions
- **Path alias** `@/*` maps to `./*` (configured in `tsconfig.json`)
- **Typed routes** enabled (`app.json` → `experiments.typedRoutes: true`)
- **Theme**: Uber-inspired black-and-white design from `DESIGN.md`. Tamagui config at `tamagui.config.ts`.
- **Data persistence**: SQLite via `expo-sqlite`. Schema in `lib/database.ts` with `categories` and `expenses` tables.
- **Components**:
  - `AddExpenseModal` — Dialog/Sheet for logging expenses
  - `ExpenseList` — styled list of expense items
  - `ExpenseChart` — LineChart + DonutChart wrappers (v2 API from `react-native-chart-kit`)
  - `CategoryManager` — CRUD for expense categories
  - `ExportModal` — CSV export with date range picker
- `expo-env.d.ts` is generated and gitignored

## Conventions

- **VS Code**: `source.fixAll`, `source.organizeImports`, `source.sortMembers` run on save. Recommended extension: `expo.vscode-expo-tools`.
- **Design language** (from `DESIGN.md`):
  - Black-and-white duet with pill-shaped buttons (`borderRadius: 999px`)
  - Cards at `borderRadius: 16px`, inputs at `borderRadius: 8px`
  - Sentence-case headlines, Inter font (substitute for UberMove)
  - FAB (floating action button) for "Add Expense" on Home
- **Uses `expo-sqlite`** for all data. No AsyncStorage.
- **Charts** use `react-native-chart-kit` v2 API (`import { LineChart, DonutChart } from 'react-native-chart-kit/v2'`).
- **Tamagui** v2 is fully configured with custom theme. All UI is built with Tamagui components (`YStack`, `XStack`, `Button`, `Input`, `Dialog`, `Select`, `Sheet`, etc.).
- **Tab bar** uses unicode text icons instead of `expo-symbols` for cross-platform compatibility.

## Data Model

- `categories`: id, name, color, is_predefined, created_at
- `expenses`: id, name, amount, category_id (FK), description, date, tags, created_at
- 9 predefined categories seeded on first launch. Custom categories deletable.
- Helper functions: `getWeekRange()`, `getMonthRange()`, `getYearRange()`, `getDailyTotalsInRange()`, `getExpenseSummaryInRange()`
