import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DailyQuests } from "@/components/fun/DailyQuests";
import { PennyAI } from "@/components/fun/PennyAI";
import { PennyTip } from "@/components/fun/PennyTip";
import { pounds } from "@/lib/dibs/format";
import { useFun } from "@/lib/fun/store";
import { tipsFor } from "@/lib/fun/tips";
import { computeRunway, previewPlan } from "@/lib/money/runway";
import { useMoney } from "@/lib/money/store";
import type { Plan, PlanPreview, RunwayInput, RunwayResult } from "@/lib/money/types";

import { DayCalendar } from "./DayCalendar";
import { scrollIntoViewGently } from "./dom";
import { Habits } from "./Habits";
import { Ious } from "./Ious";
import { MoneyIn } from "./MoneyIn";
import { planKey, toPlan, type ActivePlan } from "./plans";
import { RunwayHero } from "./RunwayHero";
import { RunwayProblem } from "./RunwayProblem";
import { RunwaySkeleton } from "./RunwaySkeleton";
import { SayYes } from "./SayYes";
import { Subscriptions } from "./Subscriptions";
import { ToolsCard } from "./ToolsCard";
import { YourNumbers } from "./YourNumbers";

// The engine validates its input and never throws in normal use; this keeps a surprise from ever
// taking the whole page down mid-demo.
function safeRunway(input: RunwayInput): RunwayResult {
  try {
    return computeRunway(input);
  } catch {
    return {
      ok: false,
      reason: "invalid-input",
      message: "Something in your numbers didn't add up.",
    };
  }
}

function safePreview(input: RunwayInput, plan: Plan): PlanPreview | null {
  try {
    return previewPlan(input, plan);
  } catch {
    return null;
  }
}

/** Til Loan Day's home page: safe daily spend, the day calendar, "Can I say yes?" and the editor. */
export function RunwayPage() {
  const {
    today,
    settings,
    runwayInput,
    pendingPlan,
    setPendingPlan,
    addBill,
    addSkipped,
    skippedPence,
    resetDemo,
  } = useMoney();
  const { complete } = useFun();

  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  /** Plans skipped this visit (key -> pence), so the jar can't count the same plan twice. */
  const [skipped, setSkipped] = useState<ReadonlyMap<string, number>>(() => new Map());
  const [notice, setNotice] = useState<string | null>(null);
  const [numbersOpen, setNumbersOpen] = useState(false);
  const [loanFocusSignal, setLoanFocusSignal] = useState(0);
  const [scrollSignal, setScrollSignal] = useState(0);
  const sayYesRef = useRef<HTMLElement>(null);
  const sayYesHeadingRef = useRef<HTMLHeadingElement>(null);
  const calendarRef = useRef<HTMLElement>(null);

  const result = useMemo(() => (runwayInput ? safeRunway(runwayInput) : null), [runwayInput]);
  const preview = useMemo(
    () =>
      runwayInput && activePlan && result?.ok ? safePreview(runwayInput, toPlan(activePlan)) : null,
    [runwayInput, activePlan, result],
  );

  // A plan handed over from another tool (Dibs' holding deposit): copy it into local state, clear
  // it from the store so it only opens once, then bring "Can I say yes?" into view.
  useEffect(() => {
    if (pendingPlan === null || runwayInput === null) return;
    setActivePlan(toPlan(pendingPlan));
    setNotice(null);
    setPendingPlan(null);
    setScrollSignal((n) => n + 1);
  }, [pendingPlan, runwayInput, setPendingPlan]);

  useEffect(() => {
    if (scrollSignal === 0) return;
    // Wait for the router's own scroll restoration after navigating here, then scroll.
    const t = window.setTimeout(() => scrollIntoViewGently(sayYesRef.current, "start"), 180);
    return () => window.clearTimeout(t);
  }, [scrollSignal]);

  // "Reset demo" empties the jar in the store; forget which plans were skipped too.
  useEffect(() => {
    if (skippedPence === 0) setSkipped((s) => (s.size === 0 ? s : new Map()));
  }, [skippedPence]);

  const openLoanDay = useCallback(() => {
    setNumbersOpen(true);
    setLoanFocusSignal((n) => n + 1);
  }, []);

  const closePreview = useCallback(() => {
    setActivePlan(null);
    sayYesHeadingRef.current?.focus({ preventScroll: true });
  }, []);

  // XP: opening the runway counts quietly; reaching loan day without the overdraft and previewing a
  // plan before saying yes get the little victory moment.
  useEffect(() => {
    if (result?.ok) complete("check-runway", { celebrate: false });
  }, [result?.ok, complete]);
  useEffect(() => {
    if (result?.ok && result.firstOverdraftDate === null) complete("made-it");
  }, [result, complete]);
  useEffect(() => {
    if (activePlan !== null) complete("preview-plan");
  }, [activePlan, complete]);

  if (today === null || settings === null || runwayInput === null || result === null) {
    return <RunwaySkeleton />;
  }

  const onPreview = (plan: ActivePlan) => {
    setNotice(null);
    setActivePlan(plan);
  };

  const onGoing = () => {
    if (activePlan === null) return;
    const key = planKey(activePlan);
    addBill(toPlan(activePlan));
    const refund = skipped.get(key);
    if (refund !== undefined) {
      addSkipped(-refund);
      setSkipped((s) => {
        const next = new Map(s);
        next.delete(key);
        return next;
      });
    }
    const safeNow = preview
      ? ` Safe to spend is now ${pounds(preview.after.safeDailyPence)} a day.`
      : "";
    setNotice(`✓ ${activePlan.label} is in your bills.${safeNow}`);
    closePreview();
  };

  const onSkip = () => {
    if (activePlan === null) return;
    const key = planKey(activePlan);
    if (!skipped.has(key)) {
      addSkipped(activePlan.amountPence);
      setSkipped((s) => new Map(s).set(key, activePlan.amountPence));
    }
    setNotice(
      `Skipped ${activePlan.label}. ${pounds(activePlan.amountPence)} stays in your pocket.`,
    );
    complete("skip-something");
    closePreview();
  };

  const onReset = () => {
    resetDemo();
    setActivePlan(null);
    setSkipped(new Map());
    setNotice(null);
  };

  return (
    <div className="space-y-6">
      {result.ok ? (
        <RunwayHero
          result={result}
          loanDate={settings.loanDate}
          dailySpendPence={settings.dailySpendPence}
          overdraftPence={settings.overdraftPence}
          onChangeLoanDay={openLoanDay}
        />
      ) : (
        // Both causes the editor can produce (loan day not after today, or too far away) are fixed on
        // the loan day field, so take them straight there.
        <RunwayProblem error={result} onFix={openLoanDay} />
      )}

      {result.ok ? (
        <PennyTip
          tips={tipsFor({
            result,
            dailySpendPence: settings.dailySpendPence,
            overdraftPence: settings.overdraftPence,
            preview,
          })}
        />
      ) : null}
      {result.ok ? <PennyAI input={runwayInput} result={result} preview={preview} /> : null}

      {result.ok ? (
        <>
          <SayYes
            today={today}
            bills={settings.bills}
            overdraftPence={settings.overdraftPence}
            activePlan={activePlan}
            preview={preview}
            skipped={skipped}
            skippedPence={skippedPence}
            notice={notice}
            onPreview={onPreview}
            onClose={closePreview}
            onGoing={onGoing}
            onSkip={onSkip}
            onShowCalendar={() => scrollIntoViewGently(calendarRef.current, "start")}
            sectionRef={sayYesRef}
            headingRef={sayYesHeadingRef}
          />
          <DayCalendar
            sectionRef={calendarRef}
            today={today}
            loanDate={settings.loanDate}
            timeline={preview ? preview.after.timeline : result.timeline}
            baseline={preview ? preview.before.timeline : null}
            planLabel={preview ? preview.plan.label : null}
            highlightKey={preview ? planKey(preview.plan) : null}
          />
        </>
      ) : null}

      <Habits />
      <MoneyIn />
      <Subscriptions />
      <Ious />

      <YourNumbers
        today={today}
        settings={settings}
        open={numbersOpen}
        onOpenChange={setNumbersOpen}
        focusLoanDateSignal={loanFocusSignal}
        onReset={onReset}
      />

      <DailyQuests />

      <ToolsCard />
    </div>
  );
}
