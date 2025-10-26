import React from "react";
import { Slot } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();
import { LocalStoreProvider } from "./localStore";

const convex = new ConvexReactClient((globalThis as any).process?.env?.EXPO_PUBLIC_CONVEX_URL as string);
const publishableKey = (globalThis as any).process?.env?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string;

export default function RootLayout() {
  const publishableKey = (globalThis as any).process?.env?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string;
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
    <ConvexProviderWithClerk  client={convex} useAuth={useAuth}>
      <LocalStoreProvider>
        <Slot />
      </LocalStoreProvider>
    </ConvexProviderWithClerk>
  </ClerkProvider>
  );
}

