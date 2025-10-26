import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const setPresence = mutation({
  args: {
    roomId: v.id("rooms"),
    online: v.boolean(),
    typing: v.boolean(),
  },
  handler: async (ctx, { roomId, online, typing }) => {
    console.log("[presence.setPresence] called", { ts: Date.now(), roomId, online, typing });
    const identity = await ctx.auth.getUserIdentity();
    console.log("[presence.setPresence] identity", identity);
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
    console.log("[presence.setPresence] upserted", { id });
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

// List Clerk subject userIds that are currently online across any room
export const listOnlineSubjects = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("presence").collect();
    const now = Date.now();
    const freshnessMs = 30_000; // consider online only if heartbeat within 30s
    const onlineUserDocIds = Array.from(
      new Set(rows.filter((r) => r.online && r.updatedAt >= now - freshnessMs).map((r) => r.userId))
    );
    const users = await Promise.all(onlineUserDocIds.map((id) => ctx.db.get(id)));
    const subjects = users
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => u.userId);
    return Array.from(new Set(subjects));
  },
});


