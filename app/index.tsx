// app/index.tsx
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { SignInButton } from "@clerk/clerk-react";
import { Redirect, router } from "expo-router";
import { useConvex, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function App() {
  const convex = useConvex();
  const ensureUser = useMutation(api.users.ensureUser);

  async function signInAs(user: "alice" | "bob") {
    const base = (globalThis as any).process?.env?.EXPO_PUBLIC_CONVEX_URL as string;
    if (!base) return;
    const res = await fetch(`${base}/dev/issue?user=${user}`);
    let token: string | undefined;
    try {
      const body = await res.json();
      if (body?.error) {
        console.error("Dev auth error:", body.error);
        return;
      }
      token = body?.token as string | undefined;
    } catch (e) {
      console.error("Invalid JSON from /dev/issue", e);
      return;
    }
    if (!token) return;
    await convex.setAuth(() => Promise.resolve(token));
    await ensureUser({});
    router.replace("/(tabs)/chats");
  }
  return (
    <View style={styles.container}>
      <SignedOut>
        <View style={styles.card}>
          <Text style={styles.title}>Sun Chat</Text>
          <Text style={styles.sub}>Sign in to continue</Text>
          {Platform.OS === "web" && <SignInButton />}
          <View style={{ height: 12 }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable style={styles.cta} onPress={() => signInAs("alice")}> 
              <Text style={styles.ctaText}>Sign in as Alice</Text>
            </Pressable>
            <Pressable style={[styles.cta, { backgroundColor: "#6366f1" }]} onPress={() => signInAs("bob")}>
              <Text style={styles.ctaText}>Sign in as Bob</Text>
            </Pressable>
          </View>
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
