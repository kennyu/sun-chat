import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").collect();
    
    // Resolve storage IDs to URLs
    return await Promise.all(
      rows.map(async (user) => {
        const avatarUrl = user.avatarStorageId 
          ? await ctx.storage.getUrl(user.avatarStorageId)
          : user.avatarUrl;
        return { ...user, avatarUrl };
      })
    );
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
    
    if (!me) return null;
    
    // Resolve storage URL if present
    const avatarUrl = me.avatarStorageId 
      ? await ctx.storage.getUrl(me.avatarStorageId)
      : me.avatarUrl;
    
    return { ...me, avatarUrl };
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
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
    if (args.avatarStorageId !== undefined) updates.avatarStorageId = args.avatarStorageId;
    
    await ctx.db.patch(me._id, updates);
    return me._id;
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return await ctx.storage.generateUploadUrl();
});

export const getAvatarUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

