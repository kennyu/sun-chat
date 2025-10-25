import { SignInButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Redirect } from "expo-router";

function App() {
  return (
    <main>
      <Unauthenticated>
        <SignInButton mode="modal"/>
      </Unauthenticated>
      <Authenticated>
        <Redirect href="/(tabs)/chats" />
      </Authenticated>
      <AuthLoading>
        <p>Still loading</p>
      </AuthLoading>
    </main>
  );
}
export default App;