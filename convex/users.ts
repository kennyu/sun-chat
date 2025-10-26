import { query } from "./_generated/server";


export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").collect();
    return rows;
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    console.log("[users.current] called", {
      ts: Date.now(),
    });
    const identity = await ctx.auth.getUserIdentity();
    console.log("[users.current] identity", identity);
    if (!identity) return null;
    const me = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
    console.log("[users.current] db result", {
      subject: identity.subject,
      found: !!me,
      userId: me?._id,
    });
    return me ?? null;
  },
});


