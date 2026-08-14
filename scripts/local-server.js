import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

process.env.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || "file:local.db";

const { handler } = await import("../netlify/functions/api.js");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function cleanUrl(reqUrl) {
  const u = new URL(reqUrl, "http://localhost");
  let p = u.pathname;
  if (p === "/split" || p === "/guides" || p === "/admin") p += ".html";
  if (p === "/") p = "/index.html";
  return p;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");

  if (u.pathname.startsWith("/api/")) {
    let body = "";
    for await (const chunk of req) body += chunk;

    const event = {
      httpMethod: req.method,
      path: u.pathname,
      rawUrl: "http://localhost" + req.url,
      queryStringParameters: Object.fromEntries(u.searchParams),
      headers: req.headers,
      body: body || null,
    };

    try {
      const resp = await handler(event);
      res.writeHead(resp.statusCode, resp.headers);
      res.end(resp.body);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: e.message }));
    }
    return;
  }

  const filePath = path.join(PUBLIC, cleanUrl(req.url));
  if (!filePath.startsWith(PUBLIC) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(fs.readFileSync(filePath));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Travel Portal (Netlify/Turso build) running at http://localhost:${PORT}`);
  console.log(`Database: ${process.env.TURSO_DATABASE_URL}`);
});