import { query } from "./_generated/server";
import { v } from "convex/values";

export const heartbeat = query({
  args: { tick: v.optional(v.number()) },
  handler: async (_ctx, _args) => {
    return { serverTime: Date.now() };
  },
});


