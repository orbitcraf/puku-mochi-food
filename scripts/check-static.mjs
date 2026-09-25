import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const js = await readFile(resolve(root, "app.js"), "utf8");
const css = await readFile(resolve(root, "styles.css"), "utf8");

const errors = [];
const pageCount = (html.match(/<article class="page/g) || []).length;
if (pageCount !== 11) errors.push(`ページ数が11ではありません: ${pageCount}`);

for (const required of ["page-prev", "page-next", "page-status", "page-dots", "book-viewport"]) {
  if (!html.includes(`id="${required}"`)) errors.push(`必要なUIがありません: #${required}`);
}

const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)(?:\?[^"]*)?"/g)]
  .map((match) => match[1])
  .filter((ref) => !ref.startsWith("data:") && !ref.startsWith("http"));

for (const ref of new Set(refs)) {
  try {
    await access(resolve(root, ref));
  } catch {
    errors.push(`参照先がありません: ${ref}`);
  }
}

try {
  new Function(js);
} catch (error) {
  errors.push(`JavaScript構文エラー: ${error.message}`);
}

if (!/@media\s*\(max-width:\s*(?:760|820)px\)/.test(css)) errors.push("スマートフォン向けCSSがありません");
if (!css.includes("prefers-reduced-motion")) errors.push("動きを抑える設定がありません");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`OK: ${pageCount}ページ、${new Set(refs).size}件の静的参照、JavaScriptとレスポンシブCSSを確認しました。`);
