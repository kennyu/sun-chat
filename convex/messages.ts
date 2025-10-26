import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    kind: v.string(), // "text" | "image"
    text: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("[messages.send] called", { ts: Date.now(), args });
    const identity = await ctx.auth.getUserIdentity();
    console.log("[messages.send] identity", identity);
    if (!identity) throw new Error("Unauthenticated");
    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      senderId: identity.subject,
      kind: args.kind,
      text: args.text,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
    });
    console.log("[messages.send] inserted", { messageId });
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


