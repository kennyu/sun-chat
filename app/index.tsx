import { SignInButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Redirect } from "expo-router";

function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
        padding: "24px",
      }}
    >
      <Unauthenticated>
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: "32px" }}>Sun Chat</h1>
          <p style={{ color: "#64748b", marginTop: 8, marginBottom: 16 }}>
            Sign in to continue
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <SignInButton mode="modal" />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <Redirect href="/(tabs)/chats" />
      </Authenticated>
      <AuthLoading>
        <div style={{ color: "#ffffff", opacity: 0.9, marginTop: 16 }}>Still loading…</div>
      </AuthLoading>
    </main>
  );
}
export default App;