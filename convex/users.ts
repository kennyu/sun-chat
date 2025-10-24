import { mutation } from "./_generated/server";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const subject = identity.subject;
    const email = identity.email ?? undefined;
    const displayName =
      identity.name ?? identity.givenName ?? identity.familyName ?? email ?? "User";
    const avatarUrl = identity.pictureUrl ?? undefined;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { displayName, avatarUrl, email });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      userId: subject,
      email,
      displayName,
      avatarUrl,
    });
    return userId;
  },
});


