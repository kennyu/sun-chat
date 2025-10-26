import { httpAction } from "./_generated/server";

export const issueToken = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const who = (url.searchParams.get("user") || "").toLowerCase();
    if (!(who === "alice" || who === "bob")) {
      return Response.json({ error: "Invalid user" }, { status: 400 });
    }
    const token = await (ctx as any).auth.createToken({
      subject: who,
      name: who === "alice" ? "Alice" : "Bob",
    });
    return Response.json({ token });
  } catch (err: any) {
    const message = err?.message ?? "Failed to issue token";
    return Response.json({ error: message }, { status: 500 });
  }
});


