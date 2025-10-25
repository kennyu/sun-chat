<!-- 20549d17-f6c5-4d14-8746-16eaf35a00dc f119b3f7-7629-42cb-91d9-f1ce82d50e07 -->
# Execute Minimal Chat Plan

## Backend (Convex)

- Keep required indexes that current queries depend on (no schema changes):
- `messages.by_room_time` for room-scoped chronological queries
- `memberships.by_user` and `by_room` for room/user lookups
- `receipts.by_msg` (kept; optional endpoints later)
- Use existing endpoints:
- `rooms.listForCurrentUser`, `rooms.create`
- `messages.listByRoom`, `messages.send`

## App (Expo Router)

- Ensure providers and env vars are set in `app/_layout.tsx` (Convex + Clerk Expo).
- Align `app/index.tsx` to Clerk Expo primitives (SignedIn/SignedOut) and redirect to `/(tabs)/chats`.
- Use existing UI:
- `app/(tabs)/chats/index.tsx` lists rooms, creates a room, navigates to `/chat/[roomId]`.
- `app/chat/[roomId].tsx` loads messages and sends text.
- Add optional pagination in room view via `before` cursor and `onEndReached`.

## Optional (nice-to-have)

- Read receipts API using `receipts.by_msg` and display per-message status.
- Presence (typing/online) using `presence.by_room`.

### To-dos

- [ ] Configure EXPO_PUBLIC_CONVEX_URL and EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
- [ ] Align app/index.tsx to Clerk Expo SignedIn/SignedOut and redirect
- [ ] Verify Convex indexes match code queries (no changes)
- [ ] Confirm room list/create flow navigates to /chat/[roomId]
- [ ] Confirm message list renders and sending works
- [ ] Add load-more using before cursor in [roomId].tsx
- [ ] Add receipts query + UI hooks using receipts.by_msg
- [ ] Add presence API + UI (online/typing) using presence indexes