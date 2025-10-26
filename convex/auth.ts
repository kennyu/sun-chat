import { convexAuth } from "@convex-dev/auth/server";
import { Password as BasePassword } from "@convex-dev/auth/providers/Password";

const Password = BasePassword({
  profile(params) {
    const userId = (globalThis.crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2) + Date.now().toString(36)) as string;
    return {
      email: params.email as string,
      userId,
      displayName:
        (params.displayName as string) ??
        (params.name as string) ??
        (params.email as string),
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});