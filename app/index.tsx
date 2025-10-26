import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function App() {
  const { signIn } = useAuthActions();
//   const ensureUser = useMutation(
//     require("../convex/_generated/api").api.users.ensureUser
//   );
  const [step, setStep] = useState<"signUp" | "signIn">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <>
      <Unauthenticated>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.flex}
          >
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.card}>
                <Text style={styles.title}>Sun Chat</Text>
                <Text style={styles.subtitle}>
                  {step === "signIn"
                    ? "Sign in to continue"
                    : "Create your account"}
                </Text>

                {error && (
                  <Text style={styles.error}>{error}</Text>
                )}

                {step === "signUp" && (
                  <View style={styles.inputWrap}>
                    <Text style={styles.label}>Display name</Text>
                    <TextInput
                      placeholder="Ada Lovelace"
                      placeholderTextColor="#9aa3af"
                      onChangeText={setDisplayName}
                      value={displayName}
                      style={styles.input}
                      returnKeyType="next"
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View style={styles.inputWrap}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    placeholder="you@example.com"
                    placeholderTextColor="#9aa3af"
                    onChangeText={setEmail}
                    value={email}
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    style={styles.input}
                    returnKeyType="next"
                    textContentType="emailAddress"
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    placeholder="• • • • • • • •"
                    placeholderTextColor="#9aa3af"
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry
                    style={styles.input}
                    returnKeyType="done"
                    textContentType="password"
                  />
                </View>

                <Pressable
                  style={styles.primaryBtn}
                  onPress={async () => {
                    setError(null);
                    try {
                      await signIn("password", {
                        email,
                        password,
                        flow: step,
                        name: displayName,
                        displayName,
                      });
                      // Redirect handled by <Authenticated> below once the
                      // token handshake completes.
                    } catch (e) {
                      setError("Invalid email or password");
                      router.replace("/");
                    }
                  }}
                >
                  <Text style={styles.primaryBtnText}>
                    {step === "signIn" ? "Sign in" : "Sign up"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.linkBtn}
                  onPress={() =>
                    setStep(step === "signIn" ? "signUp" : "signIn")
                  }
                >
                  <Text style={styles.linkBtnText}>
                    {step === "signIn"
                      ? "Sign up instead"
                      : "Sign in instead"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Unauthenticated>

      <Authenticated>
        <Redirect href="/(tabs)/chats" />
      </Authenticated>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#0b1220" },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 20,
    gap: 14,
    // soft shadow
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#e5e7eb",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#9aa3af",
    textAlign: "center",
    marginTop: -4,
    marginBottom: 8,
  },
  inputWrap: { gap: 6 },
  label: { color: "#cbd5e1", fontSize: 12 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2a44",
    paddingHorizontal: 14,
    color: "#e5e7eb",
    backgroundColor: "#0b1220",
  },
  primaryBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    marginTop: 6,
  },
  primaryBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  linkBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  linkBtnText: {
    color: "#93c5fd",
    fontSize: 14,
    fontWeight: "500",
  },
  error: {
    color: "#f87171",
    backgroundColor: "#7f1d1d20",
    borderColor: "#ef4444",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    textAlign: "center",
  },
});

export default App;
