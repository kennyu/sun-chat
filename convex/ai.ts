import OpenAI from "openai";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

async function insertLog(ctx: any, params: {
  kind: string;
  roomId?: string;
  prompt?: string;
}) {
  const identity = await ctx.auth.getUserIdentity();
  const logId = await ctx.runMutation((internal as any).ai._insertLog, {
    kind: params.kind,
    roomId: params.roomId as any,
    userId: identity?.subject?.split("|")?.[0],
    prompt: params.prompt,
  });
  return logId;
}

async function finalizeLog(ctx: any, logId: string, updates: Partial<{
  model: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  status: string;
  error: string;
  retrievedMessageIds: string[];
}>) {
  await ctx.runMutation((internal as any).ai._patchLog, { id: logId as any, updates: updates as any });
}

export const embedText = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, { text }) => {
    const logId = await insertLog(ctx, { kind: "embed" });
    const start = Date.now();
    try {
      const openai = createOpenAIClient();
      const result = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      const embedding = result.data[0]?.embedding ?? [];
      const durationMs = Date.now() - start;
      await finalizeLog(ctx, logId, {
        model: result.model as any,
        durationMs,
        inputTokens: (result.usage as any)?.prompt_tokens,
        outputTokens: undefined,
        status: "ok",
      });
      return embedding;
    } catch (error: any) {
      await finalizeLog(ctx, logId, {
        status: "error",
        error: error?.message ?? String(error),
      });
      throw error;
    }
  },
});

export const getModelInfo = action({
  args: {},
  handler: async () => {
    // Lightweight check that env is wired; avoids making a remote call.
    const hasKey = Boolean(process.env.OPENAI_API_KEY);
    return {
      provider: "openai",
      model: "gpt-4o",
      embeddingModel: "text-embedding-3-small",
      configured: hasKey,
    };
  },
});

export const _embedMessage = internalAction({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.runQuery((internal as any).messages.get, { id: messageId }).catch(() => null);
    if (!message || !message.text) return;
    const openai = createOpenAIClient();
    const start = Date.now();
    const logId = await insertLog(ctx, { kind: "embed", roomId: message.roomId as any });
    try {
      const result = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: message.text,
      });
      const embedding = result.data[0]?.embedding ?? [];
      await ctx.runMutation((internal as any).ai._insertMessageEmbedding, {
        messageId,
        roomId: message.roomId,
        embedding,
        embeddingModel: result.model,
      });
      await finalizeLog(ctx, logId, {
        model: result.model,
        durationMs: Date.now() - start,
        inputTokens: (result.usage as any)?.prompt_tokens,
        status: "ok",
      });
    } catch (error: any) {
      await finalizeLog(ctx, logId, { status: "error", error: error?.message ?? String(error) });
    }
  },
});

export const _insertMessageEmbedding = internalMutation({
  args: {
    messageId: v.id("messages"),
    roomId: v.id("rooms"),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messageEmbeddings", {
      messageId: args.messageId,
      roomId: args.roomId,
      embedding: args.embedding,
      embeddingModel: args.embeddingModel,
      createdAt: Date.now(),
    });
  },
});

export const _patchLog = internalMutation({
  args: { id: v.id("aiLogs"), updates: v.any() },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, updates);
  },
});

export const _insertLog = internalMutation({
  args: {
    kind: v.string(),
    roomId: v.optional(v.id("rooms")),
    userId: v.optional(v.string()),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, { kind, roomId, userId, prompt }) => {
    const id = await ctx.db.insert("aiLogs", {
      kind,
      roomId,
      userId,
      prompt,
      model: undefined,
      durationMs: undefined,
      inputTokens: undefined,
      outputTokens: undefined,
      status: "started",
      error: undefined,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const _listEmbeddingsByRoom = internalQuery({
  args: { roomId: v.id("rooms"), limit: v.optional(v.number()) },
  handler: async (ctx, { roomId, limit = 400 }) => {
    const rows = await ctx.db
      .query("messageEmbeddings")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("desc")
      .take(limit);
    return rows;
  },
});

export const _getEmbeddingByMessage = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const row = await ctx
      .db
      .query("messageEmbeddings")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .first();
    return row ?? null;
  },
});

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export const answer = action({
  args: { roomId: v.id("rooms"), prompt: v.string(), k: v.optional(v.number()) },
  handler: async (ctx, { roomId, prompt, k = 12 }) => {
    const openai = createOpenAIClient();
    const logId = await insertLog(ctx, { kind: "answer", roomId: roomId as any, prompt });
    const start = Date.now();
    try {
      const q = await openai.embeddings.create({ model: "text-embedding-3-small", input: prompt });
      const qvec = q.data[0]?.embedding ?? [];
      // Prefer vector index if available
      let top: { messageId: string; score: number }[] = [];
      try {
        const vrows = await (ctx as any)
          .db
          .query("messageEmbeddings")
          .withIndex("by_embedding", (q: any) => q.eq("roomId", roomId))
          .vectorSearch("by_embedding", { vector: qvec, limit: k });
        top = (vrows as any[]).map((r: any) => ({ messageId: String(r.messageId), score: r._score ?? 0 }));
      } catch {
        const rows: any[] = await ctx.runQuery((internal as any).ai._listEmbeddingsByRoom, { roomId, limit: 400 });
        const scored: { messageId: string; score: number }[] = rows.map((r: any) => ({
          messageId: String(r.messageId),
          score: cosineSimilarity(qvec, r.embedding as number[]),
        }));
        scored.sort((a, b) => b.score - a.score);
        top = scored.slice(0, k);
      }
      const messages: { senderId: string; text: string; createdAt: number }[] = [];
      for (const t of top) {
        const m = await ctx.runQuery((internal as any).messages.get, { id: t.messageId as any }).catch(() => null);
        if (m?.text) messages.push({ senderId: m.senderId, text: m.text, createdAt: m.createdAt });
      }
      messages.sort((a, b) => a.createdAt - b.createdAt);
      const ctxBlock = messages.map((m) => `- ${m.senderId}: ${m.text}`).join("\n").slice(0, 12000);
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant in a team chat. Answer using only provided context when relevant." },
          { role: "user", content: `Context:\n${ctxBlock}\n\nUser question: ${prompt}` },
        ],
        temperature: 1,
      });
      const text = completion.choices?.[0]?.message?.content ?? "";
      await finalizeLog(ctx, logId, {
        model: completion.model as any,
        durationMs: Date.now() - start,
        inputTokens: completion.usage?.prompt_tokens as any,
        outputTokens: completion.usage?.completion_tokens as any,
        status: "ok",
      });
      return { text };
    } catch (error: any) {
      await finalizeLog(ctx, logId, { status: "error", error: error?.message ?? String(error) });
      throw error;
    }
  },
});

export const backfillEmbeddings = action({
  args: { roomId: v.id("rooms"), limit: v.optional(v.number()) },
  handler: async (ctx, { roomId, limit = 200 }) => {
    const msgs = await ctx.runQuery(api.messages.listByRoom, { roomId, limit });
    let embedded = 0;
    for (const m of msgs) {
      if (!m.text) continue;
      const exists = await ctx.runQuery((internal as any).ai._getEmbeddingByMessage, { messageId: m._id });
      if (exists) continue;
      await ctx.runAction((internal as any).ai._embedMessage, { messageId: m._id });
      embedded++;
    }
    return { embedded };
  },
});

export const _setThreadSummary = internalMutation({
  args: { roomId: v.id("rooms"), summary: v.string(), model: v.string() },
  handler: async (ctx, { roomId, summary, model }) => {
    const existing = await ctx.db
      .query("threadSummaries")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { summary, model, updatedAt: now });
    } else {
      await ctx.db.insert("threadSummaries", { roomId, summary, model, createdAt: now, updatedAt: now });
    }
  },
});

export const _insertActionItems = internalMutation({
  args: {
    roomId: v.id("rooms"),
    messageId: v.optional(v.id("messages")),
    items: v.array(
      v.object({ text: v.string(), assignee: v.optional(v.string()), dueDate: v.optional(v.string()), priority: v.optional(v.string()) })
    ),
    model: v.string(),
  },
  handler: async (ctx, { roomId, messageId, items, model }) => {
    await ctx.db.insert("actionItems", { roomId, messageId, items, model, createdAt: Date.now() });
  },
});

export const _upsertSignal = internalMutation({
  args: {
    roomId: v.id("rooms"),
    messageId: v.id("messages"),
    isDecision: v.optional(v.boolean()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, { roomId, messageId, isDecision, priority }) => {
    const existing = await ctx.db
      .query("aiSignals")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        isDecision: isDecision ?? existing.isDecision,
        priority: priority ?? existing.priority,
      });
    } else {
      await ctx.db.insert("aiSignals", {
        roomId,
        messageId,
        isDecision,
        priority,
        createdAt: Date.now(),
      });
    }
  },
});

export const classifyMessageSignals = action({
  args: { roomId: v.id("rooms"), messageId: v.id("messages") },
  handler: async (
    ctx,
    { roomId, messageId }: { roomId: any; messageId: any }
  ): Promise<{ priority: string; isDecision: boolean }> => {
    const openai = createOpenAIClient();
    const message = await ctx.runQuery((internal as any).messages.get, { id: messageId }).catch(() => null);
    if (!message?.text) return { priority: "normal", isDecision: false };
    const logId = await insertLog(ctx, { kind: "classify", roomId: roomId as any, prompt: message.text });
    const start = Date.now();
    try {
      const completion: any = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "Classify the message. Return strict JSON: {\"priority\": one of [\"urgent\",\"time-sensitive\",\"blocker\",\"normal\"], \"decision\": boolean}. No prose.",
          },
          { role: "user", content: message.text },
        ],
        temperature: 0,
      });
      const content: string = completion.choices?.[0]?.message?.content ?? "{\"priority\":\"normal\",\"decision\":false}";
      let priority = "normal";
      let isDecision = false;
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed.priority === "string") priority = String(parsed.priority).toLowerCase();
        if (typeof parsed.decision === "boolean") isDecision = parsed.decision;
      } catch {}
      const allowed = new Set(["urgent", "time-sensitive", "blocker", "normal"]);
      if (!allowed.has(priority)) priority = "normal";
      await ctx.runMutation((internal as any).ai._upsertSignal, { roomId, messageId, isDecision, priority });
      await finalizeLog(ctx, logId, {
        model: completion.model as any,
        durationMs: Date.now() - start,
        inputTokens: completion.usage?.prompt_tokens as any,
        outputTokens: completion.usage?.completion_tokens as any,
        status: "ok",
      });
      return { priority, isDecision };
    } catch (error: any) {
      await finalizeLog(ctx, logId, { status: "error", error: error?.message ?? String(error) });
      throw error;
    }
  },
});

export const classifyRecentSignals = action({
  args: { roomId: v.id("rooms"), limit: v.optional(v.number()) },
  handler: async (
    ctx,
    { roomId, limit = 30 }: { roomId: any; limit?: number }
  ): Promise<{ processed: number }> => {
    const list: any[] = await ctx.runQuery((api as any).messages.listByRoom, { roomId, limit: 200 });
    const recent = list.filter((m) => !!m.text).slice(-limit);
    let processed = 0;
    for (const m of recent) {
      try {
        await ctx.runAction((api as any).ai.classifyMessageSignals, { roomId, messageId: m._id });
        processed++;
      } catch {}
    }
    return { processed };
  },
});

export const startStreamingAnswer = action({
  args: { roomId: v.id("rooms"), prompt: v.string() },
  handler: async (
    ctx,
    { roomId, prompt }: { roomId: any; prompt: string }
  ): Promise<{ streamId: any }> => {
    const openai = createOpenAIClient();
    const logId = await insertLog(ctx, { kind: "answer_stream", roomId: roomId as any, prompt });
    const t0 = Date.now();
    const streamId = await ctx.runMutation((internal as any).ai._createStream, {
      roomId,
      prompt,
    });
    // Fire-and-forget
    ctx.scheduler.runAfter(0, (internal as any).ai._produceStream, { roomId, prompt, streamId, logId });
    await finalizeLog(ctx, logId, { status: "started", durationMs: Date.now() - t0 });
    return { streamId };
  },
});

export const pollStream = action({
  args: { streamId: v.id("aiStreams"), afterSeq: v.optional(v.number()) },
  handler: async (
    ctx,
    { streamId, afterSeq = -1 }: { streamId: any; afterSeq?: number }
  ): Promise<Array<{ seq: number; kind: string; data?: string; at: number }>> => {
    const rows: any[] = await ctx.runQuery((internal as any).ai._listStreamEvents, { streamId, afterSeq });
    return rows as any;
  },
});

export const _createStream = internalMutation({
  args: { roomId: v.id("rooms"), prompt: v.string() },
  handler: async (ctx, { roomId, prompt }) => {
    const now = Date.now();
    return await ctx.db.insert("aiStreams", { roomId, prompt, status: "started", createdAt: now, updatedAt: now });
  },
});

export const _appendStreamEvent = internalMutation({
  args: { streamId: v.id("aiStreams"), seq: v.number(), kind: v.string(), data: v.optional(v.string()) },
  handler: async (ctx, { streamId, seq, kind, data }) => {
    await ctx.db.insert("aiStreamEvents", { streamId, seq, kind, data, at: Date.now() });
    await ctx.db.patch(streamId, { updatedAt: Date.now() });
  },
});

export const _setStreamStatus = internalMutation({
  args: { streamId: v.id("aiStreams"), status: v.string() },
  handler: async (ctx, { streamId, status }) => {
    await ctx.db.patch(streamId, { status, updatedAt: Date.now() });
  },
});

export const _listStreamEvents = internalQuery({
  args: { streamId: v.id("aiStreams"), afterSeq: v.optional(v.number()) },
  handler: async (ctx, { streamId, afterSeq = -1 }) => {
    const rows = await ctx.db
      .query("aiStreamEvents")
      .withIndex("by_stream_seq", (q) => q.eq("streamId", streamId))
      .order("asc")
      .collect();
    return rows.filter((r) => r.seq > afterSeq);
  },
});

export const _produceStream = internalAction({
  args: { roomId: v.id("rooms"), prompt: v.string(), streamId: v.id("aiStreams"), logId: v.id("aiLogs") },
  handler: async (ctx, { roomId, prompt, streamId, logId }) => {
    const openai = createOpenAIClient();
    try {
      // Simple retrieval: reuse answer's retrieval phase
      const { text: _ignore } = await ctx.runAction((api as any).ai.answer, { roomId, prompt });
      // For streaming simulation: chunk the final text
      let seq = 0;
      const final = _ignore ?? "";
      for (let i = 0; i < final.length; i += 80) {
        await ctx.runMutation((internal as any).ai._appendStreamEvent, { streamId, seq: seq++, kind: "token", data: final.slice(i, i + 80) });
      }
      await ctx.runMutation((internal as any).ai._appendStreamEvent, { streamId, seq: 999999, kind: "done" });
      await ctx.runMutation((internal as any).ai._setStreamStatus, { streamId, status: "done" });
      await finalizeLog(ctx, logId, { status: "ok" });
    } catch (e: any) {
      await ctx.runMutation((internal as any).ai._appendStreamEvent, { streamId, seq: 999999, kind: "error", data: String(e?.message ?? e) });
      await ctx.runMutation((internal as any).ai._setStreamStatus, { streamId, status: "error" });
      await finalizeLog(ctx, logId, { status: "error", error: String(e?.message ?? e) });
    }
  },
});
export const summarizeThread = action({
  args: { roomId: v.id("rooms"), limit: v.optional(v.number()) },
  handler: async (
    ctx,
    { roomId, limit = 300 }: { roomId: any; limit?: number }
  ): Promise<{ summary: string }> => {
    const openai = createOpenAIClient();
    const logId = await insertLog(ctx, { kind: "summarize", roomId: roomId as any });
    const start = Date.now();
    try {
      const msgs: any[] = await ctx
        .runQuery((internal as any).messages.listByRoom, { roomId, limit })
        .catch(() => [] as any[]);
      // Fallback to public api if internal not available
      const list: any[] =
        Array.isArray(msgs) && msgs.length > 0
          ? (msgs as any[])
          : await ctx.runQuery((api as any).messages.listByRoom, { roomId, limit });
      const textBlock: string = (list as any[])
        .slice(-limit)
        .map((m) => (m.text ? `- ${m.senderId}: ${m.text}` : ""))
        .filter(Boolean)
        .join("\n")
        .slice(0, 12000);
      const completion: any = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "Summarize the thread succinctly for stakeholders. 5-8 bullet points or a short paragraph." },
          { role: "user", content: textBlock },
        ],
        temperature: 0.2,
      });
      const summary: string = completion.choices?.[0]?.message?.content ?? "";
      await ctx.runMutation((internal as any).ai._setThreadSummary, { roomId, summary, model: completion.model });
      await finalizeLog(ctx, logId, {
        model: completion.model as any,
        durationMs: Date.now() - start,
        inputTokens: completion.usage?.prompt_tokens as any,
        outputTokens: completion.usage?.completion_tokens as any,
        status: "ok",
      });
      return { summary };
    } catch (error: any) {
      await finalizeLog(ctx, logId, { status: "error", error: error?.message ?? String(error) });
      throw error;
    }
  },
});

export const extractActionItems = action({
  args: { roomId: v.id("rooms"), limit: v.optional(v.number()) },
  handler: async (
    ctx,
    { roomId, limit = 200 }: { roomId: any; limit?: number }
  ): Promise<{ items: { text: string; assignee?: string; dueDate?: string; priority?: string }[] }> => {
    const openai = createOpenAIClient();
    const logId = await insertLog(ctx, { kind: "action_items", roomId: roomId as any });
    const start = Date.now();
    try {
      const msgs = await ctx.runQuery((api as any).messages.listByRoom, { roomId, limit });
      const textBlock = (msgs as any[])
        .slice(-limit)
        .map((m) => (m.text ? `- ${m.senderId}: ${m.text}` : ""))
        .filter(Boolean)
        .join("\n")
        .slice(0, 12000);
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "Extract action items as JSON array of {text, assignee?, dueDate?, priority?}. Use ISO date for dueDate if present." },
          { role: "user", content: textBlock },
        ],
        temperature: 0.2,
      });
      let items: { text: string; assignee?: string; dueDate?: string; priority?: string }[] = [];
      const content: string = completion.choices?.[0]?.message?.content ?? "[]";
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          items = parsed
            .map((it: any) => ({ text: String(it.text ?? ""), assignee: it.assignee ? String(it.assignee) : undefined, dueDate: it.dueDate ? String(it.dueDate) : undefined, priority: it.priority ? String(it.priority) : undefined }))
            .filter((it) => it.text.length > 0);
        }
      } catch {
        // Fallback: split lines into text-only items
        items = content
          .split(/\n+/)
          .map((s) => s.replace(/^[-*]\s*/, "").trim())
          .filter((s) => s.length > 0)
          .map((s) => ({ text: s }));
      }
      if (items.length > 0) {
        await ctx.runMutation((internal as any).ai._insertActionItems, { roomId, items, model: completion.model });
      }
      await finalizeLog(ctx, logId, {
        model: completion.model as any,
        durationMs: Date.now() - start,
        inputTokens: completion.usage?.prompt_tokens as any,
        outputTokens: completion.usage?.completion_tokens as any,
        status: "ok",
      });
      return { items };
    } catch (error: any) {
      await finalizeLog(ctx, logId, { status: "error", error: error?.message ?? String(error) });
      throw error;
    }
  },
});
