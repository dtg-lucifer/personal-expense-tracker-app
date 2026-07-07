import { Link, Stack } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.sub}>
          This screen doesn't exist.
        </Text>
        <Link href="/" asChild>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>Go to home</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  code: {
    color: "#efefef",
    fontFamily: "Inter-Bold",
    fontSize: 80,
    lineHeight: 88,
    marginBottom: 8,
  },
  title: {
    color: "#000000",
    fontFamily: "Inter-Bold",
    fontSize: 24,
    marginBottom: 8,
  },
  sub: {
    color: "#5e5e5e",
    fontFamily: "Inter",
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  btn: {
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  btnText: {
    color: "#ffffff",
    fontFamily: "Inter-Medium",
    fontSize: 16,
  },
});
