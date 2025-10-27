import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userSubject = identity.subject.split("|")[0];

    // Find memberships for this user
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userSubject))
      .collect();

    if (memberships.length === 0) return [];

    // Load rooms by membership
    const rooms = (await Promise.all(memberships.map((m) => ctx.db.get(m.roomId)))).filter(
      (r): r is NonNullable<typeof r> => !!r
    );

    // Enrich rooms with member information
    const enrichedRooms = await Promise.all(
      rooms.map(async (room) => {
        const roomMemberships = await ctx.db
          .query("memberships")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();
        
        const memberUsers = (await Promise.all(
          roomMemberships.map(async (m) => {
              const user = await ctx.db
              .query("users")
              .filter((q) => q.eq(q.field("_id"), m.userId))
              .first();
              return user;
          })
        )).filter((u): u is NonNullable<typeof u> => !!u);

        return {
          ...room,
          members: await Promise.all(memberUsers.map(async (u) => ({
            _id: u._id,
            displayName: u.displayName,
            avatarUrl: u.avatarStorageId 
              ? await ctx.storage.getUrl(u.avatarStorageId) 
              : u.avatarUrl,
          }))),
        } as any;
      })
    );

    return enrichedRooms;
  },
});

export const create = mutation({
  args: { name: v.string(), memberUserIds: v.array(v.string()) },
  handler: async (ctx, { name, memberUserIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const subject = identity.subject.split("|")[0];

    // Ensure we have a users doc for the creator and get its Id
    let creator = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), identity?.subject?.split("|")[0]))
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

