import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { issueToken } from "./devAuth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({ path: "/dev/issue", method: "GET", handler: issueToken });

export default http;
