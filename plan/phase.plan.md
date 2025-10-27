<!-- ad5b39a1-48e4-448c-bffc-c7e7c13bc30f 66dc687d-2d6e-425c-9b88-a07e12f73795 -->
# Phase 2 – RAG AI Agent (OpenAI + Convex Vector Search)

## Scope

Implement a single RAG agent that: (1) answers questions over room threads, (2) summarizes threads and extracts action items, (3) provides smart search with decision/priority hints, (4) exposes a simple contextual UI with streaming-like UX, and (5) includes minimal logging + eval harness with latency budgets.

## Tech Choices

- Model: OpenAI GPT-4o for generation; `text-embedding-3-large` for embeddings
- RAG Store: Convex Vector Search (in `convex/schema.ts` + vector index)
- Backend: Convex actions/queries/mutations in new `convex/ai.ts` (agent), small changes to `convex/messages.ts`, `convex/schema.ts`, plus optional `convex/http.ts` for streaming-lite
- App UI: React Native/Expo additions in `app/chat/[roomId].tsx` and toolbar entry in `app/(tabs)/chats/index.tsx`

## Milestones

### M0 — Foundation (env, schema, logs)

- Add OpenAI config and secrets
- Extend schema for embeddings, AI logs, summaries/action items
- Add basic logging helper and latency timer

### M1 — Core RAG Answering

- Embed messages on write (or batch backfill) and create vector index
- Implement `ai.answer` with retrieval → synthesis (GPT-4o) → persist result/logs
- Expose simple UI entry-point in chat view; show incremental tokens via polling

### M2 — Summaries & Action Items

- Implement `ai.summarizeThread` and `ai.extractActionItems` with shared RAG
- Persist summaries/action items; show in room header/footer

### M3 — Smart Search, Priority & Decision Signals

- Add `ai.search` with vector + keyword fallback
- Classify priority and decisions via the same agent; store flags on messages/threads
- Add minimal search UI in Chats tab with highlights

### M4 — Contextual UI + Streaming UX

- Long-press contextual toolbar to ask AI (quote selection → prompt)
- Streaming-like UX via small chunk updates (poll or lightweight HTTP stream)

### M5 — Eval Harness, Logs, Latency Budgets

- Add small eval dataset; run harness calling the agent
- Store per-call metrics/logs; assert budgets for P50/P95 latency

## Key File Touchpoints

- `convex/schema.ts`: new tables/indexes (vectors, logs, summaries, action items)
- `convex/ai.ts`: answer/summarize/actionItems/search/classify APIs
- `convex/messages.ts`: hook to generate embeddings on insert/update
- `convex/http.ts`: optional streaming-like endpoint
- `app/chat/[roomId].tsx`: ask AI button + result stream/poll UI
- `app/(tabs)/chats/index.tsx`: search input and results UI

## Acceptance Criteria (per ticket below)

- RAG returns grounded answers using retrieved messages; responses stored and visible in the UI
- Summaries and action items are reproducible and stored per thread
- Search returns relevant messages; decision/priority flags appear on matching items
- Contextual UI works via long-press; visible incremental output during generation
- Logs capture prompt, retrieved IDs, model, duration; eval harness produces a simple report and enforces thresholds

### To-dos

- [ ] Add OpenAI env config and Convex secret usage
- [ ] Extend schema for embeddings, AI logs, summaries, action items
- [ ] Add logging helper and latency timer utilities
- [ ] Generate/store embeddings on message write; backfill script
- [ ] Create Convex vector index on message embeddings
- [ ] Implement ai.answer retrieval+synthesis with GPT-4o and logs
- [ ] Add Ask AI button in room and show incremental output via polling
- [ ] Implement ai.summarizeThread and persist summary
- [ ] Implement ai.extractActionItems and persist items
- [ ] Display summary and action items in room header/footer
- [ ] Implement ai.search with vector+keyword fallback
- [ ] Classify and persist priority/decision flags via agent
- [ ] Add Chats tab search UI with highlights and filters
- [ ] Long-press toolbar to quote and ask AI about selection
- [ ] Streaming-like UX via polling or HTTP chunk endpoint
- [ ] Store per-call logs with prompt, retrieved IDs, duration, model
- [ ] Small eval dataset + harness with latency budgets