import { AuthConfig } from "convex/server";

const issuer = process.env.CLERK_JWT_ISSUER as string;
if (!issuer) {
  throw new Error("Missing CLERK_JWT_ISSUER env var for Convex auth");
}

export default {
  providers: [
    {
      // Clerk JWT template issuer URL, e.g. https://<your-domain>.clerk.accounts.dev
      domain: issuer,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;


