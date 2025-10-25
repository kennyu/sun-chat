import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const setPresence = mutation({
  args: {
    roomId: v.id("rooms"),
    online: v.boolean(),
    typing: v.boolean(),
  },
  handler: async (ctx, { roomId, online, typing }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const subject = identity.subject;

    // Find existing presence for this user/room
    // We store presence.userId as a users document Id
    const userDoc = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", subject))
      .first();
    if (!userDoc) throw new Error("User record not found");

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", userDoc._id))
      .filter((q) => q.eq(q.field("roomId"), roomId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { online, typing, updatedAt: Date.now() });
      return existing._id;
    }

    const id = await ctx.db.insert("presence", {
      userId: userDoc._id,
      roomId,
      online,
      typing,
      updatedAt: Date.now(),
    });
    return id;
  },
});

export const listByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const rows = await ctx.db
      .query("presence")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    return rows;
  },
});


