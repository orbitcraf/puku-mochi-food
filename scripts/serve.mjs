import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const file = resolve(root, `.${requested}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) throw new Error("invalid path");
    if (!(await stat(file)).isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Local: http://127.0.0.1:${port}/`);
});
