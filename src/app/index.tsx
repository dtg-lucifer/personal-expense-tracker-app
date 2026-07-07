import { Redirect } from "expo-router";

// The root of the app always lives in the (tabs) group.
export default function RootIndex() {
  return <Redirect href="/(tabs)" />;
}
