import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// Optional: simple health/info route for AI config
http.route({
  path: "/ai/info",
  method: "GET",
  handler: (async (ctx: any) => {
    const result = await ctx.runAction((internal as any).ai.getModelInfo, {});
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  }) as any,
});

export default http;
