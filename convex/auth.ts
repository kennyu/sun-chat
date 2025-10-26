import { Password } from "./providers";
import { convexAuth } from "@convex-dev/auth/server";
 
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});