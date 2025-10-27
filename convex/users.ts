import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    const me = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), identity?.subject?.split("|")[0]))
        .first();
    return me ?? null;
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    
    const me = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), identity.subject.split("|")[0]))
        .first();
    
    if (!me) throw new Error("User not found");
    
    const updates: any = {};
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;
    
    await ctx.db.patch(me._id, updates);
    return me._id;
  },
});

