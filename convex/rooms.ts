import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userSubject = identity.subject;

    // Find memberships for this user
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userSubject))
      .collect();

    if (memberships.length === 0) return [];

    // Load rooms by membership
    const rooms = await Promise.all(memberships.map((m) => ctx.db.get(m.roomId)));
    return rooms.filter(Boolean);
  },
});

export const create = mutation({
  args: { name: v.string(), memberUserIds: v.array(v.string()) },
  handler: async (ctx, { name, memberUserIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const subject = identity.subject;

    // Ensure we have a users doc for the creator and get its Id
    let creator = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", subject))
      .first();
    if (!creator) {
      const email = identity.email ?? undefined;
      const displayName =
        identity.name ?? identity.givenName ?? identity.familyName ?? email ?? "User";
      const avatarUrl = identity.pictureUrl ?? undefined;
      const createdId = await ctx.db.insert("users", {
        userId: subject,
        email,
        displayName,
        avatarUrl,
      });
      creator = await ctx.db.get(createdId);
    }

    const roomId = await ctx.db.insert("rooms", {
      name,
      isGroup: memberUserIds.length > 1,
      createdBy: creator!._id,
    });
    const uniqueMembers = Array.from(new Set([subject, ...memberUserIds]));
    for (const uid of uniqueMembers) {
      await ctx.db.insert("memberships", { roomId, userId: uid });
    }
    return roomId;
  },
});


