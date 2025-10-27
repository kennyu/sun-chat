import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
  ...authTables,
  users: defineTable({
    userId: v.string(), // Auth subject ID
    email: v.optional(v.string()),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()), // Legacy URL support
    avatarStorageId: v.optional(v.id("_storage")), // Convex file storage
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
  // Embeddings for messages to support RAG. Vector index will be added in M1.
  messageEmbeddings: defineTable({
    messageId: v.id("messages"),
    roomId: v.id("rooms"),
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"]) 
    .index("by_room", ["roomId"]) 
    .vectorIndex("by_embedding", { vectorField: "embedding", dimensions: 1536 }),
  // AI logs for observability and evals.
  aiLogs: defineTable({
    kind: v.string(), // answer | summarize | action_items | search | classify
    roomId: v.optional(v.id("rooms")),
    userId: v.optional(v.string()),
    prompt: v.optional(v.string()),
    retrievedMessageIds: v.optional(v.array(v.id("messages"))),
    model: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    status: v.optional(v.string()), // ok | error
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_room_time", ["roomId", "createdAt"]),
  // Thread summaries.
  threadSummaries: defineTable({
    roomId: v.id("rooms"),
    summary: v.string(),
    model: v.string(),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_room", ["roomId"]),
  // Extracted action items per room (optionally linked to a message).
  actionItems: defineTable({
    roomId: v.id("rooms"),
    messageId: v.optional(v.id("messages")),
    items: v.array(
      v.object({
        text: v.string(),
        assignee: v.optional(v.string()),
        dueDate: v.optional(v.string()), // ISO date
        priority: v.optional(v.string()), // low | medium | high
      })
    ),
    model: v.string(),
    createdAt: v.number(),
  }).index("by_room", ["roomId"]),
  // Message- or thread-level signals such as decision flags and priority.
  aiSignals: defineTable({
    roomId: v.id("rooms"),
    messageId: v.optional(v.id("messages")),
    isDecision: v.optional(v.boolean()),
    priority: v.optional(v.string()), // none | low | medium | high | urgent
    createdAt: v.number(),
  })
    .index("by_room", ["roomId"]) 
    .index("by_message", ["messageId"]),
  // Streaming-lite support: streams and their token events
  aiStreams: defineTable({
    roomId: v.id("rooms"),
    prompt: v.string(),
    status: v.string(), // started | done | error
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_room", ["roomId"]),
  aiStreamEvents: defineTable({
    streamId: v.id("aiStreams"),
    seq: v.number(),
    kind: v.string(), // token | done | status
    data: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_stream", ["streamId"]) 
    .index("by_stream_seq", ["streamId", "seq"]),
});

export default schema;


