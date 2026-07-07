import { createAnimations } from "@tamagui/animations-react-native";
import { defaultConfig } from "@tamagui/config/v5";
import { createFont, createTamagui } from "tamagui";

// ─── Animations ──────────────────────────────────────────────────────────────
const animations = createAnimations({
  fast: { type: "spring", damping: 20, mass: 1.2, stiffness: 250 },
  medium: { type: "spring", damping: 20, mass: 1, stiffness: 200 },
  slow: { type: "spring", damping: 20, mass: 0.8, stiffness: 100 },
  bouncy: { type: "spring", damping: 9, mass: 0.9, stiffness: 150 },
});

// ─── Colors from DESIGN.md ───────────────────────────────────────────────────
const colors = {
  black: "#000000",
  white: "#ffffff",
  canvasSoft: "#efefef",
  canvasSofter: "#f3f3f3",
  surfacePressed: "#e2e2e2",
  blackElevated: "#282828",
  bodyText: "#5e5e5e",
  hairlineMid: "#4b4b4b",
  mute: "#afafaf",
  link: "#0000ee",
} as const;

// ─── Fonts ────────────────────────────────────────────────────────────────────
// Inter as substitute for UberMove / UberMoveText
const interFont = createFont({
  family: "Inter",
  size: {
    1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 24, 7: 32, 8: 36, 9: 52,
    true: 16,
  },
  lineHeight: {
    1: 20, 2: 20, 3: 24, 4: 24, 5: 28, 6: 32, 7: 40, 8: 44, 9: 64,
    true: 24,
  },
  weight: {
    1: "400", 2: "500", 3: "700", true: "400",
  },
  letterSpacing: { true: 0 },
});

// ─── Themes ───────────────────────────────────────────────────────────────────
// v5 themes work with plain color value objects
const lightTheme = {
  background: colors.white,
  color: colors.black,
  borderColor: colors.surfacePressed,
  placeholderColor: colors.mute,
};

const darkTheme = {
  background: colors.black,
  color: colors.white,
  borderColor: "#333333",
  placeholderColor: colors.hairlineMid,
};

// ─── Config ───────────────────────────────────────────────────────────────────
const config = createTamagui({
  ...defaultConfig,
  animations,
  fonts: {
    heading: interFont,
    body: interFont,
  },
  themes: {
    ...defaultConfig.themes,
    light: lightTheme,
    dark: darkTheme,
  },
});

export type AppConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
