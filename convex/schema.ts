import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
  ...authTables,
  users: defineTable({
    userId: v.string(), // Clerk subject ID
    email: v.optional(v.string()),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
  })
    .index("by_userId", ["userId"]) 
    .index("by_email", ["email"]),
  rooms: defineTable({
    name: v.string(),
    isGroup: v.boolean(),
    createdBy: v.id("users"),
  }).index("by_creator", ["createdBy"]),
  memberships: defineTable({
    roomId: v.id("rooms"),
    userId: v.string(),
  })
    .index("by_room", ["roomId"]) 
    .index("by_user", ["userId"]),
  messages: defineTable({
    roomId: v.id("rooms"),
    senderId: v.string(),
    kind: v.string(),
    text: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_room_time", ["roomId", "createdAt"]),
  presence: defineTable({
    userId: v.id("users"),
    roomId: v.id("rooms"),
    online: v.boolean(),
    typing: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_room", ["roomId"]) 
    .index("by_user", ["userId"]),
});

export default schema;


