import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type HabitPrediction = {
  label: string;
  timesPerWeek: number;
  costPence: number;
  estimated: boolean;
};
export type PredictHabitsResult = { ok: true; habits: HabitPrediction[] } | { ok: false; error: string };

const inputSchema = z.object({ text: z.string().trim().min(1).max(600) });

const MODEL = "anthropic/claude-haiku-4-5" as const;
const TIMEOUT_MS = 6000;

const SYSTEM =
  `A UK student describes their everyday, irregular spending habits in plain words. Predict their recurring weekly spending as a list of habits via the predict_habits tool. ` +
  `For each habit: label is a short name (max 30 chars, e.g. "Eating out", "Bus to campus", "Coffee", "Takeaway"); timesPerWeek is a number from 0.25 to 21 ("most mornings" = 5, "every day" = 7, "fortnightly" = 0.5); costPence is the cost each time in whole pence (0 to 10000). ` +
  `If the student gives a price, use it with estimated=false. If not, estimate a typical UK student price with estimated=true, keeping the estimate modest and realistic. ` +
  `At most 8 habits. Ignore anything that isn't spending. Don't judge or lecture.`;

/** Pure validation of model output; exported for tests. */
export function sanitizeHabits(raw: unknown): PredictHabitsResult {
  const habits = (raw as { habits?: unknown } | null)?.habits;
  if (!Array.isArray(habits) || habits.length < 1 || habits.length > 8)
    return { ok: false, error: "AI returned invalid habits" };
  const out: HabitPrediction[] = [];
  for (const h of habits) {
    const item = h as { label?: unknown; timesPerWeek?: unknown; costPence?: unknown; estimated?: unknown };
    if (typeof item?.label !== "string" || !item.label.trim())
      return { ok: false, error: "AI returned invalid habits" };
    if (typeof item.timesPerWeek !== "number" || !Number.isFinite(item.timesPerWeek))
      return { ok: false, error: "AI returned invalid habits" };
    if (typeof item.costPence !== "number" || !Number.isFinite(item.costPence))
      return { ok: false, error: "AI returned invalid habits" };
    out.push({
      label: item.label.trim().slice(0, 30),
      timesPerWeek: Math.min(21, Math.max(0.25, item.timesPerWeek)),
      costPence: Math.min(10000, Math.max(0, Math.round(item.costPence))),
      estimated: item.estimated === true,
    });
  }
  return { ok: true, habits: out };
}

export const predictHabitsWithAI = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<PredictHabitsResult> => {
    try {
      const { generateMessage, GatewayError } = await import("@lovable.dev/ai-gateway");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await generateMessage(
          {
            model: MODEL,
            max_tokens: 500,
            temperature: 0.2,
            system: SYSTEM,
            messages: [{ role: "user", content: data.text }],
            tools: [
              {
                name: "predict_habits",
                description: "Predict the student's recurring weekly spending habits",
                input_schema: {
                  type: "object",
                  properties: {
                    habits: {
                      type: "array",
                      minItems: 1,
                      maxItems: 8,
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string", maxLength: 30 },
                          timesPerWeek: { type: "number", minimum: 0.25, maximum: 21 },
                          costPence: { type: "integer", minimum: 0, maximum: 10000 },
                          estimated: { type: "boolean" },
                        },
                        required: ["label", "timesPerWeek", "costPence", "estimated"],
                      },
                    },
                  },
                  required: ["habits"],
                },
              },
            ],
            tool_choice: { type: "tool", name: "predict_habits" },
          },
          { signal: controller.signal, maxRetries: 0 },
        );
        const block = (res.content as Array<{ type: string; input?: unknown }>).find(
          (b) => b.type === "tool_use",
        );
        if (!block) return { ok: false, error: "AI returned no structured result" };
        return sanitizeHabits(block.input);
      } catch (e) {
        if (controller.signal.aborted) return { ok: false, error: "AI request timed out" };
        if (e instanceof GatewayError) {
          const s = e.httpStatus;
          if (s === 429) return { ok: false, error: "Too many requests, try again shortly" };
          if (s === 402) return { ok: false, error: "AI credits have run out" };
          console.error("predictHabitsWithAI gateway error", e.code, s);
          return { ok: false, error: "AI service error" };
        }
        console.error("predictHabitsWithAI error", (e as Error)?.name);
        return { ok: false, error: "Could not predict habits" };
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return { ok: false, error: "Could not predict habits" };
    }
  });
