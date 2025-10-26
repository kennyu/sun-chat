declare global {
  /** Minimal `process.env` typings for Expo/React Native without @types/node */
  var process: {
    env: {
      EXPO_PUBLIC_CONVEX_URL?: string;
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
      [key: string]: string | undefined;
    };
  };

  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_CONVEX_URL?: string;
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
      [key: string]: string | undefined;
    }
  }
}

export {};


