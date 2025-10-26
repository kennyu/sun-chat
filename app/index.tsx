import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Button, TextInput, View } from "react-native";

function App() {

  const { signIn } = useAuthActions();
  const ensureUser = useMutation(require("../convex/_generated/api").api.users.ensureUser);
  const [step, setStep] = useState<"signUp" | "signIn">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const router = useRouter();

  return (
    <>
      <Unauthenticated>
        <View>
          {step === "signUp" && (
            <TextInput
              placeholder="Display name"
              onChangeText={setDisplayName}
              value={displayName}
            />
          )}
          <TextInput
            placeholder="Email"
            onChangeText={setEmail}
            value={email}
            inputMode="email"
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Password"
            onChangeText={setPassword}
            value={password}
            secureTextEntry={true}
          />
          <Button
            title={step === "signIn" ? "Sign in" : "Sign up"}
            onPress={async () => {
              await signIn("password", {
                email,
                password,
                flow: step,
                name: displayName,
                displayName,
              });
              try { await ensureUser({}); } catch {}
              router.replace("/(tabs)/chats");
            }}
          />
          <Button
            title={step === "signIn" ? "Sign up instead" : "Sign in instead"}
            onPress={() => setStep(step === "signIn" ? "signUp" : "signIn")}
          />
        </View>
      </Unauthenticated>
      <Authenticated>
        <Redirect href="/(tabs)/chats" />
      </Authenticated>
    </>
  );
}
export default App;