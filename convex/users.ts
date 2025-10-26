import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";


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
    const identity = await getAuthUserId(ctx);
    const me = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), identity))
        .first();
    return me ?? null;
  },
});

