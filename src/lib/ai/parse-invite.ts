import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ParseInviteResult =
  | {
      ok: true;
      label: string | null;
      amountPence: number | null;
      date: string | null;
      confidence: "high" | "medium" | "low";
    }
  | { ok: false; error: string };

const inputSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const MODEL = "anthropic/claude-haiku-4-5" as const;
const TIMEOUT_MS = 6000;

function parseIsoDate(s: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  const t = Date.UTC(y, m - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return t;
}

/** Pure validation of model output; exported for tests. */
export function sanitizeParsed(raw: unknown, today: string): ParseInviteResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "AI returned invalid data" };
  const r = raw as Record<string, unknown>;
  const label =
    typeof r["label"] === "string" && r["label"].trim() ? r["label"].trim().slice(0, 40) : null;
  const a = r["amountPence"];
  const amountPence =
    typeof a === "number" && Number.isInteger(a) && a >= 0 && a <= 1_000_000 ? a : null;
  let date: string | null = null;
  const todayT = parseIsoDate(today);
  if (typeof r["date"] === "string" && todayT !== null) {
    const t = parseIsoDate(r["date"]);
    if (t !== null && t >= todayT && t <= todayT + 365 * 86_400_000) date = r["date"];
  }
  const c = r["confidence"];
  const confidence = c === "high" || c === "medium" || c === "low" ? c : "low";
  return { ok: true, label, amountPence, date, confidence };
}

function weekdayOf(today: string): string {
  const t = parseIsoDate(today);
  return t === null
    ? ""
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
        new Date(t).getUTCDay()
      ]!;
}

export const parseInviteWithAI = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ParseInviteResult> => {
    try {
      const { generateMessage, GatewayError } = await import("@lovable.dev/ai-gateway");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await generateMessage(
          {
            model: MODEL,
            max_tokens: 300,
            temperature: 0,
            system:
              `You extract a plan from a UK student group-chat message. Today is ${data.today} (${weekdayOf(data.today)}). ` +
              `label: short event name, max 40 chars. amountPence: cost to ONE person in whole pence (divide a group total by the head count if both are given; "quid"/"£" are GBP); null if no cost. ` +
              `If several costs are given (e.g. deposit and total), use the amount this person must pay next. ` +
              `date: YYYY-MM-DD when the money is spent or the event happens (prefer the payment deadline if one is given, else the event date). ` +
              `Resolve relative words and day numbers against today, choosing the next future occurrence; UK date order (DD/MM). null if none. ` +
              `confidence: high, medium or low. Always call the save_plan tool.`,
            messages: [{ role: "user", content: data.text }],
            tools: [
              {
                name: "save_plan",
                description: "Save the extracted plan",
                input_schema: {
                  type: "object",
                  properties: {
                    label: { type: ["string", "null"] },
                    amountPence: { type: ["integer", "null"] },
                    date: { type: ["string", "null"] },
                    confidence: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["label", "amountPence", "date", "confidence"],
                },
              },
            ],
            tool_choice: { type: "tool", name: "save_plan" },
          },
          { signal: controller.signal, maxRetries: 0 },
        );
        const block = (res.content as Array<{ type: string; input?: unknown }>).find(
          (b) => b.type === "tool_use",
        );
        if (!block) return { ok: false, error: "AI returned no structured result" };
        return sanitizeParsed(block.input, data.today);
      } catch (e) {
        if (controller.signal.aborted) return { ok: false, error: "AI request timed out" };
        if (e instanceof GatewayError) {
          const s = e.httpStatus;
          if (s === 429) return { ok: false, error: "Too many requests, try again shortly" };
          if (s === 402) return { ok: false, error: "AI credits have run out" };
          console.error("parseInviteWithAI gateway error", e.code, s);
          return { ok: false, error: "AI service error" };
        }
        console.error("parseInviteWithAI error", (e as Error)?.name);
        return { ok: false, error: "Could not parse message" };
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return { ok: false, error: "Could not parse message" };
    }
  });
