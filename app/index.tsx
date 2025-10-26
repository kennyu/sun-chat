// app/index.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { SignInButton } from "@clerk/clerk-react";

export default function App() {
  return (
    <View style={styles.container}>
      <SignedOut>
        <View style={styles.card}>
          <Text style={styles.title}>Sun Chat</Text>
          <Text style={styles.sub}>Sign in to continue</Text>
          <SignInButton />
        </View>
      </SignedOut>

      <SignedIn>
        <Redirect href="/(tabs)/chats" />
      </SignedIn>

      {/* If you need a loading state, keep it in Text/View only */}
      {/* <Text style={styles.loading}>Still loading…</Text> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "transparent",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    alignItems: "center",
  },
  title: { fontSize: 28, lineHeight: 32, fontWeight: "600" },
  sub: { color: "#64748b", marginTop: 8, marginBottom: 16 },
  cta: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#0ea5e9" },
  ctaText: { color: "#fff", fontWeight: "600" },
  loading: { color: "#fff", opacity: 0.9, marginTop: 16 },
});
