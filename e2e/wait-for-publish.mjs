import { setTimeout as delay } from "node:timers/promises";

const url = process.argv[2] || process.env.BASE_URL || "https://til-loan-day.lovable.app";
const timeoutSeconds = Number(process.argv[3] ?? 300);

async function main() {
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    throw new Error("Usage: node wait-for-publish.mjs [URL] [positive timeout in seconds]");
  }
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("URL must use HTTP(S)");
  const deadline = Date.now() + timeoutSeconds * 1000;
  let last = "No response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - Date.now()))),
      });
      const html = await response.text();
      const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || "";
      last = `HTTP ${response.status}, title ${JSON.stringify(title)}`;
      if (response.ok && /til loan day/i.test(title)) {
        console.log(`Published: ${url} (${title.trim()})`);
        return;
      }
    } catch (error) {
      last = error.message;
    }
    if (Date.now() < deadline) await delay(Math.min(2000, deadline - Date.now()));
  }
  throw new Error(`Timed out after ${timeoutSeconds}s waiting for Til Loan Day at ${url}: ${last}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
