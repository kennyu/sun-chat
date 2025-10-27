import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    kind: v.string(), // "text" | "image"
    text: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      senderId: identity.subject.split("|")[0],
      kind: args.kind,
      text: args.text,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
    });
    // Fire-and-forget: compute embedding if text present
    if (args.kind === "text" && args.text) {
      ctx.scheduler.runAfter(0, (internal as any).ai._embedMessage, {
        messageId,
      });
    }
    return messageId;
  },
});

export const listByRoom = query({
  args: { roomId: v.id("rooms"), limit: v.optional(v.number()), before: v.optional(v.number()) },
  handler: async (ctx, { roomId, limit = 50, before }) => {
    let q = ctx.db.query("messages").withIndex("by_room_time", (q) => q.eq("roomId", roomId));
    if (before !== undefined) q = q.filter((qq) => qq.lt(qq.field("createdAt"), before));
    const rows = await q.order("desc").take(limit);
    return rows.reverse();
  },
});

export const get = internalQuery({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});


