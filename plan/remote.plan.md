<!-- 47cdd03a-c5c2-4c06-8d92-adac0aa9cbcf 32f0584c-6636-47a2-a4a2-3595a5435c91 -->
# Remote Team Pro — Expo + Convex Plan

Auth decision: Clerk (Expo + Convex)

Sign-in methods: Google OAuth + Email/password

Task Checklist

- Phase 1 — Core Messaging Infrastructure
  - ☐ Configure Convex schema and security rules
  - ☐ Integrate Clerk auth (Google + Email/password) with Convex verification
  - ☐ Implement 1:1 and group chat with optimistic UI
  - ☐ Presence, typing indicators, and read receipts
  - ☐ Offline cache (Expo SQLite) and reconnection logic
  - ☐ Basic media send/receive with placeholders
- Phase 2 — Persona AI (5 features)
  - ☐ Add Convex AI Agent with conversation RAG
  - ☐ Thread summarization and action item extraction
  - ☐ Smart search, priority detection, decision tracking
  - ☐ Contextual UI (long-press + toolbar) with streaming UX
  - ☐ Eval harness, logs, latency budgets
- Phase 3 — Advanced AI + Mobile Quality & Delivery
  - ☐ Implement Proactive Assistant (advanced AI)
  - ☐ Push notifications, lifecycle reconnection, perf polish
  - ☐ Documentation, demo scenarios, persona brainlift, deployable build

---

### Phase 1 — Realtime: Read Receipts, Presence, Typing Indicators

Affected files and concise changes

- `convex/schema.ts`
  - Ensure `receipts` uses `v.id("messages")`; add indexes if needed: `by_user_message` on (`userId`,`messageId`).
  - Ensure `presence` table exists with (`userId`,`roomId`,`online`,`typing`,`updatedAt`) and indexes `by_room`, `by_user`.
- `convex/receipts.ts`
  - `markRead({ roomId, upToTs })`: upsert read receipts for current user for all messages in room with `createdAt <= upToTs`.
  - `listReaders({ messageId })`: list users who read a message.
- `convex/presence.ts`
  - `setPresence({ roomId, online })` (heartbeat style; server sets `updatedAt`), auto-expire in query.
  - `setTyping({ roomId, typing })` (short TTL).
  - `listRoomPresence({ roomId })`: returns `onlineUserIds` and `typingUserIds` (filtered by freshness window, e.g., 10s typing, 60s online).
- `app/chat/[roomId].tsx`
  - On screen focus: call `setPresence({online:true})`; on blur/unmount: `setPresence({online:false})`.
  - On text input change: throttle/debounce `setTyping(true)`; set `false` after idle.
  - When mounting or after messages load: call `markRead({ roomId, upToTs: lastMessage.createdAt })`.
  - UI: show “Typing…” below composer if `typingUserIds` (excluding self) non-empty; show per-message read avatar dot or “Read by N”.
- `app/(tabs)/chats/index.tsx`
  - Show presence badge for room if any member (excluding self) is online.
- `app/components/TypingIndicator.tsx` (new)
  - Stateless view: accepts `count` and renders compact indicator.

Server logic (sketch)

```ts
// convex/receipts.ts
export const markRead = mutation({ args: { roomId: v.id("rooms"), upToTs: v.number() }, handler: async (ctx, { roomId, upToTs }) => {
  const me = (await ctx.auth.getUserIdentity())?.subject; if (!me) throw new Error("Unauthenticated");
  const msgs = await ctx.db.query("messages").withIndex("by_room_time", q => q.eq("roomId", roomId)).filter(q => q.lte(q.field("createdAt"), upToTs)).collect();
  for (const m of msgs) {
    const existing = await ctx.db.query("receipts").withIndex("by_msg", q => q.eq("messageId", m._id)).filter(q => q.eq(q.field("userId"), me)).first();
    if (existing) await ctx.db.patch(existing._id, { status: "read", at: Date.now() });
    else await ctx.db.insert("receipts", { messageId: m._id, userId: me, status: "read", at: Date.now() });
  }
}});
```

Unit tests (describe)

- `convex/__tests__/receipts.test.ts`: markRead idempotency; only includes messages up to timestamp; read-after-send sequence.
- `convex/__tests__/presence.test.ts`: online expiry after TTL; typing expiry after short TTL; listRoomPresence excludes self.
- `app/__tests__/typing.test.tsx`: input changes trigger `setTyping(true)` with debounce; idle clears typing; indicator renders for others.

Acceptance criteria

- Typing shows within ~300ms; clears within ~3s of inactivity.
- Presence updates reflect within ~1s; offline after 60s without heartbeat.
- Opening a room marks messages as read; per-message read info visible within ~1s.

### To-dos

- [ ] Implement core messaging infrastructure with Convex + Expo
- [ ] Build 5 persona AI features with Convex AI Agent
- [ ] Add Proactive Assistant, mobile quality, and delivery