<!-- 86d08ae6-475f-46ed-a962-00f6517f6ab2 647adeba-fed8-4def-aa53-e7fe47760ccf -->
# Optimistic messages + simple offline cache

## Scope

- Optimistic sending for text/image messages (priority)
- AsyncStorage caching for rooms, members, and messages (read-through cache)
- Tiny outbox that retries sends on reconnect
- Keep presence real-time only (no offline emulation)

## Libraries

- Add `@react-native-async-storage/async-storage`
- Optional: `@react-native-community/netinfo` (or use a "send failed" catch-as-offline heuristic)

## New files

- `lib/offlineStorage.ts`: thin wrapper over AsyncStorage with typed helpers and stable keys
- `hooks/useOfflineSync.ts`: small hook to persist server data into cache and drain outbox on reconnect
- `types/offline.ts`: shared lightweight types (PendingMessage, CachedRoom, CachedUser)

## Storage model (AsyncStorage keys)

- `offline:rooms` → `CachedRoom[]`
- `offline:users` → `CachedUser[]` (members)
- `offline:messages:<roomId>` → `Array<Message | PendingMessage>`; keep last N (e.g., 200), trim on write
- `offline:outbox` → `PendingMessage[]`

## Message optimistic + caching flow (app/chat/[roomId].tsx)

1. On mount:

- Read `offline:messages:<roomId>` and show immediately.
- Merge with live `useQuery(api.messages.listByRoom)` into `displayMessages` (sorted by `createdAt`).
- De-dupe with signature `${senderId}|${createdAt}|${text||imageUrl}`.
- Whenever live data changes, persist merged server messages to `offline:messages:<roomId>` and trim to N.
- When loading an older page, merge those into cache as well and trim.

2. On send:

- Create `PendingMessage` with `tempId`, `createdAt=Date.now()`, `status='pending'`; append to local state, `offline:messages:<roomId>`, and `offline:outbox`.
- Attempt `api.messages.send`. On success, remove the matching pending from outbox and prune the pending from room cache by signature; the live query message replaces it. On error, set `status='failed'` in cache (UI shows retry).

3. UI tweaks:

- Pending bubble: lower opacity; Failed bubble: subtle red timestamp and small "Retry" button.

## Rooms + members cache (app/(tabs)/chats/index.tsx)

- On mount, if live `rooms` is `undefined`, read and show `offline:rooms`.
- Whenever `rooms` live data arrives, write-through to `offline:rooms`.
- Do the same for `users.listAll` → `offline:users`, read on mount for names/avatars.
- v1 keeps room creation online-only; optimistic creation is optional v2.

## Sync hook (hooks/useOfflineSync.ts)

- Detect connectivity (or treat send failures as offline) and drain outbox on reconnect.
- Drain algorithm:
- Read `offline:outbox`; for each `PendingMessage`, call `messages.send`.
- On success, remove from outbox and prune the pending from `offline:messages:<roomId>` by signature; keep per-room cache trimmed to N.
- Persist strategy:
- Whenever live queries deliver new messages/rooms/users, persist to cache (active room messages only to avoid large writes).

## Minimal touch points

- `app/chat/[roomId].tsx`:
- Read/write `offline:messages:<roomId>`, merge with live, optimistic enqueue on send, handle retry UI.
- `app/(tabs)/chats/index.tsx`:
- Read `offline:rooms`/`offline:users` as fallback; write-through on live arrival.

## Error handling

- Treat send errors as offline; keep retrying on reconnect or manual retry.
- Wrap storage ops in try/catch to avoid UI crashes.

## Testing checklist

- Offline: send text and image → pending bubbles show and persist after reload.
- Online again: outbox drains, duplicates not shown, pending removed from cache.
- Cold start offline: rooms, members, and recent messages appear from cache.

### To-dos

- [ ] Add AsyncStorage (and NetInfo optional) to project
- [ ] Create types/offline.ts with PendingMessage/CachedRoom/CachedUser
- [ ] Add lib/offlineStorage.ts helpers (get/set/upsert, keys)
- [ ] Add hooks/useOfflineSync.ts to persist and drain outbox
- [ ] Wire optimistic send + merge in app/chat/[roomId].tsx
- [ ] Cache rooms and users in app/(tabs)/chats/index.tsx
- [ ] Style pending/failed bubbles and small retry control