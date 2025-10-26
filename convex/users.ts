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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const me = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
    return me ?? null;
  },
});


