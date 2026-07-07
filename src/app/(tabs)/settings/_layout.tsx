import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function SettingsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: "Inter-Bold", fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: "Settings",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="theme" options={{ title: "Theme" }} />
      <Stack.Screen name="categories" options={{ title: "Categories" }} />
      <Stack.Screen name="export" options={{ title: "Export" }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
    </Stack>
  );
}
