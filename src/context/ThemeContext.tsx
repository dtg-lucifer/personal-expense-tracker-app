/**
 * src/context/ThemeContext.tsx
 *
 * App-wide theme context.
 * Persists the user's theme preference in AsyncStorage-free SQLite prefs table,
 * but since we want zero dependencies we use a simple module-level variable
 * backed by a React context + SQLite prefs row.
 *
 * Colors follow DESIGN.md exactly:
 *   Light: canvas #fff, ink #000, canvasSoft #efefef, etc.
 *   Dark:  polarity-flipped — background #000, text #fff
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Appearance } from "react-native";
import { getDatabase } from "@/lib/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColorScheme = "light" | "dark" | "system";

export interface ThemeColors {
  // Surfaces
  background: string;
  backgroundSoft: string;    // canvas-soft / elevated
  backgroundSofter: string;  // canvas-softer / nested input
  backgroundPressed: string; // surface-pressed
  // Text
  ink: string;           // primary text
  body: string;          // secondary text #5e5e5e / #afafaf
  mute: string;          // placeholder / caption
  hairline: string;      // borders / dividers
  // Semantic
  onDark: string;        // text on black surface (always #fff)
  // Elevation
  cardShadow: string;
  // Raw flags
  isDark: boolean;
}

export interface ThemeContextValue {
  scheme: ColorScheme;
  colors: ThemeColors;
  setScheme: (s: ColorScheme) => void;
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const LIGHT: ThemeColors = {
  background: "#ffffff",
  backgroundSoft: "#efefef",
  backgroundSofter: "#f3f3f3",
  backgroundPressed: "#e2e2e2",
  ink: "#000000",
  body: "#5e5e5e",
  mute: "#afafaf",
  hairline: "#e2e2e2",
  onDark: "#ffffff",
  cardShadow: "rgba(0,0,0,0.08)",
  isDark: false,
};

const DARK: ThemeColors = {
  background: "#000000",
  backgroundSoft: "#1a1a1a",
  backgroundSofter: "#222222",
  backgroundPressed: "#333333",
  ink: "#ffffff",
  body: "#afafaf",
  mute: "#4b4b4b",
  hairline: "#282828",
  onDark: "#ffffff",
  cardShadow: "rgba(0,0,0,0.4)",
  isDark: true,
};

// ─── Persist helpers (SQLite prefs table) ─────────────────────────────────────

function ensurePrefsTable() {
  try {
    const db = getDatabase();
    db.execSync(`
      CREATE TABLE IF NOT EXISTS prefs (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  } catch {}
}

function readPref(key: string): string | null {
  try {
    const db = getDatabase();
    const row = db.getFirstSync<{ value: string }>(
      "SELECT value FROM prefs WHERE key = ?;",
      [key]
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function writePref(key: string, value: string) {
  try {
    const db = getDatabase();
    db.runSync(
      "INSERT OR REPLACE INTO prefs (key, value) VALUES (?, ?);",
      [key, value]
    );
  } catch {}
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue>({
  scheme: "system",
  colors: LIGHT,
  setScheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>("system");

  useEffect(() => {
    ensurePrefsTable();
    const saved = readPref("colorScheme");
    if (saved === "light" || saved === "dark" || saved === "system") {
      setSchemeState(saved);
    }
  }, []);

  const setScheme = useCallback((s: ColorScheme) => {
    setSchemeState(s);
    writePref("colorScheme", s);
  }, []);

  const systemIsDark = Appearance.getColorScheme() === "dark";
  const resolved =
    scheme === "system" ? (systemIsDark ? "dark" : "light") : scheme;
  const colors = resolved === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ scheme, colors, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
