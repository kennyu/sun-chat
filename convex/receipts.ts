import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const markRead = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userSubject = identity.subject;

    // Find any existing receipt for this message by this user
    const existing = await ctx.db
      .query("receipts")
      .withIndex("by_msg", (q) => q.eq("messageId", messageId))
      .filter((q) => q.eq(q.field("userId"), userSubject))
      .first();

    if (existing) {
      if (existing.status !== "read") {
        await ctx.db.patch(existing._id, { status: "read", at: Date.now() });
      }
      return existing._id;
    }

    const receiptId = await ctx.db.insert("receipts", {
      messageId,
      userId: userSubject,
      status: "read",
      at: Date.now(),
    });
    return receiptId;
  },
});

export const countsForMessages = query({
  args: { messageIds: v.array(v.id("messages")) },
  handler: async (ctx, { messageIds }) => {
    const results: Array<{ messageId: typeof messageIds[number]; readCount: number }> = [];
    for (const mid of messageIds) {
      const receipts = await ctx.db
        .query("receipts")
        .withIndex("by_msg", (q) => q.eq("messageId", mid))
        .collect();
      const readCount = receipts.filter((r) => r.status === "read").length;
      results.push({ messageId: mid, readCount });
    }
    return results;
  },
});


