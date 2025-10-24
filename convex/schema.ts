import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  users: defineTable({
    userId: v.string(), // Clerk subject
    email: v.optional(v.string()),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
  })
    .index("by_userId", ["userId"]) 
    .index("by_email", ["email"]),
  rooms: defineTable({
    name: v.string(),
    isGroup: v.boolean(),
    createdBy: v.string(),
  }).index("by_creator", ["createdBy"]),
  memberships: defineTable({
    roomId: v.string(),
    userId: v.string(),
  })
    .index("by_room", ["roomId"]) 
    .index("by_user", ["userId"]),
  messages: defineTable({
    roomId: v.string(),
    senderId: v.string(),
    kind: v.string(),
    text: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_room_time", ["roomId", "createdAt"]),
  receipts: defineTable({
    messageId: v.string(),
    userId: v.string(),
    status: v.string(),
    at: v.number(),
  }).index("by_msg", ["messageId"]),
  presence: defineTable({
    userId: v.string(),
    roomId: v.string(),
    online: v.boolean(),
    typing: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_room", ["roomId"]) 
    .index("by_user", ["userId"]),
});

export default schema;


