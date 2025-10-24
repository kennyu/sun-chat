import { query } from "./_generated/server";

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
    const roomIds = memberships.map((m) => m.roomId);
    const rooms = await Promise.all(
      roomIds.map((rid) => ctx.db
        .query("rooms")
        .withIndex("by_creator", (q) => q.eq("createdBy", "__any__")) // dummy to enable index usage; we'll fetch by id instead
        .first()
        .catch(() => null))
    );

    // Prefer direct get if we had ids stored as document ids; here roomId is assumed to be document id
    const roomsDirect = await Promise.all(roomIds.map((rid) => ctx.db.get(rid as any)));

    return roomsDirect.filter(Boolean);
  },
});


