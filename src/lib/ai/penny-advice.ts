import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PennyAdviceResult = { ok: true; tips: string[] } | { ok: false; error: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pence = z.number().int().min(0);
const item = z.object({ label: z.string().max(40), amountPence: pence, date: isoDate });

const inputSchema = z.object({
  today: isoDate,
  loanDate: isoDate,
  daysToLoan: z.number().int().min(1).max(366),
  balancePence: pence,
  overdraftPence: pence,
  dailySpendPence: pence,
  safeDailyPence: pence,
  endBalancePence: z.number().int(),
  firstOverdraftDate: isoDate.nullable(),
  firstExhaustedDate: isoDate.nullable(),
  incomeInWindowPence: pence,
  bills: z.array(item).max(30),
  incomes: z.array(item).max(30),
  plan: z
    .object({
      label: z.string().max(40),
      amountPence: pence,
      date: isoDate,
      verdict: z.enum(["fine", "overdraft", "exhausted", "outside-window"]),
      daysEarlierOverdraft: z.number().int().nullable(),
    })
    .nullable(),
});

const MODEL = "anthropic/claude-haiku-4-5" as const;
const TIMEOUT_MS = 6000;

const SYSTEM =
  `You are "Penny", a cheerful coin mascot giving a UK student short, practical money tips about getting to their next Student Finance payment (loan day) without going overdrawn. ` +
  `The user message is JSON describing their runway; all money fields are integer pence, dates are YYYY-MM-DD. ` +
  `Return EXACTLY 3 tips via the give_tips tool. Each tip is one sentence, max 140 characters, friendly Gen Z tone, at most one emoji, not preachy. ` +
  `STRICT RULES: Use ONLY the numbers given. Never invent amounts or dates. ` +
  `When you mention money, write it as £X.XX, using amounts from the input or simple differences between them (for example daily spend minus safe daily spend). ` +
  `No investing, credit cards, loans, gambling or crypto advice, and no medical, legal or tax advice. ` +
  `Don't shame the student. ` +
  `If a plan is given, one tip should be about that plan. ` +
  `If firstOverdraftDate is null, celebrate and suggest keeping a buffer. Never mention fees, interest, charges or penalties, because you don't know the student's bank terms. Only say the student will hit or use up their overdraft on dates given in the input.`;

/** Pure validation of model output; exported for tests. */
export function sanitizeTips(raw: unknown): PennyAdviceResult {
  const tips = (raw as { tips?: unknown } | null)?.tips;
  if (!Array.isArray(tips) || tips.length < 1 || tips.length > 3)
    return { ok: false, error: "AI returned invalid tips" };
  const out: string[] = [];
  for (const t of tips) {
    if (typeof t !== "string" || !t.trim()) return { ok: false, error: "AI returned invalid tips" };
    out.push(t.trim().slice(0, 160));
  }
  return { ok: true, tips: out };
}

export const getPennyAdviceWithAI = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<PennyAdviceResult> => {
    try {
      const { generateMessage, GatewayError } = await import("@lovable.dev/ai-gateway");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await generateMessage(
          {
            model: MODEL,
            max_tokens: 400,
            temperature: 0.4,
            system: SYSTEM,
            messages: [{ role: "user", content: JSON.stringify(data) }],
            tools: [
              {
                name: "give_tips",
                description: "Give exactly 3 short money tips",
                input_schema: {
                  type: "object",
                  properties: {
                    tips: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
                  },
                  required: ["tips"],
                },
              },
            ],
            tool_choice: { type: "tool", name: "give_tips" },
          },
          { signal: controller.signal, maxRetries: 0 },
        );
        const block = (res.content as Array<{ type: string; input?: unknown }>).find(
          (b) => b.type === "tool_use",
        );
        if (!block) return { ok: false, error: "AI returned no structured result" };
        return sanitizeTips(block.input);
      } catch (e) {
        if (controller.signal.aborted) return { ok: false, error: "AI request timed out" };
        if (e instanceof GatewayError) {
          const s = e.httpStatus;
          if (s === 429) return { ok: false, error: "Too many requests, try again shortly" };
          if (s === 402) return { ok: false, error: "AI credits have run out" };
          console.error("getPennyAdviceWithAI gateway error", e.code, s);
          return { ok: false, error: "AI service error" };
        }
        console.error("getPennyAdviceWithAI error", (e as Error)?.name);
        return { ok: false, error: "Could not get tips" };
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return { ok: false, error: "Could not get tips" };
    }
  });
